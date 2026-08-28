# Launch checklist

Automated checks first, then the things a machine cannot do.

`npm run build` runs `i18n-check` and fails on anything that would ship broken.
`npm run audit` walks all 145 built pages. Both are currently green.

---

## Done and verified

**Content and structure**
- [x] 145 pages: 9 locales x 16 pages, plus sitemap, robots and root shim
- [x] Real locale routing (`/en/`, `/el/`, …), not same-URL dual-render
- [x] `/` negotiates locale from cookie, then `Accept-Language`, then English (302, `Vary`)
- [x] Full hreflang cluster + `x-default` on every page, live locales only
- [x] 301 map from the old WordPress URLs; `/wp-content/`, feeds and `xmlrpc.php` return 410
- [x] Custom 404 per locale, served in the locale the URL was already in
- [x] `sitemap.xml` (70 URLs, live locales) and `robots.txt` (AI crawlers explicitly allowed)
- [x] Draft locales (nl, pl, es, uk) are `noindex`, sitemap-excluded, hidden from the switcher, and carry a banner

**SEO**
- [x] Hand-written title + description per page per locale — 144 pairs, all within SERP limits
- [x] JSON-LD: `HealthAndBeautyBusiness` + `Person` + `WebSite` + `WebPage` + `BreadcrumbList`, `Service` on service pages, `FAQPage` on contact
- [x] `knowsLanguage: el, en, it` on the Person only — never derived from the nine locales
- [x] No `Offer` node and no price anywhere while prices are on request (build fails if one appears)
- [x] No `aggregateRating` — 41 self-hosted comments are not a valid rating source
- [x] Credentials in structured data with their real dates and protocol numbers, read off the scans

**Accessibility**
- [x] Skip link, `<main>` landmark, one `<h1>` per page
- [x] Every image has alt text; the build gate fails if any is empty or missing
- [x] Every form control has a matching `<label for>`
- [x] Testimonials carry `lang` on the quote itself (WCAG 3.1.2), with the translation labelled as one
- [x] Focus visible at 3px on every interactive element; all targets >= 48px
- [x] Contrast checked: ink 13.0:1, muted 6.8:1, sea 6.3:1, terracotta 4.7:1, error 7.1:1 on the shell
- [x] Motion is one fade-up, off under `prefers-reduced-motion`, and content is visible with JS disabled

**Performance**
- [x] AVIF / WebP / JPEG ladder at up to 4 widths, explicit width/height on every image (zero CLS)
- [x] Fonts self-hosted and split by `unicode-range` — a Greek page never downloads Cyrillic
- [x] Google Fonts never hotlinked (German courts have held that an unlawful transfer; German is the largest non-English audience here)
- [x] Static assets `immutable` for a year, CSS a day, HTML 5 minutes
- [x] One stylesheet, two small scripts, no framework, no third-party request of any kind

**Security**
- [x] CSP with no `unsafe-inline` anywhere — no template carries an inline style or script, and the audit enforces it
- [x] HSTS (production only), `nosniff`, `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy, COOP/CORP
- [x] Booking form: honeypot, signed time-trap cookie, CSRF double-submit, Origin + Sec-Fetch-Site checks, 5/10min per IP, 2/hour per email
- [x] Control characters and CRLF stripped from every field before the email is built (header injection is the live risk here)
- [x] 16KB body limit, no upload endpoint, no CORS, directory listing off, dotfiles denied
- [x] Salted one-way IP hash in the logs; the plain address is never written
- [x] Third-party PII removed: the WMF scan is cropped to drop the validating lawyer's name, bar number, tax number, address and phone; the old webmaster's contact details are not carried over
- [x] GPS EXIF stripped from every image, verified by the processing script itself

**Content integrity**
- [x] 41 real testimonials, owner replies excluded, duplicates collapsed, surnames removed
- [x] No photograph of any client anywhere (the four `fessaras-banner*` files were discarded)
- [x] AI-generated illustration disclosed in the footer and the privacy policy
- [x] Privacy policy, terms and cookie banner are three real documents, in all nine languages
- [x] Terms carry a "wellness, not medical treatment" clause and an explicit conduct clause

---

## Before deploying

- [ ] **Generate the last four illustrations** — see `docs/PENDING-IMAGES.md`. Not a
      blocker: a stand-in renders with honest alt text, and `npm run check` reports it.
- [ ] Set the environment variables below in Railway
- [ ] Point the domain at the Railway service, confirm TLS is live **before** the first
      request with HSTS on — a 2-year `max-age` on a domain without a valid certificate
      locks visitors out and cannot be undone from the server side
- [ ] `SITE_ORIGIN` must match the final domain exactly (it feeds canonicals, hreflang, OG and the CSRF origin check)

### Environment variables

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` — this is what switches HSTS and `Secure` cookies on |
| `SITE_ORIGIN` | `https://www.mastichari-massage.gr` |
| `PORT` | Railway sets this |
| `FORM_SECRET` | long random string; without it each restart invalidates every open form |
| `IP_SALT` | long random string; rotating it resets the rate-limit buckets |
| `RESEND_API_KEY` | Resend, EU region |
| `BOOKING_TO` | `kosfess@hotmail.com` |
| `BOOKING_FROM` | an address on a domain you control, with SPF/DKIM/DMARC set up |

### Email deliverability — the most likely silent failure

The booking form is worthless if the mail does not arrive, and Hotmail is strict.

- [ ] SPF, DKIM and DMARC configured for the sending domain in Resend
- [ ] `BOOKING_FROM` is on a domain you control — **never** the enquirer's address
- [ ] Send a real booking through the live form and confirm it lands in the
      `kosfess@hotmail.com` **inbox**, not the junk folder
- [ ] Confirm Reply-To is the enquirer, so hitting reply reaches them
- [ ] Have Konstantinos mark the first message "not junk" if it lands there

---

## Verify on the deployed URL

- [ ] Lighthouse on mobile throttling — home, one service page, contact. LCP/CLS/INP green.
- [ ] axe on home, a service page and contact, in English and Greek
- [ ] Keyboard-only pass: tab through the nav, the language switcher, the FAQ
      accordions and the whole booking form. Focus must stay visible throughout.
- [ ] Screen reader over the testimonial wall — that is where the mixed-language
      markup either works or does not
- [ ] Real viewports at 320px, 375px and 768px. Check German and Greek especially:
      "Anti-Stress-Rückenmassage" and "Θεραπευτικό και αθλητικό μασάζ" are the
      longest strings on the site.
- [ ] Paste a link into WhatsApp, Telegram and iMessage and confirm the OG card renders
- [ ] Booking form end to end: happy path, honeypot, rate limit, validation errors,
      and a CRLF attempt in the name field. Then the same with JavaScript disabled.
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
