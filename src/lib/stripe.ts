import Stripe from "stripe";

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  throw new Error("STRIPE_SECRET_KEY env var is required");
}

export const stripe = new Stripe(apiKey, {
  apiVersion: "2026-04-22.dahlia",
});

const APPLICATION_FEE_CENTS = 2000;
const DUE_DAYS = 30;

export interface ApplicationInvoiceParams {
  email: string;
  firstName: string;
  lastName: string;
  formType: "tenant" | "landlord";
  /**
   * When set, deterministic Stripe idempotency keys are derived from it so a
   * retried or concurrent finalize cannot create a duplicate invoice / line
   * item. Pass the stable applicationId.
   */
  idempotencyKey?: string;
}

export interface ApplicationInvoiceResult {
  invoiceId: string;
  invoiceUrl: string;
  reused?: boolean;
}

// One application fee per applicant per ~90 days. A re-application inside the
// window reuses the existing invoice instead of billing again.
const INVOICE_DEDUP_DAYS = 90;

type ReusableInvoice = {
  id?: string | null;
  created: number;
  status: string | null;
  hosted_invoice_url?: string | null;
};

// Pure + exported for unit testing. Returns the most recent still-valid invoice
// within the window, or null. void/draft/uncollectible invoices never count, so
// voiding a wrongful invoice lets a proper one be created later.
export function pickReusableInvoice(
  invoices: ReusableInvoice[],
  nowSeconds: number,
  windowDays: number = INVOICE_DEDUP_DAYS,
): { id: string; hostedUrl: string | null } | null {
  const cutoff = nowSeconds - windowDays * 24 * 60 * 60;
  const blocked = new Set(["void", "draft", "uncollectible"]);
  for (const inv of invoices) {
    if (inv.id && inv.created >= cutoff && !blocked.has(inv.status ?? "")) {
      return { id: inv.id, hostedUrl: inv.hosted_invoice_url ?? null };
    }
  }
  return null;
}

// Pure + exported for unit testing. Deterministic Stripe idempotency keys
// derived from the application id; same id always yields the same keys so a
// retry/concurrent call reuses (not duplicates) the invoice + line item.
export function invoiceIdempotencyKeys(
  applicationId: string,
): { invoice: string; item: string } {
  return { invoice: `inv-${applicationId}`, item: `item-${applicationId}` };
}

export async function createApplicationInvoice(
  params: ApplicationInvoiceParams,
): Promise<ApplicationInvoiceResult> {
  const { email, firstName, lastName, formType, idempotencyKey } = params;
  const idem = idempotencyKey ? invoiceIdempotencyKeys(idempotencyKey) : null;
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

  // 3-month dedup: if this applicant already has a valid recent invoice, reuse
  // it rather than billing again on a re-application.
  if (existing.data[0]) {
    const recent = await stripe.invoices.list({ customer: customer.id, limit: 20 });
    const prior = pickReusableInvoice(recent.data, Math.floor(Date.now() / 1000));
    if (prior) {
      return { invoiceId: prior.id, invoiceUrl: prior.hostedUrl ?? "", reused: true };
    }
  }

  const dueDate = Math.floor(Date.now() / 1000) + DUE_DAYS * 24 * 60 * 60;
  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: "send_invoice",
    due_date: dueDate,
    auto_advance: true,
    pending_invoice_items_behavior: "exclude",
    metadata: {
      application_type: formType,
      applicant_email: email,
      applicant_name: fullName,
    },
    description: `${formTypeLabel} application processing fee for ${fullName}.`,
    footer: `Thank you for applying with ItsRellEstate. Submitted ${new Date().toLocaleDateString("en-US")}.`,
  }, idem ? { idempotencyKey: idem.invoice } : undefined);

  if (!invoice.id) {
    throw new Error("Stripe invoice creation returned no id");
  }

  await stripe.invoiceItems.create({
    customer: customer.id,
    invoice: invoice.id,
    amount: APPLICATION_FEE_CENTS,
    currency: "usd",
    description: `ItsRellEstate ${formTypeLabel} Application Processing Fee — ${fullName}`,
  }, idem ? { idempotencyKey: idem.item } : undefined);

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  if (!finalized.id) {
    throw new Error("Stripe invoice finalization returned no id");
  }

  if (!finalized.hosted_invoice_url) {
    throw new Error("Stripe finalized invoice missing hosted_invoice_url");
  }

  try {
    await stripe.invoices.sendInvoice(finalized.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(
      `[stripe-invoice] auto-send failed for invoice ${finalized.id}, invoice still created and can be sent manually:`,
      message,
    );
  }

  return {
    invoiceId: finalized.id,
    invoiceUrl: finalized.hosted_invoice_url,
  };
}
