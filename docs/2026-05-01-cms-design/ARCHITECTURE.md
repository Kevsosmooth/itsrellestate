# CMS Architecture (Modular / White-Label-Ready)

**Status:** Draft
**Co-authors:** Claude (lead), Codex (modular structure input)
**Created:** 2026-05-01

This is the structural blueprint for the CMS. Folder layout, module boundaries, adapter interfaces, registries. Where the business of "ItsRellEstate" lives vs the platform code that any client could use.

The goal is concrete: a developer should be able to fork this codebase, edit one tenant config folder, swap a few adapters, and have a different client's CMS running in a few hours.

---

## Three Layers

```
┌──────────────────────────────────────────────────────┐
│ Layer 3 — Tenant configuration                       │
│   src/cms/tenants/itsrellestate/                     │
│   What this client cares about. Labels, colors,      │
│   adapters (Drive vs S3), enabled modules, custom    │
│   permissions. Pure config.                          │
└──────────────────────────────────────────────────────┘
              ▲
              │ registers
              │
┌──────────────────────────────────────────────────────┐
│ Layer 2 — Modules                                    │
│   src/cms/modules/<entity>/                          │
│   One folder per business entity (applications,      │
│   contacts, payments, audit, etc.). Self-contained:  │
│   schema, columns, detail view, mobile card,         │
│   service, permissions defaults.                     │
└──────────────────────────────────────────────────────┘
              ▲
              │ uses
              │
┌──────────────────────────────────────────────────────┐
│ Layer 1 — Platform core                              │
│   src/cms/core/                                      │
│   Auth, RBAC, audit log, registries, adapters,       │
│   shell UI (sidebar, top bar), data grid, mobile     │
│   card list, forms, hooks.                           │
└──────────────────────────────────────────────────────┘
```

Layer 1 knows nothing about real estate. Layer 2 knows nothing about ItsRellEstate. Layer 3 ties everything together for one tenant.

---

## Folder Structure

```
src/
  app/
    (public)/              # Existing public site routes
    apply/
    privacy/
    terms/
    admin/                 # CMS routes — thin shells delegating to cms/core
      layout.tsx
      page.tsx             # Dashboard home
      login/
        page.tsx
      forgot-password/
        page.tsx
      reset-password/[token]/
        page.tsx
      [entity]/
        page.tsx           # Generic table page; reads entity registry
        [id]/
          page.tsx         # Generic detail page; reads entity registry
          pdf/
            page.tsx       # Inline PDF viewer
      audit/
        page.tsx
      settings/
        layout.tsx
        page.tsx
        account/page.tsx
        team/page.tsx
        workspace/page.tsx
        email-templates/page.tsx
        security/page.tsx
      __styleguide/        # Dev-only, NODE_ENV !== 'production'
        page.tsx
      api/                 # Route handlers (auth, refunds, file uploads, PDFs)
        applications/
          [id]/
            pdf/route.ts
        ...

  cms/
    core/
      registry/
        entities.ts        # Registers entities with their modules
        permissions.ts     # Compile-time permission keys
        navigation.ts      # Sidebar/tab/bottom-nav structure
        themes.ts          # Theme tokens registry
        entity-types.ts    # Stable smallint -> key mapping for audit_log

      auth/
        better-auth.ts     # Better Auth client/server setup
        require-permission.ts
        session.ts
        middleware.ts

      audit/
        write.ts           # auditLog.write({...})
        timeline.tsx       # Reusable timeline component
        chain.ts           # Tamper-evidence chain helpers

      adapters/
        db/
          index.ts         # postgres pool + per-request workspace_id setting
          types.ts
        file-storage/
          types.ts         # FileStorage interface
          drive.ts         # Drive implementation
          s3.ts            # (stub for v2)
          local.ts         # (dev fallback)
        email/
          types.ts         # EmailService interface
          resend.ts
        payments/
          types.ts         # PaymentService interface
          stripe.ts

      ui/
        shell/
          AdminLayout.tsx
          TopBar.tsx
          Sidebar.tsx
          BottomTabs.tsx
          UserMenu.tsx
        data-grid/
          DataGrid.tsx     # Desktop table
          ColumnDef.ts
          ColumnVisibility.tsx
          FilterChips.tsx
          GroupByEmail.tsx
        mobile-list/
          CardList.tsx     # Virtualized mobile card stack
          CardSkeleton.tsx
        sheets/
          BottomSheet.tsx
          RightDrawer.tsx
          ConfirmationDialog.tsx
        forms/
          FieldText.tsx
          FieldTextarea.tsx
          FieldSelect.tsx
          FieldDate.tsx
          FieldFileUpload.tsx
          FormShell.tsx
        feedback/
          Toast.tsx
          ProgressBar.tsx
          EmptyState.tsx
          PermissionDenied.tsx
        chips/
          StatusChip.tsx
          LabelChip.tsx
          CountBadge.tsx
        pdf/
          InlinePDFViewer.tsx
          FullScreenPDFViewer.tsx

      hooks/
        usePermission.ts
        useWorkspace.ts
        useTopProgress.ts
        useDebounce.ts
        useColumnRegistry.ts
        useSavedView.ts

      types/
        Entity.ts          # type Entity<T> with key, schema, columns, etc.
        Permission.ts
        AuditEvent.ts
        ServerActionResult.ts

    modules/
      applications/
        entity.ts          # registerEntity({...})
        schema.ts          # Zod schemas for tenant + landlord variants
        columns.ts         # Column registry (desktop + mobile priorities)
        filters.ts
        detail-view.tsx
        mobile-card.tsx
        service.ts         # CRUD operations, permission checks
        permissions.ts     # Default permission map for this module

      contacts/
        ...

      payments/
        ...

      audit-log/
        ...

      settings/
        account/
        team/
        workspace/
        email-templates/
        security/

      notes/
        ...

      email-templates/
        ...

      team/
        ...

    tenants/
      itsrellestate/
        index.ts           # Composes enabled modules, adapters, theme
        theme.ts           # Tailwind token overrides
        navigation.ts      # Custom nav order/labels
        permissions.ts     # Workspace-specific permission tweaks
        adapters.ts        # Drive + Stripe + Resend wiring
        labels.ts          # "Tenants" vs "Applicants" wording, etc.

      _template/           # Starting kit for new tenants
        index.ts
        theme.ts
        ...

  lib/                     # Existing project libs (Stripe, Google, etc.)
    db/                    # New — postgres pool helpers
    google/
    stripe/
    pdf/                   # Existing pdf-lib helpers, may move
```

