/* ==========================================================================
   Custom cursor — a ring typed in characters, after Nomad-1217's "ASCII
   Circles" (one symbol, set round), in the band's type and on the page's
   grid of characters (see main.css and js/frame.js). It follows the pointer
   with an elastic lag and squashes along its direction of travel; it swells
   over anything clickable, closes to a single character over reading text,
   and dips while pressed. The ring is drawn afresh for every size, squash
   and position, plotted into whole cells of the grid: its type stays
   upright, and over the band its characters take the place of the band's
   own, turning over cell by cell as it moves (each is set on a cell of
   paper there; over words it is the character alone, so that it never
   blanks a letter out). Mouse and pen only: touch never shows it.
   ========================================================================== */

const FOLLOW = 16;      // how fast the ring catches the pointer (1/s)
const SQUASH = 11;      // how fast the stretch responds (1/s)
const GROW = 14;        // how fast the size changes (1/s)
const SIZES = { idle: 1, link: 1.75, text: 0.24 };

/* The ring: its radius at rest (px), the symbol it is set in, and the block
   of cells it is drawn into, around the cell under the pointer (odd counts,
   so that one cell is the middle; main.css centers the block on it). */
const RING = { radius: 18, symbol: "+", cols: 15, rows: 13 };

/** A value in cells, rounded to the nearest whole one, halves toward the
    center, so that the ring comes out the same on every side. */
const near = (v) => Math.sign(v) * Math.ceil(Math.abs(v) - 0.5);

/** Starts the ring in `el`. `paper(x, y)` says whether the ring's
    character at that point of the page is set on a cell of paper (over the
    band's own characters) or stands alone (over words, or plain paper). */
export function startCursor(el, { paper = () => true } = {}) {
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
  let grid = { cell: [7, 9], origin: [0, 0] }; // the page's grid (px), from main.css

  // The block: a cell for each of its characters, every one holding the
  // symbol, set showing or hidden (.off) as the ring passes through it; a
  // hidden cell takes a character's room, as a space would. Only the cells
  // the ring enters or leaves change from one frame to the next.
  const count = RING.cols * RING.rows;
  const cells = [];
  const block = [];
  for (let r = 0; r < RING.rows; r++) {
    for (let c = 0; c < RING.cols; c++) {
      const cell = document.createElement("i");
      cell.className = "off";
      cell.textContent = RING.symbol;
      cells.push(cell);
      block.push(cell);
    }
    if (r < RING.rows - 1) block.push("\n");
  }
  el.replaceChildren(...block);
  const shown = new Uint8Array(count); // the cells showing
  const ring = new Uint8Array(count);  // the cells the ring is in, this frame
  const bare = new Uint8Array(count);  // the cells set without paper

  const approach = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));

  /** The page's grid, as main.css has it now. */
  function measure() {
    const style = getComputedStyle(document.documentElement);
    const px = (name, fallback) => parseFloat(style.getPropertyValue(name)) || fallback;
    grid = { cell: [px("--cell-w", 7), px("--cell-h", 9)], origin: [px("--grid-x", 0), px("--grid-y", 0)] };
  }

  function wake() {
    if (running) return;
    running = true;
    last = 0;
    measure();
    requestAnimationFrame(tick);
  }
  // A resize lays the grid out anew, over the next frame or two: a ring
  // still moving reads it again on its next few frames (one at rest, when
  // it next wakes).
  let regrid = 0;
  window.addEventListener("resize", () => { regrid = 3; });

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

  // What is under the pointer decides the ring's size.
  document.addEventListener("pointerover", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const hit = target && target.closest("[data-cursor], a, button, input, select, textarea, summary");
    const next = !hit ? "idle" : hit.dataset.cursor || "link";
    if (next === state) return;
    state = el.dataset.state = next;
    wake();
  });

  /** Types the ring: an ellipse with these radii (px), turned by `turn`
      (radians), centered (offX, offY) px from the middle cell's center
      (which is at x, y on the page), plotted into the block a character to
      each cell it passes through. Smaller than a character, it is a single
      one. */
  function draw(rx, ry, turn, offX, offY, x, y) {
    const [cw, ch] = grid.cell;
    const { cols, rows } = RING;
    const midCol = (cols - 1) / 2, midRow = (rows - 1) / 2;
    ring.fill(0);
    if (rx < cw * 0.75 && ry < ch * 0.75) ring[midRow * cols + midCol] = 1;
    else {
      const cos = Math.cos(turn), sin = Math.sin(turn);
      const steps = Math.max(24, Math.ceil(2 * (rx + ry))); // a point every px or so
      for (let k = 0; k < steps; k++) {
        const t = (k / steps) * 2 * Math.PI;
        const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
        const col = midCol + near((offX + ex * cos - ey * sin) / cw);
        const row = midRow + near((offY + ex * sin + ey * cos) / ch);
        if (row >= 0 && row < rows && col >= 0 && col < cols) ring[row * cols + col] = 1;
      }
    }
    for (let i = 0; i < count; i++) {
      if (ring[i]) {
        // On paper or alone, by what lies under it there.
        const col = i % cols, row = (i - col) / cols;
        const alone = paper(x + (col - midCol) * cw, y + (row - midRow) * ch) ? 0 : 1;
        if (alone !== bare[i]) {
          bare[i] = alone;
          cells[i].classList.toggle("bare", !!alone);
        }
      }
      if (ring[i] === shown[i]) continue;
      shown[i] = ring[i];
      cells[i].classList.toggle("off", !ring[i]);
    }
  }

  function tick(t) {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 1 / 60;
    last = t;
    if (regrid > 0) {
      regrid--;
      measure();
    }

    const prevX = lens.x, prevY = lens.y;
    lens.x = approach(lens.x, pointer.x, FOLLOW, dt);
    lens.y = approach(lens.y, pointer.y, FOLLOW, dt);

    // Squash and stretch with speed (px/s), pointing along the motion.
    const vx = (lens.x - prevX) / dt, vy = (lens.y - prevY) / dt;
    const speed = Math.hypot(vx, vy);
    const goal = Math.min(speed / 2400, 1) * (state === "link" ? 0.25 : 0.6);
    stretch = approach(stretch, goal, SQUASH, dt);
    if (speed > 300) angle = Math.atan2(vy, vx);

    scale = approach(scale, SIZES[state] * (pressed ? 0.82 : 1), GROW, dt);

    // The block sits on the grid, around the cell under the ring's center.
    // Moving, the ring is plotted from where its center really is, so that
    // its characters turn over one by one; coming to rest, it settles round
    // the middle of that cell, the same on every side.
    const [cw, ch] = grid.cell;
    const [gx, gy] = grid.origin;
    const x = gx + (Math.floor((lens.x - gx) / cw) + 0.5) * cw;
    const y = gy + (Math.floor((lens.y - gy) / ch) + 0.5) * ch;
    const r = RING.radius * scale;
    const moving = Math.min(speed / 80, 1);
    draw(r * (1 + stretch), r * (1 - stretch), angle, (lens.x - x) * moving, (lens.y - y) * moving, x, y);
    el.style.transform = `translate(${x}px, ${y}px)`;

    const settled = Math.abs(pointer.x - lens.x) < 0.05 && Math.abs(pointer.y - lens.y) < 0.05 &&
      stretch < 1e-3 && Math.abs(scale - SIZES[state] * (pressed ? 0.82 : 1)) < 1e-3;
    if (settled) running = false;
    else requestAnimationFrame(tick);
  }
}
