# SEO Roadmap for ItsRellEstate

Date drafted: 2026-05-02
Owner: Kevin (project owner) / Nyrell (subject)

## Why this exists

This is the plan for making the ItsRellEstate website easy to find on Google
when people search for things like "CityFHEPS broker NYC", "Section 8 specialist
Brooklyn", or "HASA housing help." The site itself is built well, but Google
doesn't automatically know it exists or what it's about. We have to tell it.

This doc is the checklist of what to set up, in what order, and what each piece
actually does. Pick it up when the domain is locked in.

---

## Part 1: What gets set up before the domain is locked in

These don't need a real domain, so they can ship now.

### 1. Auto-generated sitemap

A sitemap is a single file (`sitemap.xml`) that lists every page on the site.
Google reads it to discover pages it might otherwise miss. Next.js can generate
this automatically from the App Router's page files -- no manual maintenance.

What we add: `src/app/sitemap.ts`. It reads the route tree and outputs the XML.

### 2. robots.txt

A small file at `/robots.txt` that tells search engines what they're allowed to
crawl. We want to allow everything except the API routes and form-submit
endpoints.

What we add: `src/app/robots.ts`.

### 3. Schema markup (also called "structured data")

Special tags hidden in the page HTML that say things like "this is a real
estate agent, license number 10401396493, serving NYC, specializing in
CityFHEPS / Section 8 / HASA." Google uses this to show rich results -- the
fancy snippets that appear at the top of search pages with stars, photos, and
extra info.

For Nyrell's site we want at minimum:

- **RealEstateAgent** schema on the homepage (name, license, service area, services)
- **Service** schema on each subsidy program page (CityFHEPS, Section 8, HASA)
- **FAQPage** schema if/when we add an FAQ section
- **BreadcrumbList** schema on nested pages

These go into the page source as `<script type="application/ld+json">` blocks.
Next.js makes it easy with the `generateMetadata` API.

### 4. Per-page meta titles and descriptions

Every page should have a custom `<title>` tag and `<meta name="description">`
tuned for the search phrases real applicants type. Examples:

- Homepage title: `Nyrell Nunez | NYC CityFHEPS, Section 8 & HASA Specialist`
- Tenant apply page: `Apply for Subsidy Housing Help in NYC | ItsRellEstate`
- Description: `Licensed NYC real estate agent helping CityFHEPS, Section 8,
  and HASA tenants find apartments. Free consultation, no broker fee.`

These show up as the blue link and gray description in Google search results.
They're the first thing applicants see -- they decide whether to click.

### 5. Open Graph / Twitter card tags

When someone shares a link to the site in iMessage, WhatsApp, Facebook,
Twitter, etc., these tags control the preview card (image, title, description).
A nice preview card gets clicked more. Without these, the link looks broken or
generic.

Next.js handles this through `metadata.openGraph` in each page file.

---

## Part 2: What gets set up once the domain is locked in

These all need a live domain (not a Vercel preview URL).

### 6. Google Search Console verification

Search Console is Google's free dashboard showing how the site performs in
search. Setup steps:

1. Go to https://search.google.com/search-console
2. Add the domain (e.g. `itsrellestate.com`)
3. Verify ownership. Two options:
   - **DNS method (preferred):** add a TXT record to the domain registrar.
     One-time setup, never breaks.
   - **HTML method:** add a meta tag to the site head. Simpler but breaks if
     the meta tag is ever removed.
4. Submit the sitemap URL: `https://itsrellestate.com/sitemap.xml`
5. Wait 3-7 days for Google to crawl and start showing data

After it's set up, the dashboard shows:

- **Performance**: which search queries surface the site, click-through rates,
  average position
- **Coverage**: which pages Google has indexed vs skipped vs errored
- **Sitemaps**: confirmation Google read the sitemap
- **Mobile usability**: mobile-specific issues
- **Core Web Vitals**: speed scores Google uses for ranking

### 7. Bing Webmaster Tools

Same idea as Search Console but for Bing. Smaller audience but covers Bing,
DuckDuckGo, ChatGPT, and other search engines that index from Bing's data.
Five-minute setup.

URL: https://www.bing.com/webmasters

### 8. Google Business Profile

Free Google listing that shows up in Maps and the right-hand sidebar of
relevant searches ("Nyrell Nunez" or "real estate agent near me"). Includes:

- Photo, hours, contact info
- Customer reviews
- Service area (NYC + boroughs)
- Real estate license number

URL: https://www.google.com/business

### 9. Google Analytics 4 (optional but recommended)

Search Console tells us how people **find** the site. Analytics tells us what
they **do** on it. Pair the two for a full picture.

Setup: create a GA4 property, add the tracking ID to the site as a Next.js
`<Script>` component. Privacy note: respect cookie consent if applicable.

URL: https://analytics.google.com

---

## Part 3: Ongoing SEO work

Search Console is a measuring tape, not a builder. Once data starts flowing
(2-4 weeks after launch), the cycle is:

1. Look at the queries bringing people in
2. Find queries where the site shows up on page 2 of Google -- those are the
   easy wins. Tune the page content / title / description to push them to
   page 1.
3. Find pages with high impressions but low clicks -- the title and
   description aren't compelling. Rewrite them.
4. Find pages Google has skipped or errored -- fix them.
5. Watch for spikes (good or bad) and trace them to whatever changed.

This is the actual SEO work. The technical setup is just the foundation.

---

## Quick reference: priorities by phase

**Now (no domain needed):**
- [ ] sitemap.xml via Next.js sitemap generator
- [ ] robots.txt via Next.js robots generator
- [ ] RealEstateAgent schema on homepage
- [ ] Per-page `<title>` and `<meta name="description">`
- [ ] Open Graph / Twitter card images

**When domain is live:**
- [ ] Google Search Console verification + submit sitemap
- [ ] Bing Webmaster Tools
- [ ] Google Business Profile
- [ ] Google Analytics 4 (optional)

**After 2-4 weeks of live traffic:**
- [ ] Review Search Console "Performance" tab for first wins
- [ ] Tune titles/descriptions on underperforming pages
- [ ] Fix any "Coverage" errors

---

## Notes on what NOT to chase

A few things sound good but aren't worth time for this site:

- **Backlink farms / link buying**: Google penalizes this. Don't.
- **Keyword stuffing**: writing copy with the same phrase repeated 20 times.
  Modern Google ignores or penalizes it.
- **Hidden text**: invisible keywords. Don't.
- **AI-generated bulk content**: 50 cookie-cutter blog posts about housing.
  Google has gotten good at detecting and demoting these.

The honest play is: real, helpful content for real applicants. Nyrell's actual
expertise is the moat. The website's job is to present it clearly so Google
can match it to the right searches.

---

## Open questions for next session

- What's the final domain? (`itsrellestate.com`?)
- Where is DNS managed? (Vercel? Cloudflare? Registrar default?)
- Will there be a blog / content section, or is it staying transactional
  (forms + program info)? More content = more search surface, but takes more
  ongoing effort.
- Should there be a separate page per program (CityFHEPS / Section 8 / HASA),
  each tuned for that program's searches? Right now they share one page.
