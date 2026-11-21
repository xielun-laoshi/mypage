/* ==========================================================================
   Wave — a change made in the band's characters (js/ascii.js), cell by
   cell, in a wave that crosses what is changing. Three kinds:

   A panel arriving ("fill"): its place fills with the characters in a
   drift from the side it comes from, each cell stepping up from light to
   dense until it is paper; then the panel shows, and types itself in.

   A panel leaving ("clear"): the wave takes the panel as it passes. Each
   cell blanks to paper over what is written there, rests a moment, and
   steps back down through the characters to nothing, so that the panel's
   words go cell by cell with the wave instead of all at once ahead of it.

   A change of theme ("turn"): the wave spreads over the whole page from
   the switch that was pressed, and each cell turns over from the old page
   to the new: up through the characters in the old ink on the old paper,
   until it is nearly all ink, then down through them again in the new ink
   on the new paper. (The old ink is the new paper's shade, and the old
   paper the new ink's: the palette is symmetric, main.css. So the cell
   grows lighter, or darker, a step at a time all the way across.)

   The cells are the page's own (the band's grid, carried over the page:
   see js/frame.js), so a wave takes the place of the band's characters
   instead of lying over them, as a change between backgrounds does. While
   a cell is in the wave it is paper, or a character on paper, and hides
   what lies beneath; so the page can change under the wave unseen
   (`cover` says where).

   A wave may cover the whole screen at its full resolution with every cell
   on the move at once, so the GPU draws it: one program finds each pixel's
   cell, how far that cell has come, and the pixel of the character it
   shows. (Drawn a cell at a time on a 2D canvas, a panel on a large dense
   screen, or a change of theme anywhere, took 50 to 250 ms a frame.)
   ========================================================================== */

import { RAMP, TILE, evenTurns, strikeTile } from "./ascii.js";

/* A cell takes TURN of the run to step through the characters; its start
   is set by where it lies along the wave, nudged by up to JITTER (each
   cell by its turn in the screen's even order, evenTurns in js/ascii.js),
   so the front breaks up into a mist, as the band's own points thin out,
   not into static. Leaving, a cell rests REST of the run as paper before
   it steps down. Turning over, it takes OVER of the run to go up through
   the characters and down again. */
const TURN = 0.3;
const JITTER = 0.22;
const REST = 0.05;
const OVER = 0.42;
const LEVELS = RAMP.length;

/* A wave's picture is the screen's own, pixel for pixel, up to ROOM
   pixels. Over a larger place (a whole 4K or 5K screen) it is drawn
   coarser, never under COARSEST of the screen's pixels each way, and
   stretched to fit: nothing the eye can follow, in characters that each
   last a frame or two. (Making room for a larger picture cost the wave
   its first frames: up to six of them long, 83 ms the longest, on a
   2560 x 1300 screen at x2.) */
const ROOM = 6e6;
const COARSEST = 0.6;

/* How a cell goes through its looks (the pictures in its strip, see
   looksFor), by kind: `rest`, the share of the run it holds the first
   look; `span`, the share it takes to step through the next `count` of
   them, from the look numbered `first`; `hold`, whether it then keeps the
   one after those (paper, for a panel arriving) or shows nothing again. */
const KINDS = {
  fill:  { rest: 0,    span: TURN, first: 0, count: LEVELS,     hold: true },
  clear: { rest: REST, span: TURN, first: 1, count: LEVELS,     hold: false },
  turn:  { rest: 0,    span: OVER, first: 0, count: 2 * LEVELS, hold: false },
};

