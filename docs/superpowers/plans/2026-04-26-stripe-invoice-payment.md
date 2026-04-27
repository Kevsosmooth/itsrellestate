# Stripe Invoice Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual $20 tenant application fee process with Stripe Invoices that auto-email applicants on submission, send reminders over a 30-day window, and update Google Sheets via webhook on payment.

**Architecture:** Server-side Stripe Invoice creation triggered from existing tenant submission API after the Sheet row is written. A new webhook endpoint receives `invoice.paid` events from Stripe and updates the corresponding Sheet row by `stripe_invoice_id`. No database introduced — Sheet remains source of truth.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict mode, `stripe` SDK (Node), `googleapis` (existing), Tailwind tokens (existing). No unit test framework in the project — validation is via `pnpm tsc --noEmit`, `pnpm lint`, and manual end-to-end testing with Stripe CLI.

**Source spec:** `docs/superpowers/specs/2026-04-26-stripe-invoice-payment.md`

**Constraint from user:** Do **not** push to remote during implementation; commits to local main only. User will test in dev before deciding to push.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/lib/stripe.ts` | NEW | Stripe SDK singleton + `createApplicationInvoice` helper |
| `src/lib/google.ts` | MODIFY | Add `appendStripeColumnsToRow`, `findRowByCellValue`, `updateSheetRowByInvoiceId`; change `appendSheetRow` return type |
| `src/app/api/apply/tenant/route.ts` | MODIFY | Capture row number from `appendSheetRow`, create invoice, write Stripe columns to row |
| `src/app/api/webhooks/stripe/route.ts` | NEW | Receive `invoice.paid`, verify signature, update Sheet |
| `src/components/forms/payment-step.tsx` | REWRITE | Info screen explaining email-invoice flow |
| `src/components/forms/form-success.tsx` | MODIFY | Remove reference number block; add "check your email" notice |
| `src/app/apply/tenant/tenant-form.tsx` | MODIFY | Remove `refNumber` state, `setRefNumber`, `onRefNumber` wiring |
| `src/lib/form-storage.ts` | MODIFY | Drop `referenceNumber` from `SubmittedState` interface and `markSubmitted` signature |
| `package.json` | MODIFY | Add `stripe` dependency |
| `.env.example` | NEW | Document required env vars (placeholder values, committable) |

---

## Task 1: Install the Stripe SDK

**Files:**
- Modify: `package.json` and `pnpm-lock.yaml` (auto-updated by pnpm)

- [ ] **Step 1: Install the Stripe Node SDK**

Run: `pnpm add stripe`
Expected: `package.json` gains `"stripe": "^X.Y.Z"` under `dependencies`. `pnpm-lock.yaml` updates.

- [ ] **Step 2: Verify install**

Run: `pnpm list stripe`
Expected: prints the installed version. No errors.

- [ ] **Step 3: Type check**

Run: `pnpm tsc --noEmit`
Expected: passes (no new errors introduced — we haven't imported stripe yet).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add stripe sdk"
```

---

## Task 2: Create the Stripe client + invoice helper

**Files:**
- Create: `src/lib/stripe.ts`

- [ ] **Step 1: Create the Stripe singleton + createApplicationInvoice helper**

Create `/volume1/playground/itsrellestate/src/lib/stripe.ts` with:

