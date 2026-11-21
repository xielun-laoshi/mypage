/* ==========================================================================
   Frame, typed — the page's frame set in the band's type (js/ascii.js), on
   the band's own grid, carried over the whole page. The two axes are rulers
   typed a character to a column, `+` where the ruler's major ticks stood,
   on the rows just outside the band, and the carets riding them step from
   column to column. A panel's edge is typed down the rows in broken bars
   (`¦`), crossing the rulers in a `+`. The name is lettered in one of the
   band's characters, in cells of its own (narrower, so its strokes close
   up), in a small face of capitals whose every stroke is one cell wide
   (FACE), so it reads slender and light. (A name with a letter the face
   lacks is drawn from the typewriter face instead, each cell struck with
   the character whose ink matches it, as the screen strikes a picture.) It
   develops when the page opens, each cell rising through the characters to
   its own, and a ripple spreads through it from the pointer. The frame's
   moves (the intro's ruler, its parting) are given as stairs, a character
   at a time, on curves that keep their steps in rhythm (see STEADY).
   ========================================================================== */

import { RAMP } from "./ascii.js";

/* The ink each of RAMP's characters lays down in Lekton, as a share of the
   heaviest's (measured as the screen strikes them), and so the share of a
   cell that must be inked for each to take over: halfway between its ink
   and the ink of the one before. */
const INK = [0.11, 0.14, 0.23, 0.29, 0.35, 0.39, 0.54, 0.63, 0.76, 0.82, 0.91, 0.99];
const STEPS = INK.map((ink, i) => (i ? (INK[i - 1] + ink) / 2 : ink / 2));

/* The band's grid where no screen lays one out (as TYPE in js/ascii.js):
   9 px type in a 0.78 × 1 em cell, a column and a row through the middle. */
const TYPE = { size: 9, column: 0.78, row: 1 };

/* The name's own face: capitals five cells tall and five wide, every
   stroke a single cell, set `gap` cells apart in RAMP's `mark` character
   (a light one), and shown at `size` of the type's size (smaller where the
   room left of the nav is less). Drawn by hand, as a banner's letters are,
   because strokes cut from an outline come out two cells wide or broken at
   this size. */
const FACE = {
  mark: "x", gap: 2, size: 0.62,
  glyphs: {
    A: [" ### ", "#   #", "#####", "#   #", "#   #"], B: ["#### ", "#   #", "#### ", "#   #", "#### "],
    C: [" ####", "#    ", "#    ", "#    ", " ####"], D: ["#### ", "#   #", "#   #", "#   #", "#### "],
    E: ["#####", "#    ", "#### ", "#    ", "#####"], F: ["#####", "#    ", "#### ", "#    ", "#    "],
    G: [" ####", "#    ", "#  ##", "#   #", " ### "], H: ["#   #", "#   #", "#####", "#   #", "#   #"],
    I: ["#####", "  #  ", "  #  ", "  #  ", "#####"], J: ["  ###", "    #", "    #", "#   #", " ### "],
    K: ["#   #", "#  # ", "###  ", "#  # ", "#   #"], L: ["#    ", "#    ", "#    ", "#    ", "#####"],
    M: ["#   #", "## ##", "# # #", "#   #", "#   #"], N: ["#   #", "##  #", "# # #", "#  ##", "#   #"],
    O: [" ### ", "#   #", "#   #", "#   #", " ### "], P: ["#### ", "#   #", "#### ", "#    ", "#    "],
    Q: [" ### ", "#   #", "# # #", "#  # ", " ## #"], R: ["#### ", "#   #", "#### ", "#  # ", "#   #"],
    S: [" ####", "#    ", " ### ", "    #", "#### "], T: ["#####", "  #  ", "  #  ", "  #  ", "  #  "],
    U: ["#   #", "#   #", "#   #", "#   #", " ### "], V: ["#   #", "#   #", "#   #", " # # ", "  #  "],
    W: ["#   #", "#   #", "# # #", "## ##", "#   #"], X: ["#   #", " # # ", "  #  ", " # # ", "#   #"],
    Y: ["#   #", " # # ", "  #  ", "  #  ", "  #  "], Z: ["#####", "   # ", "  #  ", " #   ", "#####"],
    " ": ["  ", "  ", "  ", "  ", "  "], "-": ["   ", "   ", "###", "   ", "   "],
    ".": [" ", " ", " ", " ", "#"], "'": ["#", "#", " ", " ", " "],
  },
};

