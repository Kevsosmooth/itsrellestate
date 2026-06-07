// ---------------------------------------------------------------------------
// Direct-drive upload orchestration (mint / chunk / verify)
//
// Each document is uploaded by minting a one-time session, relaying the file to
// the server in chunks (each chunk retried a few times on a transient hiccup so
// a flaky network still lands the file), then verifying. Permanent rejections
// (too large, wrong type, over quota) fail immediately with a clear, file-named
// reason — retrying can't help and the applicant needs to know what to fix.
// ---------------------------------------------------------------------------

export interface UploadContext {
  applicationId: string;
  formType: "tenant" | "landlord";
}

export interface UploadResult {
  status: "verified" | "failed";
  link?: string;
  error?: string;
}

export const UPLOAD_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB: safely under Vercel's ~4.5MB body limit

export interface ChunkRange {
  start: number;
  end: number;
  header: string;
}

// PURE + exported for testing. Splits a file of `total` bytes into sequential
// chunk ranges; `header` is the "bytes START-END/TOTAL" value for that chunk.
export function chunkRanges(
  total: number,
  chunkSize: number = UPLOAD_CHUNK_SIZE,
): ChunkRange[] {
  const ranges: ChunkRange[] = [];
  if (total <= 0) return ranges;
  let start = 0;
  while (start < total) {
    const end = Math.min(start + chunkSize, total); // exclusive end
    ranges.push({ start, end, header: `bytes ${start}-${end - 1}/${total}` });
    start = end;
  }
  return ranges;
}

// PURE + exported for testing. Turns a server error + status into a clear,
// file-named message for the applicant (no silent failures).
export function friendlyUploadError(
  serverError: string | undefined,
  status: number,
  fileName: string,
): string {
  if (status === 413) return `"${fileName}" is too large (max 25MB).`;
  if (status === 415)
    return `"${fileName}" is not an accepted file type (use PDF, Word, JPG, or PNG).`;
  if (status === 429)
    return `Too many files for this application. Please remove some and try again.`;
  if (status === 422)
    return serverError
      ? `"${fileName}": ${serverError}`
      : `"${fileName}" could not be verified. Please re-upload it.`;
  if (status === 0)
    return `"${fileName}" failed to upload — check your connection and tap Retry.`;
  return serverError
    ? `"${fileName}": ${serverError}`
    : `"${fileName}" failed to upload (error ${status}). Please tap Retry.`;
}

async function fetchJson(
  url: string,
  init: RequestInit,
): Promise<{
  ok: boolean;
  status: number;
  body: { error?: string; [k: string]: unknown } | null;
}> {
  try {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: null }; // network failure
  }
}

// Upload ONE already-named file. `file.name` is used as the filename the server
// stores (the caller renames the File to its category-prefixed name first).
// `onProgress(fraction 0..1)` fires as chunks land. Returns verified+link or failed+error.
export async function uploadOne(
  file: File,
  slot: { category: string; person: string },
  ctx: UploadContext,
  onProgress?: (fraction: number) => void,
): Promise<UploadResult> {
  // 1) mint
  const mint = await fetchJson("/api/upload/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicationId: ctx.applicationId,
      formType: ctx.formType,
      slot,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    }),
  });
  if (!mint.ok || !mint.body || typeof mint.body.nonce !== "string") {
    return {
      status: "failed",
      error: friendlyUploadError(mint.body?.error, mint.status, file.name),
    };
  }
  const nonce = mint.body.nonce as string;

  // 2) chunked relay (retry each chunk a few times on transient failure)
  const ranges = chunkRanges(file.size);
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const buf = await file.slice(r.start, r.end).arrayBuffer();
    let attempt = 0;
    let chunkResult: {
      ok: boolean;
      status: number;
      body: { error?: string } | null;
    } | null = null;
    while (attempt < 4) {
      chunkResult = await fetchJson("/api/upload/chunk", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-upload-application": ctx.applicationId,
          "x-upload-nonce": nonce,
          "x-upload-range": r.header,
        },
        body: buf,
      });
      if (chunkResult.ok) break;
      // 4xx (except 0/network) are permanent — stop retrying
      if (chunkResult.status >= 400 && chunkResult.status < 500) break;
      attempt++;
      await new Promise((res) => setTimeout(res, 600 * attempt));
    }
    if (!chunkResult || !chunkResult.ok) {
      return {
        status: "failed",
        error: friendlyUploadError(
          chunkResult?.body?.error,
          chunkResult?.status ?? 0,
          file.name,
        ),
      };
    }
    onProgress?.(r.end / file.size);
  }

  // 3) verify
  const verify = await fetchJson("/api/upload/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicationId: ctx.applicationId, nonce }),
  });
  if (!verify.ok || !verify.body) {
    return {
      status: "failed",
      error: friendlyUploadError(
        verify.body?.error,
        verify.status,
        file.name,
      ),
    };
  }
  onProgress?.(1);
  return {
    status: "verified",
    link:
      typeof verify.body.link === "string" ? verify.body.link : undefined,
  };
}
