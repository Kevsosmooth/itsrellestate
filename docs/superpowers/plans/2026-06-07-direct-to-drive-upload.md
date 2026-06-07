# Direct-to-Drive Upload + Bill-After-Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let applicants upload documents up to 25MB reliably by sending bytes straight to Google Drive (bypassing Vercel's ~4.5MB body limit), with no silent failures, and create the tenant invoice only after the server confirms every required document is verified.

**Architecture:** A Neon "upload ledger" is the source of truth. At submit, the server writes the required-document manifest. Each file gets a server-minted Google Drive resumable upload session into a quarantine folder; the browser streams bytes directly to Google (Approach A) or, if the gating spike fails, relays them through a chunk-proxy endpoint (Approach B). A verify step re-checks the file, moves it out of quarantine, and marks the ledger slot done. When every required slot is verified, the server (not the browser) creates the Stripe invoice idempotently.

**Tech Stack:** Next.js App Router (TypeScript strict), Google Drive API via `googleapis` (service account + domain-wide delegation), Neon Postgres (`getSql()` tagged templates), Stripe, Upstash rate-limit middleware. Unit tests run via `npx tsx tests/*.unit.mts`; e2e via Playwright.

**External APIs to confirm against current docs during implementation (use Context7):** `googleapis` Drive resumable upload + `files.generateIds` + partial download (`Range` on `alt=media`) + `files.update` reparenting; `stripe` request-level `idempotencyKey`; `@neondatabase/serverless` usage (mirror existing `src/lib/applications-neon.ts`).

---

## File structure

**Create:**
- `src/lib/required-docs.ts` — pure: form data → required document slots (shared by client + server).
- `src/lib/uploads-ledger.ts` — Neon ledger: manifest + per-upload state machine + completeness query.
- `src/lib/origin-allowlist.ts` — pure: exact-origin allowlist check.
- `src/lib/magic-bytes.ts` — pure: extracted magic-byte verification (from `api/upload/route.ts`).
- `src/lib/drive-uploads.ts` — Drive helpers: generate id, mint resumable session, read head, move file.
- `src/app/api/upload/session/route.ts` — mint endpoint.
- `src/app/api/upload/verify/route.ts` — verify + move + trigger billing gate.
- `src/app/api/upload/chunk/route.ts` — Approach B only: chunk proxy.
- `src/lib/billing-gate.ts` — server-authoritative invoice creation gated on the ledger.
- `scripts/2026-06-07-create-application-uploads.mjs` — Neon migration runner.
- `tests/required-docs.unit.mts`, `tests/uploads-ledger.unit.mts`, `tests/origin-allowlist.unit.mts`, `tests/magic-bytes.unit.mts`, `tests/upload-session.unit.mts`, `tests/upload-verify.unit.mts`, `tests/billing-gate.unit.mts`.
- `docs/spikes/2026-06-07-drive-cors-spike.md` + `scripts/spike/` throwaway spike assets.

**Modify:**
- `src/lib/google.ts` — re-export / use new Drive helpers (keep `getDrive`/`getAuth`).
- `src/lib/stripe.ts` — accept a deterministic `idempotencyKey` in `createApplicationInvoice`.
- `src/app/api/apply/tenant/route.ts` — remove the inline invoice block (L216–246); write the manifest to the ledger.
- `src/app/api/apply/landlord/route.ts` — write the manifest (no invoice).
- `src/lib/upload-file.ts` — rewrite: mint → transport (A/B) → verify, with progress + retry-only-failed.
- `src/app/apply/tenant/tenant-form.tsx`, `src/app/apply/landlord/landlord-form.tsx` — per-file progress/status; no client-trusted finalize.
- `src/components/forms/file-upload.tsx` — over-size `role="alert"`; per-file progress bar.
- `src/middleware.ts` — add new routes to matcher; recalc rate limits.
- next.config / headers source — CSP `connect-src` for the Google upload endpoint (Approach A).

---

## DECISION (Kevin, 2026-06-07): build Approach B (relay through our server)

We are NOT building the direct-to-Google path and NOT running the spike. Approach-B overrides to the tasks below:
- **Task 0 (spike): SKIP entirely** — retained below only for history; do not execute.
- **Task 4 (migration):** includes a `session_uri` column — the server keeps the resumable upload URL; it is NEVER sent to the browser.
- **Task 7 (session endpoint):** return only `{ nonce }` to the client; store the minted `session_uri` on the ledger row. Never expose the URL.
- **Phase 3:** do **Task 12B (chunk-proxy)** only; skip Task 12A.
- **Task 16:** SKIP the CSP `connect-src` step — the browser only talks to our own same-origin `/api/upload/chunk`.

**INTEGRATION NOTE (from Task 1):** the client form uses `__primary__` as the primary-applicant person key; the shared module + server manifest use `"primary"`. Occupant slots use the occupant's trimmed name on both sides. In Tasks 7 + 14 the client MUST normalize `__primary__` -> `"primary"` when sending a `slot` so client uploads match the server-computed manifest.

## Execution progress (durable tracker)

