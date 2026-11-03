/* ==========================================================================
   Particle field — the landscape between the two lines.
   A plane of points displaced by two Perlin-noise fields. A camera glides
   between framings (an edge-on line, an oblique landscape, a top-down
   texture, a calm overview); the pointer lifts the surface under it and
   clicks send ripples through it. Plain WebGL: one program, one draw call.
   ========================================================================== */

/* The plane, in world units: x across (±halfWidth), y into the distance
   (near … far). It overflows the band in every framing below (the band
   clips it), and widens past fanFrom, where perspective shrinks it, so the
   far corners stay covered on wide screens. The wave keeps the scale it had
   on the original 700×400 plane. */
const PLANE = { halfWidth: 400, near: -170, far: 370, fanFrom: 150, fan: 0.6 };
const WAVE_SCALE = [700, 400];

/* Camera framings: elevation above the plane (deg), distance, look-at point
   along the plane's depth, vertical field of view (deg). Every framing but
   the intro's edge-on line sees only plane between the two axes. */
const SHOTS = {
  line:      { elevation: 0.35, distance: 820, target: 0,   fov: 16 },
  landscape: { elevation: 33,   distance: 720, target: -30, fov: 20 },
  texture:   { elevation: 89.3, distance: 800, target: 0,   fov: 15 },
  calm:      { elevation: 42,   distance: 700, target: 0,   fov: 18 },
};
const CAMERA_KEYS = Object.keys(SHOTS.line);

/* How fast each property chases its target (1/s, exponential approach). */
const RATE = { camera: 1.9, amplitude: 2.2, opacity: 3.2, seed: 1.6, pointer: 9, strength: 4 };
const WAVE_SPEED = 0.42; // noise time units per second
const RIPPLES = 4;

const INK = { dark: [0.91, 0.91, 0.91], light: [0.09, 0.09, 0.09] };

const NOISE_GLSL = `
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

// Classic Perlin noise
float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz, iy = Pi.yyww, fx = Pf.xzxz, fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  gx -= floor(gx + 0.5);
  vec2 g00 = vec2(gx.x, gy.x), g10 = vec2(gx.y, gy.y), g01 = vec2(gx.z, gy.z), g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x)), n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z)), n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 f = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), f.x);
  return 2.3 * mix(n_x.x, n_x.y, f.y);
}

float map(float v, float a, float b, float c, float d) { return c + (d - c) * (v - a) / (b - a); }

// The wave at plane point p: one noise field shapes a peak toward the
// center (easing off, never quite flat, toward the far reaches), the other
// modulates it over time; their product is the height.
float wave(vec2 p, float t, vec2 seed) {
  vec2 uv = p / vec2(${WAVE_SCALE[0].toFixed(1)}, ${WAVE_SCALE[1].toFixed(1)}) + 0.5;
  vec2 peak = max(1.0 - abs(0.5 - uv), 0.3);
  float shape = map(cnoise(vec2(0.3 * t + uv.x * 5.0 + seed.x, uv.y * 5.0 + seed.y)), 0.0, 1.0, -2.0, peak.x * peak.y * 30.0);
  float swell = map(cnoise(vec2(-0.3 * t + uv.x * 5.0 - seed.y, uv.y * 5.0 + seed.x)), 0.0, 1.0, -2.0, 25.0);
  return shape * 0.06 * swell;
}
`;

