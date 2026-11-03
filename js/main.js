/* ==========================================================================
   Sheron Yang — page script
   Four views share one screen: home, the project index, a project, and
   contact. The URL hash is the source of truth (#/, #/projects,
   #/projects/<slug>, #/contact), so every view is linkable and the back
   button works; the links still toggle the way the original buttons did.
   ========================================================================== */

import { createField } from "./field.js";
import { startCursor } from "./cursor.js";
import { typeIn, retype } from "./text.js";

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pad = (n) => String(n).padStart(2, "0");

const body = document.body;
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* The field's framing for each view (see SHOTS in field.js). */
const SCENES = {
  home:     { shot: "landscape", amplitude: 1,    opacity: 1 },
  projects: { shot: "texture",   amplitude: 1,    opacity: 0.5 },
  project:  { shot: "texture",   amplitude: 1,    opacity: 0.4 },
  contact:  { shot: "calm",      amplitude: 0.45, opacity: 0.85 },
};
const AMBIENT = [0, 0];
const sceneOf = ({ base, overlay }) => (overlay === "contact" ? "contact" : overlay ? "project" : base);

const field = createField($(".field"), {
  theme: body.dataset.theme,
  still,
  dense: innerWidth * Math.min(devicePixelRatio, 2) >= 1400 && (navigator.hardwareConcurrency || 4) >= 4,
});
startCursor($(".cursor"));

/* --------------------------------------------------------------------------
   Content: one entry per project <article>, in document order. Each gets a
   noise offset — its "signature" — that the field morphs to.
   -------------------------------------------------------------------------- */
const projects = $$(".project").map((el, index) => ({
  el,
  index,
  slug: el.id.replace(/^project-/, "").toLowerCase(),
  title: el.dataset.title,
  meta: el.dataset.meta.split(" - "),
  seed: [((index + 1) * 7.31) % 41, ((index + 1) * 3.17) % 29],
}));
const bySlug = new Map(projects.map((p) => [p.slug, p]));
const contactPanel = $("#contact");

buildIndex();
buildPanels();

/** The list rows, built from each article's data-title / data-meta. */
function buildIndex() {
  const list = $(".index-list");
  for (const p of projects) {
    const row = document.createElement("li");
    row.className = "row";
    row.style.setProperty("--i", p.index);
    row.innerHTML = `
      <a class="row-link" href="#/projects/${p.slug}" data-action="project" data-slug="${p.slug}">
        <span class="row-no">${pad(p.index + 1)}</span>
        <span class="row-title"></span>
        <span class="row-meta"></span>
      </a>`;
    p.rowTitle = $(".row-title", row);
    p.rowTitle.textContent = p.title;
    $(".row-meta", row).textContent = p.meta.join("  /  ");
    p.row = row;
    p.link = $(".row-link", row);
    list.append(row);
  }
  $(".count").textContent = pad(projects.length);
}

/** Frame each project article: counter + close above, prev/next below. */
function buildPanels() {
  for (const p of projects) {
    const prev = projects[(p.index + projects.length - 1) % projects.length];
    const next = projects[(p.index + 1) % projects.length];
    const content = $(".panel-body", p.el);
    const heading = $("h2", content);
    heading.id = `${p.el.id}-title`;
    heading.tabIndex = -1;
    p.el.setAttribute("aria-labelledby", heading.id);

    const meta = document.createElement("p");
    meta.className = "panel-meta";
    meta.textContent = p.meta.join("\n"); // one typed line each (white-space: pre-line)
    heading.after(meta);
    for (const para of $$("p", content)) if (para !== meta && !para.querySelector("a")) para.dataset.cursor = "text";

    const top = document.createElement("div");
    top.className = "panel-top";
    top.innerHTML = `
      <a class="panel-close" href="#/projects" data-action="close">Close</a>
      <span class="panel-count">${pad(p.index + 1)} / ${pad(projects.length)}</span>`;

    const scroll = document.createElement("div");
    scroll.className = "panel-scroll";
    scroll.append(content);

    const steps = document.createElement("nav");
    steps.className = "panel-steps";
    steps.setAttribute("aria-label", "More projects");
    steps.innerHTML = `
      <a href="#/projects/${prev.slug}" data-action="step" data-slug="${prev.slug}"><span aria-hidden="true">&lt;-</span> Prev ${pad(prev.index + 1)}</a>
      <a href="#/projects/${next.slug}" data-action="step" data-slug="${next.slug}">Next ${pad(next.index + 1)} <span aria-hidden="true">-&gt;</span></a>`;

    p.el.prepend(top);
    p.el.append(scroll, steps);
  }
  $("h2", contactPanel).tabIndex = -1;
}

