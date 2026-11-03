/* ==========================================================================
   Typing: text strikes in a character at a time, like a typewriter.
   One clock drives every line that is typing: keys land on whole display
   frames at a steady rhythm, a line ends on the very frame its last key
   lands, and typing a line again cleanly replaces a run still in progress.
   ========================================================================== */

const runs = new Map(); // element -> its run, while it types

/* --- The clock: a requestAnimationFrame loop that runs while anything
   types (and for a moment at load, to learn the display's frame period). */
const gaps = [];        // recent frame-to-frame intervals, ms
let lastFrame = 0;
let awake = false;

function wake() {
  if (awake) return;
  awake = true;
  requestAnimationFrame(tick);
}

function tick(now) {
  awake = false;
  const gap = now - lastFrame;
  if (lastFrame && gap > 4 && gap < 100) {
    gaps.push(gap);
    if (gaps.length > 24) gaps.shift();
  }
  lastFrame = now;
  for (const run of runs.values()) run.tick(now);
  if (runs.size || gaps.length < 24) wake();
  else lastFrame = 0; // asleep: the next wake measures afresh
}

wake();

/** The display's frame period (ms): the median recent interval. */
function framePeriod() {
  if (gaps.length < 3) return 1000 / 60;
  const sorted = [...gaps].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

/** Starts striking `count` keys about `speed` ms apart, beginning `delay` ms
    from now. The pace snaps to the display: whole or half keys per frame
    when fast, one key every whole number of frames when slow, so the rhythm
    never stutters. `strike(from, to)` shows keys [from, to); `done` runs on
    the frame the last one lands, `stop` if the run is cut short. Returns
    when (ms from now) the last key lands. */
function startRun(el, { delay, speed, count, strike, done = () => {}, stop = () => {} }) {
  const period = framePeriod();
  const perFrame = period / speed;
  const rate = perFrame >= 1 ? Math.round(perFrame * 2) / 2 : 1 / Math.round(1 / perFrame);
  const start = performance.now() + delay;
  let origin = -1; // the frame the first key lands on
  let struck = 0;
  const run = {
    tick(now) {
      if (origin < 0) {
        if (now < start - period / 2) return; // still waiting
        // Keys land from this frame on; a run that starts late (a hidden
        // tab, a long task) catches up with its schedule instead.
        origin = now - start > 2 * period ? start : now;
      }
      const frames = Math.round((now - origin) / period);
      const due = Math.min(count, Math.ceil((frames + 1) * rate - 1e-6));
      if (due > struck) strike(struck, due);
      struck = Math.max(struck, due);
      if (struck < count) return;
      runs.delete(el);
      done();
    },
    stop,
  };
  runs.set(el, run);
  wake();
  return count ? delay + Math.floor((count - 1) / rate + 1e-6) * period : delay;
}

/** Ends whatever `el` is typing. */
function cut(el) {
  const run = runs.get(el);
  if (!run) return;
  runs.delete(el);
  run.stop();
}

/** Types the text of `el` in, keeping its markup (<br>, spans): a copy of
    the content stands in while it types, with every character a key (a
    <type-key>, hidden until struck; see main.css). Assistive tech reads a
    hidden full copy meanwhile, so a heading focused mid-typing is
    announced whole. The original nodes return as the last key lands.
    Returns the time (ms) until then. */
export function typeIn(el, { delay = 0, speed = 12, still = false } = {}) {
  cut(el);
  if (still) return 0;
  const original = [...el.childNodes];
  const copy = document.createElement("type-text");
  copy.setAttribute("aria-hidden", "true");
  copy.append(...original.map((node) => node.cloneNode(true)));

  const keys = [];
  const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  for (const text of texts) {
    const run = document.createDocumentFragment();
    let space = ""; // whitespace stays plain text, so lines wrap as they will
    for (const char of text.data) {
      if (/\s/.test(char)) { space += char; continue; }
      if (space) { run.append(space); space = ""; }
      const key = document.createElement("type-key");
      key.textContent = char;
      keys.push(key);
      run.append(key);
    }
    if (space) run.append(space);
    text.replaceWith(run);
  }
  if (!keys.length) return 0;

  const spoken = document.createElement("span");
  spoken.className = "visually-hidden";
  spoken.textContent = el.textContent.replace(/\s+/g, " ").trim();
  el.replaceChildren(spoken, copy);

  const restore = () => el.replaceChildren(...original);
  return startRun(el, {
    delay,
    speed,
    count: keys.length,
    strike: (from, to) => { for (let i = from; i < to; i++) keys[i].className = "is-struck"; },
    done: restore,
    stop: restore,
  });
}

/** Replaces the text of `el` with `text`, typing only what changed: the
    part both share stays put, the rest is struck in after it. */
export function retype(el, text, { speed = 14, still = false } = {}) {
  cut(el); // a retype cut short keeps what it had typed
  if (still) { el.textContent = text; return; }
  const current = el.textContent;
  let shared = 0;
  while (shared < current.length && shared < text.length && current[shared] === text[shared]) shared++;
  const line = new Text(text.slice(0, shared));
  el.replaceChildren(line);
  startRun(el, {
    delay: 0,
    speed,
    count: text.length - shared,
    strike: (from, to) => { line.data = text.slice(0, shared + to); },
  });
}
