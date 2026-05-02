# CMS Data Model (Postgres / Neon)

**Status:** Draft
**Co-authors:** Claude (lead), Codex (audit-log + contacts schema input)
**Created:** 2026-05-01

This is the canonical schema for the CMS. The implementation will use a migration tool (Drizzle ORM or Kysely + node-pg-migrate — chosen at implementation time). Schema is versioned in `migrations/` and every change is forward-only.

`neon_auth.*` tables are managed by Better Auth and not modified here.

---

## Conventions

- All primary keys are `uuid` generated server-side via `gen_random_uuid()` (pgcrypto extension).
- All tables have `created_at timestamptz not null default now()`.
- Mutable rows have `updated_at timestamptz not null default now()` plus a trigger that updates it on `UPDATE`.
- Soft-deleted rows use `deleted_at timestamptz null`. App queries always include `where deleted_at is null` unless explicitly fetching deleted rows.
- All tables that hold tenant data have a `workspace_id uuid not null` column with RLS policies keyed off it. Multi-tenant readiness is built in from day one.
- Foreign keys use `on delete restrict` by default. Soft-deletable parents use `on delete cascade` only on join tables.
- Money is stored as integer cents (`amount_cents`), never as floating-point. Currency is `currency_code text not null default 'usd'`.
- Email columns use `citext` (case-insensitive text) extension.
- Phone numbers stored normalized to E.164 (`+15551234567`).

### Required Postgres extensions

```sql
create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;  -- for fast fuzzy search on names
create extension if not exists btree_gin; -- for jsonb path indexes
```

---

## Tables

### `workspaces`

A workspace is a tenant on the platform. ItsRellEstate is workspace #1.

```sql
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  primary_contact_email citext not null,
  logo_url text null,
  timezone text not null default 'America/New_York',
  brand_primary_color text null,            -- '#RRGGBB' or null = default
  policies jsonb not null default '{}',     -- session timeout, 2FA required, etc.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `users` (joined with `neon_auth.user`)

Better Auth owns the canonical user row in `neon_auth.user`. The CMS extends it with workspace-scoped membership info.

We do NOT duplicate user identity into our own table. Instead, a `memberships` table joins users to workspaces with role and permissions.

### `roles`

```sql
create table roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  key text not null,                        -- 'owner', 'admin', 'employee', 'viewer', or custom
  label text not null,
  is_system boolean not null default false, -- system roles cannot be edited or deleted
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, key)
);
```

System roles (`owner`, `admin`, `employee`, `viewer`) are seeded automatically when a workspace is created.

### `permissions` (compile-time registry, not a DB table)

Permission keys live in code (`cms/core/registry/permissions.ts`). Examples:

```
applications.read
applications.create
applications.update
applications.delete
applications.payment.update
applications.payment.refund
applications.files.upload
applications.files.delete
applications.email.send
applications.notes.update
contacts.read
contacts.create
contacts.update
contacts.delete
contacts.subscriptions.update
audit_log.read
audit_log.export
settings.account.update
settings.team.invite
settings.team.role.update
settings.team.deactivate
settings.workspace.update
settings.email_templates.read
settings.email_templates.update
```

### `role_permissions`

Maps roles to permission keys. This is the joinable, editable middle layer that supports custom roles per workspace.

```sql
create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_key text not null,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create index on role_permissions (permission_key);
```

System roles are seeded with the matrix from `SECURITY.md` §2.

### `memberships`

Joins Better Auth users to workspaces with a role.

```sql
create table memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null,                     -- references neon_auth.user.id
  role_id uuid not null references roles(id),
  status text not null default 'active',     -- 'active', 'invited', 'deactivated'
  invited_by_user_id uuid null,
  invited_at timestamptz null,
  accepted_at timestamptz null,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index on memberships (user_id);
