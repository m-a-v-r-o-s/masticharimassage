# Performance plan

Audit of the standard performance checklist against this codebase (2026-09-15).
The site is 181 static Eleventy pages behind one small Fastify process on Railway,
with no database, no frontend framework and one POST endpoint. About half the
checklist has no layer to apply to here. Those items are marked N/A with the
reason, so nobody builds infrastructure the site does not have.

## Status of every item

| Item | Status | Where / why |
|---|---|---|
| Compress API payloads | **Do** (as static precompression) | Nothing is compressed today: no gzip, no brotli on HTML/CSS/JS. Step 2 |
| Minify JS and CSS | **Do** | `main.css` 40KB and `site.js` 14KB ship with comments and whitespace. Step 3 |
| Defer non-critical scripts | **Do** (one fix) | `site.js` is already `defer`. But `main.css` starts with `@import url(fonts.css)`, a serial render-blocking request chain. Step 4 |
| Add lazy loading | **Decision** | Images are already lazy below the fold (`partials/pic.njk`). The Google Maps iframe on home and location loads eagerly on purpose (comment in `partials/studio-map.njk`). Step 7 |
| Compress images | Done, plus **one fix** | AVIF/WebP/JPEG ladder at q55/78/82 already. But the passthrough copy publishes the masters: `_site/assets/img/_src` (4.3MB) and `_brand` (1.9MB). Step 1 |
| Unused dependencies | **Do** | `@fastify/helmet` and `pino` are never imported. Headers are hand-rolled in `server/security.js`; Fastify bundles its own pino. Step 5 |
| Server-side caching | **Do** (small) | The 404 handler does `existsSync` + `readFileSync` on every miss. Load the localized 404 pages once at boot, as `COPY` already is. Step 6 |
| Debounce input handlers | **Do** (one handler) | No input/keyup handlers exist (validation runs on submit). The only hot handler is `resize` in `site.js:27`, which reads layout on every event. Step 6 |
| add CDN | **Decision** | Railway serves directly. Step 8 |
| Cache API responses | Done / N/A | Static assets already have cache headers (fonts/img immutable 1y, CSS/JS 1d, HTML 5min). The only API is `POST /api/booking`, which must never be cached |
| Loading skeletons | Done / N/A | Pages are static HTML, nothing fetches content. The one async action, the booking submit, already shows a spinner (`setBusy` in `site.js`) |
| Paginate large lists | Done | About page renders 3 of 42 testimonials with "show more" (`wall` macro). All 41 stay in the HTML on purpose, for crawlers |
| Split code into chunks | N/A | One 14KB script and two tiny ones. No bundle big enough to split |
| Load balancer | N/A | One studio's traffic. Replicas would also break things: the per-email limiter is an in-memory `Map`, and `FORM_SECRET`/`IP_SALT` fall back to per-process random values |
| Index the database | N/A | No database |
| Cache expensive queries | N/A | No database. The one external call is Resend, once per booking |
| N+1 database queries | N/A | No database |
| Database connection pooling | N/A | No database |
| Unnecessary re-renders | N/A | No framework. DOM is touched only on clicks and submit |

## Baseline first

Before changing anything, record numbers to compare against:

- `PORT=3001 NODE_ENV=production npm start` (never port 3000).
- Transfer size and request count of `/en/`, `/en/services/relaxing-massage/` and `/en/contact/`.
- Lighthouse mobile (or the `cloudflare:web-perf` skill) on those three pages: LCP, CLS, INP/TBT.
- `curl -sI -H 'Accept-Encoding: br, gzip' http://localhost:3001/en/`: note that there is no `content-encoding` header.

## Phase 1: no decisions needed

### Step 1. Stop publishing the image masters

`eleventy.config.js` copies all of `src/assets/img` into `_site`, including `_src/` and
`_brand/`, which only `scripts/process-images.js` and `scripts/build-icons.js` read.

- First grep `src/` and `server/` for any `_src` or `_brand` URL. There should be none.
- Exclude both from the passthrough. Eleventy 3 passes copy options through to
  recursive-copy, e.g. `{ filter: ["**", "!_src/**", "!_brand/**"] }`. Verify against the
  Eleventy docs, then confirm on a real build.
- Add a check to `scripts/audit.js` that fails if `_site/assets/img/_src` or `_brand` exists,
  so a later config edit cannot quietly reintroduce them.
- Eleventy never cleans `_site`, so the old copies stay in a local build (Railway builds
  from scratch). **Do not delete them yourself.** Ask before any `rm -r`.

### Step 2. Precompress static output

Everything served is a file on disk, so compress at build time, not per request.

- New `scripts/precompress.js`, `node:zlib` only (no dependency): for every
  `.html .css .js .svg .json .xml .webmanifest .txt` in `_site` over ~1KB, write `.br`
  (brotli quality 11) and `.gz` (level 9) next to it.
- `package.json`: `"build": "node scripts/i18n-check.js && eleventy && node scripts/precompress.js"`
  (after minify once step 3 lands).
