import { strict as assert } from "node:assert";
import { invoiceIdempotencyKeys } from "../src/lib/stripe.ts";

const k = invoiceIdempotencyKeys("app123");
assert.equal(k.invoice, "inv-app123");
assert.equal(k.item, "item-app123");

// Deterministic: same application id always yields the same keys.
assert.deepEqual(invoiceIdempotencyKeys("app123"), invoiceIdempotencyKeys("app123"));

// Distinct applications get distinct keys.
assert.notEqual(
  invoiceIdempotencyKeys("a").invoice,
  invoiceIdempotencyKeys("b").invoice,
);

console.log("stripe-idempotency ok");
