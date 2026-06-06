// Unit test for the real upload retry helper. Runs the ACTUAL code against a
// mocked fetch to prove: transient failures (network, 5xx) retry and recover;
// permanent rejections (wrong type/size/folder) fail fast with the real reason;
// persistent failures throw after exhausting attempts. Run: npx tsx tests/upload-retry.test.mts
import assert from "node:assert/strict";
import { uploadFileWithRetry } from "../src/lib/upload-file.ts";

let calls = 0;
const realFetch = globalThis.fetch;

function mockFetch(sequence: (Response | "network-error")[]): void {
  calls = 0;
  globalThis.fetch = (async () => {
    const step = sequence[Math.min(calls, sequence.length - 1)];
    calls++;
    if (step === "network-error") throw new Error("network down");
    return step;
  }) as typeof fetch;
}

const ok = () => new Response(null, { status: 200 });
const fail = (status: number, msg = "boom") =>
  new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json" },
  });
const fd = () => new FormData();
const fast = { baseDelayMs: 1 };

let passed = 0;
let failed = 0;
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log("PASS  " + name);
  } catch (e) {
    failed++;
    console.log("FAIL  " + name + "  ->  " + (e as Error).message);
  }
}

await check("transient 5xx: retries twice then succeeds (3 attempts)", async () => {
  mockFetch([fail(500), fail(503), ok()]);
  await uploadFileWithRetry(fd(), "id.pdf", fast);
  assert.equal(calls, 3, `expected 3 attempts, got ${calls}`);
});

await check("network blip: retries then succeeds", async () => {
  mockFetch(["network-error", ok()]);
  await uploadFileWithRetry(fd(), "id.pdf", fast);
  assert.equal(calls, 2, `expected 2 attempts, got ${calls}`);
});

await check("permanent 415: fails fast, no retry, real reason surfaced", async () => {
  mockFetch([fail(415, "File type not allowed"), ok()]);
  await assert.rejects(
    uploadFileWithRetry(fd(), "id.pdf", fast),
    /File type not allowed/,
  );
  assert.equal(calls, 1, `expected 1 attempt (no retry), got ${calls}`);
});

await check("persistent 500: throws after exhausting attempts", async () => {
  mockFetch([fail(500)]);
  await assert.rejects(
    uploadFileWithRetry(fd(), "id.pdf", { maxAttempts: 3, baseDelayMs: 1 }),
    /after 3 attempts/,
  );
  assert.equal(calls, 3, `expected 3 attempts, got ${calls}`);
});

await check("happy path: succeeds on first try", async () => {
  mockFetch([ok()]);
  await uploadFileWithRetry(fd(), "id.pdf", fast);
  assert.equal(calls, 1, `expected 1 attempt, got ${calls}`);
});

globalThis.fetch = realFetch;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
