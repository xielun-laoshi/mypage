# Sheron Yang Portfolio Website

This is the sourcecode for my personal website.

## Structure

| File | Role |
|---|---|
| `index.html` | Markup: masthead, axes, the field's band, the two lists (projects, posts), contact panel, one `<article>` per project, footer |
| `css/main.css` | All styling: tokens (palette, type scale, layout anchors like `--line`), the frame, index, panels, motion, responsive and reduced-motion rules |
| `js/main.js` | Entry point: hash routing between views, the two lists, panel and sheet transitions, the intro, field framing per view, probe readout, the change of theme |
| `js/field.js` | The particle field: GLSL shaders + a small WebGL renderer (no libraries) |
| `js/background.js` | Mode preference, lazy loading, first-frame crossfades, visibility and teardown |
| `js/ascii.js` | The typed screen: sets whichever background is showing in Lekton characters, and mixes two of them cell by cell while they change |
| `js/frame.js` | The frame typed to match: the rulers on the axes and their carets on the band's grid, the panels' typed edge, the name lettered in the band's characters, and the frame's moves as stairs a character at a time; and the band's own height, a whole count of rows that reaches from ruler to ruler |
| `js/wave.js` | The waves typed over the page, drawn by the GPU: a panel's place filling with the band's characters cell by cell, the wave that takes a panel as it passes, and a change of theme turning the whole page over from the switch |
| `js/clearing.js` | Where the band's characters make way for the words set over it (the caption, the readout, the row pointed at): every cell's distance from the letters' own ink, and which words the band gathers at where the pointer is on them (a list's row) |
| `js/stage.js` | WebGL 2 lifecycle and framing helpers, loaded only with an alternate background |
| `js/slats.js`, `js/topography.js` | Plain-JS ports of React Bits Micro Slats and Topography |
| `js/cursor.js` | The elastic cursor: a ring typed in characters on the page's grid |
| `js/text.js` | The typewriter: text types itself in, a key at a time, on one clock locked to the display's frames |
| `js/blog.js` | The blog: a sheet for each post, a post's text fetched and set when it is first wanted, the list of its sections, and `<post-demo>`, the frame a post's live demos run in |
| `js/markdown.js` | A small Markdown reader for the posts, fetched with the first post opened |
| `blog/` | The posts themselves, apart from the page's code: `posts.js` (the list) and a folder for each post (see [Blog](#blog)) |
| `.nojekyll` | Has GitHub Pages serve the files as they are (it would otherwise turn every `post.md` into a page of its own) |
| `fonts/` | Self-hosted subset fonts, their licenses, and `build.py`, which produced them |

## Views

The page is one screen with six views, each linkable:

| URL | View |
|---|---|
| `/` | Home: the field as a landscape |
| `/#/projects` | The project index (the field becomes a texture) |
| `/#/projects/<slug>` | A project's panel, e.g. `/#/projects/ann` |
| `/#/blogs` | The blog's list of posts, the project index's twin |
| `/#/blogs/<slug>` | A post, on a sheet over the whole page, e.g. `/#/blogs/no-limit-pokerbot-recap` |
| `/#/contact` | Contact (the field calms) |

Back/forward and Escape move between them; ← / → page through projects. On
touch screens, hold a finger on the field to probe it.

The bottom-left corner offers **Waves** (the particle field), **Slats** and
**Topography** side by side, the chosen one marked like the theme. The choice
is saved in `localStorage` (key `background`); blocked storage or an unknown
value falls back to Waves. The other backgrounds' code is fetched in an idle
moment after the intro (not with Save-Data on), and each is built the first
time it is chosen, or when the pointer rests on its name. A change takes
1.5 s (950 ms where the canvases are shown instead, see below), and a new
choice can overtake it midway. The background leaving is
paused and kept for 30 s, so it can come straight back, then released.
Reduced motion uses static backgrounds and immediate switches. Hidden tabs
stop rendering. A graphics context the browser takes back (a driver
reset, a long sleep) is made again when it returns: the band types on,
and the panels' waves are rebuilt when next wanted (until then a change
of view happens at once).

