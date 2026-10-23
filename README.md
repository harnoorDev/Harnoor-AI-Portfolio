# iamharnoor.com · v4

Harnoor Singh's portfolio. A static site with a cinematic motion layer, plus one
Vercel function that powers the live "jailbreak a toy banking agent" demo.

## Stack

- **No build step.** Plain HTML/CSS/ES modules served from `public/`.
- **Motion:** GSAP 3.15 (ScrollTrigger + SplitText) and Lenis 1.3 smooth scroll,
  vendored under `public/assets/vendor/` (versioned paths, cached immutably).
- **WebGL ink:** `public/assets/js/fluid.js`, a stable-fluids solver (curl,
  vorticity, Jacobi pressure, advection) with a shaded display pass. It runs only
  while the hero or contact section is on screen, pauses when the tab is hidden,
  and falls back to a static gradient without WebGL or with reduced motion.
- **API:** `api/probe.mjs` calls Claude behind a hardened system prompt.

## Layout

```
api/probe.mjs                 live demo backend (Vercel Node function)
public/index.html             home page
public/assets/css/site.css    design tokens + all styles
public/assets/js/theme-init.js  pre-paint theme/accent + failsafes
public/assets/js/main.js      motion system, palette, cursor, sections
public/assets/js/fluid.js     WebGL fluid simulation
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
