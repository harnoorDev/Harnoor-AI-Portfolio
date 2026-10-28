// ember.js · fire seen through fluted glass, shown only inside the letters of
// the closing "Harnoor." wordmark.
//
// Behind the glass: a long, low fire along the bottom of the band, tongues of
// fbm flame licking upward, its hottest stretch drifting toward the cursor.
// In front: vertical ribs of uneven width, each a small cylinder lens that
// squeezes and mirrors a wide slice of the fire, so the flames become molten
// bars. The canvas sits over the wordmark with mix-blend-mode (darken on the
// dark theme, lighten on the light one) and never drops below a floor colour,
// so the page around the letters is untouched and only the letters burn.
// Technique after dvklab's "Furnace" hero (MIT © 2026 diiviikk5), rebuilt for
// this site. See THIRD_PARTY_NOTICES.md.

import { mountShader, hexToRgb } from './shaderfx.js';

const FS = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPtr;
uniform vec3 uFloor;
uniform vec3 uCeil;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uC4;

float h11 (float p) { return fract(sin(p * 127.1) * 43758.5453); }
float h21 (vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn (vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm (vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vn(p); p = p * 2.02 + vec2(3.1, 1.7); a *= 0.5; }
  return v;
}

// heat behind the glass; p.x in 0..A (band aspect), p.y in 0..1 from the bottom
float heat (vec2 p, float A) {
  float hx = A * (0.5 + 0.2 * sin(uTime * 0.09)) + (uPtr.x - 0.5) * A * 0.5;
  float dx = (p.x - hx) / (A * 0.45);
  float bed = exp(-dx * dx);
  vec2 fp = vec2(p.x * 2.6, p.y * 2.2 - uTime * 0.55);
  float n = fbm(fp + vec2(fbm(fp * 1.3 + uTime * 0.2) * 1.4, 0.0));
  float tongues = smoothstep(1.35, -0.05, p.y) * (0.5 + 0.9 * n);
  return tongues * (0.3 + 0.9 * bed) + exp(-p.y * 5.0) * 0.3 * bed;
}
vec3 ramp (float h) {
  h = clamp(h, 0.0, 1.6);
  vec3 c = uFloor;
  c = mix(c, uC1, smoothstep(0.05, 0.35, h));
  c = mix(c, uC2, smoothstep(0.3, 0.7, h));
  c = mix(c, uC3, smoothstep(0.65, 1.0, h));
  return mix(c, uC4, smoothstep(0.95, 1.4, h));
}

void main () {
  float A = uRes.x / uRes.y;
  vec2 p = gl_FragCoord.xy / uRes.y;
  float x = p.x / A;
  // ribs: uneven widths, a little denser to the right as the glass curves away
  float s = x * (54.0 + 26.0 * x) + 0.9 * sin(x * 9.0 + 0.5) + 0.45 * sin(x * 23.0) + 0.25 * sin(x * 51.0);
  float id = floor(s), f = fract(s);
  float ribW = A / (54.0 + 52.0 * x);
  // each rib is a lens: it shows a mirrored slice of the fire several ribs wide
  float spread = ribW * (6.0 + 5.0 * h11(id));
  float xs = p.x - (f - 0.5) * spread + (h11(id + 7.0) - 0.5) * ribW * 2.0;
  float ys = p.y + (f - 0.5) * (f - 0.5) * 0.08 * (h11(id + 3.0) - 0.5);
  float hh = heat(vec2(xs, ys), A);
  float prof = smoothstep(0.0, 0.18, f) * smoothstep(1.0, 0.78, f);
  vec3 c = mix(uFloor, ramp(hh * 0.95), mix(0.1, 1.0, pow(prof, 1.4)));
  // the rib edges catch a hairline of light
  float edge = exp(-f * f * 900.0) + exp(-(1.0 - f) * (1.0 - f) * 1600.0) * 0.5;
  c += uC2 * edge * 0.3 * (0.6 + 0.4 * h11(id + 11.0));
  // sparks drifting up through the glass
  vec2 g = vec2(p.x * 40.0, p.y * 22.0 - uTime * 1.4);
  vec2 gi = floor(g), gf = fract(g) - 0.5;
  c += uC3 * step(0.985, h21(gi)) * smoothstep(0.12, 0.0, length(gf * vec2(1.0, 0.5))) * 0.8;
  // floor: letters never vanish on the dark theme; ceiling: the light page never tints
  gl_FragColor = vec4(min(max(c, uFloor), uCeil), 1.0);
}`;

function palette(hex, light) {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b, 1e-3);
  const pure = [r / max, g / max, b / max];
  const warm = [1, 0.8, 0.42];
  return {
    // the dimmest the glass gets: above the dark page, so letters always read
    floor: light ? [0.16, 0.06, 0.03] : [0.2, 0.15, 0.12],
    // lighten blend on the light theme: stay under the page colour so only the letters change
    ceil: light ? [0.95, 0.935, 0.9] : [1, 1, 1],
    c1: pure.map((c) => c * c * 0.55),
    c2: pure,
    c3: pure.map((c, i) => c + (warm[i] - c) * 0.6),
    c4: [1, 0.95, 0.86],
  };
}

export function createEmber(canvas, { accent = '#ff6a3d', theme = 'dark', still = false, force = false, onGiveUp } = {}) {
  let hex = accent, light = theme === 'light';
  let pal = palette(hex, light);
  const ptr = { x: 0.5, tx: 0.5 };
  const fx = mountShader(canvas, {
    frag: FS, scale: 0.75, minScale: 0.4, maxDpr: 1.25, still, force, onGiveUp,
    onFrame(gl, u, t, dt) {
      if (!still) ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 1.2);
      gl.uniform2f(u.uPtr, ptr.x, 0.5);
      gl.uniform3fv(u.uFloor, pal.floor);
      gl.uniform3fv(u.uCeil, pal.ceil);
      gl.uniform3fv(u.uC1, pal.c1);
      gl.uniform3fv(u.uC2, pal.c2);
      gl.uniform3fv(u.uC3, pal.c3);
      gl.uniform3fv(u.uC4, pal.c4);
    },
  });
  if (!fx) return null;
  if (!still) {
    window.addEventListener('pointermove', (e) => {
      const b = canvas.getBoundingClientRect();
      if (b.width) ptr.tx = Math.min(1.2, Math.max(-0.2, (e.clientX - b.left) / b.width));
    }, { passive: true });
  }
  return {
    setAccent(next) { hex = next || hex; pal = palette(hex, light); if (!fx.running) fx.redraw(); },
    setTheme(t) { light = t === 'light'; pal = palette(hex, light); if (!fx.running) fx.redraw(); },
    advance: (s) => fx.advance(s),
    get running() { return fx.running; },
  };
}
