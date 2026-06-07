import { strict as assert } from "node:assert";
import { requiredSlotsSatisfied } from "../src/lib/uploads-ledger.ts";
const required = [{ category: "photoId", person: "primary" }, { category: "income", person: "primary" }];
assert.equal(requiredSlotsSatisfied(required, [{ category: "photoId", person: "primary" }]), false);
assert.equal(requiredSlotsSatisfied(required, [{ category: "photoId", person: "primary" }, { category: "income", person: "primary" }]), true);
assert.equal(requiredSlotsSatisfied(required, [{ category: "photoId", person: "primary" }, { category: "income", person: "primary" }, { category: "x", person: "primary" }]), true);
assert.equal(requiredSlotsSatisfied([], [{ category: "a", person: "primary" }]), false); // empty required -> NOT billable
console.log("uploads-ledger ok");