- **Task 1 — DONE (commit `7df47c6`)** — required-docs shared module; port verified faithful vs original client rule; `tsc` 0 errors; unit test passes via `npx tsx`.
- **Task 2 — DONE (commit `6fef539`)** — exact-origin allowlist; replaced exploitable substring check in upload/tenant/landlord routes with `isAllowedOrigin` (guard: block only when origin present and not allowed); `host` removed; tsc 0; test passes. (Had to amend out an unnecessary root `package.json` `type:module` the subagent added.)
- **Task 3 — DONE (commit `57148d8`)** — magic-bytes extracted to `src/lib/magic-bytes.ts` (`matchesMagic`, `ALLOWED_TYPES`) with honest limitation doc; route imports it; tsc 0; magic-bytes + upload-retry tests pass.
- **Task 4 — DONE (commit `de35a2e`)** — `getSql` exported from applications-neon; migration script `scripts/2026-06-07-create-application-uploads.ts` (NOT yet run against the shared DB — controller will run it before integration testing).
- **Task 5 — DONE (commit `d815fa2`)** — `src/lib/uploads-ledger.ts`: `requiredSlotsSatisfied` (pure, unit-tested) + parameterized DB wrappers (`recordMint`, `getByNonce`, `markStatus`, `listVerifiedSlots`, `countForApplication`); tsc 0; test passes.
- **Task 6 — DONE (commit `10fee59`)** — `src/lib/drive-uploads.ts` (generateDriveId, mintResumableSession [raw fetch, Origin-forwarding, returns secret session URL], readFileHead via Range, getFileMeta, moveFile reparent, deleteFile, getOrCreateQuarantineFolder); `getAuth` exported; Drive APIs Context7-verified; test passes.
- **Task 7a — DONE (commit `613a021`)** — shared `upload-limits.ts` (MAX_FILE_SIZE/quotas/sanitizeFilename, route DRY-updated); `getApplicationFolderId` (Neon, by application_payloads.drive_folder_id); `findChildFolder` exported; `PER_PERSON_DOC_CATEGORIES` exported + `safeOccupantFolderName`; tests pass.
- **Task 7b — DONE (commit `7e32874`)** — `POST /api/upload/session`: origin allowlist + `validateSessionInput` (mime/size/shape) + server-side folder resolution from applicationId + quota + mint into quarantine + `recordMint`; returns ONLY `{nonce}`, never logs the session URL; validator test 7/7.
- DEP: apply route must return `applicationId`; client must send `applicationId`+`formType`+`slot`+`fileName`+`mimeType`+`size` to /session (Tasks 11/14). Execution reorder: doing 9 (stripe idem) -> 10 (billing gate) -> 8 (verify, which calls the gate).
- **Task 9 — DONE (commit `6431450`)** — `invoiceIdempotencyKeys` (pure, tested) + `createApplicationInvoice` accepts `idempotencyKey`, passed to `invoices.create`/`invoiceItems.create`; dedup 8/8 still pass. (Done directly by controller — tiny change.)
- **Task 10 — DONE (commit `cf2866c`)** — `src/lib/billing-gate.ts`: pure `shouldBill` (tested) + `maybeCreateInvoice` (tenant-only; computes required vs verified slots; `application_invoice_locks` ON-CONFLICT lock + Stripe idempotency key; records to Sheet+Neon+folder; releases lock on failure). `getApplicationRecord` getter added (maps `applicant_email`/`payload_jsonb`/`drive_folder_id`/`sheet_row_number`).
- **Task 8 — DONE (commit `2a556b5`)** — `POST /api/upload/verify`: pure `verifyDecision` (parent/trashed/size/magic checks, 6 assertions) + handler (reject -> delete + mark failed + 422; move -> reparent + mark verified + `maybeCreateInvoice`). Returns `{link}`.
- SERVER-SIDE PIPELINE COMPLETE (mint -> upload -> verify -> move -> server-authoritative billing).
- **Task 11 — DONE (commit `38999e5`)** — apply routes: tenant invoice block removed + unused imports; both routes return `applicationId`; tsc 0; sanity tests pass.
- **Task 12 — DONE (commit `d3765da`)** — `POST /api/upload/chunk` relay: validate headers (`validateChunkHeaders` tested) + relay chunk to `session_uri` (never returned/logged); 200/201->mark uploaded, 308->{done:false,range}, else 502.
- **Task 13 — DONE (commit `29383f1`)** — client `uploadOne` (mint->chunk->verify) + `chunkRanges`/`friendlyUploadError` (pure, tested) + mocked-fetch happy-path test; old `uploadFileWithRetry` kept temporarily.
- **Task 14 — DONE (commit `200ca33`)** — both forms rewired: capture+persist `applicationId`, per-file `uploadOne` with normalized slot (`__primary__`->`primary`), per-file status (retry skips verified), no client billing; removed `uploadFileWithRetry` + its test; dev server compiled both apply pages (200, 0 errors). + cleanup commit removing dead `setPendingUploadsFolderId`.
- Remaining: 15 (progress bar + role=alert), 16 (middleware matcher + rate limits; SKIP CSP per Approach B), 17 (stale sweep), 18 (run migration on shared Neon + build + e2e + REAL large-file test on a preview — needs Kevin go + deploy).
- Task 14 concerns (minor, for final review): landlord slot category literal `"documents"`; progress string includes `%`.
- **Runner FIXED (commit `8d19b2b`)** — `tsx` pinned as a local devDep (`^4.22.4`). **RUNNER = `pnpm exec tsx tests/<f>.unit.mts`** (add `--env-file=.env.local` only for tests importing env-touching modules). Do NOT use `npx tsx` (flaky) — the GLOBAL tsx 4.21.0 is broken for `.mts`->named-`.ts` imports. NEVER add `type:module` or create/modify package.json to make a test run; if a test won't run it's a runner issue to escalate to the controller.

## DESIGN REVISION (during execution, 2026-06-07) — supersedes the "manifest" model in Tasks 4/5/7/8/10/11

Doc categories can hold MULTIPLE files (`config.maxFiles`), so the original "one row per required slot + manifest written at app-POST" model is wrong. Revised model:

