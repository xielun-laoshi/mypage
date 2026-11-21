/* ==========================================================================
   Stage — what the backgrounds that load on demand (js/slats.js,
   js/topography.js) share: a canvas with its own WebGL 2 context and
   frame loop, shader programs that build without stalling the page,
   textures to render into, and framings that glide the way the particle
   field's do. (The field, js/field.js, ships with the page and keeps its
   own.)
   ========================================================================== */

import { FRAMES, EASE } from "./field.js";

export { INK } from "./field.js";

/* While anything beyond the idle motion moves, draw every frame; with the
   idle motion alone, at most ~105 times a second (every other frame on
   120 / 144 Hz screens), as the field does. */
const MIN_FRAME = 1 / 105;

/* One triangle that covers the viewport, from the vertex index alone. */
export const FULLSCREEN = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** A canvas (`canvas`, or a new one added to `container`) with a WebGL 2
    context of its own and a frame loop. The background provides:
      ratio(w, h)   the pixel ratio for a canvas w × h CSS px in size
      resize()      the canvas changed size (`size` is up to date)
      restore()     a lost context is back: rebuild everything on the GPU
      draw(dt)      one frame. Returns null while it can't draw yet (its
                    programs are still building), "moving" while anything
                    beyond the idle motion moves, "idle", or "rest" when
                    nothing moves (the loop sleeps until wake()).
    `ready` resolves two frames after the first draw, once the GPU has run
    it; it rejects if drawing fails before then. `frames` and `typed` are
    the page's, as for the field (see createField in js/field.js): the
    background then calls drawn(opacity) each time it has drawn on the
    canvas, and while typed draws its picture whole, leaving the view's
    opacity to the screen. */
export function createStage(container, { canvas, attributes = {}, ratio, resize, restore, draw, onError = () => {}, frames = FRAMES, typed }) {
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "field";
    container.append(canvas);
  }
  const gl = canvas.getContext("webgl2", {
    alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, ...attributes,
  });
  if (!gl) {
    canvas.remove();
    throw new Error("WebGL 2 is not available");
  }

  const size = { w: 1, h: 1, dpr: 1 }; // the canvas, CSS px
  let raf = 0;
  let last = 0;
  let resting = false;
  let paused = false;
  let gone = false;
  let failed = false;
  let warming = -1; // frames to go before `ready` (-1: nothing drawn yet)
  let arrive, fail;
  const ready = new Promise((resolve, reject) => { arrive = resolve; fail = reject; });

  function measure() {
    if (gone || failed) return;
    size.w = canvas.clientWidth || 1;
    size.h = canvas.clientHeight || 1;
    size.dpr = typed?.()?.scale || ratio(size.w, size.h);
    const width = Math.max(1, Math.round(size.w * size.dpr));
    const height = Math.max(1, Math.round(size.h * size.dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    resize();
    wake();
  }

  function frame(now) {
    raf = 0;
    if (paused || gone || failed) return;
    raf = frames.request(frame);
    const elapsed = last ? (now - last) / 1000 : 1 / 60;
    if (resting && elapsed < MIN_FRAME) return;
    last = now;
    if (gl.isContextLost()) return;
    let state;
    try {
      state = draw(Math.min(elapsed, 0.1));
    } catch (error) {
      return stopped(error);
    }
    if (state === null) return;
    if (warming < 0) warming = 2;
    else if (warming > 0 && --warming === 0) arrive();
    resting = state !== "moving";
    if (state === "rest" && warming === 0) stop();
  }

  function stop() {
    frames.cancel(raf);
    raf = 0;
  }

  // Notify the owner even after ready has resolved, so a broken active
  // background can fall back instead of remaining selected and frozen.
  function stopped(error) {
    if (gone || failed) return;
    failed = true;
    stop();
    fail(error);
    onError(error);
  }

  /** Starts the loop again if it was sleeping. */
  function wake() {
    if (raf || paused || gone || failed) return;
    last = 0;
    raf = frames.request(frame);
  }

  const listening = new AbortController();
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stop();
  }, { signal: listening.signal });
  canvas.addEventListener("webglcontextrestored", () => {
    if (gone || failed) return;
    try { restore(); measure(); } catch (error) { stopped(error); }
  }, { signal: listening.signal });
  const observer = new ResizeObserver(() => {
    try { measure(); } catch (error) { stopped(error); }
  });

  return {
    gl,
    canvas,
    size,
    ready,
    wake,
    resize: measure,
    drawn: frames.drawn,

    /** Sizes the canvas, starts the loop, and follows the canvas's size. */
    start() {
      if (gone || failed) return;
      measure();
      observer.observe(canvas);
    },

    pause() {
      paused = true;
      stop();
    },

    resume() {
      if (!paused) return;
      paused = false;
      wake();
    },

    /** Stops for good. `release()` frees what the background holds on the
        GPU; then the context is released and the canvas removed. */
    destroy(release = () => {}) {
      if (gone) return;
      gone = true;
      stop();
      observer.disconnect();
      listening.abort();
      try {
        if (!gl.isContextLost()) release();
      } finally {
        try { gl.getExtension("WEBGL_lose_context")?.loseContext(); }
        finally {
          canvas.remove();
          arrive(); // release callers waiting on a cancelled first frame
        }
      }
    },
  };
}

