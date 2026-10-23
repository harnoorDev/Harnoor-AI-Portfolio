// swarm.js · GPU particle swarm backdrop (WebGL2).
//
// Every particle's position and velocity live in float textures. One
// full-screen pass per frame (two render targets) integrates a spring toward
// the current section's shape, a divergence-free ABC flow field for
// turbulence, cursor repulsion and burst impulses. One draw call renders the
// particles as soft points with a depth-of-field size: additive glow on the
// dark theme, ink dots on the light theme. Each page section has its own
// target shape and scrolling morphs between them.

const TAU = Math.PI * 2;

const QUAD_VS = `#version 300 es
layout(location = 0) in vec2 aPos;
void main () { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const SIM_FS = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform sampler2D uTA;
uniform sampler2D uTB;
uniform sampler2D uFA;
uniform sampler2D uFB;
uniform vec4 uOffA;
uniform vec4 uOffB;
uniform mat3 uRotA;
uniform mat3 uRotB;
uniform float uModeA;
uniform float uModeB;
uniform float uMix;
uniform float uTime;
uniform float uDt;
uniform float uFlow;
uniform float uSpring;
uniform float uDamp;
uniform float uKick;
uniform vec4 uPtr;
uniform vec2 uPtrVel;
uniform float uAspect;
uniform mat4 uViewProj;
uniform vec4 uBurst;
layout(location = 0) out vec4 oPos;
layout(location = 1) out vec4 oVel;

// mode 0 static · 1 rolling swell · 2 rigid spin · 3 packets streaming along edges
vec3 shape (sampler2D T, sampler2D F, vec4 off, mat3 rot, float mode, ivec2 c, out float wrapped) {
  vec4 t = texelFetch(T, c, 0);
  vec3 q = t.xyz;
  wrapped = 0.0;
  if (mode > 2.5) {
    vec4 f = texelFetch(F, c, 0);
    if (f.w > 0.0) {
      float ph = fract(uTime * f.w + t.w);
      wrapped = step(ph, fract((uTime - uDt) * f.w + t.w));
      q += f.xyz * ph;
    }
  } else if (mode > 1.5) {
    float a = uTime * 0.22;
    float s = sin(a), co = cos(a);
    q.xz = mat2(co, -s, s, co) * q.xz;
  } else if (mode > 0.5) {
    q.y += 0.07 * sin(q.x * 2.6 + uTime * 0.7) + 0.045 * sin(q.z * 3.7 - uTime * 0.55);
  }
  return off.xyz + rot * (q * off.w);
}

// Arnold-Beltrami-Childress flow: each component ignores its own axis, so the
// field is exactly divergence-free (particles swirl, never bunch up). Two
// octaves with drifting phases keep it from settling into a pattern.
vec3 flow (vec3 p, float t) {
  vec3 a = vec3(sin(p.z * 1.7 + t * 0.31) + cos(p.y * 1.3 - t * 0.23),
                sin(p.x * 1.5 - t * 0.27) + cos(p.z * 1.1 + t * 0.19),
                sin(p.y * 1.9 + t * 0.21) + cos(p.x * 1.4 - t * 0.29));
  vec3 q = p * 3.1 + 4.1;
  vec3 b = vec3(sin(q.z + t * 0.6) + cos(q.y - t * 0.4),
                sin(q.x - t * 0.5) + cos(q.z + t * 0.3),
                sin(q.y + t * 0.4) + cos(q.x - t * 0.5));
  return a + 0.5 * b;
}

void main () {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 P = texelFetch(uPos, c, 0);
  vec3 p = P.xyz;
  vec3 v = texelFetch(uVel, c, 0).xyz;
  float seed = P.w;
  float h1 = fract(seed * 7.131), h2 = fract(seed * 3.917), h3 = fract(seed * 13.73);

  float wa, wb;
  vec3 ta = shape(uTA, uFA, uOffA, uRotA, uModeA, c, wa);
  vec3 tb = shape(uTB, uFB, uOffB, uRotB, uModeB, c, wb);
  // staggered morph: every particle crosses over at its own moment
  float m = smoothstep(seed * 0.45, seed * 0.45 + 0.55, uMix);
  vec3 target = mix(ta, tb, m);
  // a packet that just wrapped re-enters at its source node instead of flying back
  if ((m < 0.5 ? wa : wb) > 0.5) { p = target; v = vec3(0.0); }

  vec3 acc = (target - p) * uSpring * (0.55 + 0.9 * h1);
  acc += flow(p, uTime) * uFlow * (0.5 + h2);
  acc.y += uKick * (0.5 + h3);

  // cursor: carve a soft hole with a little swirl, and drag particles along
  vec4 clip = uViewProj * vec4(p, 1.0);
  vec2 ndc = clip.xy / max(clip.w, 0.05);
  vec2 dd = ndc - uPtr.xy;
  dd.x *= uAspect;
  float r2 = dot(dd, dd);
  float fall = exp(-r2 / (uPtr.z * uPtr.z));
  vec2 dir = dd * inversesqrt(r2 + 1e-6);
  acc.xy += (dir + vec2(-dir.y, dir.x) * 0.45) * uPtr.w * fall + uPtrVel * fall * 2.5;

  if (uBurst.w > 0.0) {
    vec3 d = p - uBurst.xyz;
    float l = length(d) + 0.001;
    v += (d / l) * uBurst.w * (0.35 + 1.3 * h3) / (0.5 + l);
  }

  v = v * exp(-uDamp * uDt) + acc * uDt;
  p += v * uDt;
  oPos = vec4(p, seed);
  oVel = vec4(v, 0.0);
}`;

