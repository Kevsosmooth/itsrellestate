import { google } from "googleapis";
import { readFileSync, existsSync } from "fs";

let cachedAuth: InstanceType<typeof google.auth.JWT> | null = null;

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

  throw new Error(
    "Google credentials not configured. Set GOOGLE_PRIVATE_KEY_PATH (local) or GOOGLE_PRIVATE_KEY (Vercel).",
  );
}

function getAuth() {
  if (cachedAuth) return cachedAuth;

  const creds = loadCredentials();

  cachedAuth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
    subject: process.env.GOOGLE_IMPERSONATE_EMAIL,
  });

  return cachedAuth;
}

export function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

export function getDrive() {
  return google.drive({ version: "v3", auth: getAuth() });
}

export async function createApplicantFolder(
  parentFolderId: string,
  applicantName: string,
  formType: "tenant" | "landlord",
): Promise<{ folderId: string; folderLink: string; uploadsFolderId: string }> {
  const drive = getDrive();
  const timestamp = new Date().toISOString().slice(0, 10);
  const safeName = applicantName.replace(/[^a-zA-Z0-9 -]/g, "").replace(/\s+/g, "-");
  const folderName = `${timestamp}_${safeName}_${formType}`;

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id,webViewLink",
  });

  const uploadsFolder = await drive.files.create({
    requestBody: {
      name: "uploads",
      mimeType: "application/vnd.google-apps.folder",
      parents: [folder.data.id!],
    },
    fields: "id",
  });

  return {
    folderId: folder.data.id!,
    folderLink: folder.data.webViewLink!,
    uploadsFolderId: uploadsFolder.data.id!,
  };
}

export async function saveApplicationJSON(
  folderId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const drive = getDrive();
  const content = JSON.stringify(data, null, 2);

  await drive.files.create({
    requestBody: {
      name: "application-data.json",
      mimeType: "application/json",
      parents: [folderId],
    },
    media: {
      mimeType: "application/json",
      body: content,
    },
  });
}

export async function appendSheetRow(
  sheetName: string,
  values: string[],
): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SPREADSHEET_ID not set");

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:A`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}
