import { strict as assert } from "node:assert";
import { chunkRanges, friendlyUploadError, uploadOne } from "../src/lib/upload-file.ts";

// chunkRanges
const r = chunkRanges(10, 4);
assert.deepEqual(r.map((x) => x.header), ["bytes 0-3/10", "bytes 4-7/10", "bytes 8-9/10"]);
assert.equal(chunkRanges(0, 4).length, 0);

// friendlyUploadError
assert.match(friendlyUploadError(undefined, 413, "tax.pdf"), /too large/);
assert.match(friendlyUploadError("bad type", 415, "x.exe"), /not an accepted/);
assert.match(friendlyUploadError(undefined, 0, "a.pdf"), /connection/);

// uploadOne happy path with mocked fetch
const calls: string[] = [];
(globalThis as unknown as { fetch: unknown }).fetch = async (url: string) => {
  calls.push(url);
  const json = url.includes("/session") ? { nonce: "N1" } : url.includes("/chunk") ? { done: true } : { link: "https://drive/x" };
  return { ok: true, status: 200, json: async () => json } as unknown as Response;
};
// minimal File stub with arrayBuffer + slice
const fileStub = {
  name: "id.pdf", type: "application/pdf", size: 3,
  slice() { return { arrayBuffer: async () => new ArrayBuffer(3) }; },
} as unknown as File;
const res = await uploadOne(fileStub, { category: "photoId", person: "primary" }, { applicationId: "app1", formType: "tenant" });
assert.equal(res.status, "verified");
assert.equal(res.link, "https://drive/x");
assert.ok(calls.some((u) => u.includes("/session")) && calls.some((u) => u.includes("/chunk")) && calls.some((u) => u.includes("/verify")));
console.log("upload-orchestration ok");
