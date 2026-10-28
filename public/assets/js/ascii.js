// ascii.js · live-character backdrop (WebGL).
//
// Two passes. The section's shape (the same seven signed-distance shapes the
// dither backdrop uses) is sphere-traced once per character cell into a small
// luminance buffer; then each cell is drawn as a JetBrains Mono glyph picked
// by brightness from an atlas built at runtime, so the shape reads as live
// terminal output. Cells keep re-rolling between glyphs of similar weight,
// characters near the cursor churn, and a breach tears the rows apart.
// Same interface as the swarm and dither backdrops.
// The glyph-shading approach follows dvklab's ASCII heroes (MIT © 2026
// diiviikk5). See THIRD_PARTY_NOTICES.md.

import { SCENE_GLSL, SCENES, UNIT_RADIUS, hexToRgb, rgbToHsv, hsvToRgb, rotX, rotY, rotZ, mul3 } from './dither.js';

const VS = 'attribute vec2 aPos; void main () { gl_Position = vec4(aPos, 0.0, 1.0); }';

// pass 1 · one ray per character cell: luminance (r), highlight (g), hit (a)
const FS_SCENE = `
precision highp float;
uniform vec2 uRes;
uniform float uAspect;
uniform vec2 uCenter;
uniform float uScale;
uniform vec2 uPtr;
uniform float uPtrOn;
uniform vec3 uRipple;
${SCENE_GLSL}
void main () {
  vec2 uv = (gl_FragCoord.xy / uRes - 0.5) * vec2(uAspect, 1.0);
  vec2 dp = uv - uPtr;
  float dl = length(dp);
  uv += uPtrOn * dp / (dl + 1e-4) * sin(dl * 46.0 - uTime * 6.0) * 0.006 * exp(-dl * 8.0);
  if (uRipple.z >= 0.0) {
    vec2 dr = uv - uRipple.xy;
    float rl = length(dr);
    float k = (rl - uRipple.z * 0.75) * 18.0;
    uv += dr / (rl + 1e-4) * exp(-k * k) * 0.024 * exp(-uRipple.z * 1.6);
  }
  vec2 q = (uv - uCenter) / uScale;
  vec3 ro = vec3(0.0, 0.0, 3.4);
  vec3 rd = normalize(vec3(q, -1.9));
  float b = dot(ro, rd);
  float h = b * b - (dot(ro, ro) - 2.6);
  float lum = 0.0, hit = 0.0;
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
        lum = 0.08 + 0.8 * dif * (0.45 + 0.55 * ao) + 0.45 * rim;
        hit = 1.0;
        break;
      }
      t += d * 0.75;
      if (t > tmax) break;
    }
  }
  gl_FragColor = vec4(clamp(lum, 0.0, 1.0), step(0.86, lum), 0.0, hit);
}`;

// pass 2 · every pixel finds its cell, picks a glyph by brightness, samples the atlas 1:1
const FS_GLYPH = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uCellPx;
uniform vec2 uCells;
uniform sampler2D uLum;
uniform sampler2D uAtlas;
uniform vec2 uAtlasPx;
uniform float uGlyphs;
uniform float uTime;
uniform vec2 uPtrCell;
uniform float uPtrOn;
uniform float uGlitch;
uniform float uIntensity;
uniform vec3 uInk;
uniform vec3 uHot;

