/**
 * Lava mouse-effect background (shared by Viking home + proxy pages).
 * Self-contained: warm blobs slowly flow, drift toward the cursor, and a
 * heat-glow follows the mouse — like bubbling lava.
 * Expects a <canvas id="lava-bg"> element in the page.
 */
(function () {
  var canvas = document.getElementById('lava-bg');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Mouse target (smoothed)
  var mx = W / 2, my = H / 2, smx = W / 2, smy = H / 2;
  window.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
  });
  window.addEventListener('touchmove', function (e) {
    var t = e.touches && e.touches[0];
    if (t) { mx = t.clientX; my = t.clientY; }
  }, { passive: true });

  var PALETTE = ['#5a1200', '#8a1f0a', '#c2410c', '#ea580c', '#f0820d', '#f7ab0e', '#ffd54a'];
  var blobs = [];
  var COUNT = 14;
  function rand(a, b) { return a + Math.random() * (b - a); }
  function makeBlob(anywhere) {
    return {
      x: anywhere ? rand(0, W) : rand(-100, W + 100),
      y: anywhere ? rand(0, H) : rand(-100, H + 100),
      r: rand(40, 150),
      hue: PALETTE[(Math.random() * PALETTE.length) | 0],
      vx: rand(-0.25, 0.25),
      vy: rand(-0.25, 0.25),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.008, 0.02)
    };
  }
  for (var i = 0; i < COUNT; i++) blobs.push(makeBlob(true));

  function frame(t) {
    smx += (mx - smx) * 0.04;
    smy += (my - smy) * 0.04;
    ctx.clearRect(0, 0, W, H);
    var k = t / 1000;

    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      b.x += b.vx + Math.sin(k * b.speed * 60 + b.phase) * 0.15;
      b.y += b.vy + Math.cos(k * b.speed * 60 + b.phase) * 0.15;
      var dx = smx - b.x, dy = smy - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < 600) {
        var pull = (1 - dist / 600) * 0.5;
        b.x += (dx / dist) * pull;
        b.y += (dy / dist) * pull;
      }
      if (b.x < -b.r) b.x = W + b.r; else if (b.x > W + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = H + b.r; else if (b.y > H + b.r) b.y = -b.r;

      var grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      grd.addColorStop(0, b.hue);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(k * b.speed * 40 + b.phase);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    var g = ctx.createRadialGradient(smx, smy, 0, smx, smy, 160);
    g.addColorStop(0, 'rgba(255,200,50,0.35)');
    g.addColorStop(0.4, 'rgba(255,120,20,0.18)');
    g.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(smx, smy, 160, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
