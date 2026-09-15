/**
 * Minify the built CSS and JS in place with esbuild. Runs after eleventy
 * copies src/assets into _site, before precompress.js. The src/ copies stay
 * untouched and readable: `assetv` hashes src/, so cache-busting still
 * follows content.
 *
 * Run: node scripts/minify.js  (part of `npm run build`)
 */
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

// Conservative, matches the site's existing ES5-style source: never let the
// minifier emit syntax newer than what the browsers this site targets support.
const JS_TARGET = "es2017";
const CSS_TARGET = ["chrome58", "edge16", "firefox52", "safari11"];

function walk(dir, ext, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, ext, out);
    else if (full.endsWith(ext)) out.push(full);
  }
  return out;
}

let rawTotal = 0;
let outTotal = 0;

function minify(dir, ext, loader, target) {
  if (!fs.existsSync(dir)) return;
  for (const file of walk(dir, ext)) {
    const input = fs.readFileSync(file, "utf8");
    const { code } = esbuild.transformSync(input, { loader, minify: true, target });
    fs.writeFileSync(file, code);
    rawTotal += Buffer.byteLength(input);
    outTotal += Buffer.byteLength(code);
  }
}

minify("_site/assets/css", ".css", "css", CSS_TARGET);
minify("_site/assets/js", ".js", "js", JS_TARGET);

console.log(`minify: ${rawTotal} -> ${outTotal} bytes (${Math.round((100 * outTotal) / rawTotal)}%)`);
