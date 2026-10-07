# Launch checklist

Automated checks first, then the things a machine cannot do.

`npm run build` runs `i18n-check` and fails on anything that would ship broken.
`npm run audit` walks all 171 built pages. Both are currently green.

---

## Done and verified

**Content and structure**
- [x] 171 pages: 10 locales x 17 pages, plus the root shim (sitemap and robots on top)
- [x] Real locale routing (`/en/`, `/el/`, …), not same-URL dual-render
- [x] `/` negotiates locale from cookie, then `Accept-Language`, then English (302, `Vary`)
- [x] Full hreflang cluster + `x-default` on every page, live locales only
- [x] 301 map for legacy inbound URLs; `/wp-content/`, feeds and `xmlrpc.php` return 410
- [x] Custom 404 per locale, served in the locale the URL was already in
- [x] `sitemap.xml` (70 URLs, live locales) and `robots.txt` (AI crawlers explicitly allowed)
- [x] Draft locales (nl, pl, es, uk) are `noindex`, sitemap-excluded, hidden from the switcher, and carry a banner

**SEO**
- [x] Hand-written title + description per page per locale — 144 pairs, all within SERP limits
- [x] JSON-LD: `HealthAndBeautyBusiness` + `Person` + `WebSite` + `WebPage` + `BreadcrumbList`, `Service` on service pages, `FAQPage` on contact
- [x] `knowsLanguage: el, en, it, fr, de, ru` on the Person only — never derived from the ten locales
- [x] No `Offer` node and no price anywhere while prices are on request (build fails if one appears)
- [x] No `aggregateRating` — 42 self-hosted comments are not a valid rating source
- [x] Credentials in structured data with their real dates and protocol numbers, read off the scans

**Accessibility**
- [x] Skip link, `<main>` landmark, one `<h1>` per page
- [x] Every image has alt text; the build gate fails if any is empty or missing
- [x] No form controls anywhere; `npm run audit` still fails on an unlabelled control if one is ever added
- [x] Testimonials carry `lang` on the quote itself (WCAG 3.1.2), with the translation labelled as one
- [x] Focus visible at 3px on every interactive element; all targets >= 48px
- [x] Contrast checked: ink 13.0:1, muted 6.8:1, sea 6.3:1, terracotta 4.7:1 on the shell
- [x] Motion is one fade-up, off under `prefers-reduced-motion`, and content is visible with JS disabled

**Performance**
- [x] AVIF / WebP / JPEG ladder at up to 4 widths, explicit width/height on every image (zero CLS)
- [x] Fonts self-hosted and split by `unicode-range` — a Greek page never downloads Cyrillic
- [x] Google Fonts never hotlinked (German courts have held that an unlawful transfer; German is the largest non-English audience here)
- [x] Static assets `immutable` for a year, CSS a day, HTML 5 minutes
- [x] One stylesheet, two small scripts, no framework. The one third-party request is the Google Maps iframe (home and location pages), disclosed in the privacy policy and now `loading="lazy"` so it never loads unless a visitor scrolls to it
- [x] Image masters (`_src`, `_brand`, 6.2MB) excluded from the build output; `npm run audit` fails if they reappear
- [x] Every buildable asset over 1KB precompressed with brotli and gzip at build time, served via `@fastify/static`'s `preCompressed` (5.9MB compressible output -> 1.17MB brotli)
- [x] CSS and JS minified with esbuild: `main.css` 40.5KB -> 26.0KB, `site.js` 14.1KB -> 7.7KB
- [x] `fonts.css` linked directly instead of `@import`-ed from `main.css` (removed a serial render-blocking request)
- [x] `@fastify/helmet` and `pino` removed (both unused; headers are hand-rolled, Fastify bundles its own pino)
- [x] Localized 404 pages read into memory once at boot instead of on every miss
- [x] Header height uses `ResizeObserver` instead of an unthrottled `resize` listener
- [x] Google Maps iframe (home, location) is `loading="lazy"`: it only loads once a
      visitor scrolls near it, not on every page load
- [x] The 404 rate limiter keys on `X-Real-Ip` instead of `req.ip`. Railway's own
      guidance on which end of `X-Forwarded-For` to trust is inconsistent, but Railway
      confirms clients cannot set `X-Real-Ip` themselves

Lighthouse mobile (simulated throttling, local machine, not a clean CI runner — treat as approximate):

| Page | LCP | CLS | TBT | Requests | Transfer |
|---|---|---|---|---|---|
| `/en/` | 2.5s | 0 | 0ms | 16 | 272KB |
| `/en/services/relaxing-massage/` | 2.03s | 0 | 89ms | 13 | 188KB |
| `/en/contact/` | 1.89s | 0 | 0ms | 12 | 167KB |

