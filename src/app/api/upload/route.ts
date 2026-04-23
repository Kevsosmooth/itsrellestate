import { NextResponse } from "next/server";
import { getDrive } from "@/lib/google";
import { Readable } from "stream";

const MAX_SIZE = 25 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

const MAGIC_BYTES: [string, Uint8Array][] = [
  ["application/pdf", new Uint8Array([0x25, 0x50, 0x44, 0x46])],
  ["image/png", new Uint8Array([0x89, 0x50, 0x4E, 0x47])],
  ["image/jpeg", new Uint8Array([0xFF, 0xD8, 0xFF])],
  ["application/msword", new Uint8Array([0xD0, 0xCF, 0x11, 0xE0])],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", new Uint8Array([0x50, 0x4B, 0x03, 0x04])],
];

function verifyMagicBytes(buffer: Buffer, declaredType: string): boolean {
  for (const [mimeType, magic] of MAGIC_BYTES) {
    if (mimeType === declaredType) {
      if (buffer.length < magic.length) return false;
      return magic.every((byte, i) => buffer[i] === byte);
    }
  }
  return false;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/^[.\s]+/, "")
    .replace(/[/\\:\0*?"<>|]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 200) || "unnamed";
}

async function isValidUploadFolder(folderId: string): Promise<boolean> {
  const tenantRoot = process.env.GOOGLE_TENANT_FOLDER_ID;
  const landlordRoot = process.env.GOOGLE_LANDLORD_FOLDER_ID;
  if (!tenantRoot || !landlordRoot) return false;

  const drive = getDrive();
  let currentId = folderId;
  const visited = new Set<string>();

  for (let depth = 0; depth < 5; depth++) {
    if (currentId === tenantRoot || currentId === landlordRoot) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);

    try {
      const file = await drive.files.get({
        fileId: currentId,
        fields: "parents",
      });
      const parents = file.data.parents;
      if (!parents || parents.length === 0) return false;
      currentId = parents[0];
    } catch {
      return false;
    }
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file || !folderId) {
      return NextResponse.json(
        { error: "Missing file or folderId" },
        { status: 400 },
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(folderId)) {
      return NextResponse.json(
        { error: "Invalid folder ID" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 25MB limit" },
        { status: 413 },
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 415 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!verifyMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "File content does not match declared type" },
        { status: 415 },
      );
    }

    const folderValid = await isValidUploadFolder(folderId);
    if (!folderValid) {
      return NextResponse.json(
        { error: "Invalid upload destination" },
        { status: 403 },
      );
    }

    const drive = getDrive();
    const stream = Readable.from(buffer);
    const safeName = sanitizeFilename(file.name);

    const uploaded = await drive.files.create({
      requestBody: {
        name: safeName,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: "id,name,webViewLink",
    });

    return NextResponse.json({
      fileId: uploaded.data.id,
      fileName: uploaded.data.name,
      link: uploaded.data.webViewLink,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Upload error:", message);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}
