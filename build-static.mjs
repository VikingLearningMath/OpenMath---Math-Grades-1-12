import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const base = '/home/brad/proxy-site/public';
const out = '/home/brad/proxy-site/STATIC-README.md';

// ---- Math site assets (converted from ESM to globals) ----
const mathCss = readFileSync(path.join(base, 'app.css'), 'utf8');
let dataJs = readFileSync(path.join(base, 'data.js'), 'utf8')
  .replace(/export const GRADES\s*=/g, 'const GRADES =')
  .replace(/export const CONTENT\s*=/g, 'const CONTENT =');
let toolsJs = readFileSync(path.join(base, 'tools.js'), 'utf8')
  .replace(/export function renderTool/g, 'function renderTool');
let bundleJs = readFileSync(path.join(base, 'bundle.js'), 'utf8')
  .replace(/import\{GRADES,CONTENT\}from\s*'[^']*';/, '')
  .replace(/import\{renderTool\}from\s*'[^']*';/, '');
// Strip the original setupSignIn() (it calls a server /api/_unlock) and the
// DOMContentLoaded bootstrapping. In the static build, initMath() calls the
// three rendering functions directly and a separate handler manages the
// viking/viking easter egg client-side.
bundleJs = bundleJs.replace(/function setupSignIn\(\)\{[\s\S]*?\}document\.addEventListener\('DOMContentLoaded',\(\)=>\{buildGradePills\(\);renderTopicList\(\);renderContent\(\);setupSignIn\(\)\}\)/, '');

// ---- Viking home page (the typewriter + blobs) ----
const vikingHtml = readFileSync(path.join(base, 'index.html'), 'utf8');

