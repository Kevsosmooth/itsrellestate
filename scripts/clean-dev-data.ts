import { readFileSync } from "fs";
import { createInterface } from "readline";

const envContent = readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const ENVIRONMENTS = {
  dev: {
    tenantFolderId: "15Nk6nlBNWuCK-Nzcq5bWy-uklGGkajGv",
    landlordFolderId: "1f2v9brtNGyFCSjCDD3qLLz9Tw6azCtrK",
  },
  prod: {
    tenantFolderId: "1gnsrUBqAhEkxsBlebQXavFhTjrG3U3v2",
    landlordFolderId: "1GxryR5A-lIge--XJcExYITTjN3aFwUpl",
  },
} as const;

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
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

  const envArg = process.argv[2];
  let env: "dev" | "prod";

  if (envArg === "dev" || envArg === "prod") {
    env = envArg;
  } else {
    const answer = await prompt("Which environment? (dev / prod / both): ");
    if (answer === "both") {
      await cleanEnvironment("dev", sheets, drive, spreadsheetId);
      await cleanEnvironment("prod", sheets, drive, spreadsheetId);
      return;
    }
    if (answer !== "dev" && answer !== "prod") {
      console.log("Invalid choice. Use: dev, prod, or both");
      process.exit(1);
    }
    env = answer;
  }

  await cleanEnvironment(env, sheets, drive, spreadsheetId);
}

async function cleanEnvironment(
  env: "dev" | "prod",
  sheets: ReturnType<typeof import("googleapis").google.sheets>,
  drive: ReturnType<typeof import("googleapis").google.drive>,
  spreadsheetId: string,
) {
  const label = env.toUpperCase();
  const { tenantFolderId, landlordFolderId } = ENVIRONMENTS[env];

  console.log(`\n--- Cleaning ${label} ---\n`);

  for (const sheetName of ["Tenant Applications", "Landlord Applications"]) {
    const range = `'${sheetName}'!A2:ZZ`;
    await sheets.spreadsheets.values.clear({ spreadsheetId, range });
    console.log(`Cleared ${sheetName} (headers kept)`);
  }

  for (const [type, folderId] of [
    ["Tenant", tenantFolderId],
    ["Landlord", landlordFolderId],
  ] as const) {
    const files = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id,name)",
    });

    const items = files.data.files || [];
    if (items.length === 0) {
      console.log(`${type} folder: already empty`);
      continue;
    }

    console.log(`\n${type} folder has ${items.length} item(s):`);
    items.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}`));

    const answer = await prompt(`Delete all ${items.length} ${type.toLowerCase()} item(s)? (y/n): `);
    if (answer !== "y" && answer !== "yes") {
      console.log(`Skipped ${type} folder.`);
      continue;
    }

    for (const file of items) {
      await drive.files.delete({ fileId: file.id! });
    }
    console.log(`${type} folder: deleted ${items.length} item(s)`);
  }

  console.log(`\n${label} data cleaned.`);
}

main().catch(console.error);
