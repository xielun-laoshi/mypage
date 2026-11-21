/* ==========================================================================
   Clearing — where the band's characters make way for the page's words.
   The words set over the band (the caption, the readout, the project row
   under the pointer) are drawn here as they stand on the page, letter by
   letter, and every cell of the band's grid (js/ascii.js) is given its
   distance from the nearest of their ink. The cells the ink touches, or
   all but touches, make way entirely; those about them less and less, out
   to a few characters away. So the picture parts around the words
   themselves, along their ascenders and descenders and round their ends,
   not around a box, and thins toward them as it thins at its own edges.

   Words that are typed in open their clearing as they come, each cell with
   the letter nearest it, a moment ahead of its key; struck out, it closes
   behind them. The screen moves each cell there by degrees (setWay), so
   the characters step aside and come back rather than vanish and appear.
   ========================================================================== */

/* How near the ink a cell makes way entirely, and how far out the last of
   it reaches (px, from the cell's nearest edge). */
const INNER = 3.5;
const OUTER = 26;
const PAD = Math.ceil(OUTER) + 2;

/* A clearing opens this long (ms) ahead of the keys that type its words
   in, and closes this long behind the ones that strike them out. */
const LEAD = 90;
const LAG = 50;

const DIAGONAL = Math.SQRT2;
const smoothstep = (a, b, v) => {
  const t = Math.min(Math.max((v - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/** Keeps the clearings of the words that lie over `band` (the element the
    screen's grid is laid in). `apply(goal, { settle })` takes what comes of
    it: how far each cell of the grid should make way (0–255, a byte per
    cell, the top row first), to get there by degrees, or at once with
    `settle`. With `still` (reduced motion) nothing sweeps. Returns
      setGrid(layout)   the screen's grid (layout in js/ascii.js; null: none)
      add(el, { marks }) words that lie over the band; `marks` maps a
                        selector to the character its matches show (a
                        cursor's, say, which is not text). Returns
                          show({ delay, over, cursor })  they are there:
                                typed in over `over` ms, `delay` ms from
                                now (the clearing opens along them; with
                                `cursor`, it is open at their first letter
                                meanwhile, where a cursor waits), or at once
                          hide({ delay, over })  they have gone: struck out
                                from the end over `over` ms, or at once
      refresh()         measures again (the layout has changed)
      cleared(x, y)     whether the cell under a point of the page has made
                        way entirely (a word's ink is there) */
export function createClearing({ band, apply, still = false }) {
  const words = [];
  const board = document.createElement("canvas");
  const range = document.createRange();
  let grid = null;   // the screen's
  let rect = null;   // the band's, px
  let goal = null;   // each cell's
  let frame = 0;
  let last = "";     // what was last applied, in brief (see update)

  /** Every character of a word's element as it stands: its box (px), what
      it shows, and the type it is set in (its own element's: a row's
      number, title and specs differ). */
  function glyphsOf({ el, marks }) {
    const glyphs = [];
    const types = new Map();
    const typeOf = (element) => {
      if (!types.has(element)) {
        const style = getComputedStyle(element);
        types.set(element, {
          font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
          size: parseFloat(style.fontSize),
          upper: style.textTransform === "uppercase",
        });
      }
      return types.get(element);
    };
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (node.parentElement?.closest(".visually-hidden") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    while (walker.nextNode()) {
      const { data, parentElement } = walker.currentNode;
      // (A key being typed is set in the type of what holds it.)
      const type = typeOf(parentElement.localName === "type-key" ? parentElement.parentElement : parentElement);
      for (let i = 0; i < data.length; i++) {
        const code = data.charCodeAt(i);
        if (code <= 32 || code === 160 || (code >= 0xdc00 && code <= 0xdfff)) continue; // (space, or the second half of a pair)
        const pair = code >= 0xd800 && code <= 0xdbff;
        range.setStart(walker.currentNode, i);
        range.setEnd(walker.currentNode, i + (pair ? 2 : 1));
        const box = range.getBoundingClientRect();
        if (!box.width || !box.height) continue;
        const shown = data.slice(i, i + (pair ? 2 : 1));
        glyphs.push({ shown: type.upper ? shown.toUpperCase() : shown, box, type });
      }
    }
    for (const [selector, shown] of Object.entries(marks)) {
      for (const mark of el.querySelectorAll(selector)) {
        const box = mark.getBoundingClientRect();
        if (box.width && box.height) glyphs.push({ shown, box, type: typeOf(mark) });
      }
    }
    return glyphs;
  }

  /** Draws a word's letters where they stand and gives every cell near
      them its share (stamp: the cells, how far each makes way, and each
      one's turn, 0–1: that of the letter nearest it, in reading order). */
  function measure(word) {
    word.stamp = null;
    if (!grid || !rect?.width) return;
    if (getComputedStyle(word.el).display === "none") return;
    const glyphs = glyphsOf(word);
    if (!glyphs.length) return;
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (const { box } of glyphs) {
      left = Math.min(left, box.left);
      top = Math.min(top, box.top);
      right = Math.max(right, box.right);
      bottom = Math.max(bottom, box.bottom);
    }
    const ox = Math.floor(left) - PAD, oy = Math.floor(top) - PAD;
    const W = Math.ceil(right) + PAD - ox, H = Math.ceil(bottom) + PAD - oy;
    if (W * H > 4e6) return; // (not words over a band any more)
    board.width = W; // (sizing it clears it, and its settings)
    board.height = H;
    const ctx = board.getContext("2d", { willReadFrequently: true });
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#fff";
    const n = W * H;
    const owner = new Int16Array(n).fill(-1); // the letter each pixel is nearest to
    let face = null, ascent = 0;
    glyphs.forEach(({ shown, box, type }, k) => {
      if (type !== face) {
        face = type;
        ctx.font = type.font;
        // A character's box is its line of type: the baseline lies the
        // face's ascent below its top.
        ascent = ctx.measureText("x").fontBoundingBoxAscent ?? type.size * 0.8;
      }
      ctx.fillText(shown, box.left - ox, box.top + ascent - oy);
      const x1 = Math.min(W, Math.ceil(box.right - ox)), y1 = Math.min(H, Math.ceil(box.bottom - oy));
      for (let y = Math.max(0, Math.floor(box.top - oy)); y < y1; y++) owner.fill(k, y * W + Math.max(0, Math.floor(box.left - ox)), y * W + x1);
    });
    const alpha = ctx.getImageData(0, 0, W, H).data;
    // Every pixel's distance to the nearest ink (two sweeps, each taking
    // the least of its neighbors' plus the step to it), and whose ink.
    const far = new Float32Array(n).fill(1e6);
    for (let i = 0; i < n; i++) {
      if (alpha[i * 4 + 3] > 80) {
        far[i] = 0;
        if (owner[i] < 0) owner[i] = 0;
      }
    }
    const reach = (i, j, step) => {
      if (far[j] + step < far[i]) {
        far[i] = far[j] + step;
        owner[i] = owner[j];
      }
    };
    for (let y = 0, i = 0; y < H; y++) {
      for (let x = 0; x < W; x++, i++) {
        if (x) reach(i, i - 1, 1);
        if (!y) continue;
        reach(i, i - W, 1);
        if (x) reach(i, i - W - 1, DIAGONAL);
        if (x < W - 1) reach(i, i - W + 1, DIAGONAL);
      }
    }
    for (let y = H - 1, i = n - 1; y >= 0; y--) {
      for (let x = W - 1; x >= 0; x--, i--) {
        if (x < W - 1) reach(i, i + 1, 1);
        if (y === H - 1) continue;
        reach(i, i + W, 1);
        if (x < W - 1) reach(i, i + W + 1, DIAGONAL);
        if (x) reach(i, i + W - 1, DIAGONAL);
      }
    }
    // Each cell of the grid there: the least distance in it.
    const [cw, ch] = grid.cell;
    const gx = rect.left + grid.origin[0] - ox, gy = rect.top + grid.origin[1] - oy; // the first cell's corner, on the board
    const c0 = Math.max(0, Math.floor(-gx / cw)), c1 = Math.min(grid.cols - 1, Math.floor((W - 1 - gx) / cw));
    const r0 = Math.max(0, Math.floor(-gy / ch)), r1 = Math.min(grid.rows - 1, Math.floor((H - 1 - gy) / ch));
    const cells = [], amounts = [], turns = [];
    const span = Math.max(1, glyphs.length - 1);
    for (let r = r0; r <= r1; r++) {
      const y0 = Math.max(0, Math.round(gy + r * ch)), y1 = Math.min(H, Math.round(gy + (r + 1) * ch));
      for (let c = c0; c <= c1; c++) {
        const x0 = Math.max(0, Math.round(gx + c * cw)), x1 = Math.min(W, Math.round(gx + (c + 1) * cw));
        let least = 1e6, whose = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0, i = y * W + x0; x < x1; x++, i++) {
            if (far[i] < least) {
              least = far[i];
              whose = owner[i];
            }
          }
        }
        const amount = Math.round(255 * (1 - smoothstep(INNER, OUTER, least)));
        if (!amount) continue;
        cells.push(r * grid.cols + c);
        amounts.push(amount);
        turns.push(Math.max(whose, 0) / span);
      }
    }
    word.stamp = { cells, amounts, turns };
  }

  /** Every cell's goal just now; returns whether a clearing is still
      opening or closing. */
  function compose(now) {
    goal.fill(0);
    let moving = false;
    let brief = "";
    for (const word of words) {
      const { stamp, sweep } = word;
      // How far along its words the clearing is open: past them all, not
      // at all, or as far as the keys have come (or are still to go).
      let front = word.shown ? 2 : -1;
      if (sweep) {
        if (now >= sweep.end) {
          word.sweep = null;
          word.stale = sweep.opening; // (typed in: its own nodes are back, a cursor after them perhaps)
        } else {
          const t = (now - sweep.start) / sweep.ms;
          moving = true;
          front = sweep.opening ? Math.max(t, sweep.cursor ? 0 : -1) : 1 - t;
        }
      }
      let open = 0;
      if (stamp && front >= 0) {
        const { cells, amounts, turns } = stamp;
        for (let k = 0; k < cells.length; k++) {
          if (turns[k] > front) continue;
          open++;
          if (amounts[k] > goal[cells[k]]) goal[cells[k]] = amounts[k];
        }
      }
      brief += `${open},`;
    }
    return { moving, brief };
  }

  /** Hands the screen its goal, now and on every frame a clearing is
      still on its way (only when what is open has changed). */
  function update(settle = false) {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!goal) return;
    let { moving, brief } = compose(performance.now());
    const stale = words.filter((word) => word.stale);
    if (stale.length) {
      rect = band.getBoundingClientRect();
      for (const word of stale) {
        word.stale = false;
        measure(word);
      }
      ({ moving, brief } = compose(performance.now()));
      last = "";
    }
    if (settle || brief !== last) apply(goal, { settle: settle || still });
    last = brief;
    if (moving) frame = requestAnimationFrame(() => update());
  }

  function refresh() {
    rect = band.getBoundingClientRect();
    for (const word of words) {
      if (word.shown || word.sweep) measure(word);
      else word.stamp = null;
    }
    update(true);
  }

  return {
    setGrid(layout) {
      grid = layout;
      goal = layout ? new Uint8Array(layout.cols * layout.rows) : null;
      last = "";
      refresh();
    },

    add(el, { marks = {} } = {}) {
      const word = { el, marks, stamp: null, shown: false, sweep: null, stale: false };
      words.push(word);
      const turn = (shown, opening, { delay = 0, over = 0, cursor = false }) => {
        word.shown = shown;
        word.stale = false;
        const timed = !still && (delay > 0 || over > 0);
        // (An opening runs LEAD ahead of the keys: it is over, and the
        // words measured again as they then stand, a moment after the last
        // of them has landed.)
        const start = performance.now() + delay + (opening ? -LEAD : LAG);
        const ms = Math.max(over, 1);
        word.sweep = timed ? { start, ms, end: start + ms + (opening ? LEAD + 60 : 0), opening, cursor } : null;
        if (opening || !word.stamp) {
          rect = band.getBoundingClientRect();
          measure(word); // as they stand now
        }
        update();
      };
      return {
        show: (how = {}) => turn(true, true, how),
        hide: (how = {}) => turn(false, false, how),
      };
    },

    refresh,

    cleared(x, y) {
      if (!goal || !grid || !rect) return false;
      const c = Math.floor((x - rect.left - grid.origin[0]) / grid.cell[0]);
      const r = Math.floor((y - rect.top - grid.origin[1]) / grid.cell[1]);
      if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) return false;
      return goal[r * grid.cols + c] === 255;
    },
  };
}
