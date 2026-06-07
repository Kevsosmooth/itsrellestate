import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAllowedOrigin, allowedOrigins, VERCEL_PREVIEW } from "@/lib/origin-allowlist";
import { ALLOWED_TYPES } from "@/lib/magic-bytes";
import { MAX_FILE_SIZE, MAX_FILES_PER_APP, MAX_BYTES_PER_APP, sanitizeFilename } from "@/lib/upload-limits";
import { getApplicationFolderId } from "@/lib/applications-neon";
import { findChildFolder } from "@/lib/google";
import { PER_PERSON_DOC_CATEGORIES, safeOccupantFolderName } from "@/lib/required-docs";
import { generateDriveId, getOrCreateQuarantineFolder, mintResumableSession } from "@/lib/drive-uploads";
import { recordMint, countForApplication } from "@/lib/uploads-ledger";

export const runtime = "nodejs";

export interface SessionRequest {
  applicationId: string;
  formType: "tenant" | "landlord";
  slot: { category: string; person: string };
  fileName: string;
  mimeType: string;
  size: number;
}

// PURE + exported for unit testing. Validates the request SHAPE and limits only
// (no DB/Drive). Returns null if valid, or {error,status} if not.
export function validateSessionInput(body: unknown): { error: string; status: number } | null {
  if (typeof body !== "object" || body === null) return { error: "Invalid body", status: 400 };
  const b = body as Record<string, unknown>;
  const slot = b.slot as Record<string, unknown> | undefined;
  if (typeof b.applicationId !== "string" || !b.applicationId) return { error: "Missing applicationId", status: 400 };
  if (b.formType !== "tenant" && b.formType !== "landlord") return { error: "Invalid formType", status: 400 };
  if (!slot || typeof slot.category !== "string" || typeof slot.person !== "string" || !slot.category || !slot.person)
    return { error: "Invalid slot", status: 400 };
  if (typeof b.fileName !== "string" || !b.fileName) return { error: "Missing fileName", status: 400 };
  if (typeof b.mimeType !== "string" || !ALLOWED_TYPES.has(b.mimeType)) return { error: "File type not allowed", status: 415 };
  if (typeof b.size !== "number" || !Number.isFinite(b.size) || b.size <= 0) return { error: "Invalid size", status: 400 };
  if (b.size > MAX_FILE_SIZE) return { error: "File exceeds 25MB limit", status: 413 };
  return null;
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && !isAllowedOrigin(origin, allowedOrigins(), VERCEL_PREVIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await request.json().catch(() => null)) as SessionRequest | null;
    const invalid = validateSessionInput(body);
    if (invalid) return NextResponse.json({ error: invalid.error }, { status: invalid.status });
    const req = body as SessionRequest;

    // Resolve the application's Drive folder authoritatively from its id.
    const folderId = await getApplicationFolderId(req.applicationId);
    if (!folderId) return NextResponse.json({ error: "Unknown application" }, { status: 404 });

    // Per-application quotas (abuse guard).
    const { files, bytes } = await countForApplication(req.applicationId);
    if (files >= MAX_FILES_PER_APP || bytes + req.size > MAX_BYTES_PER_APP) {
      return NextResponse.json({ error: "Upload limit reached for this application" }, { status: 429 });
    }

    // Resolve destination folder from the slot (server-side; no client folder ids).
    const uploadsFolderId = await findChildFolder(folderId, "uploads");
    if (!uploadsFolderId) return NextResponse.json({ error: "Application uploads folder missing" }, { status: 409 });
    let destinationFolder = uploadsFolderId;
    if (PER_PERSON_DOC_CATEGORIES.includes(req.slot.category) && req.slot.person !== "primary") {
      const occ = await findChildFolder(uploadsFolderId, safeOccupantFolderName(req.slot.person));
      if (occ) destinationFolder = occ;
    }

    const quarantineParent = await getOrCreateQuarantineFolder(folderId);
    const fileId = await generateDriveId();
    const safeName = sanitizeFilename(req.fileName);
    const nonce = randomUUID();

    const sessionUri = await mintResumableSession({
      name: safeName,
      parents: [quarantineParent],
      fileId,
      mimeType: req.mimeType,
      size: req.size,
      origin: origin ?? allowedOrigins()[0] ?? "",
    });

    await recordMint({
      applicationId: req.applicationId,
      formType: req.formType,
      category: req.slot.category,
      person: req.slot.person,
      nonce,
      driveFileId: fileId,
      sessionUri,
      quarantineParent,
      destinationFolder,
      expectedName: safeName,
      expectedMime: req.mimeType,
      expectedSize: req.size,
    });

    // Return ONLY the nonce. The session URL stays server-side (Approach B).
    return NextResponse.json({ nonce });
  } catch (err) {
    // NEVER log the session URL or request body (may contain the capability).
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[upload/session] mint failed:", message);
    return NextResponse.json({ error: "Could not start upload" }, { status: 500 });
  }
}