create index on memberships (workspace_id, status);
```

### `contacts`

The unified contact record. One row per real-world person, deduplicated by email primarily.

```sql
create table contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  display_name text null,                    -- best-known display name
  primary_email citext null,
  primary_phone text null,                   -- E.164
  labels text[] not null default '{}',       -- ['tenant', 'landlord', 'subscriber', 'lead']
  subscription_prefs jsonb not null default '{
    "email": {"marketing": true, "transactional": true},
    "sms": {"marketing": false, "transactional": false}
  }',
  custom_fields jsonb not null default '{}', -- per-workspace custom fields, v1.1+
  merged_into_contact_id uuid null references contacts(id) on delete set null,
  notes text null,                           -- contact-level notes (separate from per-app notes)
  last_activity_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index on contacts (workspace_id, primary_email) where deleted_at is null;
create index on contacts (workspace_id, primary_phone) where deleted_at is null;
create index on contacts using gin (workspace_id, labels) where deleted_at is null;
create index on contacts using gin (display_name gin_trgm_ops);
create index on contacts (workspace_id, last_activity_at desc) where deleted_at is null;
```

### `contact_identities`

Multiple identifiers per contact (alternate emails, phones). Supports merge/unmerge without losing source attribution.

```sql
create table contact_identities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  kind text not null,                        -- 'email' | 'phone'
  value text not null,                       -- citext for emails (cast at query time)
  is_primary boolean not null default false,
  source text not null,                      -- 'apply_form' | 'contact_form' | 'subscribe' | 'manual'
  source_id uuid null,                       -- foreign reference to source table row
  verified_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (workspace_id, kind, value)
);

create index on contact_identities (contact_id);
create index on contact_identities (workspace_id, kind, value);
```

### `applications`

The core entity. One row per submitted application.

```sql
create table applications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete restrict,
  applicant_type text not null,              -- 'tenant' | 'landlord'

  -- Submission metadata
  submitted_at timestamptz not null,         -- when the public form was submitted

  -- The application (single canonical state, edited in place)
  data jsonb not null,                       -- form fields, edited in place via CMS
  status text not null default 'unpaid',     -- 'unpaid' | 'paid' | 'waived' | 'refunded'
  payment_method text null,                  -- 'stripe' | 'cash' | 'zelle' | 'venmo' | 'other'
  amount_cents integer null,
  currency_code text not null default 'usd',
  waived_reason text null,

  -- Stripe linkage
  stripe_payment_intent_id text null,
  stripe_invoice_id text null,
  stripe_customer_id text null,

  -- Drive linkage (per-applicant folder for uploaded files only — PDFs are not stored here)
  drive_folder_id text null,

  -- Cached counts (denormalized for table speed)
  files_count integer not null default 0,
  notes_present boolean not null default false,
  emails_sent_count integer not null default 0,

  notes text null,                           -- per-application notes

  -- Custom fields (v1.1)
  custom_fields jsonb not null default '{}',

  -- Soft delete
  deleted_at timestamptz null,
  deleted_by_user_id uuid null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on applications (workspace_id, applicant_type, status, submitted_at desc) where deleted_at is null;
create index on applications (workspace_id, contact_id) where deleted_at is null;
create index on applications (workspace_id, status, updated_at desc) where deleted_at is null;
create index on applications using gin (data jsonb_path_ops);
create index on applications (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
```

`data` JSONB shape follows the existing public form schema; documented separately in `cms/modules/applications/schema.ts`.

### `application_files`

```sql
create table application_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  drive_file_id text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by_user_id uuid null,             -- null when uploaded via public form
  upload_source text not null,               -- 'public_form' | 'cms_upload'
  category text null,                        -- 'id_doc' | 'lease' | 'income_proof' | 'other'
  deleted_at timestamptz null,
  deleted_by_user_id uuid null,
  created_at timestamptz not null default now()
);