```ts
import Stripe from "stripe";

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  throw new Error("STRIPE_SECRET_KEY env var is required");
}

export const stripe = new Stripe(apiKey, {
  apiVersion: "2025-01-27.acacia",
});

const APPLICATION_FEE_CENTS = 2000;
const DUE_DAYS = 30;

export interface ApplicationInvoiceParams {
  email: string;
  firstName: string;
  lastName: string;
  formType: "tenant" | "landlord";
}

export interface ApplicationInvoiceResult {
  invoiceId: string;
  invoiceUrl: string;
}

export async function createApplicationInvoice(
  params: ApplicationInvoiceParams,
): Promise<ApplicationInvoiceResult> {
  const { email, firstName, lastName, formType } = params;
  const fullName = `${firstName} ${lastName}`.trim();
  const formTypeLabel = formType === "tenant" ? "Tenant" : "Landlord";

  const existing = await stripe.customers.list({ email, limit: 1 });
  const customer = existing.data[0]
    ? existing.data[0]
    : await stripe.customers.create({
        email,
        name: fullName,
        metadata: { application_type: formType },
      });

  await stripe.invoiceItems.create({
    customer: customer.id,
    amount: APPLICATION_FEE_CENTS,
    currency: "usd",
    description: `ItsRellEstate ${formTypeLabel} Application Processing Fee — ${fullName}`,
  });

  const dueDate = Math.floor(Date.now() / 1000) + DUE_DAYS * 24 * 60 * 60;
  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: "send_invoice",
    due_date: dueDate,
    auto_advance: true,
    metadata: {
      application_type: formType,
      applicant_email: email,
      applicant_name: fullName,
    },
    description: `${formTypeLabel} application processing fee for ${fullName}.`,
    footer: `Thank you for applying with ItsRellEstate. Submitted ${new Date().toLocaleDateString("en-US")}.`,
  });

  if (!invoice.id) {
    throw new Error("Stripe invoice creation returned no id");
  }

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  if (!finalized.id) {
    throw new Error("Stripe invoice finalization returned no id");
  }

  await stripe.invoices.sendInvoice(finalized.id);

  if (!finalized.hosted_invoice_url) {
    throw new Error("Stripe finalized invoice missing hosted_invoice_url");
  }

  return {
    invoiceId: finalized.id,
    invoiceUrl: finalized.hosted_invoice_url,
  };
}
```

- [ ] **Step 2: Type check**

Run: `pnpm tsc --noEmit`
Expected: passes. If the Stripe API version constant is rejected, update it to whatever the installed `stripe` package exports as the latest type — search the installed package's types: `grep -r "apiVersion" node_modules/stripe/types/ | head -5` and use the exact string the SDK expects.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: passes. No `any`, no hardcoded color/font/spacing values (none expected — pure server module).

- [ ] **Step 4: Commit**

```bash
git add src/lib/stripe.ts
git commit -m "feat(payments): add stripe client and invoice helper"
```

---

## Task 3: Modify `appendSheetRow` to return the row number

**Files:**
- Modify: `src/lib/google.ts:283-298`

- [ ] **Step 1: Replace the appendSheetRow implementation**

Open `/volume1/playground/itsrellestate/src/lib/google.ts`. Replace the `appendSheetRow` function (currently at lines 283–298) with:

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

  const updatedRange = res.data.updates?.updatedRange ?? "";
  const match = updatedRange.match(/!\D+(\d+):/);
  const rowNumber = match ? parseInt(match[1], 10) : 0;
  if (!rowNumber) {
    throw new Error(`Failed to parse row number from append response: ${updatedRange}`);
  }

  return { rowNumber };
}
```

- [ ] **Step 2: Type check**

Run: `pnpm tsc --noEmit`
Expected: **fails** at the existing `appendSheetRow` callers because they currently treat the return as `void`. Note the failing files — they will be `src/app/api/apply/tenant/route.ts` and `src/app/api/apply/landlord/route.ts`. Also potentially the call to `appendSheetRow` will not have a syntax error since they used `await appendSheetRow(...)` without consuming the return — TypeScript allows ignoring a return value, so this may actually pass. **If it passes, proceed.** If it fails, fix only the type errors that arose without changing logic in the landlord route.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/google.ts
git commit -m "refactor(google): return row number from appendSheetRow"
```

---

## Task 4: Add lookup + update helpers to google.ts

**Files:**
- Modify: `src/lib/google.ts` (append at end of file, before final newline)

- [ ] **Step 1: Append three new helper functions to `src/lib/google.ts`**

After the `appendSheetRow` function and before the file's trailing whitespace, append:

```ts

const TENANT_STRIPE_INVOICE_ID_COLUMN = "AX";
const TENANT_STRIPE_INVOICE_URL_COLUMN = "AY";
const TENANT_PAID_DATE_COLUMN = "AZ";
const TENANT_PAYMENT_STATUS_COLUMN = "C";

export async function appendStripeColumnsToRow(
  sheetName: string,
  rowNumber: number,
  invoiceId: string,
  invoiceUrl: string,
): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SPREADSHEET_ID not set");

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: `'${sheetName}'!${TENANT_STRIPE_INVOICE_ID_COLUMN}${rowNumber}`,
          values: [[invoiceId]],
        },
        {
          range: `'${sheetName}'!${TENANT_STRIPE_INVOICE_URL_COLUMN}${rowNumber}`,
          values: [[invoiceUrl]],
        },
      ],
    },
  });
}

export async function findRowByCellValue(params: {
  sheetName: string;
  columnLetter: string;
  value: string;
}): Promise<number | null> {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SPREADSHEET_ID not set");

  const range = `'${params.sheetName}'!${params.columnLetter}:${params.columnLetter}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const rows = res.data.values ?? [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === params.value) {
      return i + 1;
    }
  }
  return null;
}

