# CMS Features (Revised — Full Scope)

**Status:** Draft — supersedes earlier draft from 2026-05-01.
**Owner:** Nyrell Nunez (product), Kevin (engineering)
**Created:** 2026-05-01

---

## Vision

A modular, white-label-ready CMS/CRM shell for real-estate operations. ItsRellEstate is the first instance. The same codebase ships to other clients with config swaps, not rewrites.

This is not "an admin page for one site." This is a product.

Three principles drive every decision in this doc:

1. **Mobile-first parity.** Every feature works on a phone the same as on a desktop. Parity, not "responsive."
2. **Security by default.** Auth, RBAC, audit trail, and RLS gate everything. Detailed in `SECURITY.md`.
3. **Modular and extensible.** Entities, columns, themes, and storage are config-driven so the CMS can be sold/forked. Detailed in `ARCHITECTURE.md`.

---

## Stack

- Next.js 16 (App Router), React 19, TypeScript strict
- Tailwind v4
- HeroUI + shadcn primitives + Base UI (existing)
- Lucide icons (existing)
- Framer Motion (existing)
- Zod (existing)
- Sentry (existing)
- Stripe (existing)
- pdf-lib (existing)
- googleapis (existing)
- **Neon Postgres** (new — replaces Sheets as source of truth)
- **Better Auth via Neon Auth** (new — auth + sessions)
- **Upstash Redis** (existing — rate limiting and short-lived caches)

No Material UI. We stay on HeroUI + shadcn for visual consistency with the public site.

---

## Routes

| Path | Purpose | Auth |
|------|---------|------|
| `/admin/login` | Login page | Public |
| `/admin/forgot-password` | Password reset request | Public |
| `/admin/reset-password/[token]` | Password reset confirm | Public |
| `/admin` | Dashboard home | Required |
| `/admin/applications` | Tenant + landlord application table | Required |
| `/admin/applications/tenants` | Tenant-only filter | Required |
| `/admin/applications/landlords` | Landlord-only filter | Required |
| `/admin/applications/[id]` | Application detail | Required |
| `/admin/applications/[id]/pdf` | Inline PDF preview (full screen) | Required |
| `/admin/contacts` | Contact directory | Required |
| `/admin/contacts/[id]` | Contact detail | Required |
| `/admin/audit` | Audit log viewer | Required (`audit_log.read`) |
| `/admin/settings` | Settings hub | Required |
| `/admin/settings/account` | Personal account settings | Required |
| `/admin/settings/team` | Team management | Required (`settings.team.manage`) |
| `/admin/settings/workspace` | Workspace settings | Required (`settings.workspace.manage`) |
| `/admin/settings/email-templates` | Email templates editor | Required |
| `/admin/settings/security` | 2FA, sessions, password | Required |

All `/admin/*` routes (except auth flows) are gated by middleware that checks Better Auth session + role.

---

## Module 1 — Authentication

### Public-facing

- Login (email + password)
- Forgot password (email-based reset)
- 2FA enrollment and challenge (TOTP)

### Internal

- Session list (current device + all active sessions, revocable)
- Password change
- Backup codes generation (10 single-use)

Auth is provided by Better Auth (Neon Auth). Detailed rules and policies in `SECURITY.md`.

---

## Module 2 — Roles & Permissions

Four roles for v1: **owner, admin, employee, viewer**.

Permission keys are defined in code (`cms/core/registry/permissions.ts`); role-to-permission mapping lives in DB (`role_permissions` table) so individual workspaces can customize without redeploying.

Full matrix and enforcement rules in `SECURITY.md` §2.

### UI surfaces

- **Settings → Team:** invite users, change roles, deactivate. Owner-only edits to admin role.
- **Permission gates:** UI hides actions the user can't perform AND every server route re-checks (the UI hide is convenience; the server check is the actual security).

---

## Module 3 — Audit Trail

Every action that changes state is logged. Schema and indexes detailed in `DATA-MODEL.md` and `SECURITY.md` §3.

### What gets logged

Auth events, every CRUD on every entity, file events, payment status changes, refunds, emails sent, role/permission changes, settings changes, permission-denied attempts.

### UI: Audit Log Viewer (`/admin/audit`)

- Time-ordered timeline (newest first).
- Filters: actor, entity type, action, date range.
- Search across actor name, entity label, action.
- Each row expandable to show diff (before/after for updates).
- Export current view as CSV (owner/admin only).
- Mobile: card stack with the same column registry.

### UI: Per-entity activity tab

