import fs from "node:fs";
// Written by scripts/process-images.js. Every <img> takes its width and height from
// here, which is what keeps cumulative layout shift at zero.
export default fs.existsSync("content/_images.json")
  ? JSON.parse(fs.readFileSync("content/_images.json", "utf8"))
  : {};
