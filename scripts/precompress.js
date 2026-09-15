/**
 * Brotli- and gzip-compress the built output at build time, so nothing is
 * compressed per request. Files stay next to their source as `.br` / `.gz`;
 * `@fastify/static`'s `preCompressed` option serves whichever the request
 * accepts.
 *
 * Run: node scripts/precompress.js  (part of `npm run build`, after eleventy)
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const SITE = "_site";
const EXTENSIONS = new Set([".html", ".css", ".js", ".svg", ".json", ".xml", ".webmanifest", ".txt"]);
const MIN_SIZE = 1024;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

let count = 0;
let rawTotal = 0;
let brTotal = 0;
let gzTotal = 0;

for (const file of walk(SITE)) {
  if (!EXTENSIONS.has(path.extname(file))) continue;
  const input = fs.readFileSync(file);
  if (input.length < MIN_SIZE) continue;

  const br = zlib.brotliCompressSync(input, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: input.length,
    },
  });
  const gz = zlib.gzipSync(input, { level: zlib.constants.Z_BEST_COMPRESSION });

  fs.writeFileSync(file + ".br", br);
  fs.writeFileSync(file + ".gz", gz);

  count++;
  rawTotal += input.length;
  brTotal += br.length;
  gzTotal += gz.length;
}

console.log(
  `precompress: ${count} files, ${rawTotal} -> br ${brTotal} (${Math.round((100 * brTotal) / rawTotal)}%), gz ${gzTotal} (${Math.round((100 * gzTotal) / rawTotal)}%)`
);
