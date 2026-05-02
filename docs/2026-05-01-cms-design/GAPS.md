# Review & Patch Log

**Status:** Live — patches applied to affected docs as of 2026-05-01
**Reviewers:** Claude (self-review), Codex (independent pass)
**Created:** 2026-05-01

This file is the audit trail of issues found in the design pack and where each one was patched. Two passes:

- **Codex review** — produced 9 ranked findings + 5 missing concepts after several reading sweeps. Sharp on internal contradictions.
- **Claude self-review** — produced 10 findings biased toward infrastructure gaps (backups, dual-write, JSON evolution).

Combined and reconciled below. Items appear once; both reviewers credited where applicable.

---

## BLOCKERS

### B1. Submission-history acceptance criterion contradicts the data model
**Found by:** Codex
**Docs:** FEATURES.md
**Sections:** Module 4 — Applications, Acceptance Criteria for v1 Launch

**Problem:** Module 4 was updated to "no original copy, edit in place." But the v1 launch checklist still includes "Public-form writes go to Postgres; immutable submission snapshot saved." Two parts of the same doc disagree.

**Fix:** Removed the immutable-snapshot line from acceptance criteria. Replaced with: "Public-form writes go to Postgres; PDFs regenerate on demand from current data."

**Status:** PATCHED in FEATURES.md.

---

### B2. `X-Frame-Options: DENY` blocks the inline PDF viewer
**Found by:** Codex
**Docs:** SECURITY.md, FEATURES.md, MOBILE.md, DESIGN.md

**Problem:** Security spec requires global `X-Frame-Options: DENY`. PDF viewer design depends on rendering an `<iframe>` to a same-origin streamed PDF route. `DENY` blocks that iframe even though it's same-origin.

**Fix:** Changed global header to `X-Frame-Options: SAMEORIGIN`. Added explicit note: PDF route at `/admin/api/applications/[id]/pdf` returns SAMEORIGIN as well; CSP `frame-ancestors 'self'` is the canonical control. Documented in SECURITY.md §5.

**Status:** PATCHED in SECURITY.md.

---

### B3. Dual-write failure modes during migration not specified
**Found by:** Claude
**Docs:** ARCHITECTURE.md
**Section:** Migration Path from Today

**Problem:** During the migration phase the public form writes to Sheets + Drive + Postgres. If Sheets succeeds and Postgres fails (or vice versa), the form returns success either way. Source-of-truth diverges silently.

**Fix:** Postgres is the source of truth from day one of dual-write. Sheets becomes best-effort secondary; failures are logged and surfaced in the audit log but don't block the form. Drive write is also best-effort with retry. Form returns failure only if Postgres write fails. Documented in ARCHITECTURE.md migration step 4.

**Status:** PATCHED in ARCHITECTURE.md.

---

## HIGH

### H1. Authorization model contradicts itself across docs
**Found by:** Codex
**Docs:** SECURITY.md, FEATURES.md, DATA-MODEL.md, ARCHITECTURE.md

**Problem:** SECURITY.md §2 "Enforcement" says permissions are checked against "a static permission map (compile-time, not DB-backed for v1)." But DATA-MODEL.md defines a `role_permissions` table and ARCHITECTURE.md says role-permission mapping lives in DB. FEATURES.md says it's workspace-customizable.

**Fix:** Settled on the DB-backed approach for v1. Permission *keys* are compile-time (so we get TypeScript checking). Role-to-permission *mapping* is DB-backed in `role_permissions`. SECURITY.md updated to reflect this; the "compile-time map" line was a leftover from an earlier draft.

**Status:** PATCHED in SECURITY.md §2 Enforcement.

---

### H2. GDPR export/delete scope contradictory
**Found by:** Codex
**Docs:** FEATURES.md, SECURITY.md

**Problem:** FEATURES.md roadmaps GDPR data-export & right-to-be-forgotten as "high priority" beyond v1. SECURITY.md §11 specifies them as live product actions: each contact and applicant has a "request data export" action.

**Fix:** Demoted SECURITY.md §11 to readiness requirements only — the *data model* must support export and delete (it does), but the UI ships in v1.1. Updated SECURITY.md §11 accordingly. FEATURES.md roadmap unchanged.

**Status:** PATCHED in SECURITY.md §11.

---

### H3. Mobile offline cache lacks security controls
**Found by:** Codex
**Docs:** MOBILE.md, SECURITY.md

**Problem:** MOBILE.md allows last-fetched data + queued mutations to live offline without specifying cache lifetime, logout invalidation, encryption, or excluded-from-offline categories. PII admin tool on a phone is a real risk surface.

**Fix:** Added MOBILE.md §"Offline data security" subsection: cache cleared on logout, session expiry, role change, or 24h max age (whichever first). High-sensitivity views (audit log, security settings, refund flows) bypass cache. Queued writes are session-bound and dropped on logout. SECURITY.md threat model updated to acknowledge offline cache as a controlled surface.

**Status:** PATCHED in MOBILE.md and SECURITY.md.

