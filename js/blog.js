/* ==========================================================================
   Blog — the posts, and the sheet each is read in.

   What a post says lives apart from all of this, in blog/: a line in
   blog/posts.js (its slug, title, date and summary: all the list needs)
   and a folder of its own, blog/<slug>/, holding post.md (Markdown, read
   by js/markdown.js) and whatever the post shows: pictures, demos. A post
   is fetched the first time it is opened (or pointed at), not before, and
   the reader with the first of them: the page starts without either.

   A post is read on a sheet that covers the whole page on every screen,
   built here like a project's panel (its close and count above the top
   ruler, its text scrolling between the rulers, steps to the next below),
   so that js/main.js opens, closes and types it the same way. Its
   headings can be linked to from its own text, each by its words:
   [as said above](#from-light-to-ink).

   How a post is set out follows the window, not the post (main.css): a
   phone has one column; a wide window has the title across it, a rail at
   the left and the post beside it. The rail holds the post's specs and a
   list of its sections, made here from the text's headings (`##` in the
   Markdown), which marks the one being read and goes to any of them.
   What is on the sheet stands on one of three widths: the text's, a
   figure's, the sheet's. Which one follows from what a thing is (and
   `wide`, where the post says so); for code and tables it follows from
   what they hold, which is measured here. A post is written the same way
   for all of it.

   Demos. A post can hold live things, each a module in the post's own
   folder, set in the text where it belongs:

     <post-demo src="light.js" title="A light, typed">A caption.</post-demo>

   The element is a frame: it names the demo, gives it a stage, loads the
   module when the reader first comes near, and tells it when to run. The
   module exports one function (as `default`, or named `mount`):

     export default function mount(stage, demo) { … }

   `stage` is an empty element to fill: a canvas, text, buttons, anything.
   `demo` says what the page knows:
     demo.running     whether to draw: the sheet is open and the demo in view
     demo.theme       "dark" or "light" (or style with var(--ink), var(--bg))
     demo.reduced     the reader asked for less motion: show a still state
     demo.width, demo.height   the stage, in CSS px
     demo.watch(fn)   fn(demo) runs whenever any of those change
     demo.signal      aborts when the demo is put away: pass it to
                      addEventListener, or listen for "abort" to stop
   and mount may return a function that cleans up. A demo is put away when
   its sheet closes and made afresh when it is opened again, so it never
   runs out of sight; and it gets no say over the page around it (the
   stage lets a finger scroll the sheet, and Escape still closes it).
   ========================================================================== */

const FOLDER = "blog/";  // the posts' folders, from the page
const WORDS_A_MINUTE = 220;
const pad = (n) => String(n).padStart(2, "0");

/* The list of posts is read here, and what is wrong with it stays here.
   blog/posts.js is written by hand, with every post: a slip in it (a
   comma, a quote) leaves the page with no posts and a warning, not
   without its scripts; and an entry that can't be listed (no title, or a
   slug that is taken, or isn't letters, digits and hyphens) is left out. */
let manifest = [];
try {
  manifest = (await import("../blog/posts.js")).default;
} catch (error) {
  console.warn("Blog: blog/posts.js could not be read, so no posts are listed.", error);
}

function entriesOf(list) {
  const taken = new Set();
  return (Array.isArray(list) ? list : []).filter((entry) => {
    const fine = !!entry && typeof entry.title === "string" && !!entry.title.trim()
      && typeof entry.slug === "string" && /^[a-z0-9][a-z0-9-]*$/i.test(entry.slug) && !taken.has(entry.slug);
    if (fine) taken.add(entry.slug);
    else console.warn("Blog: an entry of blog/posts.js was left out (it needs a title, and a slug of its own made of letters, digits and hyphens):", entry);
    return fine;
  });
}

/** A post's signature: a place in the band's noise, made from its slug,
    so that a post keeps its own as others are added above it. */
function seedOf(slug) {
  let hash = 2166136261;
  for (let i = 0; i < slug.length; i++) hash = Math.imul(hash ^ slug.charCodeAt(i), 16777619);
  hash >>>= 0;
  return [(hash % 4100) / 100, ((hash >>> 11) % 2900) / 100];
}

/** A heading's words as a name to link to: "From light to ink" is
    #from-light-to-ink (as GitHub names headings). */
const nameOf = (text) => text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s+/g, "-");

/* The demos on the page (see the note above), and the frame they share. */
const demos = new Set();

