# CLAUDE.md

Project-specific instructions for Claude Code. Global rules in `~/.claude/CLAUDE.md` still apply. Project-level rules override defaults where they conflict.

---

## Project Context

- **Name**: ItsRellEstate
- **Owner**: Nyrell Nunez
- **Purpose**: Personal brand website for a licensed NYC real estate agent specializing in CityFHEPS, Section 8, and HASA subsidy program navigation. Bridges the trust gap between tenants, landlords, and agent.
- **Primary users**: Tenants seeking housing with subsidy assistance (primary), landlords accepting subsidy tenants (secondary, arrive via referral)
- **Stage**: Active development

## Stack

- **Frontend framework**: Next.js (App Router)
- **Language**: TypeScript (strict mode)
- **UI components**: HeroUI (base components), Magic UI (animated components)
- **Animation**: Framer Motion
- **Styling**: Tailwind CSS
- **Hosting / deploy target**: Vercel
- **Package manager**: pnpm
- **Key dependencies**: HeroUI, Magic UI, Framer Motion, Plus Jakarta Sans

## Architecture

```
itsrellestate/
  public/
    images/
  src/
    app/
      layout.tsx
      page.tsx
      apply/
        tenant/page.tsx
        landlord/page.tsx
    components/
      navbar.tsx
      hero.tsx
      how-it-works.tsx
      about.tsx
      services.tsx
      boroughs.tsx
      testimonials.tsx
      cta-apply.tsx
      footer.tsx
    lib/
      fonts.ts
    styles/
      globals.css
  tailwind.config.ts
  next.config.ts
```

**Rules:**
- No loose files at project root beyond essentials
- All source under `src/`
- Shared utilities under `src/lib/`
- Each section of the page is its own component file

## Code Rules

### Zero Hardcoded Values

This is the most important rule in this project. **Never hardcode any visual value in a component.**

