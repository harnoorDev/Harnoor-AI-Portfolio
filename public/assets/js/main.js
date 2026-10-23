// main.js · motion system + interactions for iamharnoor.com (v4)
import { createFluid } from './fluid.js';
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
const state = { lenis: null, fluid: null, heroIntro: null };

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
  state.fluid?.setTheme(t);
  state.fluid?.setAccent(currentAccentHex());
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
  state.fluid?.setAccent(currentAccentHex());
  state.fluid?.burst(2);
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
    { g: 'Navigate', label: 'Signals · red-team scorecard', kbd: '02', run: go('#signals') },
    { g: 'Navigate', label: 'Work · selected systems', kbd: '03', run: go('#work') },
    { g: 'Navigate', label: 'Experience · trajectory', kbd: '04', run: go('#experience') },
    { g: 'Navigate', label: 'Stack · tools I reach for', kbd: '05', run: go('#stack') },
    { g: 'Navigate', label: 'Credentials', kbd: '06', run: go('#certs') },
    { g: 'Navigate', label: 'Contact', kbd: '07', run: go('#contact') },
    { g: 'Read & play', label: 'Field Notes 001 · How agents actually remember', kbd: 'W', run: () => { window.location.href = '/writing/how-agents-actually-remember'; } },
    { g: 'Read & play', label: 'Arcade · Packet', kbd: 'A', run: () => { window.location.href = '/play'; } },
    { g: 'Contact', label: 'Copy email address', kbd: 'C', run: copyEmail },
    { g: 'Contact', label: 'Email Harnoor', kbd: 'M', run: () => { window.location.href = `mailto:${EMAIL}`; } },
    { g: 'Contact', label: 'LinkedIn ↗', kbd: 'L', run: () => window.open('https://www.linkedin.com/in/harnoors', '_blank', 'noopener') },
    { g: 'Contact', label: 'GitHub ↗', kbd: 'G', run: () => window.open('https://github.com/harnoorDev', '_blank', 'noopener') },
    { g: 'Settings', label: 'Toggle light / dark theme', kbd: 'T', run: () => toggleTheme($('#themeToggle')) },
    { g: 'Settings', label: 'Cycle accent colour', kbd: 'X', run: cycleAccent },
    { g: 'Settings', label: 'Replay the intro', kbd: 'R', run: () => { store.set('boot-seen', '0', sessionStorage); window.location.reload(); } },
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
    if (Math.abs(scroll - last) > 2 && Math.abs(velocity) > 6) state.fluid?.impulse(velocity);
    last = scroll;
  });
}

// ------------------------------------------------------------------ fluid ink
function initFluid() {
  const canvas = $('#fluid');
  if (!canvas || reduceMotion) { d.classList.add('no-webgl'); return; }
  let fluid = null;
  try {
    fluid = createFluid(canvas, {
      accent: currentAccentHex(),
      force: new URLSearchParams(window.location.search).has('fluid'),
      onGiveUp: () => d.classList.add('no-webgl'),
    });
  } catch (err) {
    console.warn('[fluid]', err);
  }
  if (!fluid) { d.classList.add('no-webgl'); return; }
  state.fluid = fluid;
  if (new URLSearchParams(window.location.search).has('fluid')) window.__fluid = fluid; // QA hook
  fluid.setTheme(d.getAttribute('data-theme'));
  fluid.setActive(true);
  window.addEventListener('pointermove', (e) => fluid.pointer(e.clientX, e.clientY), { passive: true });

  // visible in the hero and again behind the contact finale
  let heroP = 0, contactP = 0;
  const sync = () => {
    const o = clamp(Math.max(1 - heroP * 1.1, contactP * 0.92), 0, 1);
    canvas.style.opacity = o.toFixed(3);
    fluid.setActive(o > 0.015);
  };
  ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: (s) => { heroP = s.progress; sync(); } });
  ScrollTrigger.create({ trigger: '.contact', start: 'top bottom', end: 'top 15%', onUpdate: (s) => { contactP = s.progress; sync(); } });
  sync();
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
    .add(() => { state.fluid?.burst(3); startGlitchLoop(); }, 0.9);
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
  const plain = script.map(([a, b]) => a + b).join('\n');
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
  tl.to(typed, { n: plain.length, duration: 1.15, ease: 'none', onUpdate: () => { log.innerHTML = html(Math.round(typed.n)); } }, 0)
    .fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1.25, ease: 'power2.inOut' }, 0)
    .set(grant, { opacity: 1 }, 1.3)
    .add(() => grant.classList.add('is-glitching'), 1.3)
    .to(inner, { opacity: 0, y: -14, duration: 0.35, ease: 'power2.in' }, 1.95)
    .to(slices, { xPercent: (i) => (i % 2 ? 101 : -101), duration: 0.95, ease: 'expo.inOut', stagger: { each: 0.03, from: 'center' } }, 2.1)
    .add(() => hero.play(0), 2.35);
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
  if (reduceMotion) return;
  // paragraphs / blocks
  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, { y: 44, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  // staggered groups
  $$('[data-stagger]').forEach((group) => {
    const kids = Array.from(group.children);
    gsap.from(kids, {
      y: 36, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07,
      scrollTrigger: { trigger: group, start: 'top 88%', once: true },
    });
  });
}

