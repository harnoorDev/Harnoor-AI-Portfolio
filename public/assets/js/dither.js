// dither.js · 1-bit dithered raymarch backdrop (WebGL).
//
// One full-screen pass at a fraction of screen resolution: sphere-trace a
// signed-distance shape for the current section, light it from the cursor,
// then quantise against an 8×8 Bayer matrix. The canvas is upscaled with
// image-rendering: pixelated, so every dither cell stays a crisp square.

const VS = `
attribute vec2 aPos;
void main () { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// The seven section shapes and the blend between them, shared with ascii.js.
export const SCENE_GLSL = `
uniform float uTime;
uniform mat3 uRot;
uniform float uSceneA;
uniform float uSceneB;
uniform float uMorph;
uniform float uTwist;

float hash (vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
mat2 rot2 (float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdTorus (vec3 p, vec2 t) { vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdBox (vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdOcta (vec3 p, float s) { p = abs(p); return (p.x + p.y + p.z - s) * 0.57735027; }

// hero · "the model": a sliced sphere drifting through its own slots, one orbit
float sCore (vec3 p) {
  float slot = abs(mod(p.y + uTime * 0.05, 0.16) - 0.08) - 0.018;
  float d = max(length(p) - 0.9, -slot);
  vec3 q = p;
  q.xy = rot2(0.35) * q.xy;
  return min(d, sdTorus(q, vec2(1.3, 0.035)));
}
// live demo · a perimeter ring with a dashed scanner band
float sRing (vec3 p) {
  float d = sdTorus(p, vec2(1.0, 0.12));
  vec3 q = p;
  q.xz = rot2(uTime * 0.4) * q.xz;
  float dash = abs(fract(atan(q.z, q.x) * 3.8197) - 0.5) - 0.18;
  return min(d, max(sdTorus(q, vec2(1.32, 0.042)), dash * 0.25));
}
// signals · a shattered octahedron, eight shards breathing apart
float sShards (vec3 p) {
  vec3 s = sign(p + 1e-5);
  float gap = 0.1 + 0.06 * sin(uTime * 0.8 + dot(s, vec3(1.3, 2.1, 0.7)));
  vec3 a = abs(p);
  return max(sdOcta(p - s * gap, 0.92), 0.04 - min(a.x, min(a.y, a.z)));
}
// work · systems inside systems: nested cube frames turning at their own rates
float sdBoxFrame (vec3 p, vec3 b, float e) {
  p = abs(p) - b;
  vec3 q = abs(p + e) - e;
  return min(min(
    length(max(vec3(p.x, q.y, q.z), 0.0)) + min(max(p.x, max(q.y, q.z)), 0.0),
    length(max(vec3(q.x, p.y, q.z), 0.0)) + min(max(q.x, max(p.y, q.z)), 0.0)),
    length(max(vec3(q.x, q.y, p.z), 0.0)) + min(max(q.x, max(q.y, p.z)), 0.0));
}
float sFrames (vec3 p) {
  float d = sdBoxFrame(p, vec3(0.82), 0.04);
  vec3 q = p;
  q.xz = rot2(uTime * 0.35) * q.xz;
  q.xy = rot2(0.6) * q.xy;
  d = min(d, sdBoxFrame(q, vec3(0.52), 0.035));
  q = p;
  q.yz = rot2(-uTime * 0.5) * q.yz;
  q.xz = rot2(0.8) * q.xz;
  return min(d, sdBox(q, vec3(0.2)) - 0.02);
}
// experience · a double helix with rungs
float sHelix (vec3 p) {
  vec2 xz = rot2(p.y * 2.4 + uTime * 0.7) * p.xz;
  float strands = min(length(xz - vec2(0.42, 0.0)), length(xz + vec2(0.42, 0.0))) - 0.1;
  float rung = max(max(abs(xz.y) - 0.025, abs(mod(p.y, 0.24) - 0.12) - 0.022), abs(xz.x) - 0.42);
  return max(min(strands, rung), abs(p.y) - 1.3) * 0.6;
}
// stack + credentials · a Menger sponge
float sSponge (vec3 p) {
  p /= 0.85;
  float d = sdBox(p, vec3(1.0));
  float s = 1.0;
  for (int m = 0; m < 3; m++) {
    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = abs(1.0 - 3.0 * abs(a));
    float c = (min(max(r.x, r.y), min(max(r.y, r.z), max(r.z, r.x))) - 1.0) / s;
    d = max(d, c);
  }
  return d * 0.85;
}
// contact · a gyroscope: hot core inside three precessing rings
float sGyro (vec3 p) {
  float d = length(p) - 0.26;
  vec3 q = p;
  q.xz = rot2(uTime * 0.5) * q.xz;
  d = min(d, sdTorus(q, vec2(1.0, 0.03)));
  q = p;
  q.xy = rot2(1.1) * q.xy;
  q.xz = rot2(-uTime * 0.7) * q.xz;
  d = min(d, sdTorus(q, vec2(0.78, 0.028)));
  q = p;
  q.yz = rot2(0.9 + uTime * 0.3) * q.yz;
  return min(d, sdTorus(q.xzy, vec2(0.58, 0.026)));
}

float scene (float id, vec3 p) {
  if (id < 0.5) return sCore(p);
  if (id < 1.5) return sRing(p);
  if (id < 2.5) return sShards(p);
  if (id < 3.5) return sFrames(p);
  if (id < 4.5) return sHelix(p);
  if (id < 5.5) return sSponge(p);
  return sGyro(p);
}
float map (vec3 p) {
  p = uRot * p;
  p.xz = rot2(p.y * uTwist) * p.xz;
  float a = scene(uSceneA, p);
  if (uMorph < 0.002) return a;
  return mix(a, scene(uSceneB, p), uMorph);
}
vec3 normal (vec3 p) {
  vec2 e = vec2(0.0025, -0.0025);
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}`;

const FS = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uScale;
uniform vec2 uPtr;
uniform float uPtrOn;
uniform vec3 uRipple;
uniform float uGlitch;
uniform float uIntensity;
uniform vec3 uInk;
uniform vec3 uHot;
${SCENE_GLSL}
float bayer2 (vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4 (vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8 (vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main () {
  vec2 fc = gl_FragCoord.xy;
  // digital tear: shove random bands sideways while a breach glitch is live
  if (uGlitch > 0.01) {
    float band = floor(fc.y / 5.0);
    if (hash(vec2(band, floor(uTime * 24.0))) > 1.0 - uGlitch * 0.6) fc.x += (hash(vec2(band, 3.7)) - 0.5) * uRes.x * 0.12 * uGlitch;
  }
  vec2 uv = (fc - 0.5 * uRes) / uRes.y;
  // the cursor ripples the image; a click sends a shockwave through it
  vec2 dp = uv - uPtr;
  float dl = length(dp);
  uv += uPtrOn * dp / (dl + 1e-4) * sin(dl * 46.0 - uTime * 6.0) * 0.005 * exp(-dl * 8.0);
  if (uRipple.z >= 0.0) {
    vec2 dr = uv - uRipple.xy;
    float rl = length(dr);
    float k = (rl - uRipple.z * 0.75) * 18.0;
    uv += dr / (rl + 1e-4) * exp(-k * k) * 0.02 * exp(-uRipple.z * 1.6);
  }
  vec2 q = (uv - uCenter) / uScale;
  vec3 ro = vec3(0.0, 0.0, 3.4);
  vec3 rd = normalize(vec3(q, -1.9));
  float b = dot(ro, rd);
  float h = b * b - (dot(ro, ro) - 2.6);
  float lum = -1.0;
  if (h > 0.0) {
    float sh = sqrt(h);
    float t = max(-b - sh, 0.0);
    float tmax = -b + sh;
    for (int i = 0; i < 80; i++) {
      vec3 p = ro + rd * t;
      float d = map(p);
      if (d < 0.0015) {
        vec3 n = normal(p);
        vec3 L = normalize(vec3(uPtr.x * 1.8 + 0.7, uPtr.y * 1.8 + 0.9, 1.2));
        float dif = max(dot(n, L), 0.0);
        float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        float ao = clamp(map(p + n * 0.09) / 0.09, 0.0, 1.0);
        lum = 0.06 + 0.8 * dif * (0.45 + 0.55 * ao) + 0.45 * rim;
        break;
      }
      t += d * 0.75;
      if (t > tmax) break;
    }
  }
  float th = bayer8(gl_FragCoord.xy);
  vec4 col = vec4(0.0);
  if (lum > th) col = vec4(uInk, 1.0) * 0.78;
  if (lum > 0.86 + th * 0.14) col = vec4(uHot, 1.0);
  gl_FragColor = col * uIntensity;
}`;

export function hexToRgb(hex) {
  const h = String(hex).replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return [1, 0.42, 0.24];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
export function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h /= 6; if (h < 0) h += 1;
  }
  return [h, max ? d / max : 0, max];
}
export function hsvToRgb(h, s, v) {
  h = ((h % 1) + 1) % 1;
  const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p]; case 1: return [q, v, p]; case 2: return [p, v, t];
    case 3: return [p, q, v]; case 4: return [t, p, v]; default: return [v, p, q];
  }
}
// column-major 3x3 rotations
export function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; }
export function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; }
export function rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; }
export function mul3(A, B) {
  const o = new Array(9);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = A[r] * B[c * 3] + A[3 + r] * B[c * 3 + 1] + A[6 + r] * B[c * 3 + 2];
  return o;
}