const DRAW_VS = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
layout(location = 0) in float aIndex;
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform mat4 uViewProj;
uniform int uSide;
uniform float uSize;
uniform float uDpr;
uniform float uFocus;
uniform float uDof;
uniform float uIntensity;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uHot;
out vec3 vCol;
out float vAlpha;
void main () {
  int id = int(aIndex);
  ivec2 c = ivec2(id % uSide, id / uSide);
  vec4 P = texelFetch(uPos, c, 0);
  vec3 vel = texelFetch(uVel, c, 0).xyz;
  vec4 clip = uViewProj * vec4(P.xyz, 1.0);
  gl_Position = clip;
  float w = max(clip.w, 0.2);
  float s = P.w;
  float size = uSize * (0.6 + 1.1 * s * s * s) * (4.0 / w);
  float coc = min(abs(w - uFocus) * uDof, 10.0);
  float total = size + coc;
  gl_PointSize = total * uDpr;
  vec3 base = mix(uColA, uColB, step(0.72, fract(s * 9.17)));
  vCol = mix(base, uHot, smoothstep(0.6, 2.4, length(vel)) * 0.85);
  // defocused particles spread the same light over a bigger disc
  vAlpha = uIntensity * (0.45 + 0.55 * fract(s * 5.31)) * pow(size / total, 1.3);
}`;

const DRAW_FS = `#version 300 es
precision highp float;
in vec3 vCol;
in float vAlpha;
uniform float uLight;
out vec4 oColor;
void main () {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float a = 1.0 - r2;
  a = a * a * vAlpha;
  if (uLight > 0.5) oColor = vec4(vCol * a, a);
  else oColor = vec4(vCol * a, max(vCol.r, max(vCol.g, vCol.b)) * a);
}`;

const FADE_FS = `#version 300 es
precision mediump float;
out vec4 o;
void main () { o = vec4(0.0); }`;

const COPY_FS = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uTex;
out vec4 o;
void main () { o = texelFetch(uTex, ivec2(gl_FragCoord.xy), 0); }`;

// ---------- small maths ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r) {
  const u = Math.max(r(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r());
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

// column-major 3x3 rotations
function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; }
function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; }
function rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; }
function mul3(A, B) {
  const o = new Array(9);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = A[r] * B[c * 3] + A[3 + r] * B[c * 3 + 1] + A[6 + r] * B[c * 3 + 2];
  return o;
}

function hexToRgb(hex) {
  const h = String(hex).replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return [1, 0.42, 0.24];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h /= 6; if (h < 0) h += 1;
  }
  return [h, max ? d / max : 0, max];
}
function hsvToRgb(h, s, v) {
  h = ((h % 1) + 1) % 1;
  const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p]; case 1: return [q, v, p]; case 2: return [p, v, t];
    case 3: return [p, q, v]; case 4: return [t, p, v]; default: return [v, p, q];
  }
}

// ---------- target shapes (model space, roughly a unit sphere) ----------
// Each fills n points in random order, so any prefix is a fair subsample
// (the quality governor draws fewer particles by drawing a prefix).
function put(out, i, x, y, z, w = 0) { const j = i * 4; out[j] = x; out[j + 1] = y; out[j + 2] = z; out[j + 3] = w; }

