import { strict as assert } from "node:assert";
import { sanitizeFilename } from "../src/lib/upload-limits.ts";
import { safeOccupantFolderName } from "../src/lib/required-docs.ts";

// "  ../weird:name?.pdf"
// Step 1: replace /^[.\s]+/ -- strips leading spaces and dots: "  .." -> "/weird:name?.pdf"
// Step 2: replace /[/\\:\0*?"<>|]/g with "_" -> "_weird_name_.pdf"
// Step 3: replace /\.{2,}/g -- no double-dots remain, no change
// Step 4: replace /\s{2,}/g -- no double spaces, no change
// Step 5: trim -- no change
// Result: "_weird_name_.pdf"
assert.equal(sanitizeFilename("  ../weird:name?.pdf"), "_weird_name_.pdf");

assert.equal(sanitizeFilename(""), "unnamed");

// safeOccupantFolderName: replace(/[^a-zA-Z0-9 -]/g, "") then replace(/\s+/g, "-")
assert.equal(safeOccupantFolderName("Jane Doe"), "Jane-Doe");

// "O'Brien, Pat": apostrophe and comma stripped -> "OBrien Pat" -> "OBrien-Pat"
assert.equal(safeOccupantFolderName("O'Brien, Pat"), "OBrien-Pat");

console.log("upload-limits ok");