const VERTEX_SHADER = `
precision highp float;

attribute vec2 grid;              // column, row

uniform vec2 uGrid;               // columns, rows
uniform mat4 uModelView;
uniform mat4 uProjection;
uniform vec2 uViewport;           // canvas size, CSS px
uniform float uPixelRatio;
uniform float uDistance;          // camera distance, for size attenuation
uniform float uSize;              // point size, CSS px
uniform float uSpread;            // plane width factor (ultrawide bands)
uniform float uTime;
uniform float uClock;             // seconds, for ripples
uniform float uAmplitude;
uniform vec2 uSeed;
uniform vec3 uPointer;            // x, y (CSS px), strength
uniform vec4 uRipples[${RIPPLES}];        // x, y (CSS px), start (s), strength

varying float vHeight;
varying float vLight;
varying float vFade;

${NOISE_GLSL}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  // Plane position (x across, y into the distance; row 0 is the far edge),
  // lightly jittered off the grid so the lattice never beats against the
  // pixel grid.
  vec2 jitter = vec2(hash(grid), hash(grid + 17.0)) - 0.5;
  vec2 t = (grid + 0.35 * jitter) / uGrid;
  float y = mix(${PLANE.far.toFixed(1)}, ${PLANE.near.toFixed(1)}, t.y);
  float halfWidth = (${PLANE.halfWidth.toFixed(1)} + max(y - ${PLANE.fanFrom.toFixed(1)}, 0.0) * ${PLANE.fan.toFixed(2)}) * uSpread;
  vec2 p = vec2((2.0 * t.x - 1.0) * halfWidth, y);

  // Where the flat point lands on screen: pointer and ripples act there.
  vec4 rest = uProjection * uModelView * vec4(p, 0.0, 1.0);
  vec2 screen = (rest.xy / rest.w * vec2(0.5, -0.5) + 0.5) * uViewport;

  vec2 toPointer = screen - uPointer.xy;
  float lift = uPointer.z * exp(-dot(toPointer, toPointer) / 21000.0);

  float ring = 0.0;
  for (int i = 0; i < ${RIPPLES}; i++) {
    vec4 r = uRipples[i];
    float age = uClock - r.z;
    if (r.w > 0.0 && age > 0.0 && age < 3.2) {
      float front = distance(screen, r.xy) - age * 330.0;
      ring += r.w * exp(-front * front / 1700.0) * exp(-age * 1.25);
    }
  }

  float h = wave(p, uTime, uSeed) * uAmplitude + lift * 9.0 + ring * 14.0;
  vec4 view = uModelView * vec4(p, h, 1.0);
  gl_Position = uProjection * view;
  gl_PointSize = uSize * uPixelRatio * (uDistance / -view.z) * (1.0 + 0.4 * lift);

  // Haze dims the distance, and points quieten near the band's bottom and
  // top edges so the field settles against the axes; nothing fades out.
  float sy = gl_Position.y / gl_Position.w;
  float edges = mix(0.3, 1.0, smoothstep(-1.0, -0.45, sy)) * mix(0.5, 1.0, smoothstep(1.0, 0.8, sy));
  float haze = mix(1.0, 0.5, smoothstep(1.0, 1.7, -view.z / uDistance));
  vHeight = h;
  vLight = 0.5 * lift + 1.4 * ring;
  vFade = edges * haze;
}
`;

const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 uColor;
uniform float uOpacity;

varying float vHeight;
varying float vLight;
varying float vFade;