- `server/index.js`: add `preCompressed: true` to the `@fastify/static` options. That is
  a built-in option, no new plugin.
- Skip `@fastify/compress` (per-request compression). The only dynamic bodies are the
  booking JSON (`{ ok: true }`) and the error page, both too small to benefit.
- Check: `curl -sI -H 'Accept-Encoding: br' .../en/` returns `content-encoding: br` and
  `vary: accept-encoding`, the `ft` and `csrf` cookies are still set on HTML (the
  `onSend` hook keys on `content-type`), and `/en/404` still returns the localized page.

### Step 3. Minify CSS and JS

- Add `esbuild` as a devDependency (it handles both CSS and JS).
- New step (in `precompress.js` or its own script, run before compression): minify
  `_site/assets/css/*.css` and `_site/assets/js/*.js` in place with `esbuild.transform`.
- Set an explicit conservative `target` (e.g. `es2017`, plus matching CSS browser
  targets), so the minifier never emits syntax newer than the ES5-style source.
- Leave the `src/` copies readable. The `assetv` hash is computed from `src/`, so
  cache-busting still follows content.
- Record raw and brotli sizes before and after in the commit message.
- The CSP stays strict: no inline code is introduced.

### Step 4. Remove the `@import` request chain

`main.css` line 1 is `@import url("/assets/css/fonts.css")`, so the browser has to
download and parse `main.css` before it even discovers `fonts.css`.

- Delete the `@import` line.
- Add `<link rel="stylesheet" href="{{ "/assets/css/fonts.css" | assetv }}">` before
  `main.css` in `src/_includes/layouts/base.njk` and `src/pages/rootindex.njk`.
- Add a plain `<link rel="stylesheet" href="/assets/css/fonts.css">` to `errorPage()` in
  `server/index.js`.
- The font preloads in `base.njk` stay as they are.

### Step 5. Remove unused dependencies

- `npm uninstall @fastify/helmet pino`
- Check: server boots, request logs still print (Fastify's own pino), security headers
  still present, and `npm ls` is clean.

### Step 6. Small server and JS fixes

- **404 cache**: at boot, read `_site/<code>/404.html` for each `BUILT` locale into an
  object next to `COPY`. The not-found handler serves from memory and keeps its current
  fallback string.
- **Resize handler** (`site.js:27`): replace the `resize` listener with
  `new ResizeObserver(setHeaderHeight).observe(header)`. It fires only when the header
  actually changes size, including the height shift when web fonts swap in, which the
  current listener misses. No debounce is needed.

## Phase 2: needs the user's call

### Step 7. Lazy-load the Google Maps iframe (recommended)

The embed pulls several hundred KB of third-party JS on the home page, well below the fold.
It is eager only because a lazy iframe was still blank "at the point the page was checked".
That was a screenshot timing problem, not something a visitor sees.

- Recommended: add `loading="lazy"` to the iframe, rewrite the comment in
  `studio-map.njk`, and make any screenshot check scroll the map into view first.
- Alternative: a click-to-load facade. This is a GDPR win too, since Google gets no
  request until the visitor opts in. But it needs a placeholder that is not a copied map
  image, so it is a bigger change.
- Measure home-page transfer size and TBT before and after.

### Step 8. CDN (Cloudflare proxy in front of Railway)

Needs Cloudflare account and DNS access, so it cannot be done from the repo alone. If approved:

- Cache `/assets/*` at the edge and respect origin `Cache-Control`. That alone is safe.
- **Do not add a cache-everything rule for HTML as things stand.** Cloudflare does not
  honour `Vary: accept-language, cookie`, so the locale redirect at `/` would get cached
  for everyone. Also, every HTML response carries `Set-Cookie` (`ft`, `csrf` from the
  `onSend` hook), which stops edge caching anyway. HTML edge caching would first need
  those cookies set only on contact pages. That is a separate change.
- Bypass the cache for `/`, `/api/*` and `/healthz`.
- Set SSL to Full (strict), and keep the LAUNCH.md ordering: valid TLS before HSTS.
- Client IP: `trustProxy: true` plus rate limiting keyed on `req.ip`. Behind two proxies,
  confirm which header carries the real address (`CF-Connecting-IP`), and lock the origin
  to Cloudflare if relying on it.

## Found along the way (not performance, not in scope)

- `trustProxy: true` trusts every hop, so `req.ip` may be the left-most `X-Forwarded-For`,
  which the client controls. If Railway's edge does not overwrite that header, the
  per-IP booking limit can be rotated around. Worth verifying against Railway's docs.
- `docs/LAUNCH.md` says "no third-party request of any kind", which the Maps iframe
  contradicts.

## Finish

- `npm run assets && npm run build && npm run audit` pass.
- Re-run the baseline numbers. LCP, CLS and INP must be green on mobile.
- Update the Performance block in `docs/LAUNCH.md` with what changed.
