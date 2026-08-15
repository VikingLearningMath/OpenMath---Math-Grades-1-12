/**
 * Viking proxy server.
 *
 * Architecture:
 *   - Static assets served from /public
 *   - /             → home page (search bar)
 *   - /& or /proxy  → proxy landing page (search results + utility bar)
 *   - /p?u=<base64> → server-side fetches the URL, rewrites HTML/links,
 *                      serves it back inline so the user sees the proxied site
 *                      with relative URLs rewritten through /p too.
 *   - /api/search?q=… → hits DuckDuckGo HTML, returns JSON
 *   - /api/health    → { ok: true }
 */
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { searchDuckDuckGo, searchSearXNG } from './search.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC = path.join(__dirname, '..', 'public');
const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// A random secret used as a non-guessable path for the Viking proxy landing.
// Regenerated each server start so even if a URL leaks, it goes stale on restart.
// The HTML/JS bundle gets this string baked in via a tiny init script so the
// "sign-in → open proxy" flow can resolve it.
const SECRET_PATH = '/' + crypto.randomBytes(8).toString('hex');
// Easter-egg credentials. Same non-discoverable idea: only the server knows them,
// and the client learns them by asking the server.
const EGG_USER = (process.env.EGG_USER || 'viking').toLowerCase();
const EGG_PASS = process.env.EGG_PASS || 'viking';

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '8kb' }));

// ----- API: search (DDG primary, SearXNG fallback) -----
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const source = (req.query.source || 'ddg').toString();
  if (!q) return res.status(400).json({ error: 'missing q' });
  try {
    let results;
    try {
      results = source === 'searxng'
        ? await searchSearXNG(q)
        : await searchDuckDuckGo(q);
    } catch (_e) {
      // fall through to the other backend
      results = source === 'searxng'
        ? await searchDuckDuckGo(q)
        : await searchSearXNG(q);
    }
    res.json({ results });
  } catch (e) {
    console.error('search error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ----- /p?u=<base64>: the actual proxy -----
//
// Fetches the destination URL server-side, rewrites relative URLs to
// go through /p too, then serves the result with appropriate headers.
app.get('/p', async (req, res) => {
  const u = req.query.u;
  if (!u) return res.status(400).send('missing u');
  let url;
  try {
    const padded = u + '='.repeat((4 - (u.length % 4)) % 4);
    url = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  } catch (e) {
    return res.status(400).send('bad u');
  }
  if (!/^https?:\/\//.test(url)) return res.status(400).send('bad url');

  let upstream;
  try {
    upstream = await fetch(url, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (compatible)',
        'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
        'Accept': req.headers.accept || '*/*',
      },
      redirect: 'manual',
    });
  } catch (e) {
    return res.status(502).send('upstream fetch failed: ' + e.message);
  }

  // Follow redirects locally too: 3xx → return a redirect the client can hit
  if ([301, 302, 303, 307, 308].includes(upstream.status)) {
    const loc = upstream.headers.get('location');
    if (loc) {
      try {
        const abs = new URL(loc, url).toString();
        return res.redirect(302, '/p?u=' + Buffer.from(abs).toString('base64')
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
      } catch {}
    }
  }

  // Pass through status & most headers (with some cleanup)
  res.status(upstream.status);
  const ctype = upstream.headers.get('content-type') || 'application/octet-stream';
  res.setHeader('Content-Type', ctype);
  res.setHeader('Access-Control-Allow-Origin', '*');

  // For HTML: rewrite URLs so relative links go through /p
  if (ctype.includes('text/html') || ctype.includes('application/xhtml')) {
    let html = await upstream.text();
    html = rewriteHtml(html, url);
    res.send(html);
  } else {
    // For non-HTML: stream bytes through
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  }
});

// ----- Static files + named pages -----
app.use(express.static(PUBLIC, {
  setHeaders(res, p) {
    if (p.endsWith('.html') || p.endsWith('.css') || p.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// Page routes
// Landing page — the original Viking home (Welcome to... typewriter).
app.get(['/'], (_req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));
// The math site (Openmathlearning) is still reachable at /math (and /math/).
app.get(['/math', '/math/'], (_req, res) => res.sendFile(path.join(PUBLIC, 'home.html')));
// Public alias to the Viking proxy landing (same UI as the secret path) so the
// home search and the /proxy?q= flow can reach it directly.
app.get('/proxy', (_req, res) => res.sendFile(path.join(PUBLIC, 'proxy.html')));
// The secret Viking-proxy landing URL. Anyone who can guess this hex string
// is welcome in; everyone else uses the in-app sign-in flow which fetches
// the URL via /api/_unlock.
app.get(SECRET_PATH, (_req, res) => res.sendFile(path.join(PUBLIC, 'proxy.html')));
// Settings page is also reachable via the secret path (it's used inside the proxy UI).
app.get('/settings', (_req, res) => res.sendFile(path.join(PUBLIC, 'settings.html')));

// Non-discoverable endpoint: signs a password into a redirect URL.
// The client passes user/pw; on success we return { ok, path: SECRET_PATH }.
// On failure we return 403 so the client knows to show an error.
app.post('/api/_unlock', (req, res) => {
  const u = String((req.body?.u) || '').toLowerCase();
  const p = String(req.body?.p || '');
  if (u === EGG_USER && p === EGG_PASS) {
    return res.json({ ok: true, path: SECRET_PATH });
  }
  res.status(403).json({ ok: false, error: 'invalid' });
});
// The SECRET_PATH itself, returned as a tiny JS snippet so it can be
// inlined into a page without exposing it in plain HTML.
app.get('/api/_init.js', (_req, res) => {
  res.type('application/javascript').send(
    `window.__SECRET_PATH__=${JSON.stringify(SECRET_PATH)};` +
    `window.__EGG_USER__=${JSON.stringify(EGG_USER)};` +
    `window.__EGG_PASS__=${JSON.stringify(EGG_PASS)};`
  );
});

// ----- helpers -----

/**
 * Rewrite HTML so that relative URLs (src/href/action) go through our /p
 * endpoint. Uses the upstream URL to resolve absolutes. Absolute URLs to
 * other domains are passed through (we still proxy them via /p so cookies
 * and CORS behave consistently for the user).
 */
function rewriteHtml(html, baseUrl) {
  const base = new URL(baseUrl);

  // href="..." / src="..." / action="..."
  // We rewrite to /p?u=<b64>; absolute URLs become proxied too so the user
  // sees the page in our wrapper and follows links through us.
  html = html.replace(
    /(\b(?:href|src|action)\s*=\s*["'])([^"']+)(["'])/gi,
    (_m, pre, url, post) => {
      try {
        const abs = new URL(url, base).toString();
        return pre + proxyUrl(abs) + post;
      } catch {
        return pre + url + post;
      }
    },
  );
  // Same for srcset and CSS url(...) — keep simple, only do href/src/action
  return html;
}

function proxyUrl(abs) {
  const b64 = Buffer.from(abs).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return '/p?u=' + b64;
}

const server = http.createServer(app);
server.listen(PORT, HOST, () => {
  console.log(`Viking proxy listening on http://${HOST}:${PORT}`);
});
