import fs from "node:fs";
import path from "node:path";
const business = JSON.parse(fs.readFileSync("content/_business.json", "utf8"));
const locales = JSON.parse(fs.readFileSync("content/_locales.json", "utf8")).locales;
const built = locales.filter((l) => fs.existsSync(path.join("content", l.code, "site.json")));
const services = [...business.services].sort((a, b) => a.order - b.order);
const out = [];
for (const l of built) for (const s of services) out.push({ locale: l.code, slug: s.slug });
export default out;
