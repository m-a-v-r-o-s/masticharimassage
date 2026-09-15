import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import formBody from "@fastify/formbody";
import rateLimit from "@fastify/rate-limit";

import { CSP, SECURITY_HEADERS, hashIp, makeStamp, checkStamp, safeEqual, clean, cleanMultiline, isEmail, escapeHtml } from "./security.js";
import { resolveRedirect } from "./redirects.js";
import { sendBooking } from "./mailer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITE = path.join(ROOT, "_site");

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const PROD = process.env.NODE_ENV === "production";
const ORIGIN = (process.env.SITE_ORIGIN || `http://localhost:${PORT}`).replace(/\/$/, "");
const FORM_SECRET = process.env.FORM_SECRET || crypto.randomBytes(32).toString("hex");
const IP_SALT = process.env.IP_SALT || crypto.randomBytes(16).toString("hex");
const BOOKING_TO = process.env.BOOKING_TO || "kosfess@hotmail.com";
const BOOKING_FROM = process.env.BOOKING_FROM || "bookings@mastichari-massage.gr";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const COMPRESSIBLE = /\.(html|css|js|svg|json|xml|webmanifest|txt)(\.br|\.gz)?$/;

if (!process.env.FORM_SECRET) {
  console.warn("[warn] FORM_SECRET is not set - a random one was generated. Every running instance will reject the other's form tokens. Set it in production.");
}

const locales = JSON.parse(fs.readFileSync(path.join(ROOT, "content/_locales.json"), "utf8"));
const business = JSON.parse(fs.readFileSync(path.join(ROOT, "content/_business.json"), "utf8"));
const BUILT = locales.locales
  .map((l) => l.code)
  .filter((code) => fs.existsSync(path.join(SITE, code, "index.html")));
const DEFAULT_LOCALE = locales.default;
const SERVICE_SLUGS = new Set(business.services.map((s) => s.slug));

// Per-locale copy, so an error rendered for a no-JS visitor speaks their language.
const COPY = {};
for (const code of BUILT) {
  const f = path.join(ROOT, "content", code, "site.json");
  if (fs.existsSync(f)) COPY[code] = JSON.parse(fs.readFileSync(f, "utf8"));
}
const copyFor = (code) => COPY[code] || COPY[DEFAULT_LOCALE];

const app = Fastify({
  trustProxy: true,
  bodyLimit: 16 * 1024, // 16KB. Nothing here accepts an upload.
  logger: {
    level: process.env.LOG_LEVEL || "info",
    redact: {
      // The plain client address never reaches a log line - only its salted hash does.
      paths: ["req.headers.authorization", "req.headers.cookie", "req.remoteAddress", "req.hostname"],
      remove: true,
    },
  },
});

// Without this, a form submitted by a visitor whose JavaScript never ran arrives
// as an unparsed urlencoded body and is refused with a 415.
await app.register(formBody, { bodyLimit: 16 * 1024 });
await app.register(fastifyCookie, { secret: FORM_SECRET });
await app.register(rateLimit, { global: false });

/* ------------------------------------------------------------------ headers */

app.addHook("onRequest", async (req, reply) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) reply.header(k, v);
  reply.header("content-security-policy", CSP);
  if (PROD) reply.header("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
});

/* -------------------------------------------------------------- redirects */

app.addHook("onRequest", async (req, reply) => {
  const url = new URL(req.url, ORIGIN);
  const hit = resolveRedirect(url);
  if (!hit) return;
  if (hit.status === 410) return reply.code(410).type("text/plain; charset=utf-8").send("Gone. This page no longer exists.\n");
  return reply.redirect(hit.to, 301);
});

/* ------------------------------------------------- locale negotiation at / */

function negotiate(req) {
  const cookie = req.cookies?.lang;
  if (cookie && BUILT.includes(cookie)) return cookie;

  const header = req.headers["accept-language"];
  if (typeof header === "string") {
    const ranked = header
      .split(",")
      .map((part) => {
        const [tag, ...params] = part.trim().split(";");
        const q = params.find((p) => p.trim().startsWith("q="));
        return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q.split("=")[1]) || 0 : 1 };
      })
      .filter((e) => e.tag && e.q > 0)
      .sort((a, b) => b.q - a.q);
    for (const { tag } of ranked) {
      const base = tag.split("-")[0];
      if (BUILT.includes(base)) return base;
    }
  }
  return BUILT.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : BUILT[0];
}

