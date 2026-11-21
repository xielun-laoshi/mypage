/* ==========================================================================
   Sheron Yang — page script
   The views share one screen: home, the two lists (projects, blog posts),
   a project, a post, and contact. The URL hash is the source of truth (#/,
   #/projects, #/projects/<slug>, #/blogs, #/blogs/<slug>, #/contact), so
   every view is linkable and the back button works; the links still toggle
   the way the original buttons did.
   ========================================================================== */

import { createBackground } from "./background.js";
import { createBlog } from "./blog.js";
import { createClearing } from "./clearing.js";
import { startCursor } from "./cursor.js";
import { typeFrame } from "./frame.js";
import { typeIn, strikeOut, typing, cut } from "./text.js";
import { createWave } from "./wave.js";

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pad = (n) => String(n).padStart(2, "0");

const body = document.body;
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* The field's framing for each view (see SHOTS in field.js). On its own
   the band stands out; where words lie over it (the project list, a
   project) it recedes, struck fainter and flatter. (Contrast is the typed
   screen's, see js/ascii.js: above 1 the light spreads, below it evens
   out.) */
const SCENES = {
  home:     { shot: "landscape", amplitude: 1,    opacity: 1,    contrast: 1.4 },
  projects: { shot: "texture",   amplitude: 1,    opacity: 0.35, contrast: 0.6 },
  project:  { shot: "texture",   amplitude: 1,    opacity: 0.25, contrast: 0.5 },
  contact:  { shot: "calm",      amplitude: 0.45, opacity: 0.85, contrast: 1 },
};
const AMBIENT = [0, 0];
const sceneOf = ({ base, overlay }) => (overlay === "contact" ? "contact" : overlay ? "project" : base === "home" ? "home" : "projects");

/* The frame, typed on the band's grid of characters (js/frame.js): the
   rulers, their carets and the name. Then the field: the band's
   background, the particle field or the one the visitor chose last
   (js/background.js), which lays that grid out. Where the page's words lie
   over the band (the caption, the readout, the project row under the
   pointer), its characters make way for them, around the letters
   themselves (js/clearing.js). */
const frame = typeFrame({ still });
let makeWay = () => {}; // (the screen's, once the background is there: the grid is laid out while it is made)
const clearing = createClearing({ band: $(".band"), still, apply: (goal, how) => makeWay(goal, how) });
const field = createBackground($(".band"), {
  canvas: $(".field"),
  theme: body.dataset.theme,
  still,
  dense: innerWidth * Math.min(devicePixelRatio, 2) >= 1400 && (navigator.hardwareConcurrency || 4) >= 4,
  onchange: (dropped) => showMode(dropped),
  onlayout: (layout) => {
    frame.setGrid(layout);
    clearing.setGrid(layout);
  },
});
makeWay = field.clear;
document.fonts?.ready.then(() => clearing.refresh()); // (words measure differently in the page's own face)
// The ring is set on paper where it crosses the band's characters, and
// over words (or a panel) it is the characters alone.
startCursor($(".cursor"), { paper: (x, y) => overField(x, y) && !clearing.cleared(x, y) });

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

/* The blog (js/blog.js): its posts, each with a sheet to be read on, and
   none of their text until one is wanted. A post has a project's parts
   (slug, title, meta, seed, and its sheet as `el`), so the two lists, the
   field's previews and the panels are handled alike. */
const blog = createBlog($("main"), { column: (x) => frame.column(x) });
const posts = blog.posts;
const postOf = (panel) => posts.find((post) => post.el === panel) || null;

/* The two lists: where each is on the page, what is in it, and the kind
   of link its rows are. */
const lists = {
  projects: { el: $('.index[data-list="projects"]'), items: projects, bySlug, action: "project" },
  blogs: { el: $('.index[data-list="blogs"]'), items: posts, bySlug: new Map(posts.map((post) => [post.slug, post])), action: "post" },
};
const listOf = (base) => (Object.hasOwn(lists, base) ? lists[base] : null);
/** The project or post a view has open, if any. */
const entryOf = ({ base, overlay }) => (overlay && overlay !== "contact" ? listOf(base)?.bySlug.get(overlay) ?? null : null);

// (Rows arrive one after another; past this many, with the last of them,
// so that a long list is not kept waiting for its end.)
const LATEST = 12;
for (const base in lists) buildIndex(base, lists[base]);
buildPanels();

/** A list's rows, built from its entries (a project's from its article's
    data-title / data-meta, a post's from blog/posts.js): number, title and
    specs, and under a post's, what it is about. */
