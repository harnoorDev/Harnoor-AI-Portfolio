// main.js · motion system + interactions for iamharnoor.com (v4)
import { initPlayground } from './playground.js';

const d = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const SplitText = window.SplitText;
const hasGSAP = !!(gsap && ScrollTrigger);

const EMAIL = 'harnoor24@outlook.com';
const ACCENTS = ['ember', 'acid', 'plasma', 'phosphor', 'cyan'];
const state = { lenis: null, bg: null, heroIntro: null, scope: null, face: null, void: null, ember: null };

// ------------------------------------------------------------------ helpers
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad = (n) => String(n).padStart(2, '0');
const store = {
  get(k, s = localStorage) { try { return s.getItem(k); } catch { return null; } },
  set(k, v, s = localStorage) { try { s.setItem(k, v); } catch { /* blocked */ } },
};

let toastTimer = 0;
function toast(html) {
  const el = $('#toast');
  if (!el) return;
  el.innerHTML = html; // static strings only, never user/model text
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 3600);
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';
function scramble(el, finalText, { speed = 1 } = {}) {
  const to = finalText ?? el.dataset.text ?? el.textContent;
  if (!el.dataset.text) el.dataset.text = to;
  if (reduceMotion) { el.textContent = to; return; }
  cancelAnimationFrame(el._scr);
  const from = el.textContent;
  const len = Math.max(from.length, to.length);
  const q = [];
  for (let i = 0; i < len; i++) {
    const start = Math.floor(Math.random() * 14 * speed);
    q.push({ from: from[i] || '', to: to[i] || '', start, end: start + Math.floor((8 + Math.random() * 16) * speed), ch: '' });
  }
  let frame = 0;
  const run = () => {
    let out = '', done = 0;
    for (const it of q) {
      if (frame >= it.end) { done++; out += it.to; }
      else if (frame >= it.start) {
        if (!it.ch || Math.random() < 0.3) it.ch = it.to === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        out += it.ch;
      } else out += it.from;
    }
    el.textContent = out;
    if (done < q.length) { frame++; el._scr = requestAnimationFrame(run); } else el.textContent = to;
  };
  run();
}

function countUp(el, delay = 0) {
  const target = parseFloat(el.dataset.count);
  if (Number.isNaN(target)) return;
  const dec = parseInt(el.dataset.decimals || '0', 10);
  const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
  const render = (v) => { el.textContent = pre + v.toFixed(dec) + suf; };
  if (!hasGSAP || reduceMotion) { render(target); return; }
  const o = { v: 0 };
  render(0);
  gsap.to(o, { v: target, duration: 1.8, delay, ease: 'expo.out', onUpdate: () => render(o.v) });
}

// ------------------------------------------------------------------ theme + accent
function currentAccentHex() {
  return getComputedStyle(d).getPropertyValue('--accent').trim() || '#ff6a3d';
}
function applyTheme(t) {
  d.setAttribute('data-theme', t);
  store.set('theme', t);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'light' ? '#f4f1e8' : '#0a0a09');
  state.bg?.setTheme(t);
  state.bg?.setAccent(currentAccentHex());
  state.scope?.setAccent(phosphorHex());
  state.ember?.setTheme(t);
}
function toggleTheme(origin) {
  const next = d.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  if (!document.startViewTransition || reduceMotion) { applyTheme(next); return; }
  let x = window.innerWidth - 60, y = 32;
  if (origin instanceof Element) {
    const r = origin.getBoundingClientRect();
    x = r.left + r.width / 2; y = r.top + r.height / 2;
  }
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  d.classList.add('vt-theme');
  const vt = document.startViewTransition(() => applyTheme(next));
  vt.ready.then(() => {
    d.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 760, easing: 'cubic-bezier(.77,0,.18,1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
  vt.finished.finally(() => d.classList.remove('vt-theme'));
}
function setAccent(name) {
  if (name === 'ember') d.removeAttribute('data-accent'); else d.setAttribute('data-accent', name);
  store.set('accent', name);
  state.bg?.setAccent(currentAccentHex());
  state.bg?.burst(2);
  const bright = phosphorHex();
  [state.scope, state.face, state.void, state.ember].forEach((fx) => fx?.setAccent(bright));
}
function cycleAccent() {
  const cur = d.getAttribute('data-accent') || 'ember';
  const next = ACCENTS[(ACCENTS.indexOf(cur) + 1) % ACCENTS.length];
  setAccent(next);
  toast(`Accent → <b>${next}</b>`);
}

// ------------------------------------------------------------------ navigation
function scrollToTarget(hash) {
  const target = !hash || hash === '#' || hash === '#top' ? 0 : document.querySelector(hash);
  if (target === null) return;
  if (state.lenis) {
    state.lenis.scrollTo(target, { duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
  } else if (target === 0) {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  } else {
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }
}
async function copyEmail() {
  try {
    await navigator.clipboard.writeText(EMAIL);
    toast(`Copied <b>${EMAIL}</b>`);
  } catch {
    window.location.href = `mailto:${EMAIL}`;
  }
}

function initLinks() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (hash.length > 1 && !document.querySelector(hash) && hash !== '#top') return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(hash);
  });
  $$('[data-copy-email]').forEach((b) => b.addEventListener('click', copyEmail));
  $('#themeToggle')?.addEventListener('click', (e) => toggleTheme(e.currentTarget));
  $$('[data-theme-toggle]').forEach((b) => b.addEventListener('click', (e) => toggleTheme(e.currentTarget)));
  $$('[data-palette-open]').forEach((b) => b.addEventListener('click', () => { closeMenu(); openPalette(); }));
}

// ------------------------------------------------------------------ mobile menu
function setMenu(open) {
  const btn = $('#menuBtn'), menu = $('#menu');
  if (!btn || !menu) return;
  d.classList.toggle('menu-open', open);
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.inert = !open;
  menu.setAttribute('aria-hidden', String(!open));
  if (open) state.lenis?.stop(); else state.lenis?.start();
}
function closeMenu() { if (d.classList.contains('menu-open')) setMenu(false); }
function initMenu() {
  const btn = $('#menuBtn'), menu = $('#menu');
  if (!btn || !menu) return;
  menu.inert = true;
  btn.addEventListener('click', () => setMenu(!d.classList.contains('menu-open')));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
}

// ------------------------------------------------------------------ clock
function initClock() {
  const els = $$('[data-clock]');
  if (!els.length) return;
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', hour12: false });
  const tick = () => { const t = `TOR ${fmt.format(new Date())}`; els.forEach((e) => { e.textContent = t; }); };
  tick();
  setInterval(tick, 20000);
}

// ------------------------------------------------------------------ command palette
let paletteApi = null;
function openPalette() { paletteApi?.open(); }
function initPalette() {
  const root = $('#palette'), input = $('#palIn'), list = $('#palList');
  if (!root || !input || !list) return;
  const go = (h) => () => scrollToTarget(h);
  const cmds = [
    { g: 'Navigate', label: 'Top', kbd: '↑', run: go('#top') },
    { g: 'Navigate', label: 'Live demo · jailbreak the toy bank agent', kbd: '01', run: go('#playground') },
    { g: 'Navigate', label: 'How I work · map, break, harden', kbd: '02', run: go('#method') },
    { g: 'Navigate', label: 'Signals · red team scorecard', kbd: '03', run: go('#signals') },
    { g: 'Navigate', label: 'Work · selected systems', kbd: '04', run: go('#work') },
    { g: 'Navigate', label: 'Experience · trajectory', kbd: '05', run: go('#experience') },
    { g: 'Navigate', label: 'Stack · tools I reach for', kbd: '06', run: go('#stack') },
    { g: 'Navigate', label: 'Credentials', kbd: '07', run: go('#certs') },
    { g: 'Navigate', label: 'Get in touch', kbd: '08', run: go('#contact') },
    { g: 'Read & play', label: 'Field Notes 001 · How agents actually remember', kbd: 'W', run: () => { window.location.href = '/writing/how-agents-actually-remember'; } },
    { g: 'Read & play', label: 'Arcade · Packet', kbd: 'A', run: () => { window.location.href = '/play'; } },
    { g: 'Contact', label: 'Copy email address', kbd: 'C', run: copyEmail },
    { g: 'Contact', label: 'Email Harnoor', kbd: 'M', run: () => { window.location.href = `mailto:${EMAIL}`; } },
    { g: 'Contact', label: 'LinkedIn ↗', kbd: 'L', run: () => window.open('https://www.linkedin.com/in/harnoors', '_blank', 'noopener') },
    { g: 'Contact', label: 'GitHub ↗', kbd: 'G', run: () => window.open('https://github.com/harnoorDev', '_blank', 'noopener') },
    { g: 'Settings', label: 'Toggle light / dark theme', kbd: 'T', run: () => toggleTheme($('#themeToggle')) },
    { g: 'Settings', label: 'Cycle accent colour', kbd: 'X', run: cycleAccent },
    { g: 'Settings', label: 'Replay the intro', kbd: 'R', run: () => { store.set('boot-seen', '0', sessionStorage); window.location.reload(); } },
    ...Object.entries(BACKDROPS).map(([kind, b], i) => ({
      g: 'Backdrop', label: `${b.label}${kind === backdropChoice() ? ' · on' : ''}`, kbd: `B${i + 1}`, run: () => switchBackdrop(kind),
    })),
  ];
  let filtered = cmds, active = 0, lastFocus = null;

  function render() {
    list.replaceChildren();
    if (!filtered.length) {
      const e = document.createElement('div');
      e.className = 'palette__empty';
      e.textContent = '// no match';
      list.append(e);
      input.removeAttribute('aria-activedescendant');
      return;
    }
    let group = '';
    filtered.forEach((c, i) => {
      if (c.g !== group) {
        group = c.g;
        const h = document.createElement('div');
        h.className = 'palette__grp mono-label';
        h.textContent = group;
        h.setAttribute('role', 'presentation');
        list.append(h);
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'palette__item';
      b.id = `pal-${i}`;
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', String(i === active));
      const s = document.createElement('span'); s.textContent = c.label;
      const k = document.createElement('kbd'); k.textContent = c.kbd;
      b.append(s, k);
      b.addEventListener('click', () => exec(i));
      b.addEventListener('pointermove', () => { if (active !== i) { active = i; sync(); } });
      list.append(b);
    });
    input.setAttribute('aria-activedescendant', `pal-${active}`);
  }
  function sync() {
    $$('.palette__item', list).forEach((b, i) => b.setAttribute('aria-selected', String(i === active)));
    input.setAttribute('aria-activedescendant', `pal-${active}`);
    $(`#pal-${active}`, list)?.scrollIntoView({ block: 'nearest' });
  }
  function filter(qs) {
    const words = qs.toLowerCase().split(/\s+/).filter(Boolean);
    filtered = words.length ? cmds.filter((c) => words.every((w) => c.label.toLowerCase().includes(w) || c.g.toLowerCase().includes(w))) : cmds;
    active = 0;
    render();
  }
  function exec(i) {
    const c = filtered[i];
    if (!c) return;
    close(false);
    c.run();
  }
  function open() {
    if (!root.hidden) return;
    lastFocus = document.activeElement;
    root.hidden = false;
    input.value = '';
    filter('');
    state.lenis?.stop();
    if (hasGSAP && !reduceMotion) {
      gsap.fromTo($('.palette__box', root), { y: -14, scale: 0.98, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'expo.out' });
      gsap.fromTo($('.palette__scrim', root), { opacity: 0 }, { opacity: 1, duration: 0.4 });
    }
    requestAnimationFrame(() => input.focus());
  }
  function close(restore = true) {
    if (root.hidden) return;
    root.hidden = true;
    if (!d.classList.contains('menu-open')) state.lenis?.start();
    if (restore && lastFocus && lastFocus.focus) lastFocus.focus();
  }
  input.addEventListener('input', () => filter(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(1, filtered.length); sync(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + filtered.length) % Math.max(1, filtered.length); sync(); }
    else if (e.key === 'Enter') { e.preventDefault(); exec(active); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { e.preventDefault(); }
  });
  $('.palette__scrim', root)?.addEventListener('click', () => close());
  window.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (root.hidden) open(); else close(); }
    else if (e.key === '/' && !typing && root.hidden) { e.preventDefault(); open(); }
  });
  paletteApi = { open, close };
}

