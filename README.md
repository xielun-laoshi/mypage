# Sheron Yang Portfolio Website

This is the sourcecode for my personal website.

## Structure

| File | Role |
|---|---|
| `index.html` | Page markup: header/footer controls, contact + project detail panels |
| `main.css` | All page styling; layout anchors live in the `:root` tokens (`--line-inset`, `--line-gap`, `--edge-gap`, `--btn-gap`) |
| `main.js` | Project list data (`PROJECTS`) + rendering, panel/theme interactions, scroller boundary opacity, custom cursor |
| `trial.html` | Embedded iframe: GLSL shaders + host page for the particle-wave background |
| `script.js` | Three.js scene inside the iframe (renders the wave, follows the page theme) |
| `style.css` | Iframe-local styles (full-bleed canvas, no scrollbars) |
| `three.min.js`, `spark1.png` | Vendored Three.js r86 and the particle sprite (no third-party requests) |

To add or edit a project: add an entry to `PROJECTS` in `main.js` and a matching
`<div class="about-panel project-panel" id="...">` panel in `index.html`.

## Run locally

Any static server works, e.g.:

```
npx http-server -p 4173 -c-1 .
```

## Credits

Some design and composition ideas come from Keita Yamada's Portfolio: https://p5aholic.me/
The ThreeJS animation got its ideas and is referenced from: https://codepen.io/Callum-Martin/pen/KoaMgM
The elastic cursor idea comes from: https://codepen.io/gusevdigital/pen/MWxyXRa
Hope you enjoyed the design!