const VERTEX = `
attribute vec2 corner;
void main() { gl_Position = vec4(corner, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uSize;        // the canvas, px
uniform vec2 uOrigin;      // the corner of the page's first cell, px from the canvas's top-left
uniform vec2 uCell;        // a cell, px
uniform vec2 uTile;        // a cell's picture in the strip, texels (the same, unless the wave is drawn coarser)
uniform vec4 uAlong;       // how far along the wave a place lies: (x, y) . uAlong.xy + uAlong.z, or (uAlong.w > 0) its distance from uAlong.xy over uAlong.w
uniform float uProgress;   // how far the run has come
uniform float uTravel;     // the share of the run the front takes to cross
uniform vec4 uKind;        // rest, span, first, count (see KINDS)
uniform float uHold;       // 1: a cell keeps the look after its last step
uniform float uLooks;      // how many looks the strip holds
uniform sampler2D uStrip;  // the looks, side by side
uniform sampler2D uTurns;  // each cell's nudge (a tile of ${TILE} x ${TILE}, repeating)

void main() {
  vec2 at = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y) - uOrigin;
  vec2 cell = floor(at / uCell);
  vec2 within = at - cell * uCell;
  vec2 mid = uOrigin + (cell + 0.5) * uCell;
  float along = uAlong.w > 0.0 ? distance(mid, uAlong.xy) / uAlong.w : dot(mid, uAlong.xy) + uAlong.z;
  float nudge = texture2D(uTurns, (cell + 0.5) / ${TILE.toFixed(1)}).r;
  float since = uProgress - clamp(along, 0.0, 1.0) * uTravel - nudge * ${JITTER.toFixed(4)};
  float look = -1.0;
  if (since > 0.0) {
    float step = (since - uKind.x) / uKind.y;
    if (step < 0.0) look = 0.0;
    else if (step < 1.0) look = uKind.z + min(floor(step * uKind.w), uKind.w - 1.0);
    else if (uHold > 0.5) look = uKind.z + uKind.w;
  }
  if (look < 0.0) {
    gl_FragColor = vec4(0.0); // not reached yet, or done: what is there shows
    return;
  }
  // (Kept half a texel inside the look's own picture: drawn coarser, the
  // strip is read between its texels, and must not take in the next look.)
  vec2 inset = 0.5 * uCell / uTile;
  vec2 inside = clamp(within, inset, uCell - inset);
  vec2 texel = vec2((look * uCell.x + inside.x) / (uLooks * uCell.x), inside.y / uCell.y);
  gl_FragColor = vec4(texture2D(uStrip, texel).rgb, 1.0);
}
`;

/** A canvas for waves (added to the page, with class `name`), and
      start({ rect, mode, from, ms, palettes, clock, cover, done })  a wave
              over `rect` (px): mode "fill" covers it, "clear" uncovers it,
              taking what is there as it passes, "turn" turns it over from
              one palette to another (`palettes`: [old, new], each { ink,
              paper, theme }; the other kinds use the page's own). `from`
              is the side the wave sets off from ("left", "right", "top",
              "bottom"), or a point of the page ({ x, y }) it spreads from.
              `clock()`, if given, says how far the run has come (0–1), in
              place of the time since it began. `cover(px)` is told, while
              a wave clears or turns, how far in from that side (or out
              from that point) everything is under it: what lies beneath
              can be cut away, or changed, to there. `done` runs as the
              wave ends, or when another wave or finish() cuts it short
              (then at once). Returns { reach, under }: how far the wave
              goes (px), and the shares of the run between which `cover`
              goes from nothing to all of that; or null where nothing runs
              (reduced motion, no WebGL: `done` has then run already)
      finish()  ends the wave under way at once (its done runs)
      prepare() makes the GPU's side, and the page's characters, ahead of
              a first wave, so that it starts at once */
