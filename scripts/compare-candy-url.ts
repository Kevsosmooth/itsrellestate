/**
 * Compare the hosted_invoice_url Stripe sends in the webhook payload
 * vs the URL currently stored in the sheet. They must match exactly
 * for the webhook lookup to find the row.
 * Run: pnpm tsx --env-file=.env.vercel.production scripts/compare-candy-url.ts
 */
import Stripe from "stripe";

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Missing STRIPE_SECRET_KEY");
  const stripe = new Stripe(secret, { apiVersion: "2026-04-22.dahlia" });

  // Fetch Candy's invoice + the event in parallel so we can see exactly
  // what the webhook handler would receive.
  const invoiceId = "in_1TSN2pJoxbwLOwwNNyLxtxjY";
  const eventId = "evt_1TSN63JoxbwLOwwNYyUWaEGP";

  const [inv, ev] = await Promise.all([
    stripe.invoices.retrieve(invoiceId),
    stripe.events.retrieve(eventId),
  ]);

  const evInvoice = ev.data.object as Stripe.Invoice;

  console.log("== Live invoice (current state) ==");
  console.log(`  id:                ${inv.id}`);
  console.log(`  status:            ${inv.status}`);
  console.log(`  hosted_invoice_url:`);
  console.log(`    ${inv.hosted_invoice_url}`);
  console.log("");

  console.log("== Event payload (what webhook would receive) ==");
  console.log(`  event id:          ${ev.id}`);
  console.log(`  invoice id:        ${evInvoice.id}`);
  console.log(`  hosted_invoice_url:`);
  console.log(`    ${evInvoice.hosted_invoice_url}`);
  console.log("");

  console.log("== Sheet stored URL (from inspect-candy-row.ts) ==");
  const sheetUrl =
    "https://invoice.stripe.com/i/acct_1TQchDJoxbwLOwwN/live_YWNjdF8xVFFjaERKb3hid0xPd3dOLF9VUkZYdk5OU2lwN2ZIUHg5QWh2elEwYXpOUzM5b3Z3LDE2ODIwNTY5Nw0200pIRnKOuq?s=ap";
  console.log(`  ${sheetUrl}`);
  console.log("");

  console.log("== Comparison ==");
  console.log(`  invoice.hosted_invoice_url === sheet?  ${inv.hosted_invoice_url === sheetUrl}`);
  console.log(`  event.hosted_invoice_url   === sheet?  ${evInvoice.hosted_invoice_url === sheetUrl}`);
  console.log(`  invoice URL === event URL?             ${inv.hosted_invoice_url === evInvoice.hosted_invoice_url}`);
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
