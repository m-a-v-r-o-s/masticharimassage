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
const SRC = "src/assets/img/_src";

const INK = "#14303A";
const SHELL = "#FAF7F2";
const TERRACOTTA = "#B3532B";

// A favicon at 32px needs its own artwork: the site mark drawn on a solid ground,
// with heavier strokes than the header version, or it disappears in a browser tab.
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="10" fill="${INK}"/>
  <path d="M9 30c0-8.28 6.72-15 15-15s15 6.72 15 15" stroke="${SHELL}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
  <path d="M16 31.5c0-4.42 3.58-8 8-8s8 3.58 8 8" stroke="${SHELL}" stroke-width="3.2" stroke-linecap="round" fill="none" opacity=".55"/>
  <circle cx="24" cy="35" r="4" fill="${TERRACOTTA}"/>
</svg>`;

const wordmarkSvg = (w, h) => {
  const padX = Math.round(w * 0.06);
  const baseY = Math.round(h * 0.80);      // baseline of the business name
  const badgeR = 40;
  const badgeCx = padX + badgeR;
  const badgeCy = baseY - 26;
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
  <g transform="translate(${badgeCx - 24}, ${badgeCy - 26}) scale(1.0)">
    <path d="M6 30c0-9.94 8.06-18 18-18s18 8.06 18 18" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M14.5 32c0-5.25 4.25-9.5 9.5-9.5s9.5 4.25 9.5 9.5" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none" opacity=".5"/>
    <circle cx="24" cy="35.5" r="4" fill="${TERRACOTTA}"/>
  </g>
  <text x="${textX}" y="${baseY}"
        font-family="Georgia, 'Times New Roman', serif" font-size="60" font-weight="700"
        fill="#FFFFFF">Mastichari Massage</text>
  <text x="${textX + 3}" y="${baseY + 38}"
        font-family="Helvetica, Arial, sans-serif" font-size="24" letter-spacing="3.5"
        fill="#E4CDA8">KONSTANTINOS FESSARAS &#183; MASTICHARI, KOS</text>
</svg>`;
};

async function icons() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "favicon.svg"), iconSvg);

  const buf = Buffer.from(iconSvg);
  const sizes = { "favicon-32.png": 32, "favicon-48.png": 48, "apple-touch-icon.png": 180, "icon-192.png": 192, "icon-512.png": 512 };
  for (const [name, size] of Object.entries(sizes)) {
    await sharp(buf, { density: 512 }).resize(size, size).png().toFile(path.join(OUT, name));
  }

  // A real .ico as well: some feed readers and older Windows clients still ask for
  // /favicon.ico by path and ignore the <link> tags entirely.
  await sharp(buf, { density: 512 }).resize(48, 48).png().toFile(path.join(OUT, "favicon.ico"));

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
  await sharp(base)
    .resize(W, H, { fit: "cover", position: "attention" })
    .composite([{ input: Buffer.from(wordmarkSvg(W, H)), top: 0, left: 0 }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(OG_DIR, "og.jpg"));
  console.log(`og: ${OG_DIR}/og.jpg built from ${path.basename(base)}${base === fallback ? " (fallback - og-base.webp not present yet)" : ""}`);
}

await icons();
await og();
