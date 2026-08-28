import fs from "node:fs";
export default JSON.parse(fs.readFileSync("content/_business.json", "utf8"));
