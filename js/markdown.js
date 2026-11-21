/* ==========================================================================
   Markdown — a post's text into HTML. A small reader for the Markdown that
   posts are written in (blog/<slug>/post.md): headings, paragraphs,
   emphasis, links, pictures, lists, quotes, tables, rules and fenced code.
   HTML is let through as it is, so a post can hold anything the page can:
   a <post-demo>, an inline drawing, a <kbd>. It is not all of CommonMark,
   only what a post here needs; a post that needs more can say it in HTML.

   Headings are set a level down (`#` and `##` are sections, <h3>): the
   post's title is the article's own heading. A picture alone in a
   paragraph is a figure, its title the caption:

     ![What it shows](picture.svg "The caption under it")
   ========================================================================== */

const escape = (text) => text.replace(/&(?!#?\w+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attribute = (text) => escape(text).replace(/"/g, "&quot;");

/* Elements that stand as blocks when a line starts with them (and any
   custom element: a name with a hyphen in it). Other tags are part of a
   paragraph's text. */
const BLOCKS = new Set(("address article aside audio blockquote canvas details dialog div dl fieldset figcaption figure footer form "
  + "h1 h2 h3 h4 h5 h6 header hr iframe main nav ol p picture pre script section style summary svg table ul video").split(" "));

const FENCE = /^(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/;
const HEADING = /^(#{1,4})\s+(.*?)\s*#*\s*$/;
const RULE = /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const QUOTE = /^ {0,3}>\s?/;
const TAG = /^ {0,3}<(?:!--|([a-zA-Z][\w-]*)(?=[\s>/]))/;
const DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/** A line's text: code spans, pictures, links, strong and emphasis, with
    tags let through. (What is done is set aside under a marker, so that
    nothing later reads it again.) */
function inline(text) {
  const kept = [];
  const keep = (html) => `\u0000${kept.push(html) - 1}\u0000`;
  return text
    .replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, ticks, code) => keep(`<code>${escape(code.trim())}</code>`))
    .replace(/\\([\\`*_{}[\]()#+\-.!|<>~])/g, (_, character) => keep(escape(character)))
    .replace(/<(https?:\/\/[^\s<>]+)>/g, (_, url) => keep(`<a href="${attribute(url)}">${escape(url)}</a>`))
    .replace(/<!--[\s\S]*?-->|<\/?[a-zA-Z][\w-]*(?:\s[^<>]*)?\/?>/g, (tag) => keep(tag))
    .replace(/!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"([^"]*)")?\s*\)/g, (_, alt, src, title) =>
      keep(`<img src="${attribute(src)}" alt="${attribute(alt)}"${title ? ` title="${attribute(title)}"` : ""} loading="lazy" decoding="async" />`))
    .replace(/\[([^\]]+)\]\(\s*(\S+?)(?:\s+"([^"]*)")?\s*\)/g, (_, label, url, title) =>
      `${keep(`<a href="${attribute(url)}"${title ? ` title="${attribute(title)}"` : ""}>`)}${label}${keep("</a>")}`)
    .replace(/[&<>]/g, (character) => (character === "&" ? "&amp;" : character === "<" ? "&lt;" : "&gt;"))
    .replace(/&amp;(#?\w+;)/g, "&$1")
    // Strong and emphasis: what is marked starts and ends on a character,
    // not a space (`a * b * c` stays as it is), and an underscore marks
    // only at a word's edge (so does `snake_case`). Written without
    // lookbehind, which older Safari can't parse: what stands before an
    // underscore is matched and put back.
    .replace(/\*\*\*(\S|\S[\s\S]*?\S)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(\S|\S[\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^A-Za-z0-9])__(\S|\S[\s\S]*?\S)__(?![A-Za-z0-9])/g, "$1<strong>$2</strong>")
    .replace(/\*([^\s*]|[^\s*][^*\n]*?[^\s*])\*/g, "<em>$1</em>")
    .replace(/(^|[^A-Za-z0-9_])_([^\s_]|[^\s_][^_\n]*?[^\s_])_(?![A-Za-z0-9_])/g, "$1<em>$2</em>")
    .replace(/(?: {2,}|\\)\n/g, "<br />\n")
    .replace(/\u0000(\d+)\u0000/g, (_, i) => kept[i]);
}

/** A table's row as its cells. (A pipe written `\|` is part of a cell's
    text: it is set aside while the row is split.) */
const cells = (line) => line.trim().replace(/\\\|/g, "\u0001").replace(/^\||\|$/g, "").split("|")
  .map((cell) => cell.trim().replace(/\u0001/g, "|"));

/** Whether a line starts something other than a paragraph's text. */
function opens(line, next) {
  // (Only a bullet, or a list numbered from 1, cuts a paragraph short:
  // "2026. It was…" at the start of a line is a sentence.)
  if (FENCE.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line) || /^\s*(?:[-*+]|1[.)])\s+\S/.test(line)) return true;
  const tag = line.match(TAG);
  if (tag && (!tag[1] || BLOCKS.has(tag[1].toLowerCase()) || tag[1].includes("-"))) return true;
  return line.includes("|") && next !== undefined && DIVIDER.test(next);
}

/** Markdown as HTML (a string). */
export function render(source) {
  const lines = String(source).replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    // Fenced code: as it is, to the closing fence.
    const fence = line.match(FENCE);
    if (fence) {
      const body = [];
      for (i++; i < lines.length && !lines[i].startsWith(fence[1]); i++) body.push(lines[i]);
      i++;
      out.push(`<pre${fence[2] ? ` data-lang="${attribute(fence[2])}"` : ""}><code>${escape(body.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const level = Math.max(3, heading[1].length + 1);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (RULE.test(line)) {
      out.push("<hr />");
      i++;
      continue;
    }

    // HTML, as it is: to the line that closes the element it opens (or a
    // comment's end), blank lines and all.
    const tag = line.match(TAG);
    if (tag && (!tag[1] || BLOCKS.has(tag[1].toLowerCase()) || tag[1].includes("-"))) {
      const closes = !tag[1] ? /-->/
        : tag[1].toLowerCase() === "hr" ? /^/ // (it has no end to wait for)
        : new RegExp(`</${tag[1]}\\s*>|^ {0,3}<${tag[1]}\\b[^>]*/>\\s*$`, "i");
      const block = [];
      do block.push(lines[i]); while (!closes.test(lines[i++]) && i < lines.length);
      out.push(block.join("\n"));
      continue;
    }

    if (QUOTE.test(line)) {
      const inner = [];
      for (; i < lines.length && lines[i].trim() && (QUOTE.test(lines[i]) || !opens(lines[i], lines[i + 1])); i++) inner.push(lines[i].replace(QUOTE, ""));
      out.push(`<blockquote>${render(inner.join("\n"))}</blockquote>`);
      continue;
    }

    // A list: its items at this indent, each with whatever is set in
    // under it (more text, another list).
    const first = line.match(ITEM);
    if (first) {
      const indent = first[1].length;
      const ordered = /\d/.test(first[2]);
      const items = [];
      while (i < lines.length) {
        const item = lines[i].match(ITEM);
        if (!item || item[1].length !== indent || /\d/.test(item[2]) !== ordered) break;
        const inner = [item[3]];
        for (i++; i < lines.length; i++) {
          const blank = !lines[i].trim();
          const deeper = lines[i].match(/^\s*/)[0].length > indent;
          if (blank) {
            // (A blank line stays in the item only if what follows is set in under it.)
            const after = lines.slice(i + 1).find((l) => l.trim());
            if (after === undefined || after.match(/^\s*/)[0].length <= indent) break;
            inner.push("");
          } else if (deeper) inner.push(lines[i].slice(Math.min(lines[i].match(/^\s*/)[0].length, indent + 2)));
          else if (ITEM.test(lines[i]) || opens(lines[i], lines[i + 1])) break;
          else inner.push(lines[i].trim()); // (a paragraph's line, run on)
        }
        const html = render(inner.join("\n"));
        const only = html.match(/^<p>([\s\S]*)<\/p>$/);
        items.push(`<li>${only && !only[1].includes("<p>") ? only[1] : html}</li>`);
        while (i < lines.length && !lines[i].trim()) i++;
      }
      const start = ordered && first[2] !== "1." && first[2] !== "1)" ? ` start="${parseInt(first[2], 10)}"` : "";
      out.push(ordered ? `<ol${start}>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
      continue;
    }

    // A table: a row of headings, a row of dashes, the rows.
    if (line.includes("|") && lines[i + 1] !== undefined && DIVIDER.test(lines[i + 1])) {
      const aligns = cells(lines[i + 1]).map((cell) => (/^:-+:$/.test(cell) ? "center" : /-:$/.test(cell) ? "right" : ""));
      const row = (texts, cell) => `<tr>${texts.map((text, k) => `<${cell}${aligns[k] ? ` style="text-align:${aligns[k]}"` : ""}>${inline(text)}</${cell}>`).join("")}</tr>`;
      const head = row(cells(line), "th");
      const body = [];
      for (i += 2; i < lines.length && lines[i].trim() && lines[i].includes("|"); i++) body.push(row(cells(lines[i]), "td"));
      out.push(`<div class="table"><table><thead>${head}</thead><tbody>${body.join("")}</tbody></table></div>`);
      continue;
    }

    // A paragraph: lines up to a blank one, or to whatever opens next.
    const text = [line];
    for (i++; i < lines.length && lines[i].trim() && !opens(lines[i], lines[i + 1]); i++) text.push(lines[i]);
    const paragraph = text.map((l) => l.replace(/^ {1,3}(?=\S)/, "")).join("\n");
    const picture = paragraph.match(/^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"([^"]*)")?\s*\)$/);
    if (picture) {
      const [, alt, src, caption] = picture;
      out.push(`<figure><img src="${attribute(src)}" alt="${attribute(alt)}" loading="lazy" decoding="async" />${caption ? `<figcaption>${inline(caption)}</figcaption>` : ""}</figure>`);
    } else out.push(`<p>${inline(paragraph)}</p>`);
  }
  return out.join("\n");
}
