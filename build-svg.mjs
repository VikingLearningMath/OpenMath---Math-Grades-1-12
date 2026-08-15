import { readFileSync, writeFileSync } from 'node:fs';

// Read the fully self-contained static HTML
let html = readFileSync('/home/brad/proxy-site/index.html', 'utf8');
html = html.replace(/^<!DOCTYPE html>\s*/, '');
html = html.replace(/<html lang="en">/, '<html xmlns="http://www.w3.org/1999/xhtml" lang="en">');

// ---------------------------------------------------------------
// Convert the HTML into well-formed XHTML so it can live inside an
// SVG <foreignObject> (which a browser parses as strict XML).
//   1. Escape '&' -> '&amp;' in markup (outside script/style CDATA).
//   2. Self-close void elements: hr, meta, link, input, img, br, etc.
//   3. Give boolean attributes explicit values.
//   4. Wrap inline <script>/<style> bodies in <![CDATA[...]]>.
// ---------------------------------------------------------------

const VOID_RE = /<(hr|meta|link|input|img|br|source|area|base|col|embed|param|track|wbr)(\b[^>]*?)(\/?)>/gi;
const BOOL_ATTRS = ['hidden', 'novalidate', 'required', 'checked', 'disabled', 'selected', 'readonly', 'multiple', 'autofocus', 'defer', 'async', 'loop', 'muted', 'controls', 'open', 'reversed', 'truespeed'];

// Parse a start tag's attributes, respecting quoted values (including spaces).
// Emits well-formed XHTML: boolean attrs get explicit values, values are
// quote-and-ampersand escaped, and void elements are self-closed.
function fixStartTag(m, tag, rest, selfClosing) {
  const attrsStr = rest.trim();
  const tokens = [];
  // name (bare) or name="..." / name='...' / name=unquoted
  const attrRe = /([a-zA-Z_:][a-zA-Z0-9_:.\-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let t;
  attrRe.lastIndex = 0;
  while ((t = attrRe.exec(attrsStr))) {
    const name = t[1];
    const hasValue = t[2] !== undefined || t[3] !== undefined || t[4] !== undefined;
    let raw;
    if (hasValue) {
      const val = t[2] !== undefined ? t[2] : (t[3] !== undefined ? t[3] : t[4]);
      const esc = val.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      raw = ' ' + name + '="' + esc + '"';
    } else {
      // Boolean (or bare) attribute -> give it an explicit value for XHTML.
      const low = name.toLowerCase();
      raw = ' ' + low + '="' + (BOOL_ATTRS.includes(low) ? name : name) + '"';
    }
    tokens.push(raw);
  }
  return '<' + tag + tokens.join('') + (selfClosing ? ' />' : '>');
}

// Split into markup segments and raw (script/style) segments.
function transform(text) {
  const parts = [];
  let last = 0;
  const re = /<(script|style)\b[^>]*>/gi;
  let m;
  while ((m = re.exec(text))) {
    parts.push({ type: 'markup', text: text.slice(last, m.index) });
    const tag = m[0];
    const closeRe = new RegExp('</' + m[1] + '\\s*>', 'ig');
    closeRe.lastIndex = re.lastIndex;
    const cm = closeRe.exec(text);
    if (cm) {
      parts.push({ type: 'raw', tag, content: text.slice(re.lastIndex, cm.index), close: cm[0] });
      re.lastIndex = closeRe.lastIndex;
      last = closeRe.lastIndex;
    } else {
      parts.push({ type: 'raw', tag, content: text.slice(re.lastIndex), close: '' });
      last = text.length;
      re.lastIndex = text.length;
      break;
    }
  }
  parts.push({ type: 'markup', text: text.slice(last) });
  return parts;
}

const VOID_SET = new Set(['hr', 'meta', 'link', 'input', 'img', 'br', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);

let out = '';
for (const seg of transform(html)) {
  if (seg.type === 'markup') {
    let t = seg.text;
    // process each start tag: fix boolean attrs + self-close void elements.
    t = t.replace(/<([a-zA-Z][a-zA-Z0-9:]*)(\b[^>]*?)(\/?)>/g, function (m, tag, rest, slash) {
      const selfClosing = !!slash || VOID_SET.has(tag.toLowerCase());
      return fixStartTag(m, tag, rest, selfClosing);
    });
    // escape stray & that aren't part of entities already
    t = t.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
    out += t;
  } else {
    // raw script/style -> wrap body in CDATA so JS/CSS stay intact
    out += seg.tag + '<![CDATA[' + seg.content + ']]>' + seg.close;
  }
}

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="100%" height="100%">' +
  '<foreignObject width="100%" height="100%" requiredExtensions="http://www.w3.org/1999/xhtml">' +
  out +
  '</foreignObject></svg>';

writeFileSync('/home/brad/proxy-site/svg/viking.svg', svg);
console.log('Wrote /home/brad/proxy-site/svg/viking.svg', svg.length, 'bytes');