Inside any application or contact detail view, an "Activity" tab shows the audit log filtered to that entity. Includes parent-entity links (an email sent against an application also shows under that application's activity).

---

## Module 4 — Applications (Tenants & Landlords)

Full CRUD over tenant and landlord applications. Same UI primitives drive both, only the column registry and detail view differ.

### PDF generation: always on demand from current data

**Today:** the public form generates a PDF at submit time and uploads to Drive.

**New behavior:**

1. Public form submits raw structured data to Postgres. **No PDF is generated at submission time.**
2. The application has one canonical record. CMS edits update that record directly.
3. Whenever a PDF is needed (view, download, send to landlord), the server regenerates it from the current data on demand.
4. PDFs are not stored in Drive at all — they are produced fresh every time and streamed to the browser.

There is no "original" copy. There is only the application as it stands right now. Audit log preserves the change history if we ever need to know what was edited.

### Application table (`/admin/applications`)

Columns (registry-driven; mobile shows primary + secondary only):

- `created_at` (primary on mobile via timestamp chip)
- `applicant_name` (primary)
- `applicant_type` (tenant / landlord — chip on mobile)
- `email` (secondary on mobile)
- `phone` (desktop-only)
- `borough` (tenants) or `property_address` (landlords) (secondary)
- `subsidy_program` (tenants only) (tertiary)
- `payment_status` (primary, as colored chip)
- `payment_method` (desktop-only when paid)
- `amount_paid` (desktop-only when paid)
- `notes_count` (icon indicator, desktop-only — mobile uses a dot on the card)
- `files_count` (icon indicator)
- `last_updated_at` (desktop-only)

Behaviors:

- Sortable on every desktop column.
- Filter chips for status, applicant type, borough, subsidy program.
- Search across name, email, phone with debounce.
- "Group by email" toggle — collapses duplicates from same email into one card with expandable history.
- Pagination: 50 per page; "Load more" button on mobile, paginator on desktop.
- Bulk select on desktop (v1.1, not v1) — checkboxes for bulk status change, bulk export, bulk email. Mobile equivalent uses long-press to enter selection mode.

### Application detail view

Layout:

- **Mobile:** full-screen sheet with tab strip (`Overview`, `Files`, `Payment`, `Notes`, `Activity`, `Email`).
- **Desktop:** full route page with sidebar tabs (same six tabs).

Per tab content:

- **Overview** — All fields grouped (Personal, Contact, Housing, Subsidy, Other). Inline-editable. Save button in sticky footer when there are unsaved changes. Validation runs via Zod on blur and on save.
- **Files** — Grid of files. Inline preview for PDFs and images. Upload + delete. See Module 5.
- **Payment** — Status, method, amount, refund. See Module 6.
- **Notes** — Single textarea, autosaved on blur with "Last saved" indicator.
- **Activity** — Audit-log timeline scoped to this application.
- **Email** — Compose pane + history of sent emails. See Module 8.

### PDF actions

Two actions in the detail view header:

- **View PDF** — opens `/admin/applications/[id]/pdf` in the inline viewer (server-side generated from current data each time).
- **Download PDF** — same generator, served with `attachment` disposition.

The PDF route accepts no `version` parameter because there is only one version: now. Inline preview uses the iframe approach detailed in `MOBILE.md`.

### Create application manually

A "+ New Application" button (top right of table) opens a wizard identical to the public form. Useful when Rell is on the phone with someone and wants to enter their info live.

The wizard supports save-as-draft so a Rell-entered application doesn't have to be perfect on first pass.

### Delete application

Soft-delete with 30-day grace period. Audit-logged. Owner/admin only.

---

## Module 5 — Files

Per-application file management.

### Upload

- Public-form uploads continue working as today (applicant-uploaded files go to Drive).
- CMS upload: Rell uploads more files for an existing applicant. Upload UI per `MOBILE.md`. Files go to the same per-applicant Drive folder.

### Preview

- PDFs and images preview inline in the Files tab.
- Other types show a generic file icon with download button.
- Preview is via signed Drive URL OR streamed through the server route — chosen in implementation, never via "anyone with link" Drive permission.

### Delete

- Soft-delete with 30-day grace period.
- Confirmation modal.
- Audit-logged.

### File adapter

The file storage is abstracted via a `FileStorage` adapter interface. ItsRellEstate uses Drive. Other tenants could swap to S3, R2, or local.

---

## Module 6 — Payments & Refunds

### Payment status

Values: `unpaid` (default), `paid`, `waived`, `refunded`.

State transitions:

- `unpaid → paid` — opens modal asking method (Stripe / Cash / Zelle / Venmo / Other) and amount. If method is Stripe and there's a Stripe payment record on file, prefill amount.
- `unpaid → waived` — requires reason text (max 200 chars). Logged.
- `paid → unpaid` — clears method and amount. Logged.
- `paid → refunded` — only via the Refund flow (next section).

### Stripe refunds

- "Issue refund" button visible on detail view when `method = stripe` and `status = paid`.
- Confirmation modal: amount (defaults to full, can partial), optional reason (sent to Stripe metadata).
- Server route: permission check → idempotency key → Stripe API call → DB update → audit log.
- Failure paths: keep status as `paid`, show error in modal, no DB changes.

### Off-platform payments

For Cash/Zelle/Venmo/Other, Rell sets status manually with an amount. No automatic verification. Audit-logged.

---

## Module 7 — Notes

Per-application free-text notes (single field, single user — multi-user threaded notes are v2).

- Plain text, autosaves on blur with debounce.
- Last-edited timestamp shown.
- 5000-char limit.
- v2: convert to a per-note table with author and timestamp once we have multiple users.

---

## Module 8 — Email Composer

Send emails to applicants from inside the CMS. Uses the existing project email service (TBD in implementation — read `src/lib/` to confirm; likely Resend).

### Composer

- To: locked to applicant email.
- Subject: free text. Optional template dropdown sourced from `email_templates` table.
- Body: plain text v1. Rich text (TipTap) is v2.
- Send button.

### Templates

- Editable in `/admin/settings/email-templates`.
- Variables: `{{first_name}}`, `{{last_name}}`, `{{borough}}`, `{{subsidy_program}}`, etc. — substituted server-side at send time.
- Versioned: editing a template creates a new version; sent emails record the version-at-send-time.

### History

- Sent emails listed in the Email tab of the application.
- Each shows: subject, timestamp, recipient, snippet, "Resend" action.
- Full body stored in `sent_emails` table (no truncation).

### Reply handling (v1)

- `Reply-To` set to Rell's personal email so replies go to his inbox.
- Inbound parsing / threading is **out of scope** for v1.

### Compliance

- Subscriber emails (vs transactional) include unsubscribe footer linking to a one-click unsubscribe page that toggles the contact's `subscriptions.email = false`.
- Transactional emails (about an applicant's own application) don't need unsubscribe per CAN-SPAM, but include "manage preferences" link for good citizenship.

---

## Module 9 — Contacts (Unified CRM)

Every person who interacts with the site becomes a contact:

- Submits a tenant or landlord application
- Submits a contact-page form
- Subscribes via the subscribe form/widget

### Identity resolution

Detailed schema in `DATA-MODEL.md`. High-level:

- Primary key: `contact_id` (uuid).
- Identifiers: email (primary, normalized), phone (secondary), name.
- When a new submission arrives, look up by normalized email; if found, link to existing contact; if not, create new.
- Source rows (applications, contact_messages, subscribers) hard-link to `contact_id`.
- Manual merge / unmerge for cases where the system mis-resolved (different people, same family email).

### Labels

A contact has a multi-select `labels` array, e.g. `['tenant', 'subscriber']`. Labels:

- Auto-applied based on source (apply form → `tenant` or `landlord`; subscribe → `subscriber`; contact form → `lead`).
- Manually editable from contact detail.
- Filterable in the contact list.

### Subscription channels

A contact has subscription preferences as JSONB:

```json
{
  "email": { "marketing": true, "transactional": true },
  "sms": { "marketing": false, "transactional": false }
}
```

Editable from contact detail. Toggle changes are audit-logged. Updates respect the unsubscribe-link flow described in Module 8.

### Contact list (`/admin/contacts`)

Columns:

- `created_at` (primary timestamp)
- `display_name` (primary)
- `primary_email` (primary)
- `primary_phone` (secondary)
- `labels` (chips)
- `application_count` (chip with count)
- `last_activity_at` (desktop-only)
- `email_subscribed`, `sms_subscribed` (icons, desktop-only)

Behaviors:

- Sortable.
- Filter chips by label, by subscription status.
- Search across name/email/phone.
- "+ New Contact" — manually create contact (e.g., met someone in person).

### Contact detail

Tabs (mobile sheet / desktop tabs):

- **Overview** — display name, primary email/phone, labels, subscription toggles, full address if known.
- **Activity** — combined timeline of every interaction (applications, emails, contact messages, subscription events).
- **Applications** — list of applications linked to this contact (link to each).
- **Email** — compose + history (same composer as application detail).
- **Notes** — notes about this contact (separate from per-application notes).

---

## Module 10 — Settings

`/admin/settings` is a hub with subroutes.

### Account (`/admin/settings/account`)

- Display name, avatar, email (verified).
- Change password.
- Sessions list (current, others, revoke).
- 2FA setup / disable / regenerate backup codes.

### Team (`/admin/settings/team`)

(Owner / admin only.)

- Invite by email + role.
- Pending invites list.
- Active members list with role chip, last-active timestamp, deactivate button.
- Role change UI (owner can promote to admin; admins can edit employee/viewer).

### Workspace (`/admin/settings/workspace`)

(Owner only for v1; admin gets read in v1.1.)

- Workspace name, logo, primary contact email.
- Working hours (used for "out of office" auto-replies in v2).
- Timezone.
- Branding tokens (color, logo) — feeds the theme registry. Limited customization in v1.

### Email Templates (`/admin/settings/email-templates`)

(All editor roles.)

- Library of templates, each with subject + body + variables.
- Create / edit / archive.
- Preview with sample data.

### Security (`/admin/settings/security`)

(Owner / admin.)

- Failed login attempts (read-only log, last 30 days).
- Active sessions for all users (with revoke).
- Audit log of security-relevant events (logins, MFA changes, role changes).
- Workspace-wide policies: 2FA required, session timeout, password policy.

### Integrations (placeholder for v1)

Visible but disabled. Plan for v2: Stripe, Drive, Resend, Twilio.

---

## Module 11 — Dashboard Home (`/admin`)

Landing page after login.

### Cards

- **Applications this week** — count + delta vs previous week.
- **Unpaid applications** — count + clickthrough to filtered table.
- **Revenue this week** — sum of paid amounts grouped by method.
- **Active contacts** — total contact count.

### Recent activity

Last 20 entries from the audit log across all entities. Each row links to the entity.

### Tasks (when Tasks module ships in v1.1)

Today's tasks with completion checkboxes. (Future feature, see "Roadmap" below.)

### Mobile

Cards stack vertically; recent activity becomes a card list. Tasks appear above activity.

---

## Module 12 — Saved Views (v1.1)

Not v1 but designed for now to avoid retrofitting.

- Any filter+sort combo on a list view can be saved as a view.
- Views are per-user.
- Views appear as tabs above the table.
- Default views shipped: "Unpaid this week," "All tenants," "All landlords."

---

## Module 13 — Custom Fields (v1.1)

Not v1, but the schema allows extension fields per entity per workspace via a `custom_fields` JSONB column.

- Workspace owner can define new fields in settings.
- Fields render automatically in detail views and tables.
- Detailed in `ARCHITECTURE.md`.

---

## Roadmap (Beyond v1)

In rough priority order. Each is a separate spec when the time comes.

| Feature | Priority | Notes |
|---------|----------|-------|
| Tasks / reminders | High | Per-applicant + standalone tasks. Surfaces in dashboard. |
| Saved views / segments | High | See Module 12. |
| Custom fields per entity | High | See Module 13. |
| Reports / analytics | High | Conversion funnel, revenue trends, response time. |
| GDPR data export & delete | High | One-click export per contact; right-to-be-forgotten flow. |
| Deals / pipeline | Medium | Real-estate-flavored Kanban for matching tenants to landlords. |
| Webhooks / automation | Medium | Trigger external systems on events. |
| File OCR / search | Medium | Search inside uploaded PDFs. |
| SMS sending | Medium | Twilio integration with consent log. |
| Calendar / scheduling | Medium | Self-serve booking links. |
| Inbox / threading | Low for v1 | Full inbound email parsing. |
| Integrations marketplace | Low | When the platform has more clients to justify it. |

---

## Out of Scope (Explicit Non-Goals for v1)

- Multi-workspace per user (one user = one workspace; can join others as invitee).
- Real-time collaboration (two admins editing the same applicant simultaneously).
- Mobile native apps. PWA wrapper is allowed but not required.
- Bulk import from CSV (v1.1).
- AI/ML features (auto-categorization, lead scoring, etc.).
- Public API for third-party integrations (defer until at least 2 paying tenants ask).

---

## Open Questions

1. Confirm email provider used for confirmation emails today (read `src/lib/`). If it's Resend, reuse; if it's Gmail SMTP, evaluate switching.
2. Existing rows in Google Sheets: import as v1 launch task or leave behind?
3. Drive folder structure: keep existing one folder per applicant, or restructure for multi-tenant readiness?
4. Workspace branding scope: allow full theme replacement (logo, colors, fonts) in v1 settings, or limit to logo only?

---

## Acceptance Criteria for v1 Launch

Before flipping the new admin live and turning off the Sheets-based workflow:

- [ ] Every feature in Modules 1–11 implemented and verified on mobile + desktop.
- [ ] Existing applications imported (or migration plan documented).
- [ ] Public-form writes go to Postgres; PDFs regenerate on demand from current data (no immutable snapshot).
- [ ] All security acceptance criteria from `SECURITY.md` met.
- [ ] All mobile acceptance criteria from `MOBILE.md` met.
- [ ] At least 2 weeks of dual-write / shadow-run against existing Sheets pipeline before cutover.
- [ ] Owner trained on every feature and signs off.
