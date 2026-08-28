import fs from "node:fs";
const raw = JSON.parse(fs.readFileSync("content/_locales.json", "utf8"));
const all = raw.locales;
const byCode = Object.fromEntries(all.map((l) => [l.code, l]));
export default {
  default: raw.default,
  all,
  byCode,
  codes: all.map((l) => l.code),
  live: all.filter((l) => l.status === "live"),
  liveCodes: all.filter((l) => l.status === "live").map((l) => l.code),
  draft: all.filter((l) => l.status === "draft"),
  draftCodes: all.filter((l) => l.status === "draft").map((l) => l.code),
};
