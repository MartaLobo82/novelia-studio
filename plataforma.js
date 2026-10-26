'use strict';
// =====================================================================
//  Novelia Studio — plataforma
//  · Guarda los datos en el propio navegador (IndexedDB) con la misma
//    forma que usaba la extensión (chrome.storage.local), así el resto
//    del código no cambia.
//  · Habla con la extensión «Novelia Studio · Ayudante» (botón derecho
//    en otras webs y bloqueo de webs) a través de window.postMessage.
// =====================================================================
(function () {
  const ES_EXTENSION = location.protocol === 'chrome-extension:';
  window.NOVELIA_APP = !ES_EXTENSION;
  if (ES_EXTENSION) return;

  // ---------- almacenamiento ----------
  const DB = 'novelia-studio', ST = 'kv';
  let dbP = null;
  const abrir = () => dbP || (dbP = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (modo, fn) => { const db = await abrir(); return new Promise((res, rej) => { const t = db.transaction(ST, modo); const s = t.objectStore(ST); const out = fn(s); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); };
  const oyentes = [];
  const avisar = (cambios) => { if (Object.keys(cambios).length) oyentes.forEach(f => { try { f(cambios, 'local'); } catch (e) { console.error(e); } }); };
  const todas = async () => {
    const db = await abrir();
    return new Promise((res, rej) => {
      const out = {}; const t = db.transaction(ST, 'readonly'); const s = t.objectStore(ST);
      const c = s.openCursor();
      c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } };
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error);
    });
  };
  const local = {
    async get(keys) {
      if (keys == null) return todas();
      const lista = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const db = await abrir();
      return new Promise((res, rej) => {
        const out = {}; const t = db.transaction(ST, 'readonly'); const s = t.objectStore(ST);
        lista.forEach(k => { const r = s.get(k); r.onsuccess = () => { if (r.result !== undefined) out[k] = r.result; else if (!Array.isArray(keys) && typeof keys === 'object' && keys[k] !== undefined) out[k] = keys[k]; }; });
        t.oncomplete = () => res(out); t.onerror = () => rej(t.error);
      });
    },
    async getKeys() { const db = await abrir(); return new Promise((res, rej) => { const t = db.transaction(ST, 'readonly'); const r = t.objectStore(ST).getAllKeys(); r.onsuccess = () => res(r.result.map(String)); r.onerror = () => rej(r.error); }); },
    async set(obj) {
      const viejos = await local.get(Object.keys(obj));
      await tx('readwrite', s => { Object.entries(obj).forEach(([k, v]) => s.put(v, k)); });
      const cambios = {}; Object.keys(obj).forEach(k => cambios[k] = { oldValue: viejos[k], newValue: obj[k] });
      avisar(cambios); Puente.alGuardar(obj);
    },
    async remove(keys) {
      const lista = typeof keys === 'string' ? [keys] : keys;
      const viejos = await local.get(lista);
      await tx('readwrite', s => { lista.forEach(k => s.delete(k)); });
      const cambios = {}; lista.forEach(k => { if (k in viejos) cambios[k] = { oldValue: viejos[k] }; });
      avisar(cambios);
    },
    async clear() { const viejos = await todas(); await tx('readwrite', s => { s.clear(); }); const c = {}; Object.keys(viejos).forEach(k => c[k] = { oldValue: viejos[k] }); avisar(c); }
  };
  window.chrome = window.chrome || {};
  window.chrome.storage = { local, onChanged: { addListener: (f) => oyentes.push(f) } };
  // Que el navegador no borre los datos si le falta espacio
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- puente con la extensión ayudante ----------
  const pendientes = new Map();
  let presente = false, versionAyudante = null;
  const esperaPresencia = [];
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || !e.data.novelia) return;
    const d = e.data;
    if (d.novelia === 'ayudante') { presente = true; versionAyudante = d.version; esperaPresencia.splice(0).forEach(f => f(true)); document.documentElement.dataset.ayudante = '1'; }
    else if (d.novelia === 'respuesta' && pendientes.has(d.id)) { pendientes.get(d.id)(d.res); pendientes.delete(d.id); }
    else if (d.novelia === 'aviso') { Puente.avisos.forEach(f => f(d.que)); }
  });
  const Puente = {
    avisos: [],
    get presente() { return presente; },
    get version() { return versionAyudante; },
    esperar(ms = 1200) { return presente ? Promise.resolve(true) : new Promise(res => { esperaPresencia.push(res); setTimeout(() => res(presente), ms); }); },
    pedir(msg, ms = 30000) {
      if (!presente) return Promise.resolve(null);
      const id = Math.random().toString(36).slice(2);
      return new Promise(res => { pendientes.set(id, res); window.postMessage({ novelia: 'pide', id, msg }, location.origin); setTimeout(() => { if (pendientes.has(id)) { pendientes.delete(id); res(null); } }, ms); });
    },
    // Lo que la extensión necesita saber cuando cambia aquí
    alGuardar(obj) {
      if ('mesa:bloq' in obj) Puente.pedir({ tipo: 'bloq', valor: obj['mesa:bloq'] });
      if ('tabBoards' in obj) Puente.pedir({ tipo: 'tableros', valor: obj.tabBoards });
    }
  };
  window.Puente = Puente;
  // La página avisa de que es Novelia para que el ayudante se presente
  window.postMessage({ novelia: 'hola' }, location.origin);

  // ---------- app instalable y sin conexión ----------
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
