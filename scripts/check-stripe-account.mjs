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
const a = await stripe.accounts.retrieve();
console.log("Account ID:", a.id);
console.log("Email:", a.email);
console.log("Country:", a.country);
console.log("Charges enabled:", a.charges_enabled);
console.log("Payouts enabled:", a.payouts_enabled);
console.log("Details submitted:", a.details_submitted);
console.log("Capabilities:", JSON.stringify(a.capabilities, null, 2));
if (a.requirements?.currently_due?.length) {
  console.log("\nRequirements currently due (must be filled before going live):");
  for (const r of a.requirements.currently_due) console.log("  -", r);
}
if (a.requirements?.past_due?.length) {
  console.log("\nPast-due requirements (account is restricted):");
  for (const r of a.requirements.past_due) console.log("  -", r);
}