---

## Module Contract

Every module in `cms/modules/<entity>/` exports a single `entity.ts` that calls `registerEntity()`:

```ts
// cms/modules/applications/entity.ts

import { registerEntity } from '@/cms/core/registry/entities';
import { applicationSchema } from './schema';
import { applicationColumns } from './columns';
import { ApplicationDetailView } from './detail-view';
import { ApplicationMobileCard } from './mobile-card';
import { applicationService } from './service';
import { applicationPermissions } from './permissions';

registerEntity({
  key: 'application',
  label: { singular: 'Application', plural: 'Applications' },
  routes: {
    table: '/admin/applications',
    detail: '/admin/applications/[id]',
  },
  schema: applicationSchema,
  columns: applicationColumns,
  detailView: ApplicationDetailView,
  mobileCard: ApplicationMobileCard,
  service: applicationService,
  permissions: applicationPermissions,
  searchableFields: ['display_name', 'primary_email', 'primary_phone'],
  features: {
    pdfExport: true,
    emailCompose: true,
    paymentTracking: true,
    fileAttachments: true,
    notes: true,
  },
});
```

The platform reads the registry to render generic table and detail pages. Modules can override the detail view entirely or use the default shell with custom tab content.

---

## Permission Registry

```ts
// cms/core/registry/permissions.ts

export const permissions = {
  applications: {
    read: 'applications.read',
    create: 'applications.create',
    update: 'applications.update',
    delete: 'applications.delete',
    payment: {
      update: 'applications.payment.update',
      refund: 'applications.payment.refund',
    },
    files: {
      upload: 'applications.files.upload',
      delete: 'applications.files.delete',
    },
    email: {
      send: 'applications.email.send',
    },
    notes: {
      update: 'applications.notes.update',
    },
  },
  contacts: { ... },
  audit_log: { read: 'audit_log.read', export: 'audit_log.export' },
  settings: { ... },
} as const;

export type PermissionKey = ValuesOf<typeof permissions>; // string union of all keys
```

Server routes call `requirePermission(permissions.applications.update, { workspaceId, entityId })`. Throws 403 if denied; 403 is logged to audit log as `permission_denied`.

---

## Adapter Interfaces

### File storage

```ts
// cms/core/adapters/file-storage/types.ts

export interface FileStorage {
  put(input: { workspaceId: string; folderHint: string; filename: string; mimeType: string; bytes: Buffer | ReadableStream }): Promise<{ id: string }>;
  get(input: { workspaceId: string; id: string }): Promise<{ stream: ReadableStream; mimeType: string; size: number; filename: string }>;
  delete(input: { workspaceId: string; id: string }): Promise<void>;
  signedUrl(input: { workspaceId: string; id: string; ttlSeconds?: number }): Promise<string>;
  ensureFolder(input: { workspaceId: string; key: string }): Promise<{ id: string }>;
}
```

