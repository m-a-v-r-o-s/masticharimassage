export default {
  origin: (process.env.SITE_ORIGIN || "https://www.mastichari-massage.gr").replace(/\/$/, ""),
  buildDate: new Date().toISOString(),
  year: new Date().getFullYear(),
};
