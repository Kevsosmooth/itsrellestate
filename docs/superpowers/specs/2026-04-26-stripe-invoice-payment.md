# Stripe Invoice Payment for Tenant Applications

**Status:** Design (pre-implementation)
**Date:** 2026-04-26
**Author:** Kevin Suriel (with Claude)
**Scope:** Tenant applications only. Landlord flow untouched.

---

## 1. Purpose

Replace the current manual $20 application fee process (Zelle / CashApp / Venmo with handwritten reference numbers) with a Stripe Invoice flow. Tenants receive a Stripe-hosted invoice via email after submitting the application, pay on their own time within a 30-day window, and the Google Sheet automatically reflects payment status when payment is received.

The Sheet remains the source of truth. No database is introduced.

---

## 2. Current State

### Form submission (today)

1. Tenant fills out 7-step form (`src/app/apply/tenant/tenant-form.tsx`).
2. Step 6 displays manual payment instructions (Zelle / CashApp / Venmo) with a client-generated reference number (`MARROD-712451` format) shown for tenant to include in their payment.
3. On final submit, `POST /api/apply/tenant` writes a row to the `Tenant Applications` sheet, creates a Drive folder, and emails Nyrell.
4. Sheet row is written with hardcoded `payment_status = "Unpaid"` and a blank `reference_status` cell.
5. Tenant pays out-of-band via the manual method. Nyrell manually edits the Sheet to mark `payment_status = "Paid"` after confirming receipt.

### Problems with the current state

- No automated payment capture. Nyrell manually reconciles every payment.
- No automatic reminders if a tenant forgets to pay.
- No standard receipt for the tenant.
- Client-generated reference number isn't saved to the Sheet, so the displayed reference is effectively meaningless on the back end.
- Three separate payment apps (Zelle / CashApp / Venmo) means three places to check for incoming money.

---

## 3. Target State

### Submission flow

1. Tenant submits the form (same UX up to step 5).
2. **Step 6 ("Processing Fee") becomes an info screen** explaining that an invoice will be emailed after submission.
3. **Step 7 (Authorization)** unchanged.
4. On submit, `POST /api/apply/tenant`:
   1. Writes the row to Sheet with `payment_status = "Unpaid"` (existing behavior).
   2. Creates Drive folder + uploads + sends Nyrell email (existing behavior).
   3. **NEW:** Creates a Stripe Customer + Invoice for the tenant.
   4. **NEW:** Updates the just-written Sheet row with `stripe_invoice_id` and `stripe_invoice_url`.
   5. Returns existing response payload (success, folder link).
5. Stripe automatically emails the tenant a hosted invoice link.
6. Tenant pays via the Stripe-hosted invoice page on their own time.

### Payment capture flow

1. Tenant clicks the link in their email and pays $20 via Stripe.
2. Stripe processes the payment.
3. Stripe sends an `invoice.paid` webhook event to `POST /api/webhooks/stripe`.
4. The webhook handler:
   1. Verifies the Stripe signature.
   2. Reads `invoice.id` from the event.
   3. Looks up the row in the Sheet where `stripe_invoice_id` matches.
   4. Updates that row: `payment_status = "Paid"` and `paid_date = <ISO timestamp>`.
   5. Returns 200 OK.
5. Nyrell sees the row update next time she opens the Sheet.

### Reminder cadence (Stripe Dashboard configuration)

Configured once in Stripe Dashboard → Settings → Billing → Invoices → "Email finalized invoices and reminders":

| Reminder | Configured as |
|---|---|
| Day 7 (one week after submission) | "23 days before due date" |
| Day 14 | "16 days before due date" |
| Day 27 | "3 days before due date" |
| Day 30 (final) | "On due date" |

Each reminder is a separate rule in the Dashboard. This is account-level config and applies automatically to all future invoices.

### Behavior after 30 days unpaid