`drive.ts` implements this against Google Drive (existing `googleapis` integration). `s3.ts` will implement against S3 in v2. `local.ts` writes to disk for dev.

### Email

```ts
export interface EmailService {
  send(input: {
    workspaceId: string;
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    body: string;
    bodyType: 'text' | 'html';
    headers?: Record<string, string>;
  }): Promise<{ id: string; provider: string }>;
}
```

`resend.ts` (or whatever the existing email provider is) implements this.

### Payments

```ts
export interface PaymentService {
  refund(input: {
    workspaceId: string;
    paymentIntentId: string;
    amountCents?: number;
    reason?: string;
    idempotencyKey: string;
  }): Promise<{ refundId: string; status: 'succeeded' | 'pending' | 'failed' }>;
  // ... other Stripe operations as needed
}
```

`stripe.ts` implements this.

### DB

A typed Postgres pool wrapper that sets `app.workspace_id` per request:

```ts
export async function withWorkspace<T>(
  workspaceId: string,
  fn: (db: TypedDB) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("SET LOCAL app.workspace_id = $1", [workspaceId]);
    return await fn(wrap(client));
  } finally {
    client.release();
  }
}
```

Every server action that touches tenant data does so via `withWorkspace(...)`.

---

## Tenant Configuration

```ts
// cms/tenants/itsrellestate/index.ts

import { defineTenant } from '@/cms/core/types/Tenant';
import { theme } from './theme';
import { navigation } from './navigation';
import { permissions } from './permissions';
import { adapters } from './adapters';
import { labels } from './labels';

export default defineTenant({
  key: 'itsrellestate',
  workspaceSlug: 'itsrellestate',
  modules: ['applications', 'contacts', 'payments', 'audit-log', 'settings', 'notes', 'email-templates', 'team'],
  theme,
  navigation,
  permissions,
  adapters,
  labels,
});
```

```ts
// cms/tenants/itsrellestate/adapters.ts

import { driveStorage } from '@/cms/core/adapters/file-storage/drive';
import { resendEmail } from '@/cms/core/adapters/email/resend';
import { stripePayments } from '@/cms/core/adapters/payments/stripe';

export const adapters = {
  fileStorage: driveStorage(/* env-specific config */),
  email: resendEmail(/* env-specific config */),
  payments: stripePayments(/* env-specific config */),
};
```

A second tenant might swap Drive for S3 and Resend for Postmark with three lines.

---

## Theme Override

```ts
// cms/tenants/itsrellestate/theme.ts

export const theme = {
  primaryColor: '#3B82F6',     // resolved into Tailwind tokens at build time
  brandColor: '#FF7A6B',
  loginBackgroundUrl: '/itsrellestate/login-bg.jpg',
};
```

Tokens are CSS custom properties scoped to a `data-tenant="itsrellestate"` attribute on `<html>`. The platform reads the active tenant's theme and applies it once at session start.

White-label clients can override only the keys we expose in the theme schema. Layout, spacing, type scale, radii are not overridable — that would break the design system.

---

## Routing Strategy

The CMS routes use Next.js App Router catch-all dynamic segments to drive entity-specific pages from a single route file:

```
/admin/[entity]              → src/app/admin/[entity]/page.tsx
/admin/[entity]/[id]         → src/app/admin/[entity]/[id]/page.tsx
```

The page component reads `[entity]`, looks it up in the entity registry, and renders the appropriate column registry / detail view. This way adding a new module (e.g., `tasks`) doesn't require new route files; only a `cms/modules/tasks/` folder + a registry entry.

Some routes are still explicit (`/admin/audit`, `/admin/settings/*`) because they're not entity-CRUD pages.

---

## Server Actions and Route Handlers

Conventions:

- **Server Actions** for form submissions, mutations originating from React components.
- **Route handlers (`route.ts`)** for endpoints that need explicit HTTP semantics (file streaming, webhooks, PDF generation, OAuth callbacks).

Every mutation:

1. Authenticates the session (`Better Auth`).
2. Loads the membership and resolves the workspace + role.
3. Calls `requirePermission()` with the action and resource context.
4. Validates input via Zod.
5. Wraps the DB work in `withWorkspace(workspaceId, ...)` so RLS is engaged.
6. Calls the relevant service in `cms/modules/<entity>/service.ts`.
7. Writes an audit log entry on success or permission_denied.
8. Returns a typed `ServerActionResult` so the UI can branch on success / error.

```ts
type ServerActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string> } };
```

---

## Custom Fields (v1.1, designed now)

