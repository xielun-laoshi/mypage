/* ==========================================================================
   Topography — a contour map of rolling terrain under a camera that
   glides over it. The land rises to meet the pointer and keeps its mark
   for a moment; a click sends a pulse out across it.

   Ported from Topography by React Bits (reactbits.dev/backgrounds/
   topography; github.com/DavidHDev/react-bits at 4e0d091), © 2026 David
   Haz, MIT + Commons Clause: see js/LICENSE-react-bits.txt. The terrain,
   its contour lines, the sculpting, the pulses and the camera are the
   original's. What changes is what this page needs, marked "(page)"
   below: the lines are the theme's ink, drawn through the original's
   light-mode path in both themes; the page's framings (js/main.js) take
   the place of the component's intro; the lines quieten toward the two
   axes as the field does; the page hands over the pointer instead of the
   component listening on window; the terrain is baked by two programs
   where the original has one with two outputs (see `bake`); and the
   options this page doesn't use are left out (bloom, markers, glitch,
   the trace and light hovers, the peak click). One of the band's
   backgrounds (see js/background.js).
   ========================================================================== */

import { INK, FULLSCREEN, createStage, createPrograms, createTexture, createGlide } from "./stage.js";

const FOV = 0.32;
const ORBIT = 9;
const NEAR = 0.05;
const FAR = 160;
const HEIGHT = 1.7;
const FREQUENCY = 0.45;
const MAX_PULSES = 4;
const SCULPT_SIZE = 256;
const SCULPT_SPAN = 48;
const SUN = [-0.81, 0.58, -0.02];

/* The look: the original's defaults, with its "mono" preset's lines (no
   major lines, no depth of field, a little brighter) and no bloom. */
const LOOK = {
  lineCount: 22,
  lineWidth: 1,
  majorLines: false,
  elevation: 1,
  foreground: 0.2,
  scale: 1,
  detail: 0.35,
  speed: 0.25,
  morph: 0.2,
  fog: 0.35,
  brightness: 1.1,
  mouseRadius: 1,
  mouseStrength: 0.6,
  trail: 0.3,
  parallax: 0.5,
};

/* Cells in the terrain's mesh at most (the original's 200k), and on small
   or slow screens. */
const MAX_CELLS = { dense: 200000, light: 90000 };
const OPACITY = 0.72; // (page) quiet contours, below the foreground type

/* (page) Typed (js/ascii.js), the lines are drawn this wide (CSS px), so
   that every character a line crosses catches it, and this many to a unit
   of height (the look's lineCount), so that they run a few characters
   apart instead of filling every row. */
const TYPED_LINES = { width: 2, count: 12 };

/* (page) Framings, by the field's names (SHOTS in js/field.js): the
   camera's tilt (deg). The intro's edge-on line is a low, grazing view;
   behind the project list the map is seen from above. */
const SHOTS = {
  line:      { tilt: 12 },
  landscape: { tilt: 32 },
  texture:   { tilt: 90 },
  calm:      { tilt: 48 },
};
/* How fast each property chases its goal (1/s), as the field's do. */
const RATE = { tilt: 1.9, amplitude: 2.2, opacity: 3.2, sx: 1.6, sy: 1.6 };
const SEED_MORPH = 0.04; // how far a project's signature reshapes the land, per unit of seed

const COMMON = `
precision highp float;
precision highp int;

uniform float uFrequency;
uniform vec2 uMorph;
uniform sampler2D uSculpt;
uniform float uSculptOn;
uniform vec4 uPulses[${MAX_PULSES}];
uniform vec3 uEye;
uniform vec3 uForward;
uniform vec3 uNear;

uint lattice(ivec2 p) {
  uvec2 q = uvec2(p + 1073741824);
  uint h = q.x * 2654435761u + q.y * 2246822519u;
  h = (h ^ (h >> 15u)) * 739982445u;
  h = (h ^ (h >> 12u)) * 695872825u;
  return h ^ (h >> 15u);
}

float corner(ivec2 c, vec2 f) {
  uint h = lattice(c);
  vec2 g = vec2(float(h & 65535u), float(h >> 16u)) / 32767.5 - 1.0;
  return dot(g, f);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  ivec2 c = ivec2(i);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = corner(c, f);
  float b = corner(c + ivec2(1, 0), f - vec2(1.0, 0.0));
  float d = corner(c + ivec2(0, 1), f - vec2(0.0, 1.0));
  float e = corner(c + ivec2(1, 1), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(d, e, u.x), u.y);
}

vec2 octave(vec2 p, vec2 shift) {
  return vec2(1.6 * p.x - 1.2 * p.y, 1.2 * p.x + 1.6 * p.y) + shift;
}

float relief(vec2 t) {
  vec2 p = t * uFrequency;
  vec2 w = vec2(noise(p * 0.42 + uMorph), noise(p * 0.42 - uMorph.yx + vec2(5.2, 1.3)));
  p += w * 0.8;
  float n = noise(p) * 0.55;
  p = octave(p, vec2(7.1, 3.7));
  n += noise(p) * 0.15;
  p = octave(p, vec2(1.9, 8.3));
  n += noise(p) * 0.04;
  float s = log(1.0 + exp(7.0 * (3.0 * n + 0.05))) / 7.0;
  return s * s * 1.4 + 0.1 * n;
}

float swell(vec2 t) {
  float lift = 0.0;
  for (int i = 0; i < ${MAX_PULSES}; i++) {
    vec4 p = uPulses[i];
    if (p.w <= 0.0) continue;
    float x = (length(t - p.xy) - p.z) / (0.28 + p.z * 0.05);
    lift += exp(-x * x) * p.w;
  }
  return lift;
}

vec4 sculpted(vec2 t) {
  return uSculptOn > 0.5 ? textureLod(uSculpt, t / ${SCULPT_SPAN}.0, 0.0) : vec4(0.0);
}

float settle(vec2 world) {
  float depth = dot(vec3(world.x, 0.0, world.y) - uEye, uForward);
  float x = clamp((depth - uNear.x) / max(uNear.y - uNear.x, 1e-3), 0.0, 1.0);
  return mix(uNear.z, 1.0, x * x * x * (x * (x * 6.0 - 15.0) + 10.0));
}
`;

