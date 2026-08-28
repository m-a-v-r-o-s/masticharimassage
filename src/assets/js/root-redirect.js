/* Fallback locale negotiation for a purely static host. The Fastify server
   normally redirects "/" before this page is ever served. */
(function () {
  var el = document.currentScript;
  var built;
  try { built = JSON.parse(el.getAttribute("data-locales") || "[]"); } catch (e) { return; }
  try {
    var m = document.cookie.match(/(?:^|;\s*)lang=([a-z]{2})/);
    if (m && built.indexOf(m[1]) > -1) { location.replace("/" + m[1] + "/"); return; }
    var langs = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < langs.length; i++) {
      var code = String(langs[i]).slice(0, 2).toLowerCase();
      if (built.indexOf(code) > -1) { location.replace("/" + code + "/"); return; }
    }
  } catch (e) {}
})();
