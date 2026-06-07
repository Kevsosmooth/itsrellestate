import { strict as assert } from "node:assert";
import { verifyDecision } from "../src/app/api/upload/verify/route.ts";
const PDF = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const row = { quarantine_parent: "Q", destination_folder: "D", expected_name: "a.pdf", expected_size: 4, expected_mime: "application/pdf" };
const meta = { parents: ["Q"], trashed: false, size: "4", name: "a.pdf" };
assert.equal(verifyDecision({ row, meta, head: PDF }).action, "move");
assert.equal(verifyDecision({ row: null, meta, head: PDF }).action, "reject");
assert.equal(verifyDecision({ row, meta: { ...meta, parents: ["OTHER"] }, head: PDF }).action, "reject");
assert.equal(verifyDecision({ row, meta: { ...meta, trashed: true }, head: PDF }).action, "reject");
assert.equal(verifyDecision({ row, meta: { ...meta, size: "99" }, head: PDF }).action, "reject");
assert.equal(verifyDecision({ row, meta, head: Buffer.from([0, 0, 0, 0]) }).action, "reject");
console.log("upload-verify ok");
