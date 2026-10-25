/* ==========================================================================
   Sheron Yang — page script
   ========================================================================== */

import { createField } from "./field.js";
import { startCursor } from "./cursor.js";

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Start the loader's clock before the field's (synchronous, GPU-bound) setup.
const hideLoaderWhen = setupLoader();
const field = createField($(".field"), { theme: document.body.dataset.theme });
hideLoaderWhen(field.ready);
startCursor($(".circle"));
renderProjects();
setupInteractions(setupScrollerBounds());

/* --------------------------------------------------------------------------
   Loader: hides once fonts, the given signals and a minimum delay are all
   ready, with a hard fallback so the page can never get stuck behind it.
   -------------------------------------------------------------------------- */
function setupLoader() {
  const loader = $("#loader");
  const MIN_LOADER_DURATION = 3000; // keeps the loader animation visible
  const HARD_FALLBACK       = 8000; // guarantees we never hang

  const hide = () => loader.classList.add("hidden");
  const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_LOADER_DURATION));
  setTimeout(hide, HARD_FALLBACK);
  return (...signals) => Promise.all([document.fonts.ready, minDelay, ...signals]).then(hide);
}

/* --------------------------------------------------------------------------
   Project list: one title + meta row per project <article>, in document
   order, built from each article's data-title / data-meta. All list spacing
   is CSS (.scroller-content padding-top and the .project-meta +
   .project-title margin).
   -------------------------------------------------------------------------- */
function renderProjects() {
  const list = $(".scroller-content");
  for (const article of $$(".project-panel")) {
    const title = document.createElement("button");
    title.type = "button";
    title.className = "project-title";
    title.dataset.projectId = article.id;
    title.textContent = article.dataset.title;

    const meta = document.createElement("div");
    meta.className = "project-meta";
    meta.textContent = article.dataset.meta;

    list.append(title, meta);
  }
}

/* --------------------------------------------------------------------------
   Interactions: header/footer buttons, project titles and theme switching.
   Every panel change goes through togglePanel(), so at most one panel is
   open at a time.
   -------------------------------------------------------------------------- */
function setupInteractions(refreshScrollerBounds) {
  const scroller  = $(".scroller-container");
  const aboutText = $(".about-text");
  const panels    = $$(".about-panel");

  const closePanels = () => panels.forEach((panel) => panel.classList.remove("show"));
  const togglePanel = (panel) => {
    const open = !panel.classList.contains("show");
    closePanels();
    panel.classList.toggle("show", open);
  };

  $(".contact-me").addEventListener("click", () => togglePanel($("#contactPanel")));

  $(".site-title").addEventListener("click", () => {
    closePanels();
    scroller.classList.remove("show");
    aboutText.classList.remove("hidden");
  });

  $(".projects-button").addEventListener("click", () => {
    const show = !scroller.classList.contains("show");
    scroller.classList.toggle("show", show);
    aboutText.classList.toggle("hidden", show);
    closePanels();
    // Scroll position or window size may have changed while the list was
    // hidden, so recompute the row opacities on open.
    if (show) requestAnimationFrame(refreshScrollerBounds);
  });

  // One delegated listener opens (or closes) a project's panel.
  $(".scroller-content").addEventListener("click", (e) => {
    const title = e.target.closest(".project-title");
    if (title) togglePanel(document.getElementById(title.dataset.projectId));
  });

  const setTheme = (theme) => {
    document.body.dataset.theme = theme;
    field.setTheme(theme);
  };
  $(".light-mode").addEventListener("click", () => setTheme("light"));
  $(".dark-mode").addEventListener("click", () => setTheme("dark"));
}

/* --------------------------------------------------------------------------
   Scroller boundary opacity — a project row is fully opaque only while its
   center sits between the top and bottom lines. The moment that center
   crosses a line the row snaps to a low opacity (no transition), so rows
   stay visible past the borders instead of being clipped or fading. Done
   here, not in CSS, because it depends on each row's live scroll position.
   -------------------------------------------------------------------------- */
function setupScrollerBounds() {
  const scroller   = $(".scroller-container");
  const content    = $(".scroller-content");
  const topLine    = $(".top-line");
  const bottomLine = $(".bottom-line");

  const OUT_OF_BAND_OPACITY = "0.15"; // set to "0" to hide rows entirely

  function update() {
    const topY    = topLine.getBoundingClientRect().top;
    const bottomY = bottomLine.getBoundingClientRect().top;
    for (const row of content.children) {
      const rect = row.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const inside = center >= topY && center <= bottomY;
      // Inside: clear the inline value so CSS (base opacity + :hover) wins.
      // Outside: pin the low opacity, overriding hover. Abrupt, never faded.
      const desired = inside ? "" : OUT_OF_BAND_OPACITY;
      if (row.style.opacity !== desired) row.style.opacity = desired;
    }
  }

  // Throttle scroll/resize to one layout read per frame.
  let ticking = false;
  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  }

  scroller.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  return update;
}