- **`application_uploads` = one row per uploaded FILE**, keyed by a unique `nonce`. No `required` column, no separate manifest table, no manifest write at app-POST.
- **Required documents are computed at check-time** from the stored form payload via `requiredDocSlots(formType, data)`. An application is **complete** when every required `(category, person)` slot has at least one `verified` upload row.
- **Task 11 (apply routes):** do NOT write a manifest — just remove the tenant inline invoice block (form payload is already persisted to Neon `application_payloads` + Drive). 
- **Task 10 (billing gate):** load the form payload from Neon, compute `requiredDocSlots`, compare against the application's `verified` upload rows; if all satisfied → take the invoice lock → create invoice.
- **Task 5 pure function** becomes `requiredSlotsSatisfied(requiredSlots, verifiedSlots)` (every required slot has a matching verified upload), replacing `allRequiredVerified(rows)`.
- **Export `getSql`** from `src/lib/applications-neon.ts` (currently an unexported `function getSql()`), so the ledger + billing modules reuse the same Neon client.
- Person key normalization still applies (client `__primary__` -> `"primary"`).

## PHASE 0 (HISTORICAL — DO NOT EXECUTE) — Spike

### Task 0: Prove direct browser→Drive cross-origin resumable upload

**Files:**
- Create: `scripts/spike/mint.mjs` (throwaway minimal mint), `scripts/spike/index.html` (throwaway test page), `docs/spikes/2026-06-07-drive-cors-spike.md` (record results).

- [ ] **Step 1: Minimal mint endpoint (throwaway).** A tiny Node script (or a temporary `src/app/api/spike-mint/route.ts`) that, given `{name,size,mimeType}`, mints a Drive resumable session into a throwaway test folder and returns the `Location` URI. Use the service-account token and **forward the caller's `Origin` header**:

```js
// scripts/spike/mint.mjs (run as a temporary Next route or standalone with the SA creds)
import { google } from "googleapis";
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/drive"],
  subject: process.env.GOOGLE_IMPERSONATE_EMAIL,
});
const { token } = await auth.getAccessToken();
const res = await fetch(
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
  { method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mimeType,
      "X-Upload-Content-Length": String(size),
      Origin: callerOrigin,            // the allowlisted preview origin
    },
    body: JSON.stringify({ name, parents: [process.env.SPIKE_FOLDER_ID] }),
  });
console.log("location:", res.headers.get("location"));
```

- [ ] **Step 2: Test page (throwaway).** `index.html` served from the preview deploy that: requests a session URI from the mint endpoint, then performs the resumable PUT of a real 10MB+ file IN CHUNKS, logging each protocol step. Verify cross-origin: preflight `OPTIONS`, `308 Resume Incomplete` + readable `Range` response header, a status query (`Content-Range: bytes */<size>`), and the final `200/201` with the file resource.

- [ ] **Step 3: Deploy to a preview and run from a real browser** (and a phone). Localhost is NOT a valid result — browsers special-case it. Record, per step, whether the browser was allowed (no CORS error) and whether `Range` was exposed.

- [ ] **Step 4: Decide and record.** Write the outcome to `docs/spikes/2026-06-07-drive-cors-spike.md`:
  - All steps pass cross-origin → **Approach A**. Note exact headers Google required/returned.
  - Any step blocked by CORS → **Approach B**. Note which step failed.

