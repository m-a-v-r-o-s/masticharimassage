/**
 * Favicons, touch icons, web manifest and the Open Graph card.
 *
 * The OG card is the item most often forgotten and most visible: it is what a guest
 * sees when someone pastes the link into a WhatsApp group. Without it the link
 * previews as a blank rectangle, which for a business found mostly by word of mouth
 * on holiday is the worst place to look unfinished.
 *
 * Run: npm run icons
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = "src/assets/favicon";
const OG_DIR = "src/assets/img/og";
const IMG_DIR = "src/assets/img";
const SRC = "src/assets/img/_src";

const INK = "#14303A";
const SHELL = "#FAF7F2";
const TERRACOTTA = "#B3532B";

// Badge geometry is shared: wordmarkSvg draws the shell disc, og() composites the
// logo on top of it at the same centre.
const badgeBox = (w, h) => {
  const padX = Math.round(w * 0.06);
  const baseY = Math.round(h * 0.80);
  const badgeR = 40;
  return { padX, baseY, badgeR, badgeCx: padX + badgeR, badgeCy: baseY - 26 };
};

const wordmarkSvg = (w, h) => {
  const { padX, baseY, badgeR, badgeCx, badgeCy } = badgeBox(w, h);
  const textX = badgeCx + badgeR + 26;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%"   stop-color="#0B1F26" stop-opacity="0.94"/>
      <stop offset="50%"  stop-color="#0B1F26" stop-opacity="0.70"/>
      <stop offset="100%" stop-color="#0B1F26" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${Math.round(h * 0.30)}" width="${w}" height="${Math.round(h * 0.70)}" fill="url(#scrim)"/>
  <circle cx="${badgeCx}" cy="${badgeCy}" r="${badgeR}" fill="${SHELL}"/>
  <text x="${textX}" y="${baseY}"
        font-family="Georgia, 'Times New Roman', serif" font-size="60" font-weight="700"
        fill="#FFFFFF">Mastichari Massage</text>
  <text x="${textX + 3}" y="${baseY + 38}"
        font-family="Helvetica, Arial, sans-serif" font-size="24" letter-spacing="3.5"
        fill="#E4CDA8">KONSTANTINOS FESSARAS &#183; MASTICHARI, KOS</text>
</svg>`;
};

// The brand logo, trimmed to its alpha bounding box and squared. Every icon -
// favicon.svg included - is built from this one source.
const LOGO = "src/assets/img/_brand/logo-mark-square.png";

async function icons() {
  fs.mkdirSync(OUT, { recursive: true });

  // favicon.svg wraps the real logo rather than redrawing it, so the SVG and the
  // raster icons can never drift apart. 128px keeps the embedded PNG ~6KB.
  const svgLogo = await sharp(LOGO)
    .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  fs.writeFileSync(
    path.join(OUT, "favicon.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">\n` +
      `  <rect width="48" height="48" rx="10" fill="${SHELL}"/>\n` +
      `  <image x="6" y="6" width="36" height="36" href="data:image/png;base64,${svgLogo.toString("base64")}"/>\n` +
      `</svg>\n`
  );

  const sizes = { "favicon-32.png": 32, "favicon-48.png": 48, "apple-touch-icon.png": 180, "icon-192.png": 192, "icon-512.png": 512 };
  for (const [name, size] of Object.entries(sizes)) {
    // The logo is inset on a rounded shell tile: at 32px an edge-to-edge mark reads
    // as mush, and the tile is what makes it findable among other browser tabs.
    // The ground is the light shell rather than ink because the mark's own navy is
    // nearly INK and closes up against it, worst at favicon sizes.
    const pad = Math.round(size * 0.14);
    const art = await sharp(LOGO)
      .resize(size - pad * 2, size - pad * 2, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    // The tile is rasterised at exactly `size` first. Handing sharp a sized SVG with
    // a high density instead scales the background past the composite offsets and
    // strands the logo in the corner.
    const r = Math.round(size * 0.21);
    const tile = await sharp(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="${SHELL}"/></svg>`
      )
    )
      .resize(size, size)
      .png()
      .toBuffer();
    await sharp(tile)
      .composite([{ input: art, top: pad, left: pad }])
      .png()
      .toFile(path.join(OUT, name));
  }

  // A real .ico as well: some feed readers and older Windows clients still ask for
  // /favicon.ico by path and ignore the <link> tags entirely.
  fs.copyFileSync(path.join(OUT, "favicon-48.png"), path.join(OUT, "favicon.ico"));

  fs.writeFileSync(
    path.join(OUT, "site.webmanifest"),
    JSON.stringify(
      {
        name: "Mastichari Massage",
        short_name: "Mastichari Massage",
        description: "Massage in your hotel room in Mastichari, Tigaki and Marmari, Kos.",
        start_url: "/",
        display: "browser",
        background_color: SHELL,
        theme_color: SHELL,
        icons: [
          { src: "/assets/favicon/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/assets/favicon/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/assets/favicon/favicon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      null,
      2
    ) + "\n"
  );
  console.log(`icons: ${Object.keys(sizes).length + 3} files in ${OUT}`);
}

async function og() {
  fs.mkdirSync(OG_DIR, { recursive: true });
  const preferred = path.join(SRC, "og-base.webp");
  const fallback = path.join(SRC, "balcony-setup.webp");
  const base = fs.existsSync(preferred) ? preferred : fallback;
  if (!fs.existsSync(base)) {
    console.warn("og: no base image found, skipping");
    return;
  }
  const W = 1200;
  const H = 630;
  const { badgeR, badgeCx, badgeCy } = badgeBox(W, H);
  const logoSize = Math.round(badgeR * 1.5);
  const ogLogo = await sharp(LOGO)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp(base)
    .resize(W, H, { fit: "cover", position: "attention" })
    .composite([
      { input: Buffer.from(wordmarkSvg(W, H)), top: 0, left: 0 },
      { input: ogLogo, top: Math.round(badgeCy - logoSize / 2), left: Math.round(badgeCx - logoSize / 2) },
    ])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(OG_DIR, "og.jpg"));
  console.log(`og: ${OG_DIR}/og.jpg built from ${path.basename(base)}${base === fallback ? " (fallback - og-base.webp not present yet)" : ""}`);
}

/**
 * The in-page renditions of the mark, as opposed to the browser-chrome icons above.
 *
 * These four used to be hand-committed PNGs with nothing recording where they came
 * from. They are built from the same LOGO master as every favicon so the two can
 * never drift apart.
 *
 * The square pair (76/114) is what the header wears at 38px. The mark is 1.465:1,
 * so squaring it letterboxes with transparency and the wide silhouette still
 * centres correctly at any box size - which is also why the footer lockup can reuse
 * the same shape at 144.
 *
 * The watermark is the odd one out: it is the mark flattened to pure white for the
 * footer backdrop, where it sits at 8.5% over --ink. Two things follow from that.
 * It is trimmed to the mark's real bounding box rather than squared, because a
 * letterboxed square would silently shrink it inside its CSS box; and it is
 * palette-quantised, because one opaque colour plus alpha compresses to a few KB
 * where the full-colour master is 600.
 */
async function marks() {
  fs.mkdirSync(IMG_DIR, { recursive: true });

  for (const size of [76, 114, 144]) {
    await sharp(LOGO)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(path.join(IMG_DIR, size === 144 ? "logo-mark-144.png" : `logo-${size}.png`));
  }

  // trim() drops the transparent margin the square master carries; threshold 10
  // rather than 0 because the master has faint stray pixels outside the artwork.
  const W = 1200;
  const trimmed = await sharp(LOGO).trim({ threshold: 10 }).toBuffer();
  const { width, height } = await sharp(trimmed).metadata();
  await sharp(trimmed)
    .resize({ width: W })
    // Every visible pixel becomes white; alpha is untouched, so the silhouette holds.
    .composite([{ input: { create: { width: W, height: Math.round((W * height) / width), channels: 3, background: "#FFFFFF" } }, blend: "in" }])
    .png({ compressionLevel: 9, palette: true, colours: 2 })
    .toFile(path.join(IMG_DIR, "logo-watermark-1200.png"));

  console.log(`marks: 4 files in ${IMG_DIR} (mark ${width}x${height} native)`);
}

await icons();
await og();
await marks();
