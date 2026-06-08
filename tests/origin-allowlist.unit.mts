import { strict as assert } from "node:assert";
import { isAllowedOrigin } from "../src/lib/origin-allowlist.ts";
const allow = ["https://itsrellestate.com", "https://www.itsrellestate.com"];
assert.equal(isAllowedOrigin("https://itsrellestate.com", allow), true);
assert.equal(isAllowedOrigin("https://itsrellestate.com.evil.example", allow), false); // the bug today
assert.equal(isAllowedOrigin("https://x.vercel.app", allow, /^https:\/\/[a-z0-9-]+\.vercel\.app$/), true);
assert.equal(isAllowedOrigin(null, allow), false);
// Local dev + private LAN origins are allowed (so local/LAN submits don't 403).
assert.equal(isAllowedOrigin("http://localhost:3091", allow), true);
assert.equal(isAllowedOrigin("http://127.0.0.1:3000", allow), true);
assert.equal(isAllowedOrigin("http://192.168.50.149:3091", allow), true);
// ...but a host that merely starts with localhost must NOT pass.
assert.equal(isAllowedOrigin("https://localhost.evil.com", allow), false);
assert.equal(isAllowedOrigin("http://192.168.50.149.evil.com", allow), false);
console.log("origin-allowlist ok");
