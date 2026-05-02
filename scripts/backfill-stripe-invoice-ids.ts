/**
 * One-time backfill: replace stripe URLs in column BB with stable invoice
 * ids, rename the header, and flip Candy's row to Paid (since her payment
 * arrived but the webhook couldn't find her row).
 *
 * Lookup strategy: match each sheet row to a Stripe invoice by customer
 * email (column H). Skip rows where no match is found.
 *
 * Run: pnpm tsx --env-file=.env.vercel.production scripts/backfill-stripe-invoice-ids.ts
 *      pnpm tsx --env-file=.env.vercel.production scripts/backfill-stripe-invoice-ids.ts --apply
 */
import Stripe from "stripe";
import { google } from "googleapis";
import { readFileSync, existsSync } from "fs";

const APPLY = process.argv.includes("--apply");

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

interface RowFix {
  rowNumber: number;
  email: string;
  name: string;
  oldBB: string;
  newBB: string;
  oldStatus: string;
  newStatus: string;
  invoiceId: string;
}

async function main() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY");
  const stripe = new Stripe(stripeSecret, { apiVersion: "2026-04-22.dahlia" });

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

  console.log(`Mode: ${APPLY ? "APPLY (writing changes)" : "DRY RUN (no writes)"}`);
  console.log("");

  // 1. Read current sheet contents
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'Tenant Applications'!A1:BD200`,
  });
  const rows = res.data.values ?? [];
  if (rows.length < 2) {
    console.log("No data rows. Exiting.");
    return;
  }

  // 2. Pull all live tenant invoices once
  const allInvoices: Stripe.Invoice[] = [];
  let starting_after: string | undefined;
  do {
    const page: Stripe.ApiList<Stripe.Invoice> = await stripe.invoices.list({
      limit: 100,
      starting_after,
    });
    allInvoices.push(...page.data);
    starting_after = page.has_more
      ? page.data[page.data.length - 1].id
      : undefined;
  } while (starting_after);

  const tenantInvoices = allInvoices.filter(
    (inv) => inv.metadata?.application_type === "tenant",
  );
  console.log(`Loaded ${tenantInvoices.length} tenant invoices from Stripe`);
  console.log("");

  // 3. Match rows to invoices by customer email (lower-cased)
  // Column H (index 7) = email, BB (index 53) = old URL/empty, C (index 2) = status
  const fixes: RowFix[] = [];
  const skipped: { rowNumber: number; reason: string; firstName: string; lastName: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const firstName = row[3] ?? "";
    const lastName = row[4] ?? "";
    const email = (row[7] ?? "").trim().toLowerCase();
    const oldBB = row[53] ?? "";
    const oldStatus = row[2] ?? "";

    if (!email) {
      skipped.push({ rowNumber, reason: "no email in column H", firstName, lastName });
      continue;
    }

    // Try matching: email + name in metadata, otherwise just email
    const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
    const candidates = tenantInvoices.filter((inv) => {
      const invEmail = (inv.customer_email ?? "").trim().toLowerCase();
      return invEmail === email;
    });

    if (candidates.length === 0) {
      skipped.push({ rowNumber, reason: `no Stripe invoice with email ${email}`, firstName, lastName });
      continue;
    }

    let chosen: Stripe.Invoice | undefined;
    if (candidates.length === 1) {
      chosen = candidates[0];
    } else {
      // Disambiguate by metadata.applicant_name
      chosen = candidates.find((inv) => {
        const metaName = (inv.metadata?.applicant_name ?? "").trim().toLowerCase();
        return metaName === fullName;
      });
      if (!chosen) {
        // Fall back to most recent
        chosen = candidates.sort((a, b) => b.created - a.created)[0];
      }
    }

    if (!chosen?.id) {
      skipped.push({ rowNumber, reason: "matched invoice has no id", firstName, lastName });
      continue;
    }

    const newStatus = chosen.status === "paid" ? "Paid" : oldStatus || "Unpaid";

    fixes.push({
      rowNumber,
      email,
      name: `${firstName} ${lastName}`.trim(),
      oldBB,
      newBB: chosen.id,
      oldStatus,
      newStatus,
      invoiceId: chosen.id,
    });
  }

  // 4. Print plan
  console.log("== Header rename ==");
  console.log("  BB1: 'Stripe Invoice URL' -> 'Stripe Invoice ID'");
  console.log("");

  console.log("== Row fixes ==");
  for (const f of fixes) {
    console.log(`  Row ${f.rowNumber} (${f.name}, ${f.email})`);
    console.log(`    BB: ${f.oldBB.slice(0, 60)}${f.oldBB.length > 60 ? "..." : ""}`);
    console.log(`    -> ${f.newBB}`);
    console.log(`    C:  ${f.oldStatus} -> ${f.newStatus}`);
    console.log("");
  }

  if (skipped.length > 0) {
    console.log("== Skipped ==");
    for (const s of skipped) {
      console.log(`  Row ${s.rowNumber} (${s.firstName} ${s.lastName}): ${s.reason}`);
    }
    console.log("");
  }

  if (!APPLY) {
    console.log("Dry run complete. Re-run with --apply to write changes.");
    return;
  }

  // 5. Apply writes
  console.log("Writing changes...");
  // Header
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'Tenant Applications'!BB1`,
    valueInputOption: "RAW",
    requestBody: { values: [["Stripe Invoice ID"]] },
  });
  console.log("  Header BB1 updated");

  // Rows
  for (const f of fixes) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'Tenant Applications'!BB${f.rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[f.newBB]] },
    });
    if (f.newStatus !== f.oldStatus) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'Tenant Applications'!C${f.rowNumber}`,
        valueInputOption: "RAW",
        requestBody: { values: [[f.newStatus]] },
      });
    }
    console.log(`  Row ${f.rowNumber} (${f.name}) updated`);
  }
  console.log("");
  console.log("Done.");
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
