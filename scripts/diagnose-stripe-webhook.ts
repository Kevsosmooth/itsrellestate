/**
 * Diagnostic script: inspect Stripe webhook configuration and recent
 * invoice activity to figure out why a paid invoice did not update the
 * Google Sheet. Prints summary only -- never logs secrets.
 *
 * Run: pnpm tsx scripts/diagnose-stripe-webhook.ts
 */
import Stripe from "stripe";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function maskSecret(value: string): string {
  if (!value) return "<empty>";
  if (value.length <= 12) return `${value.slice(0, 4)}...`;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function isoOrNull(unix?: number | null): string {
  if (!unix) return "(none)";
  return new Date(unix * 1000).toISOString();
}

async function main() {
  const secret = need("STRIPE_SECRET_KEY");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const mode = secret.startsWith("sk_live_")
    ? "LIVE"
    : secret.startsWith("sk_test_")
    ? "TEST"
    : "UNKNOWN";

  console.log("== Stripe key context ==");
  console.log(`  mode:               ${mode}`);
  console.log(`  secret key prefix:  ${secret.slice(0, 8)}...`);
  console.log(`  webhook secret:     ${webhookSecret ? maskSecret(webhookSecret) : "<NOT SET>"}`);
  console.log("");

  const stripe = new Stripe(secret, { apiVersion: "2026-04-22.dahlia" });

  console.log("== Account ==");
  const account = await stripe.accounts.retrieve();
  console.log(`  id:                 ${account.id}`);
  console.log(`  business name:      ${account.business_profile?.name ?? "(none)"}`);
  console.log(`  email:              ${account.email ?? "(none)"}`);
  console.log("");

  console.log("== Webhook endpoints ==");
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  if (endpoints.data.length === 0) {
    console.log("  (none configured) <-- THIS WOULD EXPLAIN NO UPDATES");
  } else {
    for (const ep of endpoints.data) {
      console.log(`  - id:               ${ep.id}`);
      console.log(`    url:              ${ep.url}`);
      console.log(`    status:           ${ep.status}`);
      console.log(`    api_version:      ${ep.api_version ?? "(account default)"}`);
      console.log(`    enabled_events:   ${ep.enabled_events.length} event(s)`);
      const hasPaid = ep.enabled_events.includes("invoice.paid") || ep.enabled_events.includes("*");
      console.log(`    invoice.paid?:    ${hasPaid ? "YES" : "NO  <-- problem"}`);
      console.log(`    created:          ${isoOrNull(ep.created)}`);
      console.log(`    description:      ${ep.description ?? "(none)"}`);
      console.log(`    secret prefix:    ${ep.secret ? maskSecret(ep.secret) : "(not returned)"}`);
      const eventList = ep.enabled_events.length <= 12
        ? ep.enabled_events.join(", ")
        : `${ep.enabled_events.slice(0, 12).join(", ")}, ...`;
      console.log(`    events:           ${eventList}`);
      console.log("");
    }
  }

  console.log("== Recent invoices (last 10) ==");
  const invoices = await stripe.invoices.list({ limit: 10 });
  for (const inv of invoices.data) {
    const customerEmail =
      typeof inv.customer === "object" && inv.customer && "email" in inv.customer
        ? (inv.customer as { email?: string }).email
        : inv.customer_email;
    console.log(`  - id:               ${inv.id}`);
    console.log(`    number:           ${inv.number ?? "(unfinalized)"}`);
    console.log(`    status:           ${inv.status}`);
    console.log(`    paid?:            ${inv.paid ? "YES" : "no"}`);
    console.log(`    amount_due:       ${(inv.amount_due / 100).toFixed(2)} ${inv.currency.toUpperCase()}`);
    console.log(`    amount_paid:      ${(inv.amount_paid / 100).toFixed(2)} ${inv.currency.toUpperCase()}`);
    console.log(`    customer email:   ${customerEmail ?? "(none)"}`);
    console.log(`    created:          ${isoOrNull(inv.created)}`);
    console.log(`    paid_at:          ${isoOrNull(inv.status_transitions?.paid_at)}`);
    console.log(`    hosted_invoice_url present?: ${inv.hosted_invoice_url ? "yes" : "NO"}`);
    console.log(`    metadata.application_type: ${inv.metadata?.application_type ?? "(none)"}`);
    console.log(`    metadata.applicant_name:   ${inv.metadata?.applicant_name ?? "(none)"}`);
    console.log("");
  }

  console.log("== Recent invoice.paid events (last 20) ==");
  const events = await stripe.events.list({
    type: "invoice.paid",
    limit: 20,
  });
  if (events.data.length === 0) {
    console.log("  (no invoice.paid events on file)");
  } else {
    for (const ev of events.data) {
      const inv = ev.data.object as Stripe.Invoice;
      console.log(`  - event id:         ${ev.id}`);
      console.log(`    created:          ${isoOrNull(ev.created)}`);
      console.log(`    invoice id:       ${inv.id}`);
      console.log(`    invoice status:   ${inv.status}`);
      console.log(`    invoice paid:     ${inv.paid}`);
      console.log(`    customer email:   ${inv.customer_email ?? "(none)"}`);
      console.log(`    pending webhooks: ${ev.pending_webhooks}`);
      console.log(`    livemode:         ${ev.livemode}`);
      console.log("");
    }
  }
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