/* The name drawn from the typewriter face instead (where FACE lacks one of
   its letters): how many rows its capitals stand (fewer where the masthead is
   short or narrow; never fewer than minRows, below which it is set smaller
   instead), and its letters' spacing (em, rounded so that every letter
   starts on a column: each is then struck alike), the gap between its words
   (columns). Its cells are narrower than the band's (`column`, em of the
   9 px type), so that its characters close up into strokes instead of
   standing apart. Lekton's capitals stand 0.6625 em, and every letter
   advances half an em. They are drawn semibold: the regular cut, its
   outline thickened by `stroke` (em). Their ink is struck firm, a cell's
   share of it taken from `firm[0]` (nothing) to `firm[1]` (all) on a smooth
   step, so a stroke cut across a cell still strikes whole; and never darker
   than RAMP's `top` character (`#`), so the name reads light. It is then
   shown at `size` of its drawn size (0.8). */
const NAME = {
  rows: 5, minRows: 4, tracking: 0.06, space: 4, column: 0.6, cap: 0.6625, advance: 0.5,
  weight: 400, stroke: 0.022, firm: [0.13, 0.42], top: 8, size: 0.8,
};
const FINE = 4; // board px to a CSS px, to read the ink finely

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const hash = (i) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** RAMP's index for a cell inked this much (-1: blank). */
const strike = (cover) => {
  let i = -1;
  while (i + 1 < STEPS.length && cover >= STEPS[i + 1]) i++;
  return i;
};
/** A cell's ink, struck firm (see NAME). */
const firm = (cover) => {
  const t = clamp((cover - NAME.firm[0]) / (NAME.firm[1] - NAME.firm[0]), 0, 1);
  return t * t * (3 - 2 * t);
};
/** The page's --edge (main.css), px. */
const edge = () => clamp(0.026 * innerWidth, 16, 72);

/** A cubic-bezier curve as `steps` stairs, for CSS (linear()): each level
    held until the curve reaches it, then struck at once, so that what moves
    on it moves a whole character at a time and still keeps its pace. */
function stairs([x1, y1, x2, y2], steps) {
  const at = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  const points = Array.from({ length: 241 }, (_, i) => [at(i / 240, x1, x2), at(i / 240, y1, y2)]);
  const timeOf = (y) => { // when the curve first reaches y (0–1)
    const i = points.findIndex(([, py]) => py >= y);
    if (i <= 0) return i === 0 ? 0 : 1;
    const [xa, ya] = points[i - 1], [xb, yb] = points[i];
    return xa + (xb - xa) * ((y - ya) / (yb - ya || 1));
  };
  const n = Math.max(1, Math.round(steps));
  const stops = ["0 0%"];
  for (let k = 1; k <= n; k++) {
    const x = (timeOf(k / n) * 100).toFixed(2);
    stops.push(`${((k - 1) / n).toFixed(4)} ${x}%`, `${(k / n).toFixed(4)} ${x}%`);
  }
  return `linear(${stops.join(", ")})`;
}
/* The curves those moves keep. A move made in whole characters shows every
   one of its steps, so a curve that sets off from rest or comes to rest
   (--ease-in-out, --ease-out in main.css) holds its first or last step for
   a quarter of a second, and stutters through the ones next to it. These
   gather and settle only a little: the slowest step takes about twice as
   long as the quickest, and the move reads as one motion with a rhythm.
   `draw`: the intro's ruler typing out (it sets off at once and settles);
   `part`: the rulers parting. */