// hero · "the model": a globe of latitude rings and meridians, a hot core, an orbit
function genCore(n, r) {
  const out = new Float32Array(n * 4);
  const ct = Math.cos(0.42), st = Math.sin(0.42);
  for (let i = 0; i < n; i++) {
    const k = r();
    if (k < 0.46) {
      const u = r() * 2 - 1, th = r() * TAU, s = Math.sqrt(1 - u * u), rad = 1 + gauss(r) * 0.014;
      put(out, i, s * Math.cos(th) * rad, u * rad, s * Math.sin(th) * rad);
    } else if (k < 0.7) {
      const band = 1 + Math.floor(r() * 13), lat = -Math.PI / 2 + (band * Math.PI) / 14, th = r() * TAU, cl = Math.cos(lat);
      put(out, i, cl * Math.cos(th), Math.sin(lat), cl * Math.sin(th));
    } else if (k < 0.8) {
      const ph = (Math.floor(r() * 8) * Math.PI) / 8, t = r() * TAU;
      put(out, i, Math.cos(t) * Math.cos(ph), Math.sin(t), Math.cos(t) * Math.sin(ph));
    } else if (k < 0.9) {
      put(out, i, gauss(r) * 0.17, gauss(r) * 0.17, gauss(r) * 0.17);
    } else {
      const th = r() * TAU, rad = 1.45 + gauss(r) * 0.018, cx = Math.cos(th) * rad, cz = Math.sin(th) * rad;
      put(out, i, cx, cz * st + gauss(r) * 0.006, cz * ct);
    }
  }
  return { pos: out };
}

// live demo · a perimeter: torus, dashed scanner ring, fine inner ring, ticks
function genRing(n, r) {
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const k = r();
    if (k < 0.5) {
      const th = r() * TAU, ph = r() * TAU, a = 0.05, R = 1 + a * Math.cos(ph);
      put(out, i, R * Math.cos(th), a * Math.sin(ph), R * Math.sin(th));
    } else if (k < 0.74) {
      let th = r() * TAU;
      for (let g = 0; g < 8 && Math.sin(th * 22) < 0.1; g++) th = r() * TAU;
      const R = 1.24 + gauss(r) * 0.005;
      put(out, i, R * Math.cos(th), gauss(r) * 0.005, R * Math.sin(th));
    } else if (k < 0.88) {
      const th = r() * TAU, R = 0.86 + gauss(r) * 0.004;
      put(out, i, R * Math.cos(th), gauss(r) * 0.004, R * Math.sin(th));
    } else {
      const m = Math.floor(r() * 96), th = (m * TAU) / 96, R = 1.07 + r() * (m % 4 === 0 ? 0.12 : 0.05);
      put(out, i, R * Math.cos(th), 0, R * Math.sin(th));
    }
  }
  return { pos: out };
}