function buildIndex(base, list) {
  const { el, items, action } = list;
  const rows = $(".index-list", el);
  if (!items.length) {
    // (A list with nothing in it says so, where its first row would be.)
    const row = document.createElement("li");
    row.className = "row row-none";
    row.style.setProperty("--i", 0);
    row.innerHTML = `<span class="row-no">${pad(0)}</span><span class="row-title">Nothing here yet</span>`;
    list.none = $(".row-title", row);
    rows.append(row);
  }
  for (const item of items) {
    item.base = base;
    const row = document.createElement("li");
    row.className = "row";
    row.style.setProperty("--i", Math.min(item.index, LATEST));
    row.innerHTML = `
      <a class="row-link" href="#/${base}/${item.slug}" data-action="${action}" data-slug="${item.slug}">
        <span class="row-no">${pad(item.index + 1)}</span>
        <span class="row-title"></span>
        <span class="row-meta"></span>
        ${item.summary ? '<span class="row-summary"></span>' : ""}
      </a>`;
    item.rowTitle = $(".row-title", row);
    item.rowTitle.textContent = item.title;
    $(".row-meta", row).textContent = item.meta.join("  /  ");
    if (item.summary) $(".row-summary", row).textContent = item.summary;
    item.row = row;
    item.link = $(".row-link", row);
    rows.append(row);
  }
  $(`.nav [data-action="${base}"] .count`).textContent = pad(items.length);
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
   Routing. state = { base: "home" | "projects" | "blogs", overlay: null |
   "contact" | <the slug of a project or post in that base's list> }.
   Contact opens over whichever base was showing.
   -------------------------------------------------------------------------- */
let state = { base: "home", overlay: null };
let trigger = null;   // the link that opened the current overlay
let hovered = null;   // the project or post under the pointer / keyboard focus in its list
let back = false;     // the next change steps back (to the project before)
let fresh = false;    // the change under way was asked for by a link (navigate), not by Back or Forward
const navLinks = $$(".nav [data-action]");

function parse() {
  const [section, slug] = location.hash.replace(/^#\/?/, "").split("/");
  if (listOf(section)) return { base: section, overlay: lists[section].bySlug.has(slug) ? slug : null };
  if (section === "contact") return { base: listOf(history.state?.base) ? history.state.base : "home", overlay: "contact" };
  return { base: "home", overlay: null };
}

function hashFor({ base, overlay }) {
  if (overlay === "contact") return "#/contact";
  if (overlay) return `#/${base}/${overlay}`;
  return base === "home" ? "" : `#/${base}`;
}

function navigate(next) {
  if (next.base === state.base && next.overlay === state.overlay) return;
  history.pushState({ base: next.base }, "", hashFor(next) || location.pathname + location.search);
  fresh = true; // (gone to by a link, not come back to through the history: see swapPanels)
  render(next);
  fresh = false;
}

/** Where a link leads from the current state (links toggle). `list` is
    the list a step belongs to (the projects', unless the link says). */
function targetOf(action, slug, list = "projects") {
  const { base, overlay } = state;
  const entry = (to) => (base === to && overlay === slug ? { base: to, overlay: null } : { base: to, overlay: slug });
  switch (action) {
    case "home":     return { base: "home", overlay: null };
    case "projects":
    case "blogs":    return base === action ? { base: "home", overlay: null } : { base: action, overlay: null };
    case "contact":  return overlay === "contact" ? { base, overlay: null } : { base, overlay: "contact" };
    case "project":  return entry("projects");
    case "post":     return entry("blogs");
    case "step":     return { base: list, overlay: slug };
    default:         return { base, overlay: null }; // close
  }
}

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-action]");
  if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  const { action, slug, base } = link.dataset;
  if (action === "retry") return void blog.load(lists.blogs.bySlug.get(slug)); // (a post that didn't come is sent for again)
  if (action !== "step" && action !== "close") trigger = link;
  back = action === "step" && !link.previousElementSibling;
  navigate(targetOf(action, slug, base));
});

// Escape steps back out; ← / → page through projects while one is open.
// (Not through posts: in a post those keys belong to what is being read,
// a block of code scrolled sideways, a demo's slider.)
document.addEventListener("keydown", (e) => {
  if (body.classList.contains("intro") || e.altKey || e.ctrlKey || e.metaKey) return;
  const project = state.base === "projects" ? bySlug.get(state.overlay) : null;
  if (e.key === "Escape") {
    if (state.overlay) navigate({ base: state.base, overlay: null });
    else if (state.base !== "home") navigate({ base: "home", overlay: null });
  } else if (project && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : -1;
    back = step < 0;
    navigate({ base: "projects", overlay: projects[(project.index + step + projects.length) % projects.length].slug });
  }
});

addEventListener("popstate", () => render(parse()));

