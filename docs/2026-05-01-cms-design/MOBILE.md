# CMS Mobile-First Spec

**Status:** Draft
**Co-authors:** Claude (lead), Codex (mobile/UI advisor)
**Created:** 2026-05-01
**Priority:** Foundational. Every feature in `FEATURES.md` must satisfy this spec on a 375px screen before being considered done.

---

## Principle

> Whatever Rell can do at his desk, he can do from his phone, in the back of an Uber, with one hand, on a 5-year-old iPhone, on captive WiFi.

This is not "responsive web design." This is "mobile is the primary surface, desktop is a wider viewport with extra affordances." Every feature is designed for the phone first, then earns more horizontal space.

---

## Breakpoints

We anchor to four widths, defined as Tailwind tokens in `tailwind.config.ts`:

| Token | Width | Target devices |
|-------|-------|----------------|
| (default) | 320–639 | iPhone SE, small Android phones |
| `sm:` | 640–767 | Larger phones, small tablets in portrait |
| `md:` | 768–1023 | iPads in portrait, Android tablets |
| `lg:` | 1024–1439 | iPads in landscape, small laptops |
| `xl:` | 1440+ | Standard desktops |

**Rule:** Default styles are mobile (320px). Use `md:` and up to add desktop affordances. **Never** write desktop-first then override for mobile.

Test viewport reference points:

- 320px (iPhone SE width)
- 375px (iPhone 12/13/14 base width)
- 414px (iPhone Plus / Pro Max)
- 768px (iPad portrait)
- 1024px (iPad landscape, small laptop)
- 1440px (standard desktop)

Every component is verified at all six before merging.

---

## Layout Shell

### Mobile (default)

- **Top bar:** 56px tall, sticky. Left: hamburger menu (opens drawer nav). Center: page title or search. Right: contextual action button (e.g. "+ New").
- **Body:** Full-width, `padding-x: 16px` minimum.
- **Bottom tab bar:** 5 tabs max — Home, Applications, Contacts, Audit, Settings. 56px tall, sticky. Active tab uses primary color, others use `text-muted`. **Bottom tab bar respects iOS safe-area insets** (`env(safe-area-inset-bottom)`).
- **No sidebar on mobile.** Sidebar nav is hidden behind the hamburger drawer.

### Tablet (`md:`)

- Side rail nav appears, 80px wide, icon-only with tooltips.
- Bottom tab bar disappears.
- Body content gets `max-w-3xl` and padding scales up.

### Desktop (`lg:` and up)

- Full sidebar nav, 256px wide, icon + label, with collapsible sections.
- Top bar shrinks to 48px because sidebar handles primary nav.
- Body content expands to use the available width with `max-w-screen-2xl` cap and centered.

### Drawer / Sheet conventions

- **Mobile detail views** open as a full-screen sheet that slides up from the bottom. Top of the sheet has a 4px-tall drag handle, a close button (X) in the top-left, and the entity title.
- **Mobile filter panels** open as a half-height sheet from the bottom. User swipes up to expand to full screen.
- **Tablet/desktop detail views** navigate to a full route page for v1. The right-side drawer pattern is reserved for v1.1 (see `DESIGN.md`).

---

## Navigation

### Drawer (mobile only)

Tap the hamburger -> drawer slides in from the left, 80% screen width. Contains:

1. Workspace switcher (top, when multi-tenant ships)
2. Primary nav (Home, Applications, Contacts, Audit, Settings)
3. Secondary actions (Help, Sign out)
4. User identity card at bottom (avatar, name, role)

Drawer must close when:

- User taps anywhere outside it.
- User swipes left.
- User taps a nav item (then animates to that screen).
- User presses the OS back button (Android).

### Bottom tab bar (mobile only)

The five tabs are the most-used destinations. Switching tabs preserves scroll position within each tab (state restored on return).

- Tapping the already-active tab scrolls to top of that screen.
- Long-press on a tab reveals quick actions (e.g., long-press Applications -> "New tenant" / "New landlord").

---

## Tables on Mobile

A spreadsheet-style table is unusable at 375px. We solve this with a **column registry** that drives both desktop and mobile views.

### Column registry

For each entity (applications, contacts, etc.), we define columns once in `cms/modules/<entity>/columns.ts`:

```ts
type ColumnDef<T> = {
  key: string;
  label: string;
  priority: 'primary' | 'secondary' | 'tertiary' | 'desktop-only';
  render: (row: T) => ReactNode;
  sortable?: boolean;
  filter?: 'select' | 'date-range' | 'search';
};
```

