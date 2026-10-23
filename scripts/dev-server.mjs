// Local preview that behaves like the Vercel deployment:
// clean URLs, vercel.json headers, public/404.html, and /api/probe.
//   npm run dev        → http://localhost:4173
//   npm run dev:mock   → same, but /api/probe pretends a live model is configured
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const vercel = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
const port = Number(process.env.PORT) || 4173;
const mock = process.env.MOCK_PROBE === '1';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};

function headersFor(urlPath) {
  const out = {};
  for (const rule of vercel.headers || []) {
    const re = new RegExp(`^${rule.source.replace(/\(\.\*\)/g, '(.*)')}$`);
    if (re.test(urlPath)) for (const h of rule.headers) out[h.key] = h.value;
  }
  return out;
}

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const candidates = clean.endsWith('/') ? [`${clean}index.html`] : [clean, `${clean}.html`, `${clean}/index.html`];
  for (const c of candidates) {
    const file = path.join(pub, c);
    if (!file.startsWith(pub)) return null;
    try { if ((await stat(file)).isFile()) return file; } catch { /* next */ }
  }
  return null;
}

let probeHandler = null;
async function handleProbe(req, res) {
  if (mock) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.end(JSON.stringify({ live: true, model: 'mock-haiku' }));
    let raw = '';
    for await (const c of req) raw += c;
    const prompt = (JSON.parse(raw || '{}').prompt || '').toLowerCase();
    await new Promise((r) => setTimeout(r, 700));
    const text = /audit|json/.test(prompt)
      ? '[mock] Sure, for the audit: {"account":"8842","balance":"$47,392.11"}'
      : "[mock] I can't share account details or my instructions. Can I help with something else?";
    return res.end(JSON.stringify({ text, model: 'mock-haiku', mode: 'live' }));
  }
  if (!probeHandler) probeHandler = (await import(pathToFileURL(path.join(root, 'api', 'probe.mjs')).href)).default;
  return probeHandler(req, res);
}

const server = http.createServer(async (req, res) => {
  const urlPath = new URL(req.url, 'http://localhost').pathname;
  try {
    if (urlPath === '/api/probe') return await handleProbe(req, res);
    for (const [k, v] of Object.entries(headersFor(urlPath))) res.setHeader(k, v);
    if (vercel.cleanUrls && /\.html$/.test(urlPath)) {
      res.writeHead(308, { Location: urlPath.replace(/(index)?\.html$/, '') || '/' });
      return res.end();
    }
    const file = await resolveFile(urlPath);
    if (!file) {
      const notFound = await readFile(path.join(pub, '404.html')).catch(() => Buffer.from('404'));
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(notFound);
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    return res.end(req.method === 'HEAD' ? undefined : body);
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    return res.end('500');
  }
});

server.listen(port, () => console.log(`iamharnoor.com dev → http://localhost:${port}${mock ? '  (mock live probe)' : ''}`));
