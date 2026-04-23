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

  // Create dev spreadsheet
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "ItsRellEstate DEV - Applications" },
      sheets: [
        { properties: { title: "Tenant Applications" } },
        { properties: { title: "Landlord Applications" } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;
  const url = spreadsheet.data.spreadsheetUrl!;
  console.log(`Created dev spreadsheet: ${spreadsheetId}`);
  console.log(`URL: ${url}`);

  // Add headers to Tenant Applications
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'Tenant Applications'!A1",
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        "Timestamp", "Folder Link", "Payment Status",
        "First Name", "Last Name", "Date of Birth", "Cell Phone", "Email",
        "Emergency Contact", "Emergency Phone",
        "Preferred Borough", "Current Address", "City", "State", "Zip",
        "Viewed Apartment", "Viewing Date",
        "Has Assistance", "Program", "Voucher Bedrooms", "Voucher Number", "Voucher Exp",
        "Is Transferring", "From Shelter",
        "Landlord Name", "Landlord Phone", "Landlord Email",
        "Cash Assist Active", "Credit Score",
        "Has Occupants", "Occupant Count", "Occupants Detail",
        "Currently Working", "Employer", "Employer Address", "Supervisor", "Supervisor Phone",
        "Pay Type", "Pay Amount", "Hours/Week", "Pay Frequency",
        "Is Veteran", "Filed Taxes", "Income Sources", "Other Income",
        "Housing Spec Name", "Housing Spec Phone", "Housing Spec Email",
        "Smoker", "Pets", "Signature", "Folder Link",
      ]],
    },
  });

  // Add headers to Landlord Applications
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'Landlord Applications'!A1",
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        "Timestamp", "Property Address", "City", "State", "Zip",
        "Ownership Type", "Legal Name/Business", "Tax ID (masked)", "Payment Preference",
        "Bank Name", "Account Type",
        "Mailing Address", "Mail City", "Mail State", "Mail Zip",
        "First Name", "Last Name", "Phone", "Email",
        "Has Auth Rep", "Auth Rep Name", "Auth Rep Phone", "Auth Rep Email",
        "Year Built", "Total Stories", "Residential Units", "Commercial Units",
        "Rent Stabilized", "Heating", "Cooking", "Hot Water", "Electric",
        "Water", "Sewer", "Trash", "AC",
        "Units Detail",
        "Pay Check", "Pay Zelle", "Pay ACH",
        "POC Name", "POC Phone", "POC Email",
        "Submitter Title", "Signature", "Folder Link",
      ]],
    },
  });

  // Create dev Drive folders
  const devRoot = await drive.files.create({
    requestBody: {
      name: "ItsRellEstate DEV",
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  const tenantFolder = await drive.files.create({
    requestBody: {
      name: "Tenant Applications",
      mimeType: "application/vnd.google-apps.folder",
      parents: [devRoot.data.id!],
    },
    fields: "id",
  });

  const landlordFolder = await drive.files.create({
    requestBody: {
      name: "Landlord Applications",
      mimeType: "application/vnd.google-apps.folder",
      parents: [devRoot.data.id!],
    },
    fields: "id",
  });

  console.log(`\nDev Drive folder: ${devRoot.data.id}`);
  console.log(`Dev Tenant folder: ${tenantFolder.data.id}`);
  console.log(`Dev Landlord folder: ${landlordFolder.data.id}`);

  console.log(`\n--- Add these to .env.local for dev ---`);
  console.log(`GOOGLE_SPREADSHEET_ID=${spreadsheetId}`);
  console.log(`GOOGLE_TENANT_FOLDER_ID=${tenantFolder.data.id}`);
  console.log(`GOOGLE_LANDLORD_FOLDER_ID=${landlordFolder.data.id}`);
}

main().catch(console.error);
