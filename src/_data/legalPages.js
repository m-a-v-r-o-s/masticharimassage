import fs from "node:fs";
import path from "node:path";
const locales = JSON.parse(fs.readFileSync("content/_locales.json", "utf8")).locales;
const built = locales.filter((l) => fs.existsSync(path.join("content", l.code, "site.json")));
const docs = [
  { key: "privacy", path: "privacy" },
  { key: "terms", path: "terms" },
];
const out = [];
for (const l of built) for (const d of docs) out.push({ locale: l.code, ...d });
export default out;