- [ ] **Step 5: Remove throwaway assets** (`scripts/spike/*`, any temp route, the spike test folder's files). Keep only the markdown record. Commit:

```bash
git add docs/spikes/2026-06-07-drive-cors-spike.md
git commit -m "docs(spike): record drive cross-origin upload feasibility"
```

> **STOP / decision gate.** The chosen approach (A or B) selects Task 11A or 11B and whether the CSP change (Task 16) is needed. Everything in Phases 1–2 and Tasks 12–15 is identical either way.

---

## PHASE 1 — Shared foundation

### Task 1: Required-docs shared module — DONE (7df47c6)

**Files:**
- Create: `src/lib/required-docs.ts`
- Test: `tests/required-docs.unit.mts`
- Reference: the existing client logic in `tenant-form.tsx` (`getRequiredDocCategories`, `PER_PERSON_DOC_CATEGORIES`, `getAdultOccupants`) and `landlord-form.tsx`.

A document slot is `{ category: string; person: string }` where `person` is `"primary"` or an occupant key. The server uses this to know what "100%" means; it must be computed from validated form data, never trusted from the client.

- [ ] **Step 1: Write the failing test**

```ts
// tests/required-docs.unit.mts
import { strict as assert } from "node:assert";
import { requiredDocSlots } from "../src/lib/required-docs.ts";

// Voucher tenant, no extra adult occupants → primary-only required set.
const slots = requiredDocSlots("tenant", {
  hasAssistance: "yes", paymentPath: "voucher",
  occupants: [{ name: "Kid", relationship: "child", over18: "no" }],
} as any);
assert.ok(slots.length > 0, "expected required slots");
assert.ok(slots.every((s) => s.person === "primary"), "no adult occupants → all primary");

// Adult occupant → per-person categories duplicated for that occupant.
const slots2 = requiredDocSlots("tenant", {
  hasAssistance: "yes", paymentPath: "voucher",
  occupants: [{ name: "Jane Doe", relationship: "spouse", over18: "yes" }],
} as any);
assert.ok(slots2.some((s) => s.person !== "primary"), "adult occupant → a per-person slot");

console.log("required-docs ok");
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx tsx tests/required-docs.unit.mts`
Expected: FAIL (module/function not found).

- [ ] **Step 3: Implement `requiredDocSlots`** by lifting the existing client rule into a pure function. Port `getRequiredDocCategories` + per-person expansion verbatim from `tenant-form.tsx`/`landlord-form.tsx` (do not invent new rules — preserve current behavior). Shape:

```ts
// src/lib/required-docs.ts
export interface DocSlot { category: string; person: string }
export function requiredDocSlots(
  formType: "tenant" | "landlord",
  data: Record<string, unknown>,
): DocSlot[] { /* ported rule; PER_PERSON categories expanded per adult occupant */ }
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx tsx tests/required-docs.unit.mts` → Expected: PASS (`required-docs ok`).

- [ ] **Step 5: Refactor the client to import this module** so client and server share one rule (replace the inline `getRequiredDocCategories` usage in both forms with `requiredDocSlots`). Run `pnpm tsc --noEmit` → Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/required-docs.ts tests/required-docs.unit.mts src/app/apply/tenant/tenant-form.tsx src/app/apply/landlord/landlord-form.tsx
git commit -m "refactor(uploads): extract shared required-docs rule"
```

### Task 2: Origin allowlist

**Files:**
- Create: `src/lib/origin-allowlist.ts`
- Test: `tests/origin-allowlist.unit.mts`

- [ ] **Step 1: Failing test**

```ts
// tests/origin-allowlist.unit.mts
import { strict as assert } from "node:assert";
import { isAllowedOrigin } from "../src/lib/origin-allowlist.ts";
const allow = ["https://itsrellestate.com", "https://www.itsrellestate.com"];
assert.equal(isAllowedOrigin("https://itsrellestate.com", allow), true);
assert.equal(isAllowedOrigin("https://itsrellestate.com.evil.example", allow), false); // the bug today
assert.equal(isAllowedOrigin("https://x.vercel.app", allow, /^https:\/\/[a-z0-9-]+\.vercel\.app$/), true);
assert.equal(isAllowedOrigin(null, allow), false);
console.log("origin-allowlist ok");
```

- [ ] **Step 2: Run, verify fail.** `npx tsx tests/origin-allowlist.unit.mts` → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/origin-allowlist.ts
export function isAllowedOrigin(
  origin: string | null,
  allow: string[],
  previewPattern?: RegExp,
): boolean {
  if (!origin) return false;
  if (allow.includes(origin)) return true;
  return previewPattern ? previewPattern.test(origin) : false;
}
export function allowedOrigins(): string[] {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return [site, "https://itsrellestate.com", "https://www.itsrellestate.com"]
    .filter((v): v is string => !!v);
}
export const VERCEL_PREVIEW = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
```

- [ ] **Step 4: Run, verify pass.** → PASS.

- [ ] **Step 5: Replace the unsafe check in existing routes.** In `src/app/api/upload/route.ts`, `src/app/api/apply/tenant/route.ts`, `src/app/api/apply/landlord/route.ts`, replace `if (origin && host && !origin.includes(host))` with an exact-allowlist check using `isAllowedOrigin(origin, allowedOrigins(), VERCEL_PREVIEW)`. `pnpm tsc --noEmit` → 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/origin-allowlist.ts tests/origin-allowlist.unit.mts src/app/api/upload/route.ts src/app/api/apply/tenant/route.ts src/app/api/apply/landlord/route.ts
git commit -m "fix(security): exact-origin allowlist (was substring match)"
```

### Task 3: Magic-bytes module

**Files:**
- Create: `src/lib/magic-bytes.ts`
- Test: `tests/magic-bytes.unit.mts`

- [ ] **Step 1: Failing test**

```ts
// tests/magic-bytes.unit.mts
import { strict as assert } from "node:assert";
import { matchesMagic, ALLOWED_TYPES } from "../src/lib/magic-bytes.ts";
assert.equal(matchesMagic(Buffer.from([0x25,0x50,0x44,0x46]), "application/pdf"), true);
assert.equal(matchesMagic(Buffer.from([0x00,0x01]), "application/pdf"), false);
assert.equal(ALLOWED_TYPES.has("image/png"), true);
console.log("magic-bytes ok");
```

- [ ] **Step 2: Run, verify fail.** → FAIL.

- [ ] **Step 3: Implement** by lifting `MAGIC_BYTES`, `ALLOWED_TYPES`, and `verifyMagicBytes` (rename `matchesMagic`) out of `src/app/api/upload/route.ts` into `src/lib/magic-bytes.ts`; export both. Add a one-line doc comment that this catches mislabeling, NOT malware/polyglots, and that DOCX matches any ZIP header.

- [ ] **Step 4: Run, verify pass.** → PASS.

- [ ] **Step 5: Re-import in `api/upload/route.ts`** from the new module (delete the inlined copies). `pnpm tsc --noEmit` → 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/magic-bytes.ts tests/magic-bytes.unit.mts src/app/api/upload/route.ts
git commit -m "refactor(uploads): extract magic-byte check to shared module"
```

### Task 4: Neon ledger table + migration

**Files:**
- Create: `scripts/2026-06-07-create-application-uploads.mjs`
- Reference: `src/lib/applications-neon.ts` for the Neon client init pattern (`getSql()`).

- [ ] **Step 1: Write the migration SQL runner.** Mirror the Neon client usage in `applications-neon.ts`.

```js
// scripts/2026-06-07-create-application-uploads.mjs
import { getSql } from "../src/lib/applications-neon.ts"; // or replicate its client init
const sql = getSql();
await sql`
  CREATE TABLE IF NOT EXISTS application_uploads (
    id              bigserial PRIMARY KEY,
    application_id  text NOT NULL,
    form_type       text NOT NULL,
    category        text NOT NULL,
    person          text NOT NULL,
    required        boolean NOT NULL DEFAULT false,
    nonce           text UNIQUE,
    drive_file_id   text,
    session_uri     text,
    quarantine_parent text,
    destination_folder text,
    expected_name   text,
    expected_mime   text,
    expected_size   bigint,
    status          text NOT NULL DEFAULT 'pending',  -- pending|minted|uploaded|verified|failed
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
  )`;
await sql`CREATE INDEX IF NOT EXISTS idx_app_uploads_app ON application_uploads(application_id)`;
await sql`
  CREATE TABLE IF NOT EXISTS application_invoice_locks (
    application_id text PRIMARY KEY,
    created_at     timestamptz NOT NULL DEFAULT now()
  )`;
console.log("migration ok");
```

- [ ] **Step 2: Run against the DEV branch first.** Run: `npx tsx scripts/2026-06-07-create-application-uploads.mjs` → Expected: `migration ok`. (Neon DB is shared dev/prod — verify the table exists once; do not run destructive statements.)

- [ ] **Step 3: Commit**

```bash
git add scripts/2026-06-07-create-application-uploads.mjs
git commit -m "chore(db): migration for application_uploads ledger"
```

### Task 5: Ledger module (`uploads-ledger.ts`)

**Files:**
- Create: `src/lib/uploads-ledger.ts`
- Test: `tests/uploads-ledger.unit.mts`

The pure decision logic (is the application complete?) is unit-tested in isolation; the DB calls are thin wrappers around `getSql()`.

- [ ] **Step 1: Failing test for the pure completeness function**

```ts
// tests/uploads-ledger.unit.mts
import { strict as assert } from "node:assert";
import { allRequiredVerified } from "../src/lib/uploads-ledger.ts";
const rows = [
  { category: "id", person: "primary", required: true, status: "verified" },
  { category: "income", person: "primary", required: true, status: "uploaded" },
];
assert.equal(allRequiredVerified(rows as any), false, "one required slot not verified");
rows[1].status = "verified";
assert.equal(allRequiredVerified(rows as any), true, "all required verified");
// Optional (non-required) unverified rows do not block completion.
assert.equal(allRequiredVerified([...rows, { category:"extra", person:"primary", required:false, status:"minted" }] as any), true);
console.log("uploads-ledger ok");
```

- [ ] **Step 2: Run, verify fail.** → FAIL.

- [ ] **Step 3: Implement.** Pure `allRequiredVerified(rows)` plus DB wrappers:

```ts
// src/lib/uploads-ledger.ts
import { getSql } from "./applications-neon";
export interface UploadRow { category: string; person: string; required: boolean; status: string; nonce?: string; drive_file_id?: string; destination_folder?: string; expected_mime?: string; }
export function allRequiredVerified(rows: Pick<UploadRow,"required"|"status">[]): boolean {
  const req = rows.filter((r) => r.required);
  return req.length > 0 && req.every((r) => r.status === "verified");
}
export async function writeManifest(applicationId: string, formType: "tenant"|"landlord", slots: {category:string;person:string}[]): Promise<void> { /* INSERT one required row per slot; ON CONFLICT no-op on (application_id,category,person) */ }
export async function recordMint(args: { applicationId:string; category:string; person:string; nonce:string; driveFileId:string; quarantineParent:string; destinationFolder:string; expectedName:string; expectedMime:string; expectedSize:number }): Promise<void> { /* upsert the matching slot row → status 'minted' */ }
export async function getByNonce(applicationId: string, nonce: string): Promise<UploadRow | null> { /* SELECT ... */ }
export async function markStatus(nonce: string, status: "uploaded"|"verified"|"failed"): Promise<void> { /* UPDATE ... */ }
export async function listForApplication(applicationId: string): Promise<UploadRow[]> { /* SELECT ... */ }
export async function countForApplication(applicationId: string): Promise<{ files: number; bytes: number }> { /* SUM for quota enforcement */ }
```

- [ ] **Step 4: Run, verify pass.** → PASS (`uploads-ledger ok`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/uploads-ledger.ts tests/uploads-ledger.unit.mts
git commit -m "feat(uploads): neon upload ledger module"
```

### Task 6: Drive upload helpers (`drive-uploads.ts`)

**Files:**
- Create: `src/lib/drive-uploads.ts`
- Test: `tests/drive-uploads.unit.mts` (mock `fetch` + the drive client)
- Reference: `src/lib/google.ts` (`getAuth`, `getDrive`).

- [ ] **Step 1: Failing test** that asserts `mintResumableSession` POSTs to the resumable endpoint with the forwarded Origin + content-length header and returns the `Location` URI. Mock `getAuth().getAccessToken` and `globalThis.fetch`:

```ts
// tests/drive-uploads.unit.mts
import { strict as assert } from "node:assert";
import { mintResumableSession } from "../src/lib/drive-uploads.ts";
let captured: any;
(globalThis as any).fetch = async (url: string, init: any) => {
  captured = { url, init };
  return { ok: true, headers: new Map([["location","https://up.example/sess"]]) } as any;
};
// (inject a fake auth via the module's seam — see implementation note)
const uri = await mintResumableSession({ name:"a.pdf", parents:["F"], fileId:"ID", mimeType:"application/pdf", size:123, origin:"https://itsrellestate.com" }, { token:"T" });
assert.equal(uri, "https://up.example/sess");
assert.match(captured.url, /uploadType=resumable/);
assert.equal(captured.init.headers["X-Upload-Content-Length"], "123");
assert.equal(captured.init.headers["Origin"], "https://itsrellestate.com");
console.log("drive-uploads ok");
```

- [ ] **Step 2: Run, verify fail.** → FAIL.

- [ ] **Step 3: Implement.** Take an injectable `{ token }` (default: `await getAuth().getAccessToken()`) so the unit test can pass a fake. **Confirm against Context7 `googleapis` docs:** custom `id` in the create body requires it to come from `files.generateIds`; `Range` partial download on `alt=media`; reparent via `files.update({addParents,removeParents})`.

```ts
// src/lib/drive-uploads.ts
import { getAuth, getDrive } from "./google";
export async function generateDriveId(): Promise<string> {
  const drive = getDrive();
  const res = await drive.files.generateIds({ count: 1, type: "files" });
  const id = res.data.ids?.[0];
  if (!id) throw new Error("generateIds returned none");
  return id;
}
export async function mintResumableSession(
  f: { name: string; parents: string[]; fileId: string; mimeType: string; size: number; origin: string },
  auth?: { token: string },
): Promise<string> {
  const token = auth?.token ?? (await getAuth().getAccessToken()).token!;
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
    { method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": f.mimeType,
        "X-Upload-Content-Length": String(f.size),
        Origin: f.origin,
      },
      body: JSON.stringify({ id: f.fileId, name: f.name, parents: f.parents }),
    });
  if (!res.ok) throw new Error(`mint failed ${res.status}`);
  const loc = res.headers.get("location");
  if (!loc) throw new Error("no resumable Location header");
  return loc; // SECRET — never log this
}
export async function readFileHead(fileId: string, n = 8): Promise<Buffer> {
  const drive = getDrive();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer", headers: { Range: `bytes=0-${n - 1}` } },
  );
  return Buffer.from(res.data as ArrayBuffer);
}
export async function getFileMeta(fileId: string) {
  const drive = getDrive();
  const res = await drive.files.get({ fileId, fields: "id,name,size,mimeType,parents,trashed" });
  return res.data;
}
export async function moveFile(fileId: string, fromParent: string, toParent: string): Promise<string> {
  const drive = getDrive();
  const res = await drive.files.update({ fileId, addParents: toParent, removeParents: fromParent, fields: "id,webViewLink" });
  return res.data.webViewLink ?? "";
}
export async function deleteFile(fileId: string): Promise<void> {
  await getDrive().files.delete({ fileId });
}
export async function getOrCreateQuarantineFolder(applicationFolderId: string): Promise<string> {
  // findChildFolder(applicationFolderId, "_pending") or create it; reuse helpers from google.ts
}
```

- [ ] **Step 4: Run, verify pass.** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/drive-uploads.ts tests/drive-uploads.unit.mts
git commit -m "feat(uploads): drive resumable + quarantine helpers"
```