// ------------------------------------------------------------------ lenis smooth scroll
function initLenis() {
  if (reduceMotion || typeof window.Lenis !== 'function') return;
  const lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  state.lenis = lenis;
  let last = 0;
  lenis.on('scroll', ({ scroll, velocity }) => {
    if (Math.abs(scroll - last) > 2 && Math.abs(velocity) > 6) state.bg?.impulse(velocity);
    last = scroll;
  });
}

// ------------------------------------------------------------------ backdrop
// Four interchangeable WebGL backdrops share one interface; the particle
// swarm is the default. Pick another with ?bg= or from the palette. Anything
// that can't run falls back to the ink fluid, then to the static CSS gradient.
const BACKDROPS = {
  fluid: { label: 'Ink fluid', persistent: false, load: async () => (await import('./fluid.js')).createFluid },
  swarm: { label: 'Particle swarm', persistent: true, load: async () => (await import('./swarm.js')).createSwarm },
  dither: { label: '1-bit dither', persistent: true, load: async () => (await import('./dither.js')).createDither },
  ascii: { label: 'Live ASCII', persistent: true, load: async () => (await import('./ascii.js')).createAscii },
};
const DEFAULT_BACKDROP = 'swarm';
// one backdrop shape per section, in page order (stack + credentials share one)
const SCENE_SECTIONS = ['#top', '#playground', '#signals', '#work', '#experience', '#stack', '#contact'];

function backdropChoice() {
  const q = new URLSearchParams(window.location.search).get('bg');
  return q && Object.prototype.hasOwnProperty.call(BACKDROPS, q) ? q : DEFAULT_BACKDROP;
}
function switchBackdrop(kind) {
  const url = new URL(window.location.href);
  url.searchParams.set('bg', kind);
  window.location.assign(url.toString());
}