/* --------------------------------------------------------------------------
   Routing. state = { base: "home" | "projects", overlay: null | "contact" |
   <project slug> }. Contact opens over whichever base was showing.
   -------------------------------------------------------------------------- */
let state = { base: "home", overlay: null };
let trigger = null;   // the link that opened the current overlay
let hovered = null;   // project under the pointer / keyboard focus in the list
const navLinks = $$(".nav [data-action]");

function parse() {
  const [section, slug] = location.hash.replace(/^#\/?/, "").split("/");
  if (section === "projects") return { base: "projects", overlay: bySlug.has(slug) ? slug : null };
  if (section === "contact") return { base: history.state?.base || "home", overlay: "contact" };
  return { base: "home", overlay: null };
}

function hashFor({ base, overlay }) {
  if (overlay === "contact") return "#/contact";
  if (overlay) return `#/projects/${overlay}`;
  return base === "projects" ? "#/projects" : "";
}

function navigate(next) {
  if (next.base === state.base && next.overlay === state.overlay) return;
  history.pushState({ base: next.base }, "", hashFor(next) || location.pathname + location.search);
  render(next);
}

/** Where a link leads from the current state (links toggle). */
function targetOf(action, slug) {
  const { base, overlay } = state;
  switch (action) {
    case "home":     return { base: "home", overlay: null };
    case "projects": return base === "projects" ? { base: "home", overlay: null } : { base: "projects", overlay: null };
    case "contact":  return overlay === "contact" ? { base, overlay: null } : { base, overlay: "contact" };
    case "project":  return overlay === slug ? { base: "projects", overlay: null } : { base: "projects", overlay: slug };
    case "step":     return { base: "projects", overlay: slug };
    default:         return { base, overlay: null }; // close
  }
}

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-action]");
  if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  if (link.dataset.action !== "step" && link.dataset.action !== "close") trigger = link;
  navigate(targetOf(link.dataset.action, link.dataset.slug));
});

// Escape steps back out; ← / → page through projects while one is open.
document.addEventListener("keydown", (e) => {
  if (body.classList.contains("intro") || e.altKey || e.ctrlKey || e.metaKey) return;
  const project = bySlug.get(state.overlay);
  if (e.key === "Escape") {
    if (state.overlay) navigate({ base: state.base, overlay: null });
    else if (state.base === "projects") navigate({ base: "home", overlay: null });
  } else if (project && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : -1;
    navigate({ base: "projects", overlay: projects[(project.index + step + projects.length) % projects.length].slug });
  }
});

addEventListener("popstate", () => render(parse()));

function render(next) {
  const prev = state;
  state = next;
  body.dataset.view = next.base;
  body.dataset.overlay = next.overlay === "contact" ? "contact" : next.overlay ? "project" : "";

  for (const link of navLinks) {
    const on = link.dataset.action === "projects" ? next.base === "projects" : next.overlay === "contact";
    if (on) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
  }
  for (const p of projects) {
    p.row.classList.toggle("is-active", p.slug === next.overlay);
    if (p.slug === next.overlay) p.link.setAttribute("aria-current", "true"); else p.link.removeAttribute("aria-current");
  }

  swapPanels(prev.overlay, next.overlay);
  if (next.base === "projects" && prev.base !== "projects") {
    // The list prints itself, row by row.
    for (const p of projects) typeIn(p.rowTitle, { delay: 60 + p.index * 70, speed: 7, still });
  }
  updateField();
  updateSheet();

  const project = bySlug.get(next.overlay);
  if (project) requestAnimationFrame(() => revealRow(project));
  document.title = project ? `${project.title} — Sheron Yang`
    : next.overlay === "contact" ? "Contact — Sheron Yang"
    : next.base === "projects" ? "Projects — Sheron Yang" : "Sheron Yang";
}

const panelOf = (overlay) => (overlay === "contact" ? contactPanel : bySlug.get(overlay)?.el ?? null);