// Build the single self-contained index.html
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Viking</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" />
<style>
/* ================= VIKING THEME (home + proxy) ================= */
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; min-height: 100vh; }
.vk { color: #ffcc00; font-family: 'DM Sans', system-ui, sans-serif; background: #000; overflow-x: hidden; }
.vk a { color: inherit; text-decoration: none; }
@keyframes vk-fade { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes vk-blob { 0%,100% { transform: translate(0,0) scale(1);} 33% { transform: translate(40px,-20px) scale(1.05);} 66% { transform: translate(-30px,20px) scale(.95);} }
.vk-nav { position: fixed; top: 0; left: 0; width: 70px; height: 100vh; background: rgba(0,0,0,.95); backdrop-filter: blur(20px); border-right: 1px solid #1a1a1a; z-index: 9999999; list-style: none; padding: 0; }
.vk-nav li { display: flex; align-items: center; justify-content: center; height: 50px; margin-top: 8px; }
.vk-nav .logo { width: 36px; height: 36px; font-size: 30px; display:flex; align-items:center; justify-content:center; color:#ffd700; }
.vk-nav hr { width: 60%; margin: 4px auto; border: none; border-top: 1px solid #1a1a1a; }
.vk-nav a { color: #ffcc00; font-size: 22px; padding: 8px; border-radius: 8px; transition: background .15s; }
.vk-nav a:hover { background: #1a1a1a; color: #ffd700; }
.vk-nav a.active { color:#ffd700; background: rgba(255,204,0,.12); }
.vk-blob, .vk-b2, .vk-b3, .vk-b4 { position: fixed; z-index: -998; pointer-events: none; }
.vk-blob { width:500px; height:500px; background: radial-gradient(circle,#ffcc00 0%,transparent 70%); border-radius:50%; top:-100px; left:-100px; animation: vk-blob 25s infinite ease-in-out; }
.vk-b2 { width:800px; height:800px; background: radial-gradient(circle,#b8860b 0%,transparent 70%); border-radius:50%; bottom:-300px; right:-200px; animation: vk-blob 35s infinite ease-in-out; }
.vk-b3 { width:300px; height:300px; background: radial-gradient(circle,#ffd54a 0%,transparent 70%); border-radius:50%; top:30%; right:10%; animation: vk-blob 20s infinite ease-in-out; }
.vk-b4 { width:400px; height:400px; background: radial-gradient(circle,#7c4a00 0%,transparent 70%); border-radius:50%; top:60%; left:10%; animation: vk-blob 30s infinite ease-in-out; }
.vk-home { position: absolute; top: 50%; left: calc(70px + 50%); transform: translate(-50%,-50%); text-align: center; width: 800px; max-width: 90vw; animation: vk-fade 1s; }
.vk-home h1 { font-size: clamp(34px,7vw,72px); font-weight: 800; letter-spacing: -.02em; color: #ffd700; text-shadow: 0 0 40px rgba(255,204,0,.4); }
.vk-home p { color: #ffcc00; margin-top: 12px; font-size: 17px; }
.vk-search { margin-top: 26px; display: flex; align-items: center; background: #0a0a0a; border: 1px solid #ffcc00; border-radius: 40px; padding: 0 18px; height: 58px; max-width: 640px; margin-left:auto; margin-right:auto; }
.vk-search:focus-within { border-color: #ffd700; box-shadow: 0 0 20px rgba(255,204,0,.18); }
.vk-search input { flex: 1; background: transparent; border: none; outline: none; color: #ffd700; font-size: 17px; font-family: inherit; }
.vk-search button { background: transparent; border: none; cursor: pointer; color: #ffcc00; font-size: 22px; }
.vk-util { position: fixed; top: 0; left: 70px; right: 0; height: 58px; background: rgba(0,0,0,.95); backdrop-filter: blur(20px); border-bottom: 1px solid #1a1a1a; z-index: 999999; display:none; align-items: center; padding: 0 14px; gap: 8px; }
.vk-util .ic { display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:8px; cursor:pointer; color:#aaa; font-size:20px; transition: background .15s, color .15s; user-select:none; }
.vk-util .ic:hover { background:#1a1a1a; color:#ffcc00; }
.vk-util .addr { flex:1; max-width:640px; background:#0a0a0a; border:1px solid #1a1a1a; border-radius:30px; padding:0 18px; height:42px; color:#ffd700; font-size:15px; font-family:inherit; outline:none; }
.vk-util .addr:focus { border-color:#ffcc00; }
.vk-results { display:none; padding: 100px 40px 40px 100px; }
.vk-result { background:#0a0a0a; border:1px solid #1a1a1a; border-radius:10px; padding:14px; margin-bottom:14px; }
.vk-result .u { color:#b8860b; font-size:13px; display:block; word-break:break-all; }
.vk-result .t { color:#ffcc00; font-size:18px; font-weight:600; display:block; margin:4px 0; cursor:pointer; }
.vk-result .t:hover { color:#ffd700; text-decoration:underline; }
.vk-result .s { color:#aaa; font-size:14px; margin:0; }
.vk-frame { position: fixed; top:58px; left:70px; right:0; bottom:0; width: calc(100vw - 70px); border:none; background:#fff; display:none; z-index: 999998; }
.vk-spin { display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,.4); z-index:9999999; }
.vk-spin .ring { position:absolute; top:50%; left:50%; width:60px; height:60px; border:4px solid rgba(255,204,0,.2); border-top-color:#ffcc00; border-radius:50%; animation: vkspin .8s linear infinite; transform:translate(-50%,-50%); }
@keyframes vkspin { from { transform: translate(-50%,-50%) rotate(0); } to { transform: translate(-50%,-50%) rotate(360deg); } }

/* ================= MATH THEME ================= */
${mathCss}

.view { display: none; }
.view.active { display: block; }
#vkHomeView.minHeight { min-height: 100vh; position: relative; }
</style>
</head>
<body class="vk">

<!-- ============ VIEW 1: VIKING HOME ============ -->
<div id="vkHomeView" class="view active vk minHeight">
  <ul class="vk-nav">
    <li style="margin-left:-1px;margin-top:2px"><span class="logo">⚡</span></li>
    <hr style="margin-top:5px"><li><a href="#" id="vNavHome" class="active">⌂</a></li><hr>
    <li><a href="#" id="vNavMath">∑</a></li><hr>
    <li><a href="#" id="vNavProxy">⇄</a></li>
  </ul>
  <div class="vk-blob"></div><div class="vk-b2"></div><div class="vk-b3"></div><div class="vk-b4"></div>
  <div class="vk-home">
    <h1>Welcome to <span class="typewrite" data-period="2000" data-type='[ "Viking.","adventure.","exploration.", "power.","the open web.","valhalla.","freedom.","speed.","the seven seas.","your gateway.","aesthetic.","privacy."]'><span class="wrap"></span></span></h1>
    <p>Search, browse, and explore — powered by an open proxy.</p>
    <div class="vk-search" id="vkHomeSearch">
      <input id="vkHomeInput" placeholder="Search or enter a URL…" aria-label="Search or enter URL" />
      <button id="vkHomeBtn">➤</button>
    </div>
  </div>
</div>

<!-- ============ VIEW 2: MATH (Openmathlearning) ============ -->
<div id="vkMathView" class="view">
  <header class="topbar" role="banner">
    <div class="brand">
      <div class="logo-mark" aria-hidden="true">∑</div>
      <div><h1>Openmathlearning</h1><p class="tagline">Formulas &amp; skills — Kindergarten through 12<sup>th</sup></p></div>
    </div>
    <div class="topbar-actions">
      <button id="signInBtn" class="ghost-btn" aria-label="Sign in"><span class="lock-ico" aria-hidden="true">🔒</span> Sign in</button>
    </div>
  </header>
  <main class="app" id="main" role="main">
    <section class="grades" id="gradePicker" aria-label="Choose grade" role="tablist"></section>
    <div class="layout">
      <aside class="sidebar" id="sidebar" aria-label="Topics">
        <h2 class="sidebar-title">Topics</h2>
        <div class="topic-list" id="topicList" role="tablist"></div>
      </aside>
      <section class="content" id="content" aria-live="polite">
        <div class="placeholder"><h2>Pick a topic to start learning</h2><p>Use the grade selector above to filter, then pick a topic on the left.</p></div>
      </section>
    </div>
  </main>
  <div class="modal-backdrop" id="signinModal" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="signinTitle">
      <h2 id="signinTitle">Sign in</h2>
      <p class="muted">Press to enter the realm of the Vikings.</p>
      <form id="signinForm" novalidate>
        <label>Username<input type="text" id="signinUser" autocomplete="username" required /></label>
        <label>Password<input type="password" id="signinPass" autocomplete="current-password" required /></label>
        <div class="modal-error" id="signinError" hidden role="alert"></div>
        <div class="modal-actions">
          <button type="button" class="ghost-btn" id="signinCancel">Cancel</button>
          <button type="submit" class="primary-btn">Sign in</button>
        </div>
      </form>
    </div>
  </div>
  <button class="ghost-btn" id="vMathBack" style="margin-left:28px;margin-bottom:20px;">← Back to Viking</button>
</div>

<!-- ============ VIEW 3: PROXY (client-side) ============ -->
<div id="vkProxyView" class="view">
  <ul class="vk-nav">
    <li style="margin-left:-1px;margin-top:2px"><span class="logo">⚡</span></li>
    <hr style="margin-top:5px"><li><a href="#" id="pNavHome">⌂</a></li><hr>
    <li><a href="#" id="pNavMath">∑</a></li><hr>
    <li><a href="#" id="pNavProxy" class="active">⇄</a></li>
  </ul>
  <div class="vk-util" id="pUtil">
    <div class="ic" id="pBack">←</div>
    <div class="ic" id="pRefresh">↻</div>
    <div class="ic" id="pFwd">→</div>
    <input class="addr" id="pAddr" placeholder="Enter URL or search…" />
    <div class="ic" id="pFull" style="margin-left:auto">⛶</div>
  </div>
  <div class="vk-util" style="display:none;"></div>
  <div class="vk-home" id="pCenter" style="left:calc(70px + 50%);">
    <h1 style="font-size:clamp(34px,6vw,60px)">VIKING PROXY</h1>
    <p>Type a URL or a search — everything flows through the open proxy.</p>
    <div class="vk-search" id="pSearch">
      <input id="pInput" placeholder="Search or enter URL…" />
      <button id="pBtn">➤</button>
    </div>
  </div>
  <div class="vk-results" id="pResults"><div id="pResultsInner"></div></div>
  <iframe class="vk-frame" id="pFrame"></iframe>
  <div class="vk-spin" id="pSpin"><div class="ring"></div></div>
</div>

<script>
/* ============================= BOOT / VIEW SWITCH ============================= */
function showView(id){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.body.classList.toggle('vk', true);
  if(id === 'vkMathView'){ if(typeof initMath==='function') initMath(); }
  if(id === 'vkProxyView'){ if(typeof initProxy==='function') initProxy(); }
}
document.getElementById('vNavHome').addEventListener('click', e=>{e.preventDefault(); showView('vkHomeView');});
document.getElementById('vNavMath').addEventListener('click', e=>{e.preventDefault(); showView('vkMathView');});
document.getElementById('vNavProxy').addEventListener('click', e=>{e.preventDefault(); showView('vkProxyView');});
document.getElementById('vMathBack').addEventListener('click', ()=>showView('vkHomeView'));

/* ============================= VIKING HOME: typewriter + search ============================= */
(function(){
  var TxtType=function(el,toRotate,period){this.toRotate=toRotate;this.el=el;this.loopNum=0;this.period=parseInt(period,10)||2000;this.txt='';this.tick();this.isDeleting=false;};
  TxtType.prototype.tick=function(){var i=this.loopNum%this.toRotate.length;var fullTxt=this.toRotate[i];this.txt=this.isDeleting?fullTxt.substring(0,this.txt.length-1):fullTxt.substring(0,this.txt.length+1);this.el.innerHTML='<span class="wrap">'+this.txt+'</span>';var that=this;var delta=200-Math.random()*100;if(this.isDeleting){delta/=2;}if(!this.isDeleting&&this.txt===fullTxt){delta=this.period;this.isDeleting=true;}else if(this.isDeleting&&this.txt===''){this.isDeleting=false;this.loopNum++;delta=500;}setTimeout(function(){that.tick();},delta);};
  var els=document.getElementsByClassName('typewrite');
  for(var i=0;i<els.length;i++){var t=els[i].getAttribute('data-type');var p=els[i].getAttribute('data-period');if(t){new TxtType(els[i],JSON.parse(t),p);}}
  window.vkHomeSearch = function(){
    var q=document.getElementById('vkHomeInput').value.trim();
    if(q){ showView('vkProxyView'); window.vkOpenSearch && window.vkOpenSearch(q); }
  };
  document.getElementById('vkHomeBtn').addEventListener('click', vkHomeSearch);
  document.getElementById('vkHomeInput').addEventListener('keydown', function(e){ if(e.key==='Enter'){e.preventDefault(); vkHomeSearch();} });
})();
</script>

<script>
/* ============================= PROXY (client-side, open-source) ============================= */
const CORS_PROXIES = [
  u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
  u => 'https://api.allorigins.win/get?url=' + encodeURIComponent(u)
];
function b64enc(s){ return btoa(unescape(encodeURIComponent(s))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,''); }
function b64dec(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4)s+='='; return decodeURIComponent(escape(atob(s))); }
const P_URL = new RegExp('^(https?:\\\\/\\\\/)?((([a-z\\\\d]([a-z\\\\d-]*[a-z\\\\d])*)\\\\.)+[a-z]{2,}|((\\\\d{1,3}\\\\.){3}\\\\d{1,3}))(\\\\:\\\\d+)?(\\\\/[-a-z\\\\d%_.~+]*)*(\\\\?[;&a-z\\\\d%_.~+=-]*)?(#.*)?$','i');
function esc(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

let proxyInit = false;
function initProxy(){
  if(proxyInit) return; proxyInit = true;
  const center=document.getElementById('pCenter'), results=document.getElementById('pResults'),
        inner=document.getElementById('pResultsInner'), util=document.getElementById('pUtil'),
        frame=document.getElementById('pFrame'), spin=document.getElementById('pSpin'),
        addr=document.getElementById('pAddr'), input=document.getElementById('pInput');

  function spinOn(o){ spin.style.display = o ? 'block':'none'; }
  async function fetchHtml(target){
    spinOn(true);
    for(const t of CORS_PROXIES){
      try{
        const r=await fetch(t(target),{method:'GET'});
        const ct=r.headers.get('content-type')||'';
        if(ct.includes('application/json')){ const j=await r.json(); if(j&&j.contents) return j.contents; }
        else { const tx=await r.text(); if(tx&&tx.length>400) return tx; }
      }catch(e){}
    }
    return null;
  }
  function rewrite(doc, base){
    const b=new URL(base);
    const re=(url)=>{ if(!url)return url; if(/^(javascript:|data:|#|mailto:|tel:)/i.test(url))return url; try{return '#proxy='+b64enc(new URL(url,b).toString());}catch(e){return url;} };
    doc.querySelectorAll('a[href]').forEach(a=>a.setAttribute('href', re(a.getAttribute('href'))));
    doc.querySelectorAll('form').forEach(f=>{ if(f.action)f.action=re(f.action); });
    return doc;
  }
  function injectInterceptor(h){
    const s='<'+'script>(function(){document.addEventListener("click",function(e){var t=e.target;while(t&&t.tagName!=="A")t=t.parentNode;if(t&&t.tagName==="A"){var h=t.getAttribute("href")||"";if(h.indexOf("#proxy=")===0){e.preventDefault();e.stopPropagation();var b=h.slice(7).replace(/-/g,"+").replace(/_/g,"/");while(b.length%4)b+="=";var u=decodeURIComponent(escape(atob(b)));if(window.parent&&window.parent.vkLoadProxy)window.parent.vkLoadProxy(u);}else if(/^https?:\\/\\//i.test(h)){e.preventDefault();if(window.parent&&window.parent.vkLoadProxy)window.parent.vkLoadProxy(h);}}},true);})();<'+'/script>';
    if(/<\\/body>/i.test(h)) return h.replace(/<\\/body>/i, s+'</body>');
    return h + s;
  }
  async function renderUrl(target){
    spinOn(true);
    const html=await fetchHtml(target);
    if(html==null){ spinOn(false); addr.value=''; return; }
    const doc=new DOMParser().parseFromString(html,'text/html');
    rewrite(doc,target);
    let out='<!DOCTYPE html>'+doc.documentElement.outerHTML;
    out=out.replace(/<script[\\s\\S]*?<\\/script>/gi,'');
    out=injectInterceptor(out);
    frame.srcdoc=out; spinOn(false);
  }
  function enterSite(url){
    center.style.display='none'; results.style.display='none';
    util.style.display='flex'; frame.style.display='block';
    addr.value=url; renderUrl(url);
  }
  window.vkLoadProxy = function(u){ enterSite(u); };

  function parseResults(html,baseUrl){
    const links=[]; const re=/<a[^>]*href=["']([^"']+)["'][^>]*>([\\s\\S]*?)<\\/a>/gi; let m;
    while((m=re.exec(html))){
      const href=m[1], text=m[2].replace(/<[^>]+>/g,'').replace(/\\s+/g,' ').trim();
      if(!text||text.length<6)continue;
      if(/javascript:|bing\\.com\\/(search|images)|duckduckgo\\.com|cloudflare|5xx-error/i.test(href))continue;
      let abs; try{abs=new URL(href,baseUrl).toString();}catch(e){continue;}
      if(!/^https?:/.test(abs))continue;
      links.push({title:text,url:abs});
    }
    const seen=new Set(); return links.filter(l=>seen.has(l.url)?false:(seen.add(l.url),true));
  }
  async function doSearch(q){
    if(P_URL.test(q)){ enterSite(q.includes('://')?q:'http://'+q); return; }
    center.style.display='none'; results.style.display='block';
    inner.innerHTML='<p style="color:#888">Searching…</p>';
    const engines=[
      ['Bing','https://www.bing.com/search?q=','https://www.bing.com'],
      ['Mojeek','https://www.mojeek.com/search?q=','https://www.mojeek.com'],
      ['DDG','https://lite.duckduckgo.com/lite/?q=','https://lite.duckduckgo.com']
    ];
    for(const [name,url,base] of engines){
      const html=await fetchHtml(url+encodeURIComponent(q));
      if(!html)continue;
      const items=parseResults(html,base);
      if(items.length===0)continue;
      inner.innerHTML='<p style="color:#b8860b;font-size:13px;margin-bottom:14px;">Results from '+esc(name)+' — '+items.length+' found</p>'+items.slice(0,20).map(r=>'<div class="vk-result"><span class="u">'+esc(r.url)+'</span><a class="t" data-url="'+esc(r.url)+'" href="#">'+esc(r.title)+'</a><p class="s">Click to open through the proxy.</p></div>').join('');
      inner.querySelectorAll('a.t').forEach(a=>{a.addEventListener('click',e=>{e.preventDefault();enterSite(a.dataset.url);});});
      return;
    }
    inner.innerHTML='<p style="color:#ff5555">Search failed — the free CORS proxy is rate-limited right now. Try again.</p>';
  }

  window.vkOpenSearch = function(q){ doSearch(q); };

  function submit(v){ if(v) doSearch(v); }
  document.getElementById('pBtn').addEventListener('click', ()=>submit(input.value.trim()));
  input.addEventListener('keydown', e=>{ if(e.key==='Enter'){e.preventDefault(); submit(input.value.trim());} });
  addr.addEventListener('keydown', e=>{ if(e.key==='Enter'){e.preventDefault(); submit(addr.value.trim());} });
  document.getElementById('pBack').addEventListener('click', ()=>history.back());
  document.getElementById('pFwd').addEventListener('click', ()=>history.forward());
  document.getElementById('pRefresh').addEventListener('click', ()=>{ if(frame.srcdoc) renderUrl(addr.value); });
  document.getElementById('pFull').addEventListener('click', ()=>{ if(document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.(); });
  document.getElementById('pNavHome').addEventListener('click', e=>{e.preventDefault(); showView('vkHomeView');});
  document.getElementById('pNavMath').addEventListener('click', e=>{e.preventDefault(); showView('vkMathView');});
  document.getElementById('pNavProxy').addEventListener('click', e=>{e.preventDefault(); showView('vkProxyView');});
}

/* ============================= MATH ============================= */
${dataJs}
${toolsJs}
let mathInit=false;
function initMath(){
  if(mathInit) return; mathInit=true;
  ${bundleJs}
  // The math UI functions are now defined globally (buildGradePills, renderTopicList, renderContent).
  if(typeof buildGradePills==='function'){ buildGradePills(); renderTopicList(); renderContent(); }
}

/* Note: bundle.js normally calls setupSignIn() on DOMContentLoaded and wires the
   sign-in submit to a server. We override the easter-egg behavior here instead. */
</script>

<script>
/* ============ Math easter-egg + sign-in (client-side) ============ */
document.addEventListener('DOMContentLoaded', function(){
  const modal=document.getElementById('signinModal');
  const open=()=>{modal.hidden=false;document.body.style.overflow='hidden';setTimeout(()=>document.getElementById('signinUser').focus(),50);};
  const close=()=>{modal.hidden=true;document.body.style.overflow='';};
  document.getElementById('signInBtn').addEventListener('click',open);
  document.getElementById('signinCancel').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
  document.getElementById('signinForm').addEventListener('submit',e=>{
    e.preventDefault();
    const u=document.getElementById('signinUser').value.trim().toLowerCase();
    const p=document.getElementById('signinPass').value;
    if(u==='viking'&&p==='viking'){ close(); showView('vkProxyView'); initProxy(); }
    else { const err=document.getElementById('signinError'); err.textContent='Sign-in failed. Try again or create an account later.'; err.hidden=false; }
  });
});
</script>

</body>
</html>
`;

writeFileSync('/home/brad/proxy-site/index.html', html);
console.log('Wrote /home/brad/proxy-site/index.html', html.length, 'bytes');
