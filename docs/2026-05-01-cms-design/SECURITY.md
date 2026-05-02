# CMS Security Spec

**Status:** Draft
**Owner:** Kevin (engineering), Nyrell (product)
**Created:** 2026-05-01
**Priority:** Foundational. Every feature in `FEATURES.md` must satisfy these rules before shipping.

---

## Threat Model

The CMS holds:

- **PII** for tenants and landlords (names, addresses, phone, email, ID document scans, lease docs).
- **Financial data** (Stripe payment refs, refund authority).
- **Auth data** (Better Auth user records, sessions).
- **Audit history** (must be tamper-evident; this is the legal record of admin actions).

Adversary classes we plan against:

1. **Public internet attacker** — automated scanners, credential stuffing, SQL injection, file-upload exploits, CSRF.
2. **Malicious authenticated user** — an employee role trying to access owner-only actions, or exfiltrate the contact list.
3. **Compromised credential** — a stolen session/cookie, or API key leak.
4. **Supply chain** — a malicious or compromised npm package.

We do NOT plan against state actors, physical access to Neon's infrastructure, or vulnerabilities in Postgres itself.

---

## 1. Authentication

### Provider: Better Auth (via Neon Auth)

- All session management goes through Better Auth's SDK. **No custom cookie signing, no custom JWT logic anywhere in the codebase.**
- Sessions live in the `neon_auth.session` table, signed with `NEON_AUTH_COOKIE_SECRET` (32+ bytes, generated locally, never committed).
- Session cookies must be `HttpOnly`, `Secure`, `SameSite=Lax` (Better Auth defaults). Verify in middleware on first deploy.

### Password policy

- Minimum 12 characters, must include 1 letter and 1 number. Better Auth handles hashing (Argon2id).
- No password reuse from previous 3 passwords (enforced via Better Auth setting if available, otherwise via custom check on change-password endpoint).
- Rate-limit failed login attempts: 5 failures per email per 15 minutes (Upstash already in stack — use it).
- Lockout after 10 failures within 1 hour: account is flagged, owner gets an email, unlock requires owner action.

### MFA

- TOTP-based 2FA available for any user. **Required** for owner and admin roles before shipping to production.
- Recovery codes: 10 single-use codes generated at MFA enrollment, downloadable once.
- 2FA enforcement is configurable per role in workspace settings (so a future SaaS tenant can require it for everyone).

### Session policy

- Session lifetime: 7 days idle, 30 days absolute. Both configurable per workspace.
- "Remember me" extends idle to 30 days but never extends absolute beyond 30 days.
- Concurrent sessions allowed (different devices), but every session is listed in Settings → Active Sessions and revocable individually or all-at-once.
- Logout revokes the current session row; "logout everywhere" revokes all rows for the user.

### Login surface

- Single login URL: `/admin/login`. No public registration flow — accounts are invite-only.
- Forgot-password flow: email-based, time-limited token (15 min), single-use, stored in DB and validated server-side.
- Magic-link login is **off** for v1. Reconsider in v2 when there's an established email reputation.

---

## 2. Authorization (RBAC)

### Roles (v1)

| Role | Description | Created By |
|------|-------------|------------|
| `owner` | Single per workspace. Full control. Cannot be deleted. | System (seeded) |
| `admin` | Full access except owner-only actions (delete workspace, transfer ownership). | Owner |
| `employee` | Read/write applications and contacts. No financial actions. No user management. | Owner or admin |
| `viewer` | Read-only. Cannot edit or message. | Owner or admin |

### Permission matrix

Permissions are checked **server-side on every request**. Client-side hides UI but is never the security boundary.