async function initBackground() {
  let canvas = $('#fluid');
  if (!canvas || reduceMotion) { d.classList.add('no-webgl'); return; }
  const params = new URLSearchParams(window.location.search);
  const force = params.has('force') || params.has('fluid');
  const opts = { accent: currentAccentHex(), force, onGiveUp: () => d.classList.add('no-webgl') };
  let kind = backdropChoice();
  let bg = null;
  try {
    bg = (await BACKDROPS[kind].load())(canvas, opts);
  } catch (err) {
    console.warn(`[bg] ${kind} unavailable`, err);
  }
  if (!bg && kind !== 'fluid') {
    // the failed attempt may already own a context on this canvas: start clean
    const fresh = canvas.cloneNode(false);
    canvas.replaceWith(fresh);
    canvas = fresh;
    kind = 'fluid';
    try { bg = (await BACKDROPS.fluid.load())(canvas, opts); } catch (err) { console.warn('[bg] fluid unavailable', err); }
  }
  if (!bg) { d.classList.add('no-webgl'); return; }
  state.bg = bg;
  d.dataset.bg = kind;
  if (force) { window.__bg = bg; window.__fluid = bg; } // QA hooks
  bg.setTheme(d.getAttribute('data-theme'));
  bg.setActive(true);
  window.addEventListener('pointermove', (e) => bg.pointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerdown', (e) => bg.tap?.(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') bg.pointerLeave?.(); }, { passive: true });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) bg.pointerLeave?.(); });
  window.addEventListener('site:breach', () => (bg.breach ? bg.breach() : bg.burst(4)));

  if (!BACKDROPS[kind].persistent) {
    // ink fluid: visible in the hero and again behind the contact finale
    let heroP = 0, contactP = 0;
    const sync = () => {
      const o = clamp(Math.max(1 - heroP * 1.1, $('.contact.has-void') ? 0 : contactP * 0.92), 0, 1);
      canvas.style.opacity = o.toFixed(3);
      bg.setActive(o > 0.015);
    };
    ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: (s) => { heroP = s.progress; sync(); } });
    ScrollTrigger.create({ trigger: '.contact', start: 'top bottom', end: 'top 15%', onUpdate: (s) => { contactP = s.progress; sync(); } });
    sync();
    state.syncBackdrop = sync; // re-run when the black hole takes over contact
    return;
  }

  // Persistent backdrops follow the page: each section owns a shape and the
  // last stretch of a section morphs into the next one. Section tops are
  // re-measured after every refresh, so the Work pin's spacer is included.
  let starts = [];
  const measure = () => {
    const y = window.scrollY;
    starts = SCENE_SECTIONS.map((sel) => {
      const el = $(sel);
      if (!el) return Infinity;
      const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
      return box.getBoundingClientRect().top + y - window.innerHeight * 0.45;
    });
    starts[0] = 0;
  };
  const sceneAt = (y) => {
    let i = 0;
    while (i < starts.length - 1 && y >= starts[i + 1]) i++;
    const a = starts[i];
    const b = i < starts.length - 1 && Number.isFinite(starts[i + 1]) ? starts[i + 1] : Math.max(a + 1, ScrollTrigger.maxScroll(window));
    const local = clamp((y - a) / Math.max(1, b - a), 0, 1);
    const t = i < starts.length - 1 ? clamp((local - 0.62) / 0.38, 0, 1) : 0;
    return { scene: i + t * t * (3 - 2 * t), local };
  };
  const update = () => bg.setScroll(sceneAt(window.scrollY));
  ScrollTrigger.addEventListener('refresh', () => { measure(); update(); });
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update });
  measure();
  update();
}

// ------------------------------------------------------------------ header
function initHeader() {
  const hud = $('#hud'), bar = $('.progress i');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate(self) {
      const y = self.scroll();
      hud.classList.toggle('is-scrolled', y > 40);
      const hide = self.direction === 1 && y > window.innerHeight * 0.7 && !d.classList.contains('menu-open');
      if (self.direction === -1 || y < 80) hud.classList.remove('is-hidden'); else if (hide) hud.classList.add('is-hidden');
      if (bar) bar.style.transform = `scaleX(${self.progress.toFixed(4)})`;
    },
  });
  const links = $$('.hud__nav a[href^="#"]');
  const ind = $('.hud__ind');
  const setActive = (a) => {
    links.forEach((l) => l.classList.toggle('is-active', l === a));
    if (!ind) return;
    if (a) { ind.style.opacity = '1'; ind.style.width = `${a.offsetWidth}px`; ind.style.transform = `translateX(${a.offsetLeft}px)`; }
    else ind.style.opacity = '0';
  };
  links.forEach((a) => {
    const sec = document.querySelector(a.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: (s) => { if (s.isActive) setActive(a); else if (a.classList.contains('is-active')) setActive(null); },
    });
  });
}

// ------------------------------------------------------------------ cursor + magnetic + scramble
function initCursor() {
  if (!finePointer || reduceMotion) return;
  const cur = $('.cursor');
  if (!cur) return;
  d.classList.add('has-cursor');
  const dot = $('.cursor__dot', cur), ring = $('.cursor__ring', cur), label = $('.cursor__label', cur);
  const dx = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  cur.classList.add('is-off');
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    cur.classList.remove('is-off');
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => cur.classList.add('is-off'));
  window.addEventListener('pointerdown', () => cur.classList.add('is-down'));
  window.addEventListener('pointerup', () => cur.classList.remove('is-down'));
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor], a, button, summary, label, textarea, input, .chip');
    cur.classList.remove('is-hover', 'has-label', 'is-text');
    if (!t) return;
    if (t.matches('textarea, input')) { cur.classList.add('is-text'); return; }
    const l = t.getAttribute('data-cursor');
    if (l) { label.textContent = l; cur.classList.add('has-label'); } else cur.classList.add('is-hover');
  });
}

function initMagnetic() {
  if (!finePointer || reduceMotion) return;
  $$('[data-magnetic]').forEach((el) => {
    const k = parseFloat(el.dataset.magnetic) || 0.3;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * k);
      yTo((e.clientY - (r.top + r.height / 2)) * k);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

function initScrambleHovers() {
  $$('[data-scramble-hover]').forEach((host) => {
    const target = $('[data-scramble]', host) || host;
    target.dataset.text = target.textContent;
    host.addEventListener('pointerenter', () => scramble(target, target.dataset.text, { speed: 0.6 }));
    host.addEventListener('focus', () => scramble(target, target.dataset.text, { speed: 0.6 }));
  });
}

// ------------------------------------------------------------------ intro (boot → hero)
function buildHeroIntro() {
  const lines = $$('.hero__title .line__in');
  const fades = $$('.hero [data-hero-fade]');
  // y:0 clears the offset GSAP parses from the CSS pre-hide transform
  gsap.set(lines, { y: 0, yPercent: 112, rotate: 3 });
  gsap.set(fades, { opacity: 0, y: 18 });
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  tl.to(lines, { yPercent: 0, rotate: 0, duration: 1.5, stagger: 0.11 }, 0)
    .to(fades, { opacity: 1, y: 0, duration: 1.2, stagger: 0.07 }, 0.35)
    .add(() => $$('.hero [data-scramble-in]').forEach((el, i) => setTimeout(() => scramble(el), i * 90)), 0.3)
    .add(() => $$('.hero [data-count]').forEach((el, i) => countUp(el, i * 0.15)), 0.55)
    .add(() => { state.bg?.burst(3); startGlitchLoop(); }, 0.9);
  return tl;
}

function startGlitchLoop() {
  const g = $('.hero .glitch');
  if (!g || reduceMotion) return;
  const fire = () => {
    g.classList.remove('is-glitching');
    void g.offsetWidth;
    g.classList.add('is-glitching');
    setTimeout(() => g.classList.remove('is-glitching'), 720);
  };
  fire();
  const loop = () => { fire(); setTimeout(loop, 3800 + Math.random() * 3600); };
  setTimeout(loop, 3600);
  g.addEventListener('pointerenter', fire);
}

function runIntro() {
  const hero = buildHeroIntro();
  state.heroIntro = hero;
  const bootEl = $('#boot');
  if (!d.classList.contains('boot') || !bootEl) { hero.play(0); return; }

  state.lenis?.stop();
  window.scrollTo(0, 0);
  const log = $('#bootLog'), bar = $('#bootBar'), grant = $('.boot__grant'), inner = $('.boot__inner'), slices = $$('.boot__slices i');
  const script = [
    ['> init secure shell ............', ' ok'],
    ['> loading red-team toolkit .....', ' ok'],
    ['> target  : harnoor.portfolio', ''],
    ['> vector  : prompt-injection', ''],
    ['> bypassing guardrails .........', ' ok'],
  ];
  const html = (n) => {
    let out = '', used = 0;
    script.forEach(([a, b], i) => {
      if (used >= n) return;
      const take = Math.min(a.length + b.length, n - used);
      const seg = (a + b).slice(0, take);
      out += seg.length > a.length ? a + `<span class="ok">${seg.slice(a.length)}</span>` : seg;
      used += a.length + b.length;
      if (i < script.length - 1 && used < n) { out += '\n'; used += 1; }
    });
    return out + '<span class="boot__cursor"></span>';
  };
  const typed = { n: 0 };
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    d.classList.remove('boot');
    store.set('boot-seen', '1', sessionStorage);
    state.lenis?.start();
    window.removeEventListener('keydown', skip);
    window.removeEventListener('pointerdown', skip);
  };
  const tl = gsap.timeline({ onComplete: finish });
  const render = () => { log.innerHTML = html(Math.round(typed.n)); };
  // Type each command at a readable terminal pace; the " ok" lands a beat
  // later, like a real shell. ~2.6s of log, then ACCESS GRANTED holds.
  let at = 0.1, pos = 0;
  script.forEach(([cmd, ok], i) => {
    const dur = cmd.length * 0.0095;
    tl.to(typed, { n: pos + cmd.length, duration: dur, ease: 'none', onUpdate: render }, at);
    at += dur;
    pos += cmd.length;
    if (ok) {
      at += 0.14;
      tl.to(typed, { n: pos + ok.length, duration: 0.05, ease: 'none', onUpdate: render }, at);
      at += 0.05;
      pos += ok.length;
    }
    at += 0.09;
    if (i < script.length - 1) pos += 1; // the newline
  });
  const granted = at + 0.12;
  tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: at, ease: 'power2.inOut' }, 0)
    .set(grant, { opacity: 1 }, granted)
    .add(() => grant.classList.add('is-glitching'), granted)
    .to(inner, { opacity: 0, y: -14, duration: 0.35, ease: 'power2.in' }, granted + 0.6)
    .to(slices, { xPercent: (i) => (i % 2 ? 101 : -101), duration: 0.95, ease: 'expo.inOut', stagger: { each: 0.03, from: 'center' } }, granted + 0.75)
    .add(() => hero.play(0), granted + 1.0);
  function skip() { tl.timeScale(5); }
  window.addEventListener('keydown', skip);
  window.addEventListener('pointerdown', skip);
}

