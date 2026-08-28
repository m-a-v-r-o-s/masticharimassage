(function () {
  "use strict";

  var doc = document;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- mobile navigation ---------- */
  var toggle = doc.querySelector(".nav-toggle");
  var nav = doc.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.setAttribute("data-open", String(!open));
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        toggle.setAttribute("aria-expanded", "false");
        nav.setAttribute("data-open", "false");
        toggle.focus();
      }
    });
  }

  /* ---------- the one motion effect ---------- */
  var reveals = doc.querySelectorAll(".reveal");
  if (!reveals.length) { /* nothing to do */ }
  else if (reduce || !("IntersectionObserver" in window)) {
    for (var i = 0; i < reveals.length; i++) reveals[i].classList.add("is-visible");
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    for (var j = 0; j < reveals.length; j++) io.observe(reveals[j]);
  }

  /* ---------- remember the chosen language ---------- */
  var current = doc.documentElement.getAttribute("lang");
  if (current) {
    try { doc.cookie = "lang=" + current.slice(0, 2) + ";path=/;max-age=31536000;samesite=Lax"; } catch (e) {}
  }

  /* ---------- cookie notice ---------- */
  var notice = doc.getElementById("cookie-notice");
  if (notice) {
    var seen = false;
    try { seen = localStorage.getItem("cookie-notice") === "seen"; } catch (e) { seen = /(?:^|;\s*)cookieNotice=seen/.test(doc.cookie); }
    if (!seen) {
      notice.hidden = false;
      var accept = notice.querySelector("[data-cookie-accept]");
      if (accept) accept.addEventListener("click", function () {
        notice.hidden = true;
        try { localStorage.setItem("cookie-notice", "seen"); }
        catch (e) { doc.cookie = "cookieNotice=seen;path=/;max-age=31536000;samesite=Lax"; }
      });
    }
  }

  /* ---------- booking form ---------- */
  var form = doc.getElementById("booking-form");
  if (!form) return;

  var status = doc.getElementById("form-status");
  var submit = form.querySelector("[data-submit]");
  var submitLabel = form.querySelector("[data-submit-label]");
  var originalLabel = submitLabel ? submitLabel.textContent : "";
  var strings = {};
  try { strings = JSON.parse(doc.getElementById("form-strings").textContent); } catch (e) {}

  var csrfField = form.querySelector("[data-csrf]");
  function readCookie(name) {
    var m = doc.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }
  if (csrfField) csrfField.value = readCookie("csrf");

  function setFieldError(name, message) {
    var wrap = form.querySelector('[data-field="' + name + '"]');
    var err = doc.getElementById("err-" + name);
    if (!wrap) return;
    if (message) {
      wrap.setAttribute("data-invalid", "true");
      if (err) { err.textContent = message; err.hidden = false; }
      var input = wrap.querySelector("input, select, textarea");
      if (input) input.setAttribute("aria-invalid", "true");
    } else {
      wrap.removeAttribute("data-invalid");
      if (err) { err.textContent = ""; err.hidden = true; }
      var inp = wrap.querySelector("input, select, textarea");
      if (inp) inp.removeAttribute("aria-invalid");
    }
  }

  function clearErrors() {
    ["name", "email", "where", "message", "consent"].forEach(function (n) { setFieldError(n, ""); });
    if (status) status.innerHTML = "";
  }

  function validate(data) {
    var errors = {};
    if (!String(data.name || "").trim()) errors.name = strings.name;
    var email = String(data.email || "").trim();
    if (!email) errors.email = strings.email;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.emailInvalid = true, errors.email = strings.emailInvalid;
    if (!String(data.where || "").trim()) errors.where = strings.where;
    if (String(data.message || "").length > 2000) errors.message = strings.message;
    if (!data.consent) errors.consent = strings.consent;
    return errors;
  }

  function showSummary(errors) {
    if (!status) return;
    var items = Object.keys(errors).map(function (k) {
      return '<li><a href="#in-' + k + '">' + errors[k] + "</a></li>";
    }).join("");
    status.innerHTML =
      '<div class="alert alert--error"><h2>' + (strings.summaryTitle || "") + "</h2><ul>" + items + "</ul></div>";
    var first = form.querySelector('[data-invalid="true"] input, [data-invalid="true"] select, [data-invalid="true"] textarea');
    if (first) first.focus();
  }

  function setBusy(busy) {
    if (!submit) return;
    submit.setAttribute("aria-disabled", String(busy));
    submit.disabled = busy;
    if (submitLabel) submitLabel.textContent = busy ? (strings.submitting || originalLabel) : originalLabel;
    var sp = submit.querySelector(".spinner");
    if (busy && !sp) { var s = doc.createElement("span"); s.className = "spinner"; submit.insertBefore(s, submit.firstChild); }
    if (!busy && sp) sp.remove();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearErrors();
    var fd = new FormData(form);
    var data = {};
    fd.forEach(function (v, k) { data[k] = v; });
    data.consent = form.querySelector("#in-consent").checked;

    var errors = validate(data);
    delete errors.emailInvalid;
    if (Object.keys(errors).length) {
      Object.keys(errors).forEach(function (k) { setFieldError(k, errors[k]); });
      showSummary(errors);
      return;
    }

    setBusy(true);
    fetch(form.action, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data),
      credentials: "same-origin"
    })
      .then(function (res) { return res.json().then(function (body) { return { status: res.status, body: body }; }); })
      .then(function (r) {
        setBusy(false);
        if (r.status === 200 && r.body.ok) {
          form.hidden = true;
          if (status) {
            status.innerHTML =
              '<div class="alert alert--success"><h2>' + (strings.successTitle || "") + "</h2><p>" +
              (strings.successBody || "") + '</p><p><a href="' + (strings.thankyouUrl || "") + '">' +
              (strings.successLink || "") + "</a></p></div>";
            status.querySelector("h2").setAttribute("tabindex", "-1");
            status.querySelector("h2").focus();
          }
          return;
        }
        if (r.status === 429) {
          if (status) status.innerHTML = '<div class="alert alert--error"><p>' + strings.rateLimit + "</p></div>";
          return;
        }
        if (r.body && r.body.errors) {
          Object.keys(r.body.errors).forEach(function (k) { setFieldError(k, strings[k] || r.body.errors[k]); });
          showSummary(r.body.errors);
          return;
        }
        if (status) status.innerHTML = '<div class="alert alert--error"><p>' + strings.server + "</p></div>";
      })
      .catch(function () {
        setBusy(false);
        if (status) status.innerHTML = '<div class="alert alert--error"><p>' + strings.server + "</p></div>";
      });
  });
})();
