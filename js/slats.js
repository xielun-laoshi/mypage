/* ==========================================================================
   Micro slats — a wall of small slats lit by a swell that rolls toward the
   viewer in perspective, its crests glinting. Moving the pointer stirs a
   small fluid that bends the swell and leaves light in its wake; a click
   throws a splash.

   Ported from Micro Slats by React Bits (reactbits.dev/backgrounds/
   micro-slats; github.com/DavidHDev/react-bits at 4e0d091), © 2026 David
   Haz, MIT + Commons Clause: see js/LICENSE-react-bits.txt. The swell, the
   slats and the fluid are the original's shaders, run with plain WebGL 2
   calls in place of the ogl library. What changes is what this page
   needs, marked "(page)" below: the slats are ink on a transparent canvas
   (one color per theme, the light a slat carries is its opacity), the
   page's framings (js/main.js) steer the swell instead of the component's
   own intro, the wall quietens toward the two axes as the field does, and
   the page hands over the pointer instead of the component listening on
   window. One of the band's backgrounds (see js/background.js).
   ========================================================================== */

import { INK, FULLSCREEN, createStage, createPrograms, createTarget, createGlide } from "./stage.js";

/* The original's "swell" preset at a quieter pace; the framings below
   set its perspective and fog. */
const SWELL = { scale: 1.5, speed: 0.45, direction: 250, chop: 0.55, stretch: 0, glint: 0.7, contrast: 1.25 };

/* The slats, CSS px: more breathing room than the original's 10 × 25,
   3 apart. Small/low-power screens use a 1.4× pitch and a lighter fluid. */
const SLAT = { width: 8, height: 24, gap: 5, roundness: 0.75 };
const OPACITY = 0.38; // (page) leave the caption and navigation in the foreground

/* (page) Typed (js/ascii.js), the wall is set on the grid of characters
   (off it, its slats beat against them): a slat is one character, set
   close, a slat to every character (gap: across, down, in characters),
   and the character struck there is its light. The screen reads each at
   its center (its tone's spread is 0, see js/background.js), so a slat's
   soft edge never reaches the next character. */
const TYPED_SLAT = { across: 1, down: 1, gap: [0, 0] };

/* (page) Typed, the sea is seen from farther off, as if zoomed out: its
   swells come this many times as close together, a character being far
   smaller than a slat of the original's wall. */
const TYPED_ZOOM = 3;

/* The pointer, as the original's defaults: the reach of its stir (px), how
   brightly its trail lights the slats, and how long a stir lingers (s). */
const CURSOR = { size: 40, strength: 1, trail: 1.4 };

const FLUID_SIZE = 96;
const PRESSURE_STEPS = 16;
const SPLAT_FORCE = 6900;
const SPLASH_JETS = 3;
const PIXEL_BUDGET = 4.5e6;

/* (page) Framings, by the field's names (SHOTS in js/field.js): how far
   the sea recedes toward its horizon, and the haze over its far rows.
   Behind the project list the wall is seen square on, as the field is
   seen from above. */
const SHOTS = {
  line:      { perspective: 0.55, fog: 0.55 },
  landscape: { perspective: 0.55, fog: 0.55 },
  texture:   { perspective: 0,    fog: 0 },
  calm:      { perspective: 0.35, fog: 0.45 },
};
/* How fast each property chases its goal (1/s), as the field's do. */
const RATE = { perspective: 1.9, fog: 1.9, amplitude: 2.2, opacity: 3.2, sx: 1.6, sy: 1.6 };
const SEED_DRIFT = 0.05; // sea units a project's signature shifts the swell, per unit of seed

/* The swell's four wave trains (shared by the shader and sample()). */
const TURN = [0, -0.95, 0.78, 1.62];
const LENGTH = [2.6, 1.7, 1.12, 0.76];
const HEIGHT = [1, 0.75, 0.5, 0.3];
const SHIFT = [0, 2.3, 4.1, 1.1];
const floats = (values) => values.map((v) => v.toFixed(2)).join(", ");

const FLUID_VERTEX = `#version 300 es
uniform vec2 uTexel;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
void main() {
  vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  vUv = position * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0);
  vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y);
  vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FLUID_HEAD = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
`;

const SPLAT = `${FLUID_HEAD}
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec2 uPoint;
uniform vec3 uValue;
uniform float uRadius;
void main() {
  vec2 offset = vUv - uPoint;
  offset.x *= uAspect;
  float falloff = exp(-dot(offset, offset) / uRadius);
  fragColor = vec4(texture(uTarget, vUv).xyz + uValue * falloff, 1.0);
}
`;