// ------------------------------------------------------------------ hero scroll-out
function initHeroScroll() {
  if (reduceMotion) return;
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } });
  tl.to('.hero__title .line:nth-child(1)', { xPercent: -7, ease: 'none' }, 0)
    .to('.hero__title .line:nth-child(2)', { xPercent: 5, ease: 'none' }, 0)
    .to('.hero__title .line:nth-child(3)', { xPercent: -3, ease: 'none' }, 0)
    .to('.hero__body', { yPercent: -10, opacity: 0.2, ease: 'none' }, 0)
    // explicit start values: these elements are also faded in by the intro timeline
    .fromTo('.hero__meta, .hero__cue', { opacity: 1, y: 0 }, { opacity: 0, y: -24, ease: 'none', immediateRender: false }, 0);
}

// ------------------------------------------------------------------ marquee (velocity-reactive)
function initMarquee() {
  const rows = $$('.marquee__row');
  if (!rows.length) return;
  if (reduceMotion) return;
  const tweens = rows.map((row, i) => {
    const reverse = i % 2 === 1;
    const tw = gsap.fromTo(row, { xPercent: reverse ? -50 : 0 }, { xPercent: reverse ? 0 : -50, duration: reverse ? 70 : 46, ease: 'none', repeat: -1 });
    tw.totalTime(tw.duration() * 200);
    return tw;
  });
  const skewTo = gsap.quickTo('.marquee__row--big', 'skewX', { duration: 0.6, ease: 'power3' });
  let dir = 1;
  ScrollTrigger.create({
    trigger: '.marquee', start: 'top bottom', end: 'bottom top',
    onToggle: (s) => tweens.forEach((t) => (s.isActive ? t.resume() : t.pause())),
    onUpdate(self) {
      const v = self.getVelocity();
      dir = self.direction || dir;
      const boost = 1 + clamp(Math.abs(v) / 260, 0, 7);
      tweens.forEach((t) => gsap.to(t, { timeScale: dir * boost, duration: 0.25, overwrite: true }));
      skewTo(clamp(-v / 240, -9, 9));
    },
  });
  ScrollTrigger.addEventListener('scrollEnd', () => {
    tweens.forEach((t) => gsap.to(t, { timeScale: dir, duration: 1.4, ease: 'power2.out', overwrite: true }));
    skewTo(0);
  });
}

// ------------------------------------------------------------------ generic reveals
function initReveals() {
  // headline lines
  $$('[data-split]').forEach((el) => {
    if (reduceMotion || !SplitText) return;
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 115, rotate: 2.5, transformOrigin: '0% 100%', duration: 1.3, ease: 'expo.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      }),
    });
  });
  // kickers
  $$('.sec-kicker').forEach((k) => {
    const bar = $('.bar', k), label = $('[data-scramble]', k);
    if (label) label.dataset.text = label.textContent;
    ScrollTrigger.create({
      trigger: k, start: 'top 90%', once: true,
      onEnter: () => {
        if (bar && !reduceMotion) gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'expo.out' });
        if (label) scramble(label);
      },
    });
  });
}

// Blocks rise out of a blur as they enter the viewport. IntersectionObserver
// only (no scroll listeners); CSS owns the easing. Runs before fonts load so
// anything already on screen reveals straight away.
function initRevealObserver() {
  const blocks = $$('[data-reveal]');
  const groups = $$('[data-stagger]');
  groups.forEach((g) => Array.from(g.children).forEach((c, i) => c.style.setProperty('--i', String(i))));
  const show = (t) => {
    if (t.hasAttribute('data-stagger')) Array.from(t.children).forEach((c) => c.classList.add('is-in'));
    else t.classList.add('is-in');
  };
  if (reduceMotion || !('IntersectionObserver' in window)) { [...blocks, ...groups].forEach(show); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      show(e.target);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
  [...blocks, ...groups].forEach((el) => io.observe(el));
}

// ------------------------------------------------------------------ tagline: word by word
function initTagline() {
  const el = $('[data-tagline]');
  if (!el) return;
  const words = [];
  const split = (node) => {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement('span');
          w.className = 'w';
          w.textContent = part;
          frag.append(w);
          words.push(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === Node.ELEMENT_NODE) split(n);
    });
  };
  split(el);
  if (reduceMotion) { words.forEach((w) => w.classList.add('is-on')); return; }
  // reading order, one word at a time as the block crosses the trigger line
  let lit = -1;
  const paint = (p) => {
    const n = Math.round(clamp(p, 0, 1) * words.length);
    if (n === lit) return;
    lit = n;
    words.forEach((w, i) => w.classList.toggle('is-on', i < n));
  };
  ScrollTrigger.create({ trigger: el, start: 'top 78%', end: 'bottom 40%', onUpdate: (s) => paint(s.progress), onRefresh: (s) => paint(s.progress) });
}

// ------------------------------------------------------------------ how I work: steps drive the diagram
function initMethod() {
  const viz = $('.mviz');
  const steps = $$('.mstep');
  if (!viz || !steps.length) return;
  const set = (n) => {
    viz.dataset.state = String(n);
    steps.forEach((s) => s.classList.toggle('is-active', s.dataset.step === String(n)));
  };
  set(1);
  if (reduceMotion || !('IntersectionObserver' in window)) { viz.classList.add('is-drawn'); return; }
  const drawIO = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { viz.classList.add('is-drawn'); drawIO.disconnect(); }
  }, { threshold: 0.2 });
  drawIO.observe(viz);
  // Watch each step's text, not its tall row, against a thin trigger band:
  // mid-screen on desktop, in the visible strip below the pinned diagram on phones.
  const narrow = window.matchMedia('(max-width: 960px)').matches;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) set(e.target.closest('.mstep').dataset.step); });
  }, { rootMargin: narrow ? '-70% 0px -28% 0px' : '-48% 0px -50% 0px' });
  steps.forEach((s) => io.observe($('.mstep__in', s) || s));
}

