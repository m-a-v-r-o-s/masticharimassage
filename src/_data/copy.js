import fs from "node:fs";
import path from "node:path";
const locales = JSON.parse(fs.readFileSync("content/_locales.json", "utf8")).locales;
const out = {};
for (const l of locales) {
  const f = path.join("content", l.code, "site.json");
  if (fs.existsSync(f)) out[l.code] = JSON.parse(fs.readFileSync(f, "utf8"));
}
export default out;