### Task 7: `POST /api/upload/session` route

**Files:**
- Create: `src/app/api/upload/session/route.ts`
- Test: `tests/upload-session.unit.mts` (test the exported pure validator; mock drive/ledger for the handler)

- [ ] **Step 1: Failing test** for an exported `validateSessionRequest({ origin, mimeType, size, count, bytes })` returning `{ ok }` or `{ error, status }`: rejects bad origin (403), non-allowlisted MIME (415), size > 25MB (413), and per-application quota exceeded (429). Write assertions for each.

- [ ] **Step 2: Run, verify fail.** → FAIL.

- [ ] **Step 3: Implement** the route + the exported validator. Flow: allowlist origin → parse `{ applicationId, slot, fileName, mimeType, size }` → look up the application's ledger rows; require the `slot` to be an expected (server-computed) one → enforce quotas via `countForApplication` (e.g., max 40 files / 250MB per application) → `sanitizeFilename` → `generateDriveId()` → `getOrCreateQuarantineFolder` → `mintResumableSession({parents:[quarantine], fileId, ...origin})` → `recordMint(...)` → return `{ uploadUrl, nonce }`. **Do not log `uploadUrl`.** Resolve `destinationFolder` (the occupant subfolder) now and store it on the row.

- [ ] **Step 4: Run, verify pass.** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/upload/session/route.ts tests/upload-session.unit.mts
git commit -m "feat(uploads): mint resumable session endpoint"
```

### Task 8: `POST /api/upload/verify` route

**Files:**
- Create: `src/app/api/upload/verify/route.ts`
- Test: `tests/upload-verify.unit.mts`

- [ ] **Step 1: Failing test** for an exported `verifyDecision({ row, meta, head })`: returns `move` when parent==quarantine && size matches && `matchesMagic(head, row.expected_mime)`; returns `reject` (and should-delete) on magic mismatch; returns `reject` on unknown row (null) or trashed file or wrong parent.

- [ ] **Step 2: Run, verify fail.** → FAIL.

- [ ] **Step 3: Implement** the route + `verifyDecision`. Flow: allowlist origin → parse `{ applicationId, nonce }` → `getByNonce`; reject unknown (404) → `getFileMeta(row.drive_file_id)` → re-check parent==quarantine, non-trashed, name, actual size → `readFileHead` → `matchesMagic` → on pass: `moveFile(fileId, quarantine, destination)`, `markStatus(nonce,"verified")`, then **call the billing gate** `await maybeCreateInvoice(applicationId)` (Task 10), return `{ link }` → on fail: `deleteFile`, `markStatus(nonce,"failed")`, return 415 with a clear message.

- [ ] **Step 4: Run, verify pass.** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/upload/verify/route.ts tests/upload-verify.unit.mts
git commit -m "feat(uploads): verify + quarantine-move endpoint"
```