// Panels open at the top. Only those scrolled away from it are reset
// (scrolling forces a layout).
const scrolled = new Set();
for (const scroller of $$(".panel-scroll")) {
  scroller.addEventListener("scroll", () => { if (scroller.scrollTop > 0) scrolled.add(scroller); }, { passive: true });
}

/* A panel leaves the way the next one arrives: project to project they
   cross-fade in place (.is-swap), otherwise they slide. The arriving panel
   is always on top (see .panel.is-open). */
function swapPanels(fromKey, toKey) {
  const from = panelOf(fromKey);
  const to = panelOf(toKey);
  if (from === to) return;
  const focusInside = from && from.contains(document.activeElement);
  const swap = !!(from?.classList.contains("project") && to?.classList.contains("project"));
  if (from) {
    from.classList.toggle("is-swap", swap);
    from.classList.remove("is-open");
    if (focusInside && !to) (trigger?.isConnected ? trigger : $(".nav a")).focus({ preventScroll: true });
  }
  if (to) {
    arriveBy(to, swap);
    const scroller = $(".panel-scroll", to);
    if (scrolled.delete(scroller)) scroller.scrollTo(0, 0);
    to.classList.add("is-open");
    typeOut(to);
    if (!body.classList.contains("intro")) $("h2", to).focus({ preventScroll: true });
  }
}

/** Sets how a closed panel will arrive. Out of sight, it moves to that
    start (in place and transparent, or beside the screen) at once; a panel
    still on its way out keeps its course, so it turns around from wherever
    it is instead of jumping. */
function arriveBy(panel, swap) {
  if (panel.classList.contains("is-swap") === swap) return;
  const unseen = getComputedStyle(panel).visibility === "hidden";
  if (unseen) panel.style.transition = "none";
  panel.classList.toggle("is-swap", swap);
  if (unseen) {
    panel.getBoundingClientRect(); // commit the start state before opening
    panel.style.transition = "";
  }
}

/** A panel's typed parts: a project's heading, then its spec lines (their
    hairlines appear as the first key lands), with the body arriving as the
    heading is done; the contact links one after another, each row arriving
    as its link starts to type, then the source line. */
function typeOut(panel) {
  if (panel === contactPanel) {
    const rows = $$(".contact-list li", panel);
    rows.forEach((row, i) => {
      const delay = 300 + i * 160;
      row.style.setProperty("--delay", `${delay}ms`);
      typeIn($("a", row), { delay, speed: 30, still });
    });
    $(".source", panel).style.setProperty("--delay", `${300 + rows.length * 160}ms`);
    return;
  }
  const heading = typeIn($("h2", panel), { delay: 220, speed: 9, still });
  const meta = $(".panel-meta", panel);
  meta.style.setProperty("--delay", `${heading + 60}ms`);
  typeIn(meta, { delay: heading + 60, speed: 8, still });
  $$(".panel-body > :not(h2, .panel-meta)", panel).forEach((block, i) => {
    block.style.setProperty("--delay", `${heading + i * 80}ms`);
  });
}

/* --------------------------------------------------------------------------
   The field follows the view; hovering a project previews its signature.
   -------------------------------------------------------------------------- */
const status = $(".status");

/** The field's framing for a view (with the project previewed in the list,
    if any), and the project whose signature it shows. */
function framingOf(view, preview = null) {
  const scene = sceneOf(view);
  const signal = bySlug.get(view.overlay) || (view.base === "projects" ? preview : null);
  let { opacity } = SCENES[scene];
  if (scene === "projects" && signal) opacity = 0.75;                 // previewing a signature
  if (scene === "contact" && view.base === "projects") opacity = 0.18; // keep the list legible
  return { scene, signal, framing: { ...SCENES[scene], opacity, seed: signal ? signal.seed : AMBIENT } };
}

function updateField() {
  const { scene, signal, framing } = framingOf(state, hovered);
  field.set(framing);

  const label = signal ? `SIGNAL ${pad(signal.index + 1)}`
    : scene === "contact" ? "SIGNAL QUIET" : scene === "home" ? "SIGNAL AMBIENT" : "SIGNAL INDEX";
  const stats = field.stats();
  const text = `${stats ? `${stats.cols} × ${stats.rows} POINTS  ·  ` : ""}${label}`;
  if (status.dataset.text !== text) {
    status.dataset.text = text;
    retype(status, text, { speed: 12, still });
  }
}