- `primary` — always visible on mobile cards (top line).
- `secondary` — visible on mobile card subline.
- `tertiary` — visible only when the card is expanded (tap "more").
- `desktop-only` — never on mobile, regardless of expand.

### Mobile card stack

On mobile, the table renders as a virtualized scrolling list of cards. Each card:

- 80–100px tall by default.
- Top line: primary column(s). Bold, larger font, truncated with ellipsis at the right edge.
- Sub line: secondary column(s). Muted color, smaller font, truncated.
- Right side: small chip/badge for status, plus a chevron indicating tap-to-open.
- Bottom-right corner: timestamp ("3h ago") in `text-muted`.

**Tapping the card** opens the full-screen detail sheet.

**Swipe right on a card** reveals two quick actions in green: "Mark Paid" and "Send Email." Low-risk actions only.

**Swipe left on a card** reveals one destructive action in red: "Archive." Tap requires confirmation modal. Delete is never on swipe — only via detail view.

### Mobile filter chips

Above the card list, a horizontal-scroll chip row:

`[All] [Unpaid] [Paid] [Waived] [+ Filter]`

- Tap a chip to filter; tap again to clear.
- The "+ Filter" chip opens a half-height filter sheet with full filter options.
- Active filter count appears as a small dot on the "+ Filter" chip.

### Mobile search

Tapping the search icon in the top bar expands a full-width search input that takes the entire top bar. Results filter the card list in real time, with a 300ms debounce.

### Desktop table

Same column registry, rendered as a standard table at `md:` and up. All columns whose priority is not `desktop-only` are visible. Column visibility toggle in the top-right of the table lets users hide individual columns; persisted per user.

### Group by email (collapse mode)

A toggle button labeled "Group by email" near the search bar. When enabled:

- Multiple rows sharing the same email collapse into one card showing the most recent submission with a small badge ("3 submissions").
- Tap the badge to expand inline and see older submissions stacked below.
- Works identically on mobile and desktop — same UI primitive.

---

## Detail Views on Mobile

Tapping a card opens a full-screen sheet. The sheet has:

### Header (sticky)

- Drag handle at top (4px tall, centered, `text-muted`).
- Close button (X) top-left.
- Entity title (applicant name) centered, truncated.
- Primary action button top-right (varies per entity — e.g., "Edit," "Send email").

### Tab strip

Below the header, a horizontally scrollable tab strip:

`[Overview] [Files] [Payment] [Notes] [Activity] [Email]`

- Tabs are sticky as you scroll within a tab.
- Active tab highlighted with primary color underline.
- Swipe left/right between tabs (gesture matches React Native conventions).

### Per-tab content

- **Overview** — All form fields, grouped by section (Personal, Housing, Subsidy, etc.). Each section is collapsible; first section expanded by default.
- **Files** — Grid of file thumbnails. Tap to preview inline (PDFs and images render). Long-press to reveal delete option.
- **Payment** — Status, method, amount, refund button.
- **Notes** — Single textarea, autosaved on blur.
- **Activity** — Timeline of audit-log entries for this applicant.
- **Email** — Compose (bottom of tab) + history of sent emails.

### Footer (sticky)

A persistent action bar at the bottom of the sheet, 56px tall:

- Primary action (varies by tab — e.g., "Save changes," "Send," "Generate PDF").
- Disabled until there are actions to take.
- Respects iOS safe-area inset.

---

## File Upload on Mobile

Critical: this is one of the hardest features to do well on mobile.

### Upload flow

1. User taps "Upload files" on the Files tab.
2. A bottom sheet appears with three options:
   - **Take Photo** — opens the OS camera. After capture, user can crop, then it uploads.
   - **Choose from Library** — opens the OS photo picker. Multi-select supported.
   - **Choose File** — opens the OS file picker (PDFs, etc.).
3. Selected files appear in a queue with progress bars. Each row shows: thumbnail, filename, size, progress.
4. Failed uploads show a red retry button next to them.
5. Successful uploads animate into the file grid above.

### Implementation notes

- Use the native `<input type="file" capture="environment" accept="image/*,.pdf">` for the camera path. Don't try to draw a custom camera UI.
- Use `<input type="file" multiple>` for library and file paths.
- Show a non-blocking toast when an upload completes; allow the user to keep navigating.
- Uploads retry on transient failures with exponential backoff (handled in the upload service worker — see Offline section).

---

## PDF Preview on Mobile

Per Codex's recommendation (and the right call):

- Default: render PDF in an `<embed>` or `<iframe>` from a server route that streams the bytes.
- iOS Safari quirk: nested scroll containers break PDF rendering. Solution: a "Open Full Screen" button that pushes a new full-screen route showing the PDF unwrapped, no parent scroll containers.
- Both routes are same-origin (no third-party PDF.js CDN).
- The full-screen route has a back button, share button (uses native share sheet on iOS/Android), and download button.