create index on application_files (workspace_id, application_id) where deleted_at is null;
create index on application_files (drive_file_id);
```

### `payments`

A separate table for richer payment history (vs the denormalized fields on `applications`).

```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  method text not null,                      -- 'stripe' | 'cash' | 'zelle' | 'venmo' | 'other'
  amount_cents integer not null,
  currency_code text not null default 'usd',
  status text not null,                      -- 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partial_refund'
  stripe_payment_intent_id text null,
  stripe_charge_id text null,
  recorded_by_user_id uuid null,             -- null for Stripe webhook auto-record
  notes text null,
  created_at timestamptz not null default now()
);

create index on payments (workspace_id, application_id, created_at desc);
create index on payments (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
```

### `refunds`

```sql
create table refunds (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  payment_id uuid not null references payments(id) on delete restrict,
  application_id uuid not null references applications(id) on delete restrict,
  amount_cents integer not null,
  reason text null,
  stripe_refund_id text null,
  status text not null,                      -- 'pending' | 'succeeded' | 'failed'
  issued_by_user_id uuid not null,
  created_at timestamptz not null default now()
);

create index on refunds (workspace_id, application_id, created_at desc);
create index on refunds (stripe_refund_id) where stripe_refund_id is not null;
```

### `email_templates`

```sql
create table email_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  key text not null,                         -- machine-readable key, unique per workspace
  label text not null,
  subject text not null,
  body text not null,
  description text null,
  is_archived boolean not null default false,
  created_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create index on email_templates (workspace_id, is_archived);
```

### `email_template_versions`

Versioned template history; each `email_templates` update produces a new version.

```sql
create table email_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references email_templates(id) on delete cascade,
  version int not null,
  subject text not null,
  body text not null,
  edited_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create index on email_template_versions (template_id, version desc);
```

### `sent_emails`

```sql
create table sent_emails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  application_id uuid null references applications(id) on delete set null,
  contact_id uuid not null references contacts(id) on delete restrict,
  template_id uuid null references email_templates(id) on delete set null,
  template_version int null,
  to_email citext not null,
  reply_to_email citext null,
  from_email citext not null,
  subject text not null,
  body text not null,                        -- final rendered body
  body_hash text not null,                   -- sha256 of body for audit referencing without bloat
  provider text not null,                    -- 'resend' | 'gmail' | etc.
  provider_message_id text null,
  status text not null,                      -- 'queued' | 'sent' | 'failed' | 'bounced'
  error_text text null,
  sent_by_user_id uuid not null,
  created_at timestamptz not null default now()
);

create index on sent_emails (workspace_id, application_id, created_at desc);
create index on sent_emails (workspace_id, contact_id, created_at desc);
create index on sent_emails (workspace_id, sent_by_user_id, created_at desc);
```

### `contact_messages`

Submissions from the public Contact page (different from applications).

```sql
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete restrict,
  subject text null,
  body text not null,
  source text not null default 'contact_form',
  status text not null default 'new',        -- 'new' | 'replied' | 'archived'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on contact_messages (workspace_id, status, created_at desc);
create index on contact_messages (contact_id, created_at desc);
```

### `subscribers`

Anyone who used the subscribe form.

```sql
create table subscribers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  source text not null,                      -- 'subscribe_form' | 'apply_form_optin' | 'manual'
  unsubscribed_at timestamptz null,
  unsubscribed_reason text null,
  created_at timestamptz not null default now()
);