- Stripe stops sending reminders after the due date passes.
- Invoice stays in `open` status — **the URL remains payable indefinitely**.
- Sheet stays `Unpaid`.
- Nyrell decides per-applicant: void from Stripe Dashboard if she wants to refuse, or leave open if she wants to keep accepting late payment.
- No auto-expiration logic.

---

## 4. Architecture

### High-level data flow

```
[Tenant submits form]
        |
        v
POST /api/apply/tenant
        |
        +--> appendSheetRow()  ---> Google Sheet (row N: Unpaid, blank stripe cols)
        +--> createApplicantFolder()  ---> Drive folder
        +--> saveApplicationJSON()  ---> Drive
        +--> sendNotificationEmail()  ---> Nyrell
        +--> createApplicationInvoice()  ---> Stripe (Customer + Invoice)
        +--> updateSheetRowByInvoiceId() ---> Sheet (writes invoice_id + url to row N)
        |
        v
[Response: { folderLink, uploadsFolderId }]
        |
        v
[Frontend uploads attached files via existing /api/upload]
        |
        v
[Stripe emails invoice to tenant]


[Tenant pays via Stripe-hosted invoice page]
        |
        v
Stripe POST -> /api/webhooks/stripe
        |
        +--> verifyStripeSignature()
        +--> updateSheetRowByInvoiceId(invoice.id, { payment_status: "Paid", paid_date: now })
        |
        v
[200 OK]
```

### File changes summary

| File | Status | Purpose |
|---|---|---|
| `src/lib/stripe.ts` | NEW | Stripe SDK client + `createApplicationInvoice()` helper |
| `src/app/api/webhooks/stripe/route.ts` | NEW | Webhook receiver for `invoice.paid` events |
| `src/lib/google.ts` | MODIFIED | Add `updateSheetRowByInvoiceId()` and `findRowByCellValue()` helpers |
| `src/app/api/apply/tenant/route.ts` | MODIFIED | Create invoice after Sheet write, populate stripe columns |
| `src/components/forms/payment-step.tsx` | REWRITTEN | Info screen instead of manual payment instructions |
| `src/components/forms/form-success.tsx` | MODIFIED | Remove reference number display; mention email invoice |
| `src/app/apply/tenant/tenant-form.tsx` | MODIFIED | Remove `refNumber` state and `onRefNumber` wiring |
| `.env.local` | UPDATED | Stripe keys added (test mode, already done) |
| `.env.example` | NEW | Document required Stripe env vars (placeholder values) |

---

## 5. Detailed Design

### 5.1 New file: `src/lib/stripe.ts`

```ts
import Stripe from "stripe";

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  throw new Error("STRIPE_SECRET_KEY env var is required");
}

export const stripe = new Stripe(apiKey, {
  apiVersion: "2025-01-27.acacia", // pinned, latest stable as of writing
});

const APPLICATION_FEE_CENTS = 2000; // $20.00
const DUE_DAYS = 30;

export async function createApplicationInvoice(params: {
  email: string;
  firstName: string;
  lastName: string;
  formType: "tenant" | "landlord";
}) {
  const { email, firstName, lastName, formType } = params;
  const fullName = `${firstName} ${lastName}`.trim();

  // 1. Find or create Stripe Customer (idempotent on email)
  const existing = await stripe.customers.list({ email, limit: 1 });
  const customer = existing.data[0]
    ? existing.data[0]
    : await stripe.customers.create({
        email,
        name: fullName,
        metadata: { application_type: formType },
      });

  // 2. Create the invoice item (the line that will appear on the invoice)
  await stripe.invoiceItems.create({
    customer: customer.id,
    amount: APPLICATION_FEE_CENTS,
    currency: "usd",
    description: `ItsRellEstate ${capitalize(formType)} Application Processing Fee — ${fullName}`,
  });

  // 3. Create the invoice itself
  const dueDate = Math.floor(Date.now() / 1000) + DUE_DAYS * 24 * 60 * 60;
  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: "send_invoice",
    due_date: dueDate,
    auto_advance: true, // Stripe handles lifecycle (finalize, send, remind)
    metadata: {
      application_type: formType,
      applicant_email: email,
      applicant_name: fullName,
    },
    description: `${capitalize(formType)} application processing fee for ${fullName}.`,
    footer: `Thank you for applying with ItsRellEstate. Submitted ${new Date().toLocaleDateString("en-US")}.`,
  });

  // 4. Finalize and send (auto_advance true would do this in ~1h; finalizing immediately is faster)
  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  await stripe.invoices.sendInvoice(finalized.id);

  return {
    invoiceId: finalized.id,
    invoiceUrl: finalized.hosted_invoice_url, // public URL Nyrell can copy/paste
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

**Notes:**
- `Stripe.customers.list({ email })` is used to dedupe Customer records. If a tenant resubmits with the same email, they reuse the Customer record (cleaner Stripe Dashboard).
- `auto_advance: true` is required for Stripe to send reminders automatically per the Dashboard schedule.
- `hosted_invoice_url` is the canonical pay link Nyrell will copy/paste from the Sheet.
- API version is pinned to avoid surprise breaking changes.

### 5.2 New file: `src/app/api/webhooks/stripe/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { updateSheetRowByInvoiceId } from "@/lib/google";

