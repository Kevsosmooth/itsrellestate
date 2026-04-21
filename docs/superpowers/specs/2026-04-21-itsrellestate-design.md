# ItsRellEstate - Website Design Spec

## Project Overview

**Client:** Nyrell Nunez, Licensed Real Estate Agent  
**Market:** All five boroughs of New York City  
**Specialization:** CityFHEPS, Section 8, HASA subsidy program navigation  
**Purpose:** Build trust between tenants, landlords, and agent. Capture tenant/landlord applications.  
**Site Type:** Single-page marketing site + separate application form pages  
**Primary Audience:** Tenants seeking housing with subsidy assistance  
**Secondary Audience:** Landlords accepting subsidy tenants (arrive via referral)

---

## Tech Stack

| Tool | Purpose | GitHub |
|------|---------|--------|
| **Next.js** | Framework, routing, future API routes | [vercel/next.js](https://github.com/vercel/next.js) (130K+ stars) |
| **Tailwind CSS** | Utility-first styling, design tokens, mobile-first | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) (86K+ stars) |
| **HeroUI** | Base UI components (navbar, buttons, cards, forms) | [heroui-inc/heroui](https://github.com/heroui-inc/heroui) (28.9K stars) |
| **Magic UI** | Animated components (scroll reveals, text effects, hero) | [magicuidesign/magicui](https://github.com/magicuidesign/magicui) (20.7K stars) |
| **Framer Motion** | Animation engine powering Magic UI + custom animations | [framer/motion](https://github.com/framer/motion) |
| **TypeScript** | Type safety across all code | Built into Next.js |
| **Vercel** | Hosting and deployment (later phase) | [vercel.com](https://vercel.com) |

### Future Integrations (Not In Scope For V1)

| Tool | Purpose |
|------|---------|
| Google Drive API | Document uploads from application forms |
| Google Sheets API | Application data capture to spreadsheet |

---

## Color System

### Primary Palette

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-primary` | `#2563EB` | `37, 99, 235` | CTAs, links, active states, key accents |
| `--color-secondary` | `#F97066` | `249, 112, 102` | Highlights, secondary buttons, warmth accents |
| `--color-dark` | `#1E293B` | `30, 41, 59` | Dark section backgrounds (About, CTA) |
| `--color-light` | `#F8FAFC` | `248, 250, 252` | Main page background |
| `--color-surface` | `#F1F5F9` | `241, 245, 249` | Alternating section backgrounds, card fills |
| `--color-white` | `#FFFFFF` | `255, 255, 255` | Cards, navbar, text on dark sections |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-text-primary` | `#0F172A` | Headings, primary text |
| `--color-text-secondary` | `#475569` | Body copy, descriptions |
| `--color-text-muted` | `#94A3B8` | Captions, subtle labels |
| `--color-text-on-dark` | `#F8FAFC` | Text on dark backgrounds |

### Functional Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success` | `#16A34A` | Success states, confirmations |
| `--color-warning` | `#F59E0B` | Warnings, attention |
| `--color-error` | `#DC2626` | Errors, required field indicators |

### Application Rules

- Use `rgba(var(--color-primary-rgb), 0.1)` for light tinted backgrounds
- Use `rgba(var(--color-primary-rgb), 0.2)` for hover states on light backgrounds
- Dark sections use `--color-dark` background with `--color-text-on-dark` text
- Never use pure black `#000000` for text or backgrounds
- All colors defined as CSS custom properties in Tailwind config `extend.colors`

---

## Typography

### Font Stack

| Role | Font | Fallback | Weight |
|------|------|----------|--------|
| **Headings** | Plus Jakarta Sans | system-ui, sans-serif | 700 (Bold), 800 (ExtraBold) |
| **Body** | Plus Jakarta Sans | system-ui, sans-serif | 400 (Regular), 500 (Medium) |
| **Accent/CTA** | Plus Jakarta Sans | system-ui, sans-serif | 600 (SemiBold) |

### Scale

| Element | Desktop | Mobile | Weight | Line Height |
|---------|---------|--------|--------|-------------|
| Hero headline | 64px / 4rem | 36px / 2.25rem | 800 | 1.1 |
| Section heading | 40px / 2.5rem | 28px / 1.75rem | 700 | 1.2 |
| Section subheading | 20px / 1.25rem | 16px / 1rem | 500 | 1.5 |
| Body text | 18px / 1.125rem | 16px / 1rem | 400 | 1.6 |
| Small / caption | 14px / 0.875rem | 13px / 0.8125rem | 400 | 1.5 |
| Button text | 16px / 1rem | 15px / 0.9375rem | 600 | 1 |
| Nav links | 15px / 0.9375rem | 15px / 0.9375rem | 500 | 1 |

### Font Loading

- Load via `next/font/google` for automatic optimization
- Use `display: swap` to prevent flash of invisible text

---

## Spacing & Layout

### Container

- Max width: `1280px` centered
- Horizontal padding: `24px` mobile, `32px` tablet, `48px` desktop
- Section vertical padding: `80px` desktop, `56px` mobile

### Grid

- 12-column grid on desktop
- 4-column grid on mobile
- Gap: `24px` standard, `32px` for larger layouts

### Breakpoints (Tailwind defaults)

| Name | Min Width |
|------|-----------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

### Border Radius

| Usage | Value |
|-------|-------|
| Buttons | `12px` |
| Cards | `16px` |
| Pill navbar | `9999px` (full round) |
| Inputs | `10px` |
| Small chips/badges | `8px` |

---

## Shadows

| Usage | Value |
|-------|-------|
| Cards (resting) | `0 1px 3px rgba(0,0,0,0.08)` |
| Cards (hover) | `0 8px 24px rgba(0,0,0,0.12)` |
| Pill navbar | `0 4px 16px rgba(0,0,0,0.1)` |
| Buttons (hover) | `0 4px 12px rgba(37,99,235,0.3)` |

---

## Page Structure

### Overview

```
[Navbar - sticky, morphs to pill on scroll]
[Hero Section - light bg, headshot + headline + stats + CTA]
[How It Works - light bg, 3-step process]
[About - DARK bg, bio + credentials]
[Services - light bg, bento grid]
[Boroughs - surface bg, coverage area]
[Testimonials - light bg, scrolling cards]
[CTA / Apply - DARK bg, tenant + landlord paths]
[Footer - dark bg, contact + links]
```

---

## Section Specifications

### Section 1: Navbar

**Component Map:**
- HeroUI `Navbar` as base
- Framer Motion for pill morph animation

**Default State (top of page):**
- Full-width, transparent background
- Left: "Nyrell Nunez" text logotype (Plus Jakarta Sans, 700 weight)
- Center-right: nav links (About, Services, How It Works, Contact)
- Right: "Get Started" button (`--color-primary` background, white text, 12px radius)
- Height: `72px`

**Scrolled State (after hero):**
- Morphs to floating centered pill
- White background, `--pill-shadow`
- Border radius: `9999px`
- Width: auto (shrinks to content)
- Horizontally centered
- Links condensed, CTA stays
- Height: `56px`
- Transition: 300ms ease

**Mobile:**
- Hamburger icon on right
- HeroUI `Drawer` slides in from right with full navigation
- Drawer has "Get Started" CTA at bottom

**Checklist:**
- [ ] HeroUI Navbar installed and configured
- [ ] Desktop nav links working (smooth scroll to sections)
- [ ] Pill morph animation on scroll with Framer Motion
- [ ] Mobile hamburger + Drawer working
- [ ] "Get Started" CTA links to apply section
- [ ] Transparent on hero, solid on scroll
- [ ] Sticky positioning
- [ ] Focus-visible states on all interactive elements
- [ ] Touch targets minimum 44x44px

---

### Section 2: Hero

**Background:** `--color-light` with Magic UI `Dot Pattern` overlay (subtle, low opacity)

**Layout:** Two-column on desktop, stacked on mobile

**Left Column (60% width desktop):**
- Eyebrow text: "Licensed NYC Real Estate Agent" (small, `--color-text-secondary`, Magic UI `Blur Fade` entrance)
- Headline: "Find Your Next Home." (Magic UI `Text Animate` — fade up word by word)
- Subheadline: "I handle CityFHEPS, Section 8 & HASA so you don't have to." (`--color-text-secondary`, 20px)
- Stats row (3 items, horizontal):
  - "5 Boroughs" — Magic UI `Number Ticker` counting from 0 to 5
  - "100+ Families" — Magic UI `Number Ticker`
  - "3 Programs" — Magic UI `Number Ticker`
  - Each stat: large number + small label below
- CTA: Magic UI `Shimmer Button` — "Start Your Application" (`--color-primary`)
- Secondary link: "I'm a landlord" text link below CTA

**Right Column (40% width desktop):**
- Professional headshot (`nyrell-nunez.jpeg`)
- Clean rounded frame (16px radius)
- Subtle shadow on hover
- On mobile: headshot moves above headline

**Checklist:**
- [ ] Two-column layout responsive to stacked on mobile
- [ ] Magic UI Dot Pattern background installed
- [ ] Magic UI Text Animate on headline
- [ ] Magic UI Number Ticker on all 3 stats
- [ ] Magic UI Shimmer Button for primary CTA
- [ ] Magic UI Blur Fade on eyebrow text
- [ ] Headshot image optimized with next/image
- [ ] Secondary "I'm a landlord" link
- [ ] Mobile: headshot stacks above text
- [ ] All animations trigger on page load

---

### Section 3: How It Works

**Background:** `--color-light`  
**Section heading:** "How It Works" (Magic UI `Blur Fade` entrance)

**Layout:** 3 cards in a horizontal row, connected by Magic UI `Animated Beam`

**Cards (HeroUI `Card`):**

| Step | Icon | Title | Description |
|------|------|-------|-------------|
| 1 | Clipboard/form icon | "Apply" | "Fill out a quick application. Tell us about your housing needs and subsidy program." |
| 2 | Handshake icon | "We Match You" | "We find landlords who accept your program and match you with the right apartment." |
| 3 | Home/key icon | "Move In" | "We handle the paperwork, inspections, and approvals. You get your keys." |

**Card styling:**
- White background, `--card-shadow` resting, `--card-hover-shadow` on hover
- Step number badge: `--color-primary` circle with white number
- 16px border radius
- Each card enters with Magic UI `Blur Fade` (staggered 200ms)

**Animated Beam:**
- Connects step 1 to step 2 to step 3
- `--color-primary` at 30% opacity
- Animates left-to-right when section scrolls into view

**Checklist:**
- [ ] Section heading with Blur Fade
- [ ] 3 HeroUI Cards with step content
- [ ] Step number badges styled
- [ ] Magic UI Animated Beam connecting cards
- [ ] Staggered Blur Fade entrance for cards
- [ ] Icons sourced (Lucide React or similar)
- [ ] Responsive: stack vertically on mobile, beam becomes vertical line
- [ ] Hover states on cards

---

### Section 4: About

**Background:** `--color-dark` (charcoal `#1E293B`)  
**Text:** `--color-text-on-dark`

**Layout:** Two-column on desktop, stacked on mobile

**Left Column (40%):**
- Headshot (same image or alternate) with subtle border glow using Magic UI `Shine Border`
- Rounded frame

**Right Column (60%):**
- Section heading: "Meet Nyrell" (white, Magic UI `Text Reveal` on scroll)
- Bio paragraph: "I'm a licensed real estate agent serving all five boroughs of New York City. I specialize in rental transactions with deep experience in CityFHEPS, Section 8, HASA, and other subsidy programs. My mission is to close the gap between tenants and landlords — making the housing process simple, transparent, and stress-free."
- Credentials list:
  - Licensed Real Estate Agent, New York State
  - Specializing in Sales & Rentals
  - Subsidy Program Expert
- Each credential enters with Magic UI `Blur Fade` staggered

**Checklist:**
- [ ] Dark background section applied
- [ ] Light text colors for contrast (WCAG AA minimum)
- [ ] Magic UI Shine Border on headshot
- [ ] Magic UI Text Reveal on heading
- [ ] Bio content written and styled
- [ ] Credentials list with staggered Blur Fade
- [ ] Two-column to stacked responsive
- [ ] Sufficient contrast ratio verified

---

### Section 5: Services

**Background:** `--color-light`  
**Section heading:** "What I Do" (Magic UI `Blur Fade`)

**Layout:** Magic UI `Bento Grid` — mixed card sizes

**Grid Layout (desktop):**
```
[  CityFHEPS (large - 2 cols)  ] [ Section 8 (1 col)  ]
[ HASA (1 col) ] [ Sales & Rentals (1 col) ] [ Landlord Matching (1 col) ]
```

**Card Contents:**

| Service | Size | Description |
|---------|------|-------------|
| CityFHEPS Navigation | Large (2-col span) | "Expert guidance through the CityFHEPS application process. From voucher to lease signing, I handle every step." |
| Section 8 Assistance | Medium (1-col) | "Navigating Section 8 approvals, inspections, and landlord negotiations." |
| HASA Support | Medium (1-col) | "Specialized support for HASA recipients finding suitable housing." |
| Sales & Rentals | Standard (1-col) | "Full-service real estate for buyers and renters across all five boroughs." |
| Landlord Matching | Standard (1-col) | "Connecting property owners with qualified, voucher-holding tenants." |

**Card styling:**
- HeroUI `Card` base
- Magic UI `Magic Card` hover effect (glow + tilt)
- `--color-surface` background, white on hover
- Service icon in `--color-primary` at top of each card
- 16px border radius

**Checklist:**
- [ ] Magic UI Bento Grid layout implemented
- [ ] 5 service cards with correct sizing
- [ ] Magic UI Magic Card hover effect on each card
- [ ] Service descriptions written
- [ ] Icons for each service (Lucide React)
- [ ] Section heading with Blur Fade
- [ ] Responsive: single column stack on mobile
- [ ] Cards maintain consistent padding and spacing

---

### Section 6: Boroughs Served

**Background:** `--color-surface`

**Layout:** Magic UI `Marquee` — continuous horizontal scroll

**Content:** Borough names in large, bold typography scrolling:
"Manhattan -- Brooklyn -- Queens -- The Bronx -- Staten Island"

- Separated by decorative dots or dashes in `--color-secondary`
- Text color: `--color-text-primary`
- Font size: 32px desktop, 24px mobile
- Weight: 700
- Marquee speed: moderate, smooth
- Duplicate content for seamless loop

**Above marquee:** Small centered label "Serving All Five Boroughs" in `--color-text-secondary`

**Checklist:**
- [ ] Magic UI Marquee component installed
- [ ] All 5 boroughs listed
- [ ] Label text above marquee
- [ ] Smooth continuous scroll animation
- [ ] Responsive font sizing
- [ ] Appropriate speed (not too fast)

---

### Section 7: Testimonials

**Background:** `--color-light`  
**Section heading:** "What Our Clients Say" (Magic UI `Blur Fade`)

**Layout:** Magic UI `Marquee` with HeroUI `Card` testimonial cards

**Card structure:**
- Quote text (italic, `--color-text-primary`)
- Client first name + last initial
- Borough
- Small avatar placeholder (HeroUI `Avatar`)
- Card background: white, `--card-shadow`
- 16px border radius

**Placeholder testimonials (3-5 cards):**
1. "Nyrell made the CityFHEPS process so simple. I was in my new apartment within a month." -- Maria R., Brooklyn
2. "I had been searching for months. Nyrell found me a place that accepted my voucher in two weeks." -- James T., Queens
3. "Professional, patient, and really knows the system. Highly recommend." -- Sonia M., The Bronx
4. "As a landlord, working with Nyrell was seamless. He handles everything." -- David K., Manhattan

**Marquee config:**
- Auto-scroll with pause on hover
- Two rows scrolling in opposite directions (if enough cards)
- Smooth, moderate speed

**Checklist:**
- [ ] Magic UI Marquee set up for testimonial cards
- [ ] HeroUI Card styled for testimonial format
- [ ] Placeholder testimonials written
- [ ] HeroUI Avatar placeholders
- [ ] Pause on hover behavior
- [ ] Section heading with Blur Fade
- [ ] Responsive card sizing
- [ ] Easy to swap placeholder content for real testimonials later

---

### Section 8: CTA / Apply

**Background:** `--color-dark` (charcoal `#1E293B`)  
**Text:** `--color-text-on-dark`

**Layout:** Centered content, two cards side by side

**Heading:** "Ready to Find Your Home?" (Magic UI `Text Animate`)  
**Subheading:** "Whether you're a tenant looking for housing or a landlord with available units, we're here to help."

**Two Path Cards (HeroUI `Card`):**

| Card | Title | Description | CTA |
|------|-------|-------------|-----|
| Tenant | "I'm a Tenant" | "Apply now and let us help you navigate your subsidy program and find the right home." | Magic UI `Shimmer Button` -- "Apply as Tenant" -> `/apply/tenant` |
| Landlord | "I'm a Landlord" | "List your property and connect with qualified, voucher-holding tenants." | Magic UI `Shimmer Button` -- "Apply as Landlord" -> `/apply/landlord` |

**Card styling:**
- Semi-transparent white background: `rgba(255,255,255,0.05)`
- Magic UI `Shine Border` around each card
- 16px border radius
- Cards enter with Magic UI `Blur Fade` staggered

**Trust line below cards:** "Your information is secure. We review every application within 24 hours." (small, `--color-text-muted`)

**Checklist:**
- [ ] Dark background section
- [ ] Heading with Text Animate
- [ ] Two HeroUI Cards for tenant/landlord paths
- [ ] Magic UI Shine Border on cards
- [ ] Magic UI Shimmer Buttons linking to form pages
- [ ] Trust/security copy below cards
- [ ] Cards responsive: stack on mobile
- [ ] Links route to `/apply/tenant` and `/apply/landlord`

---

### Section 9: Footer

**Background:** `#111827` (slightly darker than section dark)  
**Text:** `--color-text-muted` and `--color-text-on-dark`

**Layout:** Simple, single section

**Content:**
- Name: "Nyrell Nunez" (white, 600 weight)
- Title: "Licensed Real Estate Agent | NYC" (`--color-text-muted`)
- Contact links (HeroUI `Link`):
  - Phone number
  - Email address
  - Instagram (if applicable)
- Divider line (HeroUI `Separator`): `rgba(255,255,255,0.1)`
- Copyright: "2026 Nyrell Nunez. All rights reserved."
- Background: Magic UI `Retro Grid` at very low opacity (5-10%)

**Checklist:**
- [ ] Footer layout styled
- [ ] Contact links with HeroUI Link components
- [ ] Phone, email, social links functional
- [ ] HeroUI Separator divider
- [ ] Copyright text
- [ ] Magic UI Retro Grid background (subtle)
- [ ] All links have focus-visible states
- [ ] Touch targets 44x44px minimum

---

## Separate Pages

### `/apply/tenant` - Tenant Application

**Layout:**
- Pill navbar (scrolled state by default)
- Clean centered form container (max-width 640px)
- HeroUI form components (Input, Select, TextArea, Checkbox, Button)
- Footer

**Form fields:** To be defined later (Nyrell has existing form)

**Checklist:**
- [ ] Page route created
- [ ] Navbar in pill state
- [ ] Form container styled
- [ ] HeroUI form components integrated
- [ ] Form submission handler (future: Google Sheets API)
- [ ] Document upload component (future: Google Drive API)
- [ ] Success/error states with HeroUI Alert
- [ ] Mobile responsive form layout
- [ ] Accessible validation (aria-describedby, aria-invalid)

### `/apply/landlord` - Landlord Application

**Layout:** Same structure as tenant page

**Form fields:** To be defined later (Nyrell has existing form)

**Checklist:**
- [ ] Page route created
- [ ] Navbar in pill state
- [ ] Form container styled
- [ ] HeroUI form components integrated
- [ ] Form submission handler (future: Google Sheets API)
- [ ] Document upload component (future: Google Drive API)
- [ ] Success/error states with HeroUI Alert
- [ ] Mobile responsive form layout
- [ ] Accessible validation (aria-describedby, aria-invalid)

---

## Animations Summary

| Element | Magic UI Component | Trigger | Duration |
|---------|-------------------|---------|----------|
| Hero headline | Text Animate | Page load | 800ms |
| Hero eyebrow | Blur Fade | Page load | 400ms |
| Hero stats | Number Ticker | Page load | 1200ms |
| Hero CTA | Shimmer Button | Continuous | Loop |
| Hero background | Dot Pattern | Static | -- |
| Section headings | Blur Fade | Scroll into view | 500ms |
| How It Works cards | Blur Fade (staggered) | Scroll into view | 400ms each, 200ms delay |
| How It Works beam | Animated Beam | Scroll into view | 1000ms |
| About heading | Text Reveal | Scroll into view | 600ms |
| About headshot border | Shine Border | Continuous | Loop |
| About credentials | Blur Fade (staggered) | Scroll into view | 400ms each |
| Service cards | Magic Card (hover) | Hover | 200ms |
| Boroughs | Marquee | Continuous | Loop |
| Testimonial cards | Marquee | Continuous, pause on hover | Loop |
| CTA heading | Text Animate | Scroll into view | 800ms |
| CTA cards border | Shine Border | Continuous | Loop |
| CTA buttons | Shimmer Button | Continuous | Loop |
| Footer background | Retro Grid | Static | -- |
| Navbar morph | Framer Motion | Scroll position | 300ms |

### Animation Principles

- All scroll-triggered animations use `threshold: 0.2` (trigger when 20% visible)
- Animations play once (no repeat on re-scroll)
- Respect `prefers-reduced-motion`: disable all animations when user has motion sensitivity enabled
- Stagger delay: 150-200ms between sequential items
- Easing: `ease-out` for entrances, `ease-in-out` for morphs

---

## Accessibility

- [ ] All interactive elements have `:focus-visible` outlines (`--color-primary` with 2px offset)
- [ ] Touch targets minimum 44x44px
- [ ] Color contrast WCAG AA on all text (4.5:1 body, 3:1 large text)
- [ ] Semantic HTML: proper heading hierarchy (h1 > h2 > h3)
- [ ] `prefers-reduced-motion` respected for all animations
- [ ] Alt text on all images
- [ ] Skip-to-content link (visually hidden, shown on focus)
- [ ] Proper `aria-labels` on icon-only buttons
- [ ] Form pages: `aria-describedby`, `aria-invalid`, `aria-live` regions

---

## Performance

- [ ] Images optimized with `next/image` (WebP, lazy loading)
- [ ] Fonts loaded with `next/font/google` (no layout shift)
- [ ] Magic UI components loaded dynamically where possible
- [ ] Target Lighthouse score: 90+ on all categories
- [ ] Bundle size monitored (HeroUI tree-shakes, only import used components)

---

## Mobile-First Responsive Design

All sections designed mobile-first. Key responsive behaviors:

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Navbar | Hamburger + Drawer | Full links | Full links + CTA |
| Hero | Stacked (image top) | Two-column | Two-column 60/40 |
| How It Works | Stacked cards, vertical line | Horizontal 3-col | Horizontal 3-col + beam |
| About | Stacked (image top) | Two-column | Two-column 40/60 |
| Services Bento | Single column | 2-column | Mixed grid (2+3) |
| Boroughs | Smaller text marquee | Full marquee | Full marquee |
| Testimonials | Single card width | Two card width | Three+ card marquee |
| CTA Cards | Stacked | Side by side | Side by side |
| Footer | Stacked centered | Single row | Single row |

---

## File Structure (Planned)

```
itsrellestate/
  public/
    images/
      nyrell-nunez.jpeg
  src/
    app/
      layout.tsx              -- Root layout, fonts, providers
      page.tsx                -- Homepage (single page)
      apply/
        tenant/
          page.tsx            -- Tenant application form
        landlord/
          page.tsx            -- Landlord application form
    components/
      navbar.tsx              -- Sticky navbar with pill morph
      hero.tsx                -- Hero section
      how-it-works.tsx        -- 3-step process
      about.tsx               -- About / bio section
      services.tsx            -- Bento grid services
      boroughs.tsx            -- Marquee boroughs
      testimonials.tsx        -- Marquee testimonial cards
      cta-apply.tsx           -- Dual CTA section
      footer.tsx              -- Footer
    lib/
      fonts.ts                -- Font configuration
    styles/
      globals.css             -- Global styles, CSS custom properties
  tailwind.config.ts          -- Design tokens, theme extension
  next.config.ts              -- Next.js configuration
```

---

## Implementation Priority

### Phase 1: Foundation
- [ ] Initialize Next.js project with TypeScript
- [ ] Install and configure Tailwind CSS
- [ ] Install HeroUI and configure provider
- [ ] Install Magic UI components (copy-paste)
- [ ] Install Framer Motion
- [ ] Set up design tokens in Tailwind config (colors, fonts, spacing, radii, shadows)
- [ ] Load Plus Jakarta Sans via next/font
- [ ] Create root layout with HeroUI provider
- [ ] Set up global CSS with custom properties

### Phase 2: Navbar
- [ ] Build HeroUI Navbar with desktop links
- [ ] Implement pill morph animation with Framer Motion
- [ ] Build mobile hamburger + Drawer
- [ ] Smooth scroll to section anchors
- [ ] Test sticky behavior across sections

### Phase 3: Hero Section
- [ ] Two-column layout
- [ ] Magic UI Dot Pattern background
- [ ] Magic UI Text Animate headline
- [ ] Magic UI Number Ticker stats
- [ ] Magic UI Shimmer Button CTA
- [ ] Headshot with next/image optimization
- [ ] Mobile stacked layout

### Phase 4: How It Works
- [ ] 3 HeroUI Cards with step content
- [ ] Magic UI Animated Beam connections
- [ ] Magic UI Blur Fade staggered entrance
- [ ] Icons integration
- [ ] Mobile vertical stack

### Phase 5: About Section
- [ ] Dark background section
- [ ] Magic UI Text Reveal heading
- [ ] Magic UI Shine Border on headshot
- [ ] Bio and credentials content
- [ ] Contrast verification

### Phase 6: Services
- [ ] Magic UI Bento Grid layout
- [ ] 5 service cards with descriptions
- [ ] Magic UI Magic Card hover effects
- [ ] Service icons
- [ ] Mobile responsive grid

### Phase 7: Boroughs + Testimonials
- [ ] Magic UI Marquee for boroughs
- [ ] Magic UI Marquee for testimonial cards
- [ ] Placeholder testimonial content
- [ ] Pause-on-hover behavior

### Phase 8: CTA + Footer
- [ ] Dark CTA section with dual cards
- [ ] Magic UI Shine Border + Shimmer Buttons
- [ ] Footer with contact links
- [ ] Magic UI Retro Grid background
- [ ] Copyright and social links

### Phase 9: Application Pages
- [ ] `/apply/tenant` route and page
- [ ] `/apply/landlord` route and page
- [ ] HeroUI form components styled
- [ ] Navbar in pill state by default
- [ ] Form layout responsive

### Phase 10: Polish + Deploy
- [ ] All animations respect prefers-reduced-motion
- [ ] Lighthouse audit (target 90+ all categories)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, mobile Safari)
- [ ] Accessibility audit
- [ ] Vercel deployment configuration
- [ ] Security headers configured
- [ ] OG/Twitter meta tags with local image assets