app.get("/", async (req, reply) => {
  // 302, not 301: the right locale depends on who is asking, and a permanent
  // redirect would be cached by one visitor's browser and served to nobody else's.
  reply.header("vary", "accept-language, cookie");
  return reply.redirect(`/${negotiate(req)}/`, 302);
});

// /en -> /en/ so the relative asset paths resolve.
app.get("/:locale", async (req, reply, done) => {
  const code = String(req.params.locale || "").toLowerCase();
  if (BUILT.includes(code)) return reply.redirect(`/${code}/`, 301);
  return reply.callNotFound();
});

/* ------------------------------------------------ form token + CSRF cookies */

// Set on every HTML response, so both the enhanced and the plain form have what
// they need. `ft` is the time-trap; `csrf` is the double-submit token.
app.addHook("onSend", async (req, reply, payload) => {
  const type = String(reply.getHeader("content-type") || "");
  if (!type.startsWith("text/html")) return payload;

  if (!req.cookies?.ft) {
    reply.setCookie("ft", makeStamp(FORM_SECRET), {
      path: "/", httpOnly: true, sameSite: "lax", secure: PROD, maxAge: 60 * 60 * 12,
    });
  }
  if (!req.cookies?.csrf) {
    reply.setCookie("csrf", crypto.randomBytes(18).toString("base64url"), {
      // Readable by the enhanced form so it can echo the value back.
      path: "/", httpOnly: false, sameSite: "lax", secure: PROD, maxAge: 60 * 60 * 12,
    });
  }
  return payload;
});

/* ----------------------------------------------------------- booking form */

const FIELD_LIMITS = { name: 120, email: 200, phone: 40, when: 120, message: 2000 };

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return {};
}

function validate(raw) {
  const enquiry = {
    name: clean(raw.name, FIELD_LIMITS.name),
    email: clean(raw.email, FIELD_LIMITS.email).toLowerCase(),
    phone: clean(raw.phone, FIELD_LIMITS.phone),
    when: clean(raw.when, FIELD_LIMITS.when),
    message: cleanMultiline(raw.message, FIELD_LIMITS.message),
    service: clean(raw.service, 60),
    locale: clean(raw.locale, 5),
  };

  const errors = {};
  if (!enquiry.name) errors.name = "required";
  if (!enquiry.email) errors.email = "required";
  else if (!isEmail(enquiry.email)) errors.email = "invalid";
  if (typeof raw.message === "string" && raw.message.length > FIELD_LIMITS.message) errors.message = "too-long";
  const consent = raw.consent === true || raw.consent === "yes" || raw.consent === "on";
  if (!consent) errors.consent = "required";

  // Allowlist, not sanitisation: an unknown service slug is dropped, never echoed.
  if (enquiry.service && !SERVICE_SLUGS.has(enquiry.service)) enquiry.service = "";
  if (!BUILT.includes(enquiry.locale)) enquiry.locale = DEFAULT_LOCALE;

  return { enquiry, errors, consent };
}

/**
 * Cross-origin check. The double-submit token is the primary defence; the fetch
 * metadata and Origin headers back it up and are what protect a visitor whose
 * JavaScript never ran and so never echoed the token.
 */
function crossOriginRejected(req) {
  const site = req.headers["sec-fetch-site"];
  if (site && site !== "same-origin") return "sec-fetch-site";

  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(ORIGIN).host && !origin.startsWith(`http://localhost:${PORT}`)) return "origin";
    } catch {
      return "origin-unparseable";
    }
  }

  const cookieToken = req.cookies?.csrf;
  const sent = typeof req.body?.csrf === "string" ? req.body.csrf : "";
  if (cookieToken && sent && !safeEqual(cookieToken, sent)) return "csrf-mismatch";

  // No Origin, no Sec-Fetch-Site and no token at all: a non-browser client.
  if (!origin && !site && !sent) return "no-provenance";
  return null;
}

function wantsJson(req) {
  const accept = String(req.headers.accept || "");
  return accept.includes("application/json") || String(req.headers["content-type"] || "").includes("application/json");
}

