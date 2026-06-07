import { NextResponse } from "next/server";
import { getDrive } from "@/lib/google";
import { Readable } from "stream";
import { isAllowedOrigin, allowedOrigins, VERCEL_PREVIEW } from "@/lib/origin-allowlist";
import { matchesMagic, ALLOWED_TYPES } from "@/lib/magic-bytes";

const MAX_SIZE = 25 * 1024 * 1024;

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
    if (origin && !isAllowedOrigin(origin, allowedOrigins(), VERCEL_PREVIEW)) {
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

    if (!matchesMagic(buffer, file.type)) {
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
