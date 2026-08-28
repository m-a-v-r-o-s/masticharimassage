import fs from "node:fs";
export default JSON.parse(fs.readFileSync("content/testimonials.json", "utf8"));
