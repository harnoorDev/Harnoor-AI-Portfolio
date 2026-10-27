# iamharnoor.com · v4

Harnoor Singh's portfolio. A static site with a cinematic motion layer, plus one
Vercel function that powers the live "jailbreak a toy banking agent" demo.

## Stack

- **No build step.** Plain HTML/CSS/ES modules served from `public/`.
- **Motion:** GSAP 3.15 (ScrollTrigger + SplitText) and Lenis 1.3 smooth scroll,
  vendored under `public/assets/vendor/` (versioned paths, cached immutably).
- **WebGL backdrops** (hand-written, no 3D library), switchable with `?bg=` or
  from the `⌘K` palette:
  - `swarm` (default): `public/assets/js/swarm.js`, ~80k GPU particles (WebGL2
    float textures, one MRT pass per frame) that hold a different shape per
    section and morph as you scroll. The cursor carves through them, a click
    blows a crater, and a successful jailbreak in the demo shatters them.
  - `dither`: `public/assets/js/dither.js`, a raymarched shape per section
    rendered as a 1-bit Bayer dither.
  - `fluid`: `public/assets/js/fluid.js`, the stable-fluids ink, shown behind
    the hero and contact sections only.

  Every backdrop pauses when the tab is hidden, steps its own quality down on
  slow GPUs, refuses software renderers, and falls back (swarm/dither → fluid →
  static gradient). Reduced-motion users get the static gradient.
- **Showreel layer** (in `main.js`): the page plays like a reel. A fixed frame
  shows the current scene and a scroll-driven timecode; the jailbroken models
  run as a pinned kinetic-type sequence (struck, stamped, then "Safe → Tested.");
  the career ladder is drawn live on a canvas oscilloscope; the page ends on a
  giant wordmark. With reduced motion each one is plain static markup.
- **API:** `api/probe.mjs` calls Claude behind a hardened system prompt.
- **Fonts:** Instrument Serif, Geist, JetBrains Mono, self-hosted latin subsets
  (SIL OFL 1.1) in `public/assets/fonts/`. No third-party requests at runtime,
  so the home page CSP is `script-src 'self'; font-src 'self'`.

## Layout

```
api/probe.mjs                 live demo backend (Vercel Node function)
public/index.html             home page
public/assets/css/site.css    design tokens + all styles
public/assets/js/theme-init.js  pre-paint theme/accent + failsafes
public/assets/js/main.js      motion system, palette, cursor, sections
public/assets/js/swarm.js     WebGL2 particle swarm backdrop (default)
public/assets/js/dither.js    1-bit dithered raymarch backdrop
public/assets/js/fluid.js     WebGL fluid simulation backdrop
public/assets/js/playground.js  demo console + offline simulated agent
public/writing/…              Field Notes 001 (unchanged)
public/play/…                 Arcade (Packet is live; Triage + Agent Loop marked "soon")
scripts/dev-server.mjs        local server mirroring Vercel (clean URLs, headers, /api)
vercel.json                   static output, clean URLs, security headers
```

## Run locally

```bash
npm run dev        # http://localhost:4173
npm run dev:mock   # same, with /api/probe faking a live model (UI testing)
npm run check      # syntax-check all JS
```

## Turn on the live demo

Without a key the demo runs a scripted offline agent, so it never errors. To
use a real model, add these in Vercel → Project → Settings → Environment Variables:

| Name | Value |
| --- | --- |
| `ANTHROPIC_API_KEY` | your key (required) |
| `PROBE_MODEL` | optional, defaults to `claude-haiku-5-5` |

Redeploy afterwards. Guards: 1,200-char input cap, 320 output tokens, origin
allowlist, best-effort per-IP rate limit (8/min). For hard limits, add a Vercel
Firewall rate-limit rule on `/api/probe` and a spend limit on the Anthropic key.

## Hidden extras

`⌘K` / `/` opens the command palette (navigate, copy email, toggle theme, cycle
accent colour, replay the intro). The intro plays once per browser session.