function render(next) {
  const prev = state;
  const from = panelOf(prev);
  state = next;
  const entry = entryOf(next);
  body.dataset.view = next.base;
  body.dataset.overlay = next.overlay === "contact" ? "contact" : !entry ? "" : next.base === "blogs" ? "post" : "project";

  for (const link of navLinks) {
    const on = link.dataset.action === "contact" ? next.overlay === "contact" : next.base === link.dataset.action;
    if (on) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
  }
  for (const { items } of Object.values(lists)) {
    for (const item of items) {
      item.row.classList.toggle("is-active", item === entry);
      if (item === entry) item.link.setAttribute("aria-current", "true"); else item.link.removeAttribute("aria-current");
    }
  }

  if (entry?.base === "blogs") blog.load(entry); // (a post's text is sent for as its sheet opens, if it isn't here yet)
  updateSheet(); // (first: the page behind a sheet that is closing must be there to take the focus back)
  swapPanels(from, panelOf(next), back);
  back = false;
  if (next.base !== prev.base) preview(null); // (the pointer is on the nav, not on a row of the list that has gone)
  clearRow(listOf(next.base) ? hovered : null);
  if (listOf(next.base) && next.base !== prev.base) {
    // The list prints itself, row by row.
    const { items, none } = lists[next.base];
    for (const item of items) typeIn(item.rowTitle, { delay: 60 + Math.min(item.index, LATEST) * 70, speed: 7, still });
    if (none) typeIn(none, { delay: 60, speed: 7, still });
    strikeCaption();
  } else if (next.base === "home" && prev.base !== "home") {
    typeCaption(120); // back home, the caption types itself in again
  }
  updateField();

  if (entry) requestAnimationFrame(() => revealRow(entry)); // (a post's row too, under its sheet: it is in view when the sheet closes)
  const section = next.base === "projects" ? "Projects" : next.base === "blogs" ? "Blogs" : "";
  document.title = entry ? `${entry.title} — Sheron Yang`
    : next.overlay === "contact" ? "Contact — Sheron Yang"
    : section ? `${section} — Sheron Yang` : "Sheron Yang";
}

/** The panel a view has open (contact's, a project's, a post's sheet), if any. */
const panelOf = (view) => (view.overlay === "contact" ? contactPanel : entryOf(view)?.el ?? null);

// Panels open at the top. Only those scrolled away from it are reset
// (scrolling forces a layout).
const scrolled = new Set();
for (const scroller of $$(".panel-scroll")) {
  scroller.addEventListener("scroll", () => { if (scroller.scrollTop > 0) scrolled.add(scroller); }, { passive: true });
}

/* Panels change as the band does, in characters (js/wave.js): an arriving
   panel's place fills with them, cell by cell from the side it comes from
   (from below, on a phone), until it is paper; then it shows and types
   itself in. A panel leaving is taken by the wave as it passes: its cells
   blank to paper and step back down through the characters into the page
   (the panel stays in sight, .is-leaving, cut away behind the wave's
   paper). Project to project, the next one fills in over the last (from
   the left when stepping back). The panel is open (and its heading
   focused) from the start, only hidden from sight (.is-veiled) until its
   place is filled. */
const wipe = createWave({ still });
const wipeCanvas = $(".wipe");
let quiet = null; // a link being handed the focus back from a sheet (see swapPanels)
const FILL = 520;  // ms
const CLEAR = 440;

/** Whether a panel is a sheet over the whole page: any panel on a small
    screen, a post's on every screen. */
const isSheet = (panel) => sheetMedia.matches || panel.classList.contains("post");

function swapPanels(from, to, back = false) {
  if (from === to) return;
  wipe.finish(); // a change still under way lands first
  const focusInside = from && from.contains(document.activeElement);
  if (from) {
    from.classList.remove("is-open");
    from.classList.add("is-leaving"); // in sight until the next one covers it, or the wave has taken it
    const left = postOf(from);
    if (left) blog.reading(left, false); // (its demos stop as it goes)
    if (!to && focusInside) {
      // The focus goes back to where the panel was opened from; failing
      // that (its address was come to directly, or that link is a row of
      // the other list by now), to the link of the section this is. From
      // a sheet, which had the whole page, it goes back quietly: a row is
      // not lit for it as for a row the reader has come to (see `preview`
      // below), unless the keyboard is in use and the focus is shown.
      const section = $(`.nav [data-action="${from === contactPanel ? "contact" : state.base}"]`) || $(".nav a");
      const home = trigger?.isConnected ? trigger : section;
      quiet = isSheet(from) ? home : null;
      home.focus({ preventScroll: true });
      if (document.activeElement !== home) section.focus({ preventScroll: true });
      quiet = null;
    }
  }
  if (to) {
    // A panel opens at its top, and so does a post opened from the list.
    // A post come back to through the history (Back, Forward) is found
    // where the reader left it, as a page is.
    const scroller = $(".panel-scroll", to);
    if ((fresh || !postOf(to)) && scrolled.delete(scroller)) scroller.scrollTo(0, 0);
    to.classList.add("is-open");
    if (!body.classList.contains("intro")) $("h2", to).focus({ preventScroll: true });
  }
  // A sheet that gives way to a side panel (a step back through history
  // can ask for it) is taken off it: the panel is there beneath, at once.
  const beneath = !!from && !!to && isSheet(from) && !isSheet(to);
  if (!to || beneath) {
    const sheet = isSheet(from);
    wipeCanvas.classList.toggle("over", sheet); // (a sheet covers the frame: the wave goes over it)
    if (beneath) typeOut(to);
    wipe.start({
      rect: from.getBoundingClientRect(),
      mode: "clear",
      from: sheet ? "top" : "left",
      ms: CLEAR,
      cover: (px) => { from.style.clipPath = sheet ? `inset(${px}px 0 0 0)` : `inset(0 0 0 ${px}px)`; },
      done: () => {
        from.classList.remove("is-leaving");
        from.style.clipPath = "";
      },
    });
    return;
  }
  const sheet = isSheet(to);
  wipeCanvas.classList.toggle("over", sheet);
  to.classList.add("is-veiled");
  wipe.start({
    rect: to.getBoundingClientRect(),
    mode: "fill",
    from: sheet ? "bottom" : back ? "left" : "right",
    ms: FILL,
    done: () => {
      const post = postOf(to);
      if (post) blog.reading(post, true); // (brought up to date before it is seen; its demos may run now)
      typeOut(to); // (set up while still out of sight, so its timings hold from the first frame)
      from?.classList.remove("is-leaving");
      to.classList.remove("is-veiled");
    },
  });
}