class PostDemo extends HTMLElement {
  connectedCallback() {
    if (this.stage) { // (framed already, and put back on the page: watched again)
      this.near.observe(this);
      demos.add(this);
      return;
    }
    const title = this.getAttribute("title") || "Demo";
    const caption = this.innerHTML.trim();
    this.removeAttribute("title"); // (it would hang over the whole demo as a tooltip)
    this.setAttribute("role", "group");
    this.setAttribute("aria-label", title);
    this.innerHTML = `
      <div class="demo-head"><span class="demo-name"></span><span class="demo-state" aria-live="polite"></span></div>
      <div class="demo-stage"></div>
      ${caption ? `<div class="demo-caption">${caption}</div>` : ""}`;
    this.querySelector(".demo-name").textContent = title;
    this.stage = this.querySelector(".demo-stage");
    this.state = this.querySelector(".demo-state");
    // It starts when the reader comes near, and runs while it is in view.
    this.near = new IntersectionObserver((entries) => {
      this.seen = entries[entries.length - 1].isIntersecting; // (the latest of them)
      this.update();
    }, { root: this.closest(".panel-scroll"), rootMargin: "240px 0px" });
    this.near.observe(this);
    demos.add(this);
  }

  disconnectedCallback() {
    this.near?.disconnect();
    this.stop();
    demos.delete(this);
  }

  /** Whether its sheet is open (set by the blog: see reading below). */
  set active(on) {
    this.open = !!on;
    this.update();
  }

  update() {
    if (this.open && this.seen && !this.controller) this.start();
    if (!this.open && this.controller) this.stop();
    const running = !!this.open && !!this.seen;
    if (this.demo && this.demo.running !== running) {
      this.demo.running = running;
      this.tell();
    }
  }

  /** Tells the module that something it may draw by has changed. */
  tell() {
    for (const watcher of this.watchers || []) {
      try { watcher(this.demo); } catch (error) { console.warn("Demo:", error); }
    }
  }

  async start() {
    const controller = this.controller = new AbortController();
    const { signal } = controller;
    const { stage } = this;
    this.state.textContent = "Loading";
    try {
      const module = await import(new URL(this.getAttribute("src"), document.baseURI).href);
      if (signal.aborted) return;
      const mount = module.default || module.mount;
      if (typeof mount !== "function") throw new Error("the module exports no mount function");
      const watchers = this.watchers = new Set();
      this.demo = {
        signal,
        running: !!this.open && !!this.seen,
        reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
        get theme() { return document.body.dataset.theme || "dark"; },
        get width() { return stage.clientWidth; },
        get height() { return stage.clientHeight; },
        watch(watcher) { watchers.add(watcher); },
      };
      const sized = new ResizeObserver(() => this.tell());
      sized.observe(stage);
      signal.addEventListener("abort", () => sized.disconnect());
      const cleanup = await mount(stage, this.demo);
      if (typeof cleanup === "function") {
        if (signal.aborted) cleanup();
        else signal.addEventListener("abort", cleanup);
      }
      if (!signal.aborted) this.state.textContent = "";
    } catch (error) {
      if (signal.aborted) return;
      console.warn("Demo unavailable:", error?.message || error);
      this.state.textContent = "";
      stage.textContent = "This demo could not be loaded.";
    }
  }

  stop() {
    this.controller?.abort();
    this.controller = this.demo = this.watchers = null;
    this.stage?.replaceChildren();
    if (this.state) this.state.textContent = "";
  }
}

if (!customElements.get("post-demo")) customElements.define("post-demo", PostDemo);

// A change of theme reaches the demos that are up.
new MutationObserver(() => { for (const demo of demos) if (demo.demo) demo.tell(); })
  .observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });

/** The posts, each with its sheet built and added to `into` (the page's
    <main>), empty of text until it is first wanted. `column(x)` is the
    page's: the left edge of the grid's column at x (js/frame.js), which
    a sheet's reading caret steps along. Returns
      posts           each { slug, title, date, summary, tags, meta, index,
                      seed, el }: what the list and the sheets are made
                      from (js/main.js builds the list's rows)
      load(post)      fetches and sets a post's text (once); resolves when
                      it is on its sheet, whether it came or not
      reading(post, on)  its sheet is about to be seen (or is closing): it
                      is brought up to date, and its demos run, only
                      while it is open
      onset           set this to hear when a post's text has been set
                      (post) */
