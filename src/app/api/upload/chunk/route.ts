import { NextResponse } from "next/server";
import {
  isAllowedOrigin,
  allowedOrigins,
  VERCEL_PREVIEW,
} from "@/lib/origin-allowlist";
import { getByNonce, markStatus } from "@/lib/uploads-ledger";

export const runtime = "nodejs";

// PURE + exported for unit testing. Validates the chunk request headers.
export function validateChunkHeaders(h: {
  applicationId: string | null;
  nonce: string | null;
  range: string | null;
}): { error: string; status: number } | null {
  if (!h.applicationId || !h.nonce || !h.range)
    return { error: "Missing upload headers", status: 400 };
  if (!/^bytes \d+-\d+\/\d+$/.test(h.range))
    return { error: "Invalid range", status: 400 };
  return null;
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && !isAllowedOrigin(origin, allowedOrigins(), VERCEL_PREVIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const applicationId = request.headers.get("x-upload-application");
    const nonce = request.headers.get("x-upload-nonce");
    const range = request.headers.get("x-upload-range");

    const invalid = validateChunkHeaders({ applicationId, nonce, range });
    if (invalid)
      return NextResponse.json({ error: invalid.error }, { status: invalid.status });

    const row = await getByNonce(applicationId as string, nonce as string);
    if (!row || !row.session_uri) {
      return NextResponse.json(
        { error: "Unknown upload session" },
        { status: 404 },
      );
    }

    const chunk = Buffer.from(await request.arrayBuffer());

    // row.session_uri is a secret — never returned or logged.
    const relay = await fetch(row.session_uri, {
      method: "PUT",
      headers: {
        "Content-Range": range as string,
        "Content-Length": String(chunk.length),
      },
      body: chunk,
    });

    if (relay.status === 200 || relay.status === 201) {
      await markStatus(nonce as string, "uploaded");
      return NextResponse.json({ done: true });
    }

    if (relay.status === 308) {
      // More chunks expected; echo Google's Range header so the client
      // knows how many bytes have been committed so far.
      return NextResponse.json({
        done: false,
        range: relay.headers.get("range"),
      });
    }

    // Google rejected the chunk (e.g. 410 session expired, 4xx/5xx).
    return NextResponse.json(
      { error: "Upload rejected by storage", status: relay.status },
      { status: 502 },
    );
  } catch (err) {
    // Never log the session URI or the raw bytes.
    console.error(
      "[upload/chunk] relay failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Chunk upload failed" }, { status: 500 });
  }
}