// One scene per page section, in page order. Layout: [x, y, radius] with x in
// half-widths, y in half-heights and radius as a fraction of screen height.
export const SCENES = [
  { spin: 0.12, pitch: 0.25, roll: 0, glow: 0.78, wide: [0.56, 0.02, 0.34], narrow: [0, 0.4, 0.2] },
  { spin: 0.05, pitch: 1.2, roll: 0.05, glow: 0.55, wide: [0, 0, 0.44], narrow: [0, 0.05, 0.24] },
  { spin: 0.1, pitch: 0.5, roll: 0.2, glow: 0.55, wide: [0.66, 0.02, 0.27], narrow: [0, 0.3, 0.18] },
  { spin: 0.08, pitch: 0.4, roll: 0, glow: 0.6, wide: [0.25, 0, 0.42], narrow: [0, 0.28, 0.2] },
  { spin: 0, pitch: 0, roll: -0.5, glow: 0.58, wide: [0.5, 0, 0.34], narrow: [0.1, 0.25, 0.24] },
  { spin: 0.1, pitch: 0.55, roll: 0.15, glow: 0.5, wide: [0.64, 0.05, 0.26], narrow: [0, 0.3, 0.18] },
  { spin: 0, pitch: 0.3, roll: 0, glow: 0.72, wide: [0.42, 0.02, 0.36], narrow: [0, 0.2, 0.22] },
];
export const UNIT_RADIUS = 0.584; // a unit sphere at the camera distance spans this many uv units