Every background is typed. Each draws a small picture out of sight (half a
pixel per CSS px), and one screen, `js/ascii.js`, sets it in Lekton
characters on a single grid: in each cell, the character from
`.-:+*<xo#0%@` whose ink matches the light there. A change runs in the
characters alone: both pictures go on as they are, and the cells turn over
from one to the other in soft drifts that cross the band at an even pace
(from the right when moving along the switch, from the left when moving
back), each easing through the characters between. Each cell's light also
follows its picture with a short lag, so characters change gradually
instead of flickering at a step. A project's signature (a row hovered in
the list, or a project opened) is typed over the old one the same way,
where the waves used to scroll a long way to reach it. On its own (home)
the band stands out with extra contrast; under the project list or a
project it recedes, the same characters struck fainter. Waves
draws its points as soft splats, so their lattice doesn't beat against the
small picture's pixels; Slats is set on the grid itself, a slat to every
character, its sea seen from farther off (zoomed out threefold, so its
swells come smaller and closer together); Topography draws fewer, wider contour
lines, so that each runs as a trail of characters. If the screen can't run
(no WebGL, or it fails), the backgrounds' canvases are shown and
cross-fade instead; `TYPED` in `js/background.js` turns the typing off.

The band is whole rows of its grid: as many as cover the space between
the two lines (`--line` from the top and the bottom of the window), an odd
count, so that one row runs through the middle. Its first row therefore
starts a little above the top line and its last ends a little below the
bottom one (a row at the most), and the rulers are typed on the rows next
to those: the band's characters stand directly against both rulers, a row
apart like any two rows inside it, at every size of window and every
pixel ratio (`rowsBetween` in `js/frame.js`, `--ov-top` and `--ov-bottom`
in `css/main.css`). The band's box used to stop at the two lines and cut
its first and last rows short; in a window where most of a row was cut
off, a strip of blank paper deeper than a row lay between each ruler and
the band. Its canvas is exactly those rows in the screen's own pixels, so
nothing is cut and nothing is stretched.

A typed picture has no edge. Where its light sinks below the lightest
character's, its points go on, in fewer and fewer of the cells and struck
fainter, until none is left. Each cell has its turn, in an order spread
evenly over the screen (a blue-noise mask, made as the page starts), so
the picture thins out like a mist instead of ending on a line. It runs
from ruler to ruler and settles against them: toward either, what is
brighter than a point is struck lighter, so nothing heavy stands against
the rulers, while the points run on. (The screen does this. The
backgrounds dim themselves toward the axes only where their own canvases
are shown: dimmed whole and then typed, a picture's quiet end fell below
the lightest character and was cut off in a straight line, leaving an
empty strip under the name and around the caption.) On the lighter grid
of points that small or slow screens get, each point carries the light of
the four it stands for, so a phone's landscape is as bright as a wide
screen's; and on a tall band Topography's camera looks further down, so
the land fills it instead of fading into an empty sky.

The two themes strike the characters differently, so that they read
alike. Light type on dark paper reads heavier than it is, and dark type
on light paper lighter: the thin, soft-edged characters that glow on the
dark page came out pale and blurred on the light one. On the light page
their edges are firmed (a stroke's soft rim is drawn up to full ink, so
even a stroke thinner than a pixel is struck whole), the faint ones are
struck harder, and all are set in the regular cut at every pixel ratio
(`STRIKE` in `js/ascii.js`; the dark page sets them bold where a pixel is
a whole CSS px, to keep thin strokes, and firmed they keep by themselves).
The frame's typed parts (the name, the rulers, the panels' edge) are
firmed the same way in CSS: struck four times in one place
(`--typed-firm` in `css/main.css`).

Where the page's words lie over the band (the caption, the readout, the
project row under the pointer), the band's characters make way for them
(`js/clearing.js`). The words are
drawn as they stand, letter by letter, and every cell of the grid is
given its distance from the nearest of their ink. The cells the ink
touches make way entirely, and those about them less and less, out to a
few characters away: the picture parts around the letters themselves,
along their ascenders and round their ends, and thins toward them, and a
ridge or the pointer's lift passing by flows around the words. A clearing
opens as its words are typed, a moment ahead of the keys, and closes
behind them when they are struck out; the cells get there by degrees,
giving way quickly and coming back slowly. Under the project list the
band stays an even texture, and only the row pointed at stands clear of
the signature it previews.