/** Builds several programs side by side, off the main thread where the
    browser can (KHR_parallel_shader_compile). `sources` maps a name to its
    [vertex, fragment] pair. ready() turns true once all have linked, and
    throws with the compiler's log if one can't; use(name) then makes that
    program current and returns its uniform locations by name. */
export function createPrograms(gl, sources) {
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  const builds = Object.entries(sources).map(([name, [vertex, fragment]]) => {
    const program = gl.createProgram();
    const shaders = [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]].map(([type, source]) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
      return shader;
    });
    gl.linkProgram(program);
    return { name, program, shaders };
  });
  const linked = {};
  let done = false;

  return {
    ready() {
      if (done) return true;
      if (parallel && !builds.every((b) => gl.getProgramParameter(b.program, parallel.COMPLETION_STATUS_KHR))) return false;
      for (const { name, program, shaders } of builds) {
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          throw new Error(`${name}: ${shaders.map((s) => gl.getShaderInfoLog(s)).join("\n")}${gl.getProgramInfoLog(program)}`);
        }
        const uniforms = {};
        for (let i = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) - 1; i >= 0; i--) {
          const { name: uniform } = gl.getActiveUniform(program, i);
          uniforms[uniform.replace(/\[0\]$/, "")] = gl.getUniformLocation(program, uniform);
        }
        linked[name] = { program, uniforms };
      }
      return (done = true);
    },

    use(name) {
      gl.useProgram(linked[name].program);
      return linked[name].uniforms;
    },

    dispose() {
      for (const { program, shaders } of builds) {
        for (const shader of shaders) gl.deleteShader(shader);
        gl.deleteProgram(program);
      }
    },
  };
}

/** A 2D texture of `width` × `height` texels in `format` (zeroed). */
export function createTexture(gl, width, height, format, { filter = gl.LINEAR, wrap = gl.CLAMP_TO_EDGE } = {}) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texStorage2D(gl.TEXTURE_2D, 1, format, width, height);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  return texture;
}

/** A texture to render into, with its framebuffer. */
export function createTarget(gl, width, height, { format = gl.RGBA8, filter, wrap } = {}) {
  const texture = createTexture(gl, width, height, format, { filter, wrap });
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return {
    texture,
    framebuffer,
    width,
    height,
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(framebuffer);
    },
  };
}

/** Values that glide toward their goals the way the field's framing does
    (js/field.js): each chases a lead that chases its goal, both at EASE
    times its own rate (1/s, exponential approach), so that it sets off
    from rest and lands at rest; `along` a running animation (a CSS
    transition, say) they keep its clock instead, landing as it ends;
    `settle` jumps straight there. */
export function createGlide(start, rates) {
  const now = { ...start };
  const goal = { ...start };
  const lead = { ...start }; // what each value chases
  let run = null; // { along, from }: keeping an animation's clock

  return {
    now,
    goal,

    /** `cut`: keys that jump straight to their goals, the rest gliding. */
    to(values, { along, settle = false, cut = [] } = {}) {
      let changed = false;
      for (const key in values) {
        if (!(key in goal) || values[key] === undefined) continue;
        changed ||= goal[key] !== values[key];
        goal[key] = values[key];
      }
      if (settle) {
        Object.assign(now, goal);
        Object.assign(lead, goal);
        run = null;
      } else if (along) run = { along, from: { ...now } };
      else if (changed) run = null;
      for (const key of cut) {
        if (!(key in goal)) continue;
        now[key] = lead[key] = goal[key];
        if (run) run.from[key] = goal[key];
      }
    },

    /** Moves every value toward its goal; returns whether any still moves. */
    step(dt) {
      const timing = run?.along.effect?.getComputedTiming();
      if (timing?.localTime != null && timing.activeDuration > 0) {
        const x = Math.min(timing.localTime / timing.activeDuration, 1);
        const seconds = timing.activeDuration / 1000;
        for (const key in goal) now[key] = lead[key] = goal[key] + (run.from[key] - goal[key]) * (1 - x) ** (rates[key] * seconds);
        if (x === 1) run = null;
        return true;
      }
      run = null; // over, or cut short: any remainder eases in from here
      let moving = false;
      for (const key in goal) {
        const share = 1 - Math.exp(-rates[key] * EASE * dt);
        lead[key] += (goal[key] - lead[key]) * share;
        now[key] += (lead[key] - now[key]) * share;
        moving ||= Math.abs(goal[key] - now[key]) > 0.002;
      }
      return moving;
    },
  };
}
