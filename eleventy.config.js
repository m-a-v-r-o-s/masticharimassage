import fs from "node:fs";
import path from "node:path";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets/css": "assets/css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "assets/js" });
  eleventyConfig.addPassthroughCopy({ "src/assets/img": "assets/img" });
  eleventyConfig.addPassthroughCopy({ "src/assets/fonts": "assets/fonts" });
  eleventyConfig.addPassthroughCopy({ "src/assets/favicon": "assets/favicon" });
  eleventyConfig.addPassthroughCopy({ "src/root": "/" });

  eleventyConfig.addWatchTarget("content/");

  // Absolute URL for canonicals, hreflang, OG and JSON-LD.
  eleventyConfig.addFilter("abs", function (url) {
    const origin = (this.ctx?.site?.origin) || process.env.SITE_ORIGIN || "https://www.mastichari-massage.gr";
    return origin.replace(/\/$/, "") + url;
  });

  // Build a locale-rooted path: localeUrl("de", "services/foot-massage") -> /de/services/foot-massage/
  eleventyConfig.addFilter("localeUrl", (locale, p) => "/" + locale + "/" + (p ? p + "/" : ""));

  // Serialise structured data, pruning anything null/empty first. A null in a
  // JSON-LD graph is not "absent", it is an assertion that the value is nothing -
  // and an empty Offer or a null identifier is exactly what must not ship.
  const prune = (v) => {
    if (Array.isArray(v)) {
      const a = v.map(prune).filter((x) => x !== undefined);
      return a.length ? a : undefined;
    }
    if (v && typeof v === "object") {
      const o = {};
      for (const [k, val] of Object.entries(v)) {
        const p = prune(val);
        if (p !== undefined) o[k] = p;
      }
      return Object.keys(o).length ? o : undefined;
    }
    if (v === null || v === "" || v === undefined) return undefined;
    return v;
  };
  eleventyConfig.addFilter("jsonld", (obj) =>
    JSON.stringify(prune(obj) ?? {}, null, 0).replace(/</g, "\\u003c")
  );

  // Sorted services with their per-locale copy joined in.
  eleventyConfig.addFilter("serviceList", (business, c) =>
    [...business.services]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ ...s, ...(c.serviceContent[s.slug] || {}) }))
  );

  eleventyConfig.addFilter("bySlug", (arr, slug) => (arr || []).find((o) => o.slug === slug));

  eleventyConfig.addFilter("byKey", (arr, key) => (arr || []).find((o) => o.key === key));

  eleventyConfig.addFilter("pickIds", (arr, ids) =>
    ids.map((id) => (arr || []).find((o) => o.id === id)).filter(Boolean)
  );

  eleventyConfig.addFilter("pluck", (arr, key) => (arr || []).map((o) => o[key]));

  eleventyConfig.addFilter("featured", (list) => list.filter((s) => s.featured));

  // Inline a built asset (critical CSS, the SVG mark) straight into the document.
  eleventyConfig.addFilter("inlineFile", (p) => {
    const full = path.join(process.cwd(), "src", p);
    return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
  });

  eleventyConfig.addFilter("dateISO", (d) => new Date(d).toISOString().slice(0, 10));

  eleventyConfig.addFilter("formatDate", (iso, locale) => {
    try {
      return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(new Date(iso));
    } catch {
      return iso;
    }
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