On that row the band goes on answering the pointer. A row's words are two
close lines of large type: making way for them left no cell free where
the pointer was, so the surface it lifts went blank under it, and the
band seemed to stop the moment the pointer came onto a title. Now, within
about 110 px of the pointer, the picture gathers against the row's words
instead of giving way to them: only the cells at the letters' ink stay
empty, its points run on up to those, and what is brighter than a point
is struck up to three times as bright (never past full), most at the
ink. It gathers about the words, never in among them: between a line's
first letter and its last, and between two lines of a title, the band
only makes way, as it did (`among` in `js/clearing.js`), so a wide space
in a title is as clear as a narrow one. So what the pointer lifts wells
up along the upper and lower edges of the title and goes along it with
the pointer; away from the pointer the row is cleared as before (`GATHER`
in `js/ascii.js`; rows of the two lists only: about the caption on home,
where the band is struck at full strength, the same crowded the words).

The frame around the band is typed to match it (`js/frame.js`), on the
band's own grid and in its type (9 px Lekton, a character to a cell). The
axes are rulers, a dash to a column with `+` at the sixths, and the carets
riding them are inverted cells pointing into the band (`v`, `^`), stepping
from column to column. The name is lettered in one of the band's
characters (`x`), in cells of its own (0.6 em wide, narrower than the
band's, so its strokes close up), in a small face of capitals drawn for it:
five rows tall, every stroke a single cell wide, so it reads slender and
light (the plain name stays for screen readers; a name with a letter the
face lacks is drawn from Lekton's own capitals instead).
It develops as the intro ends, each cell rising through the characters to
its own, and a ripple spreads through it from where the pointer comes onto
it, out to both ends. Choices stand in
typed brackets (`[ Waves ]`), a hovered row types out an arrow (`01 ->`),
a project's specs sit between typed rules, and the caption's cursor waits
after it. A panel's edge is typed too: broken bars (`¦`) down every row,
crossing the rulers in a `+`, with the panel's edge set on one of the
band's columns. The band's rows run on over the whole page, and everything
typed sits on them. The pointer's ring is typed in `+` after Nomad-1217's
[ASCII Circles](https://www.deviantart.com/nomad-1217/art/ASCII-Circles-36824821):
drawn into whole cells of the grid, so over the band its characters take
the place of the band's own (each is set on a cell of paper there; over
words it is the character alone, so the ring never blanks a letter out);
it keeps the old lens's elastic follow, squash and stretch, and sizes.
Without scripts the name and the frame stay plain.

Nothing on the page glides or fades; it is typed. A panel arriving fills
its place with the band's characters, cell by cell in a drift from the side
it comes from (from below on a phone, from the left when stepping back to
the project before), each cell stepping up through `.-:+*<xo#0%@` into
paper; then the panel shows and types itself in: its labels and heading key
by key, its specs with their rules typing out, its paragraphs printing a
line at a time (`js/wave.js`, `js/main.js`). A panel leaving is taken by
the same wave: as it passes, each cell blanks over the panel's words, then
steps back down through the characters into the page, so the words go
with the wave, not all at once ahead of it. Brackets are struck, `[`
and then `]`; a hovered row's title steps over a character as its arrow
types; the steps' arrows grow a dash (`<--`, `-->`); the close link stands
in brackets (`[ x CLOSE ]`). The intro's ruler types out a column at a
time, the rulers part a row at a time, and the frame's labels type in as
it ends. The caption is struck out, key by key from its end, when the
page leaves home, and types itself in again when you come back.

A change of theme is typed over the whole page (`js/wave.js`). A wave
spreads from the switch that was pressed, and each cell turns over as it
passes: up through the characters in the old ink on the old paper, until
it is nearly all ink, then down through them again in the new ink on the
new paper. The palette is symmetric (the old ink is the new paper's
shade), so a cell grows lighter, or darker, a step at a time all the way
across. Under the wave the browser swaps the old page for the new (a view
transition whose opening grows from the switch, its edge always under
cells that are mid-turn), so both pages are exactly themselves on either
side. The wave covers the whole screen with every cell on the move, so
the GPU draws it; where the browser has no view transitions, or motion is
reduced, the palette changes at once.

What moves keeps a rhythm. A move made in whole characters shows every
one of its steps, so the curves those moves follow barely rest at either
end (`STEADY` in `js/frame.js`): on a curve that starts and ends at rest,
the first and the last step were each held for a quarter of a second, and
the ones next to them stuttered. A change of view sets off gently, too:
the band's framing, its opacity and its contrast each chase a lead that
chases the goal, so they start from rest and come to rest, where they
used to set off at their fastest. And a press during a change of theme is
not lost (the browser hands it to the page's root while the change is
drawn): it ends the change and goes to the control under it.

The site uses native WebGL, with no iframe, Three.js, React, or package runtime.
The alternate modes require WebGL 2. Slats additionally requires float
render targets for its pointer-driven fluid; unsupported modes are removed
from the cycle for that visit. Waves remains the default/fallback.

The verification report and its screenshots (acceptance results, final
visual settings, resource counts, testing limits, and the measurements the
comments in the code refer to as `qa/README.md`) are kept beside the code in
`qa/`, which is not committed: GitHub Pages serves every committed file.

To add or edit a project, edit its `<article class="panel project" id="project-…">`
in `index.html`: `data-title` / `data-meta` are its index row (meta parts are
separated by ` - `), the article body is its panel, and the slug is the id
without `project-`. Index order follows document order.

## Blog

The **Blogs** list is the project index's twin: the same rows (a number,
the title, then the date and tags, and a line on what the post is about),
typed in the same way, with the band previewing each row's signature and
making way for it. A post opens on a sheet over the whole page, on every
screen: brought and taken by the same typed wave as a panel (from below,
as a panel comes on a phone), with rulers of its own, a caret on the top
one marking how far down you are, and Close, Escape or Back returning to
the list as it was left. The sheet is set out for the window it is read
in (see [How a post is set out](#how-a-post-is-set-out)). A post's
address is `/#/blogs/<slug>`.

What a post says is kept apart from the page's code, in `blog/`:

| File | Role |
|---|---|
| `blog/posts.js` | The list: an entry for each post (`slug`, `title`, `date`, `summary`, optional `tags`), newest first |
| `blog/<slug>/post.md` | The post's text, in Markdown |
| `blog/<slug>/…` | Whatever it shows: pictures, and its demos' modules |

To add a post: make its folder, write `post.md`, and add its entry at the
top of `blog/posts.js`. The row in the list, the count beside **Blogs**,
the sheet and the steps from post to post all follow from the entry. A
post's text is fetched the first time it is opened (or its row pointed
at), and the Markdown reader with it, so the page starts no heavier for
having posts.

The list is written by hand, so it is read with care: a slip in
`blog/posts.js` (a comma, a quote) leaves the page with no posts and a
warning in the console, not without its scripts, and an entry that can't
be listed (no title, or a slug that is taken or isn't letters, digits and
hyphens) is left out the same way. A list with nothing in it says so.

### How a post is set out

A post is written once and set out by the window it is read in. Nothing
in `post.md` says how; the rules are in `css/main.css` (the `Blog` block),
and `js/blog.js` makes the list of sections and measures code and tables.

Everything on the sheet stands on one of **three widths**, each inside
the next, worked out from the window:

| Width | What stands on it | How wide |
|---|---|---|
| The text's (`--prose`) | Paragraphs, headings, lists, quotes, and code and tables that fit | Three quarters of the sheet's width, but at least 76 characters where the sheet has them and never more than 100 |
| A figure's (`--media`) | Figures, demos, and code or a table the text's width can't hold | Halfway between the other two |
| The sheet's (`--full`) | Whatever is marked `wide`, and code or a table that needs it | All the sheet has for the post, up to four thirds of the longest line of text |

So a page ends on three lines and no others, and the steps between them
are even. Which width a thing has follows from what it is; the post only
says `wide`, and only where it wants to. A demo is marked in its tag
(below); a figure is written in HTML to be marked:
`<figure class="wide"><img src="…" alt="…" /><figcaption>…</figcaption></figure>`.
Code and tables are measured: a block of code takes the least width that
holds its longest line, a table the least that sets its rows on single
lines, and either scrolls sideways only when the widest won't do.

| Window | How the sheet is set out |
|---|---|
| Under 900 px wide: phones, upright tablets, narrow windows | One column in the middle: title, specs, summary, text. A wider thing reaches out evenly on both sides (on a phone all three widths are the screen's) |
| 900 px and wider | The title across the top. Under it, at the left, a slim rail with the specs and **Contents**, and the post beside it: text, figures and demos share their left edge and step out to the right |
| Wider than rail and post need (from about 1540 px) | The same, in the middle of the window, with the room left over on both sides |

- **Type.** The text is 15 px on a phone, 16.5 px in a 1536 px window,
  17.7 px at 1920 and 21 px at most (`--read`). Section headings are 1.3
  times the text and the title at most 2.1 times; code, captions and
  tables are set a size under it. All of them keep step as it grows.
- **A line of text** holds 76 characters in a small desktop window and
  lengthens with the window to 100 (in a 1536 px one), where it stays.
  A paragraph's last line is not left with a single word, where the
  browser can help it.
- **Contents.** The list in the rail is made from the post's `##`
  headings; two or more make a list. It marks the section being read, a
  line of it goes to its section, and it stays in place while the text
  scrolls (in a window at least 500 px tall).

To change the proportions, the numbers to turn are on `.panel.post`
(`--read`, and `--prose-min` and `--prose-max`: the line's least and
most, 38 and 50 times the type's size, which is 76 and 100 characters)
and on `.post-body` (`--rail` and `--gutter` in the 900 px rule, and the
`0.75` that sets the text against the sheet in `--full` and `--prose`).

`js/markdown.js` reads headings (`##` for a section, `###` under it),
emphasis, links, lists, quotes, tables, rules and fenced code (name the
language after the fence). A picture alone in a paragraph becomes a
numbered figure, its title the caption:
`![What it shows](picture.svg "The caption under it")`. Addresses are
taken from the post's own folder. A heading can be linked to from the
post's own text by its words (`[as said above](#from-light-to-ink)`).
HTML is let through as it is, for anything Markdown has no word for.

### Demos

A post can hold live things. Each is an ES module in the post's folder,
set in the text where it belongs:

```html
<post-demo src="light.js" title="A light, typed" wide>
An optional caption.
</post-demo>
```

`<post-demo>` (`js/blog.js`) is the frame: it names and numbers the demo,
gives it a stage, loads the module when the reader comes near, and tells
it when to run. A demo stands on a figure's width, and on the sheet's
when it is marked `wide` (see [How a post is set out](#how-a-post-is-set-out));
it is told its stage's width and told again when the window changes it.
The module exports one function:

```js
export default function mount(stage, demo) {
  // Fill `stage`, an empty element: a canvas, text, controls, anything.
  // demo.running    draw only while true: the sheet is open, the demo in view
  // demo.theme      "dark" or "light" (or style with var(--ink), var(--bg))
  // demo.reduced    the reader asked for less motion: show a still state
  // demo.width, demo.height   the stage, in CSS px
  // demo.watch(fn)  fn(demo) runs whenever any of those change
  // demo.signal     aborts when the demo is put away
  return () => { /* clean up */ };
}
```

A demo is put away when its sheet closes and made afresh when it opens
again, so nothing runs out of sight. The article's own styles stop at the
stage: a demo styles what it puts there, and inherits the page's face and
colors. Controls inside an element of class `demo-controls` take the
page's look (buttons in brackets, sliders as short rulers). A finger on
the stage still scrolls the sheet, and Escape still closes it.

The site has no build step, so there is no MDX; `<post-demo>` does its
job, a component in the middle of Markdown. A module can import whatever
it needs, a library from a CDN included: a React component, for one, is
rendered into the stage with `createRoot(stage).render(…)` and unmounted
in the cleanup.

## Keeping it light

What the page costs while it is open is the band's animation, and little
else. What keeps that down, and what to keep in mind when changing it:

- **Frames.** A background at rest draws at most about 105 times a second
  (every other frame on a 120 Hz screen); the typed screen draws every
  frame, since each cell's light follows its picture gradually. Hidden
  tabs draw nothing, and neither does the band while a sheet covers it.
- **Points.** Waves draws only the rows of its plane that can be in sight
  (`rowsInSight` in `js/field.js`). Seen from above, under the lists and
  the panels, that is about half of them; on home all of them can be, and
  all are drawn. The picture is the same point for point: the rule rests
  on the most the surface can rise or sink (`WAVE_MOST`), so change the
  wave's shader and that bound together. Which rows is worked out when
  what it rests on changes, not on every frame; the pointer's lift and a
  ripple change by a hair a frame for seconds, so their share of the
  bound is rounded up to half a unit, and the answer stands meanwhile.
- **Scrolling a post.** On a screen between 1 and 1.5 device px to a CSS
  px (Windows at 125%, say) the browser, left to itself, scrolls a
  post's sheet on the main thread, and paints and rasters the whole sheet
  again at every step. There the sheet's scroller is given
  `will-change: scroll-position` (the `Blog` block of `css/main.css`),
  which moves the scrolling to the compositor: some 30 frames lost in a
  slow scroll through the first post became 6 (a fast fling loses what it
  lost). It has a price that is seen: text scrolled so is smoothed in
  grays, where without the hint the browser smooths that sheet's text in
  grays or in colored subpixels by turns, as the window's height falls.
  That was chosen. And the compositor sets what it scrolls on the
  screen's pixels in its own way: at some places of a scroll a paragraph
  or two stand one device pixel lower than they did. At 1 and under
  the text is in subpixels at every size of window and is left as it is;
  from 1.5 up the browser does all this by itself. Two other ways were
  tried and dropped: an opaque background on the scroller (it keeps
  subpixel text at 1, but lost as many frames as before there, and turned
  gray text into subpixel text at 1.25), and the same hint on the side
  panels (their text is short: nothing gained that could be measured).
- **Nothing ticks for nothing.** The caption's cursor blinks on a timer
  (`blink` in `js/main.js`), not as a CSS animation: a running animation
  has the browser work out the page's styles again on every frame, on
  every view, whether anything changes or not. Prefer a timer or a
  one-shot transition for anything that changes a few times a second.
  (A timer has to ask about reduced motion itself, and each time: the
  stylesheet stops every animation the moment that is turned on, and the
  cursor's timer does the same.)
- **What runs seldom is never warm.** The clearing measures a row's words
  once in a while, 10 to 20 ms each time (`measure` in `js/clearing.js`).
  A new branch inside its loops, taken for a list's rows only, had the
  browser throw its compiled loops away the first time a row was met:
  10 ms more, in the very task a pointer or a closing post waits on. What
  is added to such a function goes after its loops, in a function of its
  own (`among`), and is timed where it runs, not in a loop of its own.

## Font

One typewriter voice throughout: [Lekton](https://github.com/google/fonts/tree/main/ofl/lekton),
drawn after Olivetti typewriter faces at ISIA Urbino (SIL OFL 1.1). Regular and
Bold are subset to Latin by `fonts/build.py`.

## Run locally

The scripts are ES modules, so open the site through any static server
(not `file://`), e.g.:

```
npx http-server -p 4173 -c-1 .
```

## Credits

Slats and Topography are adapted from the official
[React Bits source](https://github.com/DavidHDev/react-bits) (Slats is its
Micro Slats):
[Micro Slats](https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/MicroSlats/MicroSlats.jsx)
and [Topography](https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/Topography/Topography.jsx).
The ports retain their shaders, wave/terrain math, and pointer/click effects,
with monochrome ink, page-controlled framing, and shared lifecycle integration.
Micro Slats' OGL wrappers are replaced with native WebGL calls. The upstream
MIT + Commons Clause notice is retained in `js/LICENSE-react-bits.txt`.

Some design and composition ideas come from Keita Yamada's Portfolio: https://p5aholic.me/
The typed (ASCII) backgrounds take their idea from Dragonfly's site: https://dragonfly.com/
The ThreeJS animation got its ideas and is referenced from: https://codepen.io/Callum-Martin/pen/KoaMgM
The elastic cursor idea comes from: https://codepen.io/gusevdigital/pen/MWxyXRa
The cursor's typed ring follows Nomad-1217's ASCII Circles: https://www.deviantart.com/nomad-1217/art/ASCII-Circles-36824821
Hope you enjoyed the design!
