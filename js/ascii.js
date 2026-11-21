/* ==========================================================================
   Screen — the band's picture, typed. Whatever background is showing is
   drawn here in characters: a grid of cells in the page's typewriter face,
   each struck with the character whose ink matches the light at that spot
   (a point where the picture is faint, a heavy figure where it is bright),
   and struck harder the brighter it is.

   The backgrounds themselves (js/field.js, js/slats.js, js/topography.js)
   draw small pictures on canvases that are never shown; this reads each
   one the moment it has been drawn, a few texels to a character. A change
   of background is made here as well: while two are in view each cell
   takes the mix of their light, so the characters step from one picture
   to the next in place, and no two pictures ever lie over one another.

   One loop draws everything: the backgrounds take their frames from this
   screen (see `source`), and it types what they drew in that same frame.

   A picture has no edge here. Where its light sinks below the lightest
   character's, its points go on, fewer and fainter, until none is left
   (see THIN), so that it thins out into the paper. And where the page's
   own words lie over the band, the cells under and about them make way
   (see setWay; js/clearing.js says which), by degrees, so the picture
   parts around the words.
   ========================================================================== */

import { INK, EASE } from "./field.js";

/* The characters, any order: they are sorted by the ink each lays down
   (measured as drawn), and each takes over at the light that matches its
   ink. Points, strokes, marks and figures, never a word: a picture.
   Chosen so that their inks are about evenly spaced in Lekton (from a
   point at 0.11 of the heaviest's ink to 1), no two alike. */
export const RAMP = ".-:+*<xo#0%@";
const STEPS = 16; // the most characters the shader ranks

/* The type: its size (CSS px), and the cell it is struck into, in ems.
   Lekton advances half an em; the cell is wider than that and no taller
   than the type, so the grid is open across and close down, and samples
   the picture about evenly both ways. */
const TYPE = { size: 9, column: 0.78, row: 1 };
const FAMILY = '"Lekton", "Courier New", ui-monospace, monospace';

/* How the characters are struck, by theme. Light type on dark paper reads
   heavier than it is, and dark type on light paper lighter: the thin,
   soft-edged characters that glow on the dark page come out pale and
   blurred on the light one. So on the light page their edges are firmed
   (the soft edge of a stroke, from the first to the second of `firm`, as
   shares of full ink, is drawn out to nothing and all: a solid core with
   a narrow rim, and a stroke thinner than a pixel still struck whole),
   and the faint ones are struck harder (`faintest`: how hard the faintest
   character is struck; 1: all alike). The firming is gentler where a
   pixel is a whole CSS px or near it (`coarse`: under 1.5 to a CSS px),
   or the dense characters would close up. `boldBelow`: the pixel ratio
   under which they are set bold. On the dark page that keeps thin strokes
   on coarse screens; firmed, the regular cut keeps them by itself. */
const STRIKE = {
  dark: { boldBelow: 1.5, firm: null, faintest: 0.5 },
  light: { boldBelow: 0, firm: { fine: [0.05, 0.5], coarse: [0.1, 0.62] }, faintest: 0.82 },
};

/** How RAMP's characters are drawn for a theme at a pixel ratio: their
    weight, and the firming of their edges, if any (see STRIKE). */
export function strikeFor(theme, dpr) {
  const { boldBelow, firm } = STRIKE[theme] || STRIKE.dark;
  return { weight: dpr < boldBelow ? 700 : 400, firm: firm && (dpr < 1.5 ? firm.coarse : firm.fine) };
}

/** One of RAMP's characters struck in a palette's ink ({ ink, paper,
    theme }) on a cell of its paper, aw × ah device px, the way the screen
    strikes it for that theme (centered; its weight and firming from
    strikeFor): a small canvas. The waves that cross the page are made of
    these (js/wave.js). (The character is struck alone and then
    laid on the paper, as a cell is drawn: the same pixels.) */
export function strikeTile(character, aw, ah, dpr, { ink, paper, theme }) {
  const { weight, firm } = strikeFor(theme, dpr);
  const em = TYPE.size * dpr;
  const glyph = document.createElement("canvas");
  glyph.width = aw;
  glyph.height = ah;
  const g = glyph.getContext("2d", { willReadFrequently: !!firm });
  g.font = `${weight} ${em}px ${FAMILY}`;
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.fillStyle = ink;
  g.fillText(character, aw / 2, Math.round(ah / 2 + em * 0.3));
  if (firm) firmUp(g, 0, 0, aw, ah, firm);
  const tile = document.createElement("canvas");
  tile.width = aw;
  tile.height = ah;
  const t = tile.getContext("2d");
  t.fillStyle = paper;
  t.fillRect(0, 0, aw, ah);
  t.drawImage(glyph, 0, 0);
  return tile;
}

/** Firms the ink in a rectangle of a 2D canvas: alpha between `from` and
    `to` is drawn out to 0–1, on a smooth step. */
export function firmUp(ctx, x, y, w, h, [from, to]) {
  const image = ctx.getImageData(x, y, w, h);
  const { data } = image;
  for (let i = 3; i < data.length; i += 4) {
    const t = Math.min(Math.max((data[i] / 255 - from) / (to - from), 0), 1);
    data[i] = Math.round(255 * t * t * (3 - 2 * t));
  }
  ctx.putImageData(image, x, y);
}

/* How fast the view's contrast follows it (1/s), as the backgrounds'
   opacity does, and in two stages as it does (RATE and EASE in
   js/field.js). */
const CONTRAST_RATE = 3.2;

