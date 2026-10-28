// void.js · the black hole behind "End transmission".
//
// Each pixel is a photon traced backwards from the camera and bent by
// Schwarzschild-like gravity (a = -1.5 h² r / |r|⁵, horizon at r = 1). Where it
// crosses the disk plane it picks up glowing gas: Keplerian rotation (the
// inner disk spins faster), a temperature ramp built from the site's accent,
// and Doppler beaming (the approaching side burns brighter). The disk behind
// the hole is lensed over its top and under its bottom; photons that fall in
// stay black. The camera drifts and leans toward the cursor.
// Technique after dvklab's "Event Horizon" hero (MIT © 2026 diiviikk5),
// rebuilt for this site. See THIRD_PARTY_NOTICES.md.

import { mountShader, hexToRgb } from './shaderfx.js';

const FS = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPtr;
uniform vec2 uShift;
uniform float uZoom;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uCore;

float h21 (vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float n2 (vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm (vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * n2(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

// the sky the light came from: sparse stars and a faint band of dust
vec3 sky (vec3 d) {
  float u = atan(d.z, d.x) / 6.2831853 + 0.5, v = d.y * 0.5 + 0.5;
  float by = (d.y - 0.16 * sin(u * 6.2831853 + 0.6)) * 3.0;
  vec3 c = uDeep * fbm(vec2(u * 14.0, v * 7.0)) * exp(-by * by) * 0.22;
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 150.0 : 300.0;
    vec2 g = vec2(u * sc * 3.1416, v * sc);
    vec2 id = floor(g), f = fract(g) - 0.5;
    float h = h21(id + float(k) * 31.0);
    vec2 o = (vec2(h21(id + 3.0), h21(id + 7.0)) - 0.5) * 0.7;
    float s = smoothstep(0.13, 0.0, length(f - o)) * step(0.945, h);
    c += mix(vec3(1.0, 0.86, 0.72), vec3(0.74, 0.83, 1.0), h21(id + 11.0)) * s * (0.2 + (h - 0.945) * 18.0);
  }
  return c;
}

// the accretion disk where a photon crosses y = 0
vec4 disk (vec3 p, vec3 vdir) {
  float rr = length(p.xz);
  if (rr < 2.2 || rr > 12.5) return vec4(0.0);
  float a = atan(p.z, p.x) - uTime * 5.0 / pow(rr, 1.5);
  vec2 q = vec2(cos(a), sin(a)) * rr;
  float n = fbm(q * 1.1 + fbm(q * 0.6 + uTime * 0.03) * 1.5) * 0.6 + fbm(q * 3.4 + 7.0) * 0.4;
  float rings = 0.78 + 0.22 * sin(rr * 11.0 + n * 7.0);
  float dens = smoothstep(2.2, 2.9, rr) * smoothstep(12.5, 5.5, rr) * pow(n, 1.6) * 1.9 * rings;
  float temp = smoothstep(11.0, 2.3, rr);
  vec3 col = mix(uDeep, uMid, smoothstep(0.0, 0.55, temp));
  col = mix(col, uCore, smoothstep(0.5, 1.0, temp));
  float beam = pow(clamp(1.0 + 0.6 * dot(normalize(vec3(-p.z, 0.0, p.x)), -vdir), 0.15, 2.0), 3.0);
  return vec4(col * dens * beam * (0.6 + 2.4 * temp), clamp(dens * 1.2, 0.0, 1.0));
}

void main () {
  vec2 uv = ((gl_FragCoord.xy - 0.5 * uRes) / uRes.y - uShift) / uZoom;
  float yaw = uTime * 0.015 + (uPtr.x - 0.5) * 0.5;
  float pitch = 0.1 + (uPtr.y - 0.5) * 0.12;
  vec3 ro = vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * 27.0;
  vec3 fw = normalize(-ro), rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw)), up = cross(fw, rt);
  float roll = -0.12;
  vec3 rt2 = rt * cos(roll) + up * sin(roll), up2 = up * cos(roll) - rt * sin(roll);
  vec3 vel = normalize(fw * 1.7 + rt2 * uv.x + up2 * uv.y);
  vec3 pos = ro;
  vec3 hc = cross(pos, vel);
  float h2 = dot(hc, hc);
  vec3 col = vec3(0.0);
  float alpha = 0.0, glow = 0.0;
  bool hole = false;
  for (int i = 0; i < 240; i++) {
    float r2 = dot(pos, pos), rl = sqrt(r2);
    float dt = clamp(0.07 * rl, 0.02, 0.9);
    vel += -1.5 * h2 * pos / pow(r2, 2.5) * dt;
    vec3 np = pos + vel * dt;
    if (pos.y * np.y < 0.0) {
      vec4 dc = disk(mix(pos, np, pos.y / (pos.y - np.y)), normalize(vel));
      col += (1.0 - alpha) * dc.rgb;
      alpha += (1.0 - alpha) * dc.a;
    }
    float gx = (rl - 1.6) * 3.0;
    glow += exp(-gx * gx) * dt;
    pos = np;
    if (rl < 1.0) { hole = true; break; }
    if (rl > 60.0 || alpha > 0.995) break;
  }
  if (!hole) col += (1.0 - alpha) * sky(normalize(vel));
  col += uCore * glow * 0.06 * (1.0 - alpha * 0.6);
  col *= 1.15;
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  vec2 q = gl_FragCoord.xy / uRes;
  col *= 1.0 - 0.25 * dot(q - 0.5, q - 0.5) * 2.0;
  col += (h21(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.012;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// accent → a three-stop disk ramp: saturated outer gas, the accent itself,
// a white-hot inner edge tinted by the accent
function ramp(hex) {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b, 1e-3);
  const pure = [r / max, g / max, b / max];
  return {
    deep: pure.map((c) => c * c * 0.9),
    mid: pure,
    core: pure.map((c) => 0.78 + c * 0.22),
  };
}

export function createVoid(canvas, { accent = '#ff6a3d', still = false, force = false, onGiveUp } = {}) {
  let colors = ramp(accent);
  const ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  const fx = mountShader(canvas, {
    frag: FS, scale: 0.55, minScale: 0.3, maxDpr: 1, still, force, onGiveUp,
    onFrame(gl, u, t, dt, W, H) {
      if (!still) {
        ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 1.6);
        ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 1.6);
      }
      // wide frames hold the hole to the right of the copy; narrow ones lift it above
      const aspect = W / Math.max(1, H);
      const wide = aspect > 1.1;
      gl.uniform2f(u.uShift, wide ? aspect * 0.21 : 0, wide ? 0.02 : 0.26);
      gl.uniform1f(u.uZoom, wide ? 1 : 0.55);
      gl.uniform2f(u.uPtr, ptr.x, ptr.y);
      gl.uniform3fv(u.uDeep, colors.deep);
      gl.uniform3fv(u.uMid, colors.mid);
      gl.uniform3fv(u.uCore, colors.core);
    },
  });
  if (!fx) return null;
  if (!still) {
    window.addEventListener('pointermove', (e) => {
      const b = canvas.getBoundingClientRect();
      if (!b.width || !b.height) return;
      ptr.tx = Math.min(1, Math.max(0, (e.clientX - b.left) / b.width));
      ptr.ty = Math.min(1, Math.max(0, 1 - (e.clientY - b.top) / b.height));
    }, { passive: true });
  }
  return {
    setAccent(hex) { colors = ramp(hex); if (!fx.running) fx.redraw(); },
    advance: (s) => fx.advance(s),
    get running() { return fx.running; },
  };
}
