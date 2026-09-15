/**
 * Build gate for the translated content. Runs before every build.
 *
 * A nine-language site written by people who between them read three of those
 * languages fails quietly, not loudly: a key silently missing in Polish, an English
 * sentence left sitting in the Ukrainian file, an alt attribute that never got
 * translated. None of that throws at build time on its own, so it is checked here.
 *
 * A live locale failing any check fails the build. A draft locale only warns -
 * draft locales are noindex and hidden from the switcher precisely because they are
 * still being worked on.
 */
import fs from "node:fs";
import path from "node:path";

const REF = "en";
const locales = JSON.parse(fs.readFileSync("content/_locales.json", "utf8"));
const business = JSON.parse(fs.readFileSync("content/_business.json", "utf8"));
const testimonials = JSON.parse(fs.readFileSync("content/testimonials.json", "utf8"));

const errors = [];
const warnings = [];

const load = (code) => {
  const f = path.join("content", code, "site.json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
};

// Keys whose value is legitimately identical across languages (proper nouns,
// place names, the phone number) and must not be reported as untranslated.
const SAME_BY_DESIGN = [
  /^location\.areas\.\d+\.name$/,
  /^about\.credentialNames\./,
  /^locale$/,
  // "Full body massage" and "Thai oil massage" are the terms actually used in
  // several of these languages. Translating them for the sake of looking
  // translated would make the page read worse, not better.
  /^serviceContent\.full-body-massage\.name$/,
  // "Google Maps" is Google's own product name and is left untranslated in every
  // one of these languages, including the ones that translate it in their UI.
  /^ui\.googleMaps$/,
  // Just two place names joined by a dash - nothing left to translate, so it is
  // expected to come out identical to English in languages that do not inflect
  // or otherwise change "Mastichari" or "Kos".
  /^home\.heroKicker$/,
];

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("_")) continue; // notes to the maintainer, not content
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

const ref = load(REF);
if (!ref) {
  console.error(`i18n-check: the reference locale (${REF}) has no content file.`);
  process.exit(1);
}
const refFlat = flatten(ref);

/* --------------------------------------------------- structural invariants */

const slugs = business.services.map((s) => s.slug);
for (const slug of slugs) {
  if (!ref.serviceContent[slug]) errors.push(`${REF}: serviceContent is missing "${slug}", which is listed in _business.json`);
  if (!ref.meta.service?.[slug]) errors.push(`${REF}: meta.service is missing "${slug}"`);
}
for (const slug of Object.keys(ref.serviceContent)) {
  if (!slugs.includes(slug)) errors.push(`${REF}: serviceContent has "${slug}", which no longer exists in _business.json`);
}
if (business.prices.published === false) {
  const stale = JSON.stringify(ref).match(/\d+\s?(€|EUR|euro)|€\s?\d+/i);
  if (stale) errors.push(`${REF}: a price appears in the copy while business.prices.published is false: ${stale[0]}`);
}

/* --------------------------------------------------------- per-locale pass */

const report = [];

