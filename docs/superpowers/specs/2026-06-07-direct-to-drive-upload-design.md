# Spec — Direct-to-Drive Upload + Bill-After-Upload (2026-06-07)

> Revised after architecture/security review by Codex (gpt-5.5, high effort) and
> Kimi (free-tier second opinion). See "Review changes applied" at the end.

## Problem

`/api/upload` routes every document **browser → our Vercel server → Google Drive**.
Vercel rejects any request body larger than ~4.5MB with `413
FUNCTION_PAYLOAD_TOO_LARGE` **before our route code runs**.

Proven on prod (2026-06-06): a 1MB file reaches the route, a 6MB file returns
`413`. A Drive audit of the 30 documents ever uploaded to the prod tenant folder
found **zero** over 4.5MB (largest 2.90MB) — despite the form advertising 25MB.
Every file over ~4.5MB has silently failed, and at least one applicant was billed
for an application whose documents never uploaded. Retry cannot fix it — it is a
permanent platform limit.

## Goals

1. Files up to 25MB upload reliably on both the tenant and landlord forms.
2. No silent failures — a file that cannot upload produces a clear message naming
   the file and the reason; submit never reports success it did not achieve.
3. A per-file progress indicator so a slow phone upload never looks frozen.
4. **The tenant invoice is created by the SERVER, only after the server itself
   confirms every required document is uploaded and verified** (owner directive
   2026-06-07: "they need to get billed after 100% it goes thru"). The browser is
   never trusted to decide billing.
5. Preserve today's file-type check (magic bytes) and be honest about its limits.
6. Preserve the existing Drive folder tree, naming, and idempotency logic.

## Non-goals (separate follow-ups)

- Email typo-suggestion ("gmail.con" → "gmail.com").
- Failure-alert email to Nyrell.
- Changing the storage backend — it stays Google Drive.
- Resume-across-page-reload (retry is within the current session only).
- **Malware scanning.** Magic-byte checks catch mislabeled files, not malware or
  polyglots. Real content scanning is out of scope and explicitly not claimed.

## Current flow (as-is)

Tenant form → `POST /api/apply/tenant`: creates the folder tree
(`getOrCreateApplicantFolder`), Sheet row, Neon mirror, contact upsert, **Stripe
invoice (route.ts L216–246)**, notification email. Returns folder ids. Then the
client loops each file → `POST /api/upload` (browser → Vercel → Drive), which
validates origin/size/type/magic-bytes/folder and streams to Drive. Errors set
`submitError` + a "Retry Upload" that re-runs **all** uploads.

Payment: the applicant does NOT pay in-form — they check a box; after submit
Stripe **emails** a $20 invoice paid via link; a webhook flips status later.
Because payment is async, moving invoice creation later disrupts no in-form UX.

Landlord form: same upload path, **no invoice / no fee**.

## Server-side upload ledger (new — the source of truth)

A new Neon table (e.g. `application_uploads`) is the authoritative record. The
browser is treated as untrusted; the ledger — not the client — decides when an
application is complete and billable.

At `POST /api/apply/{type}`, the server computes the **required-document
manifest** itself from the validated form data (the required-docs rule is
extracted into a shared module so client and server agree; the server must NOT
accept a client-supplied manifest, or a tampered client could declare zero
required docs and trigger an immediate invoice). The manifest is one row per
required slot: `{ applicationId, category, person, required: true,
status: 'pending' }`.

Each minted upload adds/updates a row: `{ applicationId, slot, nonce,
preGeneratedFileId, quarantineParentId, destinationFolderId, expectedName,
expectedMime, expectedSize, status }` where status moves
`minted → uploaded → verified | failed`.

Billing is gated on this table: when every `required` slot has a `verified`
upload, the server creates the invoice (see Billing).

## Target flow (to-be)

1. `POST /api/apply/{type}` — folder tree, Sheet row, Neon mirror, contact
   upsert, notification email, **and the required-doc manifest in the ledger**.
   **Tenant: NO invoice here.** Returns folder ids.
