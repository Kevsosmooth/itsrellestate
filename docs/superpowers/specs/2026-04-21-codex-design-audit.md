# Codex Design Audit -- ItsRellEstate

**Date:** 2026-04-21
**Model:** gpt-5.4 via Codex CLI
**Scope:** Full site design audit (colors, layout, imagery, copy, trust signals)

---

## Findings

### 1. Color Palette -- Generic SaaS, Not Warm Housing-Help

Primary blue (#2563EB / Tailwind blue-600) reads fintech/startup. Secondary coral (#F97066) barely drives the page. Dark (#1E293B) is cold slate. Result: blue + slate + white, not family-friendly housing support.

Overuse of dark sections: about.tsx, cta-apply.tsx, and footer.tsx all use bg-dark, conflicting with the "bright, not dark/luxury" brief.

### 2. Hero -- Does Not Communicate the Offer Fast Enough

Eyebrow "Licensed NYC Real Estate Agent" is weak -- table stakes, not a differentiator. H1 "Find Your Next Home" is generic -- could be any realtor or apartment app. The NYC bridge background image is postcard tourism, not persuasive for voucher holders.

### 3. Photo Treatment -- Circular Headshot Looks Cheap

Circular crop with thin blue ring reads like a social media avatar, not a trusted housing professional. Combined with the tuxedo headshot, it creates distance with the target audience.

### 4. Layout Flow -- Wrong Story Order

How It Works before About is backwards for a high-anxiety audience. Trust should come first. Boroughs section (marquee of 5 borough names) is filler -- adds motion but no persuasion. Testimonials arrive too late and auto-scrolling format reduces credibility.

### 5. Typography -- Readable But Too Uniform

Same font everywhere with similar weights creates flat hierarchy. Section headings all use identical text-3xl/text-4xl font-bold sizing. Supporting copy at text-sm is too small for a stressed, scanning audience. Low-opacity text on dark backgrounds is too timid.

### 6. Imagery -- Stock Photos Hurting More Than Helping

NYC bridge (hero), Empire State sunset (about), and staged key photo (CTA) are all generic stock. None says "real person helping real voucher holders through a difficult process."

### 7. Overall First Impression -- Not Enough Trust in 3 Seconds

Site reads as: a polished template, a general realtor brand, with subsidy keywords layered on. Damaging trust hits: fake phone number (tel:+1234567890), auto-scrolling testimonials feel invented.

### 8. Specific Fixes Ranked by Impact

1. Rewrite hero H1 to name audience and outcome explicitly
2. Replace skyline hero image with people-centered/housing-centered photography
3. Kill dark sections in About and CTA -- replace with light, warm surfaces
4. Replace circular tuxedo headshot with clean rectangular portrait
5. Reorder page: About and credibility above How It Works
6. Strip gimmicky UI effects (shimmer button, magic cards, marquee, retro grid)
7. Fix fake phone number immediately
8. Warm the color palette (soft sand, warm off-whites, muted peach)
9. Increase body text sizes and contrast
10. Narrow messaging -- lead with subsidy housing, not general brokerage
