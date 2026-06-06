// Single-file upload with automatic retry. A document upload that fails on a
// transient hiccup (dropped connection, a 5xx/429 from Drive) is retried with
// backoff so a flaky network "for sure" lands the file instead of silently
// dropping it mid-application. Permanent rejections (bad folder, too large,
// wrong type) fail immediately with the real reason — retrying can't help and
// the applicant needs to know what to fix.

const PERMANENT_STATUSES = new Set([400, 403, 413, 415]);

export interface UploadRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadFileWithRetry(
  formData: FormData,
  fileName: string,
  opts: UploadRetryOptions = {},
): Promise<void> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const baseDelayMs = opts.baseDelayMs ?? 800;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch("/api/upload", { method: "POST", body: formData });
    } catch (networkErr) {
      // Connection dropped / network blip — retryable.
      lastError =
        networkErr instanceof Error
          ? networkErr
          : new Error(`Upload failed for ${fileName}`);
      if (attempt < maxAttempts) {
        await delay(baseDelayMs * attempt);
        continue;
      }
      break;
    }

    if (res.ok) return;

    // Permanent rejection — surface the real reason, do not retry.
    if (PERMANENT_STATUSES.has(res.status)) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || `Upload rejected for ${fileName}`);
    }

    // Transient server error (5xx, 429, ...) — retry with backoff.
    const body = await res.json().catch(() => null);
    lastError = new Error(
      body?.error || `Upload failed for ${fileName} (status ${res.status})`,
    );
    if (attempt < maxAttempts) await delay(baseDelayMs * attempt);
  }

  throw new Error(
    `${lastError?.message ?? `Upload failed for ${fileName}`} (after ${maxAttempts} attempts)`,
  );
}