/* Thinning out. Light below the lightest character's (its step) still
   strikes that character, a point, in a share of the cells: all of them at
   `to` of that step, none at `from` of it, between them the cells whose
   turn has come (each has its own, spread evenly over the screen: see
   evenTurns). A cell's point comes in over `soft` of the way, struck
   fainter until then, so that points neither pop in nor out. */
const THIN = { from: 0.3, to: 1, soft: 0.3 };

/* Settling. The picture settles against the two rulers: toward either,
   what is brighter than a point is struck lighter, so that nothing heavy
   stands against them, while its points run on to the ruler (the
   backgrounds leave this to the screen while they are typed: dimmed whole,
   a picture's quiet end falls below the lightest character and is cut off
   in a straight line). `bottom` and `top`: how far in the settling
   reaches, as a share of the rows, and how much of its weight a cell keeps
   at the ruler itself; `floor`: the light it leaves alone (a point's). */
const SETTLE = { bottom: [0.26, 0.3], top: [0.12, 0.5], floor: 0.085 };

/* Making way (see setWay): how fast a cell gives way to words set over it
   (1/s), and how fast the picture comes back once they have gone. */
const WAY_RATE = { open: 16, close: 4.5 };

/* The pictures: texels per CSS px (three or four to a character each way,
   which this averages), and the most that can show at once. */
export const RATIO = 0.5;
const PICTURES = 3;

const VERTEX = `
attribute vec2 corner;
void main() { gl_Position = vec4(corner, 0.0, 1.0); }
`;

const HEAD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uGrid;    // columns, rows
uniform vec2 uCell;    // a cell, canvas px
uniform vec2 uOrigin;  // the grid's bottom-left corner, canvas px

// A cell's light, kept to 1/65025 in two bytes of a texel (one byte is too
// coarse for it to follow its light smoothly: see uFollow).
vec4 pack(float v) {
  float s = clamp(v, 0.0, 1.0) * 255.0;
  return vec4(floor(s) / 255.0, fract(s), 0.0, 1.0);
}
float unpack(vec4 t) { return t.r + t.g / 255.0; }
`;

/* A change turns each cell over in its own time, within this share of the
   change, so that the new picture comes through in drifts (see `order`). */
const TURN = 0.4;

/* How long a cell's light takes to follow the pictures (s, the time
   constant): a change of character eases in over a few frames, and light
   that hovers at a character's edge doesn't flicker across it. */
const FOLLOW = 0.06;

/* Pass 1, one fragment per cell: the light there, from the pictures in
   view. A picture's light is its alpha (they are ink on nothing), read at
   nine filtered taps across the cell: their mean, or toward their
   brightest (`peak`) for a picture of thin lines, which a cell should
   catch wherever one crosses it.

   While two pictures are in view the cell takes the mix of their light,
   the share of each set by how far the change has come in that cell: a
   cell turns over between its place in the order × (1 − TURN) and that
   plus TURN of the way through, so each passes through the characters
   between the old and the new. The shares come from running totals of how
   strongly each picture shows, in the switch's own order, which keeps them
   adding up to the whole and moving smoothly however a change is
   overtaken. A picture re-typed (retype) turns over the same way, from the
   light as it was. Last, the cell's light follows all that from where it
   was a frame ago (uFollow). */
const LIGHT = `${HEAD}
uniform vec2 uCanvas;         // canvas size, px
uniform sampler2D uPicture0;
uniform sampler2D uPicture1;
uniform sampler2D uPicture2;
uniform vec3 uShown;          // how strongly each shows (shares of 1), in the switch's order
uniform vec4 uTone0;          // each picture's tone: gain, curve, peak, spread (see source)
uniform vec4 uTone1;
uniform vec4 uTone2;
uniform sampler2D uOrder;     // when each cell turns over in a change (0 first, 1 last)
uniform sampler2D uBefore;    // the light as it was when the picture was re-typed
uniform float uRetype;        // how far that has come (1: done)
uniform sampler2D uPrevious;  // the light a frame ago
uniform float uFollow;        // how far the light follows the pictures this frame (1: at once)

float light(sampler2D picture, vec2 at, vec2 apart, vec4 tone) {
  float sum = 0.0;
  float most = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      float a = texture2D(picture, at + vec2(float(x), float(y)) * apart * tone.w).a;
      sum += a;
      most = max(most, a);
    }
  }
  return pow(clamp(mix(sum / 9.0, most, tone.z) * tone.x, 0.0, 1.0), tone.y);
}

