// fluid.js · WebGL "ink in water" for the hero and contact backdrops.
// Stable-fluids solver (Jos Stam, 1999). Pipeline structure follows Pavel
// Dobryakov's MIT-licensed WebGL-Fluid-Simulation, rewritten and trimmed:
// curl → vorticity → divergence → pressure (Jacobi) → gradient subtract → advect.

const BASE_VS = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const COPY_FS = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; uniform sampler2D uTexture;
void main () { gl_FragColor = texture2D(uTexture, vUv); }`;

const CLEAR_FS = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;
void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`;

const SPLAT_FS = `
precision highp float; precision highp sampler2D;
varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio;
uniform vec3 color; uniform vec2 point; uniform float radius;
void main () {
  vec2 p = vUv - point.xy; p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}`;

const ADVECTION_FS = `
precision highp float; precision highp sampler2D;
varying vec2 vUv; uniform sampler2D uVelocity; uniform sampler2D uSource;
uniform vec2 texelSize; uniform vec2 dyeTexelSize; uniform float dt; uniform float dissipation;
vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
  vec2 st = uv / tsize - 0.5; vec2 iuv = floor(st); vec2 fuv = fract(st);
  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
  vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
  vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}
void main () {
#ifdef MANUAL_FILTERING
  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
  vec4 result = bilerp(uSource, coord, dyeTexelSize);
#else
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
  vec4 result = texture2D(uSource, coord);
#endif
  float decay = 1.0 + dissipation * dt;
  gl_FragColor = result / decay;
}`;

const DIVERGENCE_FS = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).x; float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y; float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; } if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; } if (vB.y < 0.0) { B = -C.y; }
  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const CURL_FS = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).y; float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x; float B = texture2D(uVelocity, vB).x;
  gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