---

## PHASE 2 — Server-authoritative billing

### Task 9: Stripe idempotency key

**Files:**
- Modify: `src/lib/stripe.ts`
- Test: extend `tests/invoice-dedup.unit.mts` (existing 8/8) or add `tests/stripe-idempotency.unit.mts`

- [ ] **Step 1: Failing test** that `createApplicationInvoice` passes a deterministic `idempotencyKey` to the Stripe calls when given an `idempotencyKey` param (mock the `stripe` client, assert the second-arg options).

- [ ] **Step 2: Run, verify fail.** → FAIL.

- [ ] **Step 3: Implement.** Add optional `idempotencyKey?: string` to `ApplicationInvoiceParams`; pass `{ idempotencyKey: \`inv-${k}\` }` to `stripe.invoices.create(...)` and `{ idempotencyKey: \`item-${k}\` }` to `stripe.invoiceItems.create(...)`. Keep `pickReusableInvoice` dedup unchanged.

- [ ] **Step 4: Run, verify pass.** → PASS. Also run existing `npx tsx tests/invoice-dedup.unit.mts` → 8/8.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stripe.ts tests/stripe-idempotency.unit.mts
git commit -m "feat(stripe): deterministic idempotency key for invoice creation"
```

### Task 10: Billing gate (`billing-gate.ts`)

**Files:**
- Create: `src/lib/billing-gate.ts`
- Test: `tests/billing-gate.unit.mts`

- [ ] **Step 1: Failing test** for `shouldCreateInvoice(rows)` = `allRequiredVerified(rows) && no invoice yet`; and that `maybeCreateInvoice` is a no-op when not all verified (mock ledger + stripe + lock).

- [ ] **Step 2: Run, verify fail.** → FAIL.

- [ ] **Step 3: Implement.** `maybeCreateInvoice(applicationId)`:
  - `rows = listForApplication(applicationId)`; if `!allRequiredVerified(rows)` return.
  - **Concurrency lock:** `INSERT INTO application_invoice_locks(application_id) VALUES ($id) ON CONFLICT DO NOTHING RETURNING application_id`. If no row returned, another verify won the race → return.
  - Load applicant fields (email/first/last) from the application payload (Neon) — tenant only.
  - `createApplicationInvoice({ ...applicant, formType:"tenant", idempotencyKey: applicationId })`.
  - `appendStripeColumnsToRow` + `recordApplicationInvoice` + `patchFolderProperties({invoiceCreated:"1",invoiceId})` (reuse existing helpers).
  - Wrap Stripe in try/catch + `Sentry.captureException` (mirror current route behavior); on failure, release the lock so a later verify/retry can try again.

- [ ] **Step 4: Run, verify pass.** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing-gate.ts tests/billing-gate.unit.mts
git commit -m "feat(billing): server-authoritative invoice gate on upload ledger"
```

