// Shared computed data for every generated page.
//
// pagePath / pageKey / locale are derived here rather than in each template's front
// matter, because Eleventy cannot see the dependency between a YAML front-matter
// string template and a JS computed function that reads it - which silently gave
// every paginated service and legal page the home page's canonical URL.
//
// Templates declare: pathKey + pageKey (simple pages), or sp (service pages),
// or lp (legal pages). Everything else is worked out from those.
//
// Eleventy probes these getters with a partly-populated data object while it works
// out ordering, so each one has to tolerate missing inputs.

const resolvePath = (data) => {
  if (data.sp) return "services/" + data.sp.slug;
  if (data.lp) return data.lp.path;
  return data.pathKey || "";
};

// `loc` is the pagination alias on the simple pages; service and legal pages
// carry their locale inside their pagination item instead. Everything downstream
// - and every href in the templates - reads the single computed `locale`.
const resolveLocale = (data) => {
  if (data.sp) return data.sp.locale;
  if (data.lp) return data.lp.locale;
  return data.loc;
};

export default {
  layout: "layouts/base.njk",
  eleventyComputed: {
    locale: resolveLocale,
    pagePath: resolvePath,
    pageKey: (data) => (data.sp ? "service" : data.lp ? data.lp.key : data.pageKey),
    serviceSlug: (data) => (data.sp ? data.sp.slug : undefined),
    c: (data) => {
      const loc = resolveLocale(data);
      return loc && data.copy ? data.copy[loc] : undefined;
    },
    L: (data) => {
      const loc = resolveLocale(data);
      return loc && data.locales ? data.locales.byCode[loc] : undefined;
    },
    isDraftLocale: (data) => {
      const loc = resolveLocale(data);
      const l = loc && data.locales ? data.locales.byCode[loc] : undefined;
      return l ? l.status !== "live" : false;
    },
    // hreflang cluster: live locales only. A draft locale ships noindex, so
    // advertising it as an alternate would contradict the robots directive.
    alternates: (data) => {
      if (!data.locales || !data.buildLocales) return [];
      const p = resolvePath(data);
      return data.locales.live
        .filter((l) => data.buildLocales.includes(l.code))
        .map((l) => ({
          hreflang: l.hreflang,
          code: l.code,
          href: "/" + l.code + "/" + (p ? p + "/" : ""),
        }));
    },
    selfPath: (data) => {
      const loc = resolveLocale(data);
      if (!loc) return undefined;
      const p = resolvePath(data);
      return "/" + loc + "/" + (p ? p + "/" : "");
    },
  },
};