export async function updateSheetRowByInvoiceId(
  sheetName: string,
  invoiceId: string,
  updates: { paymentStatus?: string; paidDate?: string },
): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SPREADSHEET_ID not set");

  const rowNum = await findRowByCellValue({
    sheetName,
    columnLetter: TENANT_STRIPE_INVOICE_ID_COLUMN,
    value: invoiceId,
  });
  if (!rowNum) {
    throw new Error(`No row found with stripe_invoice_id=${invoiceId}`);
  }

  const data: { range: string; values: string[][] }[] = [];
  if (updates.paymentStatus) {
    data.push({
      range: `'${sheetName}'!${TENANT_PAYMENT_STATUS_COLUMN}${rowNum}`,
      values: [[updates.paymentStatus]],
    });
  }
  if (updates.paidDate) {
    data.push({
      range: `'${sheetName}'!${TENANT_PAID_DATE_COLUMN}${rowNum}`,
      values: [[updates.paidDate]],
    });
  }

  if (data.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data,
    },
  });
}
```

**Note on column letters:** The existing `appendSheetRow` writes 50 cells (timestamp + reference_status + payment_status + 46 form fields + folderLink). 50 cells = columns A–AX. So `stripe_invoice_id` lives in column **AX**? Verify: A=1, Z=26, AA=27, AX = 26 + 24 = 50. So column AX is the 50th column, which is `folderLink`. The new columns must come AFTER, at AY, AZ, BA. **Update the constants** at the top of the appended block to:

```ts
const TENANT_STRIPE_INVOICE_ID_COLUMN = "AY";
const TENANT_STRIPE_INVOICE_URL_COLUMN = "AZ";
const TENANT_PAID_DATE_COLUMN = "BA";
const TENANT_PAYMENT_STATUS_COLUMN = "C";
```

Use these corrected values in the actual code you write.

- [ ] **Step 2: Type check**

Run: `pnpm tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/google.ts
git commit -m "feat(google): add stripe column helpers"
```

---

## Task 5: Wire invoice creation into tenant submission route

**Files:**
- Modify: `src/app/api/apply/tenant/route.ts`

- [ ] **Step 1: Import the new helpers**

At the top of `src/app/api/apply/tenant/route.ts`, add `appendStripeColumnsToRow` to the existing import from `@/lib/google` and add a new import for `createApplicationInvoice`:

```ts
import {
  createApplicantFolder,
  saveApplicationJSON,
  appendSheetRow,
  appendStripeColumnsToRow,
  sendNotificationEmail,
} from "@/lib/google";
import { createApplicationInvoice } from "@/lib/stripe";
import { tenantSchema, sanitizeForStorage } from "@/lib/validation";
```

- [ ] **Step 2: Capture the row number from appendSheetRow**

Replace this block (currently at line 68):

```ts
await appendSheetRow("Tenant Applications", [
```

with:

```ts
const { rowNumber } = await appendSheetRow("Tenant Applications", [
```

The closing `]);` at line 121 stays unchanged.

- [ ] **Step 3: Add invoice creation block after the Sheet write**

After line 121 (`]);` closing the appendSheetRow call) and BEFORE the `sendNotificationEmail` call at line 123, insert:

```ts
    try {
      const { invoiceId, invoiceUrl } = await createApplicationInvoice({
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        formType: "tenant",
      });
      await appendStripeColumnsToRow(
        "Tenant Applications",
        rowNumber,
        invoiceId,
        invoiceUrl,
      );
    } catch (err) {
      console.error("[stripe-invoice] failed to create invoice:", err);
    }

```

The try/catch ensures application capture is never blocked by Stripe errors.

- [ ] **Step 4: Type check**

Run: `pnpm tsc --noEmit`
Expected: passes.

- [ ] **Step 5: Lint**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/apply/tenant/route.ts
git commit -m "feat(payments): create stripe invoice on tenant submission"
```

---

## Task 6: Create the Stripe webhook receiver

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Create the webhook route file**