/* The terrain baked over the cells in view: what the mesh and the lines
   read (`heights` false), or the height the contours are cut from (true).
   (page) The original writes both from one program, into two textures at
   once. Chrome on Windows builds a program for one output and builds the
   two-output form the first time it draws, stalling every canvas on the
   page for 60–75 ms while it does (measured: qa/README.md); two programs
   with one output each are built ahead like the rest, off the main
   thread. The terrain is the same. */
const bake = (heights) => `#version 300 es
#define HEIGHTS ${heights ? 1 : 0}
${COMMON}
uniform ivec2 uBase;
uniform float uCell;
uniform float uDetail;
out vec4 outColor;

void main() {
  vec2 t = vec2(uBase + ivec2(gl_FragCoord.xy)) * uCell;
  vec4 carved = sculpted(t);
  float ring = swell(t);
  float ground = relief(t) + carved.r + ring * 0.14;
#if HEIGHTS
  vec2 dp = t * uFrequency * 5.0 + vec2(13.1, 4.7);
  float fine = noise(dp) * 0.6 + noise(octave(dp, vec2(2.3, 6.1))) * 0.3;
  outColor = vec4(ground + uDetail * 0.1 * fine, 0.0, 0.0, 1.0);
#else
  outColor = vec4(carved.g, ring, ground, carved.r);
#endif
}`;

const terrainVertex = (baked) => `#version 300 es
#define BAKED ${baked ? 1 : 0}
${COMMON}
uniform sampler2D uField;
uniform ivec2 uOrigin;
uniform ivec2 uCamCell;
uniform vec2 uCamFrac;
uniform float uCell;
uniform int uStride;
uniform float uHeight;
uniform mat4 uViewProj;
out vec2 vTexel;
out vec2 vTerrain;
out float vDepth;
out float vLift;
out vec3 vNormal;

float ground(vec2 t) {
  return relief(t) + swell(t) * 0.14;
}

void main() {
  ivec2 step = ivec2(gl_VertexID >> 1, gl_InstanceID + (gl_VertexID & 1)) * uStride;
  ivec2 local = uOrigin + step;
  vec2 terrain = vec2(local + uCamCell) * uCell;
  vec2 world = vec2(local) * uCell - uCamFrac;
  float k = settle(world);
#if BAKED
  ivec2 texel = step + 2;
  vec4 c = texelFetch(uField, texel, 0);
  vec4 l = texelFetch(uField, texel - ivec2(1, 0), 0);
  vec4 r = texelFetch(uField, texel + ivec2(1, 0), 0);
  vec4 d = texelFetch(uField, texel - ivec2(0, 1), 0);
  vec4 u = texelFetch(uField, texel + ivec2(0, 1), 0);
  float h = (c.b - c.a) * k + c.a;
  float dx = (l.b - l.a - r.b + r.a) * k + l.a - r.a;
  float dz = (d.b - d.a - u.b + u.a) * k + d.a - u.a;
  vNormal = vec3(dx * uHeight / (2.0 * uCell), 1.0, dz * uHeight / (2.0 * uCell));
  vTexel = vec2(texel) + 0.5;
#else
  float h = ground(terrain) * k;
  float hx = ground(terrain + vec2(0.04, 0.0)) * k;
  float hz = ground(terrain + vec2(0.0, 0.04)) * k;
  vNormal = vec3((h - hx) * uHeight / 0.04, 1.0, (h - hz) * uHeight / 0.04);
  vTexel = vec2(0.0);
#endif
  vec4 clip = uViewProj * vec4(world.x, h * uHeight, world.y, 1.0);
  gl_Position = clip;
  vTerrain = terrain;
  vDepth = clip.w;
  vLift = h * uHeight;
}`;