### Rendering choice

- v1: native browser PDF rendering. Free, fast, accessible.
- v2 if needed: switch to PDF.js with a custom mobile toolbar.
- We do not use `react-pdf` for this — too heavy for a preview-only use case.

---

## Forms on Mobile

### Input rules

- All inputs use `inputMode` and `autocomplete` attributes correctly:
  - Email: `inputMode="email" autoComplete="email"`
  - Phone: `inputMode="tel" autoComplete="tel"`
  - Numeric: `inputMode="numeric"`
  - One-time codes (2FA): `inputMode="numeric" autoComplete="one-time-code"`
- All inputs are at minimum 44px tall (touch target).
- Labels are above inputs, never floating-label patterns (which break on autofill).
- Errors render below the input with `aria-describedby` linking them; `aria-invalid` on the input.

### Virtual keyboard handling

- When the keyboard appears, the input must remain visible. Use `scrollIntoView({ block: 'center', behavior: 'smooth' })` on focus.
- Bottom-sticky action buttons must lift above the keyboard, not be obscured by it. Use `position: sticky` with `bottom: env(safe-area-inset-bottom)` and React's `useEffect` listening to `visualViewport.height` changes.
- Submit buttons in long forms must be reachable both at the bottom of the form (sticky footer) and at the top (in the header) so users don't have to scroll.

### Multi-step forms

The public application forms are already multi-step. CMS forms (settings, edit applicant, send email) should also break long forms into steps if they exceed one viewport. Each step has clear "Back" and "Continue" buttons in the sticky footer.

---

## Touch and Gesture

### Touch targets

- Minimum 44x44px for any tappable element. Hit area can extend beyond visual bounds via padding.
- Adjacent tappable elements have at least 8px of dead space between them.
- Buttons that look like they should be tappable but aren't get a `cursor: not-allowed` style and are disabled (don't fail silently).

### Standard gestures

- **Tap** — primary interaction. Always.
- **Long-press** — secondary actions menu (e.g., long-press a file thumbnail to delete).
- **Swipe right on row** — reveal positive quick actions (mark paid, send email, etc.) IF the user has permission for at least one of them.
- **Swipe left on row** — reveal one destructive action with confirmation, IF the user has permission for it.
- **Swipe down on full-screen sheet** — close the sheet (only when scroll position is at top).
- **Pinch-zoom** — only allowed on PDF preview and image preview. Disabled elsewhere via `meta viewport`.

### Permission-aware gestures

Swipe quick-actions are filtered by the caller's role at render time:

| Role | Swipe-right reveals | Swipe-left reveals |
|------|---------------------|--------------------|
| owner | Mark Paid, Send Email | Archive |
| admin | Mark Paid, Send Email | Archive |
| employee | Mark Paid, Send Email | (no destructive swipe) |
| viewer | (no actions; swipe is disabled) | (no destructive swipe) |

If a user has permission for zero swipe-right actions, the gesture is disabled silently (no rubber-band reveal that returns empty). Fallback path is always: tap card → open detail view → action is gated again at the detail level. The detail view shows the action button as disabled with a tooltip explaining why.

### iOS Safari back-gesture conflict

iOS Safari uses left-edge horizontal swipe for browser back navigation. To avoid hijacking it:

- A 16px dead zone exists on the left edge of every swipeable card.
- Quick-action swipes only register past the dead zone.
- The OS back gesture is preserved.

### Haptic feedback (when available)

- Use `navigator.vibrate(10)` for confirmations on Android.
- iOS: `Haptic.impact()` via Capacitor only when we wrap as a PWA. Until then, no haptics on iOS.

---

## Loading and Feedback

### Top progress bar

A 2px progress bar pinned to the top of the viewport (below status bar on mobile, below top bar on desktop). Always visible during data fetches. Indeterminate animation. Color: primary.

This is the user's at-a-glance "is something happening?" indicator.

### Skeletons

Every data-driven view has skeleton placeholders that match the final layout exactly. No layout shift on data arrival.

- Card list: skeleton cards (5 visible).
- Detail sheet: skeleton header + skeleton tab content.
- Table: skeleton rows matching column widths.

### Optimistic updates

Most mutations apply to the UI immediately, then sync. On failure, the UI rolls back and a toast appears with the error and a "Retry" button. Audit log entries are written only after server confirmation.

### Toasts

- Position: top of the viewport on mobile (below status bar), bottom-right on desktop.
- Auto-dismiss after 4 seconds for success, never for errors (user must dismiss).
- Stack vertically; max 3 visible at once.
- Each toast has an action button when relevant ("Retry," "Undo," "View").