create index on subscribers (workspace_id, contact_id);
```

### `audit_log`

Per Codex's design with our adjustments. Append-only.

```sql
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  workspace_id uuid not null,                -- not FK because we want logs to survive workspace deletes for forensics
  actor_user_id uuid null,
  actor_type text not null,                  -- 'user' | 'system' | 'api' | 'public'
  actor_label text null,                     -- denormalized name; survives user changes
  action text not null,                      -- e.g. 'application.update', 'auth.login.failed'
  entity_type_id smallint not null,          -- registry id, see entity_types table below
  entity_id uuid null,
  parent_entity_type_id smallint null,
  parent_entity_id uuid null,
  target_label text null,                    -- denormalized display label
  ip inet null,
  user_agent text null,
  request_id uuid null,
  changes jsonb null,                        -- {"fields": {"status": {"before": "unpaid", "after": "paid"}}}
  snapshot_before jsonb null,                -- for create/delete/refund
  snapshot_after jsonb null,
  metadata jsonb null,                       -- refund id, email subject, file id, etc.

  -- Tamper-evidence chain
  prev_hash text null,                       -- hash of the previous row for the workspace
  row_hash text null                         -- hash of this row including prev_hash
);

create index audit_subject_idx
  on audit_log (workspace_id, entity_type_id, entity_id, occurred_at desc);
create index audit_parent_subject_idx
  on audit_log (workspace_id, parent_entity_type_id, parent_entity_id, occurred_at desc);
create index audit_actor_week_idx
  on audit_log (workspace_id, actor_user_id, occurred_at desc);
create index audit_action_time_idx
  on audit_log (workspace_id, action, occurred_at desc);
create index audit_changes_gin_idx
  on audit_log using gin (changes jsonb_path_ops);
```

A nightly cron computes the chain hashes and writes the latest hash to a separate `audit_chain_state` table:

```sql
create table audit_chain_state (
  workspace_id uuid primary key,
  latest_audit_id uuid not null,
  latest_row_hash text not null,
  computed_at timestamptz not null
);
```

### `entity_types` (compile-time, mirrored to a registry table for joinability)

```sql
create table entity_types (
  id smallint primary key,
  key text not null unique,                  -- 'application', 'contact', 'user', 'session', etc.
  label text not null
);
```

Seeded once at migration time. Application code references entity types by key, mapped to id at lookup time.

### `tasks` (v1.1, schema reserved now)

```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  description text null,
  due_at timestamptz null,
  assigned_to_user_id uuid null,
  related_entity_type_id smallint null,
  related_entity_id uuid null,
  status text not null default 'open',       -- 'open' | 'in_progress' | 'done' | 'cancelled'
  completed_at timestamptz null,
  created_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on tasks (workspace_id, status, due_at);
create index on tasks (assigned_to_user_id, status, due_at);
```

### `saved_views` (v1.1, schema reserved now)

```sql
create table saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null,
  entity_type_id smallint not null,
  name text not null,
  filter jsonb not null,
  sort jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on saved_views (workspace_id, user_id, entity_type_id);
```

---

## Row-Level Security (RLS)

Enable RLS on every PII-bearing table:

```sql
alter table contacts enable row level security;
alter table contact_identities enable row level security;
alter table applications enable row level security;
alter table application_files enable row level security;
alter table payments enable row level security;
alter table refunds enable row level security;
alter table email_templates enable row level security;
alter table email_template_versions enable row level security;
alter table sent_emails enable row level security;
alter table contact_messages enable row level security;
alter table subscribers enable row level security;
alter table audit_log enable row level security;
alter table tasks enable row level security;
alter table saved_views enable row level security;
alter table memberships enable row level security;
alter table roles enable row level security;
alter table role_permissions enable row level security;
```

Standard policy template (one per table):

```sql
create policy tenant_isolation on contacts
  using (workspace_id = current_setting('app.workspace_id')::uuid)
  with check (workspace_id = current_setting('app.workspace_id')::uuid);
```

The application sets `app.workspace_id` per request via `SET LOCAL` after authenticating the session.

`audit_log` adds a stricter policy:

```sql
-- Read: scoped to workspace.
create policy audit_read on audit_log
  for select
  using (workspace_id = current_setting('app.workspace_id')::uuid);

-- Insert: scoped to workspace.
create policy audit_insert on audit_log
  for insert
  with check (workspace_id = current_setting('app.workspace_id')::uuid);