---

### H4. File access enforcement underspecified at the authorization boundary
**Found by:** Codex
**Docs:** ARCHITECTURE.md (FileStorage adapter), SECURITY.md §6, FEATURES.md Module 5

**Problem:** The `FileStorage.get()` and `.signedUrl()` adapter methods take `workspaceId` and `id`. Nothing says routes must look up `application_files` first to verify the caller has permission on the owning *application* before fetching bytes.

**Fix:** Added a hard rule: every file route resolves `application_files` row → checks the caller has `applications.read` (or appropriate permission) on the owning application → only then calls the adapter. Documented in ARCHITECTURE.md adapter section and SECURITY.md §6. The adapter interface itself is unchanged; the contract is enforced at the route layer.

**Status:** PATCHED in SECURITY.md §6 and ARCHITECTURE.md.

---

### H5. Orphaned memberships when Better Auth user is deleted
**Found by:** Claude
**Docs:** DATA-MODEL.md
**Section:** memberships

**Problem:** `memberships.user_id` references `neon_auth.user.id` but isn't a Postgres foreign key (different schema). If a user is deleted in Better Auth, memberships become silent orphans.

**Fix:** Nightly reconciliation cron walks `memberships`, checks against `neon_auth.user`, marks orphaned rows as `status = 'deactivated'` with a system-actor audit entry. Documented in DATA-MODEL.md.

**Status:** PATCHED in DATA-MODEL.md.

---

### H6. No support-impersonation pattern reserved
**Found by:** Claude
**Docs:** FEATURES.md, SECURITY.md, DATA-MODEL.md

**Problem:** When the team grows past one person, support cases need "view as user" to debug. Retrofitting it is painful — every audit log read needs to know about the impersonator.

**Fix:** Reserved schema now even though UI ships later. Added `audit_log.impersonated_by_user_id` column. Policy: only owner can impersonate, all impersonated actions are double-logged, session UI shows a banner during impersonation. UI deferred to v1.1.

**Status:** PATCHED in DATA-MODEL.md and SECURITY.md.

---

## MEDIUM

### M1. Payment state has two sources of truth
**Found by:** Codex
**Docs:** FEATURES.md, DATA-MODEL.md

**Problem:** `applications.status / payment_method / amount_cents` are denormalized AND there are full `payments` and `refunds` tables. Spec doesn't say which is authoritative.

**Fix:** `payments` and `refunds` are the ledger (source of truth). `applications.*` are derived/cached columns updated via trigger or in the same transaction as a `payments` insert. Reconciliation logic documented in DATA-MODEL.md.

**Status:** PATCHED in DATA-MODEL.md.

---

### M2. Desktop detail-view behavior incoherent across docs
**Found by:** Codex
**Docs:** FEATURES.md, MOBILE.md, DESIGN.md

**Problem:** FEATURES.md says full route page on desktop. MOBILE.md says drawer/sheet conventions allow a right drawer "OR full route per feature." DESIGN.md says there's a user toggle persisted per user.

**Fix:** v1 default is **full route page** for application detail. The drawer pattern is reserved for "quick view from table" only and can be added in v1.1. The user toggle is removed from v1 scope. Documented consistently in FEATURES.md, MOBILE.md, and DESIGN.md.

**Status:** PATCHED in DESIGN.md and MOBILE.md.

---

### M3. Mobile swipe actions need role-gating rules
**Found by:** Codex
**Docs:** MOBILE.md, SECURITY.md

**Problem:** Mobile swipe-right exposes "Mark Paid" / "Send Email" and swipe-left exposes "Archive." If the user is a viewer (read-only) or employee (no refund/delete), the gesture should not silently fail or show actions they can't perform.

**Fix:** Added MOBILE.md rule: quick actions render only for roles that have permission for them. If a user can't do *any* swipe action, the gesture is disabled with no visual cue (i.e., swipe just doesn't reveal anything). The fallback is always: tap card → open detail view → action gated there.

**Status:** PATCHED in MOBILE.md.

---

### M4. Audit-log diff for nested objects unspecified
**Found by:** Claude
**Docs:** DATA-MODEL.md, SECURITY.md

**Problem:** A change to one character of `data.address.line2` shouldn't store the full address tree. Spec doesn't define how nested diffs are computed.

**Fix:** Specified flattened json-path diffs: `{"data.address.line2": {"before": "Apt 4", "after": "Apt 5"}}`. Library choice deferred to implementation. Contract is the diff shape.

**Status:** PATCHED in DATA-MODEL.md and SECURITY.md.

---

### M5. No backup/recovery objectives
**Found by:** Claude
**Docs:** SECURITY.md

**Problem:** Neon does PITR but the spec never commits to RPO/RTO.

**Fix:** Added SECURITY.md §15: RPO 5 minutes, RTO 30 minutes for full-region failure, manual quarterly restore drill.

**Status:** PATCHED in SECURITY.md.

---

### M6. No consent log for subscription-pref changes
**Found by:** Claude
**Docs:** DATA-MODEL.md, FEATURES.md