// Between rows the preview clears, after a beat so that moving from one row
// to the next doesn't flicker back to the index.
const list = $(".index-list");
let gapTimer = 0;
list.addEventListener("pointerover", (e) => {
  const link = e.target.closest(".row-link");
  clearTimeout(gapTimer);
  if (link) previewProject(bySlug.get(link.dataset.slug));
  else gapTimer = setTimeout(() => previewProject(null), 140);
});
list.addEventListener("pointerleave", () => {
  clearTimeout(gapTimer);
  previewProject(null);
});
list.addEventListener("focusin", (e) => previewProject(bySlug.get(e.target.closest(".row-link")?.dataset.slug)));
list.addEventListener("focusout", (e) => { if (!list.contains(e.relatedTarget)) previewProject(null); });

function previewProject(project) {
  if (hovered === project) return;
  hovered = project || null;
  list.classList.toggle("has-hover", !!hovered);
  updateField();
}

/* --------------------------------------------------------------------------
   Probe: the pointer (or a finger held on the field) lifts the surface,
   carets ride the two axes, and the readout reports where it is and the
   surface height under it. Clicking or tapping sends a ripple through it.
   -------------------------------------------------------------------------- */
const band = $(".band");
const readout = $(".readout").firstChild; // its text
const carets = $$(".caret");

// Geometry is measured when it changes (never per frame): the band, and
// the width every panel shares.
let bandRect = band.getBoundingClientRect();
let panelWidth = 0;
const measure = new ResizeObserver(() => {
  bandRect = band.getBoundingClientRect();
  panelWidth = contactPanel.offsetWidth;
});
measure.observe(band);
measure.observe(contactPanel);

let probe = null;       // last probing position
let touchId = null;     // the finger probing the field, if any
let probeFrame = 0;
let probeShown = 0;     // last readout update time
let caretX = null;      // where the carets were last put

const startProbe = (e) => {
  probe = { x: e.clientX, y: e.clientY };
  if (!probeFrame) probeFrame = requestAnimationFrame(updateProbe);
};

function endProbe() {
  probe = null;
  field.pointer(0, 0, false);
  body.classList.remove("is-probing");
}

addEventListener("pointermove", (e) => {
  if (e.pointerType !== "touch" || e.pointerId === touchId) startProbe(e);
}, { passive: true });
document.documentElement.addEventListener("mouseleave", endProbe);

// Fingers only probe from the field itself (the list and panels scroll).
addEventListener("pointerdown", (e) => {
  const touch = e.pointerType === "touch";
  if (e.button !== 0 || e.target.closest("a, button, .panel") || !overField(e.clientX, e.clientY)) return;
  if (touch && !e.target.closest(".band, .about")) return;
  field.ripple(e.clientX - bandRect.left, e.clientY - bandRect.top);
  if (touch && touchId === null) {
    touchId = e.pointerId;
    startProbe(e);
  }
});

const lift = (e) => {
  if (e.pointerId !== touchId) return;
  touchId = null;
  endProbe();
};
addEventListener("pointerup", lift);
addEventListener("pointercancel", lift);

/** Is (x, y) over open field (inside the band, not where a panel is open)? */
function overField(x, y) {
  if (x < bandRect.left || x > bandRect.right || y < bandRect.top || y > bandRect.bottom) return false;
  return !state.overlay || x < bandRect.right - panelWidth;
}

function updateProbe(now) {
  probeFrame = 0;
  if (!probe) return;
  const inside = overField(probe.x, probe.y);
  const x = probe.x - bandRect.left;
  const y = probe.y - bandRect.top;
  field.pointer(x, y, inside);
  body.classList.toggle("is-probing", inside);
  if (probe.x !== caretX) {
    caretX = probe.x;
    for (const caret of carets) caret.style.transform = `translateX(${caretX}px)`;
  }
  if (!inside) return;
  // The surface keeps moving under a still pointer, so keep sampling.
  if (now - probeShown > 70) {
    probeShown = now;
    const surface = field.sample(x, y);
    const z = surface ? `${surface.height < 0 ? "−" : "+"}${Math.abs(surface.height).toFixed(2).padStart(5, "0")}` : "——.——";
    readout.data = `X ${(x / bandRect.width).toFixed(3)}   Y ${(1 - y / bandRect.height).toFixed(3)}   Z ${z}`;
  }
  probeFrame = requestAnimationFrame(updateProbe);
}

