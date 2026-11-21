/* ==========================================================================
   Background — what fills the band between the two lines. It comes in
   three kinds (MODES): the particle field, and two adapted from React
   Bits. Each is a module whose mount() gives the same small interface, so
   the page drives whichever is showing the way it drove the field alone.
   This controller owns the choice: which background shows, the change
   from one to the next, and the visitor's preference.

   The band is typed (js/ascii.js): the backgrounds draw small pictures
   out of sight, and one screen sets them in characters on a single grid.
   A change runs in the characters alone: both pictures go on as they are,
   and the cells turn over from one to the other in drifts, each through
   the characters between (see LIGHT in js/ascii.js), on a cross-fade's
   clock. It can be overtaken: every picture heads for its place from
   wherever it is, so the screen follows the latest choice without a jump
   and without a queue. A background out of sight is paused, and stays
   built for a while (LINGER) so that it can come straight back; prepare()
   builds one ahead of the choice, so that the change starts on the frame
   it is asked for.

   Where the screen can't run (no WebGL, or it fails), the backgrounds'
   canvases are shown themselves and cross-fade, the picture leaving
   settling flat and the one arriving rising, the way the field rises in
   the page's intro.
   ========================================================================== */

import { mount as mountField } from "./field.js";
import { createScreen, RATIO } from "./ascii.js";

/* In the order the switch lists them. The field ships with the page; the
   others load the first time they are asked for. `webgl2`: the mode needs
   WebGL 2, so a device without it doesn't offer the mode. `tone`: how its
   picture's light is typed, [gain, curve, peak, spread] (see source in
   js/ascii.js). Slats' picture is a slat to a character, read at its center.

   mount(container, { canvas, theme, still, dense, onError, frames, typed })
   draws on `canvas`, or on a canvas of its own added to `container`, by
   the `frames` given, and while typed() says so, as a picture for the
   screen to type (see createField in js/field.js). It returns:
     canvas               the canvas (this controller fades it in and out)
     ready                resolves once its first frame has been drawn
     set(framing, how)    glide toward a framing: shot / amplitude /
                          opacity / seed; how = { along, settle, cut } (see
                          set in js/field.js). (A framing's `contrast` is
                          the screen's: see set below.)
     setTheme(name), resize(), setPointer(x, y, active), ripple(x, y)
     sample(x, y)         the surface under a canvas point, as { height },
                          or null
     pause(), resume()
     destroy()            stops for good: frames, observers and listeners
                          end, GPU resources and the WebGL context are
                          released, the canvas is removed */
export const MODES = [
  { id: "waves", label: "Waves", tone: [1, 1.75, 0], load: () => mountField },
  { id: "slats", label: "Slats", tone: [2.7, 1.5, 0, 0], webgl2: true, load: () => import("./slats.js").then((m) => m.mount) },
  { id: "topography", label: "Topography", tone: [1.15, 1.05, 1], webgl2: true, load: () => import("./topography.js").then((m) => m.mount) },
];

const KEY = "background"; // the visitor's choice, in localStorage
const FADE = 950;         // ms, on --ease-in-out: the theme sweep's timing
const TYPED_FADE = 1500;  // ms, linear: typed, a change runs through the cells evenly (see LIGHT in js/ascii.js)
const RETYPE = 900;       // ms a new signature takes to be typed over the old
const LINGER = 30000;     // ms a background out of sight stays built
const TYPED = true;       // set the band in characters (false: show the canvases)

/* A choice kept for the next visit. Storage can be blocked (private modes,
   site settings): the choice then lasts the visit. */
function recall() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function keep(id) {
  try { localStorage.setItem(KEY, id); } catch { /* not kept */ }
}

/** Starts the band's background: the one chosen on the last visit, or
    the field. `canvas` (the page's own) is drawn on by the first one.
    `onchange` runs when the background asked for takes the screen, and,
    with that mode as { id, label }, when one turns out not to work here
    (the choices on offer have changed). `onlayout` gets the typed
    screen's grid whenever it is laid out (see layout in js/ascii.js). */
