import { strict as assert } from "node:assert";
import { mintResumableSession } from "../src/lib/drive-uploads.ts";
let captured: { url: string; init: { method: string; headers: Record<string,string>; body: string } } | null = null;
(globalThis as unknown as { fetch: unknown }).fetch = async (url: string, init: { method: string; headers: Record<string,string>; body: string }) => {
  captured = { url, init };
  return { ok: true, status: 200, headers: new Map([["location", "https://up.example/sess?upload_id=abc"]]) } as unknown as Response;
};
const uri = await mintResumableSession(
  { name: "a.pdf", parents: ["FOLDER"], fileId: "FID", mimeType: "application/pdf", size: 123, origin: "https://itsrellestate.com" },
  { token: "TESTTOKEN" },
);
assert.equal(uri, "https://up.example/sess?upload_id=abc");
assert.ok(captured, "fetch called");
assert.match(captured!.url, /uploadType=resumable/);
assert.equal(captured!.init.headers["X-Upload-Content-Length"], "123");
assert.equal(captured!.init.headers["X-Upload-Content-Type"], "application/pdf");
assert.equal(captured!.init.headers["Origin"], "https://itsrellestate.com");
assert.equal(captured!.init.headers["Authorization"], "Bearer TESTTOKEN");
console.log("drive-uploads ok");
