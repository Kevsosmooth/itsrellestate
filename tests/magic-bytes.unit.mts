import { strict as assert } from "node:assert";
import { matchesMagic, ALLOWED_TYPES } from "../src/lib/magic-bytes.ts";
assert.equal(matchesMagic(Buffer.from([0x25,0x50,0x44,0x46]), "application/pdf"), true);
assert.equal(matchesMagic(Buffer.from([0x00,0x01]), "application/pdf"), false);
assert.equal(ALLOWED_TYPES.has("image/png"), true);
console.log("magic-bytes ok");