---

## Performance Targets

These are not aspirational; they're acceptance criteria. Measured on a mid-range Android phone (e.g., Pixel 5a) on a throttled 4G connection.

| Metric | Target | Hard limit |
|--------|--------|------------|
| First Contentful Paint | < 1.5s | 2.5s |
| Largest Contentful Paint | < 2.5s | 4s |
| Time to Interactive | < 3s | 5s |
| Card list scroll | 60fps | 30fps |
| Detail sheet open animation | 60fps | always |
| Action response (tap to feedback) | < 100ms | 300ms |

### Bundling

- Admin bundle is route-split. The login page must not load any admin code.
- Heavy components (PDF viewer, rich text editor if added) are dynamically imported on first use.
- Icons via `lucide-react` are tree-shaken — never use the bulk `lucide-react/dist/esm/lucide` import.

### Images

- All admin-uploaded images go through a server route that serves WebP with fallbacks.
- Thumbnails are generated server-side at upload time.
- Lazy-load all images below the fold.

---

## Offline Behavior (v1)

Limited but graceful.

- If the user loses connection mid-action, the action queues with a "Pending" badge.
- When connection returns, queued actions retry automatically.
- A persistent banner at the top of the viewport shows "You're offline" when offline, replaced by "Reconnecting…" when retrying.
- Reads always work for the last-fetched data (cache-first via SWR or React Query — chosen in implementation).

True offline-first (full PWA with IndexedDB sync) is **v2 scope**. Don't pretend to have it in v1.

### Offline data security

This is a PII admin tool. Cached data on a phone is a real risk surface; we treat it accordingly.

- Cache is in-memory only (SWR's default). **No IndexedDB or localStorage caching of admin data in v1.** The cache dies with the tab.
- Cache is cleared immediately on logout, session expiry, role change, or workspace switch.
- Maximum cache age: 24 hours regardless of activity. After 24h every read refetches.
- High-sensitivity views bypass cache entirely and always re-fetch:
  - Audit log
  - Security settings (sessions, 2FA, failed-login attempts)
  - Refund flows
  - Team management (roles, invitations)
- Queued offline writes are session-bound. Logout drops the queue with a one-time confirmation: "X pending changes will be lost. Continue?"
- No serializing of session data, JWTs, or cookies into client storage. Better Auth manages those in HTTP-only cookies.

---

## Accessibility on Mobile

- Every interactive element has a clear focus state when navigated via external keyboard.
- Screen reader labels for all icon-only buttons.
- Tabs and sheets implement WAI-ARIA Authoring Practices (`role="tab"`, `aria-selected`, `role="dialog"` with `aria-modal="true"` for sheets).
- Color contrast meets WCAG AA for all text (4.5:1 for body, 3:1 for large text).
- All interactive elements respond to keyboard activation (Enter and Space).
- Reduced motion respected: animations shorter and simpler when `prefers-reduced-motion: reduce`.

---

## Testing

Every feature is tested on these matrices before being declared done:

| Device | OS | Browser |
|--------|-----|---------|
| iPhone SE (real device or sim) | iOS latest | Safari |
| iPhone 14 (real device or sim) | iOS latest | Safari, Chrome |
| Pixel 5a | Android latest | Chrome, Firefox |
| iPad mini | iPadOS latest | Safari |
| MacBook | macOS | Chrome, Safari, Firefox |

Playwright is already in the project for E2E. Mobile tests use Playwright's mobile device emulation profiles plus at least one real-device verification before shipping.

---

## What we will NOT do on mobile (v1)

- No drag-and-drop reordering. Use up/down buttons or "Move to" menus.
- No multi-pane layouts. One thing at a time.
- No infinite hover-only menus.
- No tooltips that require hover. Use inline help text or info icons that open popovers on tap.
- No tables with more than 3 visible columns. (See card stack pattern.)

---

## Acceptance Criteria for v1 Mobile Ship

Before any feature is considered done:

- [ ] Tested at 320px, 375px, 414px, 768px.
- [ ] All touch targets ≥ 44x44px verified with the browser inspector.
- [ ] Bottom action buttons clear the iOS home indicator.
- [ ] Virtual keyboard does not obscure focused input.
- [ ] No horizontal scroll on any screen.
- [ ] No text smaller than 14px in primary content.
- [ ] No tap-to-zoom on input focus (correct viewport meta tag).
- [ ] Form errors are announced via `aria-live`.
- [ ] All animations honor `prefers-reduced-motion`.
- [ ] Performance meets targets in the table above on a Pixel 5a.
