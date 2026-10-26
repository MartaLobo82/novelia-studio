'use strict';
// =====================================================================
//  Novelia Studio — cosas propias de la app (fuera de la extensión):
//  traer los datos de la Mesa la primera vez, recoger lo que guardas
//  con el botón derecho, copias de seguridad y aviso del ayudante.
// =====================================================================

// Copia de seguridad: un .json en Descargas con todo
async function hacerCopiaApp(auto) {
  const todo = await chrome.storage.local.get(null);
  delete todo['mesa:inbox'];
  const d = new Date();
  const nombre = `Novelia Studio · Copia ${diaStr(d)} ${pad(d.getHours())}h${pad(d.getMinutes())}.json`;
  descargar(new Blob([JSON.stringify({ app: 'novelia-studio', version: 3, fecha: d.toISOString(), datos: todo })], { type: 'application/json' }), nombre);
  await Store.set('mesa:ultimaCopia', Date.now());
  if (auto) aviso('He guardado tu copia de seguridad semanal en Descargas');
  return { ok: true, nombre };
}

function cortina(texto) {
  let c = $('#cortina');
  if (!texto) { if (c) c.remove(); return; }
  if (!c) { c = document.createElement('div'); c.id = 'cortina'; c.className = 'velo'; c.style.zIndex = 90; document.body.appendChild(c); }
  c.innerHTML = `<div class="modal" style="text-align:center"><div class="logo-grande">N</div><h3 style="margin:14px 0 6px">${esc(texto)}</h3><p class="suave" style="margin:0">Un momento…</p></div>`;
}

// La primera vez: si el ayudante (la antigua Mesa) tiene tus datos, se traen todos
async function prepararApp() {
  const { 'mesa:meta': meta } = await chrome.storage.local.get('mesa:meta');
  if (meta) return;
  const hay = await Puente.esperar(2500);
  if (!hay) return;
  const hola = await Puente.pedir({ tipo: 'hola' });
  if (!hola || !hola.tieneDatos) return;
  cortina('Trayendo tus novelas de la Mesa de escritura');
  let total = 1;
  for (let i = 0; i < total; i++) {
    const r = await Puente.pedir({ tipo: 'exportar', trozo: i }, 120000);
    if (!r || !r.ok) { cortina(null); aviso('No he podido traer tus datos. Prueba a recargar la página.'); return; }
    total = r.trozos;
    const datos = {};
    Object.entries(r.datos).forEach(([k, v]) => { if (k !== 'mesa:inbox' && !k.startsWith('nov:')) datos[k] = v; });
    if (Object.keys(datos).length) await chrome.storage.local.set(datos);
  }
  await Puente.pedir({ tipo: 'migrado' });
  cortina(null);
  setTimeout(() => aviso('Ya tienes aquí todo lo de la Mesa de escritura'), 600);
}

// Lo que has guardado con el botón derecho en otras webs
let recogiendo = false;
async function recogerAyudante() {
  if (!Puente.presente || recogiendo) return;
  recogiendo = true;
  try {
    const r = await Puente.pedir({ tipo: 'recoger' });
    if (!r) return;
    if (r.items && Object.keys(r.items).length) { await chrome.storage.local.set(r.items); aviso(`${plural(Object.keys(r.items).length, 'cosa nueva', 'cosas nuevas')} en el tablero`); }
    if (r.inbox && r.inbox.length) { const ya = (await Store.get('mesa:inbox')) || []; await Store.set('mesa:inbox', [...ya, ...r.inbox]); aviso('Guardado en la libreta'); }
    if (r.intentos) await Store.set('mesa:intentos', r.intentos);
    if (r.suelto && r.suelto.texto) await Store.set('mesa:suelto', r.suelto);
  } finally { recogiendo = false; }
}

function despuesDeIniciar() {
  // Estado del bloqueo: lo manda la app al ayudante
  if (Puente.presente) {
    Puente.pedir({ tipo: 'bloq', valor: { ...BLOQ, webs: M.ajustes.webs } });
    chrome.storage.local.get('tabBoards').then(o => { if (o.tabBoards) Puente.pedir({ tipo: 'tableros', valor: o.tabBoards }); });
    recogerAyudante();
  }
  Puente.avisos.push(() => recogerAyudante());
  window.addEventListener('focus', () => recogerAyudante());
  setInterval(recogerAyudante, 15000);
  // Copia automática
  Store.get('mesa:ultimaCopia').then(u => {
    const dias = M.ajustes.copiaDias ?? 7;
    if (dias > 0 && Date.now() - (u || 0) > dias * 86400000) setTimeout(() => hacerCopiaApp(true), 4000);
  });
  // Aviso si no está el ayudante (solo en Chrome de ordenador)
  const escritorio = /Chrome\//.test(navigator.userAgent) && !/Mobile|Android|iPad|iPhone/.test(navigator.userAgent);
  setTimeout(() => {
    if (Puente.presente || !escritorio || sessionStorage.getItem('sin-ayudante')) return;
    const b = document.createElement('div');
    b.className = 'barra-ayudante';
    b.innerHTML = `<span>Sin el <b>ayudante de Chrome</b> no funcionan el botón derecho en otras webs ni el bloqueo de webs.</span><button class="icono" title="Cerrar">✕</button>`;
    b.querySelector('button').onclick = () => { sessionStorage.setItem('sin-ayudante', '1'); b.remove(); };
    document.body.appendChild(b);
  }, 3000);
}
