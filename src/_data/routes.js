import fs from "node:fs";
const business = JSON.parse(fs.readFileSync("content/_business.json", "utf8"));

// The canonical route table. Templates render the pages; this table is what the
// sitemap, the hreflang clusters and the redirect map are generated from, so
// there is exactly one place a route can go missing.
const base = [
  { key: "home",     path: "",           indexable: true,  priority: "1.0", changefreq: "monthly" },
  { key: "services", path: "services",   indexable: true,  priority: "0.9", changefreq: "monthly" },
  { key: "about",    path: "about",      indexable: true,  priority: "0.8", changefreq: "yearly"  },
  { key: "location", path: "location",   indexable: true,  priority: "0.8", changefreq: "yearly"  },
  { key: "contact",  path: "contact",    indexable: true,  priority: "0.9", changefreq: "yearly"  },
  { key: "privacy",  path: "privacy",    indexable: true,  priority: "0.2", changefreq: "yearly"  },
  { key: "terms",    path: "terms",      indexable: true,  priority: "0.2", changefreq: "yearly"  },
  { key: "thankyou", path: "thank-you",  indexable: false },
  { key: "notfound", path: "404",        indexable: false },
];

const services = [...business.services]
  .sort((a, b) => a.order - b.order)
  .map((s) => ({
    key: "service",
    slug: s.slug,
    path: `services/${s.slug}`,
    indexable: true,
    priority: "0.7",
    changefreq: "yearly",
  }));

export default { base, services, all: [...base, ...services] };
