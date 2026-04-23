import { readFileSync } from "fs";

const envContent = readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

async function main() {
  const { google } = await import("googleapis");

  const creds = JSON.parse(readFileSync(process.env.GOOGLE_PRIVATE_KEY_PATH!, "utf8"));
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
    subject: process.env.GOOGLE_IMPERSONATE_EMAIL,
  });

  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  const tenantFolderId = process.env.GOOGLE_TENANT_FOLDER_ID!;
  const landlordFolderId = process.env.GOOGLE_LANDLORD_FOLDER_ID!;

  // Clear sheet rows (keep headers)
  for (const sheetName of ["Tenant Applications", "Landlord Applications"]) {
    const range = `'${sheetName}'!A2:ZZ`;
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
    console.log(`Cleared ${sheetName} (headers kept)`);
  }

  // Delete all files/folders inside dev Drive folders
  for (const [label, folderId] of [
    ["Tenant", tenantFolderId],
    ["Landlord", landlordFolderId],
  ] as const) {
    const files = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id,name)",
    });

    const items = files.data.files || [];
    if (items.length === 0) {
      console.log(`${label} folder: already empty`);
      continue;
    }

    for (const file of items) {
      await drive.files.delete({ fileId: file.id! });
    }
    console.log(`${label} folder: deleted ${items.length} item(s)`);
  }

  console.log("\nDev data cleaned.");
}

main().catch(console.error);