- **Colors**: Always reference Tailwind theme tokens (`text-primary`, `bg-surface`, etc.) or CSS custom properties (`var(--color-primary)`). Never write a hex code, rgb value, or color name directly in a component file.
- **Fonts**: Always reference the font variable from `src/lib/fonts.ts`. Never write a font-family string in a component.
- **Spacing**: Always use Tailwind spacing scale (`p-4`, `gap-6`, `mt-8`). If a custom value is needed, define it in `tailwind.config.ts` first.
- **Border radius**: Always use Tailwind radius tokens (`rounded-lg`, `rounded-full`). Custom radii go in the config.
- **Shadows**: Always use Tailwind shadow tokens. Custom shadows go in the config.
- **Font sizes**: Always use Tailwind text scale. Custom sizes go in the config.
- **Breakpoints**: Always use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`). Never write media queries with pixel values.
- **Opacity values**: Define as Tailwind tokens if reused.

If a value appears in a component file and is not a Tailwind class or CSS variable reference, it is wrong. Fix it immediately.

### Component Architecture

- Every component must be modular and reusable. If a component can only work in one context, it is too tightly coupled.
- Props over internal state. Pass data down, emit events up.
- Extract repeated patterns into shared components early. Three copies means it needs a component.
- Components should accept `className` prop for external styling overrides.
- No business logic in presentation components. Keep rendering and logic separated.

### Mobile-First

- All styling starts with the mobile layout. Use Tailwind responsive prefixes (`md:`, `lg:`) to add desktop enhancements.
- Never write desktop-first styles and then override for mobile.
- Test every component at 375px width before moving to larger screens.
- Touch targets minimum 44x44px on all interactive elements.
- Use `svh`/`dvh` viewport units with `vh` fallback for iOS Safari.

### Long-Term Maintainability

- Write code that requires the least amount of refactoring to extend later.
- Prefer composition over inheritance.
- No premature optimization but no premature abstraction either.
- If you are about to copy-paste a block of JSX for the third time, extract it into a component.
- Keep files focused. A component file should do one thing.
- No circular dependencies between modules.

### TypeScript

- Strict mode enabled. No `any` type.
- Define interfaces for all component props.
- Export types that other modules need.
- Use `as const` for constant objects.

### No Shortcuts

- No placeholder `action="#"` on forms.
- No `eslint-disable` comments without a documented reason.
- No `@ts-ignore` or `@ts-expect-error` without a documented reason.
- No empty catch blocks.
- No console.log left in committed code.
- No TODO comments without an associated plan to resolve.

### No Emojis

- No emojis in code, comments, commit messages, filenames, documentation, or PR descriptions.
- No emojis in UI text or component content.

## Design System

Visual design rules live in the design spec at `docs/superpowers/specs/2026-04-21-itsrellestate-design.md`. Before any UI work:
1. Read the design spec
2. Use tokens defined in `tailwind.config.ts`; never hardcode values
3. All colors, fonts, spacing, radii, and shadows come from the config

### Color Tokens (defined in tailwind.config.ts)

These are the canonical color names. Use only these in components:
- `primary` -- warm blue, CTAs and accents
- `secondary` -- soft coral, highlights and warmth
- `dark` -- charcoal, dark section backgrounds
- `light` -- off-white, main backgrounds
- `surface` -- warm gray, alternating sections
- `text-primary` -- dark, headings
- `text-secondary` -- medium, body copy
- `text-muted` -- light, captions
- `text-on-dark` -- light text for dark backgrounds
- `success`, `warning`, `error` -- functional states

### Animation Tokens

- Scroll-triggered animations fire once, not on re-scroll
- All animations respect `prefers-reduced-motion`
- Stagger delay between sequential items: 150-200ms
- Entrance easing: `ease-out`
- Morph easing: `ease-in-out`

## Accessibility

- All interactive elements have visible `:focus-visible` states
- Touch targets minimum 44x44px (WCAG 2.5.5)
- Color contrast WCAG AA minimum (4.5:1 body text, 3:1 large text)
- Semantic HTML with proper heading hierarchy (h1 > h2 > h3, no skips)
- `prefers-reduced-motion` respected for all animations
- Alt text on all images
- Skip-to-content link
- `aria-labels` on icon-only buttons
- Forms: `aria-describedby`, `aria-invalid`, `aria-live` regions

## Security

- Never read, log, commit, or display `.env` files, credentials, or secrets unless the project owner (Kevin) explicitly grants permission in the conversation
- When the owner explicitly shows or pastes a credential, treat it as in-scope for this project: read it, use it, and write it to the appropriate `.env` file -- but never echo it back in chat, log it, or include it in commits
- If a credential is pasted in chat, warn the owner once that it should be rotated and moved to `.env.local`, then proceed
- Secrets are server-side only; never shipped in client bundles
- Validate form input on both client and server
- Apply CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy headers
- OG/Twitter meta images must reference local assets, not external hotlinks

## Documentation

- Use Context7 MCP to pull latest documentation for HeroUI, Magic UI, Next.js, Tailwind CSS, and Framer Motion before implementing any feature
- Do not rely on training data for library APIs; always verify against current docs

## Testing

- **Type check**: `pnpm tsc --noEmit`
- **Lint**: `pnpm lint`
- **Dev server**: `pnpm dev`
- Verify all UI changes in a real browser before claiming success
- Test at 375px (mobile), 768px (tablet), and 1280px (desktop) minimum

## Commit Convention

Format: `<type>(<scope>): <subject>` -- imperative mood, max 50 chars.

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `style`.

No AI co-author attribution. No emojis.

## Ports and Processes

- Never kill, stop, or terminate processes running on any port unless explicitly asked.
- When starting a dev server, use an alternative port if the default is already in use.

## Sibling Project: ItsRellEstate CMS

The CMS for `cms.itsrellestate.com` lives in a separate Next.js project at `/volume1/playground/itsrellestate-cms/`. It has its own `CLAUDE.md` with looser rules (autonomous mode, dev-server restart permission). When working in this public-site project, do not modify files in the CMS project unless explicitly asked. The two projects share the same Neon database and Better Auth instance.

## File Organization

- Project root holds only: `package.json`, framework config, `tsconfig.json`, `CLAUDE.md`, `.gitignore`, `.env.example`
- Everything else in folders: `src/`, `public/`, `docs/`
- Each page section is its own component file under `src/components/`
- Component files are flat (no nested component folders unless the component has subcomponents)

## Known Constraints

- HeroUI requires a provider wrapper at the root layout level
- Magic UI components are copy-pasted into the project (not installed as a dependency)
- Plus Jakarta Sans loaded via `next/font/google`
- All Magic UI components must be adapted to use project Tailwind tokens, not their default hardcoded values
- Framer Motion is a peer dependency of Magic UI

## Git Worktrees (Parallel Development)

This project uses git worktrees to allow multiple Claude sessions to work on separate branches simultaneously without interfering with each other.

### Why Worktrees

A normal `git checkout` switches the entire working directory to a different branch. If multiple terminals or Claude sessions share one checkout, switching branches in one disrupts all others. Worktrees solve this by giving each branch its own independent directory, all backed by the same `.git` history.

### Creating a Worktree

```bash
# From the project root (this directory)
git worktree add ../itsrellestate-<branch-name> <branch-name>
```

This creates a sibling directory with the branch already checked out. Example:

```bash
git worktree add ../itsrellestate-feature-uploads feature/uploads
# Now ../itsrellestate-feature-uploads/ is on feature/uploads
# This directory stays on whatever branch it was on
```

If the branch does not exist yet, create it in one step:

```bash
git worktree add -b feature/new-thing ../itsrellestate-feature-new-thing
```

### Running and Testing in a Worktree

Each worktree is a full project directory. To work in it:

```bash
cd ../itsrellestate-feature-uploads
pnpm install          # install deps (node_modules is per-worktree)
pnpm dev --port 3001  # use a different port so it does not collide
```

You do NOT switch branches. You `cd` into the worktree folder and run everything there. The main directory stays untouched on its branch.

### Merging Back

```bash
# Return to main
cd /volume1/playground/itsrellestate
git merge feature/uploads
```

To minimize conflicts, split work by file or feature so different worktrees touch different files.

### Cleanup

```bash
git worktree remove ../itsrellestate-feature-uploads
git branch -d feature/uploads  # after merge
```

### Rules

- Never `git checkout` to switch branches in a worktree that other sessions are using. Create a new worktree instead.
- Use a unique dev server port per worktree to avoid port collisions.
- Run `pnpm install` in each new worktree since `node_modules` is not shared.
- Keep branches short-lived. Merge frequently to avoid divergence.
- Delete worktrees and branches promptly after merging.

## Open Questions

- Form fields for tenant and landlord applications (Nyrell will provide)
- Google Drive and Sheets integration details (future phase)
- Logo design (future)
- Domain name (future)
- Real testimonial content (placeholders for now)