const VORTICITY_FS = `
precision highp float; precision highp sampler2D;
varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
void main () {
  float L = texture2D(uCurl, vL).x; float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy + force * dt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

const PRESSURE_FS = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D uPressure; uniform sampler2D uDivergence;
void main () {
  float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT_FS = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D uPressure; uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

// Shaded, tone-mapped ink. Dark theme: glowing ember smoke (premultiplied).
// Light theme: subtractive "ink on paper" in the same hue, darkening with density.
const DISPLAY_FS = `
precision highp float; precision highp sampler2D;
varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform sampler2D uTexture; uniform vec2 texelSize; uniform float uLight; uniform float uTime;
float hash (vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main () {
  vec3 c = texture2D(uTexture, vUv).rgb;
  vec3 lc = texture2D(uTexture, vL).rgb; vec3 rc = texture2D(uTexture, vR).rgb;
  vec3 tc = texture2D(uTexture, vT).rgb; vec3 bc = texture2D(uTexture, vB).rgb;
  float dx = length(rc) - length(lc); float dy = length(tc) - length(bc);
  vec3 n = normalize(vec3(dx, dy, length(texelSize)));
  float diffuse = clamp(dot(n, vec3(0.0, 0.0, 1.0)) + 0.7, 0.7, 1.0);
  c *= diffuse;
  c = vec3(1.0) - exp(-c * 1.3);
  float a = max(c.r, max(c.g, c.b));
  float g = (hash(vUv * 977.0 + uTime) - 0.5) / 110.0;
  if (uLight > 0.5) {
    vec3 hue = c / max(a, 0.0001);
    vec3 ink = mix(hue * 0.92, hue * 0.3, smoothstep(0.25, 1.0, a));
    float alpha = clamp(a * 0.9 + g, 0.0, 1.0);
    gl_FragColor = vec4(ink * alpha, alpha);
  } else {
    float alpha = clamp(a + g, 0.0, 1.0);
    gl_FragColor = vec4(clamp(c + g, 0.0, alpha), alpha);
  }
}`;

function getContext(canvas) {
  const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  let gl = canvas.getContext('webgl2', params);
  const isWebGL2 = !!gl;
  if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
  if (!gl) return null;

  let halfFloat = null;
  let linear;
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    linear = gl.getExtension('OES_texture_float_linear');
  } else {
    halfFloat = gl.getExtension('OES_texture_half_float');
    linear = gl.getExtension('OES_texture_half_float_linear');
  }
  const type = isWebGL2 ? gl.HALF_FLOAT : halfFloat && halfFloat.HALF_FLOAT_OES;
  if (!type) return null;

  let rgba, rg, r;
  if (isWebGL2) {
    rgba = supportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
    rg = supportedFormat(gl, gl.RG16F, gl.RG, type);
    r = supportedFormat(gl, gl.R16F, gl.RED, type);
  } else {
    rgba = supportedFormat(gl, gl.RGBA, gl.RGBA, type);
    rg = rgba; r = rgba;
  }
  if (!rgba || !rg || !r) return null;
  return { gl, isWebGL2, type, rgba, rg, r, linear: !!linear };
}

function supportedFormat(gl, internalFormat, format, type) {
  if (canRender(gl, internalFormat, format, type)) return { internalFormat, format };
  if (internalFormat === gl.R16F) return supportedFormat(gl, gl.RG16F, gl.RG, type);
  if (internalFormat === gl.RG16F) return supportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
  return null;
}

function canRender(gl, internalFormat, format, type) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fbo);
  gl.deleteTexture(tex);
  return ok;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return [1, 0.42, 0.24];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6; if (h < 0) h += 1;
  }
  return [h, max ? d / max : 0, max];
}
function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  switch (((i % 6) + 6) % 6) {
    case 0: return [v, t, p]; case 1: return [q, v, p]; case 2: return [p, v, t];
    case 3: return [p, q, v]; case 4: return [t, p, v]; default: return [v, p, q];
  }
}

export function createFluid(canvas, options = {}) {
  const small = window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
  const cfg = {
    SIM_RESOLUTION: small ? 96 : 128,
    DYE_RESOLUTION: small ? 512 : 1024,
    DENSITY_DISSIPATION: 0.9,
    VELOCITY_DISSIPATION: 0.3,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: small ? 14 : 20,
    CURL: 26,
    SPLAT_RADIUS: 0.24,
    SPLAT_FORCE: 5600,
    DPR_CAP: small ? 1.25 : 1.5,
    ...options,
  };

  const ctx = getContext(canvas);
  if (!ctx) return null;
  const { gl } = ctx;

  // Software rasterisers (VMs, blocklisted drivers) can't run a fluid sim at
  // interactive rates; bail out and let the static gradient take over.
  const renderer = (() => {
    try {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      return String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    } catch { return ''; }
  })();
  if (!cfg.force && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) return null;

  // ---------- programs ----------
  function compile(type, source, defines) {
    const src = (defines || []).map((k) => `#define ${k}\n`).join('') + source;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader compile failed');
    return sh;
  }
  const vs = compile(gl.VERTEX_SHADER, BASE_VS);
  function program(fsSource, defines) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSource, defines));
    gl.bindAttribLocation(p, 0, 'aPosition');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link failed');
    const u = {};
    const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(p, i).name;
      u[name] = gl.getUniformLocation(p, name);
    }
    return { bind: () => gl.useProgram(p), u };
  }

  let P;
  try {
    P = {
      copy: program(COPY_FS),
      clear: program(CLEAR_FS),
      splat: program(SPLAT_FS),
      advection: program(ADVECTION_FS, ctx.linear ? [] : ['MANUAL_FILTERING']),
      divergence: program(DIVERGENCE_FS),
      curl: program(CURL_FS),
      vorticity: program(VORTICITY_FS),
      pressure: program(PRESSURE_FS),
      gradient: program(GRADIENT_FS),
      display: program(DISPLAY_FS),
    };
  } catch (err) {
    console.warn('[fluid] disabled:', err.message);
    return null;
  }

  // ---------- full-screen quad ----------
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);
  function blit(target, clear) {
    if (!target) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    if (clear) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  // ---------- framebuffers ----------
  function fbo(w, h, fmt, filter) {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internalFormat, w, h, 0, fmt.format, ctx.type, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      texture, fbo: fb, width: w, height: h, tx: 1 / w, ty: 1 / h,
      attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; },
      dispose() { gl.deleteFramebuffer(fb); gl.deleteTexture(texture); },
    };
  }
  function doubleFbo(w, h, fmt, filter) {
    let a = fbo(w, h, fmt, filter), b = fbo(w, h, fmt, filter);
    return {
      width: w, height: h, tx: 1 / w, ty: 1 / h,
      get read() { return a; }, set read(v) { a = v; },
      get write() { return b; }, set write(v) { b = v; },
      swap() { const t = a; a = b; b = t; },
      dispose() { a.dispose(); b.dispose(); },
    };
  }
  function resizeDouble(target, w, h, fmt, filter) {
    if (target.width === w && target.height === h) return target;
    const next = fbo(w, h, fmt, filter);
    P.copy.bind();
    gl.uniform1i(P.copy.u.uTexture, target.read.attach(0));
    blit(next);
    target.read.dispose(); target.write.dispose();
    target.read = next;
    target.write = fbo(w, h, fmt, filter);
    target.width = w; target.height = h; target.tx = 1 / w; target.ty = 1 / h;
    return target;
  }
  function resolution(res) {
    let ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (ar < 1) ar = 1 / ar;
    const min = Math.round(res), max = Math.round(res * ar);
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? { width: max, height: min } : { width: min, height: max };
  }

  let dye, velocity, divergence, curl, pressure;
  function initFramebuffers() {
    const sim = resolution(cfg.SIM_RESOLUTION), dyeRes = resolution(cfg.DYE_RESOLUTION);
    const filter = ctx.linear ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);
    dye = dye ? resizeDouble(dye, dyeRes.width, dyeRes.height, ctx.rgba, filter) : doubleFbo(dyeRes.width, dyeRes.height, ctx.rgba, filter);
    velocity = velocity ? resizeDouble(velocity, sim.width, sim.height, ctx.rg, filter) : doubleFbo(sim.width, sim.height, ctx.rg, filter);
    if (divergence) { divergence.dispose(); curl.dispose(); pressure.dispose(); }
    divergence = fbo(sim.width, sim.height, ctx.r, gl.NEAREST);
    curl = fbo(sim.width, sim.height, ctx.r, gl.NEAREST);
    pressure = doubleFbo(sim.width, sim.height, ctx.r, gl.NEAREST);
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.DPR_CAP);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; return true; }
    return false;
  }

  // ---------- simulation ----------
  function aspect() { return canvas.width / canvas.height; }
  function correctRadius(r) { const ar = aspect(); return ar > 1 ? r * ar : r; }
  function correctDX(d) { const ar = aspect(); return ar < 1 ? d * ar : d; }
  function correctDY(d) { const ar = aspect(); return ar > 1 ? d / ar : d; }

  function splat(x, y, dx, dy, color, radiusScale = 1) {
    P.splat.bind();
    gl.uniform1i(P.splat.u.uTarget, velocity.read.attach(0));
    gl.uniform1f(P.splat.u.aspectRatio, aspect());
    gl.uniform2f(P.splat.u.point, x, y);
    gl.uniform3f(P.splat.u.color, dx, dy, 0);
    gl.uniform1f(P.splat.u.radius, correctRadius((cfg.SPLAT_RADIUS * radiusScale) / 100));
    blit(velocity.write);
    velocity.swap();
    gl.uniform1i(P.splat.u.uTarget, dye.read.attach(0));
    gl.uniform3f(P.splat.u.color, color[0], color[1], color[2]);
    blit(dye.write);
    dye.swap();
  }

  function step(dt) {
    gl.disable(gl.BLEND);
    P.curl.bind();
    gl.uniform2f(P.curl.u.texelSize, velocity.tx, velocity.ty);
    gl.uniform1i(P.curl.u.uVelocity, velocity.read.attach(0));
    blit(curl);

    P.vorticity.bind();
    gl.uniform2f(P.vorticity.u.texelSize, velocity.tx, velocity.ty);
    gl.uniform1i(P.vorticity.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(P.vorticity.u.uCurl, curl.attach(1));
    gl.uniform1f(P.vorticity.u.curl, cfg.CURL);
    gl.uniform1f(P.vorticity.u.dt, dt);
    blit(velocity.write);
    velocity.swap();

    P.divergence.bind();
    gl.uniform2f(P.divergence.u.texelSize, velocity.tx, velocity.ty);
    gl.uniform1i(P.divergence.u.uVelocity, velocity.read.attach(0));
    blit(divergence);

    P.clear.bind();
    gl.uniform1i(P.clear.u.uTexture, pressure.read.attach(0));
    gl.uniform1f(P.clear.u.value, cfg.PRESSURE);
    blit(pressure.write);
    pressure.swap();

    P.pressure.bind();
    gl.uniform2f(P.pressure.u.texelSize, velocity.tx, velocity.ty);
    gl.uniform1i(P.pressure.u.uDivergence, divergence.attach(0));
    for (let i = 0; i < cfg.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(P.pressure.u.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    P.gradient.bind();
    gl.uniform2f(P.gradient.u.texelSize, velocity.tx, velocity.ty);
    gl.uniform1i(P.gradient.u.uPressure, pressure.read.attach(0));
    gl.uniform1i(P.gradient.u.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    P.advection.bind();
    gl.uniform2f(P.advection.u.texelSize, velocity.tx, velocity.ty);
    if (!ctx.linear) gl.uniform2f(P.advection.u.dyeTexelSize, velocity.tx, velocity.ty);
    const vId = velocity.read.attach(0);
    gl.uniform1i(P.advection.u.uVelocity, vId);
    gl.uniform1i(P.advection.u.uSource, vId);
    gl.uniform1f(P.advection.u.dt, dt);
    gl.uniform1f(P.advection.u.dissipation, cfg.VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    if (!ctx.linear) gl.uniform2f(P.advection.u.dyeTexelSize, dye.tx, dye.ty);
    gl.uniform1i(P.advection.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(P.advection.u.uSource, dye.read.attach(1));
    gl.uniform1f(P.advection.u.dissipation, cfg.DENSITY_DISSIPATION);
    blit(dye.write);
    dye.swap();
  }

  let light = 0;
  function render(now) {
    gl.disable(gl.BLEND);
    P.display.bind();
    gl.uniform2f(P.display.u.texelSize, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
    gl.uniform1i(P.display.u.uTexture, dye.read.attach(0));
    gl.uniform1f(P.display.u.uLight, light);
    gl.uniform1f(P.display.u.uTime, (now % 10000) / 1000);
    blit(null, true);
  }

  // ---------- colour ----------
  let palette = [];
  function setAccent(hex) {
    const [h, s] = rgbToHsv(...hexToRgb(hex));
    const sat = Math.max(0.55, Math.min(1, s));
    palette = [
      hsvToRgb(h, sat, 1),
      hsvToRgb((h + 0.028) % 1, sat * 0.92, 1),
      hsvToRgb((h + 0.97) % 1, Math.min(1, sat * 1.05), 0.82),
      hsvToRgb((h + 0.065) % 1, sat * 0.7, 1),
    ];
  }
  function color(intensity) {
    const c = palette[(Math.random() * palette.length) | 0];
    return [c[0] * intensity, c[1] * intensity, c[2] * intensity];
  }

  // ---------- input ----------
  const ptr = { x: 0, y: 0, px: null, py: null, dx: 0, dy: 0, moved: false, color: null, colorUntil: 0 };
  function pointer(clientX, clientY) {
    if (!running) { ptr.px = null; return; }
    const x = clientX / canvas.clientWidth;
    const y = 1 - clientY / canvas.clientHeight;
    if (ptr.px === null) { ptr.px = x; ptr.py = y; return; }
    ptr.dx += correctDX(x - ptr.px);
    ptr.dy += correctDY(y - ptr.py);
    ptr.x = x; ptr.y = y; ptr.px = x; ptr.py = y; ptr.moved = true;
  }
  function burst(count = 1, strength = 1) {
    for (let i = 0; i < count; i++) {
      const x = 0.18 + Math.random() * 0.74;
      const y = 0.2 + Math.random() * 0.62;
      const ang = Math.random() * Math.PI * 2;
      const f = (520 + Math.random() * 520) * strength;
      splat(x, y, Math.cos(ang) * f, Math.sin(ang) * f, color(0.55 + Math.random() * 0.35), 1.6);
    }
  }
  function impulse(dy) {
    if (!running || !dy) return;
    const f = Math.max(-1, Math.min(1, dy / 60)) * 900;
    for (let i = 0; i < 2; i++) splat(0.15 + Math.random() * 0.7, 0.25 + Math.random() * 0.5, (Math.random() - 0.5) * 220, f, color(0.05), 1.2);
  }

  // phantom emitter drifting on a Lissajous path keeps the ink alive without input
  const ghost = { px: null, py: null };
  let nextBurst = 0;
  function ambient(now) {
    const t = now * 0.00011;
    const x = 0.56 + 0.3 * Math.sin(t * 2.1) * Math.cos(t * 0.63);
    const y = 0.5 + 0.24 * Math.sin(t * 1.37 + 1.1);
    if (ghost.px !== null) {
      splat(x, y, correctDX(x - ghost.px) * cfg.SPLAT_FORCE * 1.1, correctDY(y - ghost.py) * cfg.SPLAT_FORCE * 1.1, color(0.04), 1.4);
    }
    ghost.px = x; ghost.py = y;
    if (now > nextBurst) {
      burst(1, 0.9);
      nextBurst = now + 2400 + Math.random() * 2600;
    }
  }

  // ---------- adaptive quality ----------
  // Median frame time over ~90 frames; two slow windows in a row → step down a level.
  // Below the last level the sim switches itself off and onGiveUp() shows the fallback.
  const LEVELS = [
    { sim: cfg.SIM_RESOLUTION, dye: cfg.DYE_RESOLUTION, iters: cfg.PRESSURE_ITERATIONS, dpr: cfg.DPR_CAP },
    { sim: 96, dye: 512, iters: 14, dpr: 1 },
    { sim: 64, dye: 384, iters: 10, dpr: 0.75 },
  ];
  const perf = { samples: [], level: 0, slow: 0, since: 0 };
  function degrade() {
    if (perf.level >= LEVELS.length - 1) {
      stop();
      lost = true;
      if (typeof cfg.onGiveUp === 'function') cfg.onGiveUp();
      return;
    }
    const L = LEVELS[++perf.level];
    cfg.SIM_RESOLUTION = L.sim; cfg.DYE_RESOLUTION = L.dye; cfg.PRESSURE_ITERATIONS = L.iters; cfg.DPR_CAP = L.dpr;
    resizeCanvas();
    initFramebuffers();
  }
  function sample(now, raw) {
    if (now - perf.since < 1500 || raw > 250) return; // ignore warm-up and tab-switch gaps
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
    const dt = Math.min(raw / 1000, 1 / 60);
    last = now;
    sample(now, raw);
    if (!running) return;
    if (resizeCanvas()) initFramebuffers();
    ambient(now);
    if (ptr.moved) {
      ptr.moved = false;
      if (!ptr.color || now > ptr.colorUntil) { ptr.color = color(0.11); ptr.colorUntil = now + 420; }
      splat(ptr.x, ptr.y, ptr.dx * cfg.SPLAT_FORCE, ptr.dy * cfg.SPLAT_FORCE, ptr.color);
      ptr.dx = 0; ptr.dy = 0;
    }
    step(dt);
    render(now);
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
    ptr.px = null;
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
  setAccent(options.accent || '#ff6a3d');
  resizeCanvas();
  initFramebuffers();
  burst(5, 1.25);

  // test hook: run n simulation steps at 60fps timing without waiting for rAF
  function advance(n) {
    let t = performance.now();
    for (let i = 0; i < n; i++) {
      t += 1000 / 60;
      ambient(t);
      step(1 / 60);
    }
    render(t);
  }

  return {
    setActive,
    pointer,
    impulse,
    advance,
    burst: (n = 2) => { if (running) burst(n, 1.1); },
    setAccent,
    setTheme(t) { light = t === 'light' ? 1 : 0; },
    get running() { return running; },
  };
}