const terrainFragment = (baked) => `#version 300 es
#define BAKED ${baked ? 1 : 0}
${COMMON}
uniform sampler2D uField;
uniform highp sampler2D uHeightField;
uniform float uDetail;
uniform float uLines;
uniform float uLineWidth;
uniform float uMajor;
uniform vec3 uColor;
uniform float uBrightness;
uniform vec2 uFade;
uniform vec3 uFocus;
uniform vec4 uHeat;
uniform vec4 uLamp;
uniform vec3 uSun;
uniform float uRefDepth;
uniform float uOpacity;
uniform float uPixelHeight;       // (page) the canvas, device px
uniform float uSettle;            // (page) 1: the lines quieten toward the axes here; 0: the typed screen sees to it
in vec2 vTexel;
in vec2 vTerrain;
in float vDepth;
in float vLift;
in vec3 vNormal;
out vec4 outColor;

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float stroke(float dist, float width, float soft, float density, float crowd) {
  float cover = max(0.0, min(min(width, soft), 0.5 * (width + soft) - dist)) / soft;
  return mix(cover, min(width * density, 1.0) * 0.6, crowd);
}

float sampleHeight(vec2 coord, out vec2 slope) {
  vec2 u = coord - 0.5;
  vec2 i = floor(u + 0.5);
  vec2 f = u - i;
  vec3 wx = vec3(0.5 * (0.5 - f.x) * (0.5 - f.x), 0.75 - f.x * f.x, 0.5 * (0.5 + f.x) * (0.5 + f.x));
  vec3 wy = vec3(0.5 * (0.5 - f.y) * (0.5 - f.y), 0.75 - f.y * f.y, 0.5 * (0.5 + f.y) * (0.5 + f.y));
  vec3 dx = vec3(f.x - 0.5, -2.0 * f.x, 0.5 + f.x);
  vec3 dy = vec3(f.y - 0.5, -2.0 * f.y, 0.5 + f.y);
  ivec2 base = ivec2(i) - 1;
  float total = 0.0;
  slope = vec2(0.0);
  for (int y = 0; y < 3; y++) {
    float a = texelFetch(uHeightField, base + ivec2(0, y), 0).r;
    float b = texelFetch(uHeightField, base + ivec2(1, y), 0).r;
    float c = texelFetch(uHeightField, base + ivec2(2, y), 0).r;
    float row = a * wx.x + b * wx.y + c * wx.z;
    total += row * wy[y];
    slope += vec2((a * dx.x + b * dx.y + c * dx.z) * wy[y], row * dy[y]);
  }
  return total;
}

void main() {
  vec2 spot = vTerrain;
#if BAKED
  vec2 ex = dFdx(vTexel);
  vec2 ey = dFdy(vTexel);
  vec2 slope;
  float h = sampleHeight(vTexel, slope);
  vec4 field = texture(uField, vTexel / vec2(textureSize(uField, 0)));
  float trail = field.r;
  float ring = field.g;
  float gx = dot(slope, ex) * uLines;
  float gy = dot(slope, ey) * uLines;
#else
  vec2 dp = spot * uFrequency * 5.0 + vec2(13.1, 4.7);
  float ring = swell(spot);
  float h = relief(spot) + ring * 0.14 + uDetail * 0.1 * (noise(dp) * 0.6 + noise(octave(dp, vec2(2.3, 6.1))) * 0.3);
  float trail = 0.0;
  float gx = dFdx(h) * uLines;
  float gy = dFdy(h) * uLines;
#endif

  float lc = h * uLines + 0.5;
  float density = max(sqrt(gx * gx + gy * gy), 1e-5);
  float dist = abs(fract(lc + 0.5) - 0.5) / density;
  float major = uMajor * (1.0 - step(0.5, mod(floor(lc + 0.5), 5.0)));

  vec2 hd = spot - uHeat.xy;
  float heat = exp(-dot(hd, hd) / (uHeat.z * uHeat.z)) * uHeat.w + trail * 0.6;
  float energy = heat + ring;

  float depth = max(vDepth, 0.01);
  float persp = clamp(sqrt(uRefDepth / depth), 0.6, 1.6);
  float width = uLineWidth * persp * (1.0 + 0.6 * major) * (1.0 + 0.45 * min(energy, 1.5));
  float soft = 1.0 + min(uFocus.y * abs(1.0 - uFocus.x / depth), uFocus.z);
  float crowd = smoothstep(0.3, 0.75, density * max(width, soft));
  float cover = stroke(dist, width, soft, density, crowd);

  vec3 normal = normalize(vNormal);
  float sun = clamp(dot(normal, uSun), 0.0, 1.0);
  vec3 toLamp = uLamp.xyz - vec3(vTerrain.x, vLift, vTerrain.y);
  float lampDistance = length(toLamp);
  float lamp = clamp(dot(normal, toLamp / max(lampDistance, 1e-3)), 0.0, 1.0) * uLamp.w / (1.0 + lampDistance * lampDistance * 0.9);
  float level = mix(0.45, 1.05, smoothstep(0.0, 1.1, h)) * mix(0.35, 1.25, sun * sun) * (1.0 + 0.6 * major);
  level += heat * 1.4 + ring * 3.0 + lamp * 1.2;

  float fade = 1.0 - smoother((depth - uFade.x) / max(uFade.y - uFade.x, 1e-3));
  float light = cover * level * fade * uBrightness;

  // (page) the lines quieten toward the two axes, as the particle field's
  // points do (typed, the screen settles them instead: js/ascii.js)
  float sy = gl_FragCoord.y / uPixelHeight * 2.0 - 1.0;
  light *= mix(1.0, mix(0.3, 1.0, smoothstep(-1.0, -0.45, sy)) * mix(0.5, 1.0, smoothstep(1.0, 0.8, sy)), uSettle);

  // The original's light-mode ink, in both themes (page)
  float ink = (1.0 - exp(-light * 1.8)) * 0.92 * uOpacity;
  outColor = vec4(uColor * ink, ink);
}`;

