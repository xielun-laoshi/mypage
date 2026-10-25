# Sheron Yang Portfolio Website

This is the sourcecode for my personal website.

## Structure

| File | Role |
|---|---|
| `index.html` | Markup: masthead, axes, the field's band, contact panel, one `<article>` per project, footer |
| `css/main.css` | All styling: tokens (palette, type scale, layout anchors like `--line`), the frame, index, panels, motion, responsive and reduced-motion rules |
| `js/main.js` | Entry point: hash routing between views, the intro, field framing per view, probe readout, theme sweep, index row opacity |
| `js/field.js` | The particle field: GLSL shaders + a small WebGL renderer (no libraries) |
| `js/cursor.js` | The elastic, theme-inverting cursor lens |
| `js/text.js` | Word-by-word reveals and the mono "decode" effect |
| `fonts/` | Self-hosted subset fonts, their licenses, and `build.py`, which produced them |

## Views

The page is one screen with four views, each linkable:

| URL | View |
|---|---|
| `/` | Home: the field as a landscape |
| `/#/projects` | The project index (the field becomes a texture) |
| `/#/projects/<slug>` | A project's panel, e.g. `/#/projects/ann` |
| `/#/contact` | Contact (the field settles into a single trace) |

Back/forward and Escape move between them.

To add or edit a project, edit its `<article class="panel project" id="project-…">`
in `index.html`: `data-title` / `data-meta` are its index row (meta parts are
separated by ` - `), the article body is its panel, and the slug is the id
without `project-`. Index order follows document order.

## Fonts

All open source (SIL OFL 1.1), subset to Latin by `fonts/build.py`:

- **SY Display**: [Mona Sans](https://github.com/github/mona-sans), renamed as its license requires for modified copies
- **Newsreader**: [Newsreader](https://github.com/productiontype/Newsreader) by Production Type
- **SY Mono**: [Monaspace Neon](https://github.com/githubnext/monaspace), renamed as its license requires

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