```ts
// per-workspace custom field definitions stored in workspace settings
type CustomFieldDef = {
  key: string;                            // 'preferred_move_in_date'
  label: string;                          // 'Preferred move-in date'
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  options?: string[];                     // for 'select'
  required?: boolean;
  showInTable?: boolean;
  showInDetail?: boolean;
  appliesTo: ('application' | 'contact')[];
};
```

Stored in `workspaces.policies.custom_fields` JSONB. UI renders custom fields automatically in detail views and (optionally) tables.

---

## Internationalization (Reserved Hooks)

Not in v1, but every user-facing string in the CMS is wrapped through a `t()` function so we can plug in next-intl or react-intl in v2.

```ts
import { t } from '@/cms/core/i18n';
<button>{t('actions.save')}</button>
```

For v1, `t()` is a passthrough that resolves keys to English. The wrapper is the prep work.

---

## Performance Budgets

- Admin route bundle: ≤ 250 KB gzipped per route after code split.
- First Contentful Paint: ≤ 1.5s on Pixel 5a / 4G (also in `MOBILE.md`).
- Database queries on the table page must complete in ≤ 200ms p95 with 10k rows in a workspace.
- Audit log queries: ≤ 100ms for "events for entity X" and "events by user Y this week."

---

## Testing Strategy

- **Unit tests** for adapters, utilities, schema validation.
- **Component tests** (React Testing Library) for UI primitives in `cms/core/ui/`.
- **Integration tests** (Playwright) for end-to-end flows: login → list → detail → edit → save → audit-log appears. Mobile viewport variants required for every flow.
- **DB tests** for RLS policies: positive (data within workspace visible) and negative (data from other workspace not visible) for every PII-bearing table.
- **Visual regression** on the styleguide page.

CI runs unit + component + RLS + lint + typecheck on every PR. Playwright runs nightly + before any production deploy.

---

## Migration Path from Today

The existing app already has `src/app/apply/`, `src/lib/google.ts`, etc. The CMS sits alongside, not replacing.

Steps:

1. Add `cms/core/` and `cms/modules/applications/` and `cms/tenants/itsrellestate/` folders with skeleton.
2. Add Postgres + Better Auth wiring to `lib/db/` and `cms/core/auth/`.
3. Run initial migration to create tables.
4. Dual-write: existing public form continues writing to Sheets and Drive AND now also writes the row to Postgres. (No PDF is generated at submission time anymore — Sheets writes stop generating PDFs to Drive in this phase too.)
5. Build CMS read-only against Postgres.
6. Build CMS write against Postgres (status changes, edits, notes, files, etc.).
7. Cut Sheets writes off after 2-week shadow period.
8. Existing `lib/pdf-tenant.ts` and `lib/pdf-landlord.ts` move to `cms/modules/applications/pdf/`. They generate from current `applications.data` only; no submission-time vs current-time distinction exists.

---

## What Codex Recommended That We're Following

- Three-layer split (core / modules / tenants).
- Adapters with typed interfaces for file storage, email, payments.
- Stable `entity_type_id` (smallint) to survive renames in audit log.
- Compile-time permission keys + DB role-permission mapping.
- Inline PDF preview via streamed server route + `<iframe>`.

## What Codex Recommended That We're Modifying

- Codex suggested a `[entity]` dynamic route alone; we keep some explicit routes for non-entity pages (settings, audit). Cleaner mental model.
- Codex's audit log diff strategy was good; we add the chained-hash tamper-evidence layer for a stronger compliance posture.
- Codex grouped custom fields with v1; we defer to v1.1 to keep launch focused.

---

## What's Explicitly NOT in This Architecture

- A plugin marketplace or extension API for third-party developers. Modules are first-party only in v1.
- Multi-database support. Postgres-only.
- Real-time sync via WebSockets. Polling + revalidation is sufficient for v1.
- Server-rendered tables with no JS hydration. We hydrate everything; performance budget covers it.

---

## Open Architectural Questions

1. **Drizzle vs Kysely vs raw SQL.** Drizzle for ergonomics, Kysely for typed query builder without ORM weight, raw SQL for control. Lean Kysely for v1 — strongly typed, no runtime, easy to reason about.
2. **React Query / SWR / native `use()`.** With Next.js 16 server components doing most fetching, client-side state is mostly form/UI. Use SWR for client cache where needed; avoid React Query in v1 to minimize bundle.
3. **Pagination strategy.** Keyset (cursor) or offset? Keyset is faster on large tables but harder to UX. Use offset for v1 (50/page), revisit if we hit a table with 50k+ rows.
4. **Rate limit storage.** Upstash Redis already exists; use it for rate limiting and short-lived caches.
5. **Background jobs.** Audit chain hashing, PDF regeneration, email retry — run as Vercel cron or a dedicated worker? Vercel cron is fine for v1 cadences (nightly, hourly).