// ------------------------------------------------------------------ signals scorecard
function initScorecard() {
  const rows = $$('.score__row');
  const counter = $('#scoreCount');
  if (!rows.length) return;
  const total = rows.length;
  let broken = 0;
  let queue = Promise.resolve();
  const breakRow = (row) => new Promise((resolve) => {
    const bar = $('.score__bar i', row), stamp = $('.score__stamp', row), model = $('.score__model', row);
    gsap.timeline({ onComplete: resolve })
      .fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: 'power3.inOut' })
      .add(() => {
        row.classList.add('is-broken', 'is-flash');
        broken++;
        if (counter) counter.textContent = `${pad(broken)} / ${pad(total)} breached`;
        if (model) { model.classList.add('glitch', 'is-glitching'); model.dataset.text = model.textContent; setTimeout(() => model.classList.remove('is-glitching'), 650); }
      })
      .fromTo(stamp, { opacity: 0, scale: 1.9, rotate: -18 }, { opacity: 1, scale: 1, rotate: -4, duration: 0.42, ease: 'back.out(2.6)' }, '<');
  });
  if (reduceMotion) {
    rows.forEach((r) => r.classList.add('is-broken'));
    if (counter) counter.textContent = `${pad(total)} / ${pad(total)} breached`;
    return;
  }
  if (counter) counter.textContent = `00 / ${pad(total)} breached`;
  rows.forEach((row) => {
    gsap.set(row, { opacity: 0, y: 26 });
    ScrollTrigger.create({
      trigger: row, start: 'top 84%', once: true,
      onEnter: () => {
        gsap.to(row, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' });
        queue = queue.then(() => breakRow(row));
      },
    });
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

// ------------------------------------------------------------------ experience: odometer + timeline
function initExperience() {
  const roles = $$('.role');
  if (!roles.length) return;
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

  if (!hasGSAP) { fallback(); return; }
  gsap.registerPlugin(ScrollTrigger);
  if (SplitText) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  safe('lenis', initLenis);
  safe('fluid', initFluid);
  safe('header', initHeader);
  safe('cursor', initCursor);
  safe('magnetic', initMagnetic);
  safe('scramble', initScrambleHovers);
  runIntro();
  window.__siteReady = true;

  fontsReady().then(() => {
    safe('hero-scroll', initHeroScroll);
    safe('marquee', initMarquee);
    safe('reveals', initReveals);
    safe('scorecard', initScorecard);
    safe('work', initWork);
    safe('experience', initExperience);
    safe('stack', initStack);
    safe('certs', initCerts);
    safe('contact', initContact);
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
