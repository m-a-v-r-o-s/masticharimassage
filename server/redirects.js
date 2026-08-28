// 301 map from the old WordPress site. The domain has inbound links from tourism
// directories and from the old comment threads, and those are worth keeping.
// Everything lands on the English tree; the locale cookie/negotiation then takes
// over on the next click.
const D = "/en";

export const exactRedirects = new Map(Object.entries({
  "/mastichari": `${D}/`,
  "/mastichari/": `${D}/`,
  "/mastichari/about-us": `${D}/about/`,
  "/mastichari/about-us/": `${D}/about/`,
  "/mastichari/kos-massage": `${D}/services/`,
  "/mastichari/kos-massage/": `${D}/services/`,
  "/mastichari/services": `${D}/services/`,
  "/mastichari/services/": `${D}/services/`,
  "/mastichari/massage": `${D}/services/`,
  "/mastichari/massage/": `${D}/services/`,
  "/mastichari/reservation": `${D}/contact/`,
  "/mastichari/reservation/": `${D}/contact/`,
  "/mastichari/contact": `${D}/contact/`,
  "/mastichari/contact/": `${D}/contact/`,
  "/mastichari/mastichari-tigaki-massage": `${D}/location/`,
  "/mastichari/mastichari-tigaki-massage/": `${D}/location/`,
  "/mastichari/photo-gallery": `${D}/`,
  "/mastichari/photo-gallery/": `${D}/`,
  "/mastichari/blog": `${D}/`,
  "/mastichari/blog/": `${D}/`,
  "/mastichari/sample-page": `${D}/`,
  "/mastichari/sample-page/": `${D}/`,
  // Bare equivalents, in case a directory linked the paths without the subfolder.
  "/about-us/": `${D}/about/`,
  "/kos-massage/": `${D}/services/`,
  "/reservation/": `${D}/contact/`,
  "/photo-gallery/": `${D}/`,
  "/mastichari-tigaki-massage/": `${D}/location/`,
  "/contact/": `${D}/contact/`,
  "/about/": `${D}/about/`,
  "/services/": `${D}/services/`,
  "/location/": `${D}/location/`,
}));

// The old WordPress reservation widget linked every service through one page id.
export const queryRedirects = [
  { test: (url) => url.pathname.startsWith("/mastichari") && url.searchParams.get("page_id") === "294", to: `${D}/services/` },
  { test: (url) => url.searchParams.has("page_id"), to: `${D}/` },
  { test: (url) => url.searchParams.has("p") && url.pathname === "/mastichari/", to: `${D}/` },
];

// WordPress feed and infrastructure paths: gone for good, and they should not be
// redirected into a page (a feed reader following a 301 to HTML is worse than a 410).
export const goneprefixes = [
  "/mastichari/feed",
  "/mastichari/comments/feed",
  "/mastichari/wp-json",
  "/mastichari/xmlrpc.php",
  "/wp-json",
  "/xmlrpc.php",
];

export function resolveRedirect(url) {
  const path = url.pathname.replace(/\/{2,}/g, "/");
  const exact = exactRedirects.get(path) || exactRedirects.get(path.replace(/\/$/, ""));
  if (exact) return { status: 301, to: exact };
  if (path.startsWith("/mastichari/wp-content/") || path.startsWith("/wp-content/")) return { status: 410 };
  if (goneprefixes.some((p) => path === p || path.startsWith(p + "/"))) return { status: 410 };
  for (const r of queryRedirects) if (r.test(url)) return { status: 301, to: r.to };
  if (path.startsWith("/mastichari/")) return { status: 301, to: `${D}/` };
  return null;
}
