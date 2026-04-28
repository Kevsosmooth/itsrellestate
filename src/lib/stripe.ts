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
  });

  if (!invoice.id) {
    throw new Error("Stripe invoice creation returned no id");
  }

  await stripe.invoiceItems.create({
    customer: customer.id,
    invoice: invoice.id,
    amount: APPLICATION_FEE_CENTS,
    currency: "usd",
    description: `ItsRellEstate ${formTypeLabel} Application Processing Fee — ${fullName}`,
  });

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