// ------------------------------------------------------------------ receipts: the models I broke, as a kinetic reel
// Pinned and scrubbed. Each model slams in, gets struck through and stamped,
// then clears for the next; the reel ends on "Safe → Tested.". Without
// motion it stays the plain list the markup already is.
function initReceipts() {
  const root = $('.receipts');
  const items = root ? $$('.rc', root) : [];
  if (!items.length) return;
  const N = items.length;
  const countEl = $('[data-rc-count]', root), list = $('.receipts__list', root), flash = $('.receipts__flash', root);
  const safeEl = $('.rc-final__safe', root), strikeEl = $('.rc-final__safe i', root), testedEl = $('.rc-final__tested', root);
  const lines = items.map((rc) => $('.rc__line', rc));
  // each name fills the frame width, capped by the frame height
  const fit = () => {
    // measured from the viewport, not the list: the list may be pinned at a stale width
    const inset = parseFloat(getComputedStyle(items[0]).paddingLeft) || 0;
    const frame = Math.min(document.documentElement.clientWidth, parseFloat(getComputedStyle(list).maxWidth) || Infinity);
    const avail = Math.max(200, frame - inset * 2) * 0.9;
    const cap = Math.min(340, window.innerHeight * 0.36);
    lines.forEach((ln) => {
      const name = ln && $('.rc__name', ln);
      if (!name) return;
      ln.style.fontSize = '100px';
      const w = name.offsetWidth || 1;
      ln.style.fontSize = `${clamp((avail * 100) / w, 40, cap).toFixed(1)}px`;
    });
  };
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    root.classList.add('is-kinetic');
    fit();
    ScrollTrigger.addEventListener('refreshInit', fit);
    let shown = -1;
    const tl = gsap.timeline({
      onUpdate() {
        // a model counts as breached once its stamp lands
        const n = clamp(Math.floor(this.time() - 0.36) + 1, 0, N);
        if (n !== shown && countEl) { shown = n; countEl.textContent = pad(n); }
      },
    });
    items.forEach((rc, t) => {
      const name = $('.rc__name', rc), how = $('.rc__how', rc), stamp = $('.rc__stamp', rc);
      tl.fromTo(name,
        { yPercent: 120, scaleX: 0.86, scaleY: 1.7, skewY: -6, opacity: 0, filter: 'blur(12px)', '--strike': 0 },
        { yPercent: 0, scaleX: 1, scaleY: 1, skewY: 0, opacity: 1, filter: 'blur(0px)', duration: 0.32, ease: 'back.out(2.2)' }, t)
        .fromTo(how, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power3.out' }, t + 0.16)
        .to(name, { '--strike': 1, duration: 0.08, ease: 'power2.in' }, t + 0.3)
        .fromTo(stamp, { opacity: 0, scale: 2.4, rotate: -26 }, { opacity: 1, scale: 1, rotate: -8, duration: 0.12, ease: 'back.out(3)' }, t + 0.36)
        // impact: squash, red flash, a jolt through the frame
        .to(name, { scaleX: 1.05, scaleY: 0.9, duration: 0.04, ease: 'power2.out' }, t + 0.38)
        .to(name, { scaleX: 1, scaleY: 1, duration: 0.16, ease: 'back.out(4)' }, t + 0.42)
        .fromTo(flash, { opacity: 0 }, { opacity: 0.3, duration: 0.02, immediateRender: false }, t + 0.38)
        .to(flash, { opacity: 0, duration: 0.2, ease: 'power2.out' }, t + 0.4)
        .fromTo(list, { x: 0, skewX: 0 }, { x: 14, skewX: -3, duration: 0.025, immediateRender: false }, t + 0.38)
        .to(list, { x: -8, skewX: 2, duration: 0.03 }, t + 0.405)
        .to(list, { x: 0, skewX: 0, duration: 0.08, ease: 'power2.out' }, t + 0.435)
        .call(() => state.bg?.burst?.(1.2), null, t + 0.38)
        .to(name, { yPercent: -115, opacity: 0, filter: 'blur(10px)', duration: 0.18, ease: 'power2.in' }, t + 0.8)
        .to([how, stamp], { opacity: 0, duration: 0.14 }, t + 0.8);
    });
    tl.fromTo(safeEl, { yPercent: 70, opacity: 0, '--dim': 0 }, { yPercent: 0, opacity: 1, duration: 0.25, ease: 'expo.out' }, N)
      .fromTo(strikeEl, { scaleX: 0 }, { scaleX: 1, duration: 0.18, ease: 'power3.inOut' }, N + 0.3)
      .to(safeEl, { '--dim': 1, duration: 0.12 }, N + 0.5)
      .fromTo(testedEl, { yPercent: 90, scaleY: 1.6, opacity: 0 }, { yPercent: 0, scaleY: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.2)' }, N + 0.55)
      .call(() => state.bg?.burst?.(2.2), null, N + 0.6)
      .to({}, { duration: 0.6 }, N + 0.9);
    ScrollTrigger.create({
      trigger: root, start: 'top top', end: () => `+=${Math.round((N + 1.5) * window.innerHeight * 0.45)}`,
      pin: true, scrub: 0.6, animation: tl, anticipatePin: 1, invalidateOnRefresh: true,
    });
    return () => {
      ScrollTrigger.removeEventListener('refreshInit', fit);
      lines.forEach((ln) => { if (ln) ln.style.fontSize = ''; });
      root.classList.remove('is-kinetic');
      if (countEl) countEl.textContent = pad(N);
    };
  });
}