2. Per file — `POST /api/upload/session` `{ applicationId, slot, fileName,
   mimeType, size }`:
   - exact-origin allowlist check (see Security); confirm the application exists
     and the slot is one the server expects; enforce per-application file-count
     and total-byte quotas; MIME ∈ allow-list; size ≤ 25MB; sanitize name.
   - pre-generate a Drive file id (`files.generateIds`) so retries are
     deterministic and the id is known before bytes exist.
   - mint a Drive **resumable session** into a per-application **quarantine
     folder** (raw request to
     `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`
     with the service-account token, metadata `{ id, name, parents:[quarantine] }`,
     `X-Upload-Content-Type`, `X-Upload-Content-Length`, **forwarding the
     browser's allowlisted `Origin`**).
   - record the mint in the ledger (status `minted`, with a server nonce). Return
     `{ uploadUrl, nonce }`. **Never log the `uploadUrl` / send it to Sentry — it
     is a capability.**
3. Browser uploads bytes directly to `uploadUrl` in chunks, reporting progress;
   handles the resumable protocol: `308` → continue; `5xx/429` → backoff;
   `404/410` (session gone) → ask the server to re-mint. Final chunk returns the
   Drive file resource.
4. On file complete — `POST /api/upload/verify` `{ applicationId, nonce }`
   (NOT a raw fileId):
   - look up the ledger row by `(applicationId, nonce)`; reject if unknown.
   - confirm the Drive file matches the recorded expectation: parent ==
     quarantine, name, MIME, **actual size**, non-trashed.
   - download the first bytes (`files.get` + `Range`) and run the magic-byte
     check against the recorded MIME.
   - on success: **move** the file from quarantine into its `destinationFolderId`
     (`files.update` add/removeParents); mark the row `verified`; return `{ link }`.
   - on mismatch: `files.delete`; mark `failed`; return a clear error.
5. **Server-authoritative billing (tenant):** at the end of a successful verify,
   the server checks the ledger — if every `required` slot is now `verified` and
   no invoice exists yet, it creates the invoice (idempotent — see Billing). No
   client "finalize" call decides this.
6. Client shows `complete` once the server reports all required slots verified.

### Why this satisfies "bill after 100%"

"100%" is defined and checked **server-side** against the required-doc manifest. A
crashed, slow, or tampered browser cannot bill early (it cannot mark slots
verified — only a real verified Drive file does) and cannot bill at zero (the
server computes the required set itself). If the browser dies mid-upload, no
invoice is created — the safe direction.

## Approach chosen: B (relay) — 2026-06-07

Kevin chose **Approach B** as the build target: it uses only Google's documented
server-side Drive APIs (no dependence on undocumented browser-CORS behavior) and
needs no test-deploy spike. The gating spike is skipped. Approach A below is
retained as a possible future optimization but is **not** being built now.

## Approach A (deferred): direct browser → Drive

Bytes go straight from device to Google; nothing transits Vercel.

- Pro: fastest; zero Vercel bandwidth/function cost for bytes; scales.
- Con: cross-origin feasibility of a service-account-minted session URI must be
  proven. Codex notes Google maintains an official browser resumable-upload
  sample and that the credential type is not the CORS determinant, so this is
  feasible in principle but not promised by current docs.

### Spike (plan step 1 — gating, must pass before building A)

From a **deployed preview URL** (not just localhost — browsers special-case
localhost), with the session minted forwarding that exact `Origin`, verify the
**whole** handshake against Google's production endpoint:
preflight (`OPTIONS`) → first chunk → `308 Resume Incomplete` with an exposed
`Range` header → a status-query (`bytes */size`) → final `200/201` with the file
resource — using a real 10MB+ file. All steps must pass cross-origin. Any failing
step → Approach B.

## Approach B (fallback): chunked proxy through Vercel

If the spike fails: the server mints the session (as above) and keeps the session
URI **server-side as an opaque handle** (the client gets only a handle id, never
the URL — and the server never accepts an arbitrary URL back, which would be
SSRF). The browser sends the file to `POST /api/upload/chunk` in **raw-binary**
chunks sized with headroom under 4.5MB (account for any encoding overhead — do
not use multipart); the server relays each chunk to Google with the right
`Content-Range`. Magic bytes are checked server-side on the first chunk before
accepting the rest. Pro: certain to work, full server control. Con: doubles
bandwidth and spends Vercel function time on big files (within limits for ≤25MB).

## Validation & security

- **Exact-origin allowlist.** The current `origin.includes(host)` check is
  exploitable (`itsrellestate.com.evil.example` passes) — a pre-existing bug.
  Replace with an explicit allowlist (prod + known preview hosts) on the new
  endpoints **and** the existing apply/upload routes.
- **Application-bound minting.** A session is minted only for a known
  application + an expected slot, under per-application file-count and total-byte
  quotas. "Folder is under a root" alone is insufficient.
- **Ledger-bound verify.** Verify operates on `(applicationId, nonce)` from the
  ledger, never a raw client-supplied fileId — closing the "verify/disclose/
  delete any file under root" hole. It also re-checks the Drive file's real
  size/MIME/parent/name/non-trashed before trusting it.
- **Quarantine.** Unverified bytes land in a quarantine folder, not the
  staff-reviewed occupant folders; they move only after passing verify. A
  stale-upload sweep cleans quarantine rows abandoned past a TTL.
- **Session URI is a secret capability.** Never logged, never sent to Sentry,
  never persisted in analytics; redacted from any error path.
- **Magic-byte honesty.** The check (incl. DOCX = any ZIP header) catches
  mislabeling, not malware/polyglots. Documented as such; not described as
  establishing the "real type."
- New endpoints added to the `middleware.ts` matcher (limiter already fail-open).

## Billing reorder (tenant only)

- Move the invoice logic out of `POST /api/apply/tenant` into a server-internal
  step triggered by the ledger completing (invoked from the verify handler, or a
  small `POST /api/apply/tenant/finalize` that the server gates on the ledger and
  ignores the client's word on completeness).
- **Concurrency-safe idempotency** (the existing `invoiceCreated` Drive property
  is a racy read-then-write): pass a **deterministic Stripe idempotency key**
  derived from the applicationId to the Stripe `invoices.create` /
  `invoiceItems.create` calls, **and** guard with a Neon conditional update /
  uniqueness anchor so concurrent verifies create exactly one invoice.
- Reuse `createApplicationInvoice` with the 90-day `pickReusableInvoice` dedup
  already on `feat/invoice-rules` (commit `b711e71`, unit-tested 8/8).
- Notification email stays at step 1 (Nyrell should know an application started
  even if the upload is later abandoned); the files themselves only appear in her
  review folders after verification (quarantine).

## Client changes

- `src/lib/upload-file.ts`: replace the single POST with mint-session → chunked
  `PUT` (progress callback + per-chunk retry/resume, handling `308/404/410/5xx/429`)
  → verify. Add `onProgress(fraction)` per file. Track per-file status so retry
  re-sends only un-verified files (no duplicate Drive files; true completeness).
- `src/app/apply/{tenant,landlord}/*-form.tsx`: drive per-file progress + status;
  no client-trusted finalize — the client uploads/verifies and then asks the
  server whether the application is complete.
- `src/components/forms/file-upload.tsx`: over-size rejection is prominent
  (`role="alert"`), naming file + size.
- Progress UI: per-file bar fed by `onProgress`, surfaced via `FormWizard`.

## Error messaging (kills silent failure)

- Over 25MB: rejected at selection, `role="alert"`, names file + size; never
  staged.
- Wrong type: client pre-check (read first bytes) for instant feedback; server
  verify deletes + surfaces if it slips through.
- Network/transient: chunk retry with backoff; if exhausted, name the file and
  say to check the connection and tap Retry.
- Retry re-sends only unverified files.

## Edge cases

- Retry duplicates: avoided via pre-generated ids + per-slot ledger status.
- Abandoned partial upload: quarantine row swept after TTL; no invoice (safe).
- Session expiry / `410`: client re-mints; ledger row reused.
- Multiple adult occupants → multiple destination subfolders: unchanged.
- Re-submit: existing `idempotencyKey` + `getOrCreateApplicantFolder` already
  dedupe; not a duplicate-application risk (Kimi's claim here was incorrect).

## Testing ("and test")

- **Spike (gating):** the full cross-origin handshake above with a real 10MB+
  file from a preview URL.
- **Unit (`npx tsx tests/*.unit.mts`):** session-mint validation + quotas;
  ledger-bound verify (good accepted+moved, bad deleted, forged nonce rejected);
  required-manifest completeness gate; invoice idempotency under concurrent
  verify; existing invoice-dedup 8/8; exact-origin allowlist.
- **E2E (Playwright):** full tenant submit with a >4.5MB file → file lands in the
  correct occupant folder, and the invoice exists **only after** all required
  docs verify (and not before).
- **Manual:** 375px mobile — progress bar, each error state, retry-only-failed,
  and a real >4.5MB end-to-end on a prod-like deploy (the case never tested).

## Rollout

- Isolated worktree on `feat/direct-drive-upload`, carrying the
  `feat/invoice-rules` dedup. Neon migration for the ledger table. No new secrets.
- Add new routes to the middleware matcher; **recalculate rate limits** — one
  legitimate multi-file application now makes N mint + N verify (+ N×chunks for B)
  calls and would blow the current 20/min upload cap.
- **CSP:** add the Google upload endpoint to `connect-src` so the browser may PUT
  (Approach A). Locate and update the existing CSP.
- Deploy only after the large-file proof passes on a preview deploy.

## Risks

- CORS on the direct path — mitigated by the gating spike + Approach B.
- Vercel function time on Approach B chunks — within limits for ≤25MB.
- Added complexity (ledger, quarantine) — justified by the billing guarantee and
  the verify-authorization fix; kept in one Neon table + one move call.

## Review changes applied (from Codex + Kimi)

1. Billing made **server-authoritative** via the ledger + computed manifest (was
   client-driven — the original design did not actually guarantee "100%").
2. **Verify bound to a ledger nonce**, not an arbitrary fileId (was: verify/
   delete any file under root).
3. **Quarantine-then-move** so unverified files are never staff-visible.
4. **Invoice idempotency** made concurrency-safe (Stripe deterministic key + Neon
   guard) instead of a racy Drive-property flag.
5. **Exact-origin allowlist** replacing the exploitable `origin.includes(host)`
   (also fixes the existing routes).
6. **Spike hardened** to the full cross-origin handshake on a real preview origin
   with Origin forwarding (was: a vague "1-hour proof").
7. Session URI treated as a **secret**; pre-generated file ids; stale-upload
   sweep; Drive resumable error handling (`308/404/410/5xx/429`); CSP
   `connect-src`; rate-limit recalculation.
8. Magic-byte limits stated honestly; malware scanning explicitly out of scope.
