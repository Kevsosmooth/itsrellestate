import { strict as assert } from "node:assert";
import { validateChunkHeaders } from "../src/app/api/upload/chunk/route.ts";

assert.equal(
  validateChunkHeaders({ applicationId: "a", nonce: "n", range: "bytes 0-4194303/26214400" }),
  null,
  "valid range passes",
);
assert.equal(
  validateChunkHeaders({ applicationId: null, nonce: "n", range: "bytes 0-1/2" })?.status,
  400,
  "null applicationId -> 400",
);
assert.equal(
  validateChunkHeaders({ applicationId: "a", nonce: null, range: "bytes 0-1/2" })?.status,
  400,
  "null nonce -> 400",
);
assert.equal(
  validateChunkHeaders({ applicationId: "a", nonce: "n", range: "garbage" })?.status,
  400,
  "invalid range format -> 400",
);

console.log("upload-chunk ok");
