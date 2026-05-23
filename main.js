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
    { id: "project-ANN",        title: "Research on ANN Filtered Vector Search",        meta: "ML / DS - Affiliated with MITCSAIL - 2025" },
    { id: "project-Readability", title: "Text Readability Prediction via Advanced NLP",  meta: "ML / DS - Affiliated with BreakThroughTech AI - 2025" },
    { id: "project-Hackathon",   title: "Wellesley College Hackathon Official Site",     meta: "Frontend - 2025" },
    { id: "project-ADHD",        title: "ADHD Diagnosis for Women",                      meta: 'ML / DS - Kaggle "Women in Data Science" Hackathon Top 10% Students - 2025' },
    { id: "project-EcoBear",     title: "EcoBear, a Web Widget",                         meta: "Frontend - Wellesley College Designathon Winning - 2024" },
    { id: "project-Hog",         title: "China's Hog Futures Research",                  meta: "Paper - ICEMGD 7th - 2023" },
    { id: "project-EV",          title: "Subsidy Impact on China's EV Uptake",           meta: "Paper - S.-T. Yau Science Award Nominated - 2022" },
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

  /* ------------------------------------------------------------------------
     Main entry
     ------------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    setupLoader();
    renderProjects();
    wireUpButtons();
    wireUpProjectTitles();
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

    const MIN_LOADER_DURATION = 3000; // 3 seconds — keeps the animation visible
    const HARD_FALLBACK       = 8000; // 8 seconds — guarantees we never hang

    const state = {
      fonts:    false,
      threejs:  false,
      iframe:   false,
      minDelay: false,
    };

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

    // Minimum visible duration
    setTimeout(() => { state.minDelay = true; maybeHide(); }, MIN_LOADER_DURATION);

    // Hard fallback — hide no matter what
    setTimeout(hide, HARD_FALLBACK);
  }

  /* ------------------------------------------------------------------------
     Render the project list into .scroller-content from the PROJECTS array.
     Each project becomes: title, meta, and (except the last) a gap.
     ------------------------------------------------------------------------ */
  function renderProjects() {
    const root = $(".scroller-content");
    if (!root) return;

    // Top spacer (was: <div style="font-size: calc(var(--index) * 2); ..."><br></div>)
    const spacer = document.createElement("div");
    spacer.className = "scroller-spacer";
    spacer.innerHTML = "<br>";
    root.appendChild(spacer);

    PROJECTS.forEach((project, idx) => {
      const title = document.createElement("div");
      title.className = "project-title";
      title.dataset.projectId = project.id;
      title.textContent = project.title;

      const meta = document.createElement("div");
      meta.className = "project-meta";
      meta.textContent = project.meta;

      root.appendChild(title);
      root.appendChild(meta);

      if (idx < PROJECTS.length - 1) {
        const gap = document.createElement("div");
        gap.className = "project-gap";
        gap.innerHTML = "<br>";
        root.appendChild(gap);
      }
    });
  }

  /* ------------------------------------------------------------------------
     Top-bar buttons: About / Contact / Projects / Light / Dark / Title
     ------------------------------------------------------------------------ */
  function wireUpButtons() {
    const aboutBtn    = $(".about-me");
    const contactBtn  = $(".contact-me");
    const siteTitle   = $(".site-title");
    const lightBtn    = $(".light-mode");
    const darkBtn     = $(".dark-mode");
    const projectsBtn = $(".projects-button");
    const aboutPanel  = $("#aboutPanel");
    const contactPanel = $("#contactPanel");
    const scroller    = $(".scroller-container");
    const aboutText   = $(".about-text");

    const allProjectPanels = $$(".project-panel");

    function togglePanel(showAbout, showContact) {
      aboutPanel.classList.toggle("show", showAbout);
      contactPanel.classList.toggle("show", showContact);
      allProjectPanels.forEach((panel) => panel.classList.remove("show"));
    }

    aboutBtn.addEventListener("click", () => {
      togglePanel(!aboutPanel.classList.contains("show"), false);
    });

    contactBtn.addEventListener("click", () => {
      togglePanel(false, !contactPanel.classList.contains("show"));
    });

    siteTitle.addEventListener("click", () => {
      togglePanel(false, false);
      scroller.classList.remove("show");
      aboutText.classList.remove("hidden");
    });

    projectsBtn.addEventListener("click", () => {
      const showScroller = !scroller.classList.contains("show");
      scroller.classList.toggle("show", showScroller);
      aboutText.classList.toggle("hidden", showScroller);
      togglePanel(false, false);
    });

    /* Single theme handler — applies the theme locally, persists it, and
       forwards it to the iframe in the one shape the iframe actually reads. */
    function setTheme(theme) {
      document.body.setAttribute("data-theme", theme);
      try { localStorage.setItem("theme", theme); } catch (_) {}
      postToIframe({ type: "theme", theme });
    }

    lightBtn.addEventListener("click", () => setTheme("light"));
    darkBtn.addEventListener("click", () => setTheme("dark"));

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
     Project titles inside the scroller open the matching project panel.
     ------------------------------------------------------------------------ */
  function wireUpProjectTitles() {
    const allProjectPanels = $$(".project-panel");
    $$(".project-title").forEach((titleDiv) => {
      titleDiv.addEventListener("click", () => {
        const panel = document.getElementById(titleDiv.dataset.projectId);
        if (panel && panel.classList.contains("show")) {
          panel.classList.remove("show");
        } else {
          allProjectPanels.forEach((p) => p.classList.remove("show"));
          if (panel) panel.classList.add("show");
        }
      });
    });
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
      mouse.x = e.x;
      mouse.y = e.y;
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