/** Sets a block up to print a line at a time, `delay` ms from now, `most`
    lines at the most (main.css runs it from --lines and --delay). */
function print(block, delay, most = Infinity) {
  const line = parseFloat(getComputedStyle(block).lineHeight) || 24;
  block.style.setProperty("--lines", Math.min(most, Math.max(1, Math.round(block.offsetHeight / line))));
  block.style.setProperty("--delay", `${delay}ms`);
}

/** A panel types itself in once it shows: its top line (close, count),
    then its heading, its spec lines close behind it (their rules typing
    out as the first key lands), its paragraphs printing a line at a time
    (a post's as far as the reader can see: printPost), then the steps to
    the next; the contact links one after another, each row arriving as
    its link starts to type, then the source line. */
function typeOut(panel) {
  for (const label of $$(".panel-top > *", panel)) typeIn(label, { delay: 0, speed: 14, still });
  if (panel === contactPanel) {
    const rows = $$(".contact-list li", panel);
    rows.forEach((row, i) => {
      const delay = 120 + i * 160;
      row.style.setProperty("--delay", `${delay}ms`);
      typeIn($("a", row), { delay, speed: 30, still });
    });
    print($(".source", panel), 120 + rows.length * 160);
    return;
  }
  // (A long heading would hold the page back: what is under it follows it
  // closely instead, as a terminal prints.)
  const heading = Math.min(typeIn($("h2", panel), { delay: 40, speed: 5, still }), 360);
  const meta = $(".panel-meta", panel);
  meta.style.setProperty("--delay", `${heading + 40}ms`);
  typeIn(meta, { delay: heading + 40, speed: 6, still });
  if (postOf(panel)) printPost(panel, heading + 160);
  else $$(".panel-body > :not(h2, .panel-meta)", panel).forEach((block, i) => print(block, heading + 160 + i * 110));
  $$(".panel-steps a", panel).forEach((step, i) => typeIn(step, { delay: heading + 300 + i * 120, speed: 14, still }));
}

/** A post prints as far as the reader can see: the blocks of its first
    screen, a line at a time, from `start` ms on, and beside them the list
    of its sections. What is further down is there already. */
const PRINTED = 12; // the most blocks that print (a tall window's first screen)
function printPost(panel, start) {
  for (const block of $$(".prints", panel)) block.classList.remove("prints");
  // The first screen's blocks: those that start above its foot, with the
  // sheet at its top. (How many that is follows the window and the
  // layout: main.css.)
  const scroller = $(".panel-scroll", panel);
  const top = scroller.getBoundingClientRect().top - scroller.scrollTop;
  const first = [$(".post-lead", panel), ...$$(".post-text > *", panel)]
    .filter((block) => block.getClientRects().length && block.getBoundingClientRect().top - top < scroller.clientHeight)
    .slice(0, PRINTED);
  // (The list of sections, beside the text in a wide window, comes with the text's first lines.)
  [...first.map((block, i) => [block, start + i * 110]), [$(".post-contents", panel), start + 110]].forEach(([block, delay]) => {
    print(block, delay, 12);
    block.classList.add("prints");
  });
}

// A post's text may come after its sheet has opened: it prints as it lands.
blog.onset = (post) => {
  if (post.el.classList.contains("is-open") && !post.el.classList.contains("is-veiled")) printPost(post.el, 0);
};

/* --------------------------------------------------------------------------
   The field follows the view; hovering a project previews its signature.
   -------------------------------------------------------------------------- */

/** The field's framing for a view (with the project previewed in the list,
    if any), and the project whose signature it shows. */
function framingOf(view, preview = null) {
  const scene = sceneOf(view);
  const signal = entryOf(view) || (listOf(view.base) ? preview : null);
  let { opacity, contrast } = SCENES[scene];
  if (scene === "projects" && signal) opacity = 0.55; // previewing a signature
  if (scene === "contact" && view.base !== "home") {
    opacity = 0.15; // keep the list legible
    contrast = 0.5;
  }
  return { scene, signal, framing: { ...SCENES[scene], opacity, contrast, seed: signal ? signal.seed : AMBIENT } };
}