| Action | Owner | Admin | Employee | Viewer |
|--------|:-:|:-:|:-:|:-:|
| Read applications | Y | Y | Y | Y |
| Edit application fields | Y | Y | Y | N |
| Delete application | Y | Y | N | N |
| Change payment status | Y | Y | Y | N |
| Issue Stripe refund | Y | Y | N | N |
| Upload/delete files on application | Y | Y | Y | N |
| Send email to applicant | Y | Y | Y | N |
| Read contacts | Y | Y | Y | Y |
| Edit contacts | Y | Y | Y | N |
| Manage subscription channels | Y | Y | Y | N |
| Read audit log | Y | Y | N | N |
| Invite user | Y | Y | N | N |
| Change user role | Y | Y* | N | N |
| Deactivate user | Y | Y* | N | N |
| Workspace settings | Y | Y | N | N |
| Transfer ownership | Y | N | N | N |

\* Admins cannot promote others to admin; only owner can.

### Enforcement

- A single helper, `requirePermission(action, resourceContext)`, called at the top of every server action and API route.
- The helper reads the session from Better Auth, resolves the user's `membership` row in the current workspace, walks `role_permissions` to get effective permissions, and checks against the requested permission key.
- Permission *keys* are compile-time constants (TypeScript-typed via `cms/core/registry/permissions.ts`). Role-to-permission *mapping* lives in the `role_permissions` DB table. This gives static type safety on call sites AND allows workspace customization without redeploys.
- Effective permissions for a session can be cached for the session lifetime (in-memory, per request) since changes to `role_permissions` are rare and can invalidate by triggering a session-bump on save.
- 403 response with no detail beyond "forbidden" if denied. Logged to audit log as `permission_denied` event.

### Row-level security (Postgres RLS)

- Postgres RLS is **enabled** on all tables that hold tenant data: `applications`, `contacts`, `notes`, `sent_emails`, `audit_log`, `application_files`, `payments`.
- Policies key off a `workspace_id` column (so when we go multi-tenant in v2, no data ever crosses workspaces even if app code has a bug).
- The DB role used by the app sets `app.workspace_id` per request (via `SET LOCAL`). Migration code uses an unrestricted role.

---

## 3. Audit Trail

The audit log is the second security boundary. If app code breaks, the log proves what was done by whom.

### What gets logged

Every state-changing event:

- Login (success/failure), logout, session revoke, MFA enable/disable, password change, user invite/deactivate.
- Application created, updated (with field-level diff), deleted, status changed.
- File uploaded, file deleted (with original filename hash and size).
- Payment status set, refund issued.
- Email sent (subject + recipient + body hash, not full body).
- Note added, edited, deleted.
- Contact created, updated, deleted, subscription toggled.
- Permission denied (attempted forbidden action).
- Workspace settings changed.

### Audit log row shape

```
id              uuid
workspace_id    uuid (RLS key)
actor_id        uuid (user id, null if system)
actor_label     text (cached display name; survives user delete)
action          text (e.g. 'application.update', 'auth.login.failed')
entity_type     text (e.g. 'application', 'user', 'session')
entity_id       text (uuid or external id)
diff            jsonb (before/after for updates; null for create/delete)
ip_address      inet
user_agent      text
metadata        jsonb (route, request id, anything else relevant)
created_at      timestamptz default now()
```

### Integrity

- Audit log is **append-only**. No update/delete permission for the app role. Even owners cannot alter past entries.
- A nightly cron computes a chained hash (each row hashes itself + previous row hash) and writes the latest hash to a separate, locked-down table. Any attempt to alter past rows breaks the chain.
- Logs retained for 1 year minimum, then exported to cold storage.

### Performance

- Index on `(workspace_id, created_at desc)` for "what happened recently."
- Index on `(workspace_id, entity_type, entity_id, created_at desc)` for "history of this row."
- Index on `(workspace_id, actor_id, created_at desc)` for "what did this user do."
- `diff` column is `jsonb`, keep diffs minimal (only changed fields, not full row).

---

## 4. Input Validation

### Zod everywhere

- Every server action and API route declares a Zod schema for its input. Parsing failure returns 400 with a generic "Invalid input."
- Detailed validation errors are NOT echoed back to the client (avoids leaking schema internals). The client validates the same Zod schema for UX feedback.