const STEADY = {
  draw: [0.2, 0.5, 0.6, 0.9],
  part: [0.5, 0.3, 0.5, 0.7],
};

/* The ripple through the name: a ring that spreads from the pointer at an
   even pace (`pace` ms a column), `width` columns thick, in which the
   letters' cells step down `depth` characters at the start, fewer as it
   spreads (never to blank). A row counts for `tall` columns: the cells are
   taller than they are wide. */
const RIPPLE = { pace: 8, width: 3.5, depth: 5, tall: 1 / 0.6 };

/** Sets the frame in characters: the rulers on the two axes and the name.
    Returns
      setGrid(layout)   the screen's grid (layout in js/ascii.js), or null
                        when there is none (the frame then lays out its own)
      develop({ delay, ms })  types the name in, from blank, in a sweep;
                        returns when it is done (ms from now)
      column(x)         the left edge of the grid's column under x (px) */
export function typeFrame({ still = false } = {}) {
  const root = document.documentElement;
  const link = document.querySelector(".name a");
  const name = link ? setUpName(link) : null;
  let laidOut = null; // the screen's grid, while there is one
  let grid = estimate();
  let queued = 0;

  // The page's typed properties, set afresh on every update. (Setting one
  // that hasn't changed still has the page restyled; that is kept as it
  // was, since text drawn after it can come out a shade different on some
  // screens. Updates are few: the grid laid out, the face loaded, a resize.)
  const setVar = (property, value) => root.style.setProperty(property, value);
  const staircases = new Map(); // (stairs, by curve and count: see carry)
  const staircase = (curve, steps) => {
    const key = `${curve}|${Math.max(1, Math.round(steps))}`;
    if (!staircases.has(key)) staircases.set(key, stairs(curve, steps));
    return staircases.get(key);
  };

  /** The name's text stays for assistive tech; what is seen is typed. */
  function setUpName(el) {
    const label = el.textContent.trim();
    const spoken = document.createElement("span");
    spoken.className = "visually-hidden";
    spoken.textContent = label;
    const art = document.createElement("span");
    art.className = "name-art";
    art.setAttribute("aria-hidden", "true");
    el.replaceChildren(spoken, art);
    if (!still) el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") ripple(e); });
    return { label, text: label.toUpperCase(), art, final: null, late: null, cols: 0, rows: 0, run: 0, developing: false };
  }

  /** The band's grid as the screen would lay it out (js/ascii.js): odd
      counts of columns and rows, centered, the cells cut evenly at the
      edges (origin: the first cell's corner, from the band's). */
  function estimate() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const em = TYPE.size * dpr;
    const cw = Math.max(2, Math.round(em * TYPE.column));
    const ch = Math.max(2, Math.round(em * TYPE.row));
    const w = Math.round(innerWidth * dpr);
    const h = Math.max(1, Math.round((document.querySelector(".band")?.clientHeight || innerHeight * 0.7) * dpr));
    const cols = 2 * Math.ceil((w / cw - 1) / 2) + 1;
    const rows = 2 * Math.ceil((h / ch - 1) / 2) + 1;
    const y = Math.round((h - rows * ch) / 2); // (from the bottom, as GL counts)
    return { cell: [cw / dpr, ch / dpr], origin: [Math.round((w - cols * cw) / 2) / dpr, (h - y - rows * ch) / dpr], cols, rows };
  }

  function update() {
    queued = 0;
    grid = laidOut || estimate();
    rule();
    carry();
    if (name) drawName();
  }
  const later = () => { if (!queued) queued = requestAnimationFrame(update); };

  /** The rulers: a dash to a column, `+` at the ticks (sixths of the span
      between the page's edges), on the band's grid. (main.css types them
      where they run, from --ruler.) */
  function rule() {
    const [cw, ch] = grid.cell;
    const [gx] = grid.origin;
    const e = edge();
    const chars = new Array(grid.cols).fill("-");
    for (let k = 0; k <= 6; k++) {
      const c = Math.floor((e + (k * (innerWidth - 2 * e)) / 6 - gx) / cw);
      if (c >= 0 && c < grid.cols) chars[c] = "+";
    }
    setVar("--ruler", `"${chars.join("")}"`);
    setVar("--cell-w", `${cw}px`);
    setVar("--cell-h", `${ch}px`);
    setVar("--grid-x", `${gx}px`);
  }

  /** The band's rows, carried over the whole page, so that everything typed
      sits on one grid: the rulers on the rows just outside the band (past
      the part of its edge rows that the band cuts off: --ov-top and
      --ov-bottom), the cursor, and the panels' edge, typed down every row
      as broken bars (`¦`) that cross the rulers in a `+` (--column, from
      the row at --grid-y, the first that starts on screen or above it). */
  function carry() {
    const [, ch] = grid.cell;
    const band = document.querySelector(".band")?.getBoundingClientRect();
    if (!band?.height) return;
    const top = band.top + grid.origin[1]; // the first row's top (the band cuts it)
    const end = top + grid.rows * ch;      // the last row's bottom
    const y0 = top - Math.ceil(top / ch) * ch;
    const above = Math.round((top - ch - y0) / ch), below = Math.round((end - y0) / ch);
    const column = Array.from({ length: Math.ceil((innerHeight - y0) / ch) + 1 }, (_, i) => (i === above || i === below ? "+" : "¦"));
    setVar("--ov-top", `${band.top - top}px`);
    setVar("--ov-bottom", `${end - band.bottom}px`);
    setVar("--grid-y", `${y0}px`);
    setVar("--column", `"${column.join("\\A ")}"`);
    // The moves made on this grid, as stairs a character high or wide: the
    // ruler typing out from the middle (a column each way), and the rulers
    // parting from it (a row at a time: the top one travels from the middle
    // to the row above the band's first).
    setVar("--draw-ease", staircase(STEADY.draw, grid.cols / 2));
    setVar("--part-ease", staircase(STEADY.part, (innerHeight / 2 - top + ch / 2) / ch));
  }

  /** The name set `rows` tall: its cell (px: narrower than the band's, as
      tall), its type size (px), the column each letter starts on, and the
      columns it spans (a blank one either side). */
  function measureName(rows) {
    const [, ch] = grid.cell;
    const cw = TYPE.size * NAME.column;
    const font = (rows * ch) / NAME.cap; // the capitals fill the rows
    const pitch = Math.max(1, Math.round((font * (NAME.advance + NAME.tracking)) / cw));
    const starts = [];
    let at = 1;
    for (const letter of name.text) {
      starts.push(at);
      at += letter === " " ? NAME.space : pitch;
    }
    return { cell: [cw, ch], font, starts, cols: starts.at(-1) + Math.ceil((font * NAME.advance) / cw) + 1 };
  }

  /** Where the name stands: from the first of the band's columns at or
      past the page's edge (left), with this much room (px) before the nav. */
  function placeName() {
    const [cw] = grid.cell;
    const [gx] = grid.origin;
    const left = gx + Math.ceil((edge() - gx) / cw) * cw;
    const nav = document.querySelector(".nav")?.getBoundingClientRect();
    return { left, room: Math.min(innerWidth - edge(), nav?.width ? nav.left - 3 * cw : Infinity) - left };
  }

  /** Each cell's turn when the name develops: from the left, a little
      uneven. */
  const turns = (cols, rows) => Float32Array.from({ length: cols * rows }, (_, i) => clamp(((i % cols) / cols) * 0.85 + hash(i) * 0.15, 0, 1));

  /** Letters the name in FACE: its letters side by side, a blank column
      either side, every cell of a stroke struck with the face's mark. */
  function faceName() {
    const { left, room } = placeName();
    const letters = [...name.text];
    const lines = FACE.glyphs.A.map((_, r) => ` ${letters.map((letter) => FACE.glyphs[letter][r]).join(" ".repeat(FACE.gap))} `);
    const cols = lines[0].length, rows = lines.length;
    setVar("--name-x", `${left}px`);
    name.art.style.setProperty("--name-scale", Math.min(FACE.size, room / (cols * TYPE.size * NAME.column)).toFixed(4));
    if (lettered === "face" && name.final) return;
    lettered = "face";
    const mark = RAMP.indexOf(FACE.mark);
    Object.assign(name, { final: Int8Array.from(lines.join(""), (cell) => (cell === "#" ? mark : -1)), cols, rows, late: turns(cols, rows) });
    if (!name.developing) show(1);
  }

  /** How the drawn name is set: as many rows tall as the masthead's height
      allows, or fewer where that fits it into the room left of the nav.
      Where even the fewest don't fit (phones), it keeps the rows (its
      letters keep their shape) and is set smaller (scale). */
  function fitName() {
    const [, ch] = grid.cell;
    const { left, room } = placeName();
    const line = document.querySelector(".band")?.getBoundingClientRect().top || innerHeight * 0.15;
    const most = clamp(Math.floor((line * 0.6) / ch), NAME.minRows, NAME.rows);
    const width = (rows) => { const m = measureName(rows); return m.cols * m.cell[0]; };
    let rows = most;
    while (rows > NAME.minRows && width(rows) > room) rows--;
    if (width(rows) > room) rows = most;
    return { left, rows, scale: Math.min(1, room / width(rows)) };
  }

  /** Draws the name's capitals (Lekton, semibold) over a grid of cells,
      each letter from the left edge of a column, and strikes each cell with
      the character that matches how much of it they cover (firmly, and no
      darker than RAMP's `top`). Lettered again only when what it is drawn
      from changes (its rows, its cell, or the face, once loaded); where it
      stands and its scale are kept up every time. */
  let lettered = "";  // what the lettering was drawn from
  let board = null;   // (kept for the next lettering)
  function drawName() {
    if ([...name.text].every((letter) => FACE.glyphs[letter])) return faceName();
    const { left: nameX, rows, scale: fit } = fitName();
    const { cell: [cw, ch], font, starts, cols } = measureName(rows);
    setVar("--name-x", `${nameX}px`);
    name.art.style.setProperty("--name-scale", Math.min(NAME.size, fit).toFixed(4));
    const from = `${rows}|${cw}|${ch}|${document.fonts?.check(`${NAME.weight} 40px "Lekton"`) ? "face" : "fallback"}`;
    if (from === lettered && name.final) return;
    lettered = from;
    board ||= document.createElement("canvas");
    board.width = Math.ceil(cols * cw * FINE); // (resizing clears it)
    board.height = Math.ceil(rows * ch * FINE);
    const ctx = board.getContext("2d", { willReadFrequently: true });
    ctx.font = `${NAME.weight} ${font * FINE}px "Lekton", "Courier New", monospace`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = ctx.strokeStyle = "#fff";
    ctx.lineWidth = NAME.stroke * font * FINE;
    ctx.lineJoin = "round";
    [...name.text].forEach((letter, i) => {
      ctx.fillText(letter, starts[i] * cw * FINE, board.height);
      ctx.strokeText(letter, starts[i] * cw * FINE, board.height);
    });
    const data = ctx.getImageData(0, 0, board.width, board.height).data;
    // Each cell's ink, summed in one pass over the board: the cell every
    // column and row of it falls in (between the cells' rounded edges, as
    // they always were), then each pixel's alpha added to its cell's.
    const width = board.width;
    const colOf = new Int16Array(width).fill(-1), rowOf = new Int16Array(board.height).fill(-1);
    const spanX = new Int32Array(cols), spanY = new Int32Array(rows);
    for (let c = 0; c < cols; c++) {
      const x1 = Math.round(c * cw * FINE), x2 = Math.round((c + 1) * cw * FINE);
      colOf.fill(c, x1, Math.min(x2, width));
      spanX[c] = x2 - x1;
    }
    for (let r = 0; r < rows; r++) {
      const y1 = Math.round(r * ch * FINE), y2 = Math.round((r + 1) * ch * FINE);
      rowOf.fill(r, y1, Math.min(y2, board.height));
      spanY[r] = y2 - y1;
    }
    const sums = new Int32Array(cols * rows);
    for (let y = 0; y < board.height; y++) {
      const r = rowOf[y];
      if (r < 0) continue;
      const base = r * cols;
      for (let x = 0, at = y * width * 4 + 3; x < width; x++, at += 4) {
        const c = colOf[x];
        if (c >= 0) sums[base + c] += data[at];
      }
    }
    const final = new Int8Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        final[i] = Math.min(NAME.top, strike(firm(sums[i] / (spanY[r] * spanX[c] * 255))));
      }
    }
    Object.assign(name, { final, cols, rows, late: turns(cols, rows) });
    if (!name.developing) show(1);
  }

  /** Sets the name as it stands `progress` (0–1) of the way through
      developing, each cell stepping up through the lighter characters to
      its own; with `ring` ({ col, row, reach, depth }: a ring `reach`
      columns out from that cell), the letters' cells in it step back down
      up to `depth` characters (never to blank). */
  function show(progress, ring = null) {
    const { final, late, cols, rows } = name;
    let out = "";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        let f = final[i];
        if (progress < 1) {
          const local = clamp((progress - late[i] * 0.6) / 0.4, 0, 1);
          if (local < 1) f = Math.round(local * (f + 1)) - 1;
        }
        if (ring && f >= 0) {
          const off = (Math.hypot(c - ring.col, (r - ring.row) * RIPPLE.tall) - ring.reach) / RIPPLE.width;
          f = Math.max(0, f - Math.round(ring.depth * Math.exp(-off * off)));
        }
        out += f < 0 ? " " : RAMP[f];
      }
      if (r < rows - 1) out += "\n";
    }
    name.art.textContent = out;
  }

  function animate(ms, delay, frame) {
    cancelAnimationFrame(name.run);
    const start = performance.now() + delay;
    const tick = () => {
      const p = clamp((performance.now() - start) / ms, 0, 1);
      frame(p);
      if (p < 1) name.run = requestAnimationFrame(tick);
    };
    tick();
  }

  function develop({ delay = 0, ms = 900 } = {}) {
    if (!name?.final || still) return 0;
    name.developing = true;
    animate(ms, delay, (p) => {
      show(p);
      if (p >= 1) name.developing = false;
    });
    return delay + ms;
  }

  /** A ripple spreads through the name from where the pointer came onto
      it (`at`: an event's place), out to both its ends, dying away as it
      goes. */
  function ripple(at) {
    if (!name?.final || name.developing) return;
    const box = name.art.getBoundingClientRect();
    if (!box.width) return;
    const col = clamp(((at.clientX - box.left) / box.width) * name.cols, 0, name.cols);
    const row = clamp(((at.clientY - box.top) / box.height) * name.rows, 0, name.rows);
    const far = Math.max(col, name.cols - col) + 2 * RIPPLE.width; // as far as the ring has to go
    animate(far * RIPPLE.pace, 0, (p) => (p < 1
      ? show(1, { col, row, reach: p * far, depth: RIPPLE.depth * (1 - p * p) })
      : show(1)));
  }

  update();
  addEventListener("resize", later);
  // Once the face itself has loaded, the name is drawn from it again.
  document.fonts?.load(`${NAME.weight} 40px "Lekton"`).then(update, () => {});

  return {
    setGrid(layout) {
      laidOut = layout;
      later();
    },
    develop,
    column(x) {
      const [cw] = grid.cell;
      const [gx] = grid.origin;
      return gx + Math.floor((x - gx) / cw) * cw;
    },
  };
}