for (const l of locales.locales) {
  const doc = load(l.code);
  if (!doc) {
    if (l.status === "live") errors.push(`${l.code}: marked live in _locales.json but has no content/${l.code}/site.json`);
    else report.push(`  ${l.code.padEnd(3)} ${"draft".padEnd(6)} not written yet`);
    continue;
  }

  const fail = l.status === "live" ? errors : warnings;
  const flat = flatten(doc);
  const missing = [];
  const extra = [];
  const empty = [];
  const untranslated = [];

  for (const key of Object.keys(refFlat)) if (!(key in flat)) missing.push(key);
  for (const key of Object.keys(flat)) if (!(key in refFlat)) extra.push(key);

  for (const [key, value] of Object.entries(flat)) {
    if (typeof value !== "string") continue;
    if (!value.trim()) empty.push(key);
    if (
      l.code !== REF &&
      typeof refFlat[key] === "string" &&
      value.trim() === refFlat[key].trim() &&
      value.trim().length > 12 &&
      !SAME_BY_DESIGN.some((re) => re.test(key))
    ) {
      untranslated.push(key);
    }
  }

  if (doc.locale !== l.code) fail.push(`${l.code}: the file's "locale" field says "${doc.locale}"`);
  if (missing.length) fail.push(`${l.code}: ${missing.length} key(s) missing: ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? ", ..." : ""}`);
  if (extra.length) fail.push(`${l.code}: ${extra.length} key(s) not in ${REF}: ${extra.slice(0, 6).join(", ")}${extra.length > 6 ? ", ..." : ""}`);
  if (empty.length) fail.push(`${l.code}: ${empty.length} empty string(s): ${empty.slice(0, 6).join(", ")}${empty.length > 6 ? ", ..." : ""}`);
  if (untranslated.length) fail.push(`${l.code}: ${untranslated.length} string(s) identical to ${REF}: ${untranslated.slice(0, 6).join(", ")}${untranslated.length > 6 ? ", ..." : ""}`);

  // Alt text is a hard accessibility requirement, so it is checked by name rather
  // than left to the generic empty-string sweep.
  const altKeys = Object.keys(flat).filter((k) => /(^|\.)(imageAlt|portraitAlt|ogImageAlt|heroImageAlt|areaImageAlt)$/.test(k));
  for (const k of altKeys) if (!String(flat[k] || "").trim()) fail.push(`${l.code}: alt text "${k}" is empty`);
  const expectedAlts = Object.keys(refFlat).filter((k) => /(^|\.)(imageAlt|portraitAlt|ogImageAlt|heroImageAlt|areaImageAlt)$/.test(k)).length;
  if (altKeys.length < expectedAlts) fail.push(`${l.code}: ${expectedAlts - altKeys.length} alt-text key(s) missing`);

  report.push(
    `  ${l.code.padEnd(3)} ${l.status.padEnd(6)} ${String(Object.keys(flat).length).padStart(4)} keys` +
      (missing.length || extra.length || empty.length || untranslated.length
        ? `  [${[missing.length && `${missing.length} missing`, extra.length && `${extra.length} extra`, empty.length && `${empty.length} empty`, untranslated.length && `${untranslated.length} untranslated`].filter(Boolean).join(", ")}]`
        : "  ok")
  );
}

/* ------------------------------------------------------- image coverage */

// Every illustration the templates ask for, checked against what
// scripts/process-images.js has actually produced. A missing one is not fatal -
// the picture macro falls back to a stand-in - but it must never go unnoticed.
const manifest = fs.existsSync("content/_images.json")
  ? JSON.parse(fs.readFileSync("content/_images.json", "utf8"))
  : {};
const expectedImages = [
  "hero-treatment-room",
  "village-lane",
  "oils-still-life",
  "portrait-konstantinos",
  ...business.credentials.diplomas.filter((d) => d.image).map((d) => d.image),
  ...slugs.map((s) => `service-${s}`),
];
const missingImages = expectedImages.filter((k) => !manifest[k]);
if (missingImages.length) {
  warnings.push(
    `${missingImages.length} illustration(s) not generated yet, a stand-in is shown instead: ${missingImages.join(", ")} - see docs/LAUNCH.md`
  );
}
if (!fs.existsSync("src/assets/img/og/og.jpg")) {
  warnings.push("no Open Graph card at src/assets/img/og/og.jpg - shared links will preview blank");
}

/* --------------------------------------------------- testimonial coverage */

const liveCodes = locales.locales.filter((l) => l.status === "live").map((l) => l.code);
for (const t of testimonials.items) {
  if (!t.text?.trim()) errors.push(`testimonial ${t.id}: empty text`);
  if (!t.lang) errors.push(`testimonial ${t.id}: no lang attribute - WCAG 3.1.2 needs one on every quote`);
  const missingT = liveCodes.filter((code) => code !== t.lang && !t.t?.[code]);
  if (missingT.length) warnings.push(`testimonial ${t.id} (${t.lang}): no translation for live locale(s) ${missingT.join(", ")} - the original will be shown untranslated there`);
}

/* ------------------------------------------------------------------ output */

console.log("i18n-check");
console.log(report.join("\n"));

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 25)) console.log(`  ! ${w}`);
  if (warnings.length > 25) console.log(`  ! ... and ${warnings.length - 25} more`);
}

if (errors.length) {
  console.error(`\n${errors.length} error(s) - build stopped:`);
  for (const e of errors) console.error(`  x ${e}`);
  process.exit(1);
}

console.log(`\nok - ${locales.locales.filter((l) => l.status === "live").length} live locale(s), no blocking problems.`);
