/* ==========================================================================
   Custom cursor — a theme-inverting lens (see main.css) that follows the
   pointer with an elastic lag and squashes along its direction of travel.
   It swells over anything clickable, shrinks to a point over reading text,
   and dips while pressed. Mouse and pen only: touch never shows it.
   ========================================================================== */

const FOLLOW = 16;      // how fast the lens catches the pointer (1/s)
const SQUASH = 11;      // how fast the stretch responds (1/s)
const GROW = 14;        // how fast the size changes (1/s)
const SIZES = { idle: 1, link: 1.75, text: 0.24 };

export function startCursor(el) {
  if (!el) return;

  const pointer = { x: 0, y: 0 };
  const lens = { x: 0, y: 0 };
  let stretch = 0;
  let angle = 0;
  let scale = 1;
  let state = "idle";
  let pressed = false;
  let running = false;
  let last = 0;

  const approach = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));

  function wake() {
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(tick);
  }

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") { el.hidden = true; return; }
    if (el.hidden) {
      el.hidden = false;
      lens.x = pointer.x = e.clientX;
      lens.y = pointer.y = e.clientY;
    }
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    wake();
  }, { passive: true });

  window.addEventListener("pointerdown", (e) => { if (e.pointerType !== "touch") { pressed = true; wake(); } });
  window.addEventListener("pointerup", () => { pressed = false; wake(); });
  document.documentElement.addEventListener("mouseleave", () => { el.hidden = true; });

  // What is under the pointer decides the lens size.
  document.addEventListener("pointerover", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const hit = target && target.closest("[data-cursor], a, button");
    state = !hit ? "idle" : hit.dataset.cursor || "link";
    el.dataset.state = state;
    wake();
  });

  function tick(t) {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 1 / 60;
    last = t;

    const prevX = lens.x, prevY = lens.y;
    lens.x = approach(lens.x, pointer.x, FOLLOW, dt);
    lens.y = approach(lens.y, pointer.y, FOLLOW, dt);

    // Squash and stretch with speed (px/s), pointing along the motion.
    const vx = (lens.x - prevX) / dt, vy = (lens.y - prevY) / dt;
    const speed = Math.hypot(vx, vy);
    const goal = Math.min(speed / 2400, 1) * (state === "link" ? 0.25 : 0.6);
    stretch = approach(stretch, goal, SQUASH, dt);
    if (speed > 300) angle = (Math.atan2(vy, vx) * 180) / Math.PI;

    scale = approach(scale, SIZES[state] * (pressed ? 0.82 : 1), GROW, dt);

    el.style.transform =
      `translate(${lens.x}px, ${lens.y}px) rotate(${angle}deg) scale(${scale * (1 + stretch)}, ${scale * (1 - stretch)})`;

    const settled = Math.abs(pointer.x - lens.x) < 0.05 && Math.abs(pointer.y - lens.y) < 0.05 &&
      stretch < 1e-3 && Math.abs(scale - SIZES[state] * (pressed ? 0.82 : 1)) < 1e-3;
    if (settled) running = false;
    else requestAnimationFrame(tick);
  }
}
