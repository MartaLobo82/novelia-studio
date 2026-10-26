// Novelia Studio — funciona sin conexión.
// Sirve los archivos guardados y, si hay internet, se trae la versión nueva para la próxima vez.
const VERSION = 'novelia-v4';
const ARCHIVOS = ['./', './index.html', './app.css', './plataforma.js', './analisis.js', './data/lexico.js', './data/momentos.js',
  './tablero-comun.js', './docx.js', './app.js', './vistas.js', './vistas2.js', './novelia.js', './vistas3.js', './escaleta.js', './movil.js', './data/tesauro.js',
  './manifest.webmanifest', './iconos/32.png', './iconos/192.png', './iconos/512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const guardada = await c.match(e.request, { ignoreSearch: true });
    const red = fetch(e.request).then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return guardada || (await red) || c.match('./index.html');
  }));
});