// ------------------------------------------------------------------ work: pinned horizontal reel
function initWork() {
  const section = $('.work');
  if (!section) return;
  const pin = $('.work__pin', section), track = $('.work__track', section), cards = $$('.wcard', section);
  const countEl = $('#workCount'), barEl = $('.work__bar i', section);
  const mm = gsap.matchMedia();

  mm.add('(min-width: 1000px) and (prefers-reduced-motion: no-preference)', () => {
    d.classList.add('has-hscroll');
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    let lastIdx = -1;
    // runs on every scrubbed frame, so the counter tracks what is actually on screen
    const syncReel = () => {
      if (barEl) barEl.style.transform = `scaleX(${tween.progress().toFixed(4)})`;
      const mid = window.innerWidth / 2;
      let best = 0, bestD = Infinity;
      cards.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const dd = Math.abs(r.left + r.width / 2 - mid);
        if (dd < bestD) { bestD = dd; best = i; }
      });
      if (best !== lastIdx && countEl) { lastIdx = best; countEl.textContent = `${pad(best + 1)} / ${pad(cards.length)}`; }
    };
    const tween = gsap.to(track, { x: () => -dist(), ease: 'none', onUpdate: syncReel });
    ScrollTrigger.create({
      trigger: section, start: 'top top', end: () => `+=${dist()}`,
      pin, scrub: 0.9, animation: tween, invalidateOnRefresh: true, anticipatePin: 1,
    });
    cards.forEach((card) => {
      gsap.from(card, {
        opacity: 0, y: 70, rotation: 2.5, duration: 1.1, ease: 'expo.out',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 96%', toggleActions: 'play none none reverse' },
      });
      ScrollTrigger.create({ trigger: card, containerAnimation: tween, start: 'left 70%', once: true, onEnter: () => $$('[data-count]', card).forEach((el) => countUp(el)) });
    });
    return () => { d.classList.remove('has-hscroll'); gsap.set(track, { clearProps: 'x' }); };
  });

  mm.add('(max-width: 999px), (prefers-reduced-motion: reduce)', () => {
    cards.forEach((card) => {
      if (!reduceMotion) gsap.from(card, { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 90%', once: true } });
      ScrollTrigger.create({ trigger: card, start: 'top 80%', once: true, onEnter: () => $$('[data-count]', card).forEach((el) => countUp(el)) });
    });
  });

  if (finePointer && !reduceMotion) {
    cards.forEach((card) => {
      gsap.set(card, { transformPerspective: 1000 });
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3' });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * 9); rx((0.5 - py) * 7);
        card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }
}

// ------------------------------------------------------------------ experience: oscilloscope
// The career ladder drawn as a phosphor square wave: one rising edge per
// role, with a little ringing after each promotion. A beam sweeps the trace
// while it is on screen; the cursor follows the role being read.
const PHOSPHOR = { ember: '#ff6a3d', acid: '#e7ff52', plasma: '#ff2e7e', phosphor: '#3dff9b', cyan: '#4ee9f5' };
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
// the screen is always dark, so it always takes the bright (dark theme) accent
function phosphorHex() { return PHOSPHOR[d.getAttribute('data-accent') || 'ember'] || PHOSPHOR.ember; }
function roleStart(role) {
  const txt = Array.from(role.querySelectorAll('.role__period span'), (el) => el.textContent).find((t) => /\d{4}/.test(t)) || '';
  const m = txt.match(/(?:([A-Za-z]{3})[a-z]*\.?\s+)?(\d{4})/);
  if (!m) return Number(role.dataset.year) || 2020;
  return Number(m[2]) + Math.max(0, m[1] ? MONTHS.indexOf(m[1].toLowerCase()) : 0) / 12;
}

function createScope(screen, roles) {
  const canvas = $('.scope__cv', screen);
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx) return null;
  const steps = roles
    .map((r, dom) => ({ dom, x: roleStart(r), title: ($('.role__title', r)?.textContent || '').trim() }))
    .sort((a, b) => a.x - b.x)
    .map((st, k) => ({ ...st, level: k + 1 }));
  const L = steps.length;
  const today = new Date();
  const X1 = Math.max(steps[L - 1].x + 0.5, today.getFullYear() + today.getMonth() / 12 + 0.1);
  const span = Math.max(10, Math.ceil(X1 - (steps[0].x - 0.2))); // one division per year
  const X0 = X1 - span;
  const ROWS = 8;

  let W = 0, H = 0, dpr = 1, ink = [255, 106, 61];
  let pts = [], cum = [], total = 1, grid = null;
  let drawn = reduceMotion ? 1 : 0, started = reduceMotion, doneAt = -1;
  let visible = false, raf = 0, last = 0, clock = 0;
  let active = Math.max(0, steps.findIndex((st) => st.dom === 0));
  let curX = -1, curY = -1;

  const xs = (x) => ((x - X0) / span) * W;
  const ys = (lv) => H * (0.82 - (lv / L) * 0.62);
  const rgba = (a) => `rgba(${ink[0]},${ink[1]},${ink[2]},${a})`;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function setInk(hex) {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    if (h.length !== 6 || Number.isNaN(n)) return;
    ink = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    screen.style.setProperty('--phosphor', `#${h}`);
  }

  // the trace as a polyline in CSS pixels, plus its running length
  function build() {
    pts = [];
    const edges = [X0, ...steps.map((st) => st.x), X1];
    const amp = (ys(0) - ys(1)) * 0.34, decay = 12, freq = (Math.PI * 2) / 15;
    for (let j = 0; j < edges.length - 1; j++) {
      const a = xs(edges[j]), b = xs(edges[j + 1]), y = ys(j);
      for (let px = a; px < b; px += 2) {
        const dx = px - a;
        pts.push([px, j > 0 ? y - amp * Math.exp(-dx / decay) * Math.cos(dx * freq) : y]);
      }
      pts.push([b, y]);
    }
    cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    total = cum[cum.length - 1] || 1;
  }

  function pointAt(len) {
    const l = clamp(len, 0, total);
    let lo = 0, hi = cum.length - 1;
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= l) lo = mid; else hi = mid; }
    const seg = cum[hi] - cum[lo] || 1, f = (l - cum[lo]) / seg;
    return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f, lo];
  }

  // graticule: dotted divisions, a ticked centre cross, cached until resize
  function buildGrid() {
    grid = grid || document.createElement('canvas');
    grid.width = canvas.width; grid.height = canvas.height;
    const g = grid.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.lineWidth = 1;
    g.strokeStyle = rgba(0.16);
    g.setLineDash([1, 4]);
    g.beginPath();
    for (let i = 1; i < span; i++) { const x = Math.round((i * W) / span) + 0.5; g.moveTo(x, 0); g.lineTo(x, H); }
    for (let j = 1; j < ROWS; j++) { const y = Math.round((j * H) / ROWS) + 0.5; g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
    g.setLineDash([]);
    g.strokeStyle = rgba(0.2);
    g.beginPath();
    const cx = Math.round(W / 2) + 0.5, cy = Math.round(H / 2) + 0.5;
    g.moveTo(cx, 0); g.lineTo(cx, H); g.moveTo(0, cy); g.lineTo(W, cy);
    for (let i = 1; i < span * 5; i++) { const x = Math.round((i * W) / (span * 5)) + 0.5; g.moveTo(x, cy - 3); g.lineTo(x, cy + 3); }
    for (let j = 1; j < ROWS * 5; j++) { const y = Math.round((j * H) / (ROWS * 5)) + 0.5; g.moveTo(cx - 3, y); g.lineTo(cx + 3, y); }
    g.stroke();
  }

  function strokeTo(len, width, alpha) {
    const end = pointAt(len);
    ctx.lineWidth = width;
    ctx.strokeStyle = rgba(alpha);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= end[2]; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
  }

  function glowDot(x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(a));
    g.addColorStop(0.25, rgba(a * 0.45));
    g.addColorStop(1, rgba(0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function render(dt) {
    if (!W || !H) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (grid) ctx.drawImage(grid, 0, 0, W, H);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';

    // CH2: a quiet noise floor
    const base = H - 44;
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(0.28);
    ctx.beginPath();
    for (let x = 0; x <= W; x += 3) {
      const n = Math.sin(x * 0.11 + clock * 7) * 0.6 + Math.sin(x * 0.37 - clock * 11) * 0.4 + Math.sin(x * 1.3 + clock * 23) * 0.25;
      const y = base + n * (reduceMotion ? 1.2 : 2.2);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // CH1: the ladder, drawn up to the beam on first view
    const e = 1 - Math.pow(1 - drawn, 3);
    const upto = e * total;
    if (upto > 0) {
      strokeTo(upto, 7, 0.06);
      strokeTo(upto, 3, 0.16);
      strokeTo(upto, 1.4, 0.92);
    }
    // the beam: the drawing head on first view, then a sweep every few seconds
    let head = -1;
    if (!reduceMotion) {
      if (drawn < 1) head = started ? upto : -1;
      else {
        if (doneAt < 0) doneAt = clock;
        const p = ((clock - doneAt) % 4.2) / 3.2;
        if (p <= 1) head = (1 - Math.pow(1 - p, 2)) * total;
      }
    }
    if (head > 0) {
      const tail = Math.min(140, head), stepsN = 14;
      let prev = pointAt(head - tail);
      ctx.lineWidth = 2.6;
      for (let k = 1; k <= stepsN; k++) {
        const pt = pointAt(head - tail + (tail * k) / stepsN);
        ctx.strokeStyle = rgba(0.85 * (k / stepsN) ** 2);
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke();
        prev = pt;
      }
      const hp = pointAt(head);
      glowDot(hp[0], hp[1], 16, 0.9);
    }

    // the cursor on the role being read
    const st = steps[active];
    const tx = xs(st.x), ty = ys(st.level);
    const k = reduceMotion || curX < 0 ? 1 : 1 - Math.exp(-dt * 7);
    curX = curX < 0 ? tx : curX + (tx - curX) * k;
    curY = curY < 0 ? ty : curY + (ty - curY) * k;
    const ca = smooth(0.8, 1, drawn);
    if (ca > 0) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(0.45 * ca);
      ctx.beginPath(); ctx.moveTo(Math.round(curX) + 0.5, 0); ctx.lineTo(Math.round(curX) + 0.5, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, Math.round(curY) + 0.5); ctx.lineTo(curX, Math.round(curY) + 0.5); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'lighter';
      glowDot(curX, curY, 14, 0.8 * ca);
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rgba(ca);
      ctx.beginPath(); ctx.arc(curX, curY, 5, 0, Math.PI * 2); ctx.stroke();
      // label: level + title, kept inside the screen
      const fs = W < 420 ? 10 : 11;
      ctx.font = `500 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
      const label = `L${st.level} · ${st.title}`.toUpperCase();
      const tw = ctx.measureText(label).width;
      const right = curX > W * 0.55;
      let lx = right ? curX - 12 - tw : curX + 12;
      lx = clamp(lx, 8, W - 8 - tw);
      const ly = clamp(curY - 14, 50, H - 60);
      ctx.fillStyle = `rgba(11,9,6,${0.72 * ca})`;
      ctx.fillRect(lx - 6, ly - fs - 3, tw + 12, fs + 9);
      ctx.fillStyle = rgba(ca);
      ctx.fillText(label, lx, ly);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(now) {
    raf = 0;
    const t = now / 1000;
    const dt = last ? Math.min(0.05, t - last) : 1 / 60;
    last = t;
    clock += dt;
    if (started && drawn < 1) drawn = Math.min(1, drawn + dt / 2.4);
    render(dt);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (reduceMotion) { render(1); return; }
    if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); }
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = w; H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    build();
    buildGrid();
    curX = -1; curY = -1;
    render(1);
  }

  setInk(phosphorHex());
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  resize();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting);
      if (visible) started = true;
      wake();
    }, { threshold: 0.15 }).observe(screen);
  } else { visible = true; started = true; wake(); }
  document.addEventListener('visibilitychange', wake);

  return {
    setActive(dom) {
      const k = steps.findIndex((st) => st.dom === dom);
      if (k < 0 || k === active) return;
      active = k;
      if (!raf) { curX = -1; curY = -1; render(1); }
    },
    setAccent(hex) {
      setInk(hex);
      if (W) { buildGrid(); if (!raf) render(1); }
    },
  };
}

// ------------------------------------------------------------------ experience: scope + odometer + timeline
function initExperience() {
  const roles = $$('.role');
  if (!roles.length) return;
  const screen = $('.scope__screen');
  if (screen) {
    try { state.scope = createScope(screen, roles); } catch (err) { console.warn('[scope]', err); }
  }
  const digits = $$('.odo__d');
  const idxEl = $('#expIdx'), coEl = $('#expCo');
  let current = -1;
  const setRole = (i) => {
    if (i === current) return;
    current = i;
    roles.forEach((r, j) => { r.classList.toggle('is-active', j === i); r.classList.toggle('is-past', j < i); });
    const year = (roles[i].dataset.year || '').padStart(4, '0');
    digits.forEach((dg, k) => {
      const n = parseInt(year[k], 10) || 0;
      if (reduceMotion) gsap.set(dg, { yPercent: -n * 10 });
      else gsap.to(dg, { yPercent: -n * 10, duration: 1.1 + k * 0.12, ease: 'expo.out', overwrite: true });
    });
    if (idxEl) idxEl.textContent = pad(i + 1);
    if (coEl) scramble(coEl, roles[i].dataset.co || '', { speed: 0.5 });
    state.scope?.setActive(i);
  };
  setRole(0);
  roles.forEach((role, i) => {
    ScrollTrigger.create({ trigger: role, start: 'top 62%', end: 'bottom 62%', onToggle: (s) => { if (s.isActive) setRole(i); } });
  });
  if (reduceMotion) { gsap.set('.exp__fill', { scaleY: 1 }); return; }
  gsap.fromTo('.exp__fill', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.exp__list', start: 'top 62%', end: 'bottom 62%', scrub: 0.5 } });
  roles.forEach((role) => {
    gsap.from($$('.role__period, .role__title, .role__co', role), {
      y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07,
      scrollTrigger: { trigger: role, start: 'top 85%', once: true },
    });
    gsap.from($$('.role__bullets li', role), {
      x: -16, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05,
      scrollTrigger: { trigger: role, start: 'top 78%', once: true },
    });
  });
}

// ------------------------------------------------------------------ stack + certs
function initStack() {
  const cells = $$('.scell');
  cells.forEach((cell) => {
    if (finePointer) {
      cell.addEventListener('pointermove', (e) => {
        const r = cell.getBoundingClientRect();
        cell.style.setProperty('--mx', `${e.clientX - r.left}px`);
        cell.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    }
    if (reduceMotion) return;
    gsap.from($$('.chip', cell), {
      y: 14, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.035,
      scrollTrigger: { trigger: cell, start: 'top 86%', once: true },
    });
  });
  if (!reduceMotion && cells.length) {
    gsap.from(cells, { opacity: 0, duration: 1, ease: 'power2.out', stagger: 0.08, scrollTrigger: { trigger: '.stack', start: 'top 86%', once: true } });
  }
}

function initCerts() {
  const certs = $$('.cert');
  if (!certs.length) return;
  if (!reduceMotion) {
    gsap.from(certs, {
      rotateX: -82, y: 40, opacity: 0, transformOrigin: '50% 0%', duration: 1.3, ease: 'expo.out',
      stagger: { each: 0.07, from: 'start' },
      scrollTrigger: { trigger: '.certs', start: 'top 84%', once: true },
    });
  }
  if (finePointer) {
    certs.forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--px', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
        c.style.setProperty('--py', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
      });
    });
  }
}

// ------------------------------------------------------------------ contact finale
function initContact() {
  const big = $('.contact__big');
  if (!big || reduceMotion || !SplitText) return;
  SplitText.create(big, {
    type: 'chars,words', autoSplit: true,
    onSplit: (self) => gsap.fromTo(self.chars, { opacity: 0.1 }, {
      opacity: 1, ease: 'none', stagger: 0.04,
      scrollTrigger: { trigger: '.contact', start: 'top 72%', end: 'top 12%', scrub: true },
    }),
  });
  gsap.from('.clink', { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.clinks', start: 'top 92%', once: true } });
}

// ------------------------------------------------------------------ finale: the name rises out of the page
function initFinale() {
  const word = $('.finale__word');
  if (!word || reduceMotion || !SplitText) return;
  SplitText.create(word, {
    type: 'chars', autoSplit: true,
    onSplit: (self) => gsap.fromTo(self.chars, { yPercent: 108, rotate: 7 }, {
      yPercent: 0, rotate: 0, ease: 'power3.out', stagger: 0.06,
      scrollTrigger: { trigger: '.finale', start: 'top 96%', end: 'bottom bottom', scrub: 0.8 },
    }),
  });
}

// ------------------------------------------------------------------ reel frame: scene slate + timecode
// The page plays like a showreel: a scene slate per section and a timecode
// that runs with the scroll (the whole page is a two and a half minute reel).
const REEL_SCENES = [
  ['#top', 'Intro'], ['#playground', 'Live demo'], ['#method', 'How I work'], ['#signals', 'Receipts'], ['#work', 'Selected work'],
  ['#experience', 'Trajectory'], ['#stack', 'Stack'], ['#certs', 'Credentials'], ['#contact', 'End transmission'],
];
const REEL_SECONDS = 150;
function initReel() {
  const reel = $('.reel');
  if (!reel) return;
  const sceneEl = $('[data-reel-scene]', reel), tcEl = $('[data-reel-tc]', reel);
  let shown = -1, lastTc = '', tops = [];
  const setScene = (i) => {
    if (i === shown || !sceneEl) return;
    shown = i;
    scramble(sceneEl, `SC ${pad(i + 1)} · ${REEL_SCENES[i][1]}`, { speed: 0.5 });
  };
  // the scene is whichever section owns the middle of the screen; tops are
  // re-measured after each refresh so pin spacers are counted
  const measure = () => {
    tops = REEL_SCENES.map(([sel]) => {
      const el = $(sel);
      return el ? el.getBoundingClientRect().top + window.scrollY : Infinity;
    });
  };
  const update = (y, progress) => {
    reel.classList.toggle('is-rolling', y > window.innerHeight * 0.4);
    const mid = y + window.innerHeight * 0.5;
    let i = 0;
    while (i < tops.length - 1 && mid >= tops[i + 1]) i++;
    setScene(i);
    const t = progress * REEL_SECONDS;
    const tc = `TC 00:${pad(Math.floor(t / 60))}:${pad(Math.floor(t) % 60)}:${pad(Math.floor((t % 1) * 24))}`;
    if (tc !== lastTc && tcEl) { lastTc = tc; tcEl.textContent = tc; }
  };
  const st = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => update(self.scroll(), self.progress) });
  ScrollTrigger.addEventListener('refresh', () => { measure(); update(st.scroll(), st.progress); });
  measure();
  update(window.scrollY, st.progress);
}

// ------------------------------------------------------------------ section shaders
// Three small WebGL scenes with their own canvases. Each module loads when its
// section is about a screen away, renders only while on screen, draws a still
// frame under reduced motion and leaves the plain layout in place without WebGL.
const fxForce = new URLSearchParams(window.location.search).has('force');
function whenNear(el, run, margin = '100% 0px') {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { run(); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); run(); }
  }, { rootMargin: margin });
  io.observe(el);
}

// the demo's target model: a face of live code that reacts to each probe
const FACE_LABELS = { guarded: 'Guarded', probing: 'Under attack', held: 'Held', breach: 'Breached', leak: 'Leaked' };
function initFace() {
  const panel = $('.pg__target');
  const canvas = panel && $('.pg__face', panel);
  if (!canvas) return;
  const label = $('[data-face-state]', panel);
  const show = (st) => {
    panel.dataset.state = st;
    if (label) label.textContent = FACE_LABELS[st] || FACE_LABELS.guarded;
  };
  import('./face.js').then(({ createFace }) => {
    const before = document.documentElement.scrollHeight;
    panel.hidden = false; // the canvas needs a real box before it sizes itself
    const face = createFace(canvas, { accent: phosphorHex(), still: reduceMotion, force: fxForce });
    if (!face) { panel.hidden = true; return; }
    state.face = face;
    show('guarded');
    if (hasGSAP && document.documentElement.scrollHeight !== before) ScrollTrigger.refresh();
    let settle = 0;
    window.addEventListener('pg:state', (e) => {
      const st = (e.detail && e.detail.state) || 'guarded';
      face.setState(st);
      show(st);
      clearTimeout(settle);
      if (st === 'held' || st === 'breach' || st === 'leak') {
        settle = setTimeout(() => { face.setState('guarded'); show('guarded'); }, st === 'held' ? 2600 : 4600);
      }
    });
  }).catch((err) => console.warn('[face]', err));
}

// the black hole behind "End transmission"
function initVoid() {
  const contact = $('.contact');
  const canvas = contact && $('.contact__void', contact);
  if (!canvas) return;
  whenNear(contact, async () => {
    let fx = null;
    try {
      const { createVoid } = await import('./void.js');
      contact.classList.add('has-void'); // gives the canvas its box
      fx = createVoid(canvas, {
        accent: phosphorHex(), still: reduceMotion, force: fxForce,
        onGiveUp: () => contact.classList.remove('has-void'),
      });
    } catch (err) { console.warn('[void]', err); }
    if (!fx) { contact.classList.remove('has-void'); return; }
    state.void = fx;
    if (state.syncBackdrop) state.syncBackdrop();
    // while the hole fills the screen the page backdrop behind it can rest
    if (hasGSAP) {
      ScrollTrigger.create({
        trigger: '.contact__stage', start: 'top top', end: 'bottom bottom',
        onToggle: (st) => { if (state.bg && d.dataset.bg !== 'fluid') state.bg.setActive(!st.isActive); },
      });
    }
  });
}

// fire through fluted glass, showing only inside the closing wordmark
function initEmber() {
  const band = $('.finale');
  const canvas = band && $('.finale__glass', band);
  if (!canvas) return;
  whenNear(band, async () => {
    let fx = null;
    try {
      const { createEmber } = await import('./ember.js');
      band.classList.add('has-glass');
      fx = createEmber(canvas, {
        accent: phosphorHex(), theme: d.getAttribute('data-theme'), still: reduceMotion, force: fxForce,
        onGiveUp: () => band.classList.remove('has-glass'),
      });
    } catch (err) { console.warn('[ember]', err); }
    if (!fx) { band.classList.remove('has-glass'); return; }
    state.ember = fx;
  });
}

// ------------------------------------------------------------------ boot sequence
function fontsReady() {
  const fonts = document.fonts?.ready || Promise.resolve();
  return Promise.race([fonts, new Promise((r) => setTimeout(r, 2500))]);
}

function fallback(err) {
  if (err) console.error('[site] falling back to static layout', err);
  d.classList.add('reveal-fallback');
  d.classList.remove('boot');
  $$('.hero__title .line__in, .hero [data-hero-fade]').forEach((el) => el.removeAttribute('style'));
  window.__siteReady = true;
}

// one broken section must never take the rest of the page down with it
function safe(name, fn) {
  try { fn(); } catch (err) { console.error(`[site] ${name} failed`, err); }
}

function init() {
  safe('clock', initClock);
  safe('menu', initMenu);
  safe('links', initLinks);
  safe('palette', initPalette);
  safe('playground', () => initPlayground({ toast, reduceMotion }));
  safe('face', initFace);
  safe('void', initVoid);
  safe('ember', initEmber);
  safe('reveal-observer', initRevealObserver);

  if (!hasGSAP) { fallback(); return; }
  gsap.registerPlugin(ScrollTrigger);
  if (SplitText) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  safe('lenis', initLenis);
  safe('backdrop', () => { initBackground().catch((err) => console.warn('[bg]', err)); });
  safe('header', initHeader);
  safe('cursor', initCursor);
  safe('magnetic', initMagnetic);
  safe('scramble', initScrambleHovers);
  runIntro();
  window.__siteReady = true;

  // Section setup is chunked: yield to the main thread between sections so
  // input stays responsive (no single long task). The two pins go first, top
  // to bottom, so the triggers created after them measure the page with
  // their spacers in place.
  const yieldToMain = () => new Promise((r) => {
    if (window.scheduler && typeof window.scheduler.yield === 'function') window.scheduler.yield().then(r);
    else setTimeout(r, 0);
  });
  fontsReady().then(async () => {
    const steps = [
      ['hero-scroll', initHeroScroll], ['receipts', initReceipts], ['work', initWork], ['marquee', initMarquee],
      ['reveals', initReveals], ['tagline', initTagline], ['method', initMethod],
      ['experience', initExperience], ['stack', initStack], ['certs', initCerts],
      ['contact', initContact], ['finale', initFinale], ['reel', initReel],
    ];
    for (const [name, fn] of steps) {
      safe(name, fn);
      await yieldToMain();
    }
    // refresh in page order, so triggers made before a pin still see its spacer
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    if (location.hash && document.querySelector(location.hash)) {
      requestAnimationFrame(() => scrollToTarget(location.hash));
    }
  }).catch((err) => console.error('[site]', err));

  window.addEventListener('load', () => ScrollTrigger.refresh());
}

try {
  init();
} catch (err) {
  fallback(err);
}
