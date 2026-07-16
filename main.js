/* ==========================================================================
   Sheron Yang — main page script
   ========================================================================== */

(() => {
  "use strict";

  /* ------------------------------------------------------------------------
     Project data — single source of truth for the scroller list and the
     project-id lookup used when opening detail panels.
     ------------------------------------------------------------------------ */
  const PROJECTS = [
    { id: "project-AMRA",        title: "Adaptive Momentum–Reversal Allocation",  meta: "Quantitative Research - Independent - Present" },
    { id: "project-Readability", title: "NLP for Readability Assessment",         meta: "Modeling - Affiliated with BreakThroughTech AI - Present" },
    { id: "project-ANN",         title: "Research on ANN Filtered Vector Search", meta: "Machine Learning Research - Affiliated with MITCSAIL - 2025" },
    { id: "project-Hackathon",   title: "Wellesley College Hackathon Official Site", meta: "Frontend - 2025" },
    { id: "project-ADHD",        title: "ADHD Diagnosis for Women",               meta: 'Modeling - Kaggle "Women in Data Science" Hackathon - 2025' },
    { id: "project-EcoBear",     title: "EcoBear, a Web Widget",                  meta: "Frontend - Wellesley College Designathon Winning - 2024" },
    { id: "project-Hog",         title: "China's Hog Futures Research",           meta: "Independent Research - ICEMGD 7th - 2023" },
    { id: "project-EV",          title: "Subsidy Impact on China's EV Uptake",    meta: "Independent Research - S.-T. Yau Science Award - 2022" },
  ];

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /** Post a message to the iframe, swallowing any errors silently. */
  function postToIframe(message) {
    const iframe = $("iframe");
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(message, "*");
    } catch (_) {
      /* ignore — iframe may be cross-origin or unloaded */
    }
  }

  /** Fire `fn` on click, or on Enter/Space for role="button" elements, so the
      focusable labels are operable by keyboard and not just the mouse. */
  function onActivate(el, fn) {
    if (!el) return;
    el.addEventListener("click", fn);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fn(e);
      }
    });
  }

  /* ------------------------------------------------------------------------
     Main entry
     ------------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    setupLoader();
    renderProjects();
    const refreshScrollerBounds = setupScrollerBounds();
    setupInteractions(refreshScrollerBounds);
    startCursor();
  });

  /* ------------------------------------------------------------------------
     Loader: hide once fonts + iframe + Three.js + min-delay are all ready.
     Falls back to a hard timeout so the page can never get stuck behind
     the loader if one of the async signals never fires.
     ------------------------------------------------------------------------ */
  function setupLoader() {
    const loader = document.getElementById("loader");
    if (!loader) return;

    const MIN_LOADER_DURATION = 3000; // keeps the loader animation visible
    const HARD_FALLBACK       = 8000; // guarantees we never hang

    const state = { fonts: false, threejs: false, iframe: false, minDelay: false };

    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      loader.classList.add("hidden");
    };

    const maybeHide = () => {
      if (state.fonts && state.threejs && state.iframe && state.minDelay) hide();
    };

    // Fonts
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { state.fonts = true; maybeHide(); });
    } else {
      state.fonts = true;
    }

    // Iframe load
    const iframe = $("iframe");
    if (iframe) {
      if (iframe.contentDocument && iframe.contentDocument.readyState === "complete") {
        state.iframe = true;
      } else {
        iframe.addEventListener("load", () => { state.iframe = true; maybeHide(); });
      }
    } else {
      state.iframe = true;
    }

    // Three.js ready (posted by the scene inside the iframe)
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === "threejs-ready") {
        state.threejs = true;
        maybeHide();
      }
    });

    setTimeout(() => { state.minDelay = true; maybeHide(); }, MIN_LOADER_DURATION);
    setTimeout(hide, HARD_FALLBACK);
  }

  /* ------------------------------------------------------------------------
     Render the project list into .scroller-content from the PROJECTS array.
     Each project is a title div + meta div; all list spacing is CSS
     (.scroller-content padding-top and the .project-meta + .project-title
     margin), so no spacer elements are needed.
     ------------------------------------------------------------------------ */
  function renderProjects() {
    const root = $(".scroller-content");
    if (!root) return;

    for (const project of PROJECTS) {
      const title = document.createElement("div");
      title.className = "project-title";
      title.dataset.projectId = project.id;
      title.textContent = project.title;

      const meta = document.createElement("div");
      meta.className = "project-meta";
      meta.textContent = project.meta;

      root.append(title, meta);
    }
  }

  /* ------------------------------------------------------------------------
     Interactions: header/footer buttons, project-title clicks (delegated),
     and theme switching. All panel state changes go through closePanels()
     so exactly one panel can be open at a time.
     ------------------------------------------------------------------------ */
  function setupInteractions(refreshScrollerBounds) {
    const contactPanel = $("#contactPanel");
    const scroller     = $(".scroller-container");
    const aboutText    = $(".about-text");
    const allProjectPanels = $$(".project-panel");

    function closePanels() {
      contactPanel.classList.remove("show");
      allProjectPanels.forEach((panel) => panel.classList.remove("show"));
    }

    onActivate($(".contact-me"), () => {
      const show = !contactPanel.classList.contains("show");
      closePanels();
      contactPanel.classList.toggle("show", show);
    });

    onActivate($(".site-title"), () => {
      closePanels();
      scroller.classList.remove("show");
      aboutText.classList.remove("hidden");
    });

    onActivate($(".projects-button"), () => {
      const showScroller = !scroller.classList.contains("show");
      scroller.classList.toggle("show", showScroller);
      aboutText.classList.toggle("hidden", showScroller);
      closePanels();
      // Recompute row opacities on open: scroll position or window size may
      // have changed while the list was hidden.
      if (showScroller && refreshScrollerBounds) requestAnimationFrame(refreshScrollerBounds);
    });

    // Project titles open their panel (one delegated listener for the list).
    $(".scroller-content").addEventListener("click", (e) => {
      const title = e.target.closest(".project-title");
      if (!title) return;
      const panel = document.getElementById(title.dataset.projectId);
      if (!panel) return;
      const wasOpen = panel.classList.contains("show");
      closePanels();
      if (!wasOpen) panel.classList.add("show");
    });

    /* Single theme handler — applies the theme locally, persists it, and
       forwards it to the iframe in the one shape the iframe actually reads. */
    function setTheme(theme) {
      document.body.setAttribute("data-theme", theme);
      try { localStorage.setItem("theme", theme); } catch (_) {}
      postToIframe({ type: "theme", theme });
    }

    onActivate($(".light-mode"), () => setTheme("light"));
    onActivate($(".dark-mode"),  () => setTheme("dark"));

    // Push the *current* theme to the iframe once it has loaded. The
    // localStorage seed in <head> handles cold-start; this re-sends in case
    // the user toggled before the iframe's own listener was attached.
    const iframe = $("iframe");
    if (iframe) {
      iframe.addEventListener("load", () => {
        const theme = document.body.getAttribute("data-theme") || "light";
        postToIframe({ type: "theme", theme });
      });
    }
  }

  /* ------------------------------------------------------------------------
     Scroller boundary opacity — a project row is fully opaque only while its
     center sits between the top and bottom lines. The moment that center
     crosses a line the row snaps to a low opacity (no transition), so rows
     stay visible past the borders instead of being clipped or fading. Done
     here, not in CSS, because it depends on each row's live scroll position.
     ------------------------------------------------------------------------ */
  function setupScrollerBounds() {
    const scroller   = $(".scroller-container");
    const content    = $(".scroller-content");
    const topLine    = $(".top-line");
    const bottomLine = $(".bottom-line");
    if (!scroller || !content || !topLine || !bottomLine) return () => {};

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

  /* ------------------------------------------------------------------------
     Custom cursor — easing follower with squash/stretch on velocity.
     ------------------------------------------------------------------------ */
  function startCursor() {
    const circleElement = $(".circle");
    if (!circleElement) return;

    const mouse         = { x: 0, y: 0 };
    const previousMouse = { x: 0, y: 0 };
    const circle        = { x: 0, y: 0 };

    let currentScale = 0;
    let currentAngle = 0;
    const speed = 0.17;

    window.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    const tick = () => {
      circle.x += (mouse.x - circle.x) * speed;
      circle.y += (mouse.y - circle.y) * speed;
      const translate = `translate(${circle.x}px, ${circle.y}px)`;

      const deltaX = mouse.x - previousMouse.x;
      const deltaY = mouse.y - previousMouse.y;
      previousMouse.x = mouse.x;
      previousMouse.y = mouse.y;

      const velocity   = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2) * 4, 150);
      const scaleValue = (velocity / 150) * 0.7;
      currentScale += (scaleValue - currentScale) * speed;
      const scale = `scale(${1 + currentScale}, ${1 - currentScale})`;

      const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
      if (velocity > 20) currentAngle = angle;
      const rotate = `rotate(${currentAngle}deg)`;

      circleElement.style.transform = `${translate} ${rotate} ${scale}`;
      requestAnimationFrame(tick);
    };
    tick();
  }
})();
