import { NextResponse } from "next/server";
import { after } from "next/server";
import { generateAndUploadTenantPdf } from "@/lib/pdf-tenant";
import {
  getFolderProperties,
  patchFolderProperties,
  readApplicationJSON,
} from "@/lib/google";
import { tenantSchema } from "@/lib/validation";

export const runtime = "nodejs";

const IDEMPOTENCY_KEY_RE = /^[a-zA-Z0-9_-]{8,128}$/;
const FOLDER_ID_RE = /^[a-zA-Z0-9_-]{10,80}$/;

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey || !IDEMPOTENCY_KEY_RE.test(idempotencyKey)) {
      return NextResponse.json(
        { error: "Missing or invalid Idempotency-Key" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as { folderId?: string; uploadsFolderId?: string };
    const folderId = body.folderId;
    const uploadsFolderId = body.uploadsFolderId;
    if (!folderId || !FOLDER_ID_RE.test(folderId)) {
      return NextResponse.json({ error: "Missing or invalid folderId" }, { status: 400 });
    }
    if (!uploadsFolderId || !FOLDER_ID_RE.test(uploadsFolderId)) {
      return NextResponse.json({ error: "Missing or invalid uploadsFolderId" }, { status: 400 });
    }

    const props = await getFolderProperties(folderId);
    if (props.idempotencyKey !== idempotencyKey) {
      return NextResponse.json(
        { error: "Idempotency-Key does not match folder" },
        { status: 403 },
      );
    }

    if (props.pdfGenerated === "1") {
      return NextResponse.json({ success: true, alreadyGenerated: true });
    }

    const json = await readApplicationJSON(folderId);
    if (!json) {
      return NextResponse.json({ error: "Application data not found" }, { status: 404 });
    }

    const reconstructed = { paymentConfirmed: false, ...json };
    const parsed = tenantSchema.safeParse(reconstructed);
    if (!parsed.success) {
      console.error("[finalize] tenant schema parse failed:", parsed.error.format());
      return NextResponse.json({ error: "Stored application data is invalid" }, { status: 500 });
    }

    const submittedAt = props.submittedAt || (typeof json.submittedAt === "string" ? json.submittedAt : new Date().toISOString());

    after(async () => {
      try {
        await generateAndUploadTenantPdf({
          folderId,
          uploadsFolderId,
          data: { ...parsed.data, submittedAt } as Parameters<typeof generateAndUploadTenantPdf>[0]["data"],
        });
        await patchFolderProperties(folderId, { pdfGenerated: "1" });
      } catch (err) {
        console.error("[pdf] tenant finalize failed:", err);
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Tenant finalize error:", message);
    return NextResponse.json({ error: "Failed to finalize" }, { status: 500 });
  }
}
