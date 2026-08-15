/**
 * Search backends.
 *
 * DuckDuckGo: scrapes https://html.duckduckgo.com/html/?q=... (no key needed).
 * SearXNG:   hits any public instance's /search?format=json.
 *
 * Both return a normalized shape:
 *   { title, url, snippet, source }
 */
import { URL } from 'node:url';

// Public SearXNG instances we can fall back to if user has no preference.
// These are well-known public ones — not all are reliable at any moment.
const SEARXNG_INSTANCES = [
  'https://searx.be',
  'https://search.mdosch.de',
  'https://searxng.site',
  'https://paulgo.io',
];

const URL_REGEX = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i;

export function isUrl(input) {
  if (!input) return false;
  // Must look like a URL (contain a dot, no spaces)
  if (/\s/.test(input)) return false;
  return URL_REGEX.test(input);
}

// --- DuckDuckGo (HTML endpoint) --------------------------------------------

const DDG_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * Hit DDG's HTML endpoint and parse out the result list.
 * DDG's HTML pages are simple enough to grep with regexes.
 */
export async function searchDuckDuckGo(query, { limit = 12 } = {}) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: DDG_HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`DDG responded ${res.status}`);
  const html = await res.text();

  const results = parseDdgHtml(html);
  if (results.length === 0) {
    throw new Error('No results parsed from DDG (possibly blocked)');
  }
  return results.slice(0, limit);
}

/**
 * DDG's HTML is structured like:
 *   <h2 class="result__a"><a href="//duckduckgo.com/l/?uddg=...">Title</a></h2>
 *   <a class="result__url" href="...">https://example.com</a>
 *   <a class="result__snippet">Snippet text...</a>
 *
 * The uddg= redirect is awkward; we resolve it to the actual URL.
 */
function parseDdgHtml(html) {
  const results = [];
  // Capture each <div class="result ..."> ... </div> block.
  // We use a lazy quantifier on the body and limit by counting </div> at depth.
  // Simpler: split on `<div class="result ` since DDG always wraps each result.
  const blocks = html.split('<div class="result ').slice(1);
  for (const block of blocks) {
    // Title from <h2 class="result__a"><a ...>TITLE</a></h2>
    const titleMatch = block.match(
      /<h2[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/h2>/,
    );
    if (!titleMatch) continue;
    const title = stripTags(titleMatch[1]).trim();
    if (!title) continue;

    // URL from the anchor's href, which is normally the uddg= wrapper.
    // Try the title anchor first, then fall back to the result__url line.
    let realUrl = null;
    const hrefMatch =
      block.match(/href="([^"]+)"/) ||
      block.match(/href='([^']+)'/);
    if (hrefMatch) {
      realUrl = unwrapDdgUrl(hrefMatch[1]);
    }
    if (!realUrl) continue;

    // Snippet from <a class="result__snippet"> or <div class="result__snippet">
    let snippet = '';
    const snipMatch =
      block.match(/result__snippet[^>]*>([\s\S]*?)<\/a>/) ||
      block.match(/result__snippet[^>]*>([\s\S]*?)<\/div>/);
    if (snipMatch) snippet = stripTags(snipMatch[1]).trim();
    if (!snippet) {
      // Sometimes the snippet text is just loose in the block
      const loose = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (loose.length < 300) snippet = loose;
    }

    // Source favicon / domain
    let source = '';
    try {
      source = new URL(realUrl).hostname.replace(/^www\./, '');
    } catch {}

    results.push({ title, url: realUrl, snippet, source });
  }
  return results;
}

/**
 * DDG wraps every outbound link in a redirect: //duckduckgo.com/l/?uddg=<base64>&...
 * Extract the real URL from there, otherwise return the original.
 */
function unwrapDdgUrl(href) {
  if (href.startsWith('//')) href = 'https:' + href;
  if (href.includes('uddg=')) {
    try {
      const u = new URL(href);
      const uddg = u.searchParams.get('uddg');
      if (uddg) return uddg;
    } catch {}
  }
  return href;
}

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// --- SearXNG ---------------------------------------------------------------

/**
 * Try a few public SearXNG instances and use whichever returns usable JSON.
 */
export async function searchSearXNG(query, { limit = 12 } = {}) {
  let lastErr;
  for (const inst of SEARXNG_INSTANCES) {
    try {
      const url = `${inst}/search?format=json&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        lastErr = new Error(`${inst} → ${res.status}`);
        continue;
      }
      const data = await res.json();
      const results = (data.results || [])
        .filter((r) => r.url && r.title)
        .map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content || '',
          source: (() => {
            try {
              return new URL(r.url).hostname.replace(/^www\./, '');
            } catch {
              return '';
            }
          })(),
        }));
      if (results.length > 0) return results.slice(0, limit);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('No SearXNG instance responded');
}
