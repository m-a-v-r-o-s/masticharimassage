/**
 * Static audit of the built site. This is not a substitute for axe, a keyboard
 * pass or a screen reader - it is the part that a machine can check on every one
 * of 181 pages, so the manual passes can concentrate on what needs judgement.
 *
 * Run: npm run audit  (after npm run build)
 */
import fs from "node:fs";
import path from "node:path";

const SITE = "_site";
const problems = [];
const stats = { pages: 0, images: 0, links: 0 };

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

for (const dir of ["_src", "_brand"]) {
  const full = path.join(SITE, "assets/img", dir);
  // recursive-copy creates the (empty) parent directory even when its filter
  // excludes every file inside, so check for actual content, not existence.
  if (fs.existsSync(full) && fs.readdirSync(full).length) {
    problems.push(`assets/img/${dir}: image masters published in the build output`);
  }
}

const pages = walk(SITE);
const allPaths = new Set(
  pages.map((p) => "/" + path.relative(SITE, p).replace(/index\.html$/, "").replace(/\\/g, "/"))
);
// Non-HTML assets that pages are allowed to link to.
for (const f of ["/sitemap.xml", "/robots.txt"]) allPaths.add(f);

const flag = (page, msg) => problems.push(`${path.relative(SITE, page)}: ${msg}`);

for (const page of pages) {
  const html = fs.readFileSync(page, "utf8");
  stats.pages++;

  // "/" is a noindex redirect shim: the Fastify server normally negotiates a
  // locale before it is ever served, and it exists only so a purely static host
  // (or a crawler that follows no redirect) still lands somewhere useful. It has
  // no navigation, no social preview and nothing to describe.
  const isRootShim = path.relative(SITE, page) === "index.html";

  // --- document-level -----------------------------------------------------
  const lang = html.match(/<html lang="([^"]+)"/);
  if (!lang) flag(page, "no lang attribute on <html>");

  const title = html.match(/<title>([^<]*)<\/title>/);
  if (!title || !title[1].trim()) flag(page, "empty or missing <title>");
  else if (title[1].length > 70) flag(page, `title is ${title[1].length} chars, over the ~70 that survive in a SERP`);

  const desc = html.match(/<meta name="description" content="([^"]*)"/);
  if (!isRootShim && (!desc || !desc[1].trim())) flag(page, "empty or missing meta description");
  else if (desc && desc[1].length > 175) flag(page, `meta description is ${desc[1].length} chars, over the ~175 that survive`);

  if (!/<link rel="canonical"/.test(html)) flag(page, "no canonical link");
  if (!isRootShim && !/property="og:image"/.test(html)) flag(page, "no og:image");
  if (!isRootShim && !/property="og:title"/.test(html)) flag(page, "no og:title");

  // --- headings -----------------------------------------------------------
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length === 0) flag(page, "no <h1>");
  if (h1s.length > 1) flag(page, `${h1s.length} <h1> elements`);

  // --- images -------------------------------------------------------------
  for (const img of html.match(/<img\b[^>]*>/g) || []) {
    stats.images++;
    if (!/\balt=/.test(img)) flag(page, "an <img> has no alt attribute");
    else if (/\balt=""/.test(img) && !/aria-hidden/.test(img)) flag(page, "an <img> has empty alt and is not aria-hidden");
    if (!/\bwidth=/.test(img) || !/\bheight=/.test(img)) flag(page, "an <img> has no intrinsic width/height (layout shift)");
  }

  // --- forms --------------------------------------------------------------
  for (const input of html.match(/<(input|select|textarea)\b[^>]*>/g) || []) {
    if (/type="(hidden|submit|button)"/.test(input)) continue;
    const id = input.match(/\bid="([^"]+)"/);
    if (!id) { flag(page, "a form control has no id, so no label can point at it"); continue; }
    if (!new RegExp(`<label[^>]*for="${id[1]}"`).test(html)) flag(page, `no <label for="${id[1]}">`);
  }

  // --- inline style / script (the CSP forbids both) -----------------------
  if (/\sstyle="/.test(html)) flag(page, "inline style attribute - the Content-Security-Policy forbids it");
  const inlineScripts = (html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) || []).filter(
    (s) => !/type="application\/(ld\+json|json)"/.test(s)
  );
  if (inlineScripts.length) flag(page, `${inlineScripts.length} inline <script> - the Content-Security-Policy forbids it`);

  // --- internal links -----------------------------------------------------
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    stats.links++;
    const target = m[1];
    if (target.startsWith("/assets/") || target.startsWith("/api/")) continue;
    if (!allPaths.has(target)) flag(page, `internal link to ${target} which is not in the build`);
  }

  // --- structured data ----------------------------------------------------
  const ld = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  if (!ld) { if (!isRootShim) flag(page, "no JSON-LD"); }
  else {
    try {
      const graph = JSON.parse(ld[1])["@graph"];
      if (!graph?.length) flag(page, "JSON-LD has an empty @graph");
      const asText = JSON.stringify(graph);
      if (/"(price|priceCurrency|lowPrice|highPrice)"/.test(asText)) flag(page, "JSON-LD contains a price while prices are unpublished");
      if (/aggregateRating/.test(asText)) flag(page, "JSON-LD contains aggregateRating, which self-hosted comments cannot support");
      const person = graph.find((n) => n["@type"] === "Person");
      if (person && JSON.stringify(person.knowsLanguage) !== JSON.stringify(["el", "en", "it", "fr", "de", "ru"])) {
        flag(page, `Person.knowsLanguage is ${JSON.stringify(person.knowsLanguage)}, it must stay el/en/it/fr/de/ru`);
      }
    } catch {
      flag(page, "JSON-LD does not parse");
    }
  }

  // --- stale prices from the old site -------------------------------------
  const body = html.replace(/<script[\s\S]*?<\/script>/g, "");
  if (/\d+\s?(€|EUR)|€\s?\d+/i.test(body)) flag(page, "a price appears in the page text");

  // --- skip link and main landmark ---------------------------------------
  if (!isRootShim && !/class="skip-link"/.test(html)) flag(page, "no skip link");
  if (!/<main\b/.test(html)) flag(page, "no <main> landmark");
}

console.log(`audit: ${stats.pages} pages, ${stats.images} images, ${stats.links} internal links`);

if (problems.length) {
  const grouped = {};
  for (const p of problems) {
    const kind = p.split(": ").slice(1).join(": ");
    (grouped[kind] ||= []).push(p.split(": ")[0]);
  }
  console.error(`\n${problems.length} problem(s):`);
  for (const [kind, where] of Object.entries(grouped)) {
    console.error(`  x ${kind}`);
    console.error(`      ${where.length} page(s), e.g. ${where.slice(0, 3).join(", ")}`);
  }
  process.exit(1);
}

console.log("\nok - no problems found.");