void main() {
  float disc = 1.0 - smoothstep(0.3, 0.5, length(gl_PointCoord - 0.5));
  // Brighter where the surface rises toward the camera.
  float a = mix(0.1, 1.0, smoothstep(-8.0, 34.0, vHeight));
  a = min(a * 1.15 + 0.4 * vLight, 1.0) * disc * vFade * uOpacity;
  gl_FragColor = vec4(uColor * a, a);
}
`;

/** Starts the field on `canvas`. Returns a controller; `ready` resolves
    once the first frame has been through the GPU, so whatever it builds on
    first use is built before anything moves (right away without WebGL). */
export function createField(canvas, { theme = "dark", still = false, dense = true } = {}) {
  const gl = canvas && canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  const noop = () => {};
  if (!gl) return { ready: Promise.resolve(), pause: noop, set: noop, setTheme: noop, pointer: noop, ripple: noop, sample: () => null, stats: () => null };

  // Bands wider than 2.6:1 (ultrawide screens) see more of the plane's
  // sides; `spread` widens it to match, adding columns to keep the density.
  const spreadFor = (w, h) => Math.max(1, Math.round((w / h / 2.6) * 10) / 10);
  let spread = spreadFor(canvas.clientWidth || 1, canvas.clientHeight || 1);

  // Point density (about one point per 1.17 × 1 world units when dense):
  // the light grid serves small screens, and any device that cannot hold the
  // dense one at a smooth frame rate (see watchFrameRate).
  let grid, count, pointSize;
  const useGrid = (isDense) => {
    dense = isDense;
    grid = { cols: Math.round((dense ? 686 : 343) * spread), rows: dense ? 540 : 270 };
    count = (grid.cols + 1) * (grid.rows + 1);
    pointSize = dense ? 2.0 : 2.6;
  };
  useGrid(dense);

  /* --- State: every animated property has a current value and a target. */
  const camera = { ...SHOTS.line };
  const goal = { camera: { ...SHOTS.line }, amplitude: 0, opacity: 0, seed: [0, 0] };
  const now = { amplitude: 0, opacity: 0, seed: [0, 0] };
  const pointer = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, strength: 0, target: 0 };
  const ripples = new Float32Array(RIPPLES * 4);
  let rippleNext = 0;
  let color = INK[theme] || INK.dark;
  let size = { w: 1, h: 1, dpr: 1 };
  let matrices = null;
  let glide = null; // { from, along }: keeping an animation's clock (see set)
  let resting = false; // nothing moves but the wave
  let time = 7.3;   // wave time (starts mid-swell)
  let clock = 0;    // real seconds since start
  let last = 0;
  let frames = 0;
  let warming = 2;  // frames to wait after the first draw before `ready`

  /* --- GL resources, rebuilt if the context is lost and restored. */
  let u = null;          // uniform locations, once the program has linked
  let pending = null;    // { program, done } while the shaders compile

  function init() {
    u = null;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    uploadGrid();
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied output
    gl.clearColor(0, 0, 0, 0);
    pending = compile(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  }

  /** One vertex per grid point: (column, row). */
  function uploadGrid() {
    const cells = new Float32Array(count * 2);
    for (let row = 0, o = 0; row <= grid.rows; row++) {
      for (let col = 0; col <= grid.cols; col++) { cells[o++] = col; cells[o++] = row; }
    }
    gl.bufferData(gl.ARRAY_BUFFER, cells, gl.STATIC_DRAW);
    if (u) applyGrid();
  }

  function applyGrid() {
    gl.uniform2f(u.uGrid, grid.cols, grid.rows);
    gl.uniform1f(u.uSize, pointSize);
    gl.uniform1f(u.uSpread, spread);
  }

  /* Step down to the light grid if the dense one can't hold ~40 fps. Judged
     on the median frame interval over 90 visible frames after the intro. */
  const intervals = [];
  function watchFrameRate(dt) {
    if (!dense || clock < 4 || document.visibilityState !== "visible") return;
    intervals.push(dt);
    if (intervals.length < 90) return;
    const median = intervals.sort((a, b) => a - b)[45];
    intervals.length = 0;
    if (median > 0.026) {
      useGrid(false);
      uploadGrid();
    }
  }

  /** True once the program is usable. With KHR_parallel_shader_compile the
      shaders build off the main thread and this polls; otherwise it blocks. */
  function link() {
    if (u) return true;
    if (!pending || !pending.done()) return false;
    let program;
    try {
      program = pending.check();
    } catch (error) {
      // A GPU that can't build the shaders just shows no field.
      console.warn("Particle field disabled:", error.message);
      broken = true;
      firstFrame();
      return false;
    } finally {
      pending = null;
    }
    gl.useProgram(program);
    u = {};
    for (const name of ["uGrid", "uSpread", "uModelView", "uProjection", "uViewport", "uPixelRatio", "uDistance",
      "uSize", "uTime", "uClock", "uAmplitude", "uSeed", "uPointer", "uRipples", "uColor", "uOpacity"]) {
      u[name] = gl.getUniformLocation(program, name);
    }
    applyGrid();
    applySize();
    return true;
  }

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = { w, h, dpr };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const nextSpread = spreadFor(w, h);
    if (nextSpread !== spread) {
      spread = nextSpread;
      useGrid(dense);
      uploadGrid();
    }
    if (u) applySize();
    dirty = true;
  }

  function applySize() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.uViewport, size.w, size.h);
    gl.uniform1f(u.uPixelRatio, size.dpr);
    matrices = null;
  }

  function updateCamera() {
    matrices = cameraMatrices(camera, size.w / size.h);
    if (!u) return;
    gl.uniformMatrix4fv(u.uModelView, false, matrices.modelView);
    gl.uniformMatrix4fv(u.uProjection, false, matrices.projection);
    gl.uniform1f(u.uDistance, camera.distance);
  }

  function draw() {
    if (!link()) return false;
    if (!matrices) updateCamera();
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uClock, clock);
    gl.uniform1f(u.uAmplitude, now.amplitude);
    gl.uniform2fv(u.uSeed, now.seed);
    gl.uniform3f(u.uPointer, pointer.x, pointer.y, pointer.strength);
    gl.uniform4fv(u.uRipples, ripples);
    gl.uniform3fv(u.uColor, color);
    gl.uniform1f(u.uOpacity, now.opacity);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, count);
    frames++;
    return true;
  }

  // Exponential approach: frame-rate independent.
  const approach = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));
  const near = (a, b, within) => Math.abs(a - b) <= within;

  /** Moves every property toward its goal; returns whether anything but
      the wave is still moving (a glide, the pointer's lift, a ripple). */
  function step(dt) {
    let moving = false;
    // In step with an animation, on its clock: each property sets off as
    // fast as it otherwise would (its RATE) and lands as the animation ends.
    const timing = glide && glide.along.effect?.getComputedTiming();
    if (timing?.localTime != null && timing.activeDuration > 0) {
      const x = Math.min(timing.localTime / timing.activeDuration, 1);
      const seconds = timing.activeDuration / 1000;
      const at = (from, to, rate) => to + (from - to) * (1 - x) ** (rate * seconds);
      const { from } = glide;
      for (const key of CAMERA_KEYS) camera[key] = at(from.camera[key], goal.camera[key], RATE.camera);
      now.amplitude = at(from.amplitude, goal.amplitude, RATE.amplitude);
      now.opacity = at(from.opacity, goal.opacity, RATE.opacity);
      now.seed[0] = at(from.seed[0], goal.seed[0], RATE.seed);
      now.seed[1] = at(from.seed[1], goal.seed[1], RATE.seed);
      matrices = null;
      moving = true;
      if (x === 1) glide = null;
    } else {
      glide = null; // over, or cut short: any remainder eases in from here
      let changed = false;
      for (const key of CAMERA_KEYS) {
        const next = approach(camera[key], goal.camera[key], RATE.camera, dt);
        if (Math.abs(next - camera[key]) > 1e-4) { camera[key] = next; changed = true; }
        else camera[key] = goal.camera[key];
        // The last tenth of a degree (or unit) drifts too slowly to need
        // every frame.
        moving ||= !near(camera[key], goal.camera[key], 0.1);
      }
      if (changed) matrices = null;
      now.amplitude = approach(now.amplitude, goal.amplitude, RATE.amplitude, dt);
      now.opacity = approach(now.opacity, goal.opacity, RATE.opacity, dt);
      now.seed[0] = approach(now.seed[0], goal.seed[0], RATE.seed, dt);
      now.seed[1] = approach(now.seed[1], goal.seed[1], RATE.seed, dt);
      moving ||= !near(now.amplitude, goal.amplitude, 0.005) || !near(now.opacity, goal.opacity, 0.005)
        || !near(now.seed[0], goal.seed[0], 0.005) || !near(now.seed[1], goal.seed[1], 0.005);
    }
    pointer.x = approach(pointer.x, pointer.tx, RATE.pointer, dt);
    pointer.y = approach(pointer.y, pointer.ty, RATE.pointer, dt);
    pointer.strength = approach(pointer.strength, pointer.target, RATE.strength, dt);
    moving ||= !near(pointer.strength, pointer.target, 0.01)
      || (pointer.strength > 0.01 && !(near(pointer.x, pointer.tx, 0.5) && near(pointer.y, pointer.ty, 0.5)));
    for (let i = 0; i < RIPPLES && !moving; i++) {
      const age = clock - ripples[i * 4 + 2];
      moving = ripples[i * 4 + 3] > 0 && age >= 0 && age < 3.2;
    }
    return moving;
  }

  // While anything moves, draw every frame, in step with the page's own
  // animations; at rest the wave is slow enough to draw at most ~105 times
  // a second (every other frame on 120 / 144 Hz screens, half the GPU work).
  const MIN_FRAME = 1 / 105;

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(frame);
  }

  function frame(t) {
    scheduled = false;
    if (broken || paused) return; // the loop stops until resumed
    schedule();
    if (lost) return;
    // A couple of frames after the first draw, the GPU has run it.
    if (frames && warming && --warming === 0) firstFrame();
    const elapsed = last ? (t - last) / 1000 : 1 / 60;
    if (resting && elapsed < MIN_FRAME) return;
    const dt = Math.min(elapsed, 0.1);
    last = t;
    if (!still) {
      clock += dt;
      time += dt * WAVE_SPEED;
      resting = !step(dt);
      watchFrameRate(dt);
    }
    // Nothing to show: skip the draw (e.g. behind a full-screen sheet).
    if (now.opacity < 0.002 && goal.opacity === 0 && frames > 0) return;
    if (still && frames > 0 && !dirty) return;
    dirty = false;
    draw();
  }

  /** Jump every animated property to its target (reduced motion). */
  function settle() {
    Object.assign(camera, goal.camera);
    now.amplitude = goal.amplitude;
    now.opacity = goal.opacity;
    now.seed = [...goal.seed];
    matrices = null;
    dirty = true;
  }

  let firstFrame;
  let dirty = true;
  let lost = false;
  let broken = false;
  let paused = false;
  let scheduled = false;
  const ready = new Promise((resolve) => (firstFrame = resolve));

  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lost = true; });
  canvas.addEventListener("webglcontextrestored", () => { lost = false; init(); dirty = true; });
  init();
  resize();
  new ResizeObserver(resize).observe(canvas);
  schedule();

  return {
    ready,

    /** Stops drawing (e.g. while something opaque covers the field); the
        wave picks up where it left off when resumed. */
    pause(on) {
      if (paused === on) return;
      paused = on;
      if (!on) {
        last = 0;
        schedule();
      }
    },

    /** Glide toward a framing: any of shot / amplitude / opacity / seed.
        Each property eases in at its own rate; `along` a running animation
        (a Web Animation, e.g. a CSS transition) the glide keeps that
        animation's clock instead, arriving exactly as it ends. A later call
        that changes the framing takes over from wherever it is. */
    set({ shot, amplitude, opacity, seed } = {}, { along } = {}) {
      const before = JSON.stringify(goal);
      if (shot) goal.camera = { ...SHOTS[shot] };
      if (amplitude !== undefined) goal.amplitude = amplitude;
      if (opacity !== undefined) goal.opacity = opacity;
      if (seed) goal.seed = [...seed];
      resting = false;
      if (still) settle();
      else if (along) glide = { along, from: { camera: { ...camera }, amplitude: now.amplitude, opacity: now.opacity, seed: [...now.seed] } };
      else if (JSON.stringify(goal) !== before) glide = null;
    },

    setTheme(name) {
      color = INK[name] || INK.dark;
      dirty = true;
      resting = false;
    },

    /** Pointer position in canvas CSS px; `active` false lets the lift fade. */
    pointer(x, y, active) {
      const target = active && !still ? 1 : 0;
      if (x !== pointer.tx || y !== pointer.ty || target !== pointer.target) resting = false;
      if (pointer.target === 0 && active) { pointer.x = x; pointer.y = y; }
      pointer.tx = x;
      pointer.ty = y;
      pointer.target = target;
    },

    ripple(x, y) {
      if (still) return;
      ripples.set([x, y, clock, 1], (rippleNext++ % RIPPLES) * 4);
      resting = false;
    },

    /** The surface under a canvas point: its plane position { x, y } (world
        units) and height, or null when the point misses the plane. */
    sample(x, y) {
      if (!matrices) updateCamera();
      const hit = intersectPlane(matrices, camera, x / size.w, y / size.h);
      if (!hit) return null;
      const [px, py] = hit;
      const halfWidth = (PLANE.halfWidth + Math.max(py - PLANE.fanFrom, 0) * PLANE.fan) * spread;
      if (py < PLANE.near || py > PLANE.far || Math.abs(px) > halfWidth) return null;
      return { x: px, y: py, height: waveHeight(px, py, time, now.seed) * now.amplitude };
    },

    stats: () => ({ points: count, cols: grid.cols + 1, rows: grid.rows + 1, time, frames }),
  };
}

/* --------------------------------------------------------------------------
   Camera (column-major 4×4 matrices)
   -------------------------------------------------------------------------- */

function cameraMatrices({ elevation, distance, target, fov }, aspect) {
  const el = (elevation * Math.PI) / 180;
  // The plane lies in world XZ (local y -> world -z, height -> world +y).
  const eye = [0, distance * Math.sin(el), target + distance * Math.cos(el)];
  const z = normalize([eye[0], eye[1], eye[2] - target]);
  const x = normalize(cross([0, 1, 0], z));
  const y = cross(z, x);
  const t = [-dot(x, eye), -dot(y, eye), -dot(z, eye)];
  const modelView = new Float32Array([
    x[0], y[0], z[0], 0,
    -x[2], -y[2], -z[2], 0,
    x[1], y[1], z[1], 0,
    t[0], t[1], t[2], 1,
  ]);
  const f = 1 / Math.tan((fov * Math.PI) / 360);
  const near = 1, far = 4000;
  const projection = new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, -(far + near) / (far - near), -1,
    0, 0, (-2 * far * near) / (far - near), 0,
  ]);
  return { eye, x, y, z, f, aspect, modelView, projection };
}

/** Ray from the camera through normalized screen point (sx, sy), hit with
    the flat plane. Returns plane coordinates [across, into] or null. */
function intersectPlane({ eye, x, y, z, f, aspect }, camera, sx, sy) {
  const ndcX = sx * 2 - 1;
  const ndcY = 1 - sy * 2;
  // Direction in world space: camera basis, looking down -z.
  const dir = [0, 1, 2].map((i) => (ndcX * aspect / f) * x[i] + (ndcY / f) * y[i] - z[i]);
  if (dir[1] >= -1e-6) return null; // parallel to or away from the plane
  const t = -eye[1] / dir[1];
  const wx = eye[0] + t * dir[0];
  const wz = eye[2] + t * dir[2];
  return [wx, -wz];
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };

/* --------------------------------------------------------------------------
   The same wave on the CPU (for the readout)
   -------------------------------------------------------------------------- */

const mod289 = (v) => v - Math.floor(v / 289) * 289;
const permute = (v) => mod289((v * 34 + 1) * v);
const fract = (v) => v - Math.floor(v);
const fadeCurve = (t) => t * t * t * (t * (t * 6 - 15) + 10);

function cnoise(px, py) {
  const ix0 = mod289(Math.floor(px)), iy0 = mod289(Math.floor(py));
  const ix1 = mod289(Math.floor(px) + 1), iy1 = mod289(Math.floor(py) + 1);
  const fx0 = fract(px), fy0 = fract(py), fx1 = fx0 - 1, fy1 = fy0 - 1;
  const corner = (ix, iy, fx, fy) => {
    const i = permute(permute(ix) + iy);
    let gx = fract(i / 41) * 2 - 1;
    const gy = Math.abs(gx) - 0.5;
    gx -= Math.floor(gx + 0.5);
    const norm = 1.79284291400159 - 0.85373472095314 * (gx * gx + gy * gy);
    return norm * (gx * fx + gy * fy);
  };
  const n00 = corner(ix0, iy0, fx0, fy0), n10 = corner(ix1, iy0, fx1, fy0);
  const n01 = corner(ix0, iy1, fx0, fy1), n11 = corner(ix1, iy1, fx1, fy1);
  const ux = fadeCurve(fx0), uy = fadeCurve(fy0);
  const nx0 = n00 + (n10 - n00) * ux, nx1 = n01 + (n11 - n01) * ux;
  return 2.3 * (nx0 + (nx1 - nx0) * uy);
}

const mapRange = (v, a, b, c, d) => c + ((d - c) * (v - a)) / (b - a);

function waveHeight(x, y, t, seed) {
  const ux = x / WAVE_SCALE[0] + 0.5, uy = y / WAVE_SCALE[1] + 0.5;
  const px = Math.max(1 - Math.abs(0.5 - ux), 0.3), py = Math.max(1 - Math.abs(0.5 - uy), 0.3);
  const shape = mapRange(cnoise(0.3 * t + ux * 5 + seed[0], uy * 5 + seed[1]), 0, 1, -2, px * py * 30);
  const swell = mapRange(cnoise(-0.3 * t + ux * 5 - seed[1], uy * 5 + seed[0]), 0, 1, -2, 25);
  return shape * 0.06 * swell;
}

/* --------------------------------------------------------------------------
   WebGL plumbing
   -------------------------------------------------------------------------- */

/** Starts compiling and linking; returns { done(), check() }. done() polls
    KHR_parallel_shader_compile when available (no main-thread stall);
    check() returns the program or throws with the compiler log. */
function compile(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  const shaders = [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]].map(([type, source]) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    return shader;
  });
  gl.bindAttribLocation(program, 0, "grid");
  gl.linkProgram(program);
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  return {
    done: () => !parallel || gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR),
    check() {
      if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
      throw new Error(shaders.map((s) => gl.getShaderInfoLog(s)).join("\n") + gl.getProgramInfoLog(program));
    },
  };
}