export function createDither(canvas, options = {}) {
  const small = window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
  const attrs = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  const gl = canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs);
  if (!gl) return null;
  const renderer = (() => {
    try {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      return String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    } catch { return ''; }
  })();
  if (!options.force && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) return null;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader compile failed');
    return s;
  }
  let prog;
  const u = {};
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link failed');
  } catch (err) {
    console.warn('[dither] disabled:', err.message);
    return null;
  }
  const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const name = gl.getActiveUniform(prog, i).name;
    u[name] = gl.getUniformLocation(prog, name);
  }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.BLEND);
  canvas.style.imageRendering = 'pixelated';

  // ---------- sizing ----------
  // cell = CSS px per dither dot, snapped to whole device pixels so the
  // pixelated upscale stays even
  const LEVELS = small ? [2.5, 3.5, 5] : [3, 4, 5.5];
  let level = 0;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const cellDev = Math.max(1, Math.round(LEVELS[level] * dpr));
    const w = Math.max(1, Math.round((canvas.clientWidth * dpr) / cellDev));
    const h = Math.max(1, Math.round((canvas.clientHeight * dpr) / cellDev));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  // ---------- colour ----------
  let light = 0, accentHex = options.accent || '#ff6a3d';
  const col = { ink: [1, 0.42, 0.24], hot: [1, 0.9, 0.8], alarm: [1, 0.23, 0.23] };
  function setAccent(hex) {
    accentHex = hex || accentHex;
    const [h, s] = rgbToHsv(...hexToRgb(accentHex));
    const sat = Math.max(0.55, Math.min(1, s));
    if (light) {
      col.ink = hsvToRgb(h, sat, 0.5);
      col.hot = hsvToRgb(h - 0.02, sat * 0.4, 0.2);
      col.alarm = [0.78, 0.1, 0.1];
    } else {
      col.ink = hsvToRgb(h, sat, 1);
      col.hot = hsvToRgb(h + 0.1, 0.2, 1);
      col.alarm = [1, 0.23, 0.23];
    }
  }

  // ---------- input + scroll ----------
  const ptr = { x: 0.3, y: 0.15, tx: 0.3, ty: 0.15, on: 0, onTarget: 0 };
  const toUv = (cx, cy) => {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    return [(cx / w - 0.5) * (w / h), 0.5 - cy / h];
  };
  function pointer(cx, cy) { [ptr.tx, ptr.ty] = toUv(cx, cy); ptr.onTarget = 1; }
  function pointerLeave() { ptr.onTarget = 0; }
  const ripple = { x: 0, y: 0, born: -100 };
  function tap(cx, cy) { [ripple.x, ripple.y] = toUv(cx, cy); ripple.born = clock; }
  const scroll = { scene: 0, local: 0 };
  function setScroll(s) {
    if (!s) return;
    scroll.scene = Math.max(0, Math.min(SCENES.length - 1, s.scene || 0));
    scroll.local = Math.max(0, Math.min(1, s.local || 0));
  }
  let twist = 0, glitch = 0, alarm = 0;
  function impulse(v) {
    if (!running || !v) return;
    twist = Math.max(-1.2, Math.min(1.2, twist + v * 0.004));
  }
  function burst(n = 2) { glitch = Math.min(1, Math.max(glitch, 0.3 * n)); }
  function breach() { glitch = 1; alarm = 1; }

  // ---------- frame ----------
  let clock = 0;
  function render(dt) {
    const A = Math.floor(scroll.scene), B = Math.min(SCENES.length - 1, A + 1), m = scroll.scene - A;
    const SA = SCENES[A], SB = SCENES[B];
    const wide = canvas.clientWidth / Math.max(1, canvas.clientHeight) >= 1.05;
    const LA = wide ? SA.wide : SA.narrow, LB = wide ? SB.wide : SB.narrow;
    const lerp = (a, b) => a + (b - a) * m;
    const halfW = (canvas.clientWidth / Math.max(1, canvas.clientHeight)) / 2;

    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 8);
    ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 8);
    ptr.on += (ptr.onTarget - ptr.on) * Math.min(1, dt * 3);
    twist *= Math.exp(-dt * 2.5);
    glitch *= Math.exp(-dt * 3);
    alarm *= Math.exp(-dt * 1.4);

    const drift = (scroll.local - 0.5) * 0.12;
    const cx = lerp(LA[0], LB[0]) * halfW;
    const cy = lerp(LA[1] + drift, LB[1] - 0.06) * 0.5;
    const radius = lerp(LA[2], LB[2]);
    const yaw = lerp(SA.spin, SB.spin) * clock + scroll.local * 1.1 * (1 - m) + ptr.x * 0.5 * ptr.on;
    const pitch = lerp(SA.pitch, SB.pitch) - ptr.y * 0.4 * ptr.on;
    const roll = lerp(SA.roll, SB.roll);
    const rot = new Float32Array(mul3(rotZ(roll), mul3(rotX(pitch), rotY(yaw))));
    const ink = col.ink.map((c, i) => c + (col.alarm[i] - c) * alarm);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, clock);
    gl.uniform2f(u.uCenter, cx, cy);
    gl.uniform1f(u.uScale, radius / UNIT_RADIUS);
    gl.uniformMatrix3fv(u.uRot, false, rot);
    gl.uniform1f(u.uSceneA, A);
    gl.uniform1f(u.uSceneB, B);
    gl.uniform1f(u.uMorph, m);
    gl.uniform2f(u.uPtr, ptr.x, ptr.y);
    gl.uniform1f(u.uPtrOn, ptr.on);
    const age = clock - ripple.born;
    gl.uniform3f(u.uRipple, ripple.x, ripple.y, age < 2.5 ? age : -1);
    gl.uniform1f(u.uTwist, twist);
    gl.uniform1f(u.uGlitch, glitch);
    gl.uniform1f(u.uIntensity, lerp(SA.glow, SB.glow));
    gl.uniform3fv(u.uInk, ink);
    gl.uniform3fv(u.uHot, col.hot);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ---------- adaptive quality ----------
  const perf = { samples: [], slow: 0, since: 0 };
  function degrade() {
    if (level >= LEVELS.length - 1) {
      stop();
      lost = true;
      if (typeof options.onGiveUp === 'function') options.onGiveUp();
      return;
    }
    level++;
    resize();
  }
  function sample(now, raw) {
    if (now - perf.since < 1500 || raw > 250) return;
    perf.samples.push(raw);
    if (perf.samples.length < 90) return;
    perf.samples.sort((a, b) => a - b);
    const median = perf.samples[45];
    perf.samples.length = 0;
    if (median > 30) { if (++perf.slow >= 2) { perf.slow = 0; degrade(); } } else perf.slow = 0;
  }

  // ---------- loop ----------
  let running = false, raf = 0, last = 0, wanted = false, lost = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const raw = now - last;
    const dt = Math.min(raw / 1000, 1 / 30);
    last = now;
    sample(now, raw);
    if (!running) return;
    resize();
    clock += dt;
    render(dt);
  }
  function start() {
    if (running || document.hidden || lost) return;
    running = true;
    last = performance.now();
    perf.since = last;
    perf.samples.length = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function setActive(on) { wanted = !!on; if (wanted) start(); else stop(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (wanted) start(); });
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    stop();
    document.documentElement.classList.add('no-webgl');
  });

  setAccent(accentHex);
  resize();

  return {
    kind: 'dither',
    setActive,
    pointer,
    pointerLeave,
    tap,
    impulse,
    burst,
    breach,
    setScroll,
    setAccent,
    setTheme(t) { light = t === 'light' ? 1 : 0; setAccent(accentHex); },
    // test hook: jump the clock forward and draw one frame
    advance(seconds = 1) { resize(); clock += seconds; render(1 / 60); },
    get running() { return running; },
  };
}