All three green (LCP < 2.5s, CLS < 0.1, TBT < 200ms). The home page row is the Phase 2
recheck: lazy-loading the Maps iframe cut its transfer from 735KB to 272KB and its
requests from 33 to 16 (the map's own JS and tiles no longer load until scrolled to).
The other two rows are unchanged from Phase 1 — nothing in Phase 2 touched those pages.
The home page LCP sits close to the 2.5s boundary — not a regression from this work,
but worth a clean-environment recheck before launch rather than trusting a shared dev
machine's numbers.

Not done: a CDN in front of Railway (`docs/PERFORMANCE-PLAN.md` step 8). Deferred, not
declined — it needs a Cloudflare account and DNS access to set up. When it happens,
cache `/assets/*` at the edge first (safe on its own). Since the booking form was removed
the server sets no cookies, so HTML pages can be edge-cached too. The one exception is `/`:
it redirects per `Accept-Language` and the `lang` cookie, and Cloudflare does not honour
`Vary: accept-language, cookie`, so `/` must bypass the edge cache.

**Security**
- [x] CSP with no `unsafe-inline` anywhere — no template carries an inline style or script, and the audit enforces it
- [x] HSTS (production only), `nosniff`, `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy, COOP/CORP
- [x] No booking form and no POST endpoint. Booking is WhatsApp and phone only (client's decision); the form, `/api/booking`, the Resend mailer and the `ft`/`csrf` cookies were removed on 2026-09-28
- [x] CSP `form-action 'none'` and `connect-src 'none'`: nothing on the site submits or fetches anything
- [x] 16KB body limit, no upload endpoint, no CORS, directory listing off, dotfiles denied
- [x] Salted one-way IP hash in the logs; the plain address is never written
- [x] Third-party PII removed: the WMF scan is cropped to drop the validating lawyer's name, bar number, tax number, address and phone; the old webmaster's contact details are not carried over
- [x] GPS EXIF stripped from every image, verified by the processing script itself

**Content integrity**
- [x] 42 real testimonials, owner replies excluded, duplicates collapsed, surnames removed
- [x] No photograph of any client anywhere (the four `fessaras-banner*` files were discarded)
- [x] Privacy policy, terms and cookie banner are three real documents, in all ten languages
- [x] Terms carry a "wellness, not medical treatment" clause and an explicit conduct clause

---

## Before deploying

- [ ] **Generate the last four illustrations** — see `docs/PENDING-IMAGES.md`. Not a
      blocker: a stand-in renders with honest alt text, and `npm run check` reports it.
- [ ] Set the environment variables below in Railway
- [ ] Point the domain at the Railway service, confirm TLS is live **before** the first
      request with HSTS on — a 2-year `max-age` on a domain without a valid certificate
      locks visitors out and cannot be undone from the server side
- [ ] `SITE_ORIGIN` must match the final domain exactly (it feeds canonicals, hreflang and OG)

### Environment variables

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production`: this is what switches HSTS on |
| `SITE_ORIGIN` | `https://www.mastichari-massage.gr` |
| `PORT` | Railway sets this |
| `IP_SALT` | long random string; rotating it resets the 404 rate-limit buckets |

`FORM_SECRET`, `RESEND_API_KEY`, `BOOKING_TO` and `BOOKING_FROM` are no longer read by
anything. If they are still set in Railway they can be deleted there, along with the
Resend API key and its sending-domain DNS records, if those were only for the form.

---

## Verify on the deployed URL

- [ ] Lighthouse on mobile throttling — home, one service page, contact. LCP/CLS/INP green.
- [ ] axe on home, a service page and contact, in English and Greek
- [ ] Keyboard-only pass: tab through the nav, the language switcher, the FAQ
      accordions and the cookie notice. Focus must stay visible throughout.
- [ ] Screen reader over the testimonial wall — that is where the mixed-language
      markup either works or does not
- [ ] Real viewports at 320px, 375px and 768px. Check German and Greek especially:
      "Anti-Stress-Rückenmassage" and "Θεραπευτικό και αθλητικό μασάζ" are the
      longest strings on the site.
- [ ] Paste a link into WhatsApp, Telegram and iMessage and confirm the OG card renders
- [ ] On a real phone: the WhatsApp and call buttons open the right app with the right number
- [ ] Old URLs: `/mastichari/about-us/` → `/en/about/`, `/mastichari/feed/` → 410

---

## After launch — needs Konstantinos' own Google account

- [ ] Google Search Console: verify the domain, submit `/sitemap.xml`
- [ ] Google Business Profile: create or claim it, then ask returning clients for
      reviews. For "massage Kos" this will outrank the website on its own.
- [ ] Native-speaker proofread of German, then Russian (the two largest non-English
      audiences). After that, Dutch, Polish, Spanish and Ukrainian.
      Flip each locale to `"status": "live"` in `content/_locales.json` as it is
      cleared; nothing else needs changing.
- [ ] Work through `docs/CLIENT-QUESTIONS.md`

---

## Deploying

Railway builds from `package.json`. `npm run build` produces `_site/`, and
`npm start` runs the Fastify server in front of it.

**Never `git push` from this repo.** Commits only — Theodoros pushes.
