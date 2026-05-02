# CMS Design System

**Status:** Draft
**Co-authors:** Claude (lead), Codex (UI/mobile advisor)
**Created:** 2026-05-01

This is the visual + interaction system for the CMS. Mobile rules in `MOBILE.md`; security rules in `SECURITY.md`. This doc is what they all agree the surface looks and behaves like.

---

## Design Philosophy

Three rules:

1. **Quiet, not loud.** This is a tool people use for hours. No gradients, no big marketing flourishes, no party animations. Calm tones, generous spacing, predictable patterns. The Linear / Vercel / Stripe Dashboard family of taste.
2. **Information first.** The job is to surface the right data fast and let Rell act on it. Decoration is subordinate to legibility.
3. **One language across the public site and the CMS.** Tokens, fonts, and corner radii match the public marketing site so the CMS feels like the same product extended inward.

---

## Tokens (the Only Source of Truth)

Every visual value lives in `tailwind.config.ts` as a token. **No hex codes, rgb literals, or pixel values in components.** This is the existing project rule from `CLAUDE.md`; it applies tenfold in the CMS because we're building a white-label shell.

### Color tokens

The public site already defines a base palette. The CMS extends it with admin-specific tokens. All values are example placeholders here; final values are tuned in `tailwind.config.ts`.

#### Public site tokens (already in the project)

- `primary` — warm blue, CTAs and links
- `secondary` — soft coral, accents
- `dark` — charcoal, dark backgrounds
- `light` — off-white, default backgrounds
- `surface` — warm gray, card backgrounds
- `text-primary`, `text-secondary`, `text-muted`, `text-on-dark`
- `success`, `warning`, `error`

#### CMS-specific tokens (new)

Names map to admin contexts; values may reference public tokens or be tuned specifically:

- `admin-bg` — main canvas (light, neutral)
- `admin-surface` — card / panel surface (slightly off canvas)
- `admin-surface-raised` — modal / sheet surface (slightly higher contrast)
- `admin-border` — hairline borders, dividers
- `admin-border-strong` — emphasized dividers, focused outlines
- `admin-overlay` — modal/scrim overlay (semi-transparent dark)
- `admin-sidebar-bg` — sidebar canvas (slightly darker than main bg)
- `admin-sidebar-active` — active nav item background
- `admin-input-bg` — form input fill
- `admin-row-hover` — table row hover state
- `admin-row-selected` — table row selection state

#### Status / state tokens

- `status-unpaid` — neutral chip
- `status-paid` — success-tinted chip
- `status-waived` — info-tinted chip
- `status-refunded` — warning-tinted chip
- `audit-action-create`, `audit-action-update`, `audit-action-delete`, `audit-action-auth` — colored dots in the audit log timeline

#### Channel + RGBA tokens

For any color that needs alpha transparency, define an `--color-rgb: R, G, B` companion token and use `rgba(var(--color-rgb), alpha)` in CSS, per the global frontend rule. The CMS uses transparency on overlays, sheet backdrops, and skeleton placeholders.

### Dark mode

Dark mode is **v2**. v1 ships light only to keep launch focus tight. Tokens are structured so dark mode is a remap, not a rewrite. `next-themes` is already in the stack.

### Typography

- Body / UI: `Plus Jakarta Sans` (existing project font).
- Monospace (timestamps, IDs): a project-defined mono token. Default to system monospace stack until we pick one.
- No second display font for v1.

Type scale (Tailwind tokens, all are configured already in the project):

- `text-xs` — captions, dense table cells
- `text-sm` — table body, form labels
- `text-base` — primary body text
- `text-lg` — section headings within a page
- `text-xl` — page titles on mobile
- `text-2xl` — page titles on desktop
- `text-3xl+` — only on dashboard hero numbers

### Spacing scale

Tailwind defaults (4px grid). Components use the scale; never raw pixels.

Common spacings used by the CMS:

- `gap-2` (8px) — chip and badge spacing
- `gap-3` (12px) — table cell padding
- `gap-4` (16px) — card padding, form field spacing
- `gap-6` (24px) — section spacing within a page
- `gap-8` (32px) — between page-level sections
- `gap-10` (40px) — top of page to first section

### Radii

- `rounded-sm` (2px) — chips, dense controls
- `rounded` (4px) — table cells
- `rounded-md` (6px) — buttons, inputs
- `rounded-lg` (8px) — cards, panels
- `rounded-xl` (12px) — sheets, modals on desktop
- `rounded-2xl` (16px) — sheets on mobile (top corners only)
- `rounded-full` — avatars, pill chips

### Shadows

Shadows are subtle in v1. No more than three:

