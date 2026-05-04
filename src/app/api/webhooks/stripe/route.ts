import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { updateSheetRowByInvoiceId } from "@/lib/google";
import { markApplicationByInvoiceId } from "@/lib/applications-neon";

export const runtime = "nodejs";

/**
 * Stripe webhook → application status mirror.
 *
 * Two write targets, both required during the dual-write soak window:
 *   1. Sheets — column C ("paymentStatus") via updateSheetRowByInvoiceId.
 *      Sheets is the historical record of truth and humans still scan it.
 *   2. Neon — applications.status via markApplicationByInvoiceId. Neon is
 *      what the CMS reads, so this is the path the agent UI sees.
 *
 * Both targets are best-effort independently: if Sheets succeeds and Neon
 * fails, we still 200 to Stripe so Stripe doesn't keep retrying — but we
 * log the Neon failure so a backfill can repair it. Same the other way.
 *
 * Events handled:
 *   - invoice.paid                   → status = "paid"
 *   - invoice.payment_failed         → log only (no status change; we
 *                                      only flip on confirmed lifecycle
 *                                      transitions, not transient failures)
 *   - invoice.voided                 → status = "refunded" (closest
 *                                      canonical value; the four allowed
 *                                      statuses don't include "voided")
 *   - invoice.marked_uncollectible   → log only
 *   - charge.refunded                → status = "refunded" (when there's
 *                                      a linked invoice)
 *
 * Status preservation: markApplicationByInvoiceId only flips from
 * "unpaid" → "paid" or "unpaid"/"paid" → "refunded". An agent's manual
 * "waived" or already-set "refunded" is never overwritten.
 */

type StatusTarget = "paid" | "refunded";

async function syncBoth(
  invoiceId: string,
  target: StatusTarget,
  amountPaidCents?: number | null,
): Promise<void> {
  // Sheets first — historical writer of truth during dual-write.
  try {
    await updateSheetRowByInvoiceId("Tenant Applications", invoiceId, {
      paymentStatus: target === "paid" ? "Paid" : "Refunded",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[stripe-webhook] sheet update failed for invoice ${invoiceId} → ${target}:`,
      message,
    );
  }

  // Neon mirror — what the CMS reads. amount_cents matters because the
  // dashboard's "Revenue this week" SUMs amount_cents over paid rows;
  // skipping it leaves the column NULL and the row contributes $0.
  try {
    const updated = await markApplicationByInvoiceId(
      invoiceId,
      target,
      amountPaidCents ?? null,
    );
    if (!updated) {
      console.warn(
        `[stripe-webhook] no Neon application matched invoice ${invoiceId} (target=${target}) — may need backfill`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[stripe-webhook] neon update failed for invoice ${invoiceId} → ${target}:`,
      message,
    );
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json(
      { error: "missing signature or webhook secret" },
      { status: 400 },
    );
  }

  const body = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] signature verification failed:", message);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "invoice.paid": {
      const invoice = event.data.object as {
        id?: string;
        amount_paid?: number | null;
        amount_due?: number | null;
      };
      if (!invoice.id) {
        console.warn(
          "[stripe-webhook] invoice.paid event missing invoice id, skipping",
        );
        break;
      }
      // Prefer amount_paid (what was actually collected); fall back to
      // amount_due for the rare case where Stripe reports paid without
      // populating amount_paid yet.
      const amountCents = invoice.amount_paid ?? invoice.amount_due ?? null;
      await syncBoth(invoice.id, "paid", amountCents);
      break;
    }
    case "invoice.voided": {
      const invoice = event.data.object as { id?: string };
      if (!invoice.id) break;
      await syncBoth(invoice.id, "refunded");
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as { invoice?: string | null };
      if (typeof charge.invoice === "string" && charge.invoice) {
        await syncBoth(charge.invoice, "refunded");
      } else {
        console.warn(
          "[stripe-webhook] charge.refunded event has no linked invoice, skipping",
        );
      }
      break;
    }
    case "invoice.payment_failed":
    case "invoice.marked_uncollectible":
      // Logged but not acted on — these are transient/terminal states
      // we surface in the CMS via a future "payment health" view, not
      // by mutating application status today.
      console.info(`[stripe-webhook] ${event.type} received, no action taken`);
      break;
    default:
      // Unhandled events are a 200-no-op so Stripe doesn't keep retrying.
      break;
  }

  return NextResponse.json({ received: true });
}
