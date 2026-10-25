# Sheron Yang Portfolio Website

This is the sourcecode for my personal website.

## Structure

| File | Role |
|---|---|
| `index.html` | Page markup: header/footer controls, contact panel, one `<article>` per project |
| `css/main.css` | All page styling; layout anchors live in the `:root` tokens (`--line-inset`, `--line-gap`, `--edge-gap`, `--btn-gap`) |
| `js/main.js` | Entry point: loader, project list, panel/theme interactions, scroller boundary opacity |
| `js/field.js` | The particle-wave background: GLSL shaders + a small WebGL renderer (no libraries) |
| `js/cursor.js` | Elastic custom cursor (its theme-inverting lens is pure CSS) |
| `fonts/`, `img/` | Self-hosted fonts and the particle sprite (no third-party requests) |

To add or edit a project, edit its `<article class="about-panel project-panel">` in
`index.html`: `data-title` / `data-meta` are the list row, the article body is the
detail panel. List order follows document order.

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
