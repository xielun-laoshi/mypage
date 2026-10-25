/* ==========================================================================
   Custom cursor — an easing follower that squashes and stretches with its
   velocity. Its fill is the theme-inverting lens defined in main.css.
   ========================================================================== */

const SPEED = 0.17;

export function startCursor(el) {
  if (!el) return;

  const mouse    = { x: 0, y: 0 };
  const previous = { x: 0, y: 0 };
  const circle   = { x: 0, y: 0 };
  let scale = 0;
  let angle = 0;
  let running = false;

  // Only a real mouse or pen drives the circle; touch input hides it, so it
  // never parks on screen where a finger last tapped.
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") {
      el.hidden = true;
      return;
    }
    if (el.hidden) {
      // First appearance: start at the pointer instead of easing in from (0, 0).
      el.hidden = false;
      circle.x = previous.x = e.clientX;
      circle.y = previous.y = e.clientY;
    }
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  });

  function tick() {
    circle.x += (mouse.x - circle.x) * SPEED;
    circle.y += (mouse.y - circle.y) * SPEED;

    const dx = mouse.x - previous.x;
    const dy = mouse.y - previous.y;
    previous.x = mouse.x;
    previous.y = mouse.y;

    const velocity = Math.min(Math.sqrt(dx ** 2 + dy ** 2) * 4, 150);
    scale += ((velocity / 150) * 0.7 - scale) * SPEED;
    if (velocity > 20) angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    el.style.transform =
      `translate(${circle.x}px, ${circle.y}px) rotate(${angle}deg) scale(${1 + scale}, ${1 - scale})`;

    // Sleep once the circle has caught up; the next pointermove wakes it.
    const settled = Math.abs(mouse.x - circle.x) < 0.01 && Math.abs(mouse.y - circle.y) < 0.01 && scale < 5e-4;
    if (settled) running = false;
    else requestAnimationFrame(tick);
  }
}
