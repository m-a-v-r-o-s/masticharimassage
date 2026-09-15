(function () {
  "use strict";

  var doc = document;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- cookie helpers ---------- */
  function readCookie(name) {
    var m = doc.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }
  function writeCookie(name, value, maxAge) {
    doc.cookie = name + "=" + encodeURIComponent(value) + ";path=/;max-age=" + maxAge + ";samesite=Lax";
  }
  function eraseCookie(name) {
    doc.cookie = name + "=;path=/;max-age=0;samesite=Lax";
  }

  /* ---------- mobile navigation ---------- */
  var toggle = doc.querySelector(".nav-toggle");
  var nav = doc.getElementById("site-nav");
  var header = doc.querySelector(".site-header");
  var setHeaderHeight = function () {
    if (header) doc.documentElement.style.setProperty("--header-h", header.getBoundingClientRect().height + "px");
  };
  setHeaderHeight();
  window.addEventListener("resize", setHeaderHeight);
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      if (!open) setHeaderHeight();
      toggle.setAttribute("aria-expanded", String(!open));
      nav.setAttribute("data-open", String(!open));
      doc.body.classList.toggle("nav-open", !open);
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        toggle.setAttribute("aria-expanded", "false");
        nav.setAttribute("data-open", "false");
        doc.body.classList.remove("nav-open");
        toggle.focus();
      }
    });
  }

  /* ---------- language picker ---------- */
  var langToggle = doc.querySelector(".lang-picker__toggle");
  var langList = doc.getElementById("lang-picker-list");
  if (langToggle && langList) {
    var closeLangPicker = function () {
      langToggle.setAttribute("aria-expanded", "false");
      langList.hidden = true;
    };
    langToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = langToggle.getAttribute("aria-expanded") === "true";
      if (open) closeLangPicker();
      else {
        langToggle.setAttribute("aria-expanded", "true");
        langList.hidden = false;
      }
    });
    doc.addEventListener("click", function (e) {
      if (langToggle.getAttribute("aria-expanded") === "true" && !langList.contains(e.target) && e.target !== langToggle) {
        closeLangPicker();
      }
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && langToggle.getAttribute("aria-expanded") === "true") {
        closeLangPicker();
        langToggle.focus();
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

  /* ---------- hero photographs taking turns ----------
     WCAG 2.2.2: anything that moves on its own has to be stoppable, so the frame
     ships with a real pause control rather than relying on the visitor's patience.
     Reduced motion starts it paused instead of hiding the control - the photos are
     still reachable, they just never move unless asked. */
  var slidesRoot = doc.querySelector("[data-slides]");
  if (slidesRoot) {
    var slides = slidesRoot.querySelectorAll(".hero__slide");
    var slidesBtn = slidesRoot.querySelector("[data-slides-toggle]");
    var iconPause = slidesRoot.querySelector("[data-icon-pause]");
    var iconPlay = slidesRoot.querySelector("[data-icon-play]");
    var labels = slidesRoot.getAttribute("data-slides-labels");
    try { labels = labels ? JSON.parse(labels) : null; } catch (e) { labels = null; }

    if (slides.length > 1 && slidesBtn) {
      var current = 0;
      var timer = null;
      var INTERVAL = 6000;

      function show(next) {
        slides[current].classList.remove("is-active");
        current = (next + slides.length) % slides.length;
        slides[current].classList.add("is-active");
      }
      function advance() { show(current + 1); }
      function start() {
        if (timer) return;
        timer = window.setInterval(advance, INTERVAL);
        slidesBtn.setAttribute("aria-pressed", "false");
        if (labels) slidesBtn.setAttribute("aria-label", labels.pause);
        if (iconPause) iconPause.hidden = false;
        if (iconPlay) iconPlay.hidden = true;
      }
      function stop() {
        if (timer) { window.clearInterval(timer); timer = null; }
        slidesBtn.setAttribute("aria-pressed", "true");
        if (labels) slidesBtn.setAttribute("aria-label", labels.play);
        if (iconPause) iconPause.hidden = true;
        if (iconPlay) iconPlay.hidden = false;
      }

      slidesBtn.addEventListener("click", function () {
        if (timer) stop(); else { start(); advance(); }
      });
      // A tab in the background should not burn through the rotation unwatched.
      doc.addEventListener("visibilitychange", function () {
        if (doc.hidden) { if (timer) { window.clearInterval(timer); timer = null; } }
        else if (slidesBtn.getAttribute("aria-pressed") === "false") start();
      });

      if (reduce) stop(); else start();
    }
  }

  /* ---------- cookie consent + remembered language ---------- */
  function getConsent() {
    try {
      var stored = localStorage.getItem("cookie-consent");
      if (stored === "accepted" || stored === "declined") return stored;
    } catch (e) {}
    var fromCookie = readCookie("cookieConsent");
    return fromCookie === "accepted" || fromCookie === "declined" ? fromCookie : null;
  }
  function setConsent(value) {
    try { localStorage.setItem("cookie-consent", value); } catch (e) {}
    writeCookie("cookieConsent", value, 31536000);
  }
  function applyLangCookie() {
    var current = doc.documentElement.getAttribute("lang");
    if (!current) return;
    if (getConsent() === "accepted") writeCookie("lang", current.slice(0, 2), 31536000);
    else eraseCookie("lang");
  }
  applyLangCookie();

  var notice = doc.getElementById("cookie-notice");
  if (notice) {
    var noticeTitle = notice.querySelector("h2");
    var openNotice = function () {
      notice.hidden = false;
      if (noticeTitle) noticeTitle.focus();
    };
    var closeNotice = function () { notice.hidden = true; };

    if (getConsent() === null) openNotice();

    var acceptBtn = notice.querySelector("[data-cookie-accept]");
    if (acceptBtn) acceptBtn.addEventListener("click", function () {
      setConsent("accepted");
      applyLangCookie();
      closeNotice();
    });

    var declineBtn = notice.querySelector("[data-cookie-decline]");
    if (declineBtn) declineBtn.addEventListener("click", function () {
      setConsent("declined");
      applyLangCookie();
      closeNotice();
    });

    var manageBtn = doc.querySelector("[data-cookie-manage]");
    if (manageBtn) manageBtn.addEventListener("click", openNotice);
  }

  /* ---------- testimonial translation toggle ---------- */
  var quoteToggles = doc.querySelectorAll("[data-quote-toggle]");
  for (var qi = 0; qi < quoteToggles.length; qi++) {
    (function (btn) {
      var figure = btn.closest(".quote");
      if (!figure) return;
      var original = figure.querySelector(".quote__original");
      var translated = figure.querySelector(".quote__translated");
      var note = figure.querySelector(".quote__t-note");
      if (!original || !translated) return;
      btn.addEventListener("click", function () {
        var showTranslation = btn.getAttribute("aria-expanded") !== "true";
        original.hidden = showTranslation;
        translated.hidden = !showTranslation;
        if (note) note.hidden = !showTranslation;
        btn.setAttribute("aria-expanded", String(showTranslation));
        btn.textContent = showTranslation ? btn.getAttribute("data-label-hide") : btn.getAttribute("data-label-show");
      });
    })(quoteToggles[qi]);
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
    ["name", "email", "message", "consent"].forEach(function (n) { setFieldError(n, ""); });
    if (status) status.innerHTML = "";
  }

  function validate(data) {
    var errors = {};
    if (!String(data.name || "").trim()) errors.name = strings.name;
    var email = String(data.email || "").trim();
    if (!email) errors.email = strings.email;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.emailInvalid = true, errors.email = strings.emailInvalid;
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
