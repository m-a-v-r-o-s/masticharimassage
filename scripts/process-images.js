/**
 * Turns every master in src/assets/img/_src into an AVIF / WebP / JPEG ladder and
 * writes content/_images.json, which is what gives each <img> its width and height
 * (and therefore a CLS of zero).
 *
 * Two rules are enforced here rather than left to discipline:
 *   1. EXIF is always stripped. Two of the recovered photographs carry GPS
 *      coordinates from the phone that took them.
 *   2. Nothing is ever upscaled past its master. A face is not something to
 *      interpolate, so a master narrower than a ladder step simply stops early.
 *
 * Run: npm run images
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = "src/assets/img/_src";
const OUT = "src/assets/img/r";
const MANIFEST = "content/_images.json";
const WIDTHS = [400, 600, 900, 1200];

// Masters that need a crop before anything else happens to them.
const PRE = {};

// NOTE on certificate-wmf-advanced-massage: the recovered scan was a two-panel
// image. The right-hand panel was a certified translation carrying the validating
// lawyer's full name, bar number, tax number, address and telephone. That panel was
// cropped off the MASTER before it was ever committed, rather than at build time,
// so the third party's data is not in this repository's history. The master here is
// already the left panel alone. Do not replace it with the original two-panel scan.

const QUALITY = { avif: 55, webp: 78, jpeg: 82 };

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`No masters found at ${SRC}. Put the originals there first.`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const manifest = {};
  const masters = fs.readdirSync(SRC).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

  for (const file of masters) {
    const key = file.replace(/\.[^.]+$/, "");
    let pipeline = sharp(path.join(SRC, file), { failOn: "none" }).rotate(); // rotate() bakes in EXIF orientation, then drops it

    if (PRE[key]?.extract) pipeline = pipeline.extract(PRE[key].extract);

    // sharp's metadata() reports the INPUT dimensions even on a pipeline that
    // already has an extract() on it, so a cropped master has to be measured from
    // the crop box rather than from the file.
    const meta = await pipeline.clone().metadata();
    const nativeW = PRE[key]?.extract ? PRE[key].extract.width : meta.width;
    const nativeH = PRE[key]?.extract ? PRE[key].extract.height : meta.height;
    const ratio = nativeH / nativeW;

    // A master narrower than the next step up would be served at the step below and
    // then stretched by the browser, so such a master also gets rendered at its own
    // native width. Masters wider than the top step do not: 1200 is already more
    // than the layout ever asks for, and a fifth render just adds bytes to the repo.
    const widths = WIDTHS.filter((w) => w <= nativeW);
    if (!widths.length) widths.push(nativeW); // master smaller than the smallest step
    else if (nativeW < WIDTHS[WIDTHS.length - 1] && widths[widths.length - 1] < nativeW) widths.push(nativeW);

    const variants = [];
    for (const w of widths) {
      const h = Math.round(w * ratio);
      const resized = pipeline.clone().resize({ width: w, withoutEnlargement: true });
      await Promise.all([
        resized.clone().avif({ quality: QUALITY.avif }).toFile(path.join(OUT, `${key}-${w}.avif`)),
        resized.clone().webp({ quality: QUALITY.webp }).toFile(path.join(OUT, `${key}-${w}.webp`)),
        resized.clone().jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(path.join(OUT, `${key}-${w}.jpg`)),
      ]);
      variants.push({ w, h });
    }

    manifest[key] = {
      w: variants[variants.length - 1].w,
      h: variants[variants.length - 1].h,
      nativeW,
      nativeH,
      widths: variants.map((v) => v.w),
      cropped: Boolean(PRE[key]),
    };

    console.log(`${key.padEnd(38)} ${nativeW}x${nativeH} -> ${variants.map((v) => v.w).join(", ")}`);
  }

  // Confirm the promise made in the comment above actually held.
  for (const key of Object.keys(manifest)) {
    const probe = await sharp(path.join(OUT, `${key}-${manifest[key].widths[0]}.jpg`)).metadata();
    if (probe.exif) throw new Error(`EXIF survived in ${key} - refusing to finish`);
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\n${Object.keys(manifest).length} images, ${MANIFEST} written, no EXIF survived.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
