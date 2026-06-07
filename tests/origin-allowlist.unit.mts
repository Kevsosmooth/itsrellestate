import { strict as assert } from "node:assert";
import { isAllowedOrigin } from "../src/lib/origin-allowlist.ts";
const allow = ["https://itsrellestate.com", "https://www.itsrellestate.com"];
assert.equal(isAllowedOrigin("https://itsrellestate.com", allow), true);
assert.equal(isAllowedOrigin("https://itsrellestate.com.evil.example", allow), false); // the bug today
assert.equal(isAllowedOrigin("https://x.vercel.app", allow, /^https:\/\/[a-z0-9-]+\.vercel\.app$/), true);
assert.equal(isAllowedOrigin(null, allow), false);
console.log("origin-allowlist ok");