export function createBlog(into, { column = (x) => x } = {}) {
  const posts = entriesOf(manifest).map((entry, index) => ({
    ...entry,
    index,
    folder: `${FOLDER}${entry.slug}/`,
    meta: [entry.date, ...(entry.tags || [])].filter(Boolean),
    // (Its signature, for the band under the list, as each project has
    // one in js/main.js.)
    seed: seedOf(entry.slug),
    el: null,
    loading: null,
    sections: [], // its headings and their lines in the list of sections, once its text is set
    held: null,   // the section last gone to by name, until the reader scrolls on
    open: false,  // its sheet is being read (see reading)
    fitted: -1,   // the sheet's width when its code and tables were last measured (see fit)
  }));
  const api = { posts, load, reading, onset: () => {} };

  for (const post of posts) {
    const el = post.el = document.createElement("article");
    el.className = "panel post";
    el.id = `post-${post.slug}`;
    el.setAttribute("aria-labelledby", `${el.id}-title`);
    const prev = posts[(post.index + posts.length - 1) % posts.length];
    const next = posts[(post.index + 1) % posts.length];
    el.innerHTML = `
      <div class="panel-top">
        <a class="panel-close" href="#/blogs" data-action="close">Close</a>
        <span class="panel-count">${pad(post.index + 1)} / ${pad(posts.length)}</span>
      </div>
      <span class="post-progress" aria-hidden="true"></span>
      <div class="panel-scroll">
        <div class="panel-body post-body">
          <h2 id="${el.id}-title" tabindex="-1"></h2>
          <div class="post-rail">
            <p class="panel-meta"></p>
            <nav class="post-contents" aria-label="Contents" hidden>
              <p class="post-contents-label" aria-hidden="true">Contents</p>
              <ol></ol>
            </nav>
          </div>
          <p class="post-lead"></p>
          <div class="post-text" aria-busy="true"></div>
          <p class="post-end"><a class="panel-link" href="#/blogs" data-action="close">Back to all posts</a></p>
        </div>
      </div>
      <nav class="panel-steps" aria-label="More posts"${posts.length < 2 ? " hidden" : ""}>
        <a href="#/blogs/${prev.slug}" data-action="step" data-base="blogs" data-slug="${prev.slug}"><span aria-hidden="true">&lt;-</span> Prev ${pad(prev.index + 1)}</a>
        <a href="#/blogs/${next.slug}" data-action="step" data-base="blogs" data-slug="${next.slug}">Next ${pad(next.index + 1)} <span aria-hidden="true">-&gt;</span></a>
      </nav>`;
    el.querySelector("h2").textContent = post.title;
    el.querySelector(".panel-meta").textContent = post.meta.join("\n");
    el.querySelector(".post-lead").textContent = post.summary || "";
    el.querySelector(".post-lead").hidden = !post.summary;
    // A link to a place in the post itself ([as said above](#from-light-to-ink),
    // or a line of the list of sections) goes there, in the sheet. Left to
    // the browser it would change the page's address, which is how the
    // page goes from view to view.
    el.querySelector(".post-body").addEventListener("click", (event) => {
      const link = event.target.closest('a[href^="#"]:not([href^="#/"])');
      if (!link || link.closest(".demo-stage") || event.defaultPrevented) return;
      event.preventDefault();
      const name = decodeURIComponent(link.getAttribute("href").slice(1));
      const place = [...el.querySelectorAll(".post-text [id]")].find((node) => node.id === `${el.id}-${name}` || node.id === name);
      if (!place) return;
      // (Gone to by name, a section is the one being read until the
      // reader moves on by hand: the last of them can't come up to the
      // top of the sheet, and would never be marked by where it is.)
      post.held = post.sections.find((section) => section.heading === place) || null;
      place.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      if (!place.hasAttribute("tabindex")) place.tabIndex = -1;
      place.focus({ preventScroll: true });
      post.follow();
    });

    // Keeping up with the reader, while the sheet is open: which section
    // is being read, how far down the text that is, and, when the sheet's
    // width has changed, which widths its code and tables stand on. One
    // pass a frame, however many scrolls and resizes ask for it. A closed
    // sheet is left alone; it is brought up to date as it opens (see
    // reading).
    const scroller = el.querySelector(".panel-scroll");
    const rail = el.querySelector(".post-rail");
    const contents = el.querySelector(".post-contents");
    const caret = el.querySelector(".post-progress");
    let queued = 0;
    let marked = null;

    // Which section, marked in the list: the last whose heading has come
    // up past a line a third of the way down the sheet. (Toward the
    // text's end that line goes on down the sheet, so that the last
    // sections, which stop short of it, have their turn.)
    const locate = () => {
      if (!post.sections.length || !contents.getClientRects().length) return; // (no list, or none shown in this window)
      const box = scroller.getBoundingClientRect();
      const left = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
      const line = box.top + 0.3 * box.height + Math.max(0, 0.7 * box.height - left);
      let now = post.held;
      if (!now) for (const section of post.sections) {
        if (section.heading.getBoundingClientRect().top > line) break;
        now = section;
      }
      for (const section of post.sections) {
        if (section === now) section.link.setAttribute("aria-current", "location");
        else section.link.removeAttribute("aria-current");
      }
      // (A list longer than the window scrolls by itself: its marked line
      // is kept in sight, brought to the middle when it has gone out.)
      if (now && now !== marked && rail.scrollHeight > rail.clientHeight + 1) {
        const frame = rail.getBoundingClientRect(), at = now.link.getBoundingClientRect();
        if (at.top < frame.top + 8 || at.bottom > frame.bottom - 8) rail.scrollTop += at.top - frame.top - (frame.height - at.height) / 2;
      }
      marked = now;
    };

    // How far: a caret on the sheet's top ruler, stepping from column to
    // column as the page's carets do under the pointer (out of sight
    // while there is nothing to scroll: main.css, .is-long).
    const progress = () => {
      const room = scroller.scrollHeight - scroller.clientHeight;
      el.classList.toggle("is-long", room > 8);
      if (room <= 8) return;
      const edge = Math.min(Math.max(0.026 * innerWidth, 16), 72); // (--edge, main.css)
      caret.style.transform = `translateX(${column(edge + (scroller.scrollTop / room) * (innerWidth - 2 * edge))}px)`;
    };

    post.keep = () => {
      cancelAnimationFrame(queued);
      queued = 0;
      if (el.clientWidth !== post.fitted) fit(post);
      locate();
      progress();
    };
    post.follow = () => { if (post.open && !queued) queued = requestAnimationFrame(post.keep); };
    scroller.addEventListener("scroll", post.follow, { passive: true });
    // (Moving on by hand: the wheel, a finger, the keys that scroll or
    // step through the text. A press on the list itself is followed by
    // its click, which holds again.)
    for (const type of ["wheel", "touchstart", "pointerdown", "keydown"]) {
      el.addEventListener(type, (event) => {
        if (event.type !== "keydown" || /^(?:Arrow|Page|Home|End|Tab| $)/.test(event.key)) post.held = null;
      }, { passive: true });
    }
    // (The text grows as pictures and demos arrive, and the sheet with
    // the window: a sheet of another width has other widths to give.)
    const sized = new ResizeObserver(post.follow);
    sized.observe(scroller);
    sized.observe(el.querySelector(".post-body"));
    into.append(el);
  }
  // (Measured before the page's face had come, a line is another length:
  // every sheet is measured again, the open one now, the others as they open.)
  document.fonts?.ready?.then(() => {
    for (const post of posts) {
      post.fitted = -1;
      post.follow();
    }
  });

  /** Code and tables stand on the text's width, and take the next one up
      when it can't hold them: a figure's, then the sheet's (main.css:
      --prose, --media, --full). Code needs its longest line; a table,
      its cells on single lines. What each needs is read in one pass and
      the widths are set after it, so that a post full of code costs the
      page two layouts, not two for every block. */
  function fit(post) {
    post.fitted = post.el.clientWidth;
    const blocks = [...post.el.querySelectorAll(".post-text > .code, .post-text > .table")]
      .map((el) => ({ el, pre: el.querySelector(":scope > pre"), table: el.querySelector(":scope > table") }))
      .filter((block) => block.pre || block.table);
    if (!blocks.length) return;
    for (const { el, table } of blocks) {
      el.removeAttribute("data-tier");
      if (table) table.style.width = "max-content";
    }
    for (const block of blocks) {
      block.need = block.table ? block.table.offsetWidth : block.pre.scrollWidth;
      block.have = block.el.clientWidth;
    }
    for (const { table } of blocks) if (table) table.style.width = "";
    let tight = blocks.filter((block) => block.need > block.have + 1);
    for (const { el } of tight) el.dataset.tier = "media";
    tight = tight.filter((block) => block.need > block.el.clientWidth + 1);
    for (const { el } of tight) el.dataset.tier = "full";
  }

  /** A post's text, read and set on its sheet. What it points to (its
      pictures, its demos' modules, its links to files beside it) is found
      from its own folder; links out open in a tab of their own. */
  function set(post, html, words) {
    const text = post.el.querySelector(".post-text");
    const held = document.createElement("template");
    held.innerHTML = html;
    for (const el of held.content.querySelectorAll("[src], [href], [poster]")) {
      for (const name of ["src", "href", "poster"]) {
        const value = el.getAttribute(name);
        if (value && !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(value)) el.setAttribute(name, post.folder + value);
      }
      if (el.localName === "a" && /^https?:/i.test(el.getAttribute("href") || "")) {
        el.target = "_blank";
        el.rel = "noopener";
      }
    }
    for (const block of held.content.querySelectorAll("p, li, blockquote")) block.dataset.cursor = "text";
    // Code stands between rules, its language named (main.css: .code); it
    // and a table can be reached, to scroll them sideways by key.
    for (const pre of held.content.querySelectorAll("pre")) {
      const code = document.createElement("div");
      code.className = "code";
      pre.replaceWith(code);
      if (pre.dataset.lang) {
        const lang = document.createElement("span");
        lang.className = "code-lang";
        lang.textContent = pre.dataset.lang;
        code.append(lang);
      }
      code.append(pre);
      pre.tabIndex = 0;
    }
    for (const table of held.content.querySelectorAll(".table")) table.tabIndex = 0;
    // Its headings can be linked to, each by its words (kept apart from
    // the other posts' on the page by the sheet's own name).
    const names = new Set();
    for (const heading of held.content.querySelectorAll("h3, h4, h5")) {
      if (heading.id || heading.closest("post-demo")) continue;
      const base = nameOf(heading.textContent) || "section"; // (a heading of marks alone still has a place to go to)
      let name = base;
      for (let n = 2; names.has(name); n++) name = `${base}-${n}`;
      names.add(name);
      heading.id = `${post.el.id}-${name}`;
    }
    text.replaceChildren(held.content);
    text.removeAttribute("aria-busy");
    // Its sections, listed beside it where the window has the room: each
    // line a link to its heading, as one written in the text would be.
    // (One section is no list.)
    const contents = post.el.querySelector(".post-contents");
    const headings = [...text.querySelectorAll("h3[id]")].filter((heading) => !heading.closest("post-demo"));
    post.held = null;
    post.sections = (headings.length > 1 ? headings : []).map((heading, i) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      const own = `${post.el.id}-`;
      link.setAttribute("href", `#${encodeURIComponent(heading.id.startsWith(own) ? heading.id.slice(own.length) : heading.id)}`);
      link.innerHTML = `<span class="post-contents-no" aria-hidden="true">${pad(i + 1)}</span><span class="post-contents-title"></span>`;
      link.lastChild.textContent = heading.textContent;
      item.append(link);
      return { heading, link, item };
    });
    contents.querySelector("ol").replaceChildren(...post.sections.map((section) => section.item));
    contents.hidden = !post.sections.length;
    fit(post);
    if (words) {
      post.meta = [post.date, `${Math.max(1, Math.round(words / WORDS_A_MINUTE))} min read`, ...(post.tags || [])].filter(Boolean);
      post.el.querySelector(".panel-meta").textContent = post.meta.join("\n");
    }
    for (const demo of text.querySelectorAll("post-demo")) demo.active = post.open;
    api.onset(post);
    post.follow();
  }

  function load(post) {
    post.loading ||= Promise.all([
      fetch(`${post.folder}post.md`).then((response) => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.text();
      }),
      import("./markdown.js"), // (the reader comes with the first post that needs it)
    ])
      .then(([markdown, { render }]) => set(post, render(markdown), markdown.replace(/```[\s\S]*?```|<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length))
      .catch((error) => {
        console.warn(`Post "${post.slug}" unavailable:`, error?.message || error);
        post.loading = null; // (asked again the next time it is opened)
        set(post, `<p class="post-missing">This post could not be loaded. <a class="panel-link" href="#/blogs/${post.slug}" data-action="retry" data-slug="${post.slug}">Try again</a></p>`, 0);
      });
    return post.loading;
  }

  function reading(post, on) {
    post.open = !!on;
    if (post.open) post.keep(); // (now, before it is seen: its widths, its section, its caret)
    for (const demo of post.el.querySelectorAll("post-demo")) demo.active = post.open;
  }

  return api;
}
