# Viking Proxy + Openmathlearning

A personal web proxy with an easter egg, built fully from scratch. **100% open source.**

## What's here

- **`/`** — the Viking home page (black + gold, animated blobs, "Welcome to Viking" typewriter)
- **`/math`** — **Openmathlearning**, a K–12 math site (formulas, skills, interactive tools)
  - Secret easter egg: click **🔒 Sign in** → enter **`viking` / `viking`** → opens the Viking proxy
- **`/proxy`** — the Viking proxy UI (search + site proxying)
- **`/p?u=<base64>`** — server-side proxy that fetches & rewrites sites
- **`/api/search`** — DuckDuckGo / SearXNG search

## Stack (open source)

- **Express** (MIT) — web server
- **http-proxy** (MIT) — proxying
- **ws** (MIT) — websockets (optional)
- **DuckDuckGo / SearXNG** — search backends

## Run it locally

```bash
npm install
PORT=8123 npm start
# → http://localhost:8123
```

## Deploy on GitHub + jsDelivr

> ⚠️ **Important:** jsDelivr serves **static files only** — it cannot run the Node server. So the **server-side proxy (`/p`, `/api/search`) will not work from a jsDelivr URL.** The static pages (Viking home, math site) will load fine.

### GitHub (for the code)
```bash
git init
git add .
git commit -m "Viking proxy + Openmathlearning"
git branch -M main
git remote add origin https://github.com/<YOU>/<REPO>.git
git push -u origin main
```

### jsDelivr (static pages only)
After pushing, open:
```
https://cdn.jsdelivr.net/gh/<YOU>/<REPO>@<COMMIT_SHA>/public/index.html
```
But the proxy itself still needs the Node server (local or a PaaS like Render — note many ban open proxies).

## Recommended for a live, working proxy

Keep the **Node server running yourself** (local machine, or your own VPS) and expose it with a tunnel (e.g. `cloudflared tunnel --url http://localhost:8123`) — this keeps the fast server-side proxy and never gets taken down for hosting a proxy. Use GitHub/jsDelivr only for the static pages / for sharing the code.

---

## Static version (runs on jsDelivr, no server needed)

The **root `index.html`** is a fully self-contained static build: Viking home +
Openmathlearning math site + a **client-side proxy** (search & site-fetch via the
open-source CORS proxy `api.allorigins.win`). No Node server required — it runs
from any static host, including jsDelivr.

Regenerate it from the `public/` source (after editing math/viking files):
```bash
node build-static.mjs
```

### jsDelivr link
After pushing to GitHub, your shareable static link is:
```
https://cdn.jsdelivr.net/gh/<YOU>/<REPO>@main/index.html
```
Example (once the repo is public):
```
https://cdn.jsdelivr.net/gh/brad/viking-proxy@main/index.html
```
> First push can take 1–2 min to appear on jsDelivr; a new repo may need a moment before the first cache. Pin a git tag (`@v1.0.0`) for a permanent link.

**Static caveats:** the client-side proxy is slower and some sites block CORS
proxies — search + text sites work; heavy JS sites may not. The fast server-side
proxy still needs the Node server (see above).