-- No update or delete policies = no UPDATE or DELETE permitted (append-only).
```

---

## Permission Enforcement at the DB Boundary

Beyond RLS, the connecting app role uses a least-privilege Postgres role that has:

- `SELECT, INSERT, UPDATE` on regular tables.
- `INSERT` only on `audit_log`.
- No `DELETE` on `audit_log` or `audit_chain_state`.
- Migrations run with a separate elevated role.

---

## Triggers

### `updated_at` triggers

```sql
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

-- Applied to every table with an updated_at column:
create trigger set_updated_at_<table> before update on <table>
  for each row execute function set_updated_at();
```

### Audit-log emit trigger (optional alternative)

We can choose between:

1. **App-level emit** (recommended for v1) — Every server action calls `auditLog.write(...)` after its DB write. Cleaner and gives us request context (IP, user agent, request id).
2. **DB-level trigger emit** — Trigger on each table writes to `audit_log`. Catches direct DB edits but loses request context.

Choose option 1 for v1. Document the gap (direct DB edits don't audit) and mitigate by removing direct DB access from production.

---

## Indexes Summary

Listed inline above; key principles:

- Always include `workspace_id` as the leading column in compound indexes.
- Always include the `where deleted_at is null` predicate for soft-delete filters.
- Use `gin` for JSONB containment and array containment (`labels`).
- Use `pg_trgm` GIN for fuzzy name search.

---

## Migrations

Initial migration `001_init.sql` creates:

1. Extensions (`pgcrypto`, `citext`, `pg_trgm`, `btree_gin`).
2. Tables (in dependency order: workspaces → roles → role_permissions → memberships → contacts → contact_identities → applications → application_files → payments → refunds → email_templates → email_template_versions → sent_emails → contact_messages → subscribers → entity_types → audit_log → audit_chain_state).
3. Seeds for `entity_types` (registry of stable IDs).
4. Seeds for default system roles (created with workspace creation, not at migration time).
5. RLS policies on every table.
6. Triggers for `updated_at`.

A separate migration creates an `itsrellestate` workspace as the first tenant and seeds Nyrell's owner membership.

---

## Migration Plan from Sheets

A one-time migration script reads existing rows from the production Google Sheet (currently the source of truth) and writes them into Postgres. Steps:

1. For each tenant/landlord row, extract structured fields. Apply current schema (Zod) for validation; rows that fail validation go to a quarantine list for manual review.
2. Look up or create a `contact` by normalized email.
3. Insert into `applications` with `submitted_at` = the sheet timestamp and `data` = the sanitized fields. Existing PDFs in Drive are not migrated — PDFs regenerate from `data` on demand from now on.
4. Existing uploaded files (IDs, leases, etc.) in Drive: walk per-applicant folders and register them in `application_files`.
5. Stripe linkage: where Stripe invoice IDs are recorded in the sheet, look them up via Stripe API and populate `stripe_*` columns + `payments` row.

The migration is idempotent and runs in a transaction per applicant; partial failure can be retried.

---

## Open Schema Questions

1. **`data` field shape:** define the strict shape of `applications.data` for tenants vs landlords as a TypeScript-discriminated-union backed by Zod. Do this in `cms/modules/applications/schema.ts` rather than the DB.
2. **Custom fields validation:** v1.1 will need a per-workspace schema definition for `custom_fields` JSONB. Decide whether to validate in app or via Postgres `CHECK` constraints.
3. **Currency handling:** assume `usd` for v1. If we ever ship internationally, revisit `currency_code` and presentation-layer formatting.
4. **Contact-application unique constraint:** can the same contact have multiple applications open? Yes (real-world: a tenant might apply twice). No DB constraint blocks this; the "Group by email" UI handles surfacing.
5. **Email body storage:** storing full body in `sent_emails.body` is convenient but bloats the table. Consider moving to S3 / Drive after 90 days with body_hash kept in DB. Defer to v2.