Create `/volume1/playground/itsrellestate/src/app/api/webhooks/stripe/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { updateSheetRowByInvoiceId } from "@/lib/google";

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
    const invoice = event.data.object as { id: string };
    try {
      await updateSheetRowByInvoiceId("Tenant Applications", invoice.id, {
        paymentStatus: "Paid",
        paidDate: new Date().toISOString(),
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
```

**Notes:**
- Returns 200 for unrecognized event types (so Stripe doesn't retry indefinitely on event types we don't handle).
- Returns 500 only on Sheet update failure so Stripe will retry — protects against transient Sheets API failures.
- Returns 400 on signature failures because retries won't fix that; it indicates a config mismatch.

- [ ] **Step 2: Type check**

Run: `pnpm tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat(payments): add stripe invoice.paid webhook"
```

---

## Task 7: Rewrite the payment step as an info screen

**Files:**
- Modify: `src/components/forms/payment-step.tsx`

- [ ] **Step 1: Replace the file contents entirely**

Overwrite `/volume1/playground/itsrellestate/src/components/forms/payment-step.tsx` with:

```tsx
"use client";

import { cn } from "@/lib/utils";

interface PaymentStepProps {
  confirmed: boolean;
  onConfirmChange: (confirmed: boolean) => void;
  className?: string;
}

export function PaymentStep({
  confirmed,
  onConfirmChange,
  className,
}: PaymentStepProps) {
  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <div className="text-center">
        <p className="text-sm text-text-muted mb-1">Application Processing Fee</p>
        <p className="text-4xl font-bold text-text-primary">$20.00</p>
        <p className="text-xs text-text-muted mt-1">One-time, non-refundable</p>
      </div>

      <div className="w-full rounded-lg bg-surface p-4 text-sm text-text-secondary">
        <p className="font-semibold text-text-primary mb-2">How payment works</p>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Submit your application on the next step.</li>
          <li>You will receive an emailed invoice from Stripe.</li>
          <li>Click the link in the email to pay $20 securely.</li>
          <li>Your application enters review once payment is received.</li>
        </ol>
      </div>

      <p className="text-xs text-text-muted text-center">
        The invoice link will remain valid for 30 days. Check your spam folder if you do not
        see the email within a few minutes of submitting.
      </p>

      <label className="flex items-start gap-3 cursor-pointer w-full">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmChange(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded accent-primary shrink-0"
        />
        <span className="text-sm text-text-primary leading-relaxed">
          I understand a $20 non-refundable processing fee is required and my application will
          be reviewed once payment is received.
        </span>
      </label>
    </div>
  );
}
```

**Notes on changes:**
- Removed: `applicantName`, `onRefNumber` props; client-side reference number generation; copy button; Zelle/CashApp/Venmo list.
- Kept: `confirmed`, `onConfirmChange` (still needed for the consent checkbox the form validates).
- All values use existing Tailwind tokens (`text-text-muted`, `bg-surface`, `text-primary`, etc.) — zero hardcoded.

- [ ] **Step 2: Type check**

Run: `pnpm tsc --noEmit`
Expected: **fails** in `src/app/apply/tenant/tenant-form.tsx` because the existing `Step5Payment` wrapper still passes `applicantName` and `onRefNumber` to `PaymentStep`. This is expected — Task 8 fixes it.

- [ ] **Step 3: Commit**

```bash
git add src/components/forms/payment-step.tsx
git commit -m "feat(forms): convert payment step to info screen"
```

---

## Task 8: Remove reference-number wiring from tenant-form.tsx

**Files:**
- Modify: `src/app/apply/tenant/tenant-form.tsx`

- [ ] **Step 1: Remove `refNumber` state**

In `tenant-form.tsx`, remove line 170:

```ts
  const [refNumber, setRefNumber] = useState("");
```

- [ ] **Step 2: Remove the restored-reference effect line**

In the `useEffect` block at lines 175–182, remove line 179:

```ts
      setRefNumber(prev.referenceNumber ?? "");
```

So the effect becomes:

```ts
  useEffect(() => {
    const prev = getSubmitted(TENANT_STORAGE_KEY);
    if (prev) {
      setSubmittedName(prev.firstName);
      setIsSubmitted(true);
    }
  }, []);
```

- [ ] **Step 3: Update the markSubmitted call**

At line 216, change:

```ts
      markSubmitted(TENANT_STORAGE_KEY, data.firstName, refNumber);
```

to:

```ts
      markSubmitted(TENANT_STORAGE_KEY, data.firstName);
```