export function createWave({ still = false, name = "wipe" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = name;
  canvas.setAttribute("aria-hidden", "true");
  canvas.hidden = true;
  document.body.append(canvas);
  let gl = null;
  let broken = false;
  let uniforms = null;
  const strips = new Map(); // the looks, as textures, by kind and palette (see looksFor)
  let run = null;

  // The GPU's side goes with its context (a driver reset, say): the wave
  // under way ends there, and that side is made again when a wave is next
  // wanted. Until the context is back, changes happen at once.
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault(); // (it may be given back)
    finish();
    gl = uniforms = null;
    strips.clear();
  });

  /** The GPU's side: the program, a triangle over the canvas, the nudges. */
  function init() {
    if (gl || broken) return !broken;
    try {
      gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
      if (!gl) throw new Error("no WebGL");
      if (gl.isContextLost()) return (gl = null, false); // (not yet given back: asked again next time)
      const program = gl.createProgram();
      for (const [kind, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]]) {
        const shader = gl.createShader(kind);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        gl.attachShader(program, shader);
      }
      gl.bindAttribLocation(program, 0, "corner");
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "the wave's program did not link");
      gl.useProgram(program);
      uniforms = {};
      for (const uniform of ["uSize", "uOrigin", "uCell", "uTile", "uAlong", "uProgress", "uTravel", "uKind", "uHold", "uLooks", "uStrip", "uTurns"]) {
        uniforms[uniform] = gl.getUniformLocation(program, uniform);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); // (pictures the top row first: the program counts down from the top)
      // Each cell's nudge, as the screen has it (a tile that repeats).
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, TILE, TILE, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, Uint8Array.from(evenTurns(), (turn) => Math.round(turn * 255)));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.uniform1i(uniforms.uTurns, 1);
      gl.uniform1i(uniforms.uStrip, 0);
      gl.activeTexture(gl.TEXTURE0);
    } catch (error) {
      console.warn("The page's waves are unavailable:", error?.message || error);
      broken = true;
      gl = null;
    }
    return !broken;
  }

  /** The page's grid and palette, as main.css has them now. */
  function measure() {
    const style = getComputedStyle(document.body);
    const px = (property, fallback) => parseFloat(style.getPropertyValue(property)) || fallback;
    return {
      cell: [px("--cell-w", 7), px("--cell-h", 9)],
      origin: [px("--grid-x", 0), px("--grid-y", 0)],
      palette: {
        paper: style.getPropertyValue("--bg").trim() || "#121212",
        ink: style.getPropertyValue("--ink").trim() || "#e8e8e8",
        theme: document.body.dataset.theme,
      },
    };
  }

  /** The looks a cell goes through, side by side in one picture, as a
      texture (kept by kind, palette, cell and pixel ratio). RAMP is struck
      as the screen strikes it for each palette's theme (strikeTile).
      Arriving: the characters, lightest first, then paper. Leaving:
      paper, then the characters, densest first. Turning over: the
      characters in the old palette, lightest first, then in the new,
      densest first. */
  function looksFor(mode, aw, ah, dpr, palettes) {
    const key = [mode, aw, ah, dpr, ...palettes.flatMap(({ ink, paper, theme }) => [ink, paper, theme])].join("|");
    let strip = strips.get(key);
    if (!strip) {
      const [first, second = first] = palettes;
      const tiles = (palette) => [...RAMP].map((character) => strikeTile(character, aw, ah, dpr, palette));
      const blank = document.createElement("canvas");
      blank.width = aw;
      blank.height = ah;
      const paper = blank.getContext("2d");
      paper.fillStyle = first.paper;
      paper.fillRect(0, 0, aw, ah);
      const looks = mode === "fill" ? [...tiles(first), blank]
        : mode === "clear" ? [blank, ...tiles(first).reverse()]
        : [...tiles(first), ...tiles(second).reverse()];
      const picture = document.createElement("canvas");
      picture.width = aw * looks.length;
      picture.height = ah;
      const ctx = picture.getContext("2d");
      looks.forEach((look, k) => ctx.drawImage(look, k * aw, 0));
      if (strips.size > 8) { // (a few at most: two themes, three kinds)
        for (const old of strips.values()) gl.deleteTexture(old.texture);
        strips.clear();
      }
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture);
      // (Read at its texels' centers on the screen's own pixels, which gives
      // each exactly; between them where the wave is drawn coarser, which
      // averages a stroke instead of dropping it.)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      strip = { texture, count: looks.length };
      strips.set(key, strip);
    }
    gl.bindTexture(gl.TEXTURE_2D, strip.texture);
    return strip;
  }

  function finish() {
    if (!run) return;
    const { done, frame } = run;
    cancelAnimationFrame(frame);
    run = null;
    done?.(); // (first: a panel shows on the frame its cover goes)
    canvas.hidden = true;
    // (The canvas may be as large as the screen: its picture is given up
    // until the next wave.)
    canvas.width = canvas.height = 1;
  }

  function start({ rect, mode = "fill", from = "right", ms = 500, palettes = null, clock = null, cover = null, done = null }) {
    finish();
    if (still || !rect || rect.width < 1 || rect.height < 1 || !init()) {
      done?.();
      return null;
    }
    const { cell: [cw, ch], origin: [gx, gy], palette } = measure();
    const native = Math.min(window.devicePixelRatio || 1, 2);
    const aw = Math.round(cw * native), ah = Math.round(ch * native); // a cell of the screen's, for the characters' pictures
    const left = Math.floor(rect.left), top = Math.floor(rect.top);
    const width = Math.ceil(rect.right) - left, height = Math.ceil(rect.bottom) - top;
    // (The canvas's pixels to a CSS px: the screen's own, or fewer where the place is larger than ROOM.)
    const dpr = native * Math.max(COARSEST, Math.min(1, Math.sqrt(ROOM / (width * height * native * native))));
    const exact = dpr === native;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    Object.assign(canvas.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });

    // How far along the wave a place lies (0–1), and how far the wave goes
    // (px): across the rect from a side, or out from a point to the rect's
    // furthest corner. (In canvas px, from its top-left.)
    const kind = KINDS[mode];
    const travel = 1 - JITTER - kind.rest - kind.span;
    const spreading = typeof from === "object";
    const reach = spreading
      ? Math.max(...[[left, top], [left + width, top], [left, top + height], [left + width, top + height]].map(([x, y]) => Math.hypot(x - from.x, y - from.y)))
      : from === "left" || from === "right" ? width : height;
    const along = spreading ? [(from.x - left) * dpr, (from.y - top) * dpr, 0, reach * dpr]
      : from === "left" ? [1 / canvas.width, 0, 0, 0]
      : from === "right" ? [-1 / canvas.width, 0, 1, 0]
      : from === "top" ? [0, 1 / canvas.height, 0, 0]
      : [0, -1 / canvas.height, 1, 0];
    try {
      const strip = looksFor(mode, aw, ah, native, palettes || [palette]);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.uSize, canvas.width, canvas.height);
      // (On the screen's own pixels a cell is a whole number of them, and
      // the grid starts on one; coarser, both are what they come to.)
      gl.uniform2f(uniforms.uOrigin, exact ? Math.round((gx - left) * dpr) : (gx - left) * dpr, exact ? Math.round((gy - top) * dpr) : (gy - top) * dpr);
      gl.uniform2f(uniforms.uCell, exact ? aw : cw * dpr, exact ? ah : ch * dpr);
      gl.uniform2f(uniforms.uTile, aw, ah);
      gl.uniform4f(uniforms.uAlong, ...along);
      gl.uniform1f(uniforms.uTravel, travel);
      gl.uniform4f(uniforms.uKind, kind.rest, kind.span, kind.first, kind.count);
      gl.uniform1f(uniforms.uHold, kind.hold ? 1 : 0);
      gl.uniform1f(uniforms.uLooks, strip.count);
    } catch (error) {
      console.warn("The page's waves are unavailable:", error?.message || error);
      broken = true;
      done?.();
      return null;
    }
    // From the moment the wave reaches a cell (by JITTER after the front
    // passes it) until the cell is done (not before rest + span after),
    // the cell hides what is beneath: everything is under the wave along
    // the line midway between the two, which crosses in the front's time.
    const under = kind.hold ? null : [(JITTER + kind.rest + kind.span) / 2, (JITTER + kind.rest + kind.span) / 2 + travel];
    let covered = -1;
    const draw = (p) => {
      gl.uniform1f(uniforms.uProgress, p);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (under && cover) {
        const reached = Math.round(Math.min(Math.max((p - under[0]) / travel, 0), 1) * reach);
        if (reached !== covered) cover(covered = reached);
      }
    };
    const begin = performance.now();
    const tick = () => {
      if (!run) return;
      const p = Math.min(Math.max(clock ? Number(clock()) || 0 : (performance.now() - begin) / ms, 0), 1);
      draw(p);
      if (p >= 1) finish();
      else run.frame = requestAnimationFrame(tick);
    };
    run = { done, frame: 0 };
    draw(0); // in this task: the wave sets off with the change
    canvas.hidden = false;
    run.frame = requestAnimationFrame(tick);
    return { reach, under };
  }

  /** Makes the GPU's side and strikes the page's characters ahead of a
      first wave (for the palette and grid the page has now). */
  function prepare() {
    if (still || !init()) return;
    const { cell: [cw, ch], palette } = measure();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    try {
      looksFor("fill", Math.round(cw * dpr), Math.round(ch * dpr), dpr, [palette]);
    } catch { /* (struck when the wave runs, then) */ }
  }

  addEventListener("resize", finish);
  return { start, finish, prepare };
}
