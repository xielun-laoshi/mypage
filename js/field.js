/* ==========================================================================
   Particle field — the wave between the two lines.
   A 700×190 plane of 601×191 points, displaced by two Perlin-noise fields
   and seen almost edge-on from above. Plain WebGL: one program, one draw
   call per frame.
   ========================================================================== */

const PLANE = { width: 700, height: 190, cols: 600, rows: 190 };
const CAMERA = { fov: 15, near: 1, far: 2000, eye: [0, 800, 10] };
const SPRITE_URL = new URL("../img/spark1.png", import.meta.url);

const VERTEX_SHADER = `
precision highp float;

attribute vec2 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;

varying float vZ;

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec2 fade(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// Classic Perlin noise
float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi); // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;

  vec4 i = permute(permute(ix) + iy);

  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;

  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);

  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;

  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));

  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

float map(float value, float oldMin, float oldMax, float newMin, float newMax) {
  return newMin + (newMax - newMin) * (value - oldMin) / (oldMax - oldMin);
}

void main() {
  vec3 newPos = vec3(position, 0.0);
  // Two noise fields: one shapes a peak toward the plane's center,
  // the other modulates it over time — their product is the wave height.
  vec2 peak = vec2(1.0 - abs(.5 - uv.x), 1.0 - abs(.5 - uv.y));
  vec2 noise = vec2(
    map(cnoise(vec2(0.3 * time + uv.x * 5., uv.y * 5.)), 0., 1., -2., (peak.x * peak.y * 30.)),
    map(cnoise(vec2(-0.3 * time + uv.x * 5., uv.y * 5.)), 0., 1., -2., 25.)
  );

  newPos.z += noise.x * .06 * noise.y;
  vZ = newPos.z;
  vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
  gl_PointSize = 5.0;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D sprite;
uniform vec3 color;

varying float vZ;

float map(float value, float oldMin, float oldMax, float newMin, float newMax) {
  return newMin + (newMax - newMin) * (value - oldMin) / (oldMax - oldMin);
}

void main() {
  // Alpha fades with the point's height.
  float alpha = map(vZ / 2., -1. / 2., 30. / 2., 0.17, 1.);
  gl_FragColor = vec4(color, alpha) * texture2D(sprite, gl_PointCoord);
}
`;

const THEME_COLORS = { dark: [1, 1, 1], light: [0, 0, 0] };

/** Starts the field on `canvas`. Returns { ready, setTheme }: `ready`
    resolves once the sprite has loaded and the first frame can draw. */
export function createField(canvas, { theme = "dark" } = {}) {
  const gl = canvas && canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) return { ready: Promise.resolve(), setTheme() {} };

  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  gl.useProgram(program);
  const uniform = (name) => gl.getUniformLocation(program, name);
  const u = {
    modelView: uniform("modelViewMatrix"),
    projection: uniform("projectionMatrix"),
    time: uniform("time"),
    color: uniform("color"),
    sprite: uniform("sprite"),
  };

  // Interleaved vertex data (position.xy, uv.xy) plus the plane's triangle
  // index. The wave's density comes from drawing that index as points: each
  // vertex is blended once per triangle that shares it (up to 6 times).
  const { vertices, indices } = buildPlane(PLANE);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  const attribute = (name, size, offset) => {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 16, offset);
  };
  attribute("position", 2, 0);
  attribute("uv", 2, 8);
  // 32-bit indices: the plane has more than 65,535 vertices.
  gl.getExtension("OES_element_index_uint");

  gl.uniformMatrix4fv(u.modelView, false, modelViewMatrix(CAMERA.eye));
  gl.uniform1i(u.sprite, 0);
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const setTheme = (name) => gl.uniform3fv(u.color, THEME_COLORS[name] || THEME_COLORS.light);
  setTheme(theme);

  function resize() {
    // clientWidth/Height exclude scrollbars and are integers, so a resize
    // can never feed back into the layout it measures.
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniformMatrix4fv(u.projection, false, perspective(CAMERA.fov, w / h, CAMERA.near, CAMERA.far));
  }

  let time = 0;
  function frame() {
    requestAnimationFrame(frame);
    time += 0.01;
    gl.uniform1f(u.time, time);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.POINTS, indices.length, gl.UNSIGNED_INT, 0);
  }

  const image = new Image();
  image.src = SPRITE_URL;
  const ready = image.decode().then(
    () => {
      uploadSprite(gl, image);
      resize();
      window.addEventListener("resize", resize);
      frame();
    },
    () => console.warn("Could not load", SPRITE_URL.href)
  );

  return { ready, setTheme };
}

/* --------------------------------------------------------------------------
   Geometry
   -------------------------------------------------------------------------- */

/** A plane laid out row by row from the top-left corner, with two triangles
    per cell, matching THREE.PlaneBufferGeometry vertex for vertex. */
function buildPlane({ width, height, cols, rows }) {
  const vertices = new Float32Array((cols + 1) * (rows + 1) * 4);
  let o = 0;
  for (let iy = 0; iy <= rows; iy++) {
    for (let ix = 0; ix <= cols; ix++) {
      vertices[o++] = ix * (width / cols) - width / 2;
      vertices[o++] = -(iy * (height / rows) - height / 2);
      vertices[o++] = ix / cols;
      vertices[o++] = 1 - iy / rows;
    }
  }

  const indices = new Uint32Array(cols * rows * 6);
  o = 0;
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const a = ix + (cols + 1) * iy;
      const b = ix + (cols + 1) * (iy + 1);
      const c = ix + 1 + (cols + 1) * (iy + 1);
      const d = ix + 1 + (cols + 1) * iy;
      indices[o++] = a; indices[o++] = b; indices[o++] = d;
      indices[o++] = b; indices[o++] = c; indices[o++] = d;
    }
  }
  return { vertices, indices };
}

/* --------------------------------------------------------------------------
   Camera (column-major 4×4 matrices)
   -------------------------------------------------------------------------- */

/** View matrix of a camera at `eye` looking at the origin, times the plane's
    -90° rotation about X (local y -> world -z, local z -> world +y), so the
    plane lies flat and its displacement points up at the camera. */
function modelViewMatrix(eye) {
  const z = normalize(eye);
  const x = normalize(cross([0, 1, 0], z));
  const y = cross(z, x);
  const t = [-dot(x, eye), -dot(y, eye), -dot(z, eye)];
  return new Float32Array([
    x[0], y[0], z[0], 0,
    -x[2], -y[2], -z[2], 0,
    x[1], y[1], z[1], 0,
    t[0], t[1], t[2], 1,
  ]);
}

function perspective(fovDegrees, aspect, near, far) {
  const f = 1 / Math.tan((fovDegrees * Math.PI) / 360);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, -(far + near) / (far - near), -1,
    0, 0, (-2 * far * near) / (far - near), 0,
  ]);
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };

/* --------------------------------------------------------------------------
   WebGL plumbing
   -------------------------------------------------------------------------- */

function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  return program;
}

/** Uploads the sprite the way Three.js r86 did (flipped, straight alpha,
    trilinear mipmaps). At 5px the mipmaps average in the transparent edge
    texels' color, which is what gives the dark-theme wave its warm tint. */
function uploadSprite(gl, image) {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