- `shadow-sm` — table row hover
- `shadow` — cards
- `shadow-lg` — sheets, popovers, dropdown menus

### Motion

- Default ease: `ease-out` for entrance, `ease-in-out` for state transitions.
- Default duration: 150ms for micro (hover, focus), 250ms for medium (sheet open, tab change), 350ms for macro (page transition if any).
- All motion respects `prefers-reduced-motion: reduce` — durations drop to 0 (instant) and crossfades replace slides.

---

## Layout Architecture

### Mobile (default)

Detailed in `MOBILE.md`. Recap:

- Top bar 56px tall, sticky.
- Main content full width, 16px horizontal padding.
- Bottom tab bar 56px tall, sticky, respects safe-area inset.
- Sheets slide from bottom; drawers slide from left.

### Tablet (`md:`)

- Side rail (icon-only) 80px wide, sticky to left.
- Bottom tab bar disappears.
- Main content `max-w-3xl`, centered when narrower than viewport.
- Top bar 56px, sticky.

### Desktop (`lg:` and up)

- Full sidebar 256px wide, sticky.
- Top bar 48px (smaller because sidebar handles primary nav).
- Main content fluid up to `max-w-screen-2xl`, centered when wider.
- Detail views can split into two-column layout (header + tab content) on `xl:`.

---

## Sidebar Nav (Desktop)

256px wide, vertical stack, sticky.

### Sections

1. **Workspace switcher (top, when multi-tenant ships)**

   Avatar + name, dropdown chevron. Click expands a workspace list.

2. **Primary nav**

   - Home
   - Applications
     - Tenants (sub-item)
     - Landlords (sub-item)
   - Contacts
   - Audit
   - Settings

   Each item: 24px icon (Lucide), label, count badge (optional, e.g. unpaid count).

3. **Secondary nav (bottom)**

   - Help / Docs
   - Sign out

4. **User card (very bottom)**

   Avatar (32px), display name, role chip. Click opens a popover with quick actions (account settings, sign out).

### States

- Default: text and icons in `text-secondary`.
- Hover: background lightens to `admin-row-hover`.
- Active: background `admin-sidebar-active`, text in `text-primary`, icon in `primary`.
- Focus: 2px ring in `primary` color, offset by 2px.

### Collapse

A collapse toggle in the sidebar header collapses to icon-only mode (80px wide). Persisted per user. Same UI as the tablet rail.

---

## Top Bar

Always visible. Contents change per route.

- Left: page title + (optional) breadcrumb. On mobile, hamburger menu instead.
- Center: global search (`md:` and up). Cmd+K opens it.
- Right: notification bell, "+ New" contextual button, user avatar (mobile only — desktop has it in sidebar).

Search is global across applications and contacts. Result list is grouped: Applications, Contacts, Settings.

---

## Tables

### Desktop: classic data grid

- Sticky header row.
- Hairline column borders (`admin-border`), thicker between sections.
- Row height: 48px (data dense), 56px (default), 64px (relaxed). User toggles density in table settings; persisted per user per table.
- Hover: row background fades to `admin-row-hover`.
- Selected (when bulk select ships): `admin-row-selected` background, checkbox visible.
- Sticky first column on horizontal-scrolling tables.
- Sortable columns show a small chevron in the header; clicking cycles asc → desc → none.
- Column resize handles on the right edge of each header.
- Column visibility toggle (gear icon top-right of table) opens a popover.

### Mobile: card stack

Detailed in `MOBILE.md`. Visual rules:

- Card height: 80–100px.
- Card uses `admin-surface` background, `admin-border` 1px outline, `rounded-lg`.
- Top line: bold, `text-base`, primary identity.
- Sub line: `text-sm`, `text-secondary`.
- Right side: 24px chevron, status chip above it.
- Bottom-right corner: small timestamp, `text-xs`, `text-muted`.

### Empty states

- Illustration optional (small, monochrome icon). Lucide `Inbox` or similar.
- Headline: "No applications yet" — `text-lg`, primary.
- Body: "When applicants submit forms, they'll show up here." — `text-sm`, secondary.
- Action button if relevant: "Create application manually."

### Loading states

- Skeletons match final layout exactly. No spinners.
- Top progress bar always present during fetch.

---

## Detail Views

### Desktop: full route page

- Header strip: name, type chip, status chip, primary actions (Edit, Send Email, Generate PDF).
- Sub-header: tab strip (`Overview`, `Files`, `Payment`, `Notes`, `Activity`, `Email`).
- Two-column body on `xl:`:
  - Left (sticky, 320px): summary card (avatar, key facts, quick actions, last activity).
  - Right (fluid): tab content.
