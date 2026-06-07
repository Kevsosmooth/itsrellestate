import { getAuth, getDrive } from "./google";

export async function generateDriveId(): Promise<string> {
  const drive = getDrive();
  const res = await drive.files.generateIds({ count: 1 });
  const id = res.data.ids?.[0];
  if (!id) throw new Error("generateIds returned no id");
  return id;
}

// Mints a resumable upload session pointed at `parents` with a pre-set file id
// and name. Returns the session URL (a SECRET capability — callers must never
// log it). `auth` is injectable for tests; in production it defaults to the
// service-account token.
export async function mintResumableSession(
  f: { name: string; parents: string[]; fileId: string; mimeType: string; size: number; origin: string },
  auth?: { token: string },
): Promise<string> {
  const token = auth?.token ?? (await getAuth().getAccessToken()).token;
  if (!token) throw new Error("could not obtain access token");
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": f.mimeType,
        "X-Upload-Content-Length": String(f.size),
        Origin: f.origin,
      },
      body: JSON.stringify({ id: f.fileId, name: f.name, parents: f.parents }),
    },
  );
  if (!res.ok) throw new Error(`resumable mint failed: ${res.status}`);
  const loc = res.headers.get("location");
  if (!loc) throw new Error("resumable mint returned no Location header");
  return loc;
}

export async function getFileMeta(fileId: string) {
  const drive = getDrive();
  const res = await drive.files.get({ fileId, fields: "id,name,size,mimeType,parents,trashed" });
  return res.data;
}

export async function readFileHead(fileId: string, n = 8): Promise<Buffer> {
  const drive = getDrive();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer", headers: { Range: `bytes=0-${n - 1}` } },
  );
  return Buffer.from(res.data as ArrayBuffer);
}

export async function moveFile(fileId: string, fromParent: string, toParent: string): Promise<string> {
  const drive = getDrive();
  const res = await drive.files.update({
    fileId, addParents: toParent, removeParents: fromParent, fields: "id,webViewLink",
  });
  return res.data.webViewLink ?? "";
}

export async function deleteFile(fileId: string): Promise<void> {
  await getDrive().files.delete({ fileId });
}

// Find or create a per-application "_pending" quarantine subfolder under the
// applicant's Drive folder. Unverified uploads land here and only move into the
// applicant's real subfolders after passing verification.
export async function getOrCreateQuarantineFolder(applicationFolderId: string): Promise<string> {
  const drive = getDrive();
  const existing = await drive.files.list({
    q: [
      `'${applicationFolderId}' in parents`,
      `mimeType = 'application/vnd.google-apps.folder'`,
      `name = '_pending'`,
      `trashed = false`,
    ].join(" and "),
    fields: "files(id)",
    pageSize: 1,
  });
  const found = existing.data.files?.[0]?.id;
  if (found) return found;
  const created = await drive.files.create({
    requestBody: { name: "_pending", mimeType: "application/vnd.google-apps.folder", parents: [applicationFolderId] },
    fields: "id",
  });
  if (!created.data.id) throw new Error("failed to create quarantine folder");
  return created.data.id;
}