export const runtime = "nodejs"; // Stripe SDK requires Node runtime

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const body = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as { id: string };
    await updateSheetRowByInvoiceId("Tenant Applications", invoice.id, {
      payment_status: "Paid",
      paid_date: new Date().toISOString(),
    });
  }

  return NextResponse.json({ received: true });
}
```

**Notes:**
- Uses `req.text()` (raw body) because Stripe signature verification requires the unparsed body.
- Returns 200 even on unrecognized event types (keeps Stripe from retrying).
- Only listens for `invoice.paid` for now. Other events (`invoice.payment_failed`, `invoice.voided`) can be added later if needed.

### 5.3 Modified: `src/lib/google.ts` — new lookup/update helpers

Add three new helpers (in addition to the `appendSheetRow` change in 5.4):

```ts
export async function findRowByCellValue(params: {
  sheetName: string;
  columnLetter: string;
  value: string;
}): Promise<number | null> {
  const sheets = await getSheets();
  const range = `'${params.sheetName}'!${params.columnLetter}:${params.columnLetter}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range,
  });
  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === params.value) {
      return i + 1; // 1-indexed sheet row number
    }
  }
  return null;
}

export async function updateSheetRowByInvoiceId(
  sheetName: string,
  invoiceId: string,
  updates: Record<string, string>,
): Promise<void> {
  // Column map (must match the order written by appendSheetRow):
  // A: timestamp
  // B: reference_status (currently blank, kept for future use)
  // C: payment_status
  // ...
  // (new columns appended at the end)
  // X: stripe_invoice_id
  // Y: stripe_invoice_url
  // Z: paid_date

  const STRIPE_INVOICE_ID_COLUMN = "X"; // exact letter TBD when columns are added to sheet
  const PAYMENT_STATUS_COLUMN = "C";
  const PAID_DATE_COLUMN = "Z";

  const rowNum = await findRowByCellValue({
    sheetName,
    columnLetter: STRIPE_INVOICE_ID_COLUMN,
    value: invoiceId,
  });
  if (!rowNum) {
    throw new Error(`No row found with stripe_invoice_id=${invoiceId}`);
  }

  const sheets = await getSheets();
  const updatesArr: { range: string; values: string[][] }[] = [];

  if (updates.payment_status) {
    updatesArr.push({
      range: `'${sheetName}'!${PAYMENT_STATUS_COLUMN}${rowNum}`,
      values: [[updates.payment_status]],
    });
  }
  if (updates.paid_date) {
    updatesArr.push({
      range: `'${sheetName}'!${PAID_DATE_COLUMN}${rowNum}`,
      values: [[updates.paid_date]],
    });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "RAW",
      data: updatesArr,
    },
  });
}

export async function appendStripeColumnsToRow(
  sheetName: string,
  rowNum: number,
  invoiceId: string,
  invoiceUrl: string,
): Promise<void> {
  const STRIPE_INVOICE_ID_COLUMN = "X";
  const STRIPE_INVOICE_URL_COLUMN = "Y";

  const sheets = await getSheets();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: `'${sheetName}'!${STRIPE_INVOICE_ID_COLUMN}${rowNum}`,
          values: [[invoiceId]],
        },
        {
          range: `'${sheetName}'!${STRIPE_INVOICE_URL_COLUMN}${rowNum}`,
          values: [[invoiceUrl]],
        },
      ],
    },
  });
}
```

**Notes:**
- Exact column letters depend on the final Sheet column count after additions; finalized during implementation.
- `appendSheetRow` already returns the appended row number — we'll use that to write Stripe columns to the same row without searching.

### 5.4 Modified: `src/lib/google.ts` — `appendSheetRow` return value

The current `appendSheetRow` returns `void`. We need to change it to return the appended row number so the caller can write to the same row without a search query:

```ts
export async function appendSheetRow(
  sheetName: string,
  values: string[],
): Promise<{ rowNumber: number }> {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SPREADSHEET_ID not set");

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:A`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });

  // Sheets API returns updatedRange like 'Tenant Applications'!A47:AW47
  // Parse the row number from it.
  const updatedRange = res.data.updates?.updatedRange || "";
  const match = updatedRange.match(/!\D+(\d+):/);
  const rowNumber = match ? parseInt(match[1], 10) : 0;
  if (!rowNumber) throw new Error("Failed to parse row number from append response");

  return { rowNumber };
}
```

This is a non-breaking signature change for existing callers — the landlord route also calls this and ignores the return value, so it stays compatible.

### 5.5 Modified: `src/app/api/apply/tenant/route.ts`

Add the following block **after** the existing `appendSheetRow` call but **before** returning the response:

```ts
// Existing code: writes row, creates folder, sends email
const { rowNumber } = await appendSheetRow("Tenant Applications", [...]);

