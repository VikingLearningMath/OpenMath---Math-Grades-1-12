// /js/index.js — home page behavior.
//
// Listens for the search form submission. The query is sent to the proxy
// page (/&), which will render DuckDuckGo results (with each result proxied
// through our server-side fetcher) or, if it looks like a URL, just open
// the proxied site directly.

document.getElementById('home-search')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = document.getElementById('home-input').value.trim();
  if (q) location.href = '/&?q=' + encodeURIComponent(q);
});

// Particles background
if (window.particlesJS) {
  particlesJS('particles-js', {
    particles: {
      number: { value: 86, density: { enable: true, value_area: 800 } },
      color: { value: '#ffffff' },
      shape: { type: 'circle' },
      opacity: { value: 1, random: true },
      size: { value: 2, random: true },
      line_linked: { enable: false },
      move: { enable: true, speed: 0.5, direction: 'top', random: false, straight: false, out_mode: 'out' },
    },
  });
}
