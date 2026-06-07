import { strict as assert } from "node:assert";
import { shouldBill } from "../src/lib/billing-gate.ts";
const req = [{ category: "photoId", person: "primary" }, { category: "income", person: "primary" }];
assert.equal(shouldBill("landlord", req, req), false);            // landlord never bills
assert.equal(shouldBill("tenant", req, [req[0]]), false);          // not all verified
assert.equal(shouldBill("tenant", req, req), true);                // all verified
assert.equal(shouldBill("tenant", [], []), false);                 // no required -> false
console.log("billing-gate ok");