// ... existing folder + email code ...

// NEW: create Stripe invoice and back-fill row
try {
  const { invoiceId, invoiceUrl } = await createApplicationInvoice({
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    formType: "tenant",
  });

  await appendStripeColumnsToRow("Tenant Applications", rowNumber, invoiceId, invoiceUrl);
} catch (err) {
  // Don't fail the whole submission. Log and continue.
  // Nyrell can manually create the invoice from Dashboard if needed.
  console.error("[stripe-invoice]", err);
}

return NextResponse.json({ folderLink, uploadsFolderId });
```

**Why try/catch:** if Stripe is down or rate-limited, the application should still be captured. The Sheet row exists; only the invoice columns are blank. Nyrell sees the gap and can manually create an invoice in Stripe Dashboard.

### 5.6 Rewritten: `src/components/forms/payment-step.tsx`

Replace the entire component body with an info screen using existing design tokens. Pseudo-content:

```tsx
"use client";

import { cn } from "@/lib/utils";

export function PaymentStep({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-6 px-4 py-6", className)}>
      <div className="text-center">
        <p className="text-sm text-text-muted mb-1">Application Processing Fee</p>
        <p className="text-4xl font-bold text-text-primary">$20.00</p>
        <p className="text-xs text-text-muted mt-1">One-time, non-refundable</p>
      </div>

      <div className="rounded-lg bg-surface p-4 text-sm text-text-secondary">
        <p className="font-semibold text-text-primary mb-2">How payment works:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Submit your application on the next step.</li>
          <li>You'll receive an emailed invoice from Stripe.</li>
          <li>Click the link in the email to pay $20 securely.</li>
          <li>Your application enters review once payment is received.</li>
        </ol>
      </div>

      <p className="text-xs text-text-muted text-center">
        The invoice link will remain valid for 30 days. Check your spam folder if
        you don't see the email within a few minutes of submitting.
      </p>
    </div>
  );
}
```

Props removed: `applicantName`, `onRefNumber`. Component is now stateless.

### 5.7 Modified: `src/components/forms/form-success.tsx`

Remove the reference number display block (lines ~53–58). Add a "check your email" message:

```tsx
// Replace existing reference number paragraph with:
{type === "tenant" && (
  <div className="mt-4 rounded-lg bg-primary/5 p-4 text-sm text-text-secondary">
    <p className="font-semibold text-text-primary mb-1">Check your email</p>
    <p>
      We've sent a $20 invoice from <span className="font-mono">invoices@stripe.com</span> to
      complete your application. The invoice link is valid for 30 days. Don't see it?
      Check your spam folder.
    </p>
  </div>
)}
```

### 5.8 Modified: `src/app/apply/tenant/tenant-form.tsx`

- Remove `refNumber` state (line 170)
- Remove `setRefNumber` call in restore effect (line 179)
- Remove `markSubmitted(..., refNumber)` extra arg (line 216) — pass undefined
- Remove `referenceNumber={refNumber}` prop on FormSuccess (line 230)
- Remove `onRefNumber` prop wiring on PaymentStep wherever it's passed

### 5.9 Sheet schema changes

Manual one-time setup (or scripted via `appendSheetRow` updates):

| Column | Header | Notes |
|---|---|---|
| A | timestamp | existing |
| B | reference_status | existing — kept blank for future use |
| C | payment_status | existing — `Unpaid` / `Paid` |
| D…W | (existing 45 form fields) | unchanged |
| X | stripe_invoice_id | NEW — `in_1AbCdEf...` |
| Y | stripe_invoice_url | NEW — full hosted invoice URL, clickable in Sheets |
| Z | paid_date | NEW — ISO timestamp, blank until paid |

Action item: Nyrell or Kevin manually adds the three column headers (X, Y, Z) to the existing `Tenant Applications` sheet before deploy. The `appendSheetRow` call already writes 49 cells (45 fields + timestamp + 2 status cols + folderLink); adding 3 more cells extends the row write to columns X, Y, Z (initially blank, populated by `appendStripeColumnsToRow`).

Actually — re-reading the existing code, `appendSheetRow` writes exactly the 50 values shown in the array. We need to either (a) push three blank entries onto the array so Sheets pre-allocates the cells, or (b) call `appendStripeColumnsToRow` after the append completes. Option (b) is cleaner and matches the design above.

### 5.10 Stripe Dashboard configuration (one-time, manual)

Steps Nyrell or Kevin performs once in the Stripe Dashboard:

1. **Reminder schedule** (Settings → Billing → Invoices → "Email finalized invoices and reminders"):
   - Toggle on
   - Add rule: 23 days before due date
   - Add rule: 16 days before due date
   - Add rule: 3 days before due date
   - Add rule: 0 days after due date (= "on due date")
   - Save

2. **Webhook endpoint** (Developers → Webhooks → Add endpoint):
   - Endpoint URL: `https://itsrellestate.com/api/webhooks/stripe` (or staging URL during dev)
   - Events to listen for: `invoice.paid`
   - Copy the signing secret (starts `whsec_...`) into `.env.local` as `STRIPE_WEBHOOK_SECRET`
   - For local dev: use `stripe listen --forward-to localhost:8080/api/webhooks/stripe`

