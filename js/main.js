/* ==========================================================================
   Sheron Yang — page script
   Four views share one screen: home, the project index, a project, and
   contact. The URL hash is the source of truth (#/, #/projects,
   #/projects/<slug>, #/contact), so every view is linkable and the back
   button works; the links still toggle the way the original buttons did.
   ========================================================================== */

import { createField } from "./field.js";
import { startCursor } from "./cursor.js";
import { splitWords, decode } from "./text.js";

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
  contact:  { shot: "trace",     amplitude: 0.65, opacity: 0.85 },
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
splitWords($(".name a"));
for (const panel of [contactPanel, ...projects.map((p) => p.el)]) {
  const heading = $("h2", panel);
  if (heading && !heading.closest(".panel-top")) splitWords(heading);
}

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
        <span class="row-title"><span></span></span>
        <span class="row-meta"></span>
      </a>`;
    $(".row-title > span", row).textContent = p.title;
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
    meta.textContent = p.meta.join("  /  ");
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
      <a href="#/projects/${prev.slug}" data-action="step" data-slug="${prev.slug}"><span aria-hidden="true">←</span> Prev ${pad(prev.index + 1)}</a>
      <a href="#/projects/${next.slug}" data-action="step" data-slug="${next.slug}">Next ${pad(next.index + 1)} <span aria-hidden="true">→</span></a>`;

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

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || body.classList.contains("intro")) return;
  if (state.overlay) navigate({ base: state.base, overlay: null });
  else if (state.base === "projects") navigate({ base: "home", overlay: null });
});

addEventListener("popstate", () => render(parse()));

function render(next) {
  const prev = state;
  state = next;
  body.dataset.view = next.base;
  body.dataset.overlay = next.overlay === "contact" ? "contact" : next.overlay ? "project" : "";

  for (const link of $$(".nav [data-action]")) {
    const on = link.dataset.action === "projects" ? next.base === "projects" : next.overlay === "contact";
    if (on) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
  }
  for (const p of projects) {
    p.row.classList.toggle("is-active", p.slug === next.overlay);
    if (p.slug === next.overlay) p.link.setAttribute("aria-current", "true"); else p.link.removeAttribute("aria-current");
  }

  swapPanels(prev.overlay, next.overlay);
  if (next.base === "projects" && prev.base !== "projects") requestAnimationFrame(refreshBands);
  updateField();

  const project = bySlug.get(next.overlay);
  document.title = project ? `${project.title} — Sheron Yang`
    : next.overlay === "contact" ? "Contact — Sheron Yang"
    : next.base === "projects" ? "Projects — Sheron Yang" : "Sheron Yang";
}

const panelOf = (overlay) => (overlay === "contact" ? contactPanel : bySlug.get(overlay)?.el ?? null);

function swapPanels(fromKey, toKey) {
  const from = panelOf(fromKey);
  const to = panelOf(toKey);
  if (from === to) return;
  const focusInside = from && from.contains(document.activeElement);

  // Project to project: cross-fade in place instead of sliding out and in.
  const swap = from?.classList.contains("project") && to?.classList.contains("project");
  for (const el of [from, to]) if (el) el.classList.toggle("is-swap", !!swap);
  if (to) {
    to.getBoundingClientRect(); // commit the start state before opening
    $(".panel-scroll", to)?.scrollTo(0, 0);
    to.classList.add("is-open");
    if (!body.classList.contains("intro")) $("h2", to).focus({ preventScroll: true });
  }
  if (from) {
    from.classList.remove("is-open");
    setTimeout(() => from.classList.remove("is-swap"), 700);
    if (focusInside && !to) (trigger?.isConnected ? trigger : $(".nav a")).focus({ preventScroll: true });
  }
  if (to && swap) setTimeout(() => to.classList.remove("is-swap"), 700);
}

/* --------------------------------------------------------------------------
   The field follows the view; hovering a project previews its signature.
   -------------------------------------------------------------------------- */
const status = $(".status");

function updateField() {
  const scene = sceneOf(state);
  const signal = bySlug.get(state.overlay) || (state.base === "projects" ? hovered : null);
  let { opacity } = SCENES[scene];
  if (scene === "projects" && signal) opacity = 0.75;                // previewing a signature
  if (scene === "contact" && state.base === "projects") opacity = 0.18; // keep the list legible
  field.set({ ...SCENES[scene], opacity, seed: signal ? signal.seed : AMBIENT });

  const label = signal ? `SIGNAL ${pad(signal.index + 1)}`
    : scene === "contact" ? "SIGNAL QUIET" : scene === "home" ? "SIGNAL AMBIENT" : "SIGNAL INDEX";
  const stats = field.stats();
  const text = `${stats ? `${stats.cols} × ${stats.rows} POINTS  ·  ` : ""}${label}`;
  if (status.dataset.text !== text) {
    status.dataset.text = text;
    decode(status, text, { duration: 420, still });
  }
}

const list = $(".index-list");
list.addEventListener("pointerover", (e) => {
  const link = e.target.closest(".row-link");
  if (link) previewProject(bySlug.get(link.dataset.slug));
});
list.addEventListener("pointerleave", () => previewProject(null));
list.addEventListener("focusin", (e) => previewProject(bySlug.get(e.target.closest(".row-link")?.dataset.slug)));
list.addEventListener("focusout", (e) => { if (!list.contains(e.relatedTarget)) previewProject(null); });