### Output validation

- For external-facing responses that include applicant data, run output through a serializer that strips fields the requesting role isn't allowed to see (e.g., a viewer doesn't get `payment_intent_id` even if it's in the row).

---

## 5. CSRF, XSS, and other web vulns

- Next.js Server Actions enforce same-origin by default. Verify with `Origin` header check on POST routes that aren't actions.
- All user-supplied content is rendered through React's default escaping. **No `dangerouslySetInnerHTML` anywhere in the admin tree.** Lint rule to enforce.
- For markdown notes (if/when we add them), use a sanitizer (DOMPurify) on the server, never trust client-rendered HTML.
- Content Security Policy (strict): `default-src 'self'`, `script-src 'self'` (no inline scripts), `img-src 'self' data: https://drive.google.com`, `frame-src 'self' https://drive.google.com`, `frame-ancestors 'self'`, `connect-src 'self' https://api.stripe.com https://*.neon.tech`. Tested in report-only mode for one week, then enforced.
- Other headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (NOT `DENY` — the inline PDF viewer renders a same-origin iframe; `DENY` would block it), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- The PDF route at `/admin/api/applications/[id]/pdf` returns the same `SAMEORIGIN` header. CSP `frame-ancestors 'self'` is the canonical control; `X-Frame-Options` is the legacy fallback for older browsers.

---

## 6. File uploads

User uploads files in two flows:

1. **Public form** (current behavior) — applicant uploads ID/lease docs. Goes to Drive via service account.
2. **CMS upload on behalf of applicant** (new) — Rell uploads more files for an existing applicant.

### Rules for both

- Server-side MIME sniff (don't trust the `Content-Type` header). Allowed types: `image/jpeg`, `image/png`, `image/heic`, `application/pdf`. Reject everything else with a clear error.
- Size cap: 25 MB per file, 10 files per upload action.
- Filename sanitization: strip path traversal (`../`), null bytes, control chars. Generate a server-side ID and store the original name in metadata.
- Virus scanning: defer to v2 (ClamAV or Cloudmersive). For v1, document this as a known gap and rely on Drive's own scanning.
- Drive permissions: files are private to the service account. CMS UI fetches a short-lived signed URL or streams bytes through the server route; **never** sets the Drive file to "anyone with link."
- Deletion: soft-delete with a 30-day grace period. Audit log captures who deleted what.

### Authorization at the file boundary (HARD RULE)

Every file route — preview, signed URL, download, delete — follows this exact sequence:

1. Authenticate the session.
2. Resolve the `application_files` row by ID.
3. Verify `application_files.workspace_id` matches the caller's session workspace. If not, 404 (not 403 — don't leak existence).
4. Check the caller has the required permission on the *owning application* (`applications.read` for preview/download, `applications.files.upload` for upload, `applications.files.delete` for delete).
5. Only then call the `FileStorage` adapter.

The `FileStorage` adapter interface keys on `workspaceId + id` only and trusts that the caller has already checked permission. **Never call the adapter without the route-layer check above.** Lint rule or test suite enforces.

Signed URLs (when used) have a TTL ≤ 5 minutes and embed a workspace_id + file_id claim that the route validates on each fetch. URLs are not stored or shared between users.

---

## 7. Secrets management

- All secrets in `.env.local` (development) and Vercel env vars (production).
- Never log secrets, never include in error messages, never echo to the client.
- `.env.local` is gitignored. CI runs a regex check for credential patterns on every push.
- Stripe keys, Neon DB password, Better Auth cookie secret rotated annually as a baseline — sooner if leaked.
- A leaked-credential runbook lives in this directory (`SECURITY.md` link to `INCIDENT-RESPONSE.md` to write later).

---

## 8. Stripe and refund authorization