3. **Branding** (Settings → Branding):
   - Upload logo
   - Set brand color to project primary
   - Set support email to `nyrell@itsrellestate.com`
   - This styles the hosted invoice page and emails

---

## 6. Failure Modes

| Scenario | Behavior | Mitigation |
|---|---|---|
| Stripe API down during invoice creation | Sheet row written, folder created, but invoice columns blank | Try/catch in tenant route; Nyrell sees blank invoice columns and creates invoice manually from Dashboard |
| Sheet write fails before invoice creation | Whole request 500s; tenant retries | Existing behavior, no regression |
| Invoice created but Sheet update fails | Invoice exists in Stripe but row is missing `stripe_invoice_id` | Webhook can't match; Nyrell manually correlates via Stripe customer email and types the invoice ID into the Sheet |
| Webhook signature verification fails | 400 returned; no Sheet update | Investigate `STRIPE_WEBHOOK_SECRET` value mismatch |
| Webhook fires for unknown invoice ID | `findRowByCellValue` returns null; throws | Logged via Sentry; payment status manually updated; root cause = Sheet write race or human deletion of row |
| Tenant typos email address | Invoice goes to wrong address; no payment | Form already validates email format; Stripe email bounces; Nyrell sees 30 days of `Unpaid` and reaches out |
| Tenant pays then disputes | Stripe sends `charge.dispute.created`; not handled | Future work — for now Nyrell manages disputes in Stripe Dashboard |
| Webhook fires twice (Stripe retry) | Sheet updated twice with same `Paid` value | Idempotent — same value written, no harm |