- Footer not used; sticky save bar appears only when there are unsaved changes.

### Mobile: full-screen sheet

Detailed in `MOBILE.md`.

### Quick-view drawer (deferred to v1.1)

A 480px right-side drawer for "view without leaving the table" is reserved for v1.1. **For v1, every detail-view interaction navigates to a full route page.** This is a single, predictable pattern across both mobile (full-screen sheet) and desktop (full route page).

When the drawer ships, it will be opt-in via a per-user setting; v1 has no toggle.

---

## Forms

### Field types and styling

- Text inputs: 40px tall, `rounded-md`, 1px border in `admin-border`, focus ring in `primary`.
- Textareas: same border treatment, default 4 rows, resize-vertical only.
- Select: HeroUI native; styled to match.
- Date pickers: HeroUI / Base UI.
- Checkboxes: 20x20px, `rounded-sm`, primary fill when checked.
- Toggles: 40x24px pill, primary fill when on.
- File inputs: see `MOBILE.md`.

### Layout

- Labels above inputs. No floating labels (broken with autofill).
- Error text below input, `error` color, with `aria-describedby` linking.
- Required-field indicator: small asterisk in `error` color after the label.
- Help text (optional): below the input, `text-secondary`, `text-xs`.

### Validation

- Zod schema runs on blur and on submit.
- Inline errors appear immediately on blur.
- Form-level errors surface in a banner above the form.
- Save button disabled while submitting; spinner inside button.

---

## Dialogs and Sheets

### Confirmation dialogs

- Used for destructive or high-stakes actions (delete, refund, deactivate user).
- Header: title in `text-lg`.
- Body: short explanation in `text-sm`.
- Inputs (when required): textarea for reason, etc.
- Footer: secondary action ("Cancel") on the left, primary action ("Issue refund") on the right. Destructive actions use `error` color on the primary button.

### Sheets (mobile detail, mobile filter)

Detailed in `MOBILE.md`.

### Popovers

- For column visibility, quick filters, more-actions menus.
- Open on click, close on outside click or Escape.
- 8px gap from trigger.
- Max-width 320px on desktop, full-width on mobile (becomes a sheet instead).

### Toasts

- Detailed in `MOBILE.md`.
- Visual: 320px wide on desktop, full width minus 16px on mobile.
- Icons: success (check), warning (alert-triangle), error (x-circle), info (info).

---

## Buttons

Three sizes: sm (32px), md (40px), lg (48px). Default is md.

Variants:

- **primary** — solid `primary` background, white text. Default for primary actions.
- **secondary** — solid `admin-surface-raised` background, `text-primary` text. For secondary actions.
- **outline** — transparent with `admin-border-strong` outline. For tertiary actions.
- **ghost** — no border, no background until hover. For inline / table cell actions.
- **destructive** — solid `error` background, white text. Confirmation dialogs only.
- **link** — text-only, `primary` color, underline on hover.

States: hover lightens, active darkens, disabled drops to 50% opacity. Focus ring on all variants.

Icon buttons use the same sizing but square. Always include `aria-label`.

---

## Chips and Badges

Used for status, labels, counts.

- Status chips (paid/unpaid/waived/refunded): rounded-full, padding `px-2 py-0.5`, `text-xs`, semi-transparent background of the status color, solid text in the status color.
- Label chips (tenant/landlord/subscriber/lead): similar treatment using neutral or category colors.
- Count badges: 16px circle on icons (e.g. notification bell, "Unpaid" nav item), `text-2xs`, primary background, white text.

Never use chips for primary actions. They are read-only indicators with optional click-to-filter behavior.

---

## Audit Log Timeline

The audit log appears in two places: the global audit log page and the per-entity Activity tab.

Visual: vertical timeline.

- Each row: 48px tall.
- Left: 16px colored dot indicating action category (`audit-action-create`, etc.) connected by 1px vertical line to next row.
- Center: actor avatar (24px), `text-sm`: "Kevin Suriel changed status from Unpaid to Paid"
- Right: timestamp ("3h ago"), tap/click to expand for full diff.
- Expanded: shows JSON diff in a monospace block with green `+` and red `-` lines.

On mobile, dot and avatar collapse into one. Timestamp moves to a sub-line.

---

## Email Composer UI

### Mobile

- Full-screen sheet.
- Top: To (locked, prefilled), Subject input, optional Template dropdown.
- Middle: textarea (grows with keyboard handling per `MOBILE.md`).
- Bottom: sticky footer with Cancel and Send.

### Desktop

