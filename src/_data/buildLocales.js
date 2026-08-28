import fs from "node:fs";
import path from "node:path";
// Only locales that actually have a content file are built. This lets translation
// land one locale at a time without ever producing a half-empty page.
const locales = JSON.parse(fs.readFileSync("content/_locales.json", "utf8")).locales;
export default locales
  .filter((l) => fs.existsSync(path.join("content", l.code, "site.json")))
  .map((l) => l.code);