- [ ] **Step 4: Update the handleSubmit dependency array**

At line 223, change:

```ts
  }, [data, stagedAttachments, refNumber]);
```

to:

```ts
  }, [data, stagedAttachments]);
```

- [ ] **Step 5: Remove referenceNumber prop from FormSuccess**

At lines 225–232, the early-return block, change:

```tsx
  if (isSubmitted) {
    return (
      <FormSuccess
        type="tenant"
        firstName={submittedName || data.firstName}
        referenceNumber={refNumber}
      />
    );
  }
```

to:

```tsx
  if (isSubmitted) {
    return (
      <FormSuccess
        type="tenant"
        firstName={submittedName || data.firstName}
      />
    );
  }
```

- [ ] **Step 6: Remove `onRefNumber` from the wizard's renderStep**

At lines 241–249, change:

```tsx
      renderStep={(stepIndex) => (
        <TenantStep
          step={stepIndex}
          data={data}
          onRefNumber={setRefNumber}
          stagedAttachments={stagedAttachments}
          setStagedAttachments={setStagedAttachments}
        />
      )}
```

to:

```tsx
      renderStep={(stepIndex) => (
        <TenantStep
          step={stepIndex}
          data={data}
          stagedAttachments={stagedAttachments}
          setStagedAttachments={setStagedAttachments}
        />
      )}
```

- [ ] **Step 7: Remove `onRefNumber` from TenantStep signature**

At lines 260–272, change:

```tsx
function TenantStep({
  step,
  data,
  onRefNumber,
  stagedAttachments,
  setStagedAttachments,
}: {
  step: number;
  data: TenantFormData;
  onRefNumber?: (ref: string) => void;
  stagedAttachments: StagedAttachments;
  setStagedAttachments: React.Dispatch<React.SetStateAction<StagedAttachments>>;
}) {
```

to:

```tsx
function TenantStep({
  step,
  data,
  stagedAttachments,
  setStagedAttachments,
}: {
  step: number;
  data: TenantFormData;
  stagedAttachments: StagedAttachments;
  setStagedAttachments: React.Dispatch<React.SetStateAction<StagedAttachments>>;
}) {
```

- [ ] **Step 8: Remove `onRefNumber` from case 5 dispatch**

At line 288, change:

```tsx
    case 5: return <Step5Payment data={data} onChange={onChange} errors={errors} onRefNumber={onRefNumber} />;
```

to:

```tsx
    case 5: return <Step5Payment data={data} onChange={onChange} errors={errors} />;
```

- [ ] **Step 9: Update Step5Payment**

At lines 961–976, replace:

```tsx
function Step5Payment({
  data,
  onChange,
  onRefNumber,
}: StepProps & { onRefNumber?: (ref: string) => void }) {
  return (
    <PaymentStep
      applicantName={`${data.firstName} ${data.lastName}`}
      confirmed={data.paymentConfirmed}
      onConfirmChange={(v) => {
        onChange("paymentConfirmed", v);
      }}
      onRefNumber={onRefNumber}
    />
  );
}
```

with:

```tsx
function Step5Payment({ data, onChange }: StepProps) {
  return (
    <PaymentStep
      confirmed={data.paymentConfirmed}
      onConfirmChange={(v) => {
        onChange("paymentConfirmed", v);
      }}
    />
  );
}
```

- [ ] **Step 10: Type check**

Run: `pnpm tsc --noEmit`
Expected: **may fail** in `form-storage.ts` if `markSubmitted` still requires the third arg (it's optional, so it should pass) and may fail in `form-success.tsx` if it now receives no `referenceNumber` prop (it's optional already, so passes). Should pass overall — Task 9 covers the storage cleanup.

- [ ] **Step 11: Lint**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 12: Commit**

```bash
git add src/app/apply/tenant/tenant-form.tsx
git commit -m "refactor(forms): drop client-side reference number wiring"
```

---

## Task 9: Clean up form-storage.ts

**Files:**
- Modify: `src/lib/form-storage.ts`

- [ ] **Step 1: Drop `referenceNumber` from `SubmittedState` and `markSubmitted` signature**

Replace the SubmittedState interface (lines 48–52) and `markSubmitted` function (lines 54–61) with:

