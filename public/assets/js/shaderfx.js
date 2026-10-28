// shaderfx.js · a small runtime for the section shaders (the demo's glyph
// face, the black hole behind contact, the ember glass behind the finale).
//
// One full-screen fragment pass sized to its canvas. It runs only while the
// canvas is on screen and the tab is visible, draws a single still frame
// under reduced motion, renders fewer pixels when frames run slow, and
// returns null without WebGL or on a software renderer, so callers keep
// their CSS fallback.

const VS = 'attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.,1.);}';
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

export function mountShader(canvas, opts) {
  const {
    frag, scale = 1, minScale = 0.4, maxDpr = 1.5, still = false, force = false,
    onFrame, onGiveUp,
  } = opts;
  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false,
    preserveDrawingBuffer: false, powerPreference: 'high-performance',
  });
  if (!gl) return null;
  const release = () => { try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* already gone */ } };
  if (!force) {
    let renderer = '';
    try {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    } catch { /* renderer unknown: assume a GPU */ }
    if (SOFTWARE.test(renderer)) { release(); return null; }
  }

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader compile failed');
    return sh;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link failed');
  } catch (err) {
    console.warn('[shaderfx] disabled:', err.message);
    release();
    return null;
  }
  const u = {};
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

  // ---------- size: CSS box × capped DPR × the current quality scale ----------
  let k = scale, W = 1, H = 1;
  function resize() {
    const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(canvas.clientWidth * dpr * k));
    H = Math.max(1, Math.round(canvas.clientHeight * dpr * k));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  }

  let clock = still ? 20 : 0, last = 0, raf = 0, visible = false, lost = false, dead = false;
  function draw(dt) {
    if (lost || dead) return;
    resize();
    gl.viewport(0, 0, W, H);
    if (u.uRes) gl.uniform2f(u.uRes, W, H);
    if (u.uTime) gl.uniform1f(u.uTime, clock);
    if (onFrame) onFrame(gl, u, clock, dt, W, H);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // governor: a slow median frame drops the resolution; at the floor, give up
  const perf = { samples: [], since: 0 };
  function govern(now, raw) {
    if (now - perf.since < 1200 || raw > 250) return;
    perf.samples.push(raw);
    if (perf.samples.length < 60) return;
    perf.samples.sort((a, b) => a - b);
    const median = perf.samples[30];
    perf.samples.length = 0;
    if (median <= 26) return;
    if (k > minScale + 1e-3) { k = Math.max(minScale, k * 0.75); perf.since = now; return; }
    stop();
    dead = true;
    if (onGiveUp) onGiveUp();
  }

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden || lost || dead) return;
    const raw = last ? now - last : 16;
    last = now;
    govern(now, raw);
    const dt = Math.min(raw / 1000, 1 / 20);
    clock += dt;
    draw(dt);
    if (!dead) raf = requestAnimationFrame(frame);
  }
  function start() {
    if (raf || still || !visible || document.hidden || lost || dead) return;
    last = 0;
    perf.since = performance.now();
    perf.samples.length = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  const redraw = () => draw(0);

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (!visible) stop();
    else if (still) redraw();
    else start();
  }, { rootMargin: '160px 0px' });
  io.observe(canvas);
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  const ro = new ResizeObserver(() => { if (!raf && visible) redraw(); });
  ro.observe(canvas);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    stop();
    if (onGiveUp) onGiveUp();
  });

  return {
    gl,
    u,
    redraw,
    // run (or, under reduced motion, repaint) after a state change
    wake() { if (still || !raf) redraw(); start(); },
    get running() { return !!raf; },
    get time() { return clock; },
    // QA hook: step the clock and draw one frame
    advance(seconds = 1) { clock += seconds; draw(1 / 60); },
    destroy() {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      release();
    },
  };
}

export function hexToRgb(hex, fallback = [1, 0.42, 0.24]) {
  let h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return fallback;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
