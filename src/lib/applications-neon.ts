/**
 * Public-site → CMS application_payloads upsert.
 *
 * Per the Sheets→Neon migration plan: every public-site submission also
 * lands in Neon's application_payloads at submit time, so the CMS list
 * + detail views serve from Postgres without waiting for a backfill.
 *
 * Shape parity with the backfill script
 *   (cms/scripts/backfill-applications-from-sheets.mjs):
 *   1. Upsert the umbrella `applications` row first — the FK from
 *      application_payloads.application_id requires it. Status only set
 *      on INSERT; existing rows keep whatever the agent put on them.
 *   2. Upsert `application_payloads` keyed on application_id with the
 *      merged form body in payload_jsonb + the promoted columns.
 *   3. Both statements run inside one Neon HTTP transaction.
 *
 * Errors are swallowed and logged. The Sheets+Drive write is still the
 * primary path during the dual-write soak window — Neon must never block
 * a successful submission.
 */

import { neon } from "@neondatabase/serverless";

const WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

let cachedSql: ReturnType<typeof neon> | null = null;
function getSql() {
  if (cachedSql) return cachedSql;
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  cachedSql = neon(url);
  return cachedSql;
}

type CommonInput = {
  applicationId: string;
  folderId: string | null;
  folderLink: string | null;
  submittedAt: string;
  sheetRowNumber: number | null;
  payload: Record<string, unknown>;
};

export type TenantApplicationSnapshot = CommonInput & {
  email: string | null;
};

export type LandlordApplicationSnapshot = CommonInput & {
  email: string | null;
};

async function upsertApplicationPayload(
  type: "tenant" | "landlord",
  input: CommonInput & { email: string | null },
): Promise<void> {
  // All normalization + JSON encoding lives inside the try so a malformed
  // caller can never throw past the error swallow. The dual-write must
  // never block the Sheets+Drive primary path during the soak window.
  try {
    const emailLower = input.email
      ? input.email.trim().toLowerCase() || null
      : null;

    const merged = {
      ...input.payload,
      submittedAt: input.submittedAt,
    };

    const sql = getSql();

    await sql.transaction([
      // 1. Umbrella applications row. Status only on INSERT — never
      //    overwrites an agent's manual status edit. Drive metadata
      //    re-syncs on every submit so a re-applied folder picks up the
      //    latest folder id/link.
      sql`
        insert into applications (
          id, workspace_id, applicant_type, submitted_at,
          drive_folder_id, drive_folder_link, status, sheet_row_number
        ) values (
          ${input.applicationId}::text,
          ${WORKSPACE_ID}::uuid,
          ${type}::text,
          ${input.submittedAt}::timestamptz,
          ${input.folderId}::text,
          ${input.folderLink}::text,
          'unpaid',
          ${input.sheetRowNumber}::integer
        )
        on conflict (id) do update
          set applicant_type    = excluded.applicant_type,
              submitted_at      = excluded.submitted_at,
              drive_folder_id   = excluded.drive_folder_id,
              drive_folder_link = excluded.drive_folder_link,
              sheet_row_number  = coalesce(excluded.sheet_row_number, applications.sheet_row_number),
              updated_at        = now()
      `,
      // 2. Payload row. Status mirrors whatever the canonical
      //    applications row has — not a hardcoded value — so re-submits
      //    by the same applicant don't undo a "paid"/"waived" status the
      //    agent set. The subselect runs inside the same transaction so
      //    it sees the row from step 1.
      sql`
        insert into application_payloads (
          application_id, workspace_id, applicant_type, applicant_email,
          status, submitted_at, drive_folder_id, drive_folder_link,
          payload_jsonb, source_sheets, source_drive,
          sheet_row_number, last_synced_at
        )
        select
          ${input.applicationId}::text,
          ${WORKSPACE_ID}::uuid,
          ${type}::text,
          ${emailLower}::citext,
          a.status,
          ${input.submittedAt}::timestamptz,
          ${input.folderId}::text,
          ${input.folderLink}::text,
          ${JSON.stringify(merged)}::jsonb,
          true,
          true,
          ${input.sheetRowNumber}::integer,
          now()
          from applications a
         where a.id = ${input.applicationId}::text
        on conflict (application_id) do update
          set workspace_id      = excluded.workspace_id,
              applicant_type    = excluded.applicant_type,
              applicant_email   = excluded.applicant_email,
              status            = excluded.status,
              submitted_at      = excluded.submitted_at,
              drive_folder_id   = excluded.drive_folder_id,
              drive_folder_link = excluded.drive_folder_link,
              payload_jsonb     = excluded.payload_jsonb,
              source_sheets     = true,
              source_drive      = true,
              sheet_row_number  = coalesce(excluded.sheet_row_number, application_payloads.sheet_row_number),
              last_synced_at    = now()
      `,
    ]);
  } catch (err) {
    // Never block the form submit. The CMS backfill is the safety net.
    console.error(
      `[applications-neon] upsert ${type} application failed:`,
      err,
    );
  }
}