```ts
interface SubmittedState {
  firstName: string;
  submittedAt: number;
}

export function markSubmitted(key: string, firstName: string): void {
  try {
    const state: SubmittedState = { firstName, submittedAt: Date.now() };
    localStorage.setItem(`${key}-submitted`, JSON.stringify(state));
  } catch {
    // ignore
  }
}
```

- [ ] **Step 2: Type check**

Run: `pnpm tsc --noEmit`
Expected: **may fail** in `src/app/apply/landlord/landlord-form.tsx` if it also calls `markSubmitted` with three args. If so, drop the third arg there too — open `landlord-form.tsx`, search for `markSubmitted`, and remove any third argument. **If landlord uses `referenceNumber`** for its own purposes, leave that file's logic alone but remove only the trailing arg passed to `markSubmitted`.

If landlord doesn't currently call markSubmitted with a 3rd arg, no change needed.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/form-storage.ts src/app/apply/landlord/landlord-form.tsx
git commit -m "refactor(storage): remove referenceNumber from SubmittedState"
```

(If `landlord-form.tsx` was not modified in step 2, drop it from the `git add` — only commit what changed.)

---

## Task 10: Update FormSuccess copy

**Files:**
- Modify: `src/components/forms/form-success.tsx`

- [ ] **Step 1: Remove the reference-number block, add "check your email" notice**

Replace lines 53–61 of `src/components/forms/form-success.tsx`:

```tsx
        {type === "tenant" && referenceNumber && (
          <div className="rounded-lg bg-surface px-4 py-3">
            <p className="text-sm text-text-secondary">
              Your reference number is{" "}
              <span className="font-mono font-semibold text-primary">{referenceNumber}</span>.
              Include this with your $20 processing fee payment.
            </p>
          </div>
        )}
```

with:

```tsx
        {type === "tenant" && (
          <div className="rounded-lg bg-primary/5 px-4 py-3 text-left">
            <p className="text-sm font-semibold text-text-primary mb-1">Check your email</p>
            <p className="text-sm text-text-secondary leading-relaxed">
              We have sent a $20 invoice from Stripe to complete your application. The link is
              valid for 30 days. Please check your spam folder if you do not see it.
            </p>
          </div>
        )}