// How much of a change has reached a cell this late in the order.
float reached(float progress, float late) {
  return smoothstep(0.0, 1.0, clamp((progress - late * ${(1 - TURN).toFixed(3)}) / ${TURN.toFixed(3)}, 0.0, 1.0));
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 here = (cell + 0.5) / uGrid;
  vec2 at = (uOrigin + (cell + 0.5) * uCell) / uCanvas;
  vec2 apart = uCell / (3.0 * uCanvas);
  float late = texture2D(uOrder, here).r;
  float c1 = reached(uShown.x, late);
  float c2 = reached(uShown.x + uShown.y, late);
  float c3 = reached(uShown.x + uShown.y + uShown.z, late);
  float sum = 0.0;
  if (uShown.x > 0.0) sum += c1 * light(uPicture0, at, apart, uTone0);
  if (uShown.y > 0.0) sum += (c2 - c1) * light(uPicture1, at, apart, uTone1);
  if (uShown.z > 0.0) sum += (c3 - c2) * light(uPicture2, at, apart, uTone2);
  float target = clamp(sum, 0.0, 1.0);
  if (uRetype < 1.0) target = mix(unpack(texture2D(uBefore, here)), target, reached(uRetype, late));
  gl_FragColor = pack(mix(unpack(texture2D(uPrevious, here)), target, uFollow));
}
`;

/* Pass 2, over the canvas: each pixel finds its cell, the cell its
   character, and the character's own pixel is struck in the theme's ink.
   The view sets how hard the whole screen is struck (its opacity), and
   its contrast: above 1 the light spreads from PIVOT (brighter above it,
   darker below), so that the picture stands out where nothing lies over
   it; below 1 it gathers toward PIVOT, an even, quiet texture under words. */
const PIVOT = 0.12;
const TYPED = `${HEAD}
uniform sampler2D uLight;        // one texel per cell
uniform sampler2D uType;         // the characters side by side, lightest first
uniform float uCount;            // how many
uniform float uSteps[${STEPS}];  // the light at which each takes over
uniform vec3 uInk;
uniform float uFaintest;
uniform float uOpacity;          // the view's: how hard the whole screen is struck
uniform float uContrast;         // the view's: how far the light spreads about PIVOT
uniform sampler2D uOrder;        // g: each cell's turn as the points thin out (see THIN)
uniform sampler2D uWay;          // r: how far each cell has made way for the page's words
uniform vec3 uThin;              // THIN: from, to, soft
uniform vec4 uSettle;            // SETTLE: rows it reaches from the bottom and the top, the weight kept at each

