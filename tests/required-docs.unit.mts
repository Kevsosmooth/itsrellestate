import { strict as assert } from "node:assert";
import { requiredDocSlots } from "../src/lib/required-docs.ts";

// Voucher tenant, no extra adult occupants → primary-only required set.
const slots = requiredDocSlots("tenant", {
  hasAssistance: "yes", paymentPath: "voucher",
  occupants: [{ name: "Kid", relationship: "child", over18: "no" }],
} as any);
assert.ok(slots.length > 0, "expected required slots");
assert.ok(slots.every((s) => s.person === "primary"), "no adult occupants → all primary");

// Adult occupant → per-person categories duplicated for that occupant.
const slots2 = requiredDocSlots("tenant", {
  hasAssistance: "yes", paymentPath: "voucher",
  occupants: [{ name: "Jane Doe", relationship: "spouse", over18: "yes" }],
} as any);
assert.ok(slots2.some((s) => s.person !== "primary"), "adult occupant → a per-person slot");

console.log("required-docs ok");
