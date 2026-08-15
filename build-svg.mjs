import { readFileSync, writeFileSync } from 'node:fs';

// Read the fully self-contained static HTML
let html = readFileSync('/home/brad/proxy-site/index.html', 'utf8');
html = html.replace(/^<!DOCTYPE html>\s*/, '');
html = html.replace(/<html lang="en">/, '<html xmlns="http://www.w3.org/1999/xhtml" lang="en">');

// ---------------------------------------------------------------
// Statically pre-render the math content so the SVG shows a real,
// populated math page (scripts don't run inside SVG <foreignObject>).
//   - extract GRADES + CONTENT from the embedded script
//   - inject grade pills, topic list, and the first topic's cards
// ---------------------------------------------------------------
function extractBalanced(src, fromIdx) {
  // src[fromIdx] should be '[' or '{'. Return the balanced literal text.
  const open = src[fromIdx];
  const close = open === '[' ? ']' : '}';
  let depth = 0, inStr = null, i = fromIdx;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === '\'') { inStr = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) return src.slice(fromIdx, i + 1); }
  }
  return null;
}
let GRADES = [], CONTENT = {};
try {
  const gStart = html.indexOf('const GRADES =');
  if (gStart >= 0) { const gi = gStart + 'const GRADES ='.length; const g = extractBalanced(html, html.indexOf('[', gi)); if (g) GRADES = eval(g); }
  const cStart = html.indexOf('const CONTENT =');
  if (cStart >= 0) { const ci = cStart + 'const CONTENT ='.length; const c = extractBalanced(html, html.indexOf('{', ci)); if (c) CONTENT = eval('(' + c + ')'); }
} catch (e) { console.warn('math extract warning:', e.message); }
function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function buildMathHtml() {
  // Grade pills: each grade + an active "All".
  const pills = ['<button class="grade-pill active" data-grade="all">All</button>'];
  for (const g of GRADES) pills.push('<button class="grade-pill" data-grade="' + esc(g.id) + '">' + esc(g.short) + '</button>');
  const gradesHtml = pills.join('');
  // Topic list: use all grades, first topic active.
  const items = [];
  for (const g of GRADES) for (const t of (CONTENT[g.id] || {}).topics || []) items.push({ grade: g, topic: t });
  const topicsHtml = items.map((it, idx) =>
    '<div class="topic-item' + (idx === 0 ? ' active' : '') + '" data-topic="' + esc(it.topic.id) + '">' +
    '<span>' + esc(it.topic.title) + '</span><span class="badge">' + esc(it.grade.short) + '</span></div>'
  ).join('');
  // Content: first topic.
  const first = items[0];
  let contentHtml = '';
  if (first) {
    const t = first.topic;
    const cards = (t.formulas || []).map(f =>
      '<div class="formula-card"><h4>' + esc(f.name) + '</h4><div class="expr">' + esc(f.formula) + '</div><p>' + esc(f.description) + '</p></div>'
    ).join('');
    const skills = (t.skills || []).map(s => '<div class="skill">' + esc(s) + '</div>').join('');
    contentHtml =
      '<div class="topic-head"><h2>' + esc(t.title) + '</h2><p>' + esc(t.blurb || '') + '</p>' +
      '<span class="meta">' + esc(first.grade.label) + ' · ' + esc(first.grade.short) + '</span></div>' +
      (cards ? '<div class="section-title">Formulas</div><div class="formula-grid">' + cards + '</div>' : '') +
      (skills ? '<div class="section-title">Skills to practice</div><div class="skills">' + skills + '</div>' : '');
  }
  return { gradesHtml, topicsHtml, contentHtml };
}
{
  const m = buildMathHtml();
  html = html.replace(/(<section class="grades" id="gradePicker"[^>]*>)[\s\S]*?(<\/section>)/, '$1' + m.gradesHtml + '$2');
  html = html.replace(/(<div class="topic-list" id="topicList"[^>]*>)[\s\S]*?(<\/div>)/, '$1' + m.topicsHtml + '$2');
  html = html.replace(/(<section class="content" id="content"[^>]*>)[\s\S]*?(<\/section>)/, '$1' + m.contentHtml + '$2');
}

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