function errorPage(locale, messages) {
  const c = copyFor(locale);
  const items = messages.map((m) => `<li>${escapeHtml(m)}</li>`).join("");
  return `<!doctype html><html lang="${escapeHtml(locale)}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(c.contact.errors.summaryTitle)}</title>
<meta name="robots" content="noindex">
<link rel="stylesheet" href="/assets/css/fonts.css">
<link rel="stylesheet" href="/assets/css/main.css"></head>
<body><main id="main" class="section"><div class="wrap measure stack">
<div class="alert alert--error"><h1 class="alert__title">${escapeHtml(c.contact.errors.summaryTitle)}</h1><ul>${items}</ul></div>
<p><a class="btn btn--primary" href="/${escapeHtml(locale)}/contact/#form">${escapeHtml(c.nav.contact)}</a></p>
<p class="u-small-muted">${escapeHtml(c.contact.whatsappBody)} <a href="${business.contact.whatsappHref}">${escapeHtml(business.contact.phone)}</a></p>
</div></main></body></html>`;
}

app.post(
  "/api/booking",
  {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "10 minutes",
        keyGenerator: (req) => hashIp(req.ip, IP_SALT),
        // statusCode must be on the object: without it the plugin surfaces this
        // as a generic 500 rather than a 429.
        errorResponseBuilder: () => ({ statusCode: 429, ok: false, error: "rate-limited" }),
      },
    },
  },
  async (req, reply) => {
    const ipHash = hashIp(req.ip, IP_SALT);
    const raw = parseBody(req);
    const locale = BUILT.includes(clean(raw.locale, 5)) ? clean(raw.locale, 5) : DEFAULT_LOCALE;
    const c = copyFor(locale);
    const json = wantsJson(req);

    const reject = (status, code, fieldErrors) => {
      req.log.warn({ event: "booking.rejected", reason: code, ip: ipHash }, "booking rejected");
      if (json) return reply.code(status).send({ ok: false, error: code, errors: fieldErrors });
      const blocked = ["cross-origin", "csrf", "too-fast", "bad-token"];
      const messages = fieldErrors
        ? Object.keys(fieldErrors).map((k) => c.contact.errors[k] || c.contact.errors.generic)
        : [
            code === "rate-limited"
              ? c.contact.errors.rateLimit
              : blocked.includes(code)
                ? c.contact.errors.blocked
                : code === "server"
                  ? c.contact.errors.server
                  : c.contact.errors.generic,
          ];
      return reply.code(status).type("text/html; charset=utf-8").send(errorPage(locale, messages));
    };

    // 1. Honeypot. A real browser never fills a field it cannot see.
    if (typeof raw.company === "string" && raw.company.trim() !== "") {
      // Answer as though it worked: telling a bot it was caught only helps the bot.
      req.log.warn({ event: "booking.honeypot", ip: ipHash }, "honeypot tripped");
      return json ? reply.send({ ok: true }) : reply.redirect(`/${locale}/thank-you/`, 303);
    }

    // 2. Cross-origin / CSRF.
    const xo = crossOriginRejected(req);
    if (xo) return reject(403, xo === "csrf-mismatch" ? "csrf" : "cross-origin");

    // 3. Time trap.
    const stampError = checkStamp(req.cookies?.ft, FORM_SECRET);
    if (stampError === "too-fast") return reject(400, "too-fast");
    if (stampError && stampError !== "expired" && stampError !== "missing") return reject(400, "bad-token");

    // 4. Field validation.
    const { enquiry, errors } = validate(raw);
    if (Object.keys(errors).length) {
      req.log.info({ event: "booking.invalid", fields: Object.keys(errors), ip: ipHash }, "booking failed validation");
      return reject(422, "validation", errors);
    }

    // 5. Second, slower limit keyed on the address, so one mailbox cannot be used
    //    to hammer the inbox from a rotating set of IPs.
    const perEmail = emailBucket(enquiry.email);
    if (perEmail.exceeded) return reject(429, "rate-limited");

    const serviceName = enquiry.service ? c.serviceContent[enquiry.service]?.name : "";

    if (!RESEND_API_KEY) {
      req.log.error({ event: "booking.misconfigured", ip: ipHash }, "RESEND_API_KEY is not set - the enquiry was NOT delivered");
      return reject(500, "server");
    }

    try {
      await sendBooking({
        apiKey: RESEND_API_KEY,
        from: BOOKING_FROM,
        to: BOOKING_TO,
        enquiry,
        serviceName,
        siteOrigin: ORIGIN,
      });
    } catch (err) {
      req.log.error({ event: "booking.send-failed", err: err.message, detail: err.detail, ip: ipHash }, "booking email failed to send");
      return reject(502, "server");
    }

    req.log.info({ event: "booking.sent", locale, service: enquiry.service || null, ip: ipHash }, "booking sent");

    // Burn the time-trap token so the same page cannot be replayed in a loop.
    reply.setCookie("ft", makeStamp(FORM_SECRET), {
      path: "/", httpOnly: true, sameSite: "lax", secure: PROD, maxAge: 60 * 60 * 12,
    });

    if (json) return reply.send({ ok: true });
    return reply.redirect(`/${locale}/thank-you/`, 303);
  }
);