/* --------------------------------------------------------------------------
   The list keeps the open project's row inside the band (rows past the axes
   are ghosted by a CSS mask on .index).
   -------------------------------------------------------------------------- */
const index = $(".index");

function revealRow(project) {
  const r = project.row.getBoundingClientRect();
  if (r.top >= bandRect.top && r.bottom <= bandRect.bottom) return;
  const offset = r.top + r.height / 2 - (bandRect.top + bandRect.height / 2);
  index.scrollBy({ top: offset, behavior: still ? "auto" : "smooth" });
}

/* --------------------------------------------------------------------------
   On small screens panels are full-screen sheets: while one is open, the
   page behind it is inert (out of the tab order and the accessibility tree)
   and the field, covered, stops drawing until the sheet lowers.
   -------------------------------------------------------------------------- */
const sheetMedia = matchMedia("(max-width: 720px), (max-width: 1100px) and (orientation: portrait)");
const behindSheet = [$(".masthead"), $(".footer"), index, $(".about")];
let pauseTimer = 0;

function updateSheet() {
  const covered = sheetMedia.matches && !!state.overlay;
  for (const el of behindSheet) el.inert = covered;
  clearTimeout(pauseTimer);
  if (covered) pauseTimer = setTimeout(() => field.pause(true), 1100); // once the sheet is up
  else field.pause(false);
}
sheetMedia.addEventListener("change", updateSheet);

/* --------------------------------------------------------------------------
   Theme: the new palette sweeps up from the bottom line (View Transitions),
   or cross-fades where unsupported (instant when motion is reduced).
   -------------------------------------------------------------------------- */
const themeButtons = $$("[data-theme-set]");
for (const button of themeButtons) {
  button.addEventListener("click", () => setTheme(button.dataset.themeSet));
}

function setTheme(theme) {
  if (theme === body.dataset.theme) return;
  const apply = () => {
    body.dataset.theme = theme;
    field.setTheme(theme);
    for (const b of themeButtons) b.setAttribute("aria-pressed", String(b.dataset.themeSet === theme));
    $('meta[name="theme-color"]').content = theme === "dark" ? "#121212" : "#ededed";
  };
  if (still || !document.startViewTransition) return apply();
  body.classList.add("is-sweeping");
  document.startViewTransition(() => {
    // The sweep reveals the new palette whole: nothing on the page eases
    // into its new colors (hover fades would otherwise start everywhere).
    body.classList.add("is-retheming");
    apply();
    getComputedStyle(body).color; // switch every color now, transitions off
    body.classList.remove("is-retheming");
  }).finished.finally(() => body.classList.remove("is-sweeping"));
}

/* --------------------------------------------------------------------------
   Intro: a single line draws across the middle, parts into the two axes,
   and the flat line of points between them rises into the landscape; then
   the page types itself in. Any input skips ahead. Reduced motion: none of
   it.
   -------------------------------------------------------------------------- */
async function intro() {
  const route = parse();
  const finish = () => {
    body.classList.remove("intro", "intro-draw", "intro-open");
    render(route);
  };
  if (still) {
    finish();
    return;
  }

  const listening = new AbortController();
  const skipped = new Promise((resolve) => {
    for (const type of ["pointerdown", "keydown", "wheel", "touchstart"]) {
      addEventListener(type, resolve, { passive: true, signal: listening.signal });
    }
  });
  const pause = (ms) => Promise.race([wait(ms), skipped]);

  await Promise.race([Promise.all([document.fonts.ready, field.ready]), wait(1600)]);
  body.classList.add("intro-draw");
  field.set({ opacity: 1 }); // the plane, edge-on: a single line of points
  await pause(650);
  body.classList.add("intro-open");
  // The landscape rises on the lines' clock, landing as they land. (Asking
  // for the animations starts them now, so the lines part even when a skip
  // ends the intro in this same task.)
  const parting = $(".axis-top").getAnimations?.().find((a) => a.transitionProperty === "translate");
  field.set(framingOf(route).framing, { along: parting });
  await pause(560);
  listening.abort();
  finish();
  // The page types its own label: the name, then the caption.
  const name = typeIn($(".name a"), { delay: 80, speed: 45 });
  typeIn($(".about"), { delay: name + 120, speed: 9 });
}

intro();