const DIVERGENCE = `${FLUID_HEAD}
uniform sampler2D uVelocity;
void main() {
  vec2 middle = texture(uVelocity, vUv).xy;
  float left = vL.x < 0.0 ? -middle.x : texture(uVelocity, vL).x;
  float right = vR.x > 1.0 ? -middle.x : texture(uVelocity, vR).x;
  float top = vT.y > 1.0 ? -middle.y : texture(uVelocity, vT).y;
  float bottom = vB.y < 0.0 ? -middle.y : texture(uVelocity, vB).y;
  fragColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
}
`;

const PRESSURE = `${FLUID_HEAD}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  fragColor = vec4((left + right + top + bottom - divergence) * 0.25, 0.0, 0.0, 1.0);
}
`;

const PROJECT = `${FLUID_HEAD}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy - vec2(right - left, top - bottom);
  fragColor = vec4(velocity, 0.0, 1.0);
}
`;

const ADVECT = `${FLUID_HEAD}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uDt;
uniform float uFade;
void main() {
  vec2 from = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;
  fragColor = texture(uSource, from) / (1.0 + uFade * uDt);
}
`;

const SCALE = `${FLUID_HEAD}
uniform sampler2D uSource;
uniform float uValue;
void main() {
  fragColor = texture(uSource, vUv) * uValue;
}
`;

/* Pass 1, one fragment per slat: its light, its length and its glint. */
const FIELD = `#version 300 es
precision highp float;
uniform vec2 uSize;
uniform vec4 uGrid;
uniform vec2 uOrigin;
uniform vec2 uSlat;
uniform float uTime;
uniform float uScale;
uniform float uDirection;
uniform float uChop;
uniform float uStretch;
uniform float uGlint;
uniform float uContrast;
uniform float uPerspective;
uniform float uFog;
uniform float uIntro;
uniform sampler2D tVelocity;
uniform sampler2D tInk;
uniform vec2 uFluidTexel;
uniform float uFluid;
uniform float uInk;
uniform float uLean;
// (page) the framing: how high the swell runs, how strongly the wall
// shows, and a project's signature, which shifts the sea
uniform float uAmplitude;
uniform float uOpacity;
uniform vec2 uSeed;
uniform float uSettle;            // (page) 1: the wall quietens toward the axes here; 0: the typed screen sees to it
out vec4 fragColor;

const float TURN[4] = float[4](${floats(TURN)});
const float LENGTH[4] = float[4](${floats(LENGTH)});
const float HEIGHT[4] = float[4](${floats(HEIGHT)});
const float SHIFT[4] = float[4](${floats(SHIFT)});

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = uGrid.y - 1.0 - cell.y;
  vec2 center = uOrigin + vec2(cell.x, row) * uGrid.zw + uSlat * 0.5;
  float v = clamp(center.y / uSize.y, 0.0, 1.0);

  vec2 flow = vec2(0.0);
  float ink = 0.0;
  if (uFluid > 0.5) {
    vec2 fluidUv = clamp(vec2(center.x / uSize.x, 1.0 - center.y / uSize.y), 0.0, 1.0);
    flow = texture(tVelocity, fluidUv).xy * uFluidTexel * uSize;
    ink = texture(tInk, fluidUv).x;
  }

  float horizon = mix(8.0, 0.5, uPerspective);
  float depth = (1.0 + horizon) / (v + horizon);
  vec2 world = vec2((center.x - uSize.x * 0.5) / uSize.y * depth, (depth - 1.0) * horizon * 2.2);
  world -= flow * 0.00018 * depth;
  world /= max(uScale, 0.05);
  world += uSeed * ${SEED_DRIFT.toFixed(3)}; // (page)

  float meander = 0.55 * sin(dot(world, vec2(0.23, 0.41)) * 0.9 + uTime * 0.13)
    + 0.3 * sin(dot(world, vec2(-0.37, 0.19)) * 1.4 - uTime * 0.09);

  float steep = uChop * 0.45;
  float height = 0.0;
  float total = 0.0;
  for (int i = 0; i < 4; i++) {
    float angle = uDirection + TURN[i];
    vec2 heading = vec2(cos(angle), sin(angle));
    float k = 6.2831853 / LENGTH[i];
    float omega = sqrt(9.81 * k) * 0.35;
    float theta = k * dot(world, heading) - omega * uTime + SHIFT[i] + meander * (0.6 + 0.3 * float(i));
    height += HEIGHT[i] * (cos(theta) + steep * cos(2.0 * theta));
    total += HEIGHT[i] * (1.0 + steep);
  }
  float level = clamp(0.5 + 0.5 * uAmplitude * height / (total * 0.85), 0.0, 1.0); // (page) uAmplitude
  float crest = smoothstep(0.6, 1.0, level);
  float glint = crest * crest * uGlint;

  float haze = mix(1.0, 1.0 - uFog, pow(1.0 - v, 1.4));
  float light = (pow(level, uContrast) + glint * 0.8) * haze;
  float glow = 1.0 - exp(-max(ink, 0.0) * uInk * 1.6);
  light = 1.0 - (1.0 - clamp(light, 0.0, 1.0)) * (1.0 - glow);

  float front = uIntro * 1.35;
  float reveal = 1.0 - smoothstep(front - 0.35, front, v);
  float sweep = exp(-pow((v - front + 0.22) / 0.07, 2.0)) * (1.0 - uIntro);
  light = (light + sweep * 0.8) * reveal;
  light = max(light, 0.045 * reveal);
  float span = mix(1.0 - uStretch, 1.0, level) + glow * 0.3;
  span = clamp(span, 0.08, 1.0) * mix(0.1, 1.0, reveal);
  float tint = clamp(max(glint * 1.4, glow * 0.9) + sweep, 0.0, 1.0);
  float lean = clamp(flow.x / 1400.0, -1.0, 1.0) * uLean * reveal;

  // (page) the wall quietens toward the two axes, as the particle field
  // does (typed, the screen settles it instead: js/ascii.js), and shows as
  // strongly as the view asks
  float sy = 1.0 - 2.0 * v;
  float edges = mix(1.0, mix(0.3, 1.0, smoothstep(-1.0, -0.45, sy)) * mix(0.5, 1.0, smoothstep(1.0, 0.8, sy)), uSettle);
  fragColor = vec4(clamp(light, 0.0, 1.0) * edges * uOpacity, span, tint, 0.5 + 0.5 * lean);
}
`;

