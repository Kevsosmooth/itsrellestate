import Stripe from "stripe";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8")
  .split("\n")
  .reduce((acc, line) => {
    // Match commented-out live key lines too
    const m = line.match(/^#?\s*([A-Z_]+)=(.*)$/);
    if (m) acc[m[1]] = m[2].replace(/^"|"$/g, "");
    return acc;
  }, {});

// Pull all sk_live_ candidates; commented ones overwrite test ones because they appear later
const liveSecret = readFileSync(".env.local", "utf8")
  .split("\n")
  .map((l) => l.match(/^#?\s*STRIPE_SECRET_KEY=(sk_live_.*)$/))
  .filter(Boolean)
  .map((m) => m[1])[0];

if (!liveSecret) {
  console.error("No sk_live_ secret found in .env.local");
  process.exit(1);
}

console.log("Using live key prefix:", liveSecret.slice(0, 12));

const stripe = new Stripe(liveSecret, { apiVersion: "2026-04-22.dahlia" });

// Verify we are on live mode
const account = await stripe.accounts.retrieve();
console.log("Account:", account.id, "| email:", account.email);

// Check for existing webhook on the same URL
const url = "https://itsrellestate.com/api/webhooks/stripe";
const existing = await stripe.webhookEndpoints.list({ limit: 100 });
const dup = existing.data.find((w) => w.url === url);
if (dup) {
  console.log(`\nWebhook already exists for ${url}:`);
  console.log("  id:", dup.id);
  console.log("  status:", dup.status);
  console.log("  events:", dup.enabled_events.join(", "));
  console.log("\nNot creating duplicate. If you need a new signing secret, roll it manually in the Stripe Dashboard.");
  process.exit(0);
}

const webhook = await stripe.webhookEndpoints.create({
  url,
  enabled_events: ["invoice.paid"],
  description: "ItsRellEstate production -- updates Google Sheet payment status",
});

console.log("\nCreated live webhook:");
console.log("  id:", webhook.id);
console.log("  url:", webhook.url);
console.log("  events:", webhook.enabled_events.join(", "));
console.log("\nSIGNING SECRET (copy into Vercel as STRIPE_WEBHOOK_SECRET, Production scope only):");
console.log(webhook.secret);
