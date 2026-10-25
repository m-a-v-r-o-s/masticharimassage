/* Certificate viewer: swipe between scans (rubber band at the ends, momentum picks next/prev),
   swipe down to dismiss with the dim fading by progress. Buttons, arrow keys and Esc stay.
   Wellness: bounce 0, the springs only settle. Loaded as a module on the About page only. */
import { rubberband, project, velocityTracker, springTo, prefersReducedMotion } from "./spring.js";

const dlg = document.querySelector("[data-lightbox-dialog]");
const links = [...document.querySelectorAll("[data-lightbox]")];
if (dlg && dlg.showModal && links.length) {
  const doc = document;
  const track = dlg.insertBefore(doc.createElement("div"), dlg.firstChild);
  track.className = "lightbox__track";
  const live = dlg.appendChild(doc.createElement("p"));
  live.className = "visually-hidden";
  live.setAttribute("aria-live", "polite");
  const imgs = links.map((a) => {
    const im = track.appendChild(doc.createElement("img"));
    im.alt = a.querySelector("img").alt;
    im.draggable = false;
    im.dataset.src = a.getAttribute("href");
    return im;
  });
  const prev = dlg.querySelector('[data-step="-1"]');
  const next = dlg.querySelector('[data-step="1"]');
  const last = links.length - 1;
  prev.hidden = next.hidden = links.length < 2;

  const sx = { x: 0, v: 0 }; // track offset, px
  const sy = { x: 0, v: 0 }; // dismiss offset, px
  const vx = velocityTracker(), vy = velocityTracker();
  const SPRING = { duration: 0.4, bounce: 0 };
  let W = 1, H = 1, index = 0, stopX, stopY, closing = false;

  const render = () => {
    track.style.transform = `translate3d(${sx.x}px,${sy.x}px,0)`;
    dlg.style.setProperty("--lb-p", Math.min(1, Math.max(0, sy.x / (H * 0.5))).toFixed(3));
  };
  const measure = () => { W = dlg.clientWidth || 1; H = dlg.clientHeight || 1; };
  const load = (i) => { const im = imgs[i]; if (im && !im.src) im.src = im.dataset.src; };
  const settleIndex = (i) => {
    index = i;
    imgs.forEach((im, n) => { if (Math.abs(n - i) <= 1) load(n); n === i ? im.removeAttribute("aria-hidden") : im.setAttribute("aria-hidden", "true"); });
    prev.setAttribute("aria-disabled", String(i === 0));
    next.setAttribute("aria-disabled", String(i === last));
    live.textContent = imgs[i].alt;
  };
  const go = (i, v = 0) => {
    i = Math.max(0, Math.min(last, i));
    settleIndex(i);
    stopX && stopX();
    if (prefersReducedMotion()) { sx.x = -i * W; sx.v = 0; render(); return; }
    sx.v = v;
    stopX = springTo(sx, -i * W, { ...SPRING, onUpdate: render });
  };
  const finish = () => { if (dlg.open) dlg.close(); };
  const dismiss = (v = 0) => {
    if (closing) return;
    closing = true;
    stopY && stopY();
    if (prefersReducedMotion()) { finish(); return; }
    sy.v = v;
    stopY = springTo(sy, H, { ...SPRING, onUpdate: render, onDone: finish });
  };

  links.forEach((a, i) => a.addEventListener("click", (e) => {
    e.preventDefault();
    closing = false;
    dlg.showModal();
    measure();
    sx.x = -i * W; sx.v = 0; sy.x = 0; sy.v = 0;
    settleIndex(i);
    render();
  }));
  dlg.addEventListener("close", () => { stopX && stopX(); stopY && stopY(); sy.x = 0; sy.v = 0; closing = false; render(); });
  dlg.querySelector(".lightbox__close").addEventListener("click", () => dismiss());
  [prev, next].forEach((b) => b.addEventListener("click", () => go(index + Number(b.dataset.step))));
  // Esc runs the same exit as the swipe instead of the instant native close.
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); dismiss(); });
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(index - 1);
    else if (e.key === "ArrowRight") go(index + 1);
  });
  window.addEventListener("resize", () => { if (!dlg.open) return; measure(); stopX && stopX(); sx.x = -index * W; sx.v = 0; render(); });

  /* ---- gesture: 10px hysteresis, then lock to one axis, 1:1 with the finger ---- */
  let id = null, axis = null, x0 = 0, y0 = 0, baseX = 0, baseY = 0, dragged = false;
  dlg.addEventListener("pointerdown", (e) => {
    if (id !== null || closing || (e.pointerType === "mouse" && e.button !== 0) || e.target.closest("button")) return;
    id = e.pointerId; axis = null; dragged = false;
    x0 = e.clientX; y0 = e.clientY;
    stopX && stopX(); stopY && stopY(); // catch it mid-flight: continue from the live value
    baseX = sx.x; baseY = sy.x;
    vx.reset(); vy.reset(); vx.add(sx.x); vy.add(sy.x);
  });
  dlg.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (!axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      if (axis === "x" && links.length < 2) axis = "y";
      dragged = true;
      dlg.setPointerCapture(id);
    }
    if (axis === "x") {
      let x = baseX + dx;
      if (x > 0) x = rubberband(x, W);
      else if (x < -last * W) x = -last * W + rubberband(x + last * W, W);
      sx.x = x; vx.add(x);
    } else {
      let y = baseY + dy;
      if (y < 0) y = rubberband(y, H); // only down dismisses; up resists
      sy.x = y; vy.add(y);
    }
    render();
  });
  const release = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    if (axis === "x") {
      const v = vx.get(), landing = sx.x + project(v, 0.99);
      const from = Math.round(-baseX / W);
      go(Math.max(from - 1, Math.min(from + 1, Math.round(-landing / W))), v);
    } else if (axis === "y") {
      const v = vy.get();
      if (sy.x + project(v, 0.99) > H * 0.25) dismiss(v);
      else if (prefersReducedMotion()) { sy.x = 0; render(); }
      else { sy.v = v; stopY = springTo(sy, 0, { ...SPRING, onUpdate: render }); }
    }
  };
  dlg.addEventListener("pointerup", release);
  dlg.addEventListener("pointercancel", release);
  // A tap on the dim area closes; the click that ends a drag must not.
  dlg.addEventListener("click", (e) => {
    if (dragged) { dragged = false; return; }
    if (e.target === dlg || e.target === track) dismiss();
  });
}