function updateField() {
  field.set(framingOf(state, hovered).framing);
}

// Between rows the preview clears, after a beat so that moving from one row
// to the next doesn't flicker back to the index.
let gapTimer = 0;
let wanted = 0; // (a post about to be sent for: see below)
for (const { el, bySlug: entries } of Object.values(lists)) {
  const rows = $(".index-list", el);
  const entryAt = (target) => entries.get(target.closest(".row-link")?.dataset.slug) || null;
  rows.addEventListener("pointerover", (e) => {
    const entry = entryAt(e.target);
    clearTimeout(gapTimer);
    clearTimeout(wanted);
    if (entry) {
      preview(entry);
      // A post the pointer rests on is sent for, as it is likely to be
      // opened (not for visitors who asked their browser to save data).
      if (entry.base === "blogs" && !navigator.connection?.saveData) wanted = setTimeout(() => blog.load(entry), 120);
    } else gapTimer = setTimeout(() => preview(null), 140);
  });
  rows.addEventListener("pointerleave", () => {
    clearTimeout(gapTimer);
    clearTimeout(wanted);
    preview(null);
  });
  rows.addEventListener("focusin", (e) => {
    if (e.target !== quiet || e.target.matches(":focus-visible")) preview(entryAt(e.target));
  });
  rows.addEventListener("focusout", (e) => { if (!rows.contains(e.relatedTarget)) preview(null); });
}

/** The entry under the pointer (or the keyboard's focus) in its list: the
    band previews its signature, and makes way for its row. */
function preview(entry) {
  if (hovered === entry) return;
  if (hovered) $(".index-list", lists[hovered.base].el).classList.remove("has-hover");
  hovered = entry || null;
  if (hovered) $(".index-list", lists[hovered.base].el).classList.add("has-hover");
  updateField();
  clearRow(listOf(state.base) ? hovered : null);
}

/* The band makes way for the row under the pointer, as it does for the
   caption (js/clearing.js): its number, its title and its specs stand
   clear of the signature it previews, which plays around them. And where
   the pointer itself is on the row, the surface it lifts gathers against
   the row's words (`gather`: see GATHER in js/ascii.js), so the band goes
   on answering the pointer there instead of going blank under it. */
const rowWords = new Map(); // project or post -> its row's words, from the first time it is pointed at
let cleared = null;         // the one whose row the band has made way for
let settled = 0;