### Task 11: Reorder apply routes (write manifest, drop inline invoice)

**Files:**
- Modify: `src/app/api/apply/tenant/route.ts` (remove L216–246 invoice block), `src/app/api/apply/landlord/route.ts`

- [ ] **Step 1: Tenant route — write the manifest, remove the invoice block.** After the folder/sheet/neon/contact writes, add: `await writeManifest(applicationId, "tenant", requiredDocSlots("tenant", body))`. Delete the `if (!folderProps.invoiceCreated) { ... }` block entirely (billing now happens in the gate). Keep the notification email where it is.

- [ ] **Step 2: Landlord route — write the manifest** (`requiredDocSlots("landlord", body)`); landlord has no invoice, so no gate call needed.

- [ ] **Step 3: Type-check.** `pnpm tsc --noEmit` → 0 errors.

- [ ] **Step 4: Integration smoke (dev).** With dev creds, POST a minimal valid tenant body to `/api/apply/tenant` and confirm: folder created, ledger rows written (query Neon), and NO invoice created. Record the observed result.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/apply/tenant/route.ts src/app/api/apply/landlord/route.ts
git commit -m "refactor(apply): write upload manifest, move invoice to post-upload gate"
```

---

## PHASE 3 — Byte transport (do EXACTLY ONE, per the spike)

### Task 12A: Direct browser→Drive transport (if spike PASSED)

**Files:**
- Modify: `src/lib/upload-file.ts`

- [ ] **Step 1: Implement `putFileResumable(uploadUrl, file, onProgress)`** — chunked `PUT` (e.g., 8MB; confirm a good size from the spike) with `Content-Range`, handling `308` (continue from returned `Range`), `5xx/429` (backoff), `404/410` (throw `SessionGone` so the caller re-mints). Resolve on final `200/201` with the Drive file resource. Report `onProgress(bytesSent/total)`.

- [ ] **Step 2: Unit test** the range/header math and the `308`/`SessionGone` handling with a mocked `fetch`. Run `npx tsx tests/upload-file.unit.mts` → PASS.

- [ ] **Step 3: Commit** `git commit -m "feat(uploads): direct resumable PUT transport"`.

### Task 12B: Chunk-proxy transport (if spike FAILED)

**Files:**
- Create: `src/app/api/upload/chunk/route.ts`; Modify: `src/lib/upload-file.ts`, `src/lib/uploads-ledger.ts` (store the session URI server-side keyed by nonce — never returned to the client)

- [ ] **Step 1: Server keeps the session URI.** In Task 7, store the minted `uploadUrl` in the ledger row (server-only column `session_uri`), and return only `{ nonce }` (no URL) to the client.

- [ ] **Step 2: Implement `POST /api/upload/chunk`** — body: raw binary chunk; headers carry `{ applicationId, nonce, Content-Range }`. Validate origin + nonce; load `session_uri`; relay the chunk to Google with the same `Content-Range`; on the FIRST chunk, magic-byte check before relaying; return Google's `308`/final status. Never accept a client-supplied URL.

- [ ] **Step 3: Client `putFileChunked`** posts ≤4MB raw-binary chunks (with headroom) to `/api/upload/chunk`, reporting progress; same `SessionGone` re-mint behavior.

- [ ] **Step 4: Unit test** chunk sizing (stays under 4.5MB) + first-chunk magic check (mock). → PASS.

- [ ] **Step 5: Commit** `git commit -m "feat(uploads): chunk-proxy transport fallback"`.

---

## PHASE 4 — Client orchestration + UX

### Task 13: Rewrite `upload-file.ts` orchestration

**Files:**
- Modify: `src/lib/upload-file.ts`
- Test: `tests/upload-orchestration.unit.mts`

- [ ] **Step 1: Failing test** that `uploadOne(file, slot, opts)` calls mint → transport → verify in order and, on a transport `SessionGone`, re-mints once (mock the three network calls).

- [ ] **Step 2: Run, verify fail.** → FAIL.

- [ ] **Step 3: Implement `uploadOne`** returning `{ status:"verified"|"failed", link?, error? }` and an `onProgress(fraction)` callback; map permanent server errors (413/415/403) to clear, file-named messages; retry transient transport with backoff; re-mint once on `SessionGone`. Keep `uploadFileWithRetry`'s old export as a thin adapter only if still referenced, else remove it cleanly (no dead exports).

- [ ] **Step 4: Run, verify pass.** → PASS.

- [ ] **Step 5: Commit** `git commit -m "feat(uploads): client mint/transport/verify orchestration"`.

### Task 14: Forms — per-file status, progress, no client-trusted finalize

**Files:**
- Modify: `src/app/apply/tenant/tenant-form.tsx`, `src/app/apply/landlord/landlord-form.tsx`

- [ ] **Step 1: Replace `uploadAllStagedFiles`** to call `uploadOne` per file with a `slot` (`{category, person}`) derived from `assignedTo`, tracking each file's status in state (`pending|uploading|verified|failed` + `progress`). Retry re-runs only files not yet `verified`.

- [ ] **Step 2: Drop the client-driven completion assumption.** After all staged files report `verified`, the tenant flow shows `complete` (the server already created the invoice during the final verify). Do NOT call any client endpoint that "decides" billing. Remove the old `runUploads`/finalize remnants cleanly.

- [ ] **Step 3: Wire progress** — pass an `onProgress(fileId, fraction)` up so the UI can render a bar.

- [ ] **Step 4: Type-check + dev run.** `pnpm tsc --noEmit` → 0 errors. Start dev (`pnpm dev`, alt port if 3000 busy), submit a dev-autofilled tenant app with a small file, confirm verified + invoice appears after verify.

- [ ] **Step 5: Commit** `git commit -m "feat(forms): per-file upload status + progress, server-gated billing"`.

### Task 15: File-upload component — alert + progress bar

**Files:**
- Modify: `src/components/forms/file-upload.tsx`

- [ ] **Step 1:** Make the over-size message a live region: add `role="alert"` to the `sizeError` paragraph; keep naming the file + limit.
- [ ] **Step 2:** Add a per-file progress bar (token-based styles only — no hardcoded colors) driven by a `progress` prop on each staged row; show a check on `verified`, an error style + retry affordance on `failed`. Touch targets ≥44px.
- [ ] **Step 3: Verify mobile at 375px** in a real browser viewport (progress bar, alert, retry). Screenshot/observe.
- [ ] **Step 4: Commit** `git commit -m "feat(forms): upload progress bar + accessible size alert"`.

---

## PHASE 5 — Hardening + rollout

### Task 16: Middleware matcher, rate limits, CSP

**Files:**
- Modify: `src/middleware.ts`; CSP source (next.config headers / middleware)

- [ ] **Step 1: Add routes to the matcher** — `/api/upload/session`, `/api/upload/verify`, and `/api/upload/chunk` (if B). Treat them as upload-class.
- [ ] **Step 2: Recalculate limits.** One legitimate multi-file application now makes N mint + N verify (+ N×chunks for B). Raise `uploadLimiter` to a value that comfortably covers a max-size application (e.g., 40 files → ~80+ calls/min) while still bounding abuse; keep it fail-open. Document the math in a comment.
- [ ] **Step 3 (Approach A only): CSP `connect-src`.** Locate the CSP (next.config headers or middleware). Add `https://www.googleapis.com` (and any upload host the spike revealed) to `connect-src` so the browser may PUT. Verify no other directive breaks.
- [ ] **Step 4: Type-check + a curl/preflight check** that the new endpoints are reachable and rate-limited. Record output.
- [ ] **Step 5: Commit** `git commit -m "chore(uploads): matcher, rate limits, CSP for direct upload"`.