// signals · "what I've broken": a field of glass shards, filled and outlined
function genShards(n, r) {
  const out = new Float32Array(n * 4);
  const shards = [];
  let total = 0;
  for (let s = 0; s < 76; s++) {
    const c = [(r() * 2 - 1) * 1.75, (r() * 2 - 1) * 1.0, (r() * 2 - 1) * 0.9 - 0.15];
    const size = 0.06 + Math.pow(r(), 2.2) * 0.34;
    const nz = r() * 2 - 1, nth = r() * TAU, ns = Math.sqrt(1 - nz * nz);
    const nrm = [ns * Math.cos(nth), ns * Math.sin(nth), nz];
    const t1 = unit(cross(nrm, Math.abs(nrm[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
    const t2 = cross(nrm, t1);
    const v = [];
    for (let j = 0; j < 3; j++) {
      const a = (j * TAU) / 3 + (r() - 0.5) * 1.3, d = size * (0.55 + r() * 0.7), ca = Math.cos(a) * d, sa = Math.sin(a) * d;
      v.push([c[0] + t1[0] * ca + t2[0] * sa, c[1] + t1[1] * ca + t2[1] * sa, c[2] + t1[2] * ca + t2[2] * sa]);
    }
    total += 0.5 * len(cross(sub(v[1], v[0]), sub(v[2], v[0])));
    shards.push({ v, cum: total });
  }
  for (let i = 0; i < n; i++) {
    const x = r() * total;
    let lo = 0, hi = shards.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (shards[mid].cum < x) lo = mid + 1; else hi = mid; }
    const [a, b, c] = shards[lo].v;
    if (r() < 0.7) {
      let u = r(), w = r();
      if (u + w > 1) { u = 1 - u; w = 1 - w; }
      put(out, i, a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * w, a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * w, a[2] + (b[2] - a[2]) * u + (c[2] - a[2]) * w);
    } else {
      const e = Math.floor(r() * 3), p = shards[lo].v[e], q = shards[lo].v[(e + 1) % 3], t = r();
      put(out, i, p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t);
    }
  }
  return { pos: out };
}

// work · systems: a node graph with data packets streaming along the edges
function genNetwork(n, r) {
  const nodes = [];
  for (let tries = 0; nodes.length < 44 && tries < 6000; tries++) {
    const p = [(r() * 2 - 1) * 1.6, (r() * 2 - 1) * 0.95, (r() * 2 - 1) * 0.8];
    if ((p[0] / 1.6) ** 2 + (p[1] / 0.95) ** 2 + (p[2] / 0.8) ** 2 > 1) continue;
    if (nodes.some((q) => dist2(p, q) < 0.04)) continue;
    nodes.push(p);
  }
  const edges = [], seen = new Set();
  nodes.forEach((p, i) => {
    const near = nodes.map((q, j) => [dist2(p, q), j]).filter((e) => e[1] !== i).sort((a, b) => a[0] - b[0]).slice(0, 3);
    for (const [, j] of near) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) { seen.add(key); edges.push([i, j]); }
    }
  });
  const out = new Float32Array(n * 4), flow = new Float32Array(n * 4);
  const PACKETS = 3;
  for (let i = 0; i < n; i++) {
    const k = r();
    if (k < 0.22) {
      const hub = r() < 0.25 ? Math.floor(r() * 6) : Math.floor(r() * nodes.length);
      const p = nodes[hub], sg = hub < 6 ? 0.05 : 0.026;
      put(out, i, p[0] + gauss(r) * sg, p[1] + gauss(r) * sg, p[2] + gauss(r) * sg);
    } else if (k < 0.74) {
      const e = edges[Math.floor(r() * edges.length)], a = nodes[e[0]], b = nodes[e[1]], t = r();
      put(out, i, a[0] + (b[0] - a[0]) * t + gauss(r) * 0.0035, a[1] + (b[1] - a[1]) * t + gauss(r) * 0.0035, a[2] + (b[2] - a[2]) * t + gauss(r) * 0.0035);
    } else {
      const ei = Math.floor(r() * edges.length), e = edges[ei], pk = Math.floor(r() * PACKETS);
      const fwd = (ei + pk) % 2 === 0;
      const a = nodes[fwd ? e[0] : e[1]], b = nodes[fwd ? e[1] : e[0]];
      const speed = 0.16 + ((ei * 7 + pk * 3) % 10) * 0.025;
      const phase = ((ei * 0.618 + pk / PACKETS) % 1) + r() * 0.012;
      put(out, i, a[0] + gauss(r) * 0.01, a[1] + gauss(r) * 0.01, a[2] + gauss(r) * 0.01, phase);
      put(flow, i, b[0] - a[0], b[1] - a[1], b[2] - a[2], speed);
    }
  }
  return { pos: out, flow };
}

// experience · trajectory: a double helix with rungs and a dust sheath
function genHelix(n, r) {
  const out = new Float32Array(n * 4);
  const L = 2.7, R = 0.36, turns = 3.1, RUNGS = 36;
  for (let i = 0; i < n; i++) {
    const k = r();
    if (k < 0.6) {
      const s = r(), a = s * turns * TAU + (r() < 0.5 ? 0 : Math.PI);
      put(out, i, R * Math.cos(a) + gauss(r) * 0.017, (s - 0.5) * L + gauss(r) * 0.01, R * Math.sin(a) + gauss(r) * 0.017);
    } else if (k < 0.86) {
      const s = (Math.floor(r() * RUNGS) + 0.5) / RUNGS, a = s * turns * TAU, t = r() * 2 - 1;
      put(out, i, R * t * Math.cos(a), (s - 0.5) * L + gauss(r) * 0.003, R * t * Math.sin(a));
    } else {
      const a = r() * TAU, rad = 0.55 + Math.abs(gauss(r)) * 0.35;
      put(out, i, rad * Math.cos(a), (r() - 0.5) * L * 1.1, rad * Math.sin(a));
    }
  }
  return { pos: out };
}

// stack + credentials · infrastructure: a wireframe terrain with a rolling swell
function genTerrain(n, r) {
  const out = new Float32Array(n * 4);
  const X = 2.3, Z0 = -2.6, Z1 = 1.1, SZ = 0.17, SX = 0.2;
  const rowsZ = Math.floor((Z1 - Z0) / SZ) + 1, colsX = Math.floor((2 * X) / SX) + 1;
  const h = (x, z) => 0.17 * Math.sin(x * 1.25 + z * 0.65) + 0.1 * Math.sin(z * 2.05 - x * 0.45 + 1.7) + 0.05 * Math.sin(x * 3.6 + z * 1.4);
  for (let i = 0; i < n; i++) {
    const k = r();
    let x, z, lift = 0;
    if (k < 0.5) { z = Z0 + Math.floor(r() * rowsZ) * SZ; x = (r() * 2 - 1) * X; }
    else if (k < 0.92) { x = -X + Math.floor(r() * colsX) * SX; z = Z0 + r() * (Z1 - Z0); }
    else { x = (r() * 2 - 1) * X; z = Z0 + r() * (Z1 - Z0); lift = 0.1 + r() * 0.5; }
    put(out, i, x, h(x, z) + lift, z);
  }
  return { pos: out };
}

// contact · open channel: a three-armed spiral disc around a hot core
function genVortex(n, r) {
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const k = r();
    if (k < 0.16) {
      put(out, i, gauss(r) * 0.065, gauss(r) * 0.04, gauss(r) * 0.065);
    } else if (k < 0.88) {
      const rr = 0.12 + Math.pow(r(), 0.8) * 1.3, arm = Math.floor(r() * 3);
      const th = (arm * TAU) / 3 + rr * 2.8 + gauss(r) * 0.2 * (0.35 + rr);
      put(out, i, rr * Math.cos(th), gauss(r) * 0.02 * (1.3 - 0.6 * rr), rr * Math.sin(th));
    } else {
      const th = r() * TAU, rr = 1.5 + gauss(r) * 0.025;
      put(out, i, rr * Math.cos(th), gauss(r) * 0.008, rr * Math.sin(th));
    }
  }
  return { pos: out };
}

