/* ==========================================================================
   Typing: text strikes in a character at a time, like a typewriter.
   ========================================================================== */

const pending = new WeakMap(); // element -> { html, timer } while it types

/** Types the text of `el` in, keeping its markup (<br>, spans): every
    character is wrapped in .ch and CSS strikes each one in after the one
    before it (see .is-typing in main.css). Assistive tech reads a hidden
    full copy meanwhile, so a heading focused mid-typing is announced whole.
    The original markup is restored once the last key lands. Returns the
    duration in ms. */
export function typeIn(el, { delay = 0, speed = 12, still = false } = {}) {
  finish(el);
  if (still) return 0;
  const html = el.innerHTML;
  const spoken = document.createElement("span");
  spoken.className = "visually-hidden";
  spoken.textContent = el.textContent.replace(/\s+/g, " ").trim();
  const typed = document.createElement("span");
  typed.setAttribute("aria-hidden", "true");
  typed.innerHTML = html;
  let n = 0;
  const wrap = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.ELEMENT_NODE) { wrap(child); continue; }
      if (child.nodeType !== Node.TEXT_NODE) continue;
      const keys = document.createDocumentFragment();
      for (const char of child.data) {
        if (/\s/.test(char)) { keys.append(char); continue; } // spaces keep text wrapping
        const key = document.createElement("span");
        key.className = "ch";
        key.style.setProperty("--n", n++);
        key.textContent = char;
        keys.append(key);
      }
      child.replaceWith(keys);
    }
  };
  wrap(typed);
  el.replaceChildren(spoken, typed);
  el.style.setProperty("--type-delay", `${delay}ms`);
  el.style.setProperty("--type-speed", `${speed}ms`);
  el.classList.add("is-typing");
  const duration = delay + n * speed;
  pending.set(el, { html, timer: setTimeout(() => finish(el), duration + 60) });
  return duration;
}

/** Ends a typing run early, restoring the element's markup. */
function finish(el) {
  const run = pending.get(el);
  if (!run) return;
  clearTimeout(run.timer);
  pending.delete(el);
  el.innerHTML = run.html;
  el.classList.remove("is-typing");
}

const retyping = new WeakMap();

/** Replaces the text of `el` by typing `text` over it. */
export function retype(el, text, { speed = 14, still = false } = {}) {
  clearTimeout(retyping.get(el));
  if (still) { el.textContent = text; return; }
  let n = 0;
  const key = () => {
    el.textContent = text.slice(0, ++n);
    if (n < text.length) retyping.set(el, setTimeout(key, speed));
  };
  key();
}
