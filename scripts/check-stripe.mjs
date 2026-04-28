import Stripe from "stripe";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8")
  .split("\n")
  .reduce((acc, line) => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) acc[m[1]] = m[2].replace(/^"|"$/g, "");
    return acc;
  }, {});

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });

const account = await stripe.accounts.retrieve();
console.log("Account:", account.id, "| email:", account.email, "| livemode:", !env.STRIPE_SECRET_KEY.startsWith("sk_test_"));

const invoices = await stripe.invoices.list({ limit: 10 });
console.log(`\nMost recent ${invoices.data.length} invoices:`);
for (const inv of invoices.data) {
  const created = new Date(inv.created * 1000).toISOString();
  console.log(` - ${inv.id} | ${inv.status} | $${(inv.amount_due/100).toFixed(2)} | ${inv.customer_email ?? '(no email)'} | ${created}`);
  if (inv.metadata?.application_type) console.log(`    metadata: ${JSON.stringify(inv.metadata)}`);
}