export function createBackground(container, { canvas, theme = "dark", still = false, dense = true, onchange = () => {}, onlayout = () => {} } = {}) {
  const modes = MODES.filter((m) => !m.webgl2 || typeof WebGL2RenderingContext !== "undefined");
  const ease = getComputedStyle(document.documentElement).getPropertyValue("--ease-in-out").trim() || "ease-in-out";
  const framing = { shot: "line", amplitude: 0, opacity: 0, seed: [0, 0] }; // what the page asked for last
  const pointer = { x: 0, y: 0, active: false };
  const saved = recall();
  let target = modes.some((m) => m.id === saved) ? saved : modes[0]?.id; // the mode asked for
  let front = null;    // the entry that has the screen, or is fading in to take it
  let before = null;   // the mode it took the screen from
  let spare = canvas;  // the page's canvas, until the first background takes it
  let covered = false; // something opaque covers the band (the page says so)
  let gone = false;
  let started;
  const shown = new Promise((resolve) => (started = resolve));

  /* Every background there is, by mode id, from the moment it starts to
     load: at most one of each. An entry is
       mode     its MODES entry
       layer    what mount() returned, once built
       ready    it has drawn
       goal     the opacity its canvas is heading for: 1 in view, 0 out
       fade     the animation taking it there, while it runs
       parked   out of sight: paused, until asked back or let go (timer) */
  const built = new Map();

  const resting = () => covered || document.hidden;
  // How a background waits out of sight: where the page is, and flat, to
  // rise as it fades in. (Typed, or with reduced motion, nothing rises: it
  // waits as it will be seen.)
  const flat = () => (still || typed ? framing : { ...framing, amplitude: 0 });
  // In view: has the screen, is taking it, or is still fading from it.
  const seen = (entry) => !!entry.layer && !entry.parked && (entry.goal === 1 || !!entry.fade);
  // How strongly a background shows just now: its canvas's opacity, which
  // the cross-fade animates whether the canvas or the screen is seen. Read
  // off the fade's own clock (its eased progress between the two opacities
  // it runs between), which is what the canvas's style shows, without
  // making the browser restyle the page to say so, every frame. Once it has
  // run its course, the canvas stands at its goal.
  const strength = (entry) => {
    if (!entry.layer || entry.parked || entry.gone) return 0;
    const { fade } = entry;
    if (!fade) return entry.goal;
    const progress = fade.effect?.getComputedTiming().progress;
    if (progress == null) return entry.goal;
    const [from, to] = fade.span;
    return Math.min(Math.max(from + (to - from) * progress, 0), 1);
  };

  /* The screen that types the band over the backgrounds' own canvases,
     which then draw out of sight at its scale. If it can't type, the
     canvases are shown instead (untype). */
  let typed = false;
  let screen = null;
  if (TYPED) {
    const surface = document.createElement("canvas");
    surface.className = "screen";
    container.prepend(surface);
    screen = createScreen(surface, { theme, still, onError: untype, onRestore: redraw, onLayout: (layout) => onlayout(layout) });
    typed = screen.working;
    if (!typed) {
      screen.destroy();
      surface.remove();
      screen = null;
    }
  }
  container.classList.toggle("is-typed", typed);
  // How the backgrounds' pictures are typed, while they are.
  const typing = () => (typed ? { scale: RATIO, ...screen.layout } : null);
  // Ready once the first background has the screen (and has been typed).
  const ready = screen ? Promise.all([shown, screen.ready]).then(() => {}) : shown;

  /** Brings in the mode asked for: builds it if need be, and gives it the
      screen as soon as it has drawn. */
  function update() {
    if (gone || !target) return;
    const entry = built.get(target) || build(modes.find((m) => m.id === target));
    if (entry.ready) show(entry);
  }

  function build(mode) {
    const entry = { mode, layer: null, ready: false, goal: 0, fade: null, parked: false, timer: 0 };
    built.set(mode.id, entry);
    raise(entry);
    return entry;
  }

  /** Loads and builds an entry's background. The first draws on the
      page's own canvas, in view, where the page's intro raises it; a
      later one is built out of sight. Once it has drawn its first frame
      it takes the screen, if it is still the one asked for. */
  async function raise(entry) {
    try {
      const make = await entry.mode.load();
      if (entry.gone) return; // let go while loading
      const given = spare; // a canvas is drawn on by one background only
      spare = undefined;
      // Its place on the screen: the screen runs its frames and types its
      // picture, as strongly as its canvas shows.
      entry.source = typed ? screen.source(() => strength(entry), MODES.indexOf(entry.mode)) : null;
      try {
        entry.layer = make(container, {
          canvas: given, theme, still, dense, typed: typing, frames: entry.source?.frames,
          onError: (error) => fail(entry, error),
        });
      } catch (error) {
        given?.remove();
        throw error;
      }
      const { layer } = entry;
      entry.source?.attach(layer.canvas, entry.mode.tone);
      if (given) {
        entry.goal = 1;
        layer.set(framing);
        layer.setPointer(pointer.x, pointer.y, pointer.active);
      } else {
        layer.canvas.style.opacity = "0";
        layer.set(flat(), { settle: true });
      }
      if (resting()) layer.pause();
      await layer.ready;
    } catch (error) {
      return fail(entry, error);
    }
    if (entry.gone) return; // let go while building
    entry.ready = true;
    if (entry.mode.id === target) show(entry);
    else park(entry); // built ahead (see prepare), or passed over
  }

  /** Gives `entry` the screen: it fades in, rising, as every other
      background in view fades out, settling. */
  function show(entry) {
    if (front === entry) return;
    const first = !front;
    if (front) before = front.mode.id;
    front = entry;
    clearTimeout(entry.timer);
    if (entry.parked) {
      entry.parked = false;
      entry.layer.canvas.style.visibility = "";
      entry.layer.set(flat(), { settle: true }); // the page may have moved on
      if (!resting()) entry.layer.resume();
    }
    entry.layer.setPointer(pointer.x, pointer.y, pointer.active);
    for (const other of built.values()) {
      if (other !== entry && other.layer && !other.parked) fadeTo(other, 0);
    }
    fadeTo(entry, 1);
    screen?.refresh();
    if (first) started();
    onchange();
  }

  /** Sends an entry's canvas toward opacity `to` (1 or 0) from wherever
      it is, the surface rising or settling on the same clock. A fade cut
      short takes the share of FADE that is left to cover. */
  function fadeTo(entry, to) {
    if (entry.goal === to) return; // there, or on its way
    entry.goal = to;
    const { layer } = entry;
    const from = Number(getComputedStyle(layer.canvas).opacity);
    entry.fade?.cancel();
    layer.canvas.style.opacity = to ? "" : "0";
    // Typed, the screen eases each cell's turn itself, so the change's own
    // clock runs evenly (an eased one would turn most cells in its middle).
    const duration = still ? 0 : (typed ? TYPED_FADE : FADE) * Math.abs(to - from);
    const fade = entry.fade = duration
      ? layer.canvas.animate({ opacity: [from, to] }, { duration, easing: typed ? "linear" : ease })
      : null;
    if (fade) fade.span = [from, to]; // (what it runs between: see strength)
    // Shown as canvases, the picture leaving settles flat as the one
    // arriving rises; typed, the change is the characters' alone.
    if (!typed) layer.set({ amplitude: to ? framing.amplitude : 0 }, fade ? { along: fade } : { settle: !to });
    screen?.refresh(duration); // the characters change on every frame of it
    if (!fade) return arrived(entry);
    fade.finished.then(() => {
      if (entry.fade !== fade) return; // overtaken
      entry.fade = null;
      arrived(entry);
    }, () => {}); // cancelled: overtaken
  }

  /** A canvas has reached its place: one that faded out is put away. */
  function arrived(entry) {
    if (entry.goal || entry.gone) return;
    if (entry.ready) park(entry);
    else discard(entry); // passed over before it ever drew
  }

  /** Puts away a background that is out of sight: paused, and kept for a
      while, so that it can come straight back. (With reduced motion a
      change is a cut, and needs nothing kept.) */
  function park(entry) {
    const { layer } = entry;
    entry.fade?.cancel();
    entry.fade = null;
    entry.goal = 0;
    entry.parked = true;
    layer.canvas.style.opacity = "0";
    layer.canvas.style.visibility = "hidden";
    layer.setPointer(0, 0, false);
    layer.pause();
    screen?.refresh();
    linger(entry);
  }

  function linger(entry) {
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      if (entry.parked) discard(entry);
    }, still ? 0 : LINGER);
  }

  function discard(entry) {
    if (entry.gone) return;
    entry.gone = true;
    clearTimeout(entry.timer);
    entry.fade?.cancel();
    entry.fade = null;
    if (built.get(entry.mode.id) === entry) built.delete(entry.mode.id);
    if (front === entry) front = null;
    try { entry.layer?.destroy(); }
    catch (error) { console.warn("Background cleanup:", error); }
    finally {
      entry.source?.release();
      entry.source = null;
    }
  }

  /** The screen can't type: the backgrounds' canvases are shown instead,
      drawn at their own scale, cross-fading as before. (Their frames still
      come from the screen, which keeps running them.) */
  function untype(error) {
    if (!typed) return;
    typed = false;
    console.warn("Typed background unavailable:", error?.message || error);
    container.classList.remove("is-typed");
    screen.canvas.style.display = "none";
    onlayout(null); // (no grid now: the page lays its frame out on its own)
    redraw();
  }

  /** Every background draws again (at the scale now in force). */
  function redraw() {
    for (const { layer } of built.values()) layer?.resize();
  }

  /** A background that can't load, build or draw here is no longer
      offered; the screen stays with (or goes back to) one that works. */
  function fail(entry, error) {
    if (gone || entry.gone || entry.failed) return;
    entry.failed = true;
    const { mode } = entry;
    console.warn(`${mode.label} background unavailable:`, error?.message || error);
    const at = modes.indexOf(mode);
    if (at >= 0) modes.splice(at, 1);
    discard(entry);
    if (target === mode.id) {
      target = front?.mode.id ?? (built.has(before) ? before : modes[0]?.id);
      if (target) keep(target);
    }
    onchange({ id: mode.id, label: mode.label });
    if (!target) return started();
    update();
  }

  // Nothing draws while the tab is hidden or the band is covered.
  function rest() {
    const off = resting();
    for (const { layer, parked } of built.values()) {
      if (layer && !parked) off ? layer.pause() : layer.resume();
    }
  }
  document.addEventListener("visibilitychange", rest);

  if (target) update();
  else started();

  return {
    ready,

    /** The backgrounds this device can show, as { id, label }, in order. */
    get modes() { return modes.map(({ id, label }) => ({ id, label })); },

    /** The background asked for (it takes the screen once it has built). */
    get mode() { return target; },

    /** Whether the background asked for is still on its way. */
    get pending() { return !!target && front?.mode.id !== target; },

    /** Switches to mode `id`. The screen ends on the last one asked for,
        however quickly the choices follow one another. */
    choose(id) {
      if (gone || !modes.some((mode) => mode.id === id)) return;
      if (id !== target) {
        target = id;
        keep(id);
      }
      update();
    },

    /** Builds mode `id` out of sight ahead of a likely choice (the pointer
        rests on its button, say), or keeps it built a while longer. */
    prepare(id) {
      const mode = modes.find((m) => m.id === id);
      if (gone || still || !mode) return;
      const entry = built.get(id);
      if (!entry) build(mode);
      else if (entry.parked) linger(entry);
    },

    /** Fetches every background's code ahead of its first use. */
    preload() {
      for (const mode of modes) Promise.resolve().then(mode.load).catch(() => {});
    },

    /** Stops drawing while something opaque covers the band. */
    pause(on) {
      covered = on;
      rest();
    },

    /** Glides every background in view toward a framing (see mount
        above); its `contrast`, if any, is the typed screen's (see TYPED in
        js/ascii.js), which follows on the same rate as the opacity. */
    set(goal = {}, how = {}) {
      // Typed, a new signature (a project's) is typed over the old one:
      // the backgrounds take it at once and the screen turns its cells over
      // to it. Glided, the waves would scroll a long way through their
      // noise on the way.
      const reseeded = typed && !!goal.seed && (goal.seed[0] !== framing.seed[0] || goal.seed[1] !== framing.seed[1]);
      for (const key in framing) {
        if (goal[key] !== undefined) framing[key] = key === "seed" ? [...goal.seed] : goal[key];
      }
      if (goal.contrast !== undefined) screen?.setContrast(goal.contrast, { settle: still || !!how.settle });
      if (reseeded) {
        screen.retype(still ? 0 : RETYPE);
        how = { ...how, cut: ["seed"] };
      }
      // One on its way out stays flat (shown as a canvas); one not in view
      // has nothing to glide.
      const leaving = still || typed || goal.amplitude === undefined ? goal : { ...goal, amplitude: 0 };
      for (const entry of built.values()) {
        if (!entry.layer || entry.parked) continue;
        if (entry.goal) entry.layer.set(goal, how);
        else entry.layer.set(leaving, entry.fade ? how : { settle: true });
      }
    },

    setTheme(name) {
      theme = name;
      screen?.setTheme(name);
      for (const { layer } of built.values()) layer?.setTheme(name);
    },

    /** Has the typed band make way for words set over it: how far each
        cell of the screen's grid should, and at which of them it gathers
        about the pointer instead (see setWay in js/ascii.js). */
    clear(goal, how) {
      if (typed) screen.setWay(goal, how);
    },

    /** Pointer position in canvas CSS px; `active` false lets it go. (The
        typed screen is told too: where the pointer is on a list's row,
        the picture gathers at the row's words. See GATHER in js/ascii.js.) */
    pointer(x, y, active) {
      Object.assign(pointer, { x, y, active });
      for (const entry of built.values()) {
        if (seen(entry)) entry.layer.setPointer(x, y, active);
      }
      if (typed) screen.setPointer(x, y, active);
    },

    ripple(x, y) {
      for (const entry of built.values()) {
        if (seen(entry)) entry.layer.ripple(x, y);
      }
    },

    sample(x, y) {
      return front ? front.layer.sample(x, y) : null;
    },

    /** Tear down the controller as well as every layer it owns. */
    destroy() {
      if (gone) return;
      gone = true;
      document.removeEventListener("visibilitychange", rest);
      for (const entry of [...built.values()]) discard(entry);
      spare?.remove();
      spare = undefined;
      if (screen) {
        screen.destroy();
        screen.canvas.remove();
      }
      started();
    },
  };
}