/**
 * Two enquiries per hour per email address, tracked in memory. Deliberately not a
 * database: this instance is single-process, and the only cost of losing the
 * counters on a restart is that a determined sender gets two more attempts.
 */
const emailHits = new Map();
function emailBucket(email) {
  const now = Date.now();
  const key = crypto.createHmac("sha256", IP_SALT).update(email).digest("base64url").slice(0, 16);
  const hits = (emailHits.get(key) || []).filter((t) => now - t < 60 * 60 * 1000);
  hits.push(now);
  emailHits.set(key, hits);
  if (emailHits.size > 5000) {
    for (const [k, v] of emailHits) if (!v.some((t) => now - t < 60 * 60 * 1000)) emailHits.delete(k);
  }
  return { exceeded: hits.length > 2 };
}

/* ------------------------------------------------------------ static files */

await app.register(fastifyStatic, {
  root: SITE,
  index: ["index.html"],
  // Directory listing off: a request for a folder without an index is a 404.
  list: false,
  redirect: true,
  dotfiles: "deny",
  // @fastify/static sends its own Cache-Control unless cacheControl is turned
  // off, and its header wins over anything setHeaders adds. Without this every
  // asset shipped as max-age=0 and the font subsets were re-fetched every visit.
  cacheControl: false,
  etag: true,
  lastModified: true,
  preCompressed: true,
  setHeaders(res, filePath) {
    if (COMPRESSIBLE.test(filePath)) res.setHeader("vary", "accept-encoding");
    if (!PROD) {
      res.setHeader("cache-control", "no-cache");
    } else if (/[\\/]assets[\\/](fonts|img)[\\/]/.test(filePath)) {
      res.setHeader("cache-control", "public, max-age=31536000, immutable");
    } else if (/[\\/]assets[\\/]/.test(filePath)) {
      res.setHeader("cache-control", "public, max-age=86400, must-revalidate");
    } else if (filePath.endsWith(".html")) {
      res.setHeader("cache-control", "public, max-age=300, must-revalidate");
    }
  },
});

/* ------------------------------------------------------------------- 404 */

app.setNotFoundHandler(
  {
    config: { rateLimit: { max: 60, timeWindow: "1 minute", keyGenerator: (req) => hashIp(req.ip, IP_SALT) } },
  },
  async (req, reply) => {
    // Serve the 404 page of whichever locale the URL is already in, so a visitor
    // who mistypes a Greek URL does not suddenly get an English page.
    const first = req.url.split("/").filter(Boolean)[0];
    const locale = BUILT.includes(first) ? first : negotiate(req);
    const file = path.join(SITE, locale, "404.html");
    reply.code(404).type("text/html; charset=utf-8");
    if (fs.existsSync(file)) return reply.send(fs.readFileSync(file, "utf8"));
    return reply.send("<!doctype html><title>Not found</title><h1>Not found</h1>");
  }
);

app.get("/healthz", async () => ({ ok: true, locales: BUILT }));

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info({ origin: ORIGIN, locales: BUILT, resend: Boolean(RESEND_API_KEY) }, "mastichari-massage listening");
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
