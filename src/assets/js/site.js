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
  if (header) new ResizeObserver(setHeaderHeight).observe(header);
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
  /* threshold 0: a ratio threshold can never be met by an element taller than the viewport (the review wall on phones) */
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
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
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

  /* ---------- certificate lightbox ---------- */
  // The links still work without JS (they open the scan itself); this keeps the
  // visitor on the page instead.
  var lightbox = doc.querySelector("[data-lightbox-dialog]");
  if (lightbox && lightbox.showModal) {
    var lbImg = lightbox.appendChild(doc.createElement("img"));
    var lbLinks = doc.querySelectorAll("[data-lightbox]");
    for (var li = 0; li < lbLinks.length; li++) {
      lbLinks[li].addEventListener("click", function (e) {
        e.preventDefault();
        lbImg.src = this.getAttribute("href");
        lbImg.alt = this.querySelector("img").alt;
        lightbox.showModal();
      });
    }
    lightbox.querySelector(".lightbox__close").addEventListener("click", function () { lightbox.close(); });
    // A click on the backdrop lands on the dialog itself, not on its children.
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) lightbox.close(); });
  }
})();
