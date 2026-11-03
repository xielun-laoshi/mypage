# Sheron Yang Portfolio Website

This is the sourcecode for my personal website.

## Structure

| File | Role |
|---|---|
| `index.html` | Markup: masthead, axes, the field's band, contact panel, one `<article>` per project, footer |
| `css/main.css` | All styling: tokens (palette, type scale, layout anchors like `--line`), the frame, index, panels, motion, responsive and reduced-motion rules |
| `js/main.js` | Entry point: hash routing between views, panel transitions, the intro, field framing per view, probe readout, theme sweep |
| `js/field.js` | The particle field: GLSL shaders + a small WebGL renderer (no libraries) |
| `js/cursor.js` | The elastic, theme-inverting cursor lens |
| `js/text.js` | The typewriter: text types itself in, a key at a time, on one clock locked to the display's frames |
| `fonts/` | Self-hosted subset fonts, their licenses, and `build.py`, which produced them |

## Views

The page is one screen with four views, each linkable:

| URL | View |
|---|---|
| `/` | Home: the field as a landscape |
| `/#/projects` | The project index (the field becomes a texture) |
| `/#/projects/<slug>` | A project's panel, e.g. `/#/projects/ann` |
| `/#/contact` | Contact (the field calms) |

Back/forward and Escape move between them; ← / → page through projects. On
touch screens, hold a finger on the field to probe it.

To add or edit a project, edit its `<article class="panel project" id="project-…">`
in `index.html`: `data-title` / `data-meta` are its index row (meta parts are
separated by ` - `), the article body is its panel, and the slug is the id
without `project-`. Index order follows document order.

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

Some design and composition ideas come from Keita Yamada's Portfolio: https://p5aholic.me/
The ThreeJS animation got its ideas and is referenced from: https://codepen.io/Callum-Martin/pen/KoaMgM
The elastic cursor idea comes from: https://codepen.io/gusevdigital/pen/MWxyXRa
Hope you enjoyed the design!