/* Pass 2, over the canvas: each pixel finds its slat and draws it. */
const SLATS = `#version 300 es
precision highp float;
uniform sampler2D tField;
uniform vec2 uSize;
uniform float uDpr;
uniform vec4 uGrid;
uniform vec2 uOrigin;
uniform vec2 uSlat;
uniform float uRound;
uniform float uTilt;
uniform vec3 uColor;
uniform vec3 uGlintColor;
uniform vec4 uBackground;
out vec4 fragColor;

float pill(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 local = p - uOrigin;
  vec2 cell = floor(local / uGrid.zw);
  vec4 background = vec4(uBackground.rgb * uBackground.a, uBackground.a);
  vec4 slat = vec4(0.0);
  int reach = uTilt > 0.0 ? 1 : 0;
  for (int dx = -1; dx <= 1; dx++) {
    if (abs(dx) > reach) continue;
    vec2 neighbour = cell + vec2(float(dx), 0.0);
    if (neighbour.x < 0.0 || neighbour.y < 0.0 || neighbour.x >= uGrid.x || neighbour.y >= uGrid.y) continue;
    vec4 field = texelFetch(tField, ivec2(int(neighbour.x), int(uGrid.y - 1.0 - neighbour.y)), 0);
    vec2 offset = local - neighbour * uGrid.zw - uSlat * 0.5;
    float angle = (field.a - 0.5) * 2.0 * uTilt;
    float c = cos(angle);
    float s = sin(angle);
    vec2 turned = vec2(c * offset.x + s * offset.y, c * offset.y - s * offset.x);
    vec2 halfSize = vec2(uSlat.x * 0.5, uSlat.y * 0.5 * field.g);
    float radius = uRound * min(halfSize.x, halfSize.y);
    float alpha = clamp(0.5 - pill(turned, halfSize, radius) * uDpr, 0.0, 1.0) * field.r;
    if (alpha > slat.a) slat = vec4(mix(uColor, uGlintColor, field.b) * alpha, alpha);
  }
  fragColor = slat + background * (1.0 - slat.a);
}
`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/** The slats, as one of the band's backgrounds (see js/background.js). */
export function mount(container, { canvas, theme = "dark", still = false, dense = true, onError, frames, typed } = {}) {
  const pitchScale = dense ? 1 : 1.4;
  const slat = { width: SLAT.width * pitchScale, height: SLAT.height * pitchScale, gap: SLAT.gap * pitchScale };
  let scale = SWELL.scale; // the sea's, as drawn last (zoomed out while typed)
  const fluidSize = dense ? FLUID_SIZE : 64;
  const pressureSteps = dense ? PRESSURE_STEPS : 10;
  const look = createGlide({ ...SHOTS.line, amplitude: 0, opacity: 0, sx: 0, sy: 0 }, RATE);
  const pointer = { x: 0, y: 0, tracked: false };
  const splats = [];        // the pointer's pushes and splashes, for the next frame
  let color = INK[theme] || INK.dark;
  let time = 0;             // sea time
  let clock = 0;            // seconds since mounted
  let fluidUntil = 0;       // the fluid runs a while after it was last stirred
  let fluidDirty = false;
  let splashTurn = 0;
  let dirty = true;         // the picture is out of date (reduced motion draws only then)

  /* GL resources, rebuilt if the context is lost and restored. */
  let programs = null;
  let vao = null;
  let blank = null;
  let field = null;         // one texel per slat
  let fluid = null;
  let floatTargets = false;

  const stage = createStage(container, {
    canvas,
    onError,
    frames,
    typed,
    ratio: (w, h) => Math.min(window.devicePixelRatio || 1, dense ? 2 : 1.5, Math.sqrt(PIXEL_BUDGET / (w * h))),
    resize() {
      buildFluid();
      dirty = true;
    },
    restore: init,
    draw: frame,
  });
  const { gl, size } = stage;

  function init() {
    floatTargets = !!(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"));
    if (!floatTargets) throw new Error("Slats needs float render targets for pointer interaction");
    const fluidPass = (fragment) => [FLUID_VERTEX, fragment];
    programs = createPrograms(gl, {
      field: [FULLSCREEN, FIELD],
      slats: [FULLSCREEN, SLATS],
      splat: fluidPass(SPLAT),
      divergence: fluidPass(DIVERGENCE),
      pressure: fluidPass(PRESSURE),
      project: fluidPass(PROJECT),
      advect: fluidPass(ADVECT),
      scale: fluidPass(SCALE),
    });
    vao = gl.createVertexArray();
    blank = createTarget(gl, 1, 1);
    field = fluid = null;
    fluidDirty = false;
    dirty = true;
    buildFluid();
  }

  const bind = (unit, texture) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  };

  /** Runs the current program over `target` (the canvas when null). */
  function run(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
    gl.viewport(0, 0, target ? target.width : gl.drawingBufferWidth, target ? target.height : gl.drawingBufferHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* --- The fluid (where the GPU can render to floats). */

  function buildFluid() {
    if (!floatTargets || !programs) return;
    const aspect = size.w / size.h;
    const w = Math.max(8, Math.round(aspect >= 1 ? fluidSize * aspect : fluidSize));
    const h = Math.max(8, Math.round(aspect >= 1 ? fluidSize : fluidSize / aspect));
    if (fluid && fluid.width === w && fluid.height === h) return;
    disposeFluid();
    const target = () => createTarget(gl, w, h, { format: gl.RGBA16F });
    const pair = () => ({
      read: target(),
      write: target(),
      swap() { [this.read, this.write] = [this.write, this.read]; },
    });
    fluid = { width: w, height: h, velocity: pair(), ink: pair(), pressure: pair(), divergence: target() };
  }

  function disposeFluid() {
    if (!fluid) return;
    for (const grids of [fluid.velocity, fluid.ink, fluid.pressure]) {
      grids.read.dispose();
      grids.write.dispose();
    }
    fluid.divergence.dispose();
    fluid = null;
  }

  /** Uses a fluid program; returns its uniforms. */
  function fluidProgram(name) {
    const u = programs.use(name);
    gl.uniform2f(u.uTexel, 1 / fluid.width, 1 / fluid.height);
    return u;
  }

  function splat(pair, point, value, radius) {
    const u = fluidProgram("splat");
    bind(0, pair.read.texture);
    gl.uniform1i(u.uTarget, 0);
    gl.uniform1f(u.uAspect, size.w / size.h);
    gl.uniform2f(u.uPoint, point[0], point[1]);
    gl.uniform3f(u.uValue, value[0], value[1], value[2]);
    gl.uniform1f(u.uRadius, radius);
    run(pair.write);
    pair.swap();
  }

  function applySplats() {
    const radius = (clamp(CURSOR.size, 4, 600) / size.h) ** 2 * 0.35;
    const aspect = size.w / size.h;
    for (const [u, v, du, dv, turn] of splats) {
      if (turn === null) {
        splat(fluid.velocity, [u, v], [du * SPLAT_FORCE, dv * SPLAT_FORCE, 0], radius);
        splat(fluid.ink, [u, v], [0.13, 0, 0], radius);
        continue;
      }
      const jet = radius * 0.55;
      const reach = Math.sqrt(jet * 0.5) * 1.9;
      const push = SPLAT_FORCE * 0.08;
      for (let i = 0; i < SPLASH_JETS; i++) {
        const angle = turn + (i / SPLASH_JETS) * Math.PI * 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const point = [u + (dx * reach) / aspect, v + dy * reach];
        splat(fluid.velocity, point, [(dx - dy) * Math.SQRT1_2 * push, (dy + dx) * Math.SQRT1_2 * push, 0], jet);
        splat(fluid.ink, point, [0.75, 0, 0], jet);
      }
      splat(fluid.ink, [u, v], [0.45, 0, 0], radius);
    }
    splats.length = 0;
    fluidDirty = true;
  }

  function stepFluid(dt) {
    const f = fluid;
    let u = fluidProgram("divergence");
    bind(0, f.velocity.read.texture);
    gl.uniform1i(u.uVelocity, 0);
    run(f.divergence);

    u = fluidProgram("scale");
    bind(0, f.pressure.read.texture);
    gl.uniform1i(u.uSource, 0);
    gl.uniform1f(u.uValue, 0.8);
    run(f.pressure.write);
    f.pressure.swap();

    u = fluidProgram("pressure");
    bind(1, f.divergence.texture);
    gl.uniform1i(u.uPressure, 0);
    gl.uniform1i(u.uDivergence, 1);
    for (let i = 0; i < pressureSteps; i++) {
      bind(0, f.pressure.read.texture);
      run(f.pressure.write);
      f.pressure.swap();
    }

    u = fluidProgram("project");
    bind(0, f.pressure.read.texture);
    bind(1, f.velocity.read.texture);
    gl.uniform1i(u.uPressure, 0);
    gl.uniform1i(u.uVelocity, 1);
    run(f.velocity.write);
    f.velocity.swap();

    const fade = 1 / clamp(CURSOR.trail, 0.1, 10);
    u = fluidProgram("advect");
    gl.uniform1i(u.uVelocity, 0);
    gl.uniform1i(u.uSource, 1);
    gl.uniform1f(u.uDt, dt);
    bind(0, f.velocity.read.texture);
    bind(1, f.velocity.read.texture);
    gl.uniform1f(u.uFade, fade * 1.4);
    run(f.velocity.write);
    f.velocity.swap();

    bind(0, f.velocity.read.texture);
    bind(1, f.ink.read.texture);
    gl.uniform1f(u.uFade, fade);
    run(f.ink.write);
    f.ink.swap();
  }

  function clearFluid() {
    const u = fluidProgram("scale");
    gl.uniform1i(u.uSource, 0);
    gl.uniform1f(u.uValue, 0);
    for (const pair of [fluid.velocity, fluid.ink, fluid.pressure]) {
      bind(0, pair.read.texture);
      run(pair.write);
      pair.swap();
    }
  }

  /** Queues a push (du, dv in band heights) or, with `turn`, a splash, at
      (u, v) on the band (0–1, y up); the fluid then runs a while. */
  function queue(u, v, du, dv, turn) {
    if (splats.length > 32) splats.shift();
    splats.push([u, v, du, dv, turn]);
    fluidUntil = clock + Math.max(1.5, CURSOR.trail * 5);
    stage.wake();
  }

  /* --- The wall. */

  /** The slats, as many as cover the canvas, centered on it; typed, on
      the grid of characters, with a slat on its middle column and row. */
  function layout() {
    const grid = typed?.();
    let width, height, pitchX, pitchY, cols, rows, origin;
    if (grid) {
      const { cell: [cw, ch], origin: [x, y] } = grid;
      const { across, down, gap: [gapX, gapY] } = TYPED_SLAT;
      const step = [across + gapX, down + gapY]; // a slat and its gap, in characters
      pitchX = step[0] * cw;
      pitchY = step[1] * ch;
      // The column and row (on the grid) where slats start: in step with
      // the slat on the middle column and row, one step before the grid
      // (a slat there may reach into it). Each slat sits half a pixel in,
      // so that its edges fall between the characters.
      const first = [((grid.cols - across) / 2) % step[0] - step[0], ((grid.rows - down) / 2) % step[1] - step[1]];
      origin = [x + first[0] * cw + 0.5, y + first[1] * ch + 0.5];
      width = across * cw - 1;
      height = down * ch - 1;
      cols = Math.min(2048, Math.ceil((size.w - origin[0]) / pitchX));
      rows = Math.min(2048, Math.ceil((size.h - origin[1]) / pitchY));
    } else {
      ({ width, height } = slat);
      pitchX = slat.width + slat.gap;
      pitchY = slat.height + slat.gap;
      cols = Math.min(2048, Math.ceil((size.w + slat.gap) / pitchX) + 1);
      rows = Math.min(2048, Math.ceil((size.h + slat.gap) / pitchY) + 1);
      origin = [(size.w - (cols * pitchX - slat.gap)) / 2, (size.h - (rows * pitchY - slat.gap)) / 2];
    }
    if (!field || field.width !== cols || field.height !== rows) {
      field?.dispose();
      field = createTarget(gl, cols, rows, { filter: gl.NEAREST });
    }
    return { grid: [cols, rows, pitchX, pitchY], origin, shape: [width, height], round: grid ? 0 : SLAT.roundness, typed: !!grid };
  }

  function frame(elapsed) {
    if (!programs.ready()) return null;
    const dt = Math.min(elapsed, 0.05);
    let moving = false;
    if (!still) {
      clock += dt;
      time += dt * SWELL.speed;
      moving = look.step(dt);
    }
    gl.bindVertexArray(vao);
    gl.disable(gl.BLEND);
    if (fluid && splats.length) applySplats();
    const fluidActive = !!fluid && clock < fluidUntil;
    if (fluid) {
      if (fluidActive) stepFluid(clamp(dt, 1 / 240, 1 / 30));
      else if (fluidDirty) {
        clearFluid();
        fluidDirty = false;
      }
    }
    if (still && !dirty) return "rest";
    dirty = false;

    const { grid, origin, shape, round, typed: typing } = layout();
    scale = SWELL.scale / (typing ? TYPED_ZOOM : 1);
    let u = programs.use("field");
    bind(0, fluid ? fluid.velocity.read.texture : blank.texture);
    bind(1, fluid ? fluid.ink.read.texture : blank.texture);
    gl.uniform1i(u.tVelocity, 0);
    gl.uniform1i(u.tInk, 1);
    gl.uniform2f(u.uSize, size.w, size.h);
    gl.uniform4f(u.uGrid, ...grid);
    gl.uniform2f(u.uOrigin, ...origin);
    gl.uniform2f(u.uSlat, ...shape);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uScale, scale);
    gl.uniform1f(u.uDirection, (SWELL.direction * Math.PI) / 180);
    gl.uniform1f(u.uChop, SWELL.chop);
    gl.uniform1f(u.uStretch, SWELL.stretch);
    gl.uniform1f(u.uGlint, SWELL.glint);
    gl.uniform1f(u.uContrast, SWELL.contrast);
    gl.uniform1f(u.uPerspective, look.now.perspective);
    gl.uniform1f(u.uFog, look.now.fog);
    gl.uniform1f(u.uIntro, 1); // (page) the page brings the wall in
    gl.uniform2f(u.uFluidTexel, fluid ? 1 / fluid.width : 1, fluid ? 1 / fluid.height : 1);
    gl.uniform1f(u.uFluid, fluidActive ? 1 : 0);
    gl.uniform1f(u.uInk, CURSOR.strength);
    gl.uniform1f(u.uLean, 0);
    gl.uniform1f(u.uAmplitude, look.now.amplitude);
    const opacity = clamp(look.now.opacity, 0, 1);
    gl.uniform1f(u.uOpacity, (typing ? 1 : opacity) * OPACITY); // (page) typed: the screen applies the view's
    gl.uniform1f(u.uSettle, typing ? 0 : 1);
    gl.uniform2f(u.uSeed, look.now.sx, look.now.sy);
    gl.bindFramebuffer(gl.FRAMEBUFFER, field.framebuffer);
    gl.viewport(0, 0, field.width, field.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    u = programs.use("slats");
    bind(1, null);
    bind(0, field.texture);
    gl.uniform1i(u.tField, 0);
    gl.uniform2f(u.uSize, size.w, size.h);
    gl.uniform1f(u.uDpr, size.dpr);
    gl.uniform4f(u.uGrid, ...grid);
    gl.uniform2f(u.uOrigin, ...origin);
    gl.uniform2f(u.uSlat, ...shape);
    gl.uniform1f(u.uRound, round);
    gl.uniform1f(u.uTilt, 0);
    gl.uniform3fv(u.uColor, color);
    gl.uniform3fv(u.uGlintColor, color); // (page) one ink: light is opacity
    gl.uniform4f(u.uBackground, 0, 0, 0, 0); // (page) the page shows through
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    bind(0, null);
    gl.bindVertexArray(null);
    stage.drawn(opacity);

    if (still) return "rest";
    return moving || fluidActive || fluidDirty ? "moving" : "idle";
  }

  /** The swell's level (0–1) under a canvas point: the shader's sea,
      without the fluid. */
  function levelAt(x, y) {
    const v = clamp(y / size.h, 0, 1);
    const horizon = 8 + (0.5 - 8) * look.now.perspective;
    const depth = (1 + horizon) / (v + horizon);
    const wx = (((x - size.w * 0.5) / size.h) * depth) / scale + look.now.sx * SEED_DRIFT;
    const wy = ((depth - 1) * horizon * 2.2) / scale + look.now.sy * SEED_DRIFT;
    const meander = 0.55 * Math.sin((wx * 0.23 + wy * 0.41) * 0.9 + time * 0.13)
      + 0.3 * Math.sin((wx * -0.37 + wy * 0.19) * 1.4 - time * 0.09);
    const steep = SWELL.chop * 0.45;
    const direction = (SWELL.direction * Math.PI) / 180;
    let height = 0;
    let total = 0;
    for (let i = 0; i < 4; i++) {
      const angle = direction + TURN[i];
      const k = (2 * Math.PI) / LENGTH[i];
      const theta = k * (wx * Math.cos(angle) + wy * Math.sin(angle)) - Math.sqrt(9.81 * k) * 0.35 * time
        + SHIFT[i] + meander * (0.6 + 0.3 * i);
      height += HEIGHT[i] * (Math.cos(theta) + steep * Math.cos(2 * theta));
      total += HEIGHT[i] * (1 + steep);
    }
    return clamp(0.5 + (0.5 * look.now.amplitude * height) / (total * 0.85), 0, 1);
  }

  const redraw = () => {
    dirty = true;
    stage.wake();
  };

  function release() {
    programs?.dispose();
    gl.deleteVertexArray(vao);
    blank?.dispose();
    field?.dispose();
    disposeFluid();
  }

  try {
    init();
    stage.start();
  } catch (error) {
    stage.destroy(release);
    throw error;
  }

  return {
    canvas: stage.canvas,
    ready: stage.ready,
    resize: stage.resize,
    pause: stage.pause,
    resume: stage.resume,

    set({ shot, amplitude, opacity, seed } = {}, { along, settle = false, cut = [] } = {}) {
      look.to({ ...SHOTS[shot], amplitude, opacity, sx: seed?.[0], sy: seed?.[1] },
        { along, settle: settle || still, cut: cut.includes("seed") ? ["sx", "sy"] : [] });
      redraw();
    },

    setTheme(name) {
      color = INK[name] || INK.dark;
      redraw();
    },

    /** Moving over the band pushes the fluid along the pointer's path. */
    setPointer(x, y, active) {
      if (!fluid || still || !active) {
        pointer.tracked = false;
        return;
      }
      if (pointer.tracked && (x !== pointer.x || y !== pointer.y)) {
        queue(x / size.w, 1 - y / size.h, (x - pointer.x) / size.h, (pointer.y - y) / size.h, null);
      }
      pointer.x = x;
      pointer.y = y;
      pointer.tracked = true;
    },

    /** A click throws a splash. */
    ripple(x, y) {
      if (!fluid || still) return;
      splashTurn += 2.39996;
      queue(x / size.w, 1 - y / size.h, 0, 0, splashTurn);
    },

    sample(x, y) {
      return { height: (levelAt(x, y) - 0.5) * 40 };
    },

    destroy() {
      stage.destroy(release);
    },
  };
}