### Task 17: Stale-upload sweep

**Files:**
- Create: a sweep function (callable from an existing cron or an admin route) in `src/lib/uploads-ledger.ts`

- [ ] **Step 1:** Implement `sweepStaleUploads(ttlMinutes)` — find `minted`/`uploaded` rows older than TTL, delete their quarantine Drive files (if present), mark rows `failed`. Pure selection logic unit-tested; the Drive deletes mocked.
- [ ] **Step 2: Test + commit** `git commit -m "feat(uploads): stale quarantine sweep"`.

### Task 18: Full verification pass (the "and test" gate)

- [ ] **Step 1: Unit suite.** Run every `npx tsx tests/*.unit.mts`; paste the pass counts. All green.
- [ ] **Step 2: Type + build.** `pnpm tsc --noEmit` (0 errors) and the Vercel pre-flight `npx next build --no-lint` (Errors: 0).
- [ ] **Step 3: E2E (Playwright).** Add/extend a tenant spec: submit with a **>4.5MB** file → file lands in the correct occupant folder; invoice exists only AFTER all required verify (assert none before). Run the spec; paste the result.
- [ ] **Step 4: Manual prod-like proof — the case never tested.** On a preview deploy, from a phone and desktop at 375px: submit a tenant app with a **real 10–25MB** PDF. Confirm: progress bar advances, file appears in Drive (moved out of quarantine), the $20 invoice email arrives only after the upload completes, and a deliberately-wrong-type file is rejected with a clear message. Record observations + the Drive/Stripe evidence.
- [ ] **Step 5: Commit** any test files `git commit -m "test(uploads): e2e + large-file verification"`.

---

## Self-review (completed by plan author)

- **Spec coverage:** direct upload (Tasks 0,6,7,12) · no silent failure (Tasks 8,13,15) · progress bar (Tasks 13,15) · server-authoritative bill-after-100% (Tasks 4,5,9,10,11) · magic-byte preserved + honest (Task 3) · folder/naming/idempotency preserved (Tasks 6,11) · exact-origin allowlist (Task 2) · ledger-bound verify (Task 8) · quarantine (Tasks 6,8) · invoice idempotency (Tasks 9,10) · session-URI secrecy (Tasks 6,7,12B) · Drive error handling (Task 12) · CSP + rate limits (Task 16) · stale sweep (Task 17) · tests (Task 18). No spec requirement is unmapped.
- **Placeholder scan:** ledger/verify/billing DB bodies are described as exact SQL/operations with signatures; external-API specifics carry explicit Context7-verification steps (not "TODO"). No banned placeholders.
- **Type consistency:** `requiredDocSlots`/`DocSlot`, `allRequiredVerified`/`UploadRow`, `mintResumableSession`, `maybeCreateInvoice`, `uploadOne` names are used consistently across tasks.
