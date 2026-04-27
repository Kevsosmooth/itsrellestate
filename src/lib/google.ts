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
      "https://www.googleapis.com/auth/gmail.modify",
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
  occupantNames: string[] = [],
): Promise<{
  folderId: string;
  folderLink: string;
  uploadsFolderId: string;
  occupantFolderIds: Record<string, string>;
}> {
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

  const occupantFolderIds: Record<string, string> = {};
  for (const name of occupantNames) {
    const safeOccName = name.replace(/[^a-zA-Z0-9 -]/g, "").replace(/\s+/g, "-");
    const occFolder = await drive.files.create({
      requestBody: {
        name: safeOccName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [uploadsFolder.data.id!],
      },
      fields: "id",
    });
    occupantFolderIds[name] = occFolder.data.id!;
  }

  return {
    folderId: folder.data.id!,
    folderLink: folder.data.webViewLink!,
    uploadsFolderId: uploadsFolder.data.id!,
    occupantFolderIds,
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

function getGmail() {
  return google.gmail({ version: "v1", auth: getAuth() });
}

interface NotificationEmailParams {
  formType: "tenant" | "landlord";
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  highlights: { label: string; value: string }[];
}

function buildEmailHtml(params: NotificationEmailParams): string {
  const { formType, applicantName, applicantPhone, highlights } = params;
  const typeLabel = formType === "tenant" ? "Tenant" : "Landlord";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://itsrellestate.vercel.app";
  const logoUrl = `${siteUrl}/images/logo.png`;

  const highlightRows = highlights
    .filter((h) => h.value)
    .map(
      (h) =>
        `<tr>
          <td style="padding:6px 12px 6px 0;color:#6b6560;font-size:14px;white-space:nowrap;vertical-align:top;">${h.label}</td>
          <td style="padding:6px 0;color:#2d2a24;font-size:14px;font-weight:600;">${h.value}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#fdf9f2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fdf9f2;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:24px;">
          <img src="${logoUrl}" alt="ItsRellEstate" width="160" style="display:block;height:auto;">
        </td></tr>

        <!-- Card -->
        <tr><td style="background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header bar -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#3b6ee6;padding:20px 28px;">
              <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">New ${typeLabel} Application</h1>
            </td></tr>
          </table>

          <!-- Body -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:28px;">
              <p style="margin:0 0 20px;color:#2d2a24;font-size:15px;line-height:1.5;">
                <strong>${applicantName}</strong> submitted a ${typeLabel.toLowerCase()} application.
              </p>

              <!-- Highlights -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e2d8;padding-top:16px;">
                ${highlightRows}
              </table>

              <!-- Reply prompt -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding-top:24px;border-top:1px solid #e8e2d8;">
                  <p style="margin:0;color:#6b6560;font-size:13px;line-height:1.5;">
                    Reply to this email to respond directly to ${applicantName} at ${applicantPhone}.
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:24px 0 0;">
          <p style="margin:0;color:#9a9490;font-size:12px;">
            ItsRellEstate | NYS Lic. #10401396493
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildRawEmail(
  from: string,
  to: string,
  replyTo: string,
  subject: string,
  htmlBody: string,
): string {
  const boundary = `boundary_${Date.now()}`;
  const lines = [
    `Delivered-To: ${to}`,
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(htmlBody).toString("base64"),
    ``,
    `--${boundary}--`,
  ];
  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendNotificationEmail(
  params: NotificationEmailParams,
): Promise<void> {
  const gmail = getGmail();
  const alias =
    params.formType === "tenant"
      ? "tenant@itsrellestate.com"
      : "landlord@itsrellestate.com";
  const labelId = params.formType === "tenant" ? "Label_1" : "Label_2";
  const typeLabel = params.formType === "tenant" ? "Tenant" : "Landlord";
  const subject = `${typeLabel} Application: ${params.applicantName}`;

  const html = buildEmailHtml(params);
  const raw = buildRawEmail(
    `ItsRellEstate <${alias}>`,
    alias,
    params.applicantEmail,
    subject,
    html,
  );

  await gmail.users.messages.insert({
    userId: "me",
    requestBody: {
      raw,
      labelIds: [labelId, "UNREAD"],
    },
    internalDateSource: "dateHeader",
  });
}

export async function appendSheetRow(
  sheetName: string,
  values: string[],
): Promise<{ rowNumber: number }> {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SPREADSHEET_ID not set");

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:A`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });

  const updatedRange = res.data.updates?.updatedRange ?? "";
  const match = updatedRange.match(/!\D+(\d+):/);
  const rowNumber = match ? parseInt(match[1], 10) : 0;
  if (!rowNumber) {
    throw new Error(`Failed to parse row number from append response: ${updatedRange}`);
  }

  return { rowNumber };
}