**Problem:** Storing a `false` flag doesn't satisfy CAN-SPAM/GDPR audits — they want when, why, by whom.

**Fix:** Added `contact_consent_events` table for compliance-grade lookup. `audit_log` continues to capture for ops; the consent table is the legal record. Documented in DATA-MODEL.md and FEATURES.md Module 9.

**Status:** PATCHED in DATA-MODEL.md.

---

### M7. Concurrent-edit handling absent
**Found by:** Codex
**Docs:** FEATURES.md, ARCHITECTURE.md

**Problem:** Two admins editing the same application — no locking, optimistic concurrency, or conflict resolution defined.

**Fix:** Added `applications.row_version` (integer) and last-write-wins-with-warning model. Edit form fetches the row with `row_version`; on save, we check the version hasn't changed. If it has, show a "this row was edited by [name] [time-ago] — review their changes before saving" toast and refresh. No hard locks. Documented in DATA-MODEL.md and FEATURES.md.

**Status:** PATCHED in DATA-MODEL.md.

---

### M8. Soft-delete purge/restore mechanics unspecified
**Found by:** Codex
**Docs:** FEATURES.md, DATA-MODEL.md

**Problem:** "Soft-delete with 30-day grace period" appears in several places without specifying who can restore, what happens at day 31, whether deleted rows surface in views.

**Fix:** Added DATA-MODEL.md "Soft delete lifecycle" subsection. Restore is owner/admin only. A nightly cron purges rows where `deleted_at < now() - interval '30 days'`. Soft-deleted rows are excluded from default queries; a "Trash" view (owner/admin) shows them with restore/permanently-delete actions.

**Status:** PATCHED in DATA-MODEL.md.

---

### M9. Invite-token / expiration model missing
**Found by:** Codex
**Docs:** FEATURES.md (Module 10 Team), DATA-MODEL.md

**Problem:** Settings → Team → Invite is mentioned but the token lifecycle isn't specified.

**Fix:** Invite generates a single-use token with 7-day expiry (configurable per workspace). Token is sent via email. On accept, account is created (or linked if Better Auth user already exists) and membership row goes from `status='invited'` to `status='active'`. Pending invites are listed and revocable. Documented in FEATURES.md and DATA-MODEL.md (memberships fields cover this).

**Status:** PATCHED in FEATURES.md.

---

## LOW

### L1. Audit timeline timezone unspecified
**Found by:** Claude
**Docs:** DESIGN.md

**Problem:** Multi-tenant means viewers in different timezones — default to workspace tz, viewer's local, or actor's tz?

**Fix:** Default to viewer's local timezone (most useful for "what happened today"). Hover/tap shows UTC + workspace-tz alternatives. Workspace setting can override the default.

**Status:** PATCHED in DESIGN.md.

---

### L2. JSON evolution policy missing
**Found by:** Claude
**Docs:** DATA-MODEL.md

**Problem:** When we add a new form field, every old row's `data` JSONB lacks it.

**Fix:** New fields ship with a backfill script OR queries tolerate missing keys. Field deletions move to a deprecated namespace, never hard-delete. No JSON shape versioning in v1; tolerant queries are sufficient.

**Status:** PATCHED in DATA-MODEL.md "Open Schema Questions" section.

---

### L3. Drive folder lifecycle for new submissions
**Found by:** Claude
**Docs:** DATA-MODEL.md

**Problem:** With deferred PDFs, when does an applicant get a Drive folder?

**Fix:** Lazy. Folder is created on first file upload (public-form file or CMS upload). Documented in DATA-MODEL.md.

**Status:** PATCHED in DATA-MODEL.md.

---

### L4. Swipe gesture vs iOS Safari back-swipe
**Found by:** Claude
**Docs:** MOBILE.md

**Problem:** iOS Safari uses left-edge horizontal swipe for back navigation; we want it for quick actions.

**Fix:** 16px dead zone on the left edge of cards. Quick-action swipes only trigger past it. iOS handles the back gesture.

**Status:** PATCHED in MOBILE.md.

---

### L5. Rate-limit administration UI
**Found by:** Codex
**Docs:** SECURITY.md, FEATURES.md

**Problem:** SECURITY.md §9 says rate limits are configurable per workspace. No UI for that.

**Fix:** Reserved as v1.1. v1 ships with hardcoded defaults. SECURITY.md §9 updated to clarify configurability is a v1.1 capability; v1 gets the defaults documented in the table.

**Status:** PATCHED in SECURITY.md.

---

## What I Did Not Patch

- **Detailed test plan / scaffolding.** Implementation-time work.
- **Public API contract.** Out of scope by explicit choice.
- **Slack/Teams integrations.** Roadmap material.

---

## Status Summary

- **Blockers patched:** 3 / 3
- **High patched:** 6 / 6
- **Medium patched:** 9 / 9
- **Low patched:** 5 / 5
- **Total findings reconciled:** 23

Docs are now internally consistent. We move to bootstrap.
