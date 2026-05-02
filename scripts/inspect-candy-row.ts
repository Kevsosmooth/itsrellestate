/**
 * Inspect the Tenant Applications sheet row for Candy Salcedo to see
 * what's stored in the stripe URL column (BB) and payment status (C).
 * Run: pnpm tsx --env-file=.env.vercel.production scripts/inspect-candy-row.ts
 */
import { google } from "googleapis";
import { readFileSync, existsSync } from "fs";

function loadCredentials(): { client_email: string; private_key: string } {
  const keyPath = process.env.GOOGLE_PRIVATE_KEY_PATH;
  if (keyPath && existsSync(keyPath)) {
    return JSON.parse(readFileSync(keyPath, "utf8"));
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (email && privateKey) {
    return {
      client_email: email,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }
  throw new Error("Google credentials not configured");
}

async function main() {
  const creds = loadCredentials();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    subject: process.env.GOOGLE_IMPERSONATE_EMAIL,
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SPREADSHEET_ID not set");

  // Pull the entire sheet so we can see what's there
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'Tenant Applications'!A1:BD200`,
  });

  const rows = res.data.values ?? [];
  console.log(`Total rows: ${rows.length}`);
  console.log("");

  if (rows.length === 0) {
    console.log("(empty sheet)");
    return;
  }

  // Header row
  const header = rows[0];
  console.log("== Header row ==");
  header.forEach((h, i) => {
    const colLetter = String.fromCharCode(65 + i);
    const colName = i < 26 ? colLetter : `A${String.fromCharCode(65 + (i - 26))}`;
    console.log(`  ${colName} (${i}): ${h}`);
  });
  console.log("");

  // Find Candy's row by email
  console.log("== Searching for Candy's row by email candysalcedo@gmail.com ==");
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.join(" | ");
    if (cells.toLowerCase().includes("candysalcedo") || cells.toLowerCase().includes("candy salcedo")) {
      console.log(`Found at row ${i + 1}:`);
      row.forEach((cell, j) => {
        if (cell) {
          const colLetter = j < 26
            ? String.fromCharCode(65 + j)
            : `${String.fromCharCode(65 + Math.floor(j / 26) - 1)}${String.fromCharCode(65 + (j % 26))}`;
          console.log(`  ${colLetter} (${j}): ${cell}`);
        }
      });
      console.log("");
    }
  }

  // Check column BB specifically (index 53, since A=0, B=1, ..., AA=26, BA=52, BB=53)
  console.log("== Column BB content for all data rows ==");
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const bb = row[53] ?? "(empty)";
    const c = row[2] ?? "(empty)";
    const firstName = row[3] ?? "";
    const lastName = row[4] ?? "";
    console.log(`  Row ${i + 1}: ${firstName} ${lastName} | C(status)=${c} | BB(url)=${bb.slice(0, 80)}${bb.length > 80 ? "..." : ""}`);
  }
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
