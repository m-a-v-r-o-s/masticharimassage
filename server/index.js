import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";

import { CSP, SECURITY_HEADERS, hashIp } from "./security.js";
import { resolveRedirect } from "./redirects.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITE = path.join(ROOT, "_site");

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const PROD = process.env.NODE_ENV === "production";
const ORIGIN = (process.env.SITE_ORIGIN || `http://localhost:${PORT}`).replace(/\/$/, "");
const IP_SALT = process.env.IP_SALT || crypto.randomBytes(16).toString("hex");
const COMPRESSIBLE = /\.(html|css|js|svg|json|xml|webmanifest|txt)(\.br|\.gz)?$/;

const locales = JSON.parse(fs.readFileSync(path.join(ROOT, "content/_locales.json"), "utf8"));
const BUILT = locales.locales
  .map((l) => l.code)
  .filter((code) => fs.existsSync(path.join(SITE, code, "index.html")));
const DEFAULT_LOCALE = locales.default;

// Railway's own X-Forwarded-For guidance is inconsistent about which end of the
// list is trustworthy, but Railway confirms clients cannot set X-Real-Ip
// themselves, so that is what rate limiting keys on. req.ip (trustProxy: true,
// left-most X-Forwarded-For) is only a fallback for local dev, where there is
// no edge proxy to set the header at all.
const clientIp = (req) => req.headers["x-real-ip"] || req.ip;

// Localized 404 pages, read once at boot rather than on every miss.
const NOT_FOUND = {};
for (const code of BUILT) {
  const f = path.join(SITE, code, "404.html");
  if (fs.existsSync(f)) NOT_FOUND[code] = fs.readFileSync(f, "utf8");
}

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

// Only reads cookies (the consented `lang` choice at /). The server sets none.
await app.register(fastifyCookie);
await app.register(rateLimit, { global: false });

/* ------------------------------------------------------------------ headers */

app.addHook("onRequest", async (req, reply) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) reply.header(k, v);
  // Link-preview tools (opengraph.io, CMS/chat previews) hotlink the share image in an <img>
  // from their own origin; same-origin CORP makes the browser block it there.
  if (req.url.startsWith("/assets/img/og/")) reply.header("cross-origin-resource-policy", "cross-origin");
  reply.header("content-security-policy", CSP);
  if (PROD) reply.header("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
});

/* -------------------------------------------------------------- redirects */

// Apex to www, so Google sees one copy of every page. Only the exact apex host:
// localhost and *.up.railway.app (health checks) must keep answering directly.
app.addHook("onRequest", async (req, reply) => {
  const host = String(req.headers.host || "").toLowerCase().replace(/:\d+$/, "");
  if (host === "mastichari-massage.gr") return reply.redirect(`https://www.mastichari-massage.gr${req.url}`, 301);
});

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

// /en -> /en/ so the relative asset paths resolve. Two letters only, so root
// files such as /robots.txt and /sitemap.xml fall through to the static handler.
app.get("/:locale([a-zA-Z]{2})", async (req, reply, done) => {
  const code = String(req.params.locale || "").toLowerCase();
  if (BUILT.includes(code)) return reply.redirect(`/${code}/`, 301);
  return reply.callNotFound();
});

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
    config: { rateLimit: { max: 60, timeWindow: "1 minute", keyGenerator: (req) => hashIp(clientIp(req), IP_SALT) } },
  },
  async (req, reply) => {
    // Serve the 404 page of whichever locale the URL is already in, so a visitor
    // who mistypes a Greek URL does not suddenly get an English page.
    const first = req.url.split("/").filter(Boolean)[0];
    const locale = BUILT.includes(first) ? first : negotiate(req);
    reply.code(404).type("text/html; charset=utf-8");
    if (NOT_FOUND[locale]) return reply.send(NOT_FOUND[locale]);
    return reply.send("<!doctype html><title>Not found</title><h1>Not found</h1>");
  }
);

app.get("/healthz", async () => ({ ok: true, locales: BUILT }));

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info({ origin: ORIGIN, locales: BUILT }, "mastichari-massage listening");
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