function previewProject(project) {
  if (hovered === project) return;
  hovered = project || null;
  list.classList.toggle("has-hover", !!hovered);
  updateField();
}

/* --------------------------------------------------------------------------
   Probe: the pointer lifts the field, carets ride the two axes, and the
   readout reports where the pointer is and the surface height under it.
   Clicking the field sends a ripple through it.
   -------------------------------------------------------------------------- */
const band = $(".band");
const readout = $(".readout");
const carets = $$(".caret");
let bandRect = band.getBoundingClientRect();
new ResizeObserver(() => (bandRect = band.getBoundingClientRect())).observe(band);

let probe = null;       // last mouse position
let probeFrame = 0;
let probeShown = 0;     // last readout update time

addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  probe = { x: e.clientX, y: e.clientY };
  if (!probeFrame) probeFrame = requestAnimationFrame(updateProbe);
}, { passive: true });
document.documentElement.addEventListener("mouseleave", () => {
  probe = null;
  field.pointer(0, 0, false);
  body.classList.remove("is-probing");
});

/** Is (x, y) over open field (inside the band, not under a panel)? */
function overField(x, y) {
  if (x < bandRect.left || x > bandRect.right || y < bandRect.top || y > bandRect.bottom) return false;
  const panel = panelOf(state.overlay);
  return !panel || x < panel.getBoundingClientRect().left;
}

function updateProbe(now) {
  probeFrame = 0;
  if (!probe) return;
  const inside = overField(probe.x, probe.y);
  const x = probe.x - bandRect.left;
  const y = probe.y - bandRect.top;
  field.pointer(x, y, inside);
  body.classList.toggle("is-probing", inside);
  for (const caret of carets) caret.style.transform = `translateX(${probe.x}px)`;
  if (!inside) return;
  // The surface keeps moving under a still pointer, so keep sampling.
  if (now - probeShown > 70) {
    probeShown = now;
    const surface = field.sample(x, y);
    const z = surface ? `${surface.height < 0 ? "−" : "+"}${Math.abs(surface.height).toFixed(2).padStart(5, "0")}` : "——.——";
    readout.textContent = `X ${(x / bandRect.width).toFixed(3)}   Y ${(1 - y / bandRect.height).toFixed(3)}   Z ${z}`;
  }
  probeFrame = requestAnimationFrame(updateProbe);
}

addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || e.target.closest("a, button, .panel") || !overField(e.clientX, e.clientY)) return;
  field.ripple(e.clientX - bandRect.left, e.clientY - bandRect.top);
});

/* --------------------------------------------------------------------------
   Index rows are fully opaque only while their center sits between the two
   lines; past a line they snap (never fade) to a low opacity, so rows stay
   visible beyond the band instead of being clipped.
   -------------------------------------------------------------------------- */
const index = $(".index");
const OUT_OF_BAND_OPACITY = "0.15"; // set to "0" to hide rows entirely

function refreshBands() {
  const topY = bandRect.top;
  const bottomY = bandRect.bottom;
  for (const p of projects) {
    const rect = p.row.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const desired = center >= topY && center <= bottomY ? "" : OUT_OF_BAND_OPACITY;
    if (p.row.style.opacity !== desired) p.row.style.opacity = desired;
  }
}

let bandsQueued = false;
const queueBands = () => {
  if (bandsQueued) return;
  bandsQueued = true;
  requestAnimationFrame(() => { bandsQueued = false; refreshBands(); });
};
index.addEventListener("scroll", queueBands, { passive: true });
addEventListener("resize", queueBands);

/* --------------------------------------------------------------------------
   Theme: the new palette sweeps up from the bottom line (View Transitions),
   or switches instantly where unsupported or motion is reduced.
   -------------------------------------------------------------------------- */
for (const button of $$("[data-theme-set]")) {
  button.addEventListener("click", () => setTheme(button.dataset.themeSet));
}

function setTheme(theme) {
  if (theme === body.dataset.theme) return;
  const apply = () => {
    body.dataset.theme = theme;
    field.setTheme(theme);
    for (const b of $$("[data-theme-set]")) b.setAttribute("aria-pressed", String(b.dataset.themeSet === theme));
    $('meta[name="theme-color"]').content = theme === "dark" ? "#121212" : "#ededed";
  };
  if (still || !document.startViewTransition) return apply();
  body.classList.add("is-sweeping");
  document.startViewTransition(apply).finished.finally(() => body.classList.remove("is-sweeping"));
}

/* --------------------------------------------------------------------------
   Intro: a single line draws across the middle, parts into the two axes,
   and the flat line of points between them rises into the landscape; then
   the type arrives. Any input skips ahead. Reduced motion: no choreography.
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

  let skipped = false;
  const listening = new AbortController();
  for (const type of ["pointerdown", "keydown", "wheel", "touchstart"]) {
    addEventListener(type, () => (skipped = true), { passive: true, signal: listening.signal });
  }
  const pause = async (ms) => { const end = performance.now() + ms; while (!skipped && performance.now() < end) await wait(30); };

  await Promise.race([Promise.all([document.fonts.ready, field.ready]), wait(1600)]);
  body.classList.add("intro-draw");
  field.set({ opacity: 1 }); // the plane, edge-on: a single line of points
  await pause(650);
  body.classList.add("intro-open");
  field.set(SCENES[sceneOf(route)]);
  await pause(560);
  listening.abort();
  finish();
  decode(readout, readout.textContent, { duration: 600, delay: 500, still });
}

intro();