```

- [ ] **Step 2: Drop the now-unused `referenceNumber` prop**

At lines 8–13, change:

```tsx
interface FormSuccessProps {
  type: "tenant" | "landlord";
  firstName: string;
  referenceNumber?: string;
  className?: string;
}
```

to:

```tsx
interface FormSuccessProps {
  type: "tenant" | "landlord";
  firstName: string;
  className?: string;
}
```

And at lines 15–20, change:

```tsx
export function FormSuccess({
  type,
  firstName,
  referenceNumber,
  className,
}: FormSuccessProps) {
```

to:

```tsx
export function FormSuccess({
  type,
  firstName,
  className,
}: FormSuccessProps) {
```

- [ ] **Step 3: Type check**

Run: `pnpm tsc --noEmit`
Expected: passes (`tenant-form.tsx` was already updated in Task 8 to drop the prop).

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/forms/form-success.tsx
git commit -m "feat(forms): update success copy for stripe invoice flow"
```

---

## Task 11: Add Sheet column headers (manual, documented in plan)

**Files:**
- No file changes. This is a Google Sheets manual edit.

- [ ] **Step 1: Add headers to the dev spreadsheet**

Open the dev spreadsheet (ID `1hRRMl0cdIueYuSrvNpzxpQ7F9Jxbzz7Qej9_qjUF6OM`) in a browser. Navigate to the `Tenant Applications` tab. In **row 1** (header row), add three new column headers in the next available columns after the existing `folderLink` column (column AX):

| Column | Header text |
|---|---|
| AY | `stripe_invoice_id` |
| AZ | `stripe_invoice_url` |
| BA | `paid_date` |

If the spreadsheet does not yet have any header row, this still works — the helpers write to specific columns by letter, not by header name.

- [ ] **Step 2: Repeat for production spreadsheet (when ready to deploy)**

When ready for production, repeat Step 1 in the prod spreadsheet (ID `1FABznPSDOpVHWnD3DyaPpCmhklrgrGT6WbQWdSqlsnQ`).

- [ ] **Step 3: No commit — Sheet schema isn't in code**

This task has no code changes. Move on to the next task.

---

## Task 12: Add `.env.example` documenting required env vars

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create `.env.example` at the project root**

Create `/volume1/playground/itsrellestate/.env.example`:

```
# Server port
PORT=8080

# Google Workspace integration
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY_PATH=
GOOGLE_PRIVATE_KEY=
GOOGLE_IMPERSONATE_EMAIL=
GOOGLE_SPREADSHEET_ID=
GOOGLE_TENANT_FOLDER_ID=
GOOGLE_LANDLORD_FOLDER_ID=

# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

- [ ] **Step 2: Verify `.env.example` is NOT in `.gitignore`**

Run: `grep -E "^\.env\.example" /volume1/playground/itsrellestate/.gitignore || echo "not gitignored, good"`
Expected: prints `not gitignored, good`. If it prints anything else, do not commit `.env.example`.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs(env): document required environment variables"
```

---

## Task 13: Local end-to-end manual test

**Files:**
- No file changes. Manual verification.

- [ ] **Step 1: Confirm `.env.local` has Stripe test keys**

Run: `grep "^STRIPE" /volume1/playground/itsrellestate/.env.local`
Expected: prints `STRIPE_SECRET_KEY=sk_test_...` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`. If `STRIPE_WEBHOOK_SECRET` is commented out, that is expected for now.

- [ ] **Step 2: Verify Stripe CLI is installed**

Run: `stripe --version`
Expected: prints version. If not installed: `brew install stripe/stripe-cli/stripe` (macOS) or `curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg && echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list && sudo apt update && sudo apt install stripe` (Linux).

If installation isn't possible in this environment, **skip the webhook part of this test** and rely on the Stripe Dashboard to manually trigger a test event after invoice creation.

- [ ] **Step 3: Authenticate Stripe CLI to test mode**

Run: `stripe login --interactive`
Expected: opens a browser, prompts for confirmation, prints `Done!`.

- [ ] **Step 4: Start the dev server in background**

Run: `pnpm dev` in one terminal (port 8080).
Expected: Next.js compiles, prints `ready on http://localhost:8080`.

- [ ] **Step 5: Start Stripe webhook forwarding in a second terminal**

Run: `stripe listen --forward-to localhost:8080/api/webhooks/stripe`
Expected: prints a webhook signing secret (`whsec_...`). Copy this value.

- [ ] **Step 6: Add the signing secret to `.env.local`**

Open `.env.local`. Uncomment the line `# STRIPE_WEBHOOK_SECRET=whsec_...` and replace the placeholder with the secret from Step 5.

- [ ] **Step 7: Restart the dev server**

Stop `pnpm dev` (Ctrl+C in the dev terminal) and run `pnpm dev` again to pick up the new env var.
Expected: ready on port 8080.

- [ ] **Step 8: Submit a test tenant application**

In a browser, navigate to `http://localhost:8080/apply/tenant`. Fill out the form using your own real email address (the Stripe invoice will be sent to that address). Use minimal valid data for fields you don't care about. Upload one small placeholder file for each required document category.

Click through to the final Authorization step, sign, and submit.

Expected: success page displays, "Check your email" block visible, no reference number.

- [ ] **Step 9: Verify Sheet row was written**

Open the dev spreadsheet. Find the most recent row in the `Tenant Applications` tab.
Expected:
- Column A (timestamp): ISO timestamp ~now
- Column C (payment_status): `Unpaid`
- Column AY (stripe_invoice_id): `in_1...` value
- Column AZ (stripe_invoice_url): full URL starting `https://invoice.stripe.com/i/...`
- Column BA (paid_date): blank

- [ ] **Step 10: Open the invoice URL and pay with a test card**

Click the URL in column AZ (or check your email for the Stripe invoice). Pay using test card `4242 4242 4242 4242`, any future expiry (e.g., `12/34`), any 3-digit CVC, any ZIP.
Expected: payment succeeds, "Thank you" page from Stripe.

- [ ] **Step 11: Verify webhook received and Sheet updated**

In the `stripe listen` terminal, look for an `invoice.paid` event delivered to the webhook with HTTP 200 response.
Open the spreadsheet again, refresh the row.
Expected:
- Column C now says `Paid`
- Column BA has an ISO timestamp ~now

- [ ] **Step 12: Verify Stripe Dashboard shows paid invoice**

In a browser, open the Stripe Dashboard (test mode). Navigate to Customers → search by your test email → click the customer → see the invoice in `Paid` status.
Expected: invoice present, paid, with $20.00 amount, line item description like `ItsRellEstate Tenant Application Processing Fee — <Your Name>`.

- [ ] **Step 13: Confirm no UI regressions**

Navigate around the rest of the site (home, services, about, etc.). Verify no console errors related to Stripe imports leaking to client.
Expected: clean console.

- [ ] **Step 14: Stop dev server and Stripe listener**

Ctrl+C both. Done with manual test.

- [ ] **Step 15: Commit (if any followup fixes were needed)**

If the manual test surfaced any bugs that you fixed inline, commit those fixes with descriptive messages. Otherwise, no commit.

---

## Task 14: Configure Stripe Dashboard reminders (manual, when user is ready)

**Files:**
- No file changes. User-facing Dashboard config.

- [ ] **Step 1: Navigate to Stripe Dashboard reminder settings**

In the Stripe Dashboard (test mode), go to: Settings → Billing → Invoices → "Email finalized invoices and reminders".

- [ ] **Step 2: Toggle reminders on**

Enable the "Email reminders" toggle.

- [ ] **Step 3: Add four reminder rules**

Click "Add reminder" four times and configure:

| Reminder | Configure as |
|---|---|
| 1 | 23 days before due date |
| 2 | 16 days before due date |
| 3 | 3 days before due date |
| 4 | On the due date (0 days after) |

Save settings.

- [ ] **Step 4: Set up branding (optional, polish)**

Navigate to: Settings → Branding. Upload logo (if available), set brand color to project primary color (use the color value from `tailwind.config.ts` — but only paste it into Stripe's Dashboard, never into code), and set support email to `nyrell@itsrellestate.com`.

- [ ] **Step 5: No commit — Dashboard config is not in code**

Move to the final task.

---

## Task 15: Final summary + handoff to user

**Files:**
- No file changes.

- [ ] **Step 1: Verify final code state**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: both pass.

- [ ] **Step 2: Review git log of new commits**

Run: `git log --oneline -20`
Expected: a sequence of commits matching the task list (chore deps, feat stripe client, feat google helpers, feat tenant route, feat webhook, feat payment-step, refactor tenant-form, refactor storage, feat form-success, docs env).

- [ ] **Step 3: Confirm no push has happened**

Run: `git status`
Expected: branch ahead of origin/main by N commits, nothing to commit. **Do not push.** User will test and decide when to push.

- [ ] **Step 4: Hand off to user**

Print summary in chat:
- All tasks complete
- Manual Sheet column headers needed (Task 11)
- Manual Stripe Dashboard reminder config needed when ready (Task 14)
- Local end-to-end test passed (Task 13)
- Awaiting user approval before push

---

## Self-Review

**Spec coverage:** Every section of the spec maps to a task:
- Spec §3 target state → Tasks 5, 6 (invoice creation + webhook)
- Spec §4 architecture → Tasks 2, 4, 5, 6 (file changes per architecture diagram)
- Spec §5.1 stripe.ts → Task 2
- Spec §5.2 webhook → Task 6
- Spec §5.3 google.ts helpers → Task 4
- Spec §5.4 appendSheetRow change → Task 3
- Spec §5.5 tenant route changes → Task 5
- Spec §5.6 payment-step rewrite → Task 7
- Spec §5.7 form-success update → Task 10
- Spec §5.8 tenant-form changes → Tasks 8, 9 (split: form file + storage)
- Spec §5.9 sheet schema → Task 11
- Spec §5.10 Dashboard config → Task 14
- Spec §6 failure modes → handled by try/catch in Tasks 5 and 6
- Spec §7 test plan → Task 13
- Spec §8 production cutover → noted but not included as a task per user instruction "don't push"

**Placeholder scan:** No "TBD"/"TODO" left. One conditional branch in Task 9 ("If landlord uses referenceNumber") is documented with explicit fallback instructions, not a placeholder.

**Type consistency:** `appendSheetRow` returns `{ rowNumber: number }` consistently. `createApplicationInvoice` returns `{ invoiceId, invoiceUrl }` and that exact destructuring is used in Task 5. `updateSheetRowByInvoiceId` accepts `{ paymentStatus?, paidDate? }` and Task 6 passes both keys correctly.

**Column letters verified:** A=1 to Z=26, AA=27, AX = 26+24 = 50. The existing `appendSheetRow` writes 50 cells (A through AX). New columns at AY (51), AZ (52), BA (53). Constants in Task 4 use AY/AZ/BA correctly. Payment status column C (existing) is correctly preserved.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-26-stripe-invoice-payment.md`.
