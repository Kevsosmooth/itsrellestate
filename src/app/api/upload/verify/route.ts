import { NextResponse } from "next/server";
import { isAllowedOrigin, allowedOrigins, VERCEL_PREVIEW } from "@/lib/origin-allowlist";
import { matchesMagic } from "@/lib/magic-bytes";
import { getByNonce, markStatus } from "@/lib/uploads-ledger";
import { getFileMeta, readFileHead, moveFile, deleteFile } from "@/lib/drive-uploads";
import { maybeCreateInvoice } from "@/lib/billing-gate";

export const runtime = "nodejs";

interface RowLike {
  quarantine_parent: string | null;
  destination_folder: string | null;
  expected_name: string | null;
  expected_size: number | null;
  expected_mime: string | null;
}
interface MetaLike {
  parents?: string[] | null;
  trashed?: boolean | null;
  size?: string | number | null;
  name?: string | null;
}
export type VerifyOutcome = { action: "move" } | { action: "reject"; reason: string };

// PURE + exported for unit testing. Decides whether the uploaded Drive file is
// trustworthy: it must be in the expected quarantine folder, not trashed, match
// the expected byte size, and its real leading bytes must match the declared type.
export function verifyDecision(args: { row: RowLike | null; meta: MetaLike | null; head: Buffer }): VerifyOutcome {
  const { row, meta, head } = args;
  if (!row) return { action: "reject", reason: "unknown upload" };
  if (!meta) return { action: "reject", reason: "file not found" };
  if (meta.trashed) return { action: "reject", reason: "file is trashed" };
  if (!row.quarantine_parent || !(meta.parents ?? []).includes(row.quarantine_parent))
    return { action: "reject", reason: "file is not in the expected folder" };
  const actualSize = meta.size == null ? null : (typeof meta.size === "string" ? parseInt(meta.size, 10) : meta.size);
  if (row.expected_size != null && actualSize != null && actualSize !== row.expected_size)
    return { action: "reject", reason: "uploaded size does not match" };
  if (!row.expected_mime || !matchesMagic(head, row.expected_mime))
    return { action: "reject", reason: "file content does not match its type" };
  return { action: "move" };
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && !isAllowedOrigin(origin, allowedOrigins(), VERCEL_PREVIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await request.json().catch(() => null)) as { applicationId?: string; nonce?: string } | null;
    if (!body || typeof body.applicationId !== "string" || typeof body.nonce !== "string") {
      return NextResponse.json({ error: "Missing applicationId or nonce" }, { status: 400 });
    }
    const row = await getByNonce(body.applicationId, body.nonce);
    if (!row || !row.drive_file_id) {
      return NextResponse.json({ error: "Unknown upload" }, { status: 404 });
    }

    const meta = await getFileMeta(row.drive_file_id);
    const head = await readFileHead(row.drive_file_id, 8);
    const decision = verifyDecision({ row, meta, head });

    if (decision.action === "reject") {
      // Best-effort cleanup: delete the bad/incomplete file from quarantine.
      // Failure here is intentionally swallowed — the file may already be gone
      // or inaccessible, and a delete error must not prevent the ledger update.
      try { await deleteFile(row.drive_file_id); } catch { /* best effort — see comment above */ }
      await markStatus(row.nonce, "failed");
      return NextResponse.json({ error: decision.reason }, { status: 422 });
    }

    if (!row.destination_folder || !row.quarantine_parent) {
      return NextResponse.json({ error: "Upload misconfigured" }, { status: 409 });
    }
    // Order matters: move first, then mark verified, then check billing.
    // The file must be out of quarantine before the row is considered verified,
    // and billing must only fire after the ledger reflects the verified state.
    const link = await moveFile(row.drive_file_id, row.quarantine_parent, row.destination_folder);
    await markStatus(row.nonce, "verified");
    await maybeCreateInvoice(row.application_id, row.form_type as "tenant" | "landlord");
    return NextResponse.json({ link });
  } catch (err) {
    console.error("[upload/verify] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
