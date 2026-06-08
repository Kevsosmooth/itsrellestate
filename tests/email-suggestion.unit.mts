import { strict as assert } from "node:assert";
import { suggestEmail } from "../src/lib/email-suggestion.ts";

// Misspelled popular domains return a "did you mean" correction (the full address).
assert.equal(suggestEmail("kevin@gmial.com"), "kevin@gmail.com");
assert.equal(suggestEmail("kevin@gmail.con"), "kevin@gmail.com"); // TLD typo
assert.equal(suggestEmail("nyrell@yaho.com"), "nyrell@yahoo.com");
assert.equal(suggestEmail("user@hotmial.com"), "user@hotmail.com");

// A correctly spelled address yields no suggestion.
assert.equal(suggestEmail("kevin@gmail.com"), null);
assert.equal(suggestEmail("user@yahoo.com"), null);

// Empty / whitespace / incomplete input never suggests.
assert.equal(suggestEmail(""), null);
assert.equal(suggestEmail("   "), null);
assert.equal(suggestEmail("kevin"), null);

// Leading / trailing whitespace is tolerated.
assert.equal(suggestEmail("  kevin@gmial.com  "), "kevin@gmail.com");

console.log("email-suggestion ok");
