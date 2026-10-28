// face.js · the demo's target: an AI model drawn as a face made of live code.
//
// A head-and-shoulders profile (a smooth union of ellipses, as a signed
// distance field) is drawn as rows of tiny glyphs that keep re-rolling. It is
// lit like a bust from the field's gradient, and it reacts to the demo:
//   guarded  · quiet, a stray glitch now and then
//   probing  · rows tear sideways, glyphs churn, red flickers in
//   held     · a cool sweep runs down the face and every glyph locks still
//   breach   · the face is blown apart into debris, then slowly reassembles
// Technique after dvklab's "Signal" hero (MIT © 2026 diiviikk5), rebuilt for
// this site. See THIRD_PARTY_NOTICES.md.

import { mountShader, hexToRgb } from './shaderfx.js';

const FS = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPtr;
uniform float uCell;
uniform float uGlitch;
uniform float uShatter;
uniform float uSweep;
uniform float uLock;
uniform vec3 uBg;
uniform vec3 uInk;
uniform vec3 uAccent;
uniform vec3 uHot;
uniform vec3 uOk;

float h21 (vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn (vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm (vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vn(p); p = p * 2.03 + vec2(1.3, 7.1); a *= 0.5; }
  return v;
}
float smin (float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float ell (vec2 p, vec2 c, vec2 r) { vec2 q = (p - c) / r; return (length(q) - 1.0) * min(r.x, r.y); }

// the model in profile, looking left at whoever is attacking it
float head (vec2 p) {
  p.x = -p.x;
  float d = ell(p, vec2(-0.05, 0.2), vec2(0.21, 0.235));          // skull
  d = smin(d, ell(p, vec2(0.075, 0.075), vec2(0.13, 0.195)), 0.06); // face
  d = smin(d, ell(p, vec2(0.198, 0.075), vec2(0.04, 0.028)), 0.028); // nose
  d = smin(d, ell(p, vec2(0.165, -0.035), vec2(0.046, 0.03)), 0.026); // lips
  d = smin(d, ell(p, vec2(0.095, -0.108), vec2(0.1, 0.066)), 0.05); // jaw
  vec2 q = p - vec2(-0.015, -0.225);
  q.x += q.y * 0.32;
  d = smin(d, max(abs(q.x) - 0.095, abs(q.y) - 0.16), 0.06);         // neck
  return smin(d, ell(p, vec2(-0.12, -0.6), vec2(0.5, 0.29)), 0.09);  // shoulders
}

void main () {
  vec2 fc = gl_FragCoord.xy;
  float cw = uCell, ch = uCell * 1.6;
  float row = floor(fc.y / ch);
  // tears: rows jump sideways, more often and further under attack, wildly on a breach
  float tick = floor(uTime * (1.6 + 9.0 * uGlitch + 6.0 * uShatter));
  float odds = 0.05 + 0.45 * uGlitch + 0.5 * uShatter;
  float tear = step(1.0 - odds, h21(vec2(row, tick))) * (h21(vec2(row, tick + 7.0)) - 0.5);
  float shift = tear * (0.05 + 0.18 * uGlitch + 0.6 * uShatter) * uRes.y;
  shift += sin(row * 0.37 + uTime * 0.7) * (1.0 + 2.0 * uGlitch) * (1.0 - uLock);
  vec2 sp = fc + vec2(shift, 0.0);
  vec2 cell = floor(sp / vec2(cw, ch));
  vec2 cf = fract(sp / vec2(cw, ch));
  vec2 p = ((cell + 0.5) * vec2(cw, ch) - uRes * vec2(0.5, 0.47)) / uRes.y;
  p -= (uPtr - 0.5) * vec2(0.035, 0.025);
  // a breach flings cells away to the right, away from the attacker
  float fling = uShatter * (0.12 + 0.7 * h21(cell * 0.71 + 2.0));
  vec2 pw = p - vec2(fling, fling * 0.3 * (h21(cell + 3.1) - 0.5));
  float d = head(pw);
  // the back of the head frays into the wind
  float back = smoothstep(-0.02, 0.3, p.x);
  float erode = (fbm(p * vec2(6.0, 12.0) + vec2(-uTime * 0.9, uTime * 0.1)) - 0.45) * (0.1 * back + 0.35 * uShatter) * (1.0 - 0.8 * uLock);
  float inside = step(d + erode, 0.0);
  float stray = step(0.93 - 0.25 * uShatter, h21(cell + floor(uTime * 4.0))) * smoothstep(0.16 + 0.45 * uShatter, 0.0, d)
    * step(0.0, d) * clamp(back + uShatter, 0.0, 1.0);
  float cover = max(inside, stray * 0.8);
  // the glyph: a 3x5 bitmap that re-rolls, frozen while a guardrail holds
  vec2 g = floor(cf * vec2(4.0, 6.0)) - vec2(0.5);
  float bit = 0.0;
  if (g.x >= 0.0 && g.x < 3.0 && g.y >= 0.0 && g.y < 5.0) {
    float speed = (1.5 + 5.0 * h21(cell) + 8.0 * uGlitch) * (1.0 - uLock);
    float roll = floor(uTime * speed + h21(cell * 1.7) * 9.0);
    bit = step(0.45, h21(cell * 0.93 + g * 7.1 + roll));
  }
  // lit like a bust: a normal from the distance field's gradient
  float e = 0.004;
  vec2 gr = vec2(head(pw + vec2(e, 0.0)) - head(pw - vec2(e, 0.0)), head(pw + vec2(0.0, e)) - head(pw - vec2(0.0, e))) / (2.0 * e);
  float depth = clamp(-d * 7.0, 0.0, 1.0);
  vec3 n = normalize(vec3(gr * (1.0 - depth), 0.35 + depth));
  float lit = clamp(dot(n, normalize(vec3(-0.6, 0.5, 0.65))), 0.0, 1.0) * 0.7 + 0.3;
  float rim = pow(1.0 - clamp(depth * 3.0, 0.0, 1.0), 3.0) * 0.55;
  // mostly warm white, the accent drifting through in bands, red under attack
  float band = fbm(p * vec2(2.4, 4.0) + vec2(0.0, uTime * 0.05));
  vec3 col = mix(uInk, uAccent, smoothstep(0.5, 0.72, band));
  float flick = step(0.6, h21(vec2(row, tick + 3.0)));
  col = mix(col, uHot, clamp(uShatter * 1.2 + uGlitch * 0.35 * flick, 0.0, 1.0));
  // a guardrail holding: a cool sweep runs down the face
  float sy = (fc.y / uRes.y - (1.0 - uSweep)) * 7.0;
  float sweep = uSweep > 0.0 ? exp(-sy * sy) : 0.0;
  col = mix(col, uOk, clamp(sweep + uLock * 0.35, 0.0, 1.0));
  float block = step(0.94, h21(cell + floor(uTime * 2.0))) * lit;
  vec3 c = col * (lit + rim) * max(bit, block) * cover;
  // scanlines and grain on dark glass
  c *= 0.9 + 0.1 * sin(fc.y * 6.2831853 / ch);
  gl_FragColor = vec4(uBg + c + (h21(fc + fract(uTime * 7.0) * 91.0) - 0.5) * 0.02, 1.0);
}`;

const BG = [0.043, 0.035, 0.024];
const INK = [0.93, 0.91, 0.85];
const HOT = [1, 0.25, 0.22];
const OK = [0.55, 1, 0.74];

export function createFace(canvas, { accent = '#ff6a3d', still = false, force = false } = {}) {
  let accentRgb = hexToRgb(accent);
  let glitch = 0.1, target = 0.1, shatter = 0, sweep = 0, lock = 0;
  const ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  const ease = (s) => s * s * (3 - 2 * s);

  const fx = mountShader(canvas, {
    frag: FS, scale: 1, minScale: 0.6, maxDpr: 1.5, still, force,
    onFrame(gl, u, t, dt, W, H) {
      if (!still) {
        glitch += (target - glitch) * Math.min(1, dt * 5);
        shatter = Math.max(0, shatter - dt * 0.32);
        lock = Math.max(0, lock - dt * 0.45);
        if (sweep > 0) { sweep += dt / 1.3; if (sweep >= 1) sweep = 0; }
        ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 3);
        ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 3);
      }
      gl.uniform2f(u.uPtr, ptr.x, ptr.y);
      // glyph size is fixed in CSS pixels, so a lower render scale never changes the look
      const css = Math.max(1, canvas.clientHeight);
      gl.uniform1f(u.uCell, Math.max(2.5, Math.max(3.6, css / 56) * (H / css)));
      gl.uniform1f(u.uGlitch, glitch);
      gl.uniform1f(u.uShatter, ease(shatter));
      gl.uniform1f(u.uSweep, sweep);
      gl.uniform1f(u.uLock, lock);
      gl.uniform3fv(u.uBg, BG);
      gl.uniform3fv(u.uInk, INK);
      gl.uniform3fv(u.uAccent, accentRgb);
      gl.uniform3fv(u.uHot, HOT);
      gl.uniform3fv(u.uOk, OK);
    },
  });
  if (!fx) return null;

  if (!still) {
    window.addEventListener('pointermove', (e) => {
      const b = canvas.getBoundingClientRect();
      if (!b.width || !b.height) return;
      ptr.tx = Math.min(1.5, Math.max(-0.5, (e.clientX - b.left) / b.width));
      ptr.ty = Math.min(1.5, Math.max(-0.5, 1 - (e.clientY - b.top) / b.height));
    }, { passive: true });
  }

  return {
    // guarded | probing | held | breach | leak
    setState(s) {
      if (s === 'probing') target = 0.9;
      else if (s === 'held') { target = 0.06; sweep = 0.001; lock = 1; }
      else if (s === 'breach' || s === 'leak') { target = 0.15; glitch = 1; shatter = 1; }
      else target = 0.1;
      if (still) {
        // one composed frame per state: no motion, same story
        glitch = target;
        shatter = s === 'breach' || s === 'leak' ? 0.45 : 0;
        sweep = s === 'held' ? 0.5 : 0;
        lock = s === 'held' ? 1 : 0;
      }
      fx.wake();
    },
    setAccent(hex) { accentRgb = hexToRgb(hex, accentRgb); if (!fx.running) fx.redraw(); },
    advance: (s) => fx.advance(s),
    get running() { return fx.running; },
  };
}