const SCULPT = `#version 300 es
precision highp float;
uniform sampler2D uPrevious;
uniform vec4 uSegment;
uniform vec4 uBrush;
uniform vec2 uDecay;
out vec4 outColor;

vec2 wrapped(vec2 d) {
  return d - ${SCULPT_SPAN}.0 * floor(d / ${SCULPT_SPAN}.0 + 0.5);
}

void main() {
  vec4 previous = texelFetch(uPrevious, ivec2(gl_FragCoord.xy), 0);
  vec2 t = gl_FragCoord.xy / ${SCULPT_SIZE}.0 * ${SCULPT_SPAN}.0;
  vec2 a = wrapped(t - uSegment.xy);
  vec2 ab = uSegment.zw - uSegment.xy;
  float k = clamp(dot(a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  vec2 d = a - ab * k;
  float g = exp(-dot(d, d) / (uBrush.x * uBrush.x)) * uBrush.w;
  float height = previous.r * uDecay.x;
  height += (uBrush.y - height) * g * uBrush.z;
  float heat = previous.g * uDecay.y;
  heat += (1.0 - heat) * g * uBrush.z;
  outColor = vec4(height, heat, 0.0, 1.0);
}`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const smoother = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/* The terrain on the CPU, for picking the point under the pointer. */
const lattice = (x, y) => {
  let h = (Math.imul(x + 1073741824, 2654435761) + Math.imul(y + 1073741824, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 739982445) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 695872825) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
};

const corner = (cx, cy, fx, fy) => {
  const h = lattice(cx, cy);
  return ((h & 65535) / 32767.5 - 1) * fx + ((h >>> 16) / 32767.5 - 1) * fy;
};

const noise = (x, y) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = corner(ix, iy, fx, fy);
  const b = corner(ix + 1, iy, fx - 1, fy);
  const d = corner(ix, iy + 1, fx, fy - 1);
  const e = corner(ix + 1, iy + 1, fx - 1, fy - 1);
  const top = a + (b - a) * ux;
  return top + (d + (e - d) * ux - top) * uy;
};

const relief = (tx, tz, frequency, morphX, morphZ) => {
  let px = tx * frequency;
  let pz = tz * frequency;
  const wx = noise(px * 0.42 + morphX, pz * 0.42 + morphZ);
  const wz = noise(px * 0.42 - morphZ + 5.2, pz * 0.42 - morphX + 1.3);
  px += wx * 0.8;
  pz += wz * 0.8;
  let n = noise(px, pz) * 0.55;
  const qx = 1.6 * px - 1.2 * pz + 7.1;
  const qz = 1.2 * px + 1.6 * pz + 3.7;
  n += noise(qx, qz) * 0.15;
  n += noise(1.6 * qx - 1.2 * qz + 1.9, 1.2 * qx + 1.6 * qz + 8.3) * 0.04;
  const s = Math.log(1 + Math.exp(7 * (3 * n + 0.05))) / 7;
  return s * s * 1.4 + 0.1 * n;
};

/* The camera. */
const orient = (yaw, pitch) => {
  const cp = Math.cos(pitch);
  const f = [Math.sin(yaw) * cp, -Math.sin(pitch), Math.cos(yaw) * cp];
  const r = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
  return { f, r, u };
};

const lens = (aspect) => clamp(0.4877 / aspect, FOV, 0.6);

const viewProjection = ({ eye, f, r, u }, aspect, out) => {
  const t = 1 / lens(aspect);
  const nf = 1 / (NEAR - FAR);
  const view = [
    r[0], u[0], -f[0], 0,
    r[1], u[1], -f[1], 0,
    r[2], u[2], -f[2], 0,
    -(r[0] * eye[0] + r[1] * eye[1] + r[2] * eye[2]),
    -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]),
    f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2],
    1,
  ];
  const projection = [t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (FAR + NEAR) * nf, -1, 0, 0, 2 * FAR * NEAR * nf, 0];
  for (let c = 0; c < 4; c++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += projection[k * 4 + row] * view[c * 4 + k];
      out[c * 4 + row] = sum;
    }
  }
  return out;
};

