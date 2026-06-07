import assert from "node:assert/strict";
import { pickReusableInvoice } from "../src/lib/stripe.ts";
const NOW = 1800000000, D = 86400;
const recent = NOW - 10 * D, older = NOW - 100 * D;
let pass = 0, fail = 0;
function check(n: string, fn: () => void) { try { fn(); pass++; console.log("PASS  " + n); } catch (e) { fail++; console.log("FAIL  " + n + "  ->  " + (e as Error).message); } }
check("reuses a recent open invoice", () => assert.equal(pickReusableInvoice([{ id: "in_1", created: recent, status: "open", hosted_invoice_url: "u" }], NOW)?.id, "in_1"));
check("reuses a recent paid invoice", () => assert.equal(pickReusableInvoice([{ id: "in_2", created: recent, status: "paid" }], NOW)?.id, "in_2"));
check("ignores an invoice older than 90 days", () => assert.equal(pickReusableInvoice([{ id: "in_3", created: older, status: "open" }], NOW), null));
check("ignores a voided invoice (lets a new one be created)", () => assert.equal(pickReusableInvoice([{ id: "in_4", created: recent, status: "void" }], NOW), null));
check("ignores a draft invoice", () => assert.equal(pickReusableInvoice([{ id: "in_5", created: recent, status: "draft" }], NOW), null));
check("ignores an uncollectible invoice", () => assert.equal(pickReusableInvoice([{ id: "in_6", created: recent, status: "uncollectible" }], NOW), null));
check("returns null when no invoices", () => assert.equal(pickReusableInvoice([], NOW), null));
check("skips an id-less invoice, picks the next valid one", () => assert.equal(pickReusableInvoice([{ id: null, created: recent, status: "open" }, { id: "in_7", created: recent, status: "paid" }], NOW)?.id, "in_7"));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
