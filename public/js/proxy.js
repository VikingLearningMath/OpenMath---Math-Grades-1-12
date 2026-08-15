// /js/proxy.js — the proxy page.
//
// Three modes:
//   1. Landing (no ?q=): show search bar centered, wait for input.
//   2. ?q=<term>: hit DDG via our /api/search, render results as links
//      to /p?u=<base64-url>. Each link opens the proxied site in an iframe.
//   3. /p?u=<base64>: fetch and serve the URL inline (the actual proxy work
//      happens server-side via a redirect/meta-refresh to the proxied URL,
//      or we inline the response into the iframe).

// URL detection
const URL_REGEX = new RegExp(
  '^(https?:\\/\\/)?' +
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
    '((\\d{1,3}\\.){3}\\d{1,3}))' +
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
    '(\\?[;&a-z\\d%_.~+=-]*)?' +
    '(\\#[-a-z\\d_]*)?$',
  'i',
);

// Tiny base64 helpers for /p?u= encoding
function b64enc(s) {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64dec(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return atob(s);
}


const gInput = document.getElementById('gointospace');
const gAddr = document.getElementById('addr');
const gForm = document.getElementById('formintospace');
const gCenter = document.getElementById('centerSearch');
const gResults = document.getElementById('results');
const gPane = document.getElementById('resultsPane');
const gIframe = document.getElementById('intospace');
const gSpinner = document.getElementById('spinner');

function showSpinner(on) {
  if (gSpinner) gSpinner.style.display = on ? 'block' : 'none';
}

async function doSearch(query) {
  if (!query) return;
  if (URL_REGEX.test(query)) {
    // Treat as URL — proxy it directly.
    openProxyUrl(query.includes('://') ? query : 'http://' + query);
    return;
  }
  // Hide the centered search, show results pane
  gCenter.style.display = 'none';
  gPane.style.display = 'block';
  gResults.innerHTML = '<p style="color:#888">Searching…</p>';
  try {
    const r = await fetch('/api/search?q=' + encodeURIComponent(query));
    const data = await r.json();
    if (!data.results || data.results.length === 0) {
      gResults.innerHTML = '<p style="color:#888">No results.</p>';
      return;
    }
    gResults.innerHTML = data.results.map((res) => `
      <div class="result" style="margin-bottom:20px;padding:14px;border-radius:10px;background:#0a0a0a;border:1px solid #1a1a1a;">
        <a class="result__url" style="color:#b8860b;font-size:13px;display:block;text-decoration:none;">${escapeHtml(res.source)}</a>
        <a class="result__title" data-url="${escapeAttr(res.url)}" href="#"
           style="color:#ffcc00;font-size:18px;font-weight:600;display:block;margin:4px 0;text-decoration:none;">
          ${escapeHtml(res.title)}
        </a>
        <p style="color:#aaa;font-size:14px;margin:0;">${escapeHtml(res.snippet)}</p>
      </div>
    `).join('');
    // Wire up the result links
    gResults.querySelectorAll('a.result__title').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        openProxyUrl(a.dataset.url);
      });
    });
  } catch (e) {
    gResults.innerHTML = '<p style="color:#ff5555">Search failed: ' + escapeHtml(e.message) + '</p>';
  }
}

function openProxyUrl(url) {
  showSpinner(true);
  // Server-side fetches and rewrites the page.
  location.href = '/p?u=' + b64enc(url);
}

// Escape helpers
function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

// Bind the centered search bar
gForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  doSearch(gInput.value.trim());
});
gInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); doSearch(gInput.value.trim()); }
});
gAddr?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); doSearch(gAddr.value.trim()); }
});

// Top-bar buttons
document.getElementById('homeBtn')?.addEventListener('click', () => {
  // Reset to landing state
  gCenter.style.display = 'block';
  gPane.style.display = 'none';
  gIframe.style.display = 'none';
  document.getElementById('utilityBar').style.display = 'none';
});
document.getElementById('refreshBtn')?.addEventListener('click', () => location.reload());
document.getElementById('backBtn')?.addEventListener('click', () => history.back());
document.getElementById('forwardBtn')?.addEventListener('click', () => history.forward());
document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.();
});

// Handle ?q= on load: do a search and render results in-page.
const q = new URLSearchParams(location.search).get('q');
if (q) {
  doSearch(q.trim());
}