- Refund route requires `payments.refund` permission server-side.
- Refund route fetches the Stripe payment intent ID from the `payments` table by `application_id`, verifies the application belongs to the caller's workspace, then calls Stripe.
- Refund amount is capped at the original payment amount minus prior refunds. Never trust a client-supplied amount.
- Idempotency key on the Stripe call uses `refund:{application_id}:{actor_id}:{nonce}` to prevent double-refunds from double-clicks or retries.
- Refund result (success or failure) is logged to audit log with full Stripe response body in metadata.

---

## 9. Rate limiting

Upstash Redis is already in the stack. Use it.

| Endpoint | Limit |
|----------|-------|
| `/admin/login` | 5 attempts per email per 15 min, 20 per IP per 15 min |
| Forgot-password request | 3 per email per hour |
| Email composer send | 30 emails per user per hour |
| File upload | 100 files per user per hour |
| Refund issue | 10 per workspace per day (sanity cap) |
| Generic admin API | 600 req per user per minute |

Limits are configurable per workspace in settings.

---

## 10. Dependency security

- Dependabot or Renovate enabled. Critical vulns patched within 7 days, high within 30.
- `pnpm audit` runs in CI. Build fails on critical.
- New dependencies require a code-review note explaining why the existing stack can't do it.
- Lock file (`pnpm-lock.yaml`) committed and reviewed on every change.

---

## 11. Data export and deletion (GDPR readiness)

Even though the user is US-only today, build the *data model* for it from day one. The product UI ships in v1.1.

**v1 — readiness only:**
- Schema supports it: every PII row keys off `workspace_id` and links to a `contact_id`, so a single SQL transaction can export or delete a contact's full footprint.
- Audit log retains entries even for deleted entities; `target_label` denormalizes to a frozen `[deleted-<short-id>]` string so the entry remains useful without leaking PII.

**v1.1 — UI:**
- Each contact gets a "Request data export" action that produces a JSON+files zip.
- "Right to be forgotten" hard-deletes contact + applications + files + notes; audit entries remain.

---

## 12. Mobile-specific security

(Detailed UX in `MOBILE.md`. Security-relevant points only here.)

- File picker on mobile must prefer the OS picker, not a webview-injected one.
- PDF preview on mobile loads from same origin only (no third-party PDF.js CDN that could be MITM'd on captive WiFi).
- Biometric unlock for the CMS app shell (when added as a PWA): `WebAuthn` only, never store secrets in localStorage or IndexedDB.
- Camera-based file upload (take photo of ID doc) goes straight to the server; never cached in the browser file system.

---

## 13. Logging and monitoring

- Sentry already wired up. Configure scrubbing rules for: full names, emails, phone numbers, government ID numbers, Stripe tokens, anything in `notes`. Test scrubbing before going live.
- All 4xx/5xx auth failures fire a Sentry breadcrumb but do not page on-call.
- 10 5xx errors in 5 min on `/admin/*` does page on-call (when on-call exists).

---

## 14. Incident response (skeleton)

A separate `INCIDENT-RESPONSE.md` will cover:

- Who to notify (owner first).
- Containment: rotate keys, revoke sessions, lock affected accounts.
- Communication: Templates for notifying affected applicants if PII was exposed.
- Forensics: How to query audit log for the incident window.
- Post-mortem template.

For v1 launch: write this doc before going live. No skipping.

---

## Acceptance criteria for v1 ship

Security review checklist before flipping the public-facing flag:

- [ ] All endpoints have permission checks (server-side, not client).
- [ ] All inputs go through Zod.
- [ ] RLS enabled and tested on every PII-bearing table.
- [ ] Audit log writes for every action listed in §3.
- [ ] Rate limits configured on every endpoint in §9.
- [ ] Security headers set and verified with `curl -I`.
- [ ] CSP enforced (not report-only).
- [ ] 2FA enrolled for owner and admin accounts.
- [ ] `pnpm audit` shows zero critical or high vulns.
- [ ] Sentry scrubbing tested with a fake PII record.
- [ ] Incident response doc written.