// One scene per page section, in page order. Layout: [x, y, scale] with x in
// half-widths, y in half-heights and scale in min(half-width, half-height).
// calm scales the turbulence: structured shapes stay crisp, debris drifts.
const SCENES = [
  { gen: genCore, mode: 0, spin: 0.1, pitch: 0.18, roll: -0.12, glow: 1.0, calm: 0.5, wide: [0.46, 0.04, 0.72], narrow: [0.1, 0.52, 0.74] },
  { gen: genRing, mode: 0, spin: 0.07, pitch: 0.42, roll: 0.06, glow: 0.8, calm: 0.55, wide: [0, -0.02, 1.5], narrow: [0, 0.04, 1.25] },
  { gen: genShards, mode: 0, spin: 0.025, pitch: 0.1, roll: 0, glow: 0.55, calm: 1.0, wide: [0.05, 0, 1.0], narrow: [0, 0, 1.0] },
  { gen: genNetwork, mode: 3, spin: 0.035, pitch: 0.12, roll: 0, glow: 0.78, calm: 0.7, wide: [0.08, 0, 1.0], narrow: [0, 0, 1.0] },
  { gen: genHelix, mode: 0, spin: 0.24, pitch: 0, roll: -0.62, glow: 0.72, calm: 0.55, wide: [0.5, 0, 0.82], narrow: [0.2, 0, 0.9] },
  { gen: genTerrain, mode: 1, spin: 0, pitch: 0.3, roll: 0, glow: 0.52, calm: 0.6, wide: [0, -0.62, 1.0], narrow: [0, -0.5, 1.0] },
  { gen: genVortex, mode: 2, spin: 0, pitch: 1.0, roll: -0.25, glow: 0.88, calm: 1.0, wide: [0, -0.05, 1.05], narrow: [0, 0.2, 1.0] },
];

const FOV = (35 * Math.PI) / 180;
const CAM_Z = 4;