---

## 7. Test Plan

### Manual end-to-end (test mode)

1. Start dev server on port 8080.
2. Run `stripe listen --forward-to localhost:8080/api/webhooks/stripe` in a second terminal; copy printed `whsec_...` into `.env.local`.
3. Submit a tenant application with a real email you control.
4. Confirm:
   - Sheet row written with `payment_status = "Unpaid"`
   - `stripe_invoice_id` and `stripe_invoice_url` populated
   - Invoice email arrives in inbox
5. Open the invoice URL in browser; pay using Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.
6. Confirm:
   - Stripe Dashboard shows invoice as `Paid`
   - Webhook event delivered (visible in `stripe listen` output)
   - Sheet row updates: `payment_status = "Paid"`, `paid_date` populated within seconds

### Edge cases

- Submit with invalid email format → form blocks before reaching API
- Submit twice with same email → Stripe Customer is reused (verify in Dashboard)
- Pay with declined card (`4000 0000 0000 0002`) → invoice stays `open`, Sheet stays `Unpaid`
- Wait for Stripe reminder email cycle (test mode supports time advancement via Dashboard)

### Type / lint

- `pnpm tsc --noEmit` passes
- `pnpm lint` passes
- No `any` types in new code
- No hardcoded values

---

## 8. Production Cutover

Performed when launching to production:

1. Switch Stripe Dashboard from test mode to live mode.
2. Generate live API keys (`sk_live_...`, `pk_live_...`).
3. Add live keys to **Vercel environment variables** (production scope only) — never commit, never log.
4. Recreate webhook endpoint in live mode pointing to production URL.
5. Copy live webhook signing secret to Vercel env vars.
6. Reconfigure reminder schedule in live mode (Dashboard config doesn't transfer between modes).
7. Reconfigure branding in live mode (also doesn't transfer).
8. Deploy. Submit one real test application end-to-end. Verify Sheet update.

Test keys remain in `.env.local` for local development.

---

## 9. Open Questions / Future Work

- **Landlord application fee**: out of scope for this spec. Same pattern can be applied if/when Nyrell decides to charge landlords.
- **Refund flow**: Nyrell can issue refunds from Stripe Dashboard. Future work could add a webhook listener for `charge.refunded` to update Sheet `payment_status = "Refunded"`.
- **Failed payment notifications**: future work could listen for `invoice.payment_failed` and update Sheet to surface to Nyrell.
- **Dispute handling**: out of scope; managed manually via Stripe Dashboard for now.
- **Email delivery monitoring**: Stripe email bounces aren't surfaced to Nyrell today. Future work could listen for bounce events.
- **Multiple application fees**: if Nyrell ever adds different fee tiers, the hardcoded `$20.00 / 2000 cents` becomes a config value.

---

## 10. Out of Scope

- Custom payment UI (no embedded Checkout, no Payment Element)
- Reference number generation (decided: applicant name + email is sufficient lookup)
- Database introduction (Sheet remains source of truth)
- Subscription / recurring billing
- In-person payment (no Terminal / Tap to Pay)
- Multi-currency support
- Tax calculation (none required for $20 application fee in NY)
- Receipt customization beyond Stripe's default (default is fine)
- Auto-expiration / void of unpaid invoices (Nyrell decides per applicant)
