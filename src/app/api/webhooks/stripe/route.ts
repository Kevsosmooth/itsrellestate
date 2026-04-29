import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { updateSheetRowByInvoiceUrl } from "@/lib/google";

export const runtime = "nodejs";

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

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as { id: string; hosted_invoice_url?: string };
    if (!invoice.hosted_invoice_url) {
      console.warn("[stripe-webhook] invoice.paid event missing hosted_invoice_url, skipping sheet update");
      return NextResponse.json({ received: true });
    }
    try {
      await updateSheetRowByInvoiceUrl("Tenant Applications", invoice.hosted_invoice_url, {
        paymentStatus: "Paid",
      });
    } catch (err) {
      console.error("[stripe-webhook] failed to update sheet:", err);
      return NextResponse.json(
        { error: "sheet update failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