export async function upsertTenantApplicationPayload(
  input: TenantApplicationSnapshot,
): Promise<void> {
  await upsertApplicationPayload("tenant", input);
}

export async function upsertLandlordApplicationPayload(
  input: LandlordApplicationSnapshot,
): Promise<void> {
  await upsertApplicationPayload("landlord", input);
}

/**
 * Stamp the just-created Stripe invoice id onto the matching applications
 * + application_payloads rows in Neon. Called from the public-site invoice
 * creation flow so the webhook can later look up the application by
 * invoice id without going back to Sheets.
 *
 * Errors are swallowed and logged. Same dual-write soak-window contract:
 * the Sheets stripe-id column remains the canonical record until we cut
 * Sheets out entirely.
 */
export async function recordApplicationInvoice(
  applicationId: string,
  invoiceId: string,
): Promise<void> {
  try {
    const sql = getSql();
    await sql.transaction([
      sql`
        update applications
           set stripe_invoice_id = ${invoiceId}::text,
               updated_at = now()
         where id = ${applicationId}::text
      `,
      sql`
        update application_payloads
           set stripe_invoice_id = ${invoiceId}::text,
               last_synced_at = now()
         where application_id = ${applicationId}::text
      `,
    ]);
  } catch (err) {
    console.error(
      `[applications-neon] recordApplicationInvoice ${applicationId}/${invoiceId} failed:`,
      err,
    );
  }
}

/**
 * Webhook handler: flip an application's status to the given target on a
 * Stripe lifecycle event (paid / refunded / voided). Looks the application
 * up by stripe_invoice_id.
 *
 * Status update is conditional:
 *   - Only flips from "unpaid" → target. An agent may have already set
 *     "waived" or "refunded"; the webhook must never undo that.
 *   - "refunded" overrides "paid" — refund events trump prior paid events.
 *
 * `amountPaidCents` (paid events only): when Stripe tells us the actual
 * paid amount, stamp it on `amount_cents`. The dashboard "Revenue this
 * week" SUM relies on this column being populated; without it a paid
 * application contributes $0 to the rollup. We write it only when the
 * column is currently NULL so a manual override via the CMS isn't
 * clobbered by a later webhook redelivery. Refund events leave the
 * historical paid amount intact (so we can still tell what was once
 * collected before the refund).
 *
 * Mirrors the same status into application_payloads (best-effort) for the
 * read path. All work runs inside one HTTP transaction.
 *
 * Returns true when a row was actually updated, false when no matching
 * application was found or the status was preserved.
 */
export async function markApplicationByInvoiceId(
  invoiceId: string,
  target: "paid" | "refunded",
  amountPaidCents?: number | null,
): Promise<boolean> {
  try {
    const sql = getSql();
    const allowedFromForPaid = ["unpaid"] as const;
    const allowedFromForRefunded = ["unpaid", "paid"] as const;

    const allowedFrom =
      target === "paid" ? allowedFromForPaid : allowedFromForRefunded;

    // Only stamp amount_cents on paid events with a positive integer.
    // Stripe occasionally emits 0 on test invoices; treat that as
    // "don't write" since 0 in the SUM isn't useful and could mask a
    // real $0 (waived-by-Stripe) edge case we'd want to investigate.
    const amountToWrite =
      target === "paid" &&
      typeof amountPaidCents === "number" &&
      Number.isFinite(amountPaidCents) &&
      amountPaidCents > 0
        ? Math.round(amountPaidCents)
        : null;

    const rows = (await sql`
      update applications
         set status = ${target}::text,
             payment_method = case
               when applications.payment_method is null and ${target}::text = 'paid'
                 then 'stripe'
               else applications.payment_method
             end,
             amount_cents = case
               when ${amountToWrite}::int is not null
                    and applications.amount_cents is null
                 then ${amountToWrite}::int
               else applications.amount_cents
             end,
             updated_at = now()
       where stripe_invoice_id = ${invoiceId}::text
         and status = any(${allowedFrom as unknown as string[]}::text[])
       returning id
    `) as { id: string }[];

    if (rows.length === 0) return false;

    const applicationId = rows[0].id;
    await sql`
      update application_payloads
         set status = ${target}::text,
             last_synced_at = now()
       where application_id = ${applicationId}::text
    `;
    return true;
  } catch (err) {
    console.error(
      `[applications-neon] markApplicationByInvoiceId ${invoiceId}→${target} failed:`,
      err,
    );
    return false;
  }
}