function clearRow(entry) {
  if (cleared === entry) return;
  if (cleared) rowWords.get(cleared).hide();
  cleared = entry || null;
  clearTimeout(settled);
  if (!cleared) return;
  if (!rowWords.has(cleared)) {
    // (Its arrow is not text: it is set down as a mark, after the number.)
    rowWords.set(cleared, clearing.add(cleared.link, { marks: { ".row-no": `${pad(cleared.index + 1)} ->` }, gather: true }));
  }
  rowWords.get(cleared).show();
  // The title steps over a character once its arrow has typed (main.css):
  // the row is measured again where it then stands.
  settled = setTimeout(() => clearing.refresh(), 280);
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
let caretX = null;      // the column the carets were last put on (its left edge)

const startProbe = (e) => {
  probe = { x: e.clientX, y: e.clientY };
  if (!probeFrame) probeFrame = requestAnimationFrame(updateProbe);
};

function endProbe() {
  probe = null;
  field.pointer(0, 0, false);
  setProbing(false);
}

/** The readout lights while the pointer probes the field. (Where nothing
    hovers, it shows only then: the band makes way for it only then.) */
const hoverless = matchMedia("(hover: none)");
let probing = false;
function setProbing(on) {
  if (on === probing) return;
  probing = on;
  body.classList.toggle("is-probing", on);
  if (!hoverless.matches) return;
  if (on) reading.show();
  else reading.hide();
}

addEventListener("pointermove", (e) => {
  if (e.pointerType !== "touch" || e.pointerId === touchId) startProbe(e);
}, { passive: true });
document.documentElement.addEventListener("mouseleave", endProbe);

// Fingers only probe from the field itself (the list and panels scroll).
addEventListener("pointerdown", (e) => {
  const touch = e.pointerType === "touch";
  if (e.button !== 0 || e.target.closest("a, button, input, select, textarea, summary, [contenteditable], [role='button'], [role='link'], .panel") || !overField(e.clientX, e.clientY)) return;
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

/** Is (x, y) over open field (inside the band, not where a panel is open,
    nor under a sheet)? */
function overField(x, y) {
  if (x < bandRect.left || x > bandRect.right || y < bandRect.top || y > bandRect.bottom) return false;
  const panel = panelOf(state);
  return !panel || (!isSheet(panel) && x < bandRect.right - panelWidth);
}

function updateProbe(now) {
  probeFrame = 0;
  if (!probe) return;
  const inside = overField(probe.x, probe.y);
  const x = probe.x - bandRect.left;
  const y = probe.y - bandRect.top;
  field.pointer(x, y, inside);
  setProbing(inside);
  const column = frame.column(probe.x);
  if (column !== caretX) {
    caretX = column;
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
   A list keeps the open project's row inside the band (rows past the axes
   are ghosted by a CSS mask on .index).
   -------------------------------------------------------------------------- */

// A list scrolls under the pointer: the clearing keeps to the row.
let rowMoved = 0;
for (const { el } of Object.values(lists)) {
  el.addEventListener("scroll", () => {
    if (!cleared || rowMoved) return;
    rowMoved = requestAnimationFrame(() => {
      rowMoved = 0;
      if (cleared) clearing.refresh();
    });
  }, { passive: true });
}

function revealRow(entry) {
  const r = entry.row.getBoundingClientRect();
  if (r.top >= bandRect.top && r.bottom <= bandRect.bottom) return;
  const offset = r.top + r.height / 2 - (bandRect.top + bandRect.height / 2);
  lists[entry.base].el.scrollBy({ top: offset, behavior: still ? "auto" : "smooth" });
}

/* --------------------------------------------------------------------------
   On small screens panels are full-screen sheets, and a post's is on every
   screen: while one is open, the page behind it is inert (out of the tab
   order and the accessibility tree) and the field, covered, stops drawing
   until the sheet lowers.
   -------------------------------------------------------------------------- */
const sheetMedia = matchMedia("(max-width: 720px), (max-width: 1100px) and (orientation: portrait)");
const behindSheet = [$(".masthead"), $(".footer"), ...Object.values(lists).map(({ el }) => el), $(".about")];
let pauseTimer = 0;

function updateSheet() {
  const panel = panelOf(state);
  const covered = !!panel && isSheet(panel);
  for (const el of behindSheet) el.inert = covered;
  clearTimeout(pauseTimer);
  if (covered) pauseTimer = setTimeout(() => field.pause(true), 1100); // once the sheet is up
  else field.pause(false);
}
sheetMedia.addEventListener("change", updateSheet);

/* --------------------------------------------------------------------------
   Theme: the new palette is typed over the old, cell by cell, in a wave
   that spreads from the switch pressed (js/wave.js, "turn"). The browser
   holds the page as it was and shows the page as it now is through a round
   opening that grows from the switch (a view transition); the wave's
   cells, each a character on paper while it turns over, lie over the
   opening's edge, so all that is seen is the cells turning. Where the
   browser can't, or motion is reduced, the palette changes at once.
   -------------------------------------------------------------------------- */
const themeButtons = $$("[data-theme-set]");
for (const button of themeButtons) {
  button.addEventListener("click", () => {
    const box = button.getBoundingClientRect();
    setTheme(button.dataset.themeSet, { x: box.left + box.width / 2, y: box.top + box.height / 2 });
  });
}
const wave = createWave({ still, name: "wave" });
const TURNING = 1000; // ms
// (Its side of the GPU is made as the pointer, or the keyboard's focus,
// comes to a switch, so that a press finds it ready.)
for (const button of themeButtons) {
  for (const type of ["pointerenter", "focus"]) button.addEventListener(type, () => wave.prepare(), { once: true });
}

/** The page's palette as it is now (see looksFor in js/wave.js). */
function palette() {
  const style = getComputedStyle(body);
  return { paper: style.getPropertyValue("--bg").trim(), ink: style.getPropertyValue("--ink").trim(), theme: body.dataset.theme };
}

/** Runs `task` in an idle moment (or soon, where there are none). */
const idle = (task) => (window.requestIdleCallback ? requestIdleCallback(task, { timeout: 4000 }) : setTimeout(task, 1500));

/** Changes the theme, the wave spreading from `from` (a point of the
    page: the switch pressed; the middle if none is given). */
function setTheme(theme, from = { x: innerWidth / 2, y: innerHeight / 2 }) {
  if (theme === body.dataset.theme) return;
  const apply = () => {
    body.dataset.theme = theme;
    field.setTheme(theme);
    for (const b of themeButtons) b.setAttribute("aria-pressed", String(b.dataset.themeSet === theme));
    $('meta[name="theme-color"]').content = theme === "dark" ? "#121212" : "#ededed";
  };
  // (The panels' characters, struck again for the new palette, in time for
  // the next panel.)
  if (still || !document.startViewTransition) {
    apply();
    idle(() => wipe.prepare());
    return;
  }
  const before = palette();
  let plan = null; // how far the wave goes, and when everything is under it (see start in js/wave.js)
  let opening = null; // the new page's opening, as it grows
  body.classList.add("is-sweeping");
  const sweep = sweeping = document.startViewTransition(() => {
    // The palette switches whole: nothing on the page eases into its new
    // colors (hover fades would otherwise start everywhere).
    body.classList.add("is-retheming");
    apply();
    getComputedStyle(body).color; // switch every color now, transitions off
    body.classList.remove("is-retheming");
    // The wave, in place on the new page with nothing drawn yet: from here
    // on it is part of what the browser shows, over the old page and the
    // new. It keeps the opening's clock.
    plan = wave.start({
      rect: { left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight },
      mode: "turn",
      from,
      ms: TURNING,
      palettes: [before, palette()],
      clock: () => (opening ? opening.currentTime / TURNING : 0),
      // (Cut short, by a resize say, it takes the browser's part with it:
      // the opening's edge is never left bare.)
      done: () => { if (sweeping === sweep) sweep.skipTransition(); },
    });
  });
  sweep.ready.then(() => {
    if (!plan) return;
    // The new page shows through a round opening that grows from the
    // switch, its edge always under the wave's cells.
    const { reach, under } = plan;
    const round = (radius) => `circle(${radius}px at ${from.x}px ${from.y}px)`;
    try {
      opening = document.documentElement.animate(
        { clipPath: [round(0), round(0), round(reach), round(reach)], offset: [0, under[0], under[1], 1] },
        { duration: TURNING, easing: "linear", fill: "both", pseudoElement: "::view-transition-new(root)" },
      );
    } catch {
      sweep.skipTransition(); // (a browser that can't open it this way shows the new page at once)
    }
  }, () => {}); // (cut short before it began)
  sweep.finished.finally(() => {
    if (sweeping !== sweep) return; // (another change has taken over)
    sweeping = null;
    wave.finish();
    body.classList.remove("is-sweeping");
    idle(() => wipe.prepare());
  });
}

/* While the change is drawn over the page, the browser hands every press
   to the root, not to what is under the pointer: a choice pressed in that
   second would be lost. So a press ends the change there and then (the new
   palette is whole at once), and the click that follows, which still comes
   in on the root, is passed on to the control under it. */
let sweeping = null; // the theme's change, while it runs
let through = false; // a press cut it short: its click is still to be passed on
addEventListener("pointerdown", () => {
  if (!sweeping) return;
  through = true;
  sweeping.skipTransition();
}, true);
addEventListener("click", (e) => {
  if (!through) return;
  through = false;
  if (e.target === document.documentElement) document.elementFromPoint(e.clientX, e.clientY)?.closest("a, button")?.click();
}, true);

/* --------------------------------------------------------------------------
   Background: the backgrounds this device can show sit side by side, like
   the two themes, with the one chosen marked (js/background.js changes
   between them and keeps the choice for the next visit). A pointer that
   rests on a choice has it built out of sight, so that pressing it starts
   the change on that frame.
   -------------------------------------------------------------------------- */
const modeGroup = $(".mode");
const modeNews = $(".mode-news");
const modeButtons = new Map(); // mode id -> its button
for (const { id, label } of field.modes) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.mode = id;
  button.textContent = label;
  modeButtons.set(id, button);
  modeGroup.append(button);
}
const modeOf = (e) => e.target.closest("button")?.dataset.mode;

modeGroup.addEventListener("click", (e) => {
  const id = modeOf(e);
  if (!id) return;
  field.choose(id);
  showMode();
});

// Passing over a choice builds nothing; resting on it (the pointer, or the
// keyboard's focus) or pressing it does.
let intent = 0;
const restOn = (id, ms) => {
  clearTimeout(intent);
  if (id) intent = setTimeout(() => field.prepare(id), ms);
};
modeGroup.addEventListener("pointerover", (e) => restOn(modeOf(e), 70));
modeGroup.addEventListener("pointerleave", () => restOn());
modeGroup.addEventListener("focusin", (e) => restOn(modeOf(e), 200));
modeGroup.addEventListener("focusout", () => restOn());
modeGroup.addEventListener("pointerdown", (e) => restOn(modeOf(e), 0));

/** Marks the background chosen (its marker waits while it is still on its
    way). One that turned out not to work here (`dropped`) leaves the
    choices, and that is announced. */
function showMode(dropped) {
  const { modes, mode, pending } = field;
  for (const [id, button] of modeButtons) {
    if (modes.some((m) => m.id === id)) {
      button.setAttribute("aria-pressed", String(id === mode));
      button.toggleAttribute("data-pending", id === mode && pending);
      continue;
    }
    const focused = button === document.activeElement;
    button.remove();
    modeButtons.delete(id);
    if (focused) modeButtons.get(mode)?.focus({ preventScroll: true });
  }
  modeGroup.hidden = modeButtons.size < 2;
  if (dropped) modeNews.textContent = `The ${dropped.label} background isn't available on this device.`;
}
showMode();

/* --------------------------------------------------------------------------
   Intro: a single ruler types out across the middle, parts into the two
   axes, and the flat line of points between them rises into the landscape;
   then the page types itself in. Any input skips ahead. Reduced motion:
   none of it.
   -------------------------------------------------------------------------- */

// The caption's cursor, which waits after it once it has typed in (see
// .about-cursor in main.css; not read out).
const about = $(".about");
const aboutCursor = document.createElement("span");
aboutCursor.className = "about-cursor";
aboutCursor.setAttribute("aria-hidden", "true");
const aboutBreak = [...about.childNodes].findLast((node) => node.nodeName === "BR");
about.insertBefore(aboutCursor, aboutBreak && !aboutBreak.nextSibling ? aboutBreak : null);

// The words that lie over the band: the caption (and its cursor) and the
// readout. The band's characters make way for them (js/clearing.js).
const caption = clearing.add(about, { marks: { ".about-cursor": "_" } });
const reading = clearing.add($(".readout"));

let captioned = false; // the caption is on the page (typed in, or on its way)

/* The caption's cursor blinks while it waits: half a second after the
   caption has typed in, then 0.55 s in sight and 0.55 s out. On a timer,
   which changes the page twice a period: as a CSS animation it had the
   browser work out the page's styles again on every frame, in sight or
   not, on every view. Where it stands in its period is read off the
   clock each time, so a timer that comes late (a hidden tab) skips ahead
   instead of catching up. Not with reduced motion: the cursor is steady
   (asked each time, as it was of the animation: it stops the moment
   motion is turned down, and goes on when it is turned up again). */
const BLINK = { wait: 500, half: 550 };
const calm = matchMedia("(prefers-reduced-motion: reduce)");
let blinkFrom = null; // when the cursor's first period starts (page time), while it waits
let blinkTimer = 0;

function blinkOn() {
  clearTimeout(blinkTimer);
  if (blinkFrom === null || document.hidden) return;
  if (calm.matches) {
    aboutCursor.classList.remove("is-out");
    return;
  }
  const since = performance.now() - blinkFrom;
  const halves = since < 0 ? 0 : Math.floor(since / BLINK.half);
  aboutCursor.classList.toggle("is-out", halves % 2 === 1);
  blinkTimer = setTimeout(blinkOn, Math.max(1, (halves + 1) * BLINK.half - since));
}

/** Has the cursor blink from `from` ms from now (the moment the caption
    has typed in), or not at all (null). */
function blink(from) {
  blinkFrom = from === null ? null : performance.now() + from + BLINK.wait;
  aboutCursor.classList.remove("is-out");
  blinkOn();
}
document.addEventListener("visibilitychange", blinkOn);
calm.addEventListener("change", blinkOn);

/** Types the caption in, `delay` ms from now; its clearing opens with it
    (and, until then, for the cursor that waits where it will start). */
function typeCaption(delay) {
  captioned = true;
  const end = typeIn(about, { delay, speed: 9, still });
  caption.show({ delay, over: end - delay, cursor: true });
  blink(end);
}

/** Strikes the caption out, from its end, and the band closes over where
    it stood, behind the keys. (One still on its way in just goes.) */
function strikeCaption() {
  if (!captioned) return;
  captioned = false;
  blink(null);
  if (typing(about)) {
    cut(about);
    caption.hide();
    return;
  }
  about.classList.add("is-leaving"); // (in sight until the last key has gone)
  caption.hide({ over: strikeOut(about, { speed: 5, still, done: () => about.classList.remove("is-leaving") }) });
}

async function intro() {
  const route = parse();
  const finish = () => {
    body.classList.remove("intro", "intro-draw", "intro-open");
    render(route);
  };
  if (still) {
    finish();
    if (route.base === "home") {
      captioned = true;
      caption.show();
    }
    if (!hoverless.matches) reading.show();
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
  await pause(620);
  body.classList.add("intro-open");
  // The landscape rises on the lines' clock, landing as they land. (Asking
  // for the animations starts them now, so the lines part even when a skip
  // ends the intro in this same task.)
  const parting = $(".axis-top").getAnimations?.().find((a) => a.transitionProperty === "translate");
  field.set(framingOf(route).framing, { along: parting });
  await pause(640);
  listening.abort();
  finish();
  // The page types its own labels: the name develops in the band's
  // characters while the frame's labels type in, one after another (the
  // nav, the choices under the axis, the readout), then the caption.
  const name = frame.develop({ delay: 80, ms: 760 });
  [...$$(".nav a"), ...modeButtons.values(), ...themeButtons, $(".readout")].forEach((label, i) => {
    const delay = 140 + i * 70;
    const end = typeIn(label, { delay, speed: 14 });
    if (label.matches(".readout") && !hoverless.matches) reading.show({ delay, over: end - delay });
  });
  if (route.base === "home") typeCaption(name + 120);
}

// Once the page has settled, the other backgrounds' code is fetched in an
// idle moment, so that the first switch doesn't wait on the network (not
// for visitors who asked their browser to save data); after it, in the next,
// the panels' characters are struck ahead of their first change.
intro().then(() => {
  if (!navigator.connection?.saveData) idle(() => field.preload());
  idle(() => wipe.prepare());
});