- Right-side drawer (480px) over the application detail.
- Same fields as mobile, but laid out as a single column form.
- "Send" in sticky footer, secondary "Save as draft" link inline.

### Template substitution preview

A "Preview" toggle in the composer renders the body with variables resolved against the current applicant. Catches "{{first_name}}" left in the body before send.

---

## Inline PDF Viewer

Per Codex's recommendation:

### Desktop

- Inline `<iframe>` rendering the streamed PDF route.
- Top toolbar: Zoom in/out, Fit width, Open in new tab, Download.
- Sidebar with page thumbnails (optional, v1.1).

### Mobile

- "Open PDF" button opens a full-screen route — same `<iframe>` but unwrapped from any parent scroll containers.
- Navigation: back button, share button (uses native share sheet), download button.
- Pinch-zoom enabled on the PDF view only.

### Loading

- Skeleton page background while the PDF generates server-side.
- Progress indicator below the toolbar.

---

## Iconography

- **Lucide React** is the primary icon library (already in stack).
- Icon size: 16px in dense controls, 20px default, 24px in nav, 32px in empty states.
- Stroke width: 1.5px (Lucide default — keep consistent).
- All icons used in interactive elements have `aria-label` or are accompanied by visible text.

No custom icons in v1.

---

## Avatars

- 24px (table rows, audit log)
- 32px (sidebar user card)
- 48px (account settings)
- 64px (contact detail header)
- 80px (workspace logo display)

If no image, fallback is initials on a neutral background derived deterministically from the user's display name (so the same user always gets the same color).

---

## Accessibility

Same rules as the public site, applied to the CMS. Highlights:

- Color contrast WCAG AA minimum, AAA for critical body text.
- All interactive elements have a visible `:focus-visible` ring (2px primary, 2px offset).
- Touch targets ≥ 44×44px.
- Semantic HTML: `<button>` for buttons (not divs with onClick), `<nav>` for navigation, headings in order.
- ARIA: `aria-label` on icon-only controls, `aria-current="page"` on active nav, `role="dialog"` + `aria-modal="true"` on sheets, `aria-live="polite"` on toasts and form-status messages.
- Reduced motion: detailed above and in `MOBILE.md`.
- Screen reader testing: VoiceOver (macOS, iOS) and NVDA (Windows) before v1 ship.
- Keyboard shortcuts visible: Cmd+K for global search, "?" opens shortcuts cheat-sheet (v1.1).

---

## Design Patterns to Follow

- **Linear** for keyboard-first density and clarity.
- **Vercel Dashboard** for spaciousness and quiet color use.
- **Stripe Dashboard** for table behavior, filters, and detail views.
- **Notion** for in-place editing patterns (where applicable).

---

## Design Patterns to Avoid

- **Material Design's heavy elevation and FABs.** Too loud for the use case.
- **iOS Human Interface Guidelines as a one-to-one model.** Mobile parity, not iOS mimicry.
- **Carousel anything.** Lists or grids only.
- **Modal-on-modal.** One overlay at a time.
- **Inline tooltips that require hover.** Touch users can't trigger them.
- **Color-only state indicators.** Pair with icons or text.

---

## Theming and White-Label Hooks

(Detailed in `ARCHITECTURE.md`.)

- All tokens are CSS custom properties scoped to a `[data-theme]` attribute on `<html>`.
- A workspace can override:
  - Primary color
  - Logo
  - Workspace name in nav
  - Login screen background image (v1.1)
- A workspace cannot override:
  - Spacing scale
  - Type scale
  - Radii
  - Component layout

This way the CMS feels customized without diverging from the design system in ways that break later.

---

## Open Design Questions

1. Owner's preferred density for tables: 48 / 56 / 64? (Default for v1.)
2. Sidebar collapsed by default on first load, or expanded?
3. Primary action button placement on mobile — top-right of header, or floating action button (FAB)? FAB is rejected per "patterns to avoid" — confirm this.
4. Activity timeline grouping: collapse multiple rapid edits by the same actor into one row, or always one row per audit entry?
5. Inline PDF viewer toolbar: keep simple zoom/fit controls or add full annotation tools (out of scope for v1)?

---

## Implementation Acceptance Criteria

- [ ] All components consume tokens via Tailwind classes or CSS variables. No hardcoded values caught in code review.
- [ ] All components verified at the six breakpoints in `MOBILE.md`.
- [ ] All interactive elements have visible focus styles.
- [ ] All animations respect `prefers-reduced-motion`.
- [ ] Accessibility audit (axe DevTools or Lighthouse) shows no critical or serious violations on every admin route.
- [ ] Style guide page at `/admin/__styleguide` (dev-only) lists every component with every state for visual regression review.