void main() {
  vec2 at = gl_FragCoord.xy - uOrigin;
  vec2 cell = floor(at / uCell);
  vec2 within = at - cell * uCell;
  vec2 here = (cell + 0.5) / uGrid;
  float light = unpack(texture2D(uLight, here));
  light = clamp(${PIVOT.toFixed(3)} + (light - ${PIVOT.toFixed(3)}) * uContrast, 0.0, 1.0);
  float kept = mix(uSettle.z, 1.0, smoothstep(0.0, uSettle.x, cell.y + 0.5))
    * mix(uSettle.w, 1.0, smoothstep(0.0, uSettle.y, uGrid.y - cell.y - 0.5));
  light = min(light, ${SETTLE.floor.toFixed(3)}) + max(light - ${SETTLE.floor.toFixed(3)}, 0.0) * kept;
  light *= 1.0 - texture2D(uWay, here).r;
  float index = -1.0;
  for (int i = 0; i < ${STEPS}; i++) index += step(uSteps[i], light);
  float struck = mix(uFaintest, 1.0, light);
  if (index < 0.0) {
    // Too faint for a character: a point still, in the cells whose turn
    // has come, fainter the nearer its turn is to being the last.
    float share = smoothstep(uSteps[0] * uThin.x, uSteps[0] * uThin.y, light);
    float there = clamp((share - texture2D(uOrder, here).g * (1.0 - uThin.z)) / uThin.z, 0.0, 1.0);
    index = there > 0.0 ? 0.0 : -1.0;
    struck *= there;
  }
  float ink = 0.0;
  if (index >= 0.0) {
    ink = texture2D(uType, vec2((index * uCell.x + within.x) / (uCount * uCell.x), within.y / uCell.y)).a;
  }
  float strength = ink * struck * uOpacity;
  gl_FragColor = vec4(uInk * strength, strength);
}
`;

/* The order in which the cells turn over in a change (0 first, 1 last),
   a texel per cell as GL holds them (row 0 at the bottom): soft patches a
   dozen or so cells across with a ragged edge, drifting across the band
   (SWEEP: how much the drift leads the patches), ranked so that as many
   cells turn over in every moment of a change. A picture re-typed turns
   over from the left; a change to a background further along the switch
   comes in from the right, and back from the left. (The texel's second
   byte is the cell's turn as points thin out: see evenTurns.) */
const SWEEP = 0.5;

/* Every cell's turn (0–1) for a tile of TILE × TILE cells that repeats: an
   order in which any share of the cells, taken from the first, lies evenly
   over the tile, neither in clumps nor in rows (a blue-noise mask, made by
   void-and-cluster: the first tenth are spread out by trading each
   tightest cluster for the largest void; then the rest are ranked, taking
   cells out of the tightest clusters and putting them into the largest
   voids). Points that thin out by it do so like a mist, not like static. */
export const TILE = 32;
let turns = null;

export function evenTurns() {
  if (turns) return turns;
  const n = TILE, count = n * n;
  const near = new Float32Array(count); // how much a cell weighs on another, by their offset (wrapping)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = Math.min(x, n - x), dy = Math.min(y, n - y);
      near[y * n + x] = Math.exp(-(dx * dx + dy * dy) / 4.5);
    }
  }
  const on = new Uint8Array(count);
  const crowd = new Float32Array(count); // how crowded each cell is by the ones that are on
  const put = (i, sign) => {
    on[i] = sign > 0 ? 1 : 0;
    const px = i % n, py = (i - px) / n;
    for (let y = 0, at = 0; y < n; y++) {
      const row = ((y - py + n) % n) * n;
      for (let x = 0; x < n; x++, at++) crowd[at] += sign * near[row + ((x - px + n) % n)];
    }
  };
  const pick = (state, sign) => { // the tightest cluster (on, most crowded) or the largest void (off, least)
    let best = -1, value = -Infinity;
    for (let i = 0; i < count; i++) {
      if (on[i] === state && sign * crowd[i] > value) { value = sign * crowd[i]; best = i; }
    }
    return best;
  };
  let seed = 7;
  const first = Math.floor(count / 10);
  for (let k = 0; k < first;) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const i = Math.floor((seed / 4294967296) * count);
    if (!on[i]) { put(i, 1); k++; }
  }
  for (let guard = 0; guard < 4 * count; guard++) {
    const cluster = pick(1, 1);
    put(cluster, -1);
    const hole = pick(0, -1);
    put(hole, 1);
    if (hole === cluster) break;
  }
  const rank = new Float32Array(count);
  const start = on.slice(), startCrowd = crowd.slice();
  for (let k = first - 1; k >= 0; k--) {
    const cluster = pick(1, 1);
    put(cluster, -1);
    rank[cluster] = k;
  }
  on.set(start);
  crowd.set(startCrowd);
  for (let k = first; k < count; k++) {
    const hole = pick(0, -1);
    put(hole, 1);
    rank[hole] = k;
  }
  turns = rank.map((r) => (r + 0.5) / count);
  return turns;
}

function turnOrder(cols, rows) {
  const hash = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  const n = cols * rows;
  const value = new Float32Array(n);
  let lo = Infinity, hi = -Infinity;
  for (let y = 0, i = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++, i++) {
      const patches = 0.65 * noise(x / 13, y / 13) + 0.35 * noise(x / 4.5 + 17, y / 4.5 + 17);
      const v = SWEEP * (x / cols) + (1 - SWEEP) * patches + 0.05 * hash(x + 3.7, y + 3.7);
      value[i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  // Ranked through a histogram (sorting would take longer for nothing).
  const BINS = 4096;
  const bin = (v) => Math.min(BINS - 1, Math.floor(((v - lo) / (hi - lo || 1)) * BINS));
  const count = new Uint32Array(BINS);
  for (let i = 0; i < n; i++) count[bin(value[i])]++;
  const rank = new Float32Array(BINS);
  for (let b = 0, below = 0; b < BINS; b++) {
    rank[b] = (below + count[b] / 2) / n;
    below += count[b];
  }
  const even = evenTurns();
  const data = new Uint8Array(n * 4);
  for (let y = 0, i = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++, i++) {
      data[i * 4] = Math.round(rank[bin(value[i])] * 255);
      data[i * 4 + 1] = Math.round(even[(y % TILE) * TILE + (x % TILE)] * 255);
      data[i * 4 + 3] = 255;
    }
  }
  return data;
}

/** Starts the screen on `canvas`. `onRestore` runs when a lost WebGL
    context is back and the pictures have to be drawn again; `onError` if
    the screen can't draw (`working` is then false). Its frames run either
    way, so the backgrounds that take them keep drawing. With `still`
    (reduced motion) a cell takes its light at once. `onLayout(layout)`
    runs whenever the grid is laid out (see layout), for the page to set
    its frame on the same grid (js/frame.js). */
export function createScreen(canvas, { theme = "dark", still = false, onRestore = () => {}, onError = () => {}, onLayout = () => {} } = {}) {
  const gl = canvas.getContext("webgl", {
    alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
  });
  let parallel = null;       // KHR_parallel_shader_compile, where the browser has it (see init)
  const slots = [];          // the pictures (see source)
  const waiting = new Map(); // the frames asked for, by id
  let asked = 0;
  let raf = 0;
  let framing = false;       // inside this screen's frame, running the backgrounds'
  let gone = false;
  let broken = !gl;
  let lost = false;
  let stale = true;          // the screen is out of date apart from any picture
  let busyUntil = 0;         // a change runs until then: keep typing every frame
  const contrast = { now: 1, lead: 1, goal: 1, at: 0 }; // the view's (see TYPED), gliding to its goal after its lead
  let ink = INK[theme] || INK.dark;
  let look = STRIKE[theme] ? theme : "dark"; // the theme the characters are struck for (see STRIKE)
  let size = { w: 1, h: 1, dpr: 1 }; // the canvas, px
  let cell = [1, 1];         // a cell, px
  let grid = { cols: 1, rows: 1, x: 0, y: 0 };
  let type = null;           // { texture, count, steps, key }: the characters
  let typeface = "";         // what they were drawn in
  let programs = null;
  let cells = null;          // per cell, a texel each: { now, then, before, order, cols, rows } (see setCells)
  let history = false;       // `now` holds light typed before (otherwise a cell takes its light at once)
  let lastTyped = 0;         // when it was typed (frame time)
  let settleUntil = 0;       // after a change the cells go on following their light until then
  let retyping = null;       // { start, duration }: a picture re-typed (see retype)
  let way = null;            // the cells making way for words: { goal, now, data, live, count, moving, at } (see setWay)
  let blank = null;
  let corners = null;
  let arrive;
  const ready = new Promise((resolve) => (arrive = resolve));

  /* --- Frames: one requestAnimationFrame for the screen and everything
     it shows. Callbacks asked for during a frame run in the next, as with
     the browser's own. */
  function arm() {
    if (raf || gone) return;
    const now = performance.now();
    const typing = !broken && !lost && (stale || now < busyUntil || now < settleUntil || !!retyping || contrast.now !== contrast.goal || !!way?.moving);
    if (waiting.size || typing) raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = 0;
    if (gone) return;
    const due = [...waiting.values()];
    waiting.clear();
    framing = true;
    for (const callback of due) {
      try { callback(now); }
      catch (error) { queueMicrotask(() => { throw error; }); } // reported, and the rest still run
    }
    framing = false;
    if (!broken && !lost) {
      try { compose(now); } catch (error) { failed(error); }
    }
    arm();
  }

  function failed(error) {
    if (broken) return;
    broken = true;
    arrive();
    onError(error);
  }

  /* --- The grid and the characters. */

  /** Sizes the canvas and lays the grid over it, with a row and a column
      through the middle (the intro's line falls along one row) and the
      cells cut off at the edges cut evenly. The characters are redrawn when
      their size in px has changed. */
  function measure() {
    if (gone) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = { w: Math.max(1, Math.round((canvas.clientWidth || 1) * dpr)), h: Math.max(1, Math.round((canvas.clientHeight || 1) * dpr)), dpr };
    if (canvas.width !== size.w) canvas.width = size.w;
    if (canvas.height !== size.h) canvas.height = size.h;
    const em = TYPE.size * dpr;
    cell = [Math.max(2, Math.round(em * TYPE.column)), Math.max(2, Math.round(em * TYPE.row))];
    const cols = 2 * Math.ceil((size.w / cell[0] - 1) / 2) + 1;
    const rows = 2 * Math.ceil((size.h / cell[1] - 1) / 2) + 1;
    grid = { cols, rows, x: Math.round((size.w - cols * cell[0]) / 2), y: Math.round((size.h - rows * cell[1]) / 2) };
    stale = true;
    if (!broken && !lost) {
      setType(em, dpr);
      if (!cells || cells.cols !== cols || cells.rows !== rows) setCells(cols, rows);
    }
    arm();
    if (!broken) onLayout(layoutOf());
  }

  /** The grid in CSS px (see layout below). */
  function layoutOf() {
    return {
      cell: [cell[0] / size.dpr, cell[1] / size.dpr],
      origin: [grid.x / size.dpr, (size.h - grid.y - grid.rows * cell[1]) / size.dpr],
      cols: grid.cols,
      rows: grid.rows,
    };
  }

  /** Draws the characters into a strip, lightest first, and ranks them:
      each takes over at the light halfway between its ink and the ink of
      the one before it. They are struck as the theme asks (strikeFor):
      on the dark page bold where a pixel is a whole CSS px, to keep thin
      strokes; on the light page firmed. */
  function setType(em, dpr) {
    const { weight, firm } = strikeFor(look, dpr);
    const key = `${weight} ${firm} ${em}px ${cell} ${typeface}`;
    if (type?.key === key) return;
    const [w, h] = cell;
    const board = document.createElement("canvas");
    board.width = w * RAMP.length;
    board.height = h;
    const ctx = board.getContext("2d", { willReadFrequently: true });
    ctx.font = `${weight} ${em}px ${FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#fff";
    const baseline = Math.round(h / 2 + em * 0.3); // capitals and figures sit in the middle of the cell
    const strike = (character, column) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(column * w, 0, w, h);
      ctx.clip();
      ctx.fillText(character, column * w + w / 2, baseline);
      ctx.restore();
      if (firm) firmUp(ctx, column * w, 0, w, h, firm);
    };
    const inked = [...RAMP].map((character) => {
      ctx.clearRect(0, 0, w, h);
      strike(character, 0);
      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      for (let i = 3; i < data.length; i += 4) sum += data[i];
      return { character, ink: sum };
    }).sort((a, b) => a.ink - b.ink).slice(0, STEPS);
    ctx.clearRect(0, 0, board.width, h);
    inked.forEach(({ character }, column) => strike(character, column));
    const most = inked.at(-1).ink || 1;
    const steps = new Float32Array(STEPS).fill(2); // (beyond the last character: never reached)
    inked.forEach(({ ink: own }, i) => { steps[i] = (i ? (inked[i - 1].ink + own) / 2 : own / 2) / most; });

    if (type) gl.deleteTexture(type.texture);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, board);
    plain(gl.NEAREST);
    type = { texture, count: inked.length, steps, key, ramp: inked.map(({ character }) => character).join("") };
    stale = true;
  }

  /** The cells' light, packed (see HEAD): `now` the light last typed and
      `then` the frame before's, which swap each frame (the light pass
      writes one from the other); `before`, the light when the picture was
      last re-typed; `order`, when each cell turns over in a change (and
      its turn as points thin out); `way`, how far each has made way for
      the page's words (kept up by part). */
  function setCells(cols, rows) {
    disposeCells();
    const texture = (data = null) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      plain(gl.NEAREST);
      return t;
    };
    const target = () => {
      const t = texture();
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { texture: t, framebuffer };
    };
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); // (the order is laid out as GL holds it)
    const order = texture(turnOrder(cols, rows));
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    cells = { now: target(), then: target(), before: texture(), order, way: texture(new Uint8Array(cols * rows * 4)), cols, rows };
    history = false;
    retyping = null;
    // What made way on the old grid means nothing on this one (the page
    // says afresh: setWay); on the same grid, built again, it stands.
    const kept = way?.goal.length === cols * rows ? way.goal : new Uint8Array(cols * rows);
    way = {
      goal: kept, now: new Float32Array(cols * rows), data: new Uint8Array(cols * rows * 4).fill(255),
      live: new Int32Array(cols * rows), count: 0, moving: false, at: 0,
    };
    part(0, true);
  }

  /** Moves the cells that make way toward where the page wants them, each
      at its own pace (giving way fast, coming back slowly: WAY_RATE), and
      hands the result to the GPU; `jump` takes them there at once. Only
      the cells still on their way are gone over (`live`, listed by setWay).
      Returns whether any moved. */
  function part(now, jump = false) {
    if (!way || !cells || (!way.moving && !jump)) return false;
    const dt = way.at ? Math.min(Math.max((now - way.at) / 1000, 0), 0.1) : 1 / 60;
    way.at = now;
    const open = 1 - Math.exp(-WAY_RATE.open * dt), close = 1 - Math.exp(-WAY_RATE.close * dt);
    const { goal, now: held, data, live } = way;
    let left = 0;
    if (jump) {
      for (let i = 0; i < held.length; i++) {
        held[i] = goal[i] / 255;
        data[i * 4] = goal[i];
      }
    } else {
      for (let k = 0; k < way.count; k++) {
        const i = live[k];
        const to = goal[i] / 255;
        const gap = to - held[i];
        if (Math.abs(gap) < 0.004) held[i] = to;
        else {
          held[i] += gap * (gap > 0 ? open : close);
          live[left++] = i;
        }
        data[i * 4] = Math.round(held[i] * 255);
      }
    }
    way.count = left;
    way.moving = left > 0;
    if (!way.moving) way.at = 0;
    gl.bindTexture(gl.TEXTURE_2D, cells.way);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cells.cols, cells.rows, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return true;
  }

  function disposeCells() {
    if (!cells) return;
    for (const { texture, framebuffer } of [cells.now, cells.then]) {
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(framebuffer);
    }
    gl.deleteTexture(cells.before);
    gl.deleteTexture(cells.order);
    gl.deleteTexture(cells.way);
    cells = null;
  }

  /** The bound texture, as any size may be in WebGL 1: no mipmaps, clamped. */
  function plain(filter) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /* --- GL resources, rebuilt if the context is lost and restored. */

  function init() {
    // (An extension is the context's: a context given back has to be asked again.)
    parallel = gl.getExtension("KHR_parallel_shader_compile");
    programs = { light: build(LIGHT), typed: build(TYPED), linked: false };
    corners = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, corners);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);
    // Pictures and characters arrive the way GL holds them: bottom row
    // first, color already scaled by alpha.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    blank = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, blank);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    plain(gl.NEAREST);
    type = cells = null;
    for (const slot of slots) {
      slot.texture = null;
      slot.w = slot.h = 0;
    }
  }

  /** Starts compiling and linking a program (off the main thread where the
      browser can: KHR_parallel_shader_compile). */
  function build(fragment) {
    const program = gl.createProgram();
    const shaders = [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, fragment]].map(([kind, source]) => {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
      return shader;
    });
    gl.bindAttribLocation(program, 0, "corner");
    gl.linkProgram(program);
    return { program, shaders, uniforms: null };
  }

  /** True once both programs have linked (throws with the compiler's log
      if one can't); their uniform locations are then looked up. */
  function linked() {
    if (programs.linked) return true;
    const both = [programs.light, programs.typed];
    if (parallel && !both.every(({ program }) => gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR))) return false;
    for (const built of both) {
      if (!gl.getProgramParameter(built.program, gl.LINK_STATUS)) {
        throw new Error(built.shaders.map((s) => gl.getShaderInfoLog(s)).join("\n") + gl.getProgramInfoLog(built.program));
      }
      built.uniforms = {};
      for (let i = gl.getProgramParameter(built.program, gl.ACTIVE_UNIFORMS) - 1; i >= 0; i--) {
        const { name } = gl.getActiveUniform(built.program, i);
        built.uniforms[name.replace(/\[0\]$/, "")] = gl.getUniformLocation(built.program, name);
      }
    }
    return (programs.linked = true);
  }

  function use(built) {
    gl.useProgram(built.program);
    return built.uniforms;
  }

  /* --- Drawing. */

  /** Takes a picture in, the moment its background has drawn it (the
      canvas holds it only until the frame is shown), with the opacity the
      view asks of it. */
  function upload(slot, opacity) {
    if (broken || lost || gone) return;
    slot.opacity = Math.min(Math.max(Number(opacity) || 0, 0), 1);
    const picture = slot.canvas;
    if (!picture?.width || !picture.height) return;
    if (!slot.texture) {
      slot.texture = gl.createTexture();
      slot.w = slot.h = 0;
    }
    gl.bindTexture(gl.TEXTURE_2D, slot.texture);
    if (slot.w !== picture.width || slot.h !== picture.height) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture);
      plain(gl.LINEAR);
      slot.w = picture.width;
      slot.h = picture.height;
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, picture);
    }
    slot.fresh = true;
    if (!framing) {
      stale = true;
      arm();
    }
  }

  /** Types the screen if anything in view has changed: a picture, how
      strongly one shows, or the screen itself. */
  function compose(now) {
    if (!type || !cells) return;
    if (!linked()) {
      stale = true; // look again next frame
      return;
    }
    // (Deadlines on performance.now(), as they are set outside frames;
    // a frame's own time only measures how long since the last.)
    const clock = performance.now();
    const retyped = retyping ? Math.min(Math.max((clock - retyping.start) / retyping.duration, 0), 1) : 1;
    let changed = stale || glide(now) || !!retyping;
    if (part(now)) changed = true;
    if (retyped >= 1) retyping = null;
    const shown = slots.map((slot) => {
      const strength = slot.texture ? Math.min(Math.max(Number(slot.shown()) || 0, 0), 1) : 0;
      if (strength !== slot.last || (slot.fresh && strength > 0)) changed = true;
      slot.fresh = false;
      return strength;
    });
    // After a change the cells go on following their light a moment longer.
    if (changed) settleUntil = clock + 5000 * FOLLOW;
    else if (clock >= settleUntil) return;
    stale = false;
    slots.forEach((slot, i) => (slot.last = shown[i]));
    // How far each cell's light follows the pictures this frame: at once
    // with no light typed before it, or after a pause.
    const since = Math.min(Math.max(now - lastTyped, 0), 100);
    const follow = history && lastTyped && !still ? 1 - Math.exp(-since / (1000 * FOLLOW)) : 1;
    lastTyped = now;
    draw(slots.map((slot, i) => ({ slot, shown: shown[i], opacity: slot.opacity }))
      .filter(({ shown: strength }) => strength > 0.0005)
      .sort((a, b) => a.slot.order - b.slot.order)
      .slice(0, PICTURES), follow, retyped);
    history = true;
    arrive();
  }

  /** Moves the contrast toward its goal (exponentially, as the
      backgrounds' framings move); returns whether it moved. */
  function glide(now) {
    const dt = contrast.at ? Math.min(Math.max((now - contrast.at) / 1000, 0), 0.1) : 0;
    contrast.at = now;
    if (contrast.now === contrast.goal) return false;
    const share = 1 - Math.exp(-CONTRAST_RATE * EASE * dt);
    contrast.lead += (contrast.goal - contrast.lead) * share;
    contrast.now += (contrast.lead - contrast.now) * share;
    if (Math.abs(contrast.goal - contrast.now) < 0.002 && Math.abs(contrast.goal - contrast.lead) < 0.002) contrast.now = contrast.lead = contrast.goal;
    return true;
  }

  function draw(showing, follow, retyped) {
    let u = use(programs.light);
    const shown = [0, 0, 0];
    // The views' opacity: of the pictures in view, as strongly as each shows.
    const weight = showing.reduce((sum, { shown: s }) => sum + s, 0);
    const opacity = weight ? showing.reduce((sum, { shown: s, opacity: o }) => sum + s * o, 0) / weight : 1;
    for (let i = 0; i < PICTURES; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, showing[i]?.slot.texture || blank);
      gl.uniform1i(u[`uPicture${i}`], i);
      const [gain = 1, curve = 1, peak = 0, spread = 1] = showing[i]?.slot.tone || [];
      gl.uniform4f(u[`uTone${i}`], gain, curve, peak, spread);
      // As shares of the whole: when a change is overtaken the fades can
      // add up to less than one for a moment, which would leave the cells
      // that turn over last empty (see LIGHT).
      shown[i] = weight ? (showing[i]?.shown || 0) / weight : 0;
    }
    gl.uniform3fv(u.uShown, shown);
    for (const [unit, name, texture] of [[3, "uOrder", cells.order], [4, "uBefore", cells.before], [5, "uPrevious", cells.now.texture]]) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(u[name], unit);
    }
    gl.uniform1f(u.uRetype, retyped);
    gl.uniform1f(u.uFollow, follow);
    gl.uniform2f(u.uGrid, grid.cols, grid.rows);
    gl.uniform2f(u.uCell, cell[0], cell[1]);
    gl.uniform2f(u.uOrigin, grid.x, grid.y);
    gl.uniform2f(u.uCanvas, size.w, size.h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, cells.then.framebuffer);
    gl.viewport(0, 0, grid.cols, grid.rows);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    [cells.now, cells.then] = [cells.then, cells.now];

    u = use(programs.typed);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cells.now.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, type.texture);
    gl.uniform1i(u.uLight, 0);
    gl.uniform1i(u.uType, 1);
    gl.uniform1f(u.uCount, type.count);
    gl.uniform1fv(u.uSteps, type.steps);
    gl.uniform3fv(u.uInk, ink);
    gl.uniform1f(u.uFaintest, STRIKE[look].faintest);
    gl.uniform1f(u.uOpacity, opacity);
    gl.uniform1f(u.uContrast, contrast.now);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, cells.order);
    gl.uniform1i(u.uOrder, 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, cells.way);
    gl.uniform1i(u.uWay, 3);
    gl.uniform3f(u.uThin, THIN.from, THIN.to, THIN.soft);
    gl.uniform4f(u.uSettle, SETTLE.bottom[0] * grid.rows, SETTLE.top[0] * grid.rows, SETTLE.bottom[1], SETTLE.top[1]);
    gl.uniform2f(u.uGrid, grid.cols, grid.rows);
    gl.uniform2f(u.uCell, cell[0], cell[1]);
    gl.uniform2f(u.uOrigin, grid.x, grid.y);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, size.w, size.h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function release() {
    if (!gl || gl.isContextLost()) return;
    for (const built of programs ? [programs.light, programs.typed] : []) {
      for (const shader of built.shaders) gl.deleteShader(shader);
      gl.deleteProgram(built.program);
    }
    for (const texture of [blank, type?.texture, ...slots.map((slot) => slot.texture)]) {
      if (texture) gl.deleteTexture(texture);
    }
    disposeCells();
    if (corners) gl.deleteBuffer(corners);
  }

  const listening = new AbortController();
  const observer = new ResizeObserver(() => {
    try { measure(); } catch (error) { failed(error); }
  });
  if (gl) {
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      lost = true;
    }, { signal: listening.signal });
    canvas.addEventListener("webglcontextrestored", () => {
      if (gone || broken) return;
      lost = false;
      try {
        init();
        measure();
        onRestore();
      } catch (error) { failed(error); }
    }, { signal: listening.signal });
    try {
      init();
      measure();
      observer.observe(canvas);
    } catch (error) { failed(error); }
    // The characters are drawn again once the page's own face has loaded
    // (until then, in whatever the browser has).
    Promise.all([400, 700].map((weight) => document.fonts.load(`${weight} ${TYPE.size}px ${FAMILY}`))).then(() => {
      typeface = "loaded";
      if (!broken && !lost) measure();
    }, () => {});
  } else {
    arrive();
  }

  return {
    canvas,
    ready,

    /** Whether the screen can type (it has WebGL, and nothing has failed). */
    get working() { return !broken && !gone; },

    /** The grid, for a background to fit its picture to: a cell's size and
        the first cell's top-left corner (≤ 0), in CSS px from the canvas's
        top-left, and how many cells there are each way (odd: one column
        and one row run through the middle). */
    get layout() { return layoutOf(); },

    /** A place on the screen for one background's picture. `shown()` tells
        how strongly it shows just now (0–1); `order` is its place in the
        switch, which sets the way a change between two runs (see LIGHT).
        Returns
          frames          what the background draws by, in place of the
                          browser's: request(callback) → id, cancel(id),
                          and drawn(opacity), which it calls as soon as it
                          has drawn a frame: its picture whole, to be
                          struck as faintly as the view's `opacity` asks
          attach(canvas, tone)  the canvas it draws on, once there is one,
                          and its tone, [gain, curve, peak, spread]: a
                          cell's light is (its alpha × gain) ^ curve, its
                          alpha being the picture's mean over the cell, or
                          with `peak` (0–1) toward the brightest spot in it;
                          `spread` (0–1, 1 if left out) is how far across
                          the cell it is read, 0 for its center alone (a
                          picture already made one light to a cell)
          release()       gives the place up */
    source(shown, order = 0) {
      const slot = { canvas: null, texture: null, w: 0, h: 0, fresh: false, last: 0, opacity: 1, tone: [1, 1, 0, 1], shown, order };
      slots.push(slot);
      return {
        frames: {
          request(callback) {
            const id = ++asked;
            waiting.set(id, callback);
            arm();
            return id;
          },
          cancel(id) { waiting.delete(id); },
          drawn(opacity = 1) { upload(slot, opacity); },
        },
        attach(picture, tone = [1, 1, 0, 1]) {
          slot.canvas = picture;
          slot.tone = tone;
        },
        release() {
          const at = slots.indexOf(slot);
          if (at < 0) return;
          slots.splice(at, 1);
          if (slot.texture && gl && !gl.isContextLost()) gl.deleteTexture(slot.texture);
          slot.texture = slot.canvas = null;
          stale = true;
          arm();
        },
      };
    },

    /** Types the screen again, and keeps typing every frame for `ms` (a
        change of background runs that long). */
    /** Turns the screen over, cell by cell in the order of a change, from
        what it shows now to whatever comes next, over `ms`: for a picture
        that changes at once (a background taking a project's signature,
        see set in js/background.js). */
    retype(ms) {
      if (broken || lost || gone || !cells || !history || !(ms > 0)) return;
      try {
        gl.bindFramebuffer(gl.FRAMEBUFFER, cells.now.framebuffer);
        gl.bindTexture(gl.TEXTURE_2D, cells.before);
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, cells.cols, cells.rows);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } catch (error) {
        return failed(error);
      }
      retyping = { start: performance.now(), duration: ms };
      stale = true;
      arm();
    },

    /** The view's contrast (1: as the pictures are; see TYPED): glides
        there, or with `settle` goes straight there. */
    setContrast(value, { settle = false } = {}) {
      if (!(value > 0)) return;
      if (value !== contrast.goal) contrast.at = 0; // (time from the next frame, not the last one typed)
      contrast.goal = value;
      if (settle) contrast.now = contrast.lead = value;
      stale = true;
      arm();
    },

    /** Has the cells make way for the page's words: `goal` is how far
        each should (0–255), a byte per cell, the top row first (or null:
        none). They get there by degrees (see WAY_RATE), or at once with
        `settle`. A goal for another grid than the one laid out is left
        (the page says again once it has the new layout). */
    setWay(goal, { settle = false } = {}) {
      if (broken || lost || gone || !way) return;
      if (goal && goal.length !== way.goal.length) return;
      if (goal) way.goal.set(goal);
      else way.goal.fill(0);
      if (settle || still) {
        try { part(0, true); } catch (error) { return failed(error); }
      } else {
        // The cells that have somewhere to go.
        let count = 0;
        for (let i = 0; i < way.now.length; i++) {
          if (way.goal[i] / 255 !== way.now[i]) way.live[count++] = i;
        }
        way.count = count;
        way.moving = count > 0;
      }
      stale = true;
      arm();
    },

    refresh(ms = 0) {
      busyUntil = Math.max(busyUntil, performance.now() + ms);
      stale = true;
      arm();
    },

    /** The theme's ink, and its way of striking the characters (see
        STRIKE). The screen is typed again at once, in this task, so that
        it changes on the frame the page's colors do. */
    setTheme(name) {
      ink = INK[name] || INK.dark;
      look = STRIKE[name] ? name : "dark";
      stale = true;
      if (!broken && !lost && type) {
        try {
          setType(TYPE.size * size.dpr, size.dpr);
          compose(performance.now());
        } catch (error) {
          return failed(error);
        }
      }
      arm();
    },

    /** Stops for good: the loop, the observer and listeners end, and the
        GPU resources and the WebGL context are released. */
    destroy() {
      if (gone) return;
      gone = true;
      cancelAnimationFrame(raf);
      waiting.clear();
      observer.disconnect();
      listening.abort();
      try { release(); }
      finally {
        try { gl?.getExtension("WEBGL_lose_context")?.loseContext(); }
        finally { arrive(); }
      }
    },
  };
}
