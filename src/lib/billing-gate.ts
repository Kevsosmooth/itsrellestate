import * as Sentry from "@sentry/nextjs";
import { requiredDocSlots } from "./required-docs";
import { requiredSlotsSatisfied, listVerifiedSlots } from "./uploads-ledger";
import { createApplicationInvoice } from "./stripe";
import {
  getApplicationRecord,
  recordApplicationInvoice,
  getSql,
} from "./applications-neon";
import { appendStripeColumnsToRow, patchFolderProperties } from "./google";
import type { DocSlot } from "./required-docs";

// PURE + exported for unit testing.
export function shouldBill(
  formType: "tenant" | "landlord",
  requiredSlots: DocSlot[],
  verifiedSlots: { category: string; person: string }[],
): boolean {
  if (formType !== "tenant") return false; // only tenant has a fee
  return requiredSlotsSatisfied(requiredSlots, verifiedSlots);
}

// Concurrency lock: returns true only to the caller that wins the row.
async function claimInvoiceLock(applicationId: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    insert into application_invoice_locks (application_id)
    values (${applicationId}::text)
    on conflict (application_id) do nothing
    returning application_id
  `) as { application_id: string }[];
  return rows.length > 0;
}

async function releaseInvoiceLock(applicationId: string): Promise<void> {
  const sql = getSql();
  await sql`delete from application_invoice_locks where application_id = ${applicationId}::text`;
}

/**
 * Server-authoritative: create the tenant invoice IFF every required document
 * is verified. Idempotent + concurrency-safe (DB lock + deterministic Stripe
 * key). Safe to call after every verify; a no-op until the application is
 * complete.
 */
export async function maybeCreateInvoice(
  applicationId: string,
  formType: "tenant" | "landlord",
): Promise<void> {
  if (formType !== "tenant") return;
  const rec = await getApplicationRecord(applicationId);
  if (!rec) return;
  const required = requiredDocSlots("tenant", rec.payload);
  const verified = await listVerifiedSlots(applicationId);
  if (!shouldBill("tenant", required, verified)) return;

  if (!(await claimInvoiceLock(applicationId))) return; // another verify is handling it

  try {
    const p = rec.payload as { firstName?: string; lastName?: string; email?: string };
    const email = rec.email ?? p.email ?? "";
    if (!email) throw new Error("no applicant email for invoice");
    const { invoiceId } = await createApplicationInvoice({
      email,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      formType: "tenant",
      idempotencyKey: applicationId,
    });
    if (rec.sheetRowNumber) {
      await appendStripeColumnsToRow("Tenant Applications", rec.sheetRowNumber, invoiceId);
    }
    await recordApplicationInvoice(applicationId, invoiceId);
    if (rec.folderId) {
      await patchFolderProperties(rec.folderId, { invoiceCreated: "1", invoiceId });
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { lib: "billing-gate", fn: "maybeCreateInvoice" },
    });
    console.error(
      "[billing-gate] invoice creation failed:",
      err instanceof Error ? err.message : err,
    );
    await releaseInvoiceLock(applicationId); // let a later verify retry
  }
}