export function createSwarm(canvas, options = {}) {
  const small = window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
  const gl = canvas.getContext('webgl2', {
    alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
    preserveDrawingBuffer: false, powerPreference: 'high-performance',
  });
  if (!gl) return null;
  if (!gl.getExtension('EXT_color_buffer_float')) return null;
  const renderer = (() => {
    try {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      return String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    } catch { return ''; }
  })();
  if (!options.force && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) return null;

  const SIDE = Math.min(options.side || (small ? 176 : 288), gl.getParameter(gl.MAX_TEXTURE_SIZE));
  const COUNT = SIDE * SIDE;
  const cfg = {
    size: small ? 1.8 : 1.7,
    // phones: text sits on top of the shapes, so keep them quieter
    glow: small ? 0.72 : 1,
    dof: small ? 1.6 : 2.4,
    spring: 6.5,
    damp: 2.4,
    flow: 0.32,
    dprCap: small ? 1.25 : 1.5,
    trails: !small,
    fade: 0.8,
  };

  // ---------- programs ----------
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader compile failed');
    return s;
  }
  function program(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link failed');
    const u = {};
    const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(p, i).name;
      u[name] = gl.getUniformLocation(p, name);
    }
    return { u, use: () => gl.useProgram(p) };
  }
  let P;
  try {
    P = {
      sim: program(QUAD_VS, SIM_FS),
      draw: program(DRAW_VS, DRAW_FS),
      fade: program(QUAD_VS, FADE_FS),
      copy: program(QUAD_VS, COPY_FS),
    };
  } catch (err) {
    console.warn('[swarm] disabled:', err.message);
    return null;
  }

  // ---------- geometry ----------
  const quadVao = gl.createVertexArray();
  gl.bindVertexArray(quadVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const pointVao = gl.createVertexArray();
  gl.bindVertexArray(pointVao);
  const ids = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) ids[i] = i;
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, ids, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // ---------- textures ----------
  function texture(w, h, internal, format, type, data) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data || null);
    return t;
  }
  const floatTex = (data) => texture(SIDE, SIDE, gl.RGBA32F, gl.RGBA, gl.FLOAT, data);

  const rng = mulberry32(0x5eed);
  const initPos = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    const u = rng() * 2 - 1, th = rng() * TAU, s = Math.sqrt(1 - u * u), rad = 2.2 + rng() * 3;
    put(initPos, i, s * Math.cos(th) * rad, u * rad, s * Math.sin(th) * rad - 1.5, rng());
  }
  function statePair(pos, vel) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pos, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, vel, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return ok ? { pos, vel, fb } : null;
  }
  let read = statePair(floatTex(initPos), floatTex(new Float32Array(COUNT * 4)));
  let write = statePair(floatTex(initPos), floatTex(new Float32Array(COUNT * 4)));
  if (!read || !write) return null;

  const dummy = texture(1, 1, gl.RGBA32F, gl.RGBA, gl.FLOAT, new Float32Array(4));
  const targets = new Array(SCENES.length).fill(null);
  function ensureScene(i) {
    if (targets[i]) return targets[i];
    const { pos, flow } = SCENES[i].gen(COUNT, mulberry32(0x9e37 + i * 7919));
    targets[i] = { pos: floatTex(pos), flow: flow ? floatTex(flow) : dummy };
    return targets[i];
  }
  ensureScene(0);
  // build the remaining shapes in idle time so first paint isn't blocked
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));
  let pending = 1;
  const buildNext = () => {
    if (pending >= SCENES.length) return;
    ensureScene(pending++);
    idle(buildNext);
  };
  idle(buildNext);

  // trails: a half-float buffer faded each frame (energy-correct motion blur)
  let trail = null;
  function makeTrail(w, h) {
    if (trail) { gl.deleteFramebuffer(trail.fb); gl.deleteTexture(trail.tex); trail = null; }
    if (!cfg.trails) return;
    const tex = texture(w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    if (ok) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (ok) trail = { tex, fb, w, h };
    else { gl.deleteFramebuffer(fb); gl.deleteTexture(tex); cfg.trails = false; }
  }

  // ---------- camera + layout ----------
  const viewProj = new Float32Array(16);
  let aspect = 1, halfH = Math.tan(FOV / 2) * CAM_Z, halfW = halfH;
  function updateCamera() {
    aspect = canvas.width / Math.max(1, canvas.height);
    halfW = halfH * aspect;
    const f = 1 / Math.tan(FOV / 2), near = 0.1, far = 60, nf = 1 / (near - far);
    viewProj.set([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, -CAM_Z * (far + near) * nf + 2 * far * near * nf, CAM_Z]);
  }
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.dprCap);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width === w && canvas.height === h && (trail || !cfg.trails)) return;
    canvas.width = w; canvas.height = h;
    updateCamera();
    makeTrail(w, h);
  }
  function placement(i, drift) {
    const L = aspect >= 1.05 ? SCENES[i].wide : SCENES[i].narrow;
    const unitSize = Math.min(halfW, halfH);
    return [L[0] * halfW, L[1] * halfH + drift * halfH, 0, L[2] * unitSize];
  }
  function rotation(i, t, tilt) {
    const S = SCENES[i];
    const own = mul3(rotZ(S.roll), mul3(rotX(S.pitch), rotY(S.spin * t)));
    return new Float32Array(mul3(mul3(rotY(tilt.yaw), rotX(tilt.pitch)), own));
  }

  // ---------- colour ----------
  const col = { a: [1, 0.42, 0.24], b: [1, 0.7, 0.3], hot: [1, 0.92, 0.8], alarm: [1, 0.23, 0.23] };
  let light = 0;
  let accentHex = options.accent || '#ff6a3d';
  function setAccent(hex) {
    accentHex = hex || accentHex;
    const [h, s] = rgbToHsv(...hexToRgb(accentHex));
    const sat = Math.max(0.55, Math.min(1, s));
    if (light) {
      col.a = hsvToRgb(h, sat, 0.62);
      col.b = hsvToRgb(h - 0.02, sat * 0.35, 0.26);
      col.hot = hsvToRgb(h, sat, 0.9);
      col.alarm = [0.78, 0.1, 0.1];
    } else {
      col.a = hsvToRgb(h, sat, 1);
      col.b = hsvToRgb(h + 0.07, sat * 0.85, 1);
      col.hot = hsvToRgb(h + 0.1, 0.22, 1);
      col.alarm = [1, 0.23, 0.23];
    }
  }

  // ---------- input + scroll ----------
  const ptr = { x: 0, y: 0, tx: 0, ty: 0, on: 0, onTarget: 0, vx: 0, vy: 0 };
  function pointer(clientX, clientY) {
    ptr.tx = (clientX / Math.max(1, canvas.clientWidth)) * 2 - 1;
    ptr.ty = 1 - (clientY / Math.max(1, canvas.clientHeight)) * 2;
    ptr.onTarget = 1;
  }
  function pointerLeave() { ptr.onTarget = 0; }
  const scroll = { scene: 0, local: 0 };
  function setScroll(s) {
    if (!s) return;
    scroll.scene = Math.max(0, Math.min(SCENES.length - 1, s.scene || 0));
    scroll.local = Math.max(0, Math.min(1, s.local || 0));
  }
  let kick = 0, agitation = 0, burstPending = 0, alarm = 0;
  function impulse(v) {
    if (!running || !v) return;
    kick = Math.max(-1.6, Math.min(1.6, kick + v * 0.012));
    agitation = Math.min(2.4, Math.max(agitation, Math.abs(v) / 28));
  }
  function burst(n = 2) { burstPending = Math.max(burstPending, 0.9 * n); }
  function breach() { burst(3.4); agitation = 2.4; alarm = 1; }
  // a click blows a local crater in the swarm
  let tapAt = null;
  function tap(clientX, clientY) {
    const nx = (clientX / Math.max(1, canvas.clientWidth)) * 2 - 1;
    const ny = 1 - (clientY / Math.max(1, canvas.clientHeight)) * 2;
    tapAt = [nx * halfW, ny * halfH, 0];
    burstPending = Math.max(burstPending, 1.4);
  }

  // ---------- frame ----------
  let rows = SIDE;
  const tilt = { yaw: 0, pitch: 0 };
  function step(dt, t) {
    const A = Math.floor(scroll.scene), B = Math.min(SCENES.length - 1, A + 1), m = scroll.scene - A;
    const tA = ensureScene(A), tB = ensureScene(B);

    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 12);
    ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 12);
    ptr.on += (ptr.onTarget - ptr.on) * Math.min(1, dt * 4);
    ptr.vx = ((ptr.tx - ptr.x) / Math.max(dt, 1e-3)) * 0.08 * aspect;
    ptr.vy = ((ptr.ty - ptr.y) / Math.max(dt, 1e-3)) * 0.08;
    tilt.yaw += (ptr.x * 0.16 * ptr.on - tilt.yaw) * Math.min(1, dt * 2);
    tilt.pitch += (-ptr.y * 0.08 * ptr.on - tilt.pitch) * Math.min(1, dt * 2);
    kick *= Math.exp(-dt * 3.5);
    agitation *= Math.exp(-dt * 1.6);

    const offA = placement(A, (scroll.local - 0.5) * 0.24);
    const offB = placement(B, -0.12);
    const burstAt = tapAt || [offA[0] + (offB[0] - offA[0]) * m, offA[1] + (offB[1] - offA[1]) * m, 0];
    tapAt = null;

    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb);
    gl.viewport(0, 0, SIDE, rows);
    gl.disable(gl.BLEND);
    P.sim.use();
    const u = P.sim.u;
    const bind = (unitId, tex, loc) => { gl.activeTexture(gl.TEXTURE0 + unitId); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(loc, unitId); };
    bind(0, read.pos, u.uPos);
    bind(1, read.vel, u.uVel);
    bind(2, tA.pos, u.uTA);
    bind(3, tB.pos, u.uTB);
    bind(4, tA.flow, u.uFA);
    bind(5, tB.flow, u.uFB);
    gl.uniform4fv(u.uOffA, offA);
    gl.uniform4fv(u.uOffB, offB);
    gl.uniformMatrix3fv(u.uRotA, false, rotation(A, t, tilt));
    gl.uniformMatrix3fv(u.uRotB, false, rotation(B, t, tilt));
    gl.uniform1f(u.uModeA, SCENES[A].mode);
    gl.uniform1f(u.uModeB, SCENES[B].mode);
    gl.uniform1f(u.uMix, m);
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uDt, dt);
    const calm = SCENES[A].calm + (SCENES[B].calm - SCENES[A].calm) * m;
    gl.uniform1f(u.uFlow, cfg.flow * calm * (1 + agitation * 2.2 / calm));
    gl.uniform1f(u.uSpring, cfg.spring);
    gl.uniform1f(u.uDamp, cfg.damp);
    gl.uniform1f(u.uKick, kick);
    gl.uniform4f(u.uPtr, ptr.x, ptr.y, 0.17, 2.6 * ptr.on);
    gl.uniform2f(u.uPtrVel, ptr.vx * ptr.on, ptr.vy * ptr.on);
    gl.uniform1f(u.uAspect, aspect);
    gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
    gl.uniform4f(u.uBurst, burstAt[0], burstAt[1], burstAt[2], burstPending);
    burstPending = 0;
    gl.bindVertexArray(quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const tmp = read; read = write; write = tmp;
  }

  function render(dt, direct = false) {
    const A = Math.floor(scroll.scene), B = Math.min(SCENES.length - 1, A + 1), m = scroll.scene - A;
    const glow = SCENES[A].glow + (SCENES[B].glow - SCENES[A].glow) * m;
    const fade = Math.pow(cfg.fade, dt * 60);
    const useTrail = cfg.trails && trail && !direct;
    alarm *= Math.exp(-dt * 1.4);
    const mixc = (c) => [c[0] + (col.alarm[0] - c[0]) * alarm, c[1] + (col.alarm[1] - c[1]) * alarm, c[2] + (col.alarm[2] - c[2]) * alarm];

    gl.bindFramebuffer(gl.FRAMEBUFFER, useTrail ? trail.fb : null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindVertexArray(quadVao);
    if (useTrail) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ZERO, gl.CONSTANT_ALPHA);
      gl.blendColor(0, 0, 0, fade);
      P.fade.use();
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    gl.enable(gl.BLEND);
    if (light) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); else gl.blendFunc(gl.ONE, gl.ONE);
    P.draw.use();
    const u = P.draw.u;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, read.pos); gl.uniform1i(u.uPos, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, read.vel); gl.uniform1i(u.uVel, 1);
    gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
    gl.uniform1i(u.uSide, SIDE);
    gl.uniform1f(u.uSize, cfg.size * Math.sqrt(SIDE / Math.max(1, rows)));
    gl.uniform1f(u.uDpr, canvas.width / Math.max(1, canvas.clientWidth));
    gl.uniform1f(u.uFocus, CAM_Z);
    gl.uniform1f(u.uDof, cfg.dof);
    gl.uniform1f(u.uIntensity, glow * cfg.glow * (light ? 0.8 : 1) * (useTrail ? 1 - fade : 1));
    gl.uniform3fv(u.uColA, mixc(col.a));
    gl.uniform3fv(u.uColB, mixc(col.b));
    gl.uniform3fv(u.uHot, col.hot);
    gl.uniform1f(u.uLight, light);
    gl.bindVertexArray(pointVao);
    gl.drawArrays(gl.POINTS, 0, rows * SIDE);

    if (useTrail) {
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      P.copy.use();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, trail.tex); gl.uniform1i(P.copy.u.uTex, 0);
      gl.bindVertexArray(quadVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindVertexArray(null);
  }

  // ---------- adaptive quality ----------
  // Median frame time over ~90 frames; two slow windows in a row → step down.
  // Below the last level the swarm switches itself off and onGiveUp() runs.
  const LEVELS = [
    { rows: SIDE, dpr: cfg.dprCap, trails: cfg.trails },
    { rows: Math.round(SIDE * 0.62), dpr: 1, trails: false },
    { rows: Math.round(SIDE * 0.38), dpr: 0.8, trails: false },
  ];
  const perf = { samples: [], level: 0, slow: 0, since: 0 };
  function degrade() {
    if (perf.level >= LEVELS.length - 1) {
      stop();
      lost = true;
      if (typeof options.onGiveUp === 'function') options.onGiveUp();
      return;
    }
    const L = LEVELS[++perf.level];
    rows = L.rows; cfg.dprCap = L.dpr; cfg.trails = L.trails;
    makeTrail(canvas.width, canvas.height);
    resizeCanvas();
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
  let running = false, raf = 0, last = 0, wanted = false, lost = false, clock = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const raw = now - last;
    const dt = Math.min(raw / 1000, 1 / 30);
    last = now;
    sample(now, raw);
    if (!running) return;
    resizeCanvas();
    clock += dt;
    step(dt, clock);
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
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  function setActive(on) {
    wanted = !!on;
    if (wanted) start(); else stop();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else if (wanted) start();
  });
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    stop();
    document.documentElement.classList.add('no-webgl');
  });

  // ---------- boot ----------
  setAccent(accentHex);
  resizeCanvas();
  updateCamera();

  // test hook: n simulation steps at 60fps timing, then one frame drawn
  // straight to the canvas (no trail, so one frame shows full brightness)
  function advance(n) {
    resizeCanvas();
    for (let i = 0; i < n; i++) { clock += 1 / 60; step(1 / 60, clock); }
    render(1 / 60, true);
  }

  return {
    kind: 'swarm',
    setActive,
    pointer,
    pointerLeave,
    tap,
    impulse,
    burst,
    breach,
    setScroll,
    advance,
    setAccent,
    setTheme(t) { light = t === 'light' ? 1 : 0; setAccent(accentHex); if (trail) makeTrail(canvas.width, canvas.height); },
    get running() { return running; },
  };
}
