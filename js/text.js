/* ==========================================================================
   Typographic effects: word-by-word reveals and a "decode" for mono labels.
   ========================================================================== */

/** Wraps each word of `el` in .word > span so CSS can raise the words out
    of their own masks; each word gets --i for staggering. Text only. Plain
    inline spans, so assistive tech still reads one continuous phrase. */
export function splitWords(el, start = 0) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = "";
  words.forEach((word, i) => {
    const outer = document.createElement("span");
    const inner = document.createElement("span");
    outer.className = "word";
    outer.style.setProperty("--i", start + i);
    inner.textContent = word;
    outer.append(inner);
    el.append(outer, i < words.length - 1 ? " " : "");
  });
  return start + words.length;
}

const GLYPHS = "0123456789/\\_-+=<>#*";
const running = new WeakMap();

/** Resolves `text` into `el` left to right; unresolved characters flicker
    through GLYPHS. Mono type keeps every frame the same width. */
export function decode(el, text = el.textContent, { duration = 520, delay = 0, still = false } = {}) {
  cancelAnimationFrame(running.get(el));
  if (still) { el.textContent = text; return; }
  const start = performance.now() + delay;
  const frame = (now) => {
    const progress = Math.min(Math.max((now - start) / duration, 0), 1);
    const resolved = Math.floor(progress * text.length);
    let out = text.slice(0, resolved);
    for (let i = resolved; i < text.length; i++) {
      out += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (progress < 1) running.set(el, requestAnimationFrame(frame));
  };
  running.set(el, requestAnimationFrame(frame));
}