float hash (vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main () {
  vec2 fc = gl_FragCoord.xy;
  float row = floor(fc.y / uCellPx.y);
  if (uGlitch > 0.01 && hash(vec2(row, floor(uTime * 24.0))) > 1.0 - uGlitch * 0.6) {
    fc.x += (hash(vec2(row, 3.7)) - 0.5) * uRes.x * 0.12 * uGlitch;
  }
  vec2 cell = floor(fc / uCellPx);
  vec2 f = fract(fc / uCellPx);
  vec4 s = texture2D(uLum, (cell + 0.5) / uCells);
  if (s.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  float lum = s.r;
  // characters near the cursor churn; everything re-rolls at its own pace
  vec2 dc = (cell - uPtrCell) / vec2(9.0, 6.0);
  float near = uPtrOn * exp(-dot(dc, dc));
  float speed = 0.5 + 2.5 * hash(cell) + 14.0 * near + 10.0 * uGlitch;
  float roll = floor(uTime * speed + hash(cell * 1.3) * 7.0);
  float jitter = (hash(cell + roll * 0.37) - 0.5) * (0.16 + 0.3 * near);
  float gi = clamp(floor((lum + jitter) * (uGlyphs - 1.0)) + 1.0, 1.0, uGlyphs - 1.0);
  vec2 px = vec2(gi * uCellPx.x + floor(f.x * uCellPx.x), min(floor((1.0 - f.y) * uCellPx.y), uCellPx.y - 1.0)) + 0.5;
  float a = texture2D(uAtlas, px / uAtlasPx).a;
  vec3 col = mix(uInk, uHot, clamp(s.g + near * 0.5, 0.0, 1.0));
  float k = a * uIntensity * (0.55 + 0.45 * lum);
  gl_FragColor = vec4(col * k, k);
}`;

// candidate glyphs, sorted at runtime by how much ink each one lays down
const CHARS = '.,:;-~=+*!?/\\|()[]{}<>icrlvxzsjtfuneaoykhdbpqgw0123456789ABCDEFGHKMNOPRSUVWXZ#$%&@';

export function createAscii(canvas, options = {}) {
  const small = window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
  const attrs = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  const gl = canvas.getContext('webgl', attrs);
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
  function program(fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link failed');
    const u = {};
    const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(p, i).name;
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p, u };
  }
  let scene, glyph;
  try {
    scene = program(FS_SCENE);
    glyph = program(FS_GLYPH);
  } catch (err) {
    console.warn('[ascii] disabled:', err.message);
    return null;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.BLEND);

  function texture() {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  const lumTex = texture();
  const atlasTex = texture();
  const fbo = gl.createFramebuffer();

  // ---------- glyph atlas: one row of cells, index 0 left blank ----------
  const atlas = { w: 1, h: 1, count: 2, key: '' };
  function buildAtlas(cw, ch) {
    const fontPx = Math.max(6, Math.round(ch * 0.8));
    const font = `500 ${fontPx}px "JetBrains Mono", ui-monospace, monospace`;
    const scratch = document.createElement('canvas');
    scratch.width = cw;
    scratch.height = ch;
    const sx = scratch.getContext('2d', { willReadFrequently: true });
    sx.font = font;
    sx.textAlign = 'center';
    sx.textBaseline = 'middle';
    sx.fillStyle = '#fff';
    const scored = [];
    for (const c of CHARS) {
      sx.clearRect(0, 0, cw, ch);
      sx.fillText(c, cw / 2, ch / 2);
      const data = sx.getImageData(0, 0, cw, ch).data;
      let ink = 0;
      for (let i = 3; i < data.length; i += 4) ink += data[i];
      if (ink > 0) scored.push([c, ink]);
    }
    scored.sort((a, b) => a[1] - b[1]);
    const picks = [];
    const want = Math.min(26, scored.length);
    for (let i = 0; i < want; i++) {
      const c = scored[Math.round((i * (scored.length - 1)) / Math.max(1, want - 1))][0];
      if (picks[picks.length - 1] !== c) picks.push(c);
    }
    const out = document.createElement('canvas');
    out.width = cw * (picks.length + 1);
    out.height = ch;
    const ox = out.getContext('2d');
    ox.font = font;
    ox.textAlign = 'center';
    ox.textBaseline = 'middle';
    ox.fillStyle = '#fff';
    picks.forEach((c, i) => ox.fillText(c, cw * (i + 1.5), ch / 2));
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, out);
    atlas.w = out.width;
    atlas.h = out.height;
    atlas.count = picks.length + 1;
  }

  // ---------- sizing: character cells in device pixels ----------
  const CELL = small ? [7, 11] : [8, 13];
  const LEVELS = [{ dpr: 2, k: 1 }, { dpr: 1.5, k: 1.2 }, { dpr: 1, k: 1.45 }];
  let level = 0;
  const grid = { W: 1, H: 1, cw: 8, ch: 13, cols: 0, rows: 0, dpr: 1 };
  function resize() {
    const L = LEVELS[level];
    const dpr = Math.min(L.dpr, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const H = Math.max(1, Math.round(canvas.clientHeight * dpr));
    const cw = Math.max(4, Math.round(CELL[0] * dpr * L.k));
    const ch = Math.max(6, Math.round(CELL[1] * dpr * L.k));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const cols = Math.ceil(W / cw), rows = Math.ceil(H / ch);
    if (cols !== grid.cols || rows !== grid.rows) {
      gl.bindTexture(gl.TEXTURE_2D, lumTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, lumTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    const key = `${cw}x${ch}`;
    if (key !== atlas.key) { atlas.key = key; buildAtlas(cw, ch); }
    Object.assign(grid, { W, H, cw, ch, cols, rows, dpr });
  }
  // once the real font is in, redraw the atlas with it
  if (document.fonts && document.fonts.load) {
    document.fonts.load(`500 ${CELL[1]}px "JetBrains Mono"`).then(() => { atlas.key = ''; }).catch(() => {});
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
  const ptr = { x: 0.3, y: 0.15, tx: 0.3, ty: 0.15, on: 0, onTarget: 0, cx: -1000, cy: -1000 };
  const toUv = (cx, cy) => {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    return [(cx / w - 0.5) * (w / h), 0.5 - cy / h];
  };
  function pointer(cx, cy) { [ptr.tx, ptr.ty] = toUv(cx, cy); ptr.cx = cx; ptr.cy = cy; ptr.onTarget = 1; }
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
    resize();
    const A = Math.floor(scroll.scene), B = Math.min(SCENES.length - 1, A + 1), m = scroll.scene - A;
    const SA = SCENES[A], SB = SCENES[B];
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const wide = aspect >= 1.05;
    const LA = wide ? SA.wide : SA.narrow, LB = wide ? SB.wide : SB.narrow;
    const lerp = (a, b) => a + (b - a) * m;

    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 8);
    ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 8);
    ptr.on += (ptr.onTarget - ptr.on) * Math.min(1, dt * 3);
    twist *= Math.exp(-dt * 2.5);
    glitch *= Math.exp(-dt * 3);
    alarm *= Math.exp(-dt * 1.4);

    const drift = (scroll.local - 0.5) * 0.12;
    const cx = lerp(LA[0], LB[0]) * (aspect / 2);
    const cy = lerp(LA[1] + drift, LB[1] - 0.06) * 0.5;
    const radius = lerp(LA[2], LB[2]);
    const yaw = lerp(SA.spin, SB.spin) * clock + scroll.local * 1.1 * (1 - m) + ptr.x * 0.5 * ptr.on;
    const pitch = lerp(SA.pitch, SB.pitch) - ptr.y * 0.4 * ptr.on;
    const roll = lerp(SA.roll, SB.roll);
    const rot = new Float32Array(mul3(rotZ(roll), mul3(rotX(pitch), rotY(yaw))));
    const ink = col.ink.map((c, i) => c + (col.alarm[i] - c) * alarm);
    const age = clock - ripple.born;

    // pass 1: the shape, one ray per cell
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, grid.cols, grid.rows);
    gl.useProgram(scene.p);
    const su = scene.u;
    gl.uniform2f(su.uRes, grid.cols, grid.rows);
    gl.uniform1f(su.uAspect, (grid.cols * grid.cw) / Math.max(1, grid.rows * grid.ch));
    gl.uniform1f(su.uTime, clock);
    gl.uniform2f(su.uCenter, cx, cy);
    gl.uniform1f(su.uScale, radius / UNIT_RADIUS);
    gl.uniformMatrix3fv(su.uRot, false, rot);
    gl.uniform1f(su.uSceneA, A);
    gl.uniform1f(su.uSceneB, B);
    gl.uniform1f(su.uMorph, m);
    gl.uniform2f(su.uPtr, ptr.x, ptr.y);
    gl.uniform1f(su.uPtrOn, ptr.on);
    gl.uniform3f(su.uRipple, ripple.x, ripple.y, age < 2.5 ? age : -1);
    gl.uniform1f(su.uTwist, twist);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // pass 2: glyphs
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, grid.W, grid.H);
    gl.useProgram(glyph.p);
    const gu = glyph.u;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, lumTex);
    gl.uniform1i(gu.uLum, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.uniform1i(gu.uAtlas, 1);
    gl.uniform2f(gu.uRes, grid.W, grid.H);
    gl.uniform2f(gu.uCellPx, grid.cw, grid.ch);
    gl.uniform2f(gu.uCells, grid.cols, grid.rows);
    gl.uniform2f(gu.uAtlasPx, atlas.w, atlas.h);
    gl.uniform1f(gu.uGlyphs, atlas.count);
    gl.uniform1f(gu.uTime, clock);
    gl.uniform2f(gu.uPtrCell, (ptr.cx * grid.dpr) / grid.cw, (grid.H - ptr.cy * grid.dpr) / grid.ch);
    gl.uniform1f(gu.uPtrOn, ptr.on);
    gl.uniform1f(gu.uGlitch, glitch);
    gl.uniform1f(gu.uIntensity, lerp(SA.glow, SB.glow));
    gl.uniform3fv(gu.uInk, ink);
    gl.uniform3fv(gu.uHot, col.hot);
    gl.activeTexture(gl.TEXTURE0);
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

  return {
    kind: 'ascii',
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
    advance(seconds = 1) { clock += seconds; render(1 / 60); },
    get running() { return running; },
  };
}