/** The topography, as one of the band's backgrounds (see js/background.js). */
export function mount(container, { canvas, theme = "dark", still = false, dense = true, onError, frames, typed } = {}) {
  const maxRatio = dense ? 2 : 1.5;
  const maxCells = dense ? MAX_CELLS.dense : MAX_CELLS.light;
  const look = createGlide({ ...SHOTS.line, amplitude: 0, opacity: 0, sx: 0, sy: 0 }, RATE);
  const pointer = { x: 0, y: 0, inside: false };
  const pulses = [];
  const matrix = new Float32Array(16);
  const pulseData = new Float32Array(MAX_PULSES * 4);
  const view = { cell: 0.05, cellKey: "" };
  const state = {
    travelX: 0, travelZ: 0, morph: 0,
    yaw: 0, pitch: 0, yawVelocity: 0, pitchVelocity: 0,
    presence: 0, hit: null, brushFrom: null, sculptLife: 0,
  };
  let color = INK[theme] || INK.dark;
  let dirty = true; // the picture is out of date (reduced motion draws only then)

  /* GL resources, rebuilt if the context is lost and restored. */
  let programs = null;
  let vao = null;
  let blank = null;
  let field = null;    // the terrain baked over the cells in view, where floats render
  let sculpt = null;   // what the pointer has raised (two textures, read and write)
  let sculptIndex = 0;
  let baked = false;

  const ratio = () => Math.min(window.devicePixelRatio || 1, maxRatio);
  const stage = createStage(container, {
    canvas,
    onError,
    frames,
    typed,
    attributes: { depth: true, antialias: ratio() < 1.5 },
    ratio,
    resize() { dirty = true; },
    restore: init,
    draw: frame,
  });
  const { gl, size } = stage;
  const surface = stage.canvas;

  function init() {
    baked = !!gl.getExtension("EXT_color_buffer_float");
    const sources = { terrain: [terrainVertex(baked), terrainFragment(baked)] };
    if (baked) {
      sources.field = [FULLSCREEN, bake(false)];
      sources.heights = [FULLSCREEN, bake(true)];
      sources.sculpt = [FULLSCREEN, SCULPT];
    }
    programs = createPrograms(gl, sources);
    vao = gl.createVertexArray();
    blank = createTexture(gl, 1, 1, gl.RGBA8, { wrap: gl.REPEAT });
    field = {
      texture: null, heights: null, width: 0, height: 0,
      framebuffer: gl.createFramebuffer(), heightsFramebuffer: gl.createFramebuffer(),
    };
    sculpt = baked
      ? [0, 1].map(() => {
          const texture = createTexture(gl, SCULPT_SIZE, SCULPT_SIZE, gl.RG16F, { wrap: gl.REPEAT });
          const framebuffer = gl.createFramebuffer();
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
          return { texture, framebuffer };
        })
      : null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    sculptIndex = 0;
    view.cellKey = "";
    dirty = true;
  }

  function reserveField(width, height) {
    if (field.texture && width <= field.width && height <= field.height) return;
    if (field.texture) gl.deleteTexture(field.texture);
    if (field.heights) gl.deleteTexture(field.heights);
    field.width = Math.max(width, Math.ceil(field.width * 1.25), 64);
    field.height = Math.max(height, Math.ceil(field.height * 1.25), 64);
    field.texture = createTexture(gl, field.width, field.height, gl.RGBA16F);
    field.heights = createTexture(gl, field.width, field.height, gl.R32F, { filter: gl.NEAREST });
    gl.bindFramebuffer(gl.FRAMEBUFFER, field.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, field.texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, field.heightsFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, field.heights, 0);
  }

  const bind = (unit, texture) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  };

  /* --- The camera, and where its rays meet the land. */

  // (page) the page's amplitude raises the land: flat for the intro's
  // line, lower when the contact view calms it
  const rise = () => Math.max(look.now.amplitude, 0);
  // (page) a project's signature reshapes the land, as it does the field
  const morphs = () => [state.morph * 0.37 + look.now.sx * SEED_MORPH, state.morph * 0.23 + look.now.sy * SEED_MORPH];

  // (page) A tall band (a phone's) is seen through a wider lens, which
  // would look out over the land to an empty horizon: the camera looks down
  // by as much as the lens has opened, so that the land fills the band as
  // it does a wide one.
  const stoop = () => Math.atan(lens(size.w / size.h)) - Math.atan(FOV);

  function camera() {
    const pitch = Math.min((look.now.tilt * Math.PI) / 180 + stoop() + state.pitch, Math.PI / 2 - 1e-4);
    const frame = orient(state.yaw, pitch);
    const lift = LOOK.elevation * HEIGHT * rise() * 0.18;
    const clearance = LOOK.elevation * HEIGHT * rise() * 1.3 + 0.9;
    const distance = Math.max(ORBIT, (clearance - lift) / Math.sin(pitch));
    return {
      ...frame,
      distance,
      eye: [-frame.f[0] * distance, lift - frame.f[1] * distance, -frame.f[2] * distance],
    };
  }

  function rayDirection(cam, nx, ny) {
    const aspect = size.w / size.h;
    const t = lens(aspect);
    const d = [0, 1, 2].map((i) => cam.f[i] + cam.r[i] * nx * t * aspect + cam.u[i] * ny * t);
    const length = Math.hypot(d[0], d[1], d[2]);
    return d.map((v) => v / length);
  }

  const along = (cam, d) => d[0] * cam.f[0] + d[1] * cam.f[1] + d[2] * cam.f[2];

  function groundDepth(cam, ny) {
    const d = rayDirection(cam, 0, ny);
    if (d[1] > -1e-3) return Infinity;
    return (cam.eye[1] / -d[1]) * along(cam, d);
  }

  const nearRange = (cam) => [groundDepth(cam, -1) * 0.9, cam.distance, LOOK.foreground];

  function settleAt(cam, near, x, z) {
    const depth = (x - cam.eye[0]) * cam.f[0] - cam.eye[1] * cam.f[1] + (z - cam.eye[2]) * cam.f[2];
    return near[2] + (1 - near[2]) * smoother((depth - near[0]) / Math.max(near[1] - near[0], 1e-3));
  }

  /** The land under screen point (nx, ny) (-1–1), or null. */
  function pick(cam, nx, ny) {
    const d = rayDirection(cam, nx, ny);
    const height = LOOK.elevation * HEIGHT * rise();
    const frequency = FREQUENCY / LOOK.scale;
    const near = nearRange(cam);
    const [morphX, morphZ] = morphs();
    const above = (distance) => {
      const x = cam.eye[0] + d[0] * distance;
      const z = cam.eye[2] + d[2] * distance;
      const ground = relief(state.travelX + x, state.travelZ + z, frequency, morphX, morphZ);
      return cam.eye[1] + d[1] * distance - ground * height * settleAt(cam, near, x, z);
    };
    let distance = NEAR;
    let gap = above(distance);
    for (let i = 0; i < 200 && distance < FAR * 0.5; i++) {
      const next = distance + Math.max(0.02, gap * 0.4);
      const value = above(next);
      if (value < 0) {
        let lo = distance;
        let hi = next;
        for (let k = 0; k < 10; k++) {
          const mid = (lo + hi) * 0.5;
          if (above(mid) < 0) hi = mid;
          else lo = mid;
        }
        return {
          x: state.travelX + cam.eye[0] + d[0] * hi,
          y: cam.eye[1] + d[1] * hi,
          z: state.travelZ + cam.eye[2] + d[2] * hi,
          depth: hi * along(cam, d),
        };
      }
      distance = next;
      gap = value;
    }
    return null;
  }

  /** The stretch of land in view, in world units around the camera. */
  function footprint(cam, fadeEnd) {
    const ceiling = LOOK.elevation * HEIGHT * rise() * 1.7 + 0.2 + LOOK.mouseStrength;
    const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, near: Infinity };
    const add = (d, distance) => {
      const x = cam.eye[0] + d[0] * distance;
      const z = cam.eye[2] + d[2] * distance;
      box.minX = Math.min(box.minX, x);
      box.maxX = Math.max(box.maxX, x);
      box.minZ = Math.min(box.minZ, z);
      box.maxZ = Math.max(box.maxZ, z);
    };
    for (const nx of [-1.08, 0, 1.08]) {
      for (const ny of [-1.08, 1.08]) {
        const d = rayDirection(cam, nx, ny);
        const forward = Math.max(along(cam, d), 1e-3);
        let near = NEAR;
        let far = (fadeEnd * 1.05) / forward;
        if (d[1] < -1e-4) {
          near = Math.max(NEAR, (cam.eye[1] - ceiling) / -d[1]);
          far = Math.min(far, cam.eye[1] / -d[1]);
        }
        near = Math.min(near, far);
        add(d, near);
        add(d, far);
        box.near = Math.min(box.near, near * forward);
      }
    }
    return box;
  }

  function grid(box, cell) {
    const camX = Math.floor(state.travelX / cell);
    const camZ = Math.floor(state.travelZ / cell);
    const fracX = state.travelX - camX * cell;
    const fracZ = state.travelZ - camZ * cell;
    const k0 = Math.floor((box.minX + fracX) / cell) - 2;
    const m0 = Math.floor((box.minZ + fracZ) / cell) - 2;
    const columns = clamp(Math.ceil((box.maxX + fracX) / cell) + 2 - k0, 1, 4000);
    const rows = clamp(Math.ceil((box.maxZ + fracZ) / cell) + 2 - m0, 1, Math.floor((maxCells * 1.5) / columns));
    return { cell, camX, camZ, fracX, fracZ, k0, m0, columns, rows };
  }

  /* --- Drawing. */

  function render(cam) {
    const aspect = size.w / size.h;
    viewProjection(cam, aspect, matrix);

    const bottom = groundDepth(cam, -1);
    const top = Math.min(groundDepth(cam, 1), cam.distance * 3.2);
    const horizon = Math.max(top, bottom * 1.6, cam.distance * 1.4);
    const fadeEnd = horizon + (bottom * 1.8 - horizon) * LOOK.fog;
    const fadeStart = fadeEnd * 0.7 + (bottom * 0.7 - fadeEnd * 0.7) * LOOK.fog;
    const box = footprint(cam, fadeEnd);

    const cellKey = `${size.w}x${size.h}@${size.dpr}|${Math.round(look.now.tilt / 4)}|${Math.round(rise() * 5)}`;
    if (cellKey !== view.cellKey) {
      view.cellKey = cellKey;
      const focal = (size.h * size.dpr * 0.5) / lens(aspect);
      let cell = clamp((14 * Math.max(box.near, 0.5)) / focal, 0.02, 0.4);
      const cells = ((box.maxX - box.minX) * (box.maxZ - box.minZ)) / (cell * cell);
      if (cells > maxCells) cell *= Math.sqrt(cells / maxCells);
      view.cell = cell;
    }

    const height = LOOK.elevation * HEIGHT * rise();
    const layout = grid(box, view.cell);
    const near = nearRange(cam);
    const frequency = FREQUENCY / LOOK.scale;
    const [morphX, morphZ] = morphs();
    const touch = state.hit && !still ? state.presence : 0;
    const heatStrength = touch * (0.35 + 0.5 * LOOK.mouseStrength);
    const hitX = state.hit ? state.hit.x : 0;
    const hitZ = state.hit ? state.hit.z : 0;

    pulseData.fill(0);
    pulses.forEach((p, i) => {
      pulseData.set([p.x, p.z, p.age * 4.2, Math.exp(-p.age * 1.1) * smoother(p.age / 0.08)], i * 4);
    });

    gl.bindVertexArray(vao);
    gl.disable(gl.BLEND);
    if (baked) {
      const width = layout.columns + 7;
      const rows = layout.rows + 7;
      reserveField(width, rows);
      gl.viewport(0, 0, width, rows);
      gl.disable(gl.DEPTH_TEST);
      bind(0, sculpt[sculptIndex].texture);
      for (const [name, framebuffer] of [["field", field.framebuffer], ["heights", field.heightsFramebuffer]]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        const f = programs.use(name);
        gl.uniform1i(f.uSculpt, 0);
        gl.uniform1f(f.uSculptOn, 1);
        gl.uniform1f(f.uFrequency, frequency);
        gl.uniform2f(f.uMorph, morphX, morphZ);
        gl.uniform4fv(f.uPulses, pulseData);
        gl.uniform2i(f.uBase, layout.k0 - 2 + layout.camX, layout.m0 - 2 + layout.camZ);
        gl.uniform1f(f.uCell, layout.cell);
        gl.uniform1f(f.uDetail, LOOK.detail); // (only the heights use it)
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, surface.width, surface.height);
    const u = programs.use("terrain");
    bind(0, baked ? field.texture : blank);
    gl.uniform1i(u.uField, 0);
    bind(1, baked ? field.heights : blank);
    gl.uniform1i(u.uHeightField, 1);
    gl.uniform1f(u.uFrequency, frequency);
    gl.uniform2f(u.uMorph, morphX, morphZ);
    gl.uniform4fv(u.uPulses, pulseData);
    gl.uniform2i(u.uOrigin, layout.k0, layout.m0);
    gl.uniform2i(u.uCamCell, layout.camX, layout.camZ);
    gl.uniform2f(u.uCamFrac, layout.fracX, layout.fracZ);
    gl.uniform1f(u.uCell, layout.cell);
    gl.uniform1i(u.uStride, 1);
    gl.uniform1f(u.uHeight, height);
    gl.uniform3fv(u.uEye, cam.eye);
    gl.uniform3fv(u.uForward, cam.f);
    gl.uniform3fv(u.uNear, near);
    gl.uniform1f(u.uRefDepth, cam.distance);
    gl.uniformMatrix4fv(u.uViewProj, false, matrix);
    gl.uniform1f(u.uDetail, LOOK.detail);
    const typing = !!typed?.();
    gl.uniform1f(u.uLines, typing ? TYPED_LINES.count : LOOK.lineCount);
    gl.uniform1f(u.uLineWidth, (typing ? TYPED_LINES.width : LOOK.lineWidth) * size.dpr);
    gl.uniform1f(u.uMajor, LOOK.majorLines ? 1 : 0);
    gl.uniform3fv(u.uColor, color);
    gl.uniform1f(u.uBrightness, LOOK.brightness);
    gl.uniform2f(u.uFade, fadeStart, fadeEnd);
    gl.uniform3f(u.uFocus, cam.distance, 0, size.h * 0.03 * size.dpr);
    gl.uniform4f(u.uHeat, hitX, hitZ, 0.9 * LOOK.mouseRadius, heatStrength);
    gl.uniform4f(u.uLamp, hitX, state.hit ? state.hit.y + 1.4 : 0, hitZ, heatStrength);
    gl.uniform3fv(u.uSun, SUN);
    gl.uniform1f(u.uOpacity, (typing ? 1 : clamp(look.now.opacity, 0, 1)) * OPACITY); // (page) typed: the screen applies the view's
    gl.uniform1f(u.uPixelHeight, surface.height);
    gl.uniform1f(u.uSettle, typing ? 0 : 1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * (layout.columns + 1), layout.rows);
    gl.disable(gl.DEPTH_TEST);
    bind(1, null);
    bind(0, null);
    gl.bindVertexArray(null);
  }

  /** The pointer raises the land along its path; the mark decays. Returns
      whether there was anything to do. */
  function updateSculpt(dt) {
    if (!sculpt) return false;
    const brush = !still && state.presence > 0.001 ? state.hit : null;
    if (!brush && state.sculptLife <= 0) return false;
    const from = state.brushFrom || brush;
    const read = sculpt[sculptIndex];
    const write = sculpt[1 - sculptIndex];
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
    gl.viewport(0, 0, SCULPT_SIZE, SCULPT_SIZE);
    const u = programs.use("sculpt");
    bind(0, read.texture);
    gl.uniform1i(u.uPrevious, 0);
    if (brush && from) gl.uniform4f(u.uSegment, from.x, from.z, brush.x, brush.z);
    else gl.uniform4f(u.uSegment, 0, 0, 0, 0);
    gl.uniform4f(u.uBrush, 1.1 * LOOK.mouseRadius, 0.9 * LOOK.mouseStrength, 1 - Math.exp(-dt * 7), brush ? state.presence : 0);
    const tau = 0.25 + 3 * LOOK.trail * LOOK.trail;
    gl.uniform2f(u.uDecay, Math.exp(-dt / tau), Math.exp(-dt / 0.7));
    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    bind(0, null);
    sculptIndex = 1 - sculptIndex;
    state.brushFrom = brush ? { x: brush.x, z: brush.z } : null;
    if (brush) state.sculptLife = tau * 6;
    else state.sculptLife -= dt;
    return true;
  }

  function frame(elapsed) {
    if (!programs.ready()) return null;
    const dt = clamp(elapsed, 0, 1 / 20);
    let moving = false;
    if (!still) {
      moving = look.step(dt);
      state.travelZ += LOOK.speed * 0.8 * dt; // the camera glides forward
      state.morph += LOOK.morph * 0.12 * dt;
    }

    const engaged = pointer.inside && !still;
    state.presence += ((engaged ? 1 : 0) - state.presence) * (1 - Math.exp(-dt / (engaged ? 0.18 : 0.45)));

    const nx = (pointer.x / size.w) * 2 - 1;
    const ny = 1 - (pointer.y / size.h) * 2;
    const lean = engaged ? LOOK.parallax : 0;
    const targetYaw = nx * lean * 0.09;
    const targetPitch = -ny * lean * 0.045;
    state.yawVelocity += (38 * (targetYaw - state.yaw) - 11 * state.yawVelocity) * dt;
    state.pitchVelocity += (38 * (targetPitch - state.pitch) - 11 * state.pitchVelocity) * dt;
    state.yaw += state.yawVelocity * dt;
    state.pitch += state.pitchVelocity * dt;

    const cam = camera();
    if (engaged) {
      state.hit = pick(cam, nx, ny);
      if (state.hit && state.brushFrom) {
        const jump = Math.hypot(state.hit.x - state.brushFrom.x, state.hit.z - state.brushFrom.z);
        if (jump > 3 * LOOK.mouseRadius) state.brushFrom = null;
      }
    } else if (state.presence < 0.002) {
      state.hit = null;
      state.brushFrom = null;
    }

    for (let i = pulses.length - 1; i >= 0; i--) {
      pulses[i].age += dt;
      if (pulses[i].age > 4) pulses.splice(i, 1);
    }

    const sculpting = updateSculpt(dt);
    if (still && !dirty) return "rest";
    dirty = false;
    render(cam);
    stage.drawn(clamp(look.now.opacity, 0, 1));
    if (still) return "rest";

    const settling = Math.abs(state.yaw - targetYaw) > 1e-4 || Math.abs(state.pitch - targetPitch) > 1e-4
      || Math.abs(state.yawVelocity) > 1e-4 || Math.abs(state.pitchVelocity) > 1e-4;
    const busy = moving || sculpting || settling || pulses.length > 0 || (state.presence > 0.001 && state.presence < 0.999);
    return busy ? "moving" : "idle";
  }

  const redraw = () => {
    dirty = true;
    stage.wake();
  };

  function release() {
    programs?.dispose();
    gl.deleteVertexArray(vao);
    gl.deleteTexture(blank);
    if (field?.texture) gl.deleteTexture(field.texture);
    if (field?.heights) gl.deleteTexture(field.heights);
    if (field?.framebuffer) gl.deleteFramebuffer(field.framebuffer);
    if (field?.heightsFramebuffer) gl.deleteFramebuffer(field.heightsFramebuffer);
    for (const { texture, framebuffer } of sculpt || []) {
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(framebuffer);
    }
  }

  try {
    init();
    stage.start();
  } catch (error) {
    stage.destroy(release);
    throw error;
  }

  return {
    canvas: surface,
    ready: stage.ready,
    resize: stage.resize,
    pause: stage.pause,
    resume: stage.resume,

    set({ shot, amplitude, opacity, seed } = {}, { along: animation, settle = false, cut = [] } = {}) {
      look.to({ ...SHOTS[shot], amplitude, opacity, sx: seed?.[0], sy: seed?.[1] },
        { along: animation, settle: settle || still, cut: cut.includes("seed") ? ["sx", "sy"] : [] });
      redraw();
    },

    setTheme(name) {
      color = INK[name] || INK.dark;
      redraw();
    },

    /** Over the band the land rises under the pointer (and the camera leans
        toward it a little). */
    setPointer(x, y, active) {
      if (active) {
        pointer.x = x;
        pointer.y = y;
      }
      if (active !== pointer.inside) stage.wake();
      pointer.inside = active;
    },

    /** A click sends a pulse across the land. */
    ripple(x, y) {
      if (still) return;
      const hit = pick(camera(), (x / size.w) * 2 - 1, 1 - (y / size.h) * 2);
      if (!hit) return;
      if (pulses.length >= MAX_PULSES) pulses.shift();
      pulses.push({ x: hit.x, z: hit.z, age: 0 });
      stage.wake();
    },

    /** The land's height under a canvas point. */
    sample(x, y) {
      const hit = pick(camera(), (x / size.w) * 2 - 1, 1 - (y / size.h) * 2);
      return hit ? { height: hit.y * 10 } : null;
    },

    destroy() {
      stage.destroy(release);
    },
  };
}
