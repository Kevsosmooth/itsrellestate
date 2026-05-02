# CMS / CRM Design Pack

**Created:** 2026-05-01
**Owner:** Nyrell Nunez (product), Kevin Suriel (engineering)
**Co-design:** Claude (lead), Codex (mobile + UI advisor)
**Status:** Draft v1 — under review

This folder is the design and architecture spec for the ItsRellEstate CMS/CRM. It is foundational. Everything we build will trace back to a decision made here.

## Documents

| File | What it covers |
|------|----------------|
| `FEATURES.md` | Full feature scope: modules, routes, behaviors, v1 vs roadmap. |
| `SECURITY.md` | Auth, RBAC, audit trail, RLS, rate limiting, headers, refund authorization, GDPR readiness. Foundational. |
| `MOBILE.md` | Mobile-first rules: breakpoints, table-to-card pattern, sheets, file upload, PDF preview, performance targets. Foundational. |
| `DESIGN.md` | Visual system: tokens, layout, sidebar, tables, detail views, forms, dialogs, buttons, chips, audit timeline, accessibility. |
| `DATA-MODEL.md` | Postgres schema: every table, every index, RLS policies, triggers, migrations, Sheets-to-Postgres migration plan. |
| `ARCHITECTURE.md` | Three-layer modular structure (core / modules / tenants) for white-label resale. Adapter interfaces, registries, routing strategy. |

## Read Order

1. `FEATURES.md` — what we're building.
2. `SECURITY.md` and `MOBILE.md` — the foundations everything must satisfy.
3. `DESIGN.md` — what it looks like.
4. `DATA-MODEL.md` — how data flows.
5. `ARCHITECTURE.md` — how the code is organized.

## Review Process

Per Nyrell's direction (2026-05-01):

1. Claude leads the initial design pass (this draft).
2. Nyrell reviews and pushes back. Iterate until aligned.
3. Codex independently reviews and votes on each major section. Iterate.
4. Implementation begins only after both review rounds.
5. Post-implementation: one more joint review against the spec to confirm reality matches the doc.

## Local Dev Port

The CMS dev server runs on **port 3075** (separate from the public site's existing dev server). This is documented in implementation tickets when work begins.

## Open Questions Across All Docs

Each doc has an "Open Questions" section at the bottom. These are decisions that should be resolved before implementation starts. Summary of the highest-leverage ones:

1. Confirm the email service used for current confirmation emails (see `FEATURES.md` Module 8 + `ARCHITECTURE.md` adapters).
2. Approach for migrating existing Sheets rows to Postgres (see `DATA-MODEL.md`).
3. Drawer-vs-page for application detail on desktop (see `DESIGN.md`).
4. Custom fields scope: v1 or v1.1? (Currently set to v1.1.)
5. ORM choice: Kysely vs Drizzle vs raw SQL (see `ARCHITECTURE.md`).

---

## Out of Scope for This Pack

- Stage-by-stage implementation plan. That's a separate doc once the design is approved.
- Wireframes / hi-fi mockups. We will produce these after Codex's UI review pass for the most complex screens (table, detail view, audit log, settings team management).
- Pricing or commercial terms for white-label resale.
