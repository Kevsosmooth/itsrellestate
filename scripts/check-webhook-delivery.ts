/**
 * Check delivery attempts for a specific Stripe event.
 * Run: pnpm tsx --env-file=.env.vercel.production scripts/check-webhook-delivery.ts
 */
import Stripe from "stripe";

const EVENT_ID = "evt_1TSN63JoxbwLOwwNYyUWaEGP";
const ENDPOINT_ID = "we_1TRAnAJoxbwLOwwN7x4Nspun";

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Missing STRIPE_SECRET_KEY");
  const stripe = new Stripe(secret, { apiVersion: "2026-04-22.dahlia" });

  console.log("== Event details ==");
  const ev = await stripe.events.retrieve(EVENT_ID);
  console.log(`  id:                ${ev.id}`);
  console.log(`  type:              ${ev.type}`);
  console.log(`  created:           ${new Date(ev.created * 1000).toISOString()}`);
  console.log(`  pending_webhooks:  ${ev.pending_webhooks}`);
  console.log(`  livemode:          ${ev.livemode}`);
  console.log("");

  console.log("== Endpoint config ==");
  const ep = await stripe.webhookEndpoints.retrieve(ENDPOINT_ID);
  console.log(`  id:                ${ep.id}`);
  console.log(`  url:               ${ep.url}`);
  console.log(`  status:            ${ep.status}`);
  console.log(`  api_version:       ${ep.api_version ?? "(account default)"}`);
  console.log(`  enabled_events:    ${ep.enabled_events.join(", ")}`);
  console.log(`  livemode:          ${ep.livemode}`);
  console.log("");

  console.log("== Manual delivery test ==");
  console.log("  (Stripe API does not expose delivery attempt history.");
  console.log("   pending_webhooks > 0 means at least one endpoint has not");
  console.log("   acknowledged the event yet -- it failed or never hit.)");
  console.log("");
  console.log(`  This event has pending_webhooks=${ev.pending_webhooks}`);
  console.log(`  -> Stripe still considers delivery incomplete.`);
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
