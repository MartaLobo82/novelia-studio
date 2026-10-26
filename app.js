'use strict';
// =====================================================================
//  Novelia Studio — núcleo: datos, árbol de la novela, editor,
//  revisión en vivo, sesiones y estadísticas.
// =====================================================================

// ---------- utilidades ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmt = (n) => Math.round(n || 0).toLocaleString('es-ES');
const pad = (n) => String(n).padStart(2, '0');
const diaStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const deStr = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const sumarDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const diasEntre = (a, b) => Math.round((deStr(diaStr(b)) - deStr(diaStr(a))) / 86400000);
const DIAS_CORTOS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaLarga = (d) => `${d.getDate()} de ${MESES[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' de ' + d.getFullYear() : ''}`;
const plural = (n, s, p) => `${fmt(n)} ${n === 1 ? s : (p || s + 's')}`;
const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (s) => { const d = deStr(s); return `${d.getDate()} ${MESES_C[d.getMonth()]}`; };
// Crea elementos: el('div', {class:'x', onclick: fn}, 'texto', otroNodo)
function el(tag, attrs = {}, ...hijos_) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'text') n.textContent = v;
    else if (k === 'value' && (tag === 'input' || tag === 'textarea' || tag === 'select')) { n.value = v; n.setAttribute('value', v); }
    else if (k === 'checked' || k === 'selected' || k === 'disabled') n[k] = !!v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos_.flat()) {
    if (c === null || c === undefined || c === false) continue;
    n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return n;
}
function debounce(fn, ms) { let t; const f = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; f.ya = (...a) => { clearTimeout(t); fn(...a); }; return f; }

// ---------- almacenamiento ----------
const HAY_CHROME = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
const Store = {
  async get(k) { if (HAY_CHROME) return (await chrome.storage.local.get(k))[k]; const v = localStorage.getItem(k); return v ? JSON.parse(v) : undefined; },
  async set(k, v) { if (HAY_CHROME) return chrome.storage.local.set({ [k]: v }); localStorage.setItem(k, JSON.stringify(v)); },
  async remove(k) { if (HAY_CHROME) return chrome.storage.local.remove(k); localStorage.removeItem(k); },
  async todo() {
    if (HAY_CHROME) return chrome.storage.local.get(null);
    const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('mesa:')) o[k] = JSON.parse(localStorage.getItem(k)); } return o;
  },
  async limpiar() { if (HAY_CHROME) return chrome.storage.local.clear(); Object.keys(localStorage).filter(k => k.startsWith('mesa:')).forEach(k => localStorage.removeItem(k)); }
};

const AJUSTES_DEF = {
  tema: 'auto', letra: 20, ancho: 680,
  muletillas: null, repDist: 50, fraseLarga: 35, ignorar: [],
  mostrar: { rep: true, ment: true, mul: true, larga: true, eco: true },
  objetivoDiario: 0, minRacha: 100, objetivoSemanal: 0, diasEscritura: [1, 2, 3, 4, 5, 6, 0],
  webs: ['instagram.com', 'tiktok.com', 'x.com', 'facebook.com', 'youtube.com', 'pinterest.com'],
  sonido: true, bloquear: true, focoEnSesion: false, ultimaDuracion: 25, enWord: false,
  voz: '', voz2: '', vozDialogos: false, pausaParrafo: true, velocidad: 1,
  copiaDias: 7
};

let M = null;            // metadatos (todo menos los textos)
const T = {};            // textos: id -> html
const guardarMeta = debounce(() => Store.set('mesa:meta', M), 300);

function metaNueva() {
  const pid = uid(), c1 = uid();
  const hoy = new Date();
  return {
    version: 1,
    proyectos: [{ id: pid, titulo: 'Mi novela', objetivo: 80000, fechaLimite: diaStr(sumarDias(hoy, 180)), creado: Date.now() }],
    actual: pid,
    nodos: { [c1]: { id: c1, pid, padre: null, tipo: 'cap', titulo: 'Capítulo 1', orden: 1, estado: 'borrador', sinopsis: '', pov: '', notas: '', palabras: 0 } },
    sel: { [pid]: c1 }, abiertos: {},
    ideas: [], personajes: [], retos: [], banco: [], cabos: [], crono: [], estructura: {},
    etiquetas: ['Trama', 'Personajes', 'Escritura', 'Estructura'],
    stats: { dias: {}, sesiones: [], recordRacha: 0 },
    perfil: { nombre: 'Marta Lobo', usuario: '@martalobo', genero: 'Romance', bio: '', enlaces: { instagram: '', tiktok: '', web: '' }, foto: '' },
    ajustes: structuredClone(AJUSTES_DEF),
    sesion: null
  };
}

// ---------- acceso a datos ----------
const proyecto = () => M.proyectos.find(p => p.id === M.actual) || M.proyectos[0];
const nodosDe = (pid) => Object.values(M.nodos).filter(n => n.pid === pid);
const hijos = (padre, pid = M.actual) => nodosDe(pid).filter(n => n.padre === padre).sort((a, b) => a.orden - b.orden);
function palabrasCap(cap) { return (cap.palabras || 0) + hijos(cap.id).reduce((a, e) => a + (e.palabras || 0), 0); }
function palabrasMesa(pid = M.actual) { return nodosDe(pid).reduce((a, n) => a + (n.tipo === 'parte' ? 0 : n.palabras || 0), 0); }
function totalProyecto(pid = M.actual) { const p = M.proyectos.find(x => x.id === pid); return palabrasMesa(pid) + Math.max(0, (p && p.palabrasFuera) || 0); }
// Palabras escritas fuera de Novelia (en Word, por ejemplo): cuentan para hoy y para la novela
function apuntarFuera(n, pid = M.actual) {
  const p = M.proyectos.find(x => x.id === pid) || proyecto();
  const d = dia(); d.m = (d.m || 0) + n;
  p.palabrasFuera = Math.max(0, (p.palabrasFuera || 0) + n);
  if (n > 0) { const h = new Date().getHours(); d.h[h] = (d.h[h] || 0) + n; }
  guardarMeta();
}
const esDiaDeEscritura = (d) => (M.ajustes.diasEscritura || [0, 1, 2, 3, 4, 5, 6]).includes(d.getDay());
function diasDeEscrituraHasta(fin) {
  let n = 0;
  for (let d = deStr(diaStr()); d <= fin; d = sumarDias(d, 1)) if (esDiaDeEscritura(d)) n++;
  return n;
}
function ordenLectura(pid = M.actual) {
  // [{nodo, nivel}] en orden: partes, capítulos y escenas
  const out = [];
  hijos(null, pid).forEach(n => { out.push(n); if (n.tipo === 'cap') hijos(n.id, pid).forEach(e => out.push(e)); });
  return out;
}

// ---------- estadísticas ----------
function dia(d = diaStr()) { if (!M.stats.dias[d]) M.stats.dias[d] = { w: 0, m: 0, h: {} }; return M.stats.dias[d]; }
// w = escritas en Novelia · m = apuntadas a mano · t = traídas de «Mil palabras»
const totalDia = (d) => { const x = M.stats.dias[d]; return x ? (x.w || 0) + (x.m || 0) + (x.t || 0) : 0; };
function sumarEscritas(n) {
  if (n <= 0) return;
  const d = dia(); d.w += n;
  const h = new Date().getHours(); d.h[h] = (d.h[h] || 0) + n;
  if (M.sesion) M.sesion.palabras = (M.sesion.palabras || 0) + n;
}
function objetivoHoy() {
  const A = M.ajustes;
  if (A.objetivoDiario > 0) return A.objetivoDiario;
  const p = proyecto();
  if (!p.fechaLimite || !p.objetivo) return 500;
  const hoyW = totalDia(diaStr());
  const faltaAlEmpezar = p.objetivo - (totalProyecto() - hoyW);
  if (faltaAlEmpezar <= 0) return 0;
  if (!esDiaDeEscritura(new Date()) && hoyW === 0) return 0; // día libre
  const dias = diasDeEscrituraHasta(deStr(p.fechaLimite)) + (esDiaDeEscritura(new Date()) ? 0 : 1);
  if (dias <= 0) return faltaAlEmpezar;
  return Math.ceil(faltaAlEmpezar / dias);
}
function racha() {
  const min = Math.max(1, M.ajustes.minRacha || 1);
  let n = 0; let d = new Date();
  if (totalDia(diaStr(d)) < min) d = sumarDias(d, -1); // hoy todavía cuenta como pendiente
  // Los días que no son de escritura no rompen la racha (si escribes, suman)
  for (let i = 0; i < 3650; i++) {
    const t = totalDia(diaStr(d));
    if (t >= min) n++;
    else if (esDiaDeEscritura(d)) break;
    d = sumarDias(d, -1);
  }
  if (n > (M.stats.recordRacha || 0)) { M.stats.recordRacha = n; guardarMeta(); }
  return n;
}

// ---------- aviso ----------
function aviso(texto, accion) {
  $$('.aviso').forEach(a => a.remove());
  const a = document.createElement('div');
  a.className = 'aviso';
  a.innerHTML = esc(texto) + (accion ? ` <button style="margin-left:10px;background:none;border:0;color:inherit;text-decoration:underline;font-weight:600">${esc(accion.texto)}</button>` : '');
  if (accion) a.querySelector('button').onclick = () => { a.remove(); accion.fn(); };
  document.body.appendChild(a);
  setTimeout(() => a.remove(), accion ? 8000 : 2600);
}

// ---------- modal ----------
function modal(html, { alAbrir, ancho } = {}) {
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="modal" style="${ancho ? 'width:min(' + ancho + 'px,100%)' : ''}">${html}</div>`;
  const cerrar = () => { velo.remove(); document.removeEventListener('keydown', tecla); };
  const tecla = (e) => { if (e.key === 'Escape') cerrar(); };
  velo.addEventListener('mousedown', (e) => { if (e.target === velo) cerrar(); });
  document.addEventListener('keydown', tecla);
  document.body.appendChild(velo);
  $$('[data-cerrar]', velo).forEach(b => b.onclick = cerrar);
  if (alAbrir) alAbrir(velo.firstElementChild, cerrar);
  const f = $('input,textarea', velo); if (f) setTimeout(() => f.focus(), 30);
  return cerrar;
}
function preguntar(titulo, texto, si = 'Sí', peligro = false) {
  return new Promise(res => {
    modal(`<h3>${esc(titulo)}</h3><p class="suave">${esc(texto)}</p><div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="ok" style="${peligro ? 'background:var(--rojo);border-color:var(--rojo)' : ''}">${esc(si)}</button></div>`,
      { alAbrir: (m, cerrar) => { $('#ok', m).onclick = () => { cerrar(); res(true); }; $('[data-cerrar]', m).addEventListener('click', () => res(false)); } });
  });
}
function pedirTexto(titulo, valor = '', etiqueta = '') {
  return new Promise(res => {
    modal(`<h3>${esc(titulo)}</h3><label class="campo"><span>${esc(etiqueta)}</span><input id="v" value="${esc(valor)}"></label><div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="ok">Guardar</button></div>`,
      { alAbrir: (m, cerrar) => { const i = $('#v', m); i.select(); const ok = () => { cerrar(); res(i.value.trim()); }; $('#ok', m).onclick = ok; i.onkeydown = e => { if (e.key === 'Enter') ok(); }; } });
  });
}

// =====================================================================
//  ÁRBOL DE LA NOVELA
// =====================================================================
const ICO = {
  flecha: '<svg class="flecha" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
  mas: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>'
};

function renderArbol() {
  const p = proyecto();
  $('#titulo-proyecto').value = p.titulo;
  const total = totalProyecto();
  $('#total-proyecto').textContent = `${fmt(total)} de ${fmt(p.objetivo)} palabras · ${p.objetivo ? Math.min(100, Math.round(total / p.objetivo * 100)) : 0} %`;
  $('#barra-proyecto').style.width = (p.objetivo ? Math.min(100, total / p.objetivo * 100) : 0) + '%';
  const sel = M.sel[M.actual];
  const top = hijos(null);
  let html = '';
  top.forEach((n, i) => {
    if (n.tipo === 'parte') {
      let suma = 0;
      for (let j = i + 1; j < top.length && top[j].tipo !== 'parte'; j++) suma += palabrasCap(top[j]);
      html += `<div class="nodo parte${n.id === sel ? ' sel' : ''}" data-id="${n.id}" draggable="true"><span class="t">${esc(n.titulo)}</span><span class="n">${fmt(suma)}</span><button class="icono mas" data-menu="${n.id}">${ICO.mas}</button></div>`;
    } else {
      const esc_ = hijos(n.id);
      const abierto = M.abiertos[n.id] !== false;
      html += `<div class="nodo cap${n.id === sel ? ' sel' : ''}" data-id="${n.id}" draggable="true">
        <span data-toggle="${n.id}" style="display:inline-flex;visibility:${esc_.length ? 'visible' : 'hidden'}">${ICO.flecha.replace('class="flecha"', 'class="flecha' + (abierto ? ' abierta' : '') + '"')}</span>
        <span class="estado e-${n.estado || 'idea'}" title="${esc(n.estado || '')}"></span>
        <span class="t">${esc(n.titulo || 'Sin título')}</span><span class="n">${fmt(palabrasCap(n))}</span>
        <button class="icono mas" data-menu="${n.id}">${ICO.mas}</button></div>`;
      if (abierto) esc_.forEach(e => {
        html += `<div class="nodo esc${e.id === sel ? ' sel' : ''}" data-id="${e.id}" draggable="true"><span class="estado e-${e.estado || 'idea'}"></span><span class="t">${esc(e.titulo || 'Escena')}</span><span class="n">${fmt(e.palabras)}</span><button class="icono mas" data-menu="${e.id}">${ICO.mas}</button></div>`;
      });
    }
  });
  if (!top.length) html = '<div class="vacio">Añade tu primer capítulo</div>';
  $('#lista-nodos').innerHTML = html;
}

function eventosArbol() {
  const lista = $('#lista-nodos');
  lista.addEventListener('click', (e) => {
    const t = e.target.closest('[data-toggle]');
    if (t) { M.abiertos[t.dataset.toggle] = M.abiertos[t.dataset.toggle] === false; guardarMeta(); renderArbol(); return; }
    const m = e.target.closest('[data-menu]');
    if (m) { e.stopPropagation(); menuNodo(m.dataset.menu, m); return; }
    const n = e.target.closest('.nodo');
    if (n && !n.querySelector('input')) abrirNodo(n.dataset.id);
  });
  lista.addEventListener('dblclick', (e) => { const n = e.target.closest('.nodo'); if (n) renombrarEnLinea(n.dataset.id); });

  // arrastrar y soltar
  let arrastrado = null;
  lista.addEventListener('dragstart', (e) => { const n = e.target.closest('.nodo'); if (!n) return; arrastrado = M.nodos[n.dataset.id]; n.classList.add('arrastrando'); e.dataTransfer.effectAllowed = 'move'; });
  lista.addEventListener('dragend', () => { arrastrado = null; $$('.nodo', lista).forEach(x => x.classList.remove('arrastrando', 'soltar-antes', 'soltar-dentro')); });
  const destino = (e) => {
    const n = e.target.closest('.nodo'); if (!n || !arrastrado) return null;
    const obj = M.nodos[n.dataset.id]; if (!obj || obj.id === arrastrado.id) return null;
    const r = n.getBoundingClientRect(); const abajo = e.clientY > r.top + r.height * 0.6;
    if (arrastrado.tipo === 'esc') {
      if (obj.tipo === 'cap') return { el: n, modo: 'dentro', obj };
      if (obj.tipo === 'esc') return { el: n, modo: 'antes', obj };
      return null;
    }
    if (obj.tipo === 'esc') return null;
    if (arrastrado.tipo === 'cap' && obj.tipo === 'cap' && abajo && hijos(obj.id).length === 0) return { el: n, modo: 'despues', obj };
    return { el: n, modo: 'antes', obj };
  };
  lista.addEventListener('dragover', (e) => {
    const d = destino(e);
    $$('.nodo', lista).forEach(x => x.classList.remove('soltar-antes', 'soltar-dentro'));
    if (!d) return;
    e.preventDefault();
    d.el.classList.add(d.modo === 'dentro' ? 'soltar-dentro' : 'soltar-antes');
    if (d.modo === 'despues') { d.el.classList.remove('soltar-antes'); const sig = d.el.nextElementSibling; if (sig) sig.classList.add('soltar-antes'); }
  });
  lista.addEventListener('drop', (e) => {
    const d = destino(e); if (!d) return; e.preventDefault();
    const a = arrastrado;
    if (d.modo === 'dentro') { a.padre = d.obj.id; a.orden = 1e9; M.abiertos[d.obj.id] = true; }
    else {
      a.padre = d.obj.padre;
      a.orden = d.obj.orden + (d.modo === 'despues' ? 0.5 : -0.5);
    }
    renumerar(a.padre); if (a.tipo === 'esc') Object.values(M.nodos).filter(n => n.tipo === 'cap').forEach(c => renumerar(c.id));
    guardarMeta(); renderArbol(); actualizarMiga();
  });
}
function renumerar(padre) { hijos(padre).forEach((n, i) => n.orden = i + 1); }

function menuNodo(id, boton) {
  $$('.menu-flot').forEach(m => m.remove());
  const n = M.nodos[id];
  const items = [['Renombrar', () => renombrarEnLinea(id)]];
  if (n.tipo === 'cap') items.push(['Añadir escena', () => nuevoNodo('esc', id)]);
  items.push(['Subir', () => mover(id, -1)], ['Bajar', () => mover(id, 1)]);
  if (n.tipo === 'cap' && hijos(id).length) items.push(['Unir escenas en el capítulo', () => unirEscenas(id)]);
  items.push(['Borrar', () => borrarNodo(id), true]);
  const m = document.createElement('div');
  m.className = 'menu-flot';
  m.style.cssText = 'position:fixed;z-index:40;background:var(--hoja);border:1px solid var(--linea);border-radius:10px;box-shadow:var(--sombra);padding:5px;min-width:190px';
  m.innerHTML = items.map((it, i) => `<button data-i="${i}" style="display:block;width:100%;text-align:left;border:0;background:none;padding:7px 10px;border-radius:7px;${it[2] ? 'color:var(--rojo)' : ''}">${it[0]}</button>`).join('');
  const r = boton.getBoundingClientRect();
  m.style.left = Math.min(r.left, innerWidth - 210) + 'px'; m.style.top = (r.bottom + 4) + 'px';
  document.body.appendChild(m);
  $$('button', m).forEach(b => { b.onmouseenter = () => b.style.background = 'var(--linea)'; b.onmouseleave = () => b.style.background = 'none'; b.onclick = () => { m.remove(); items[b.dataset.i][1](); }; });
  setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', f); } }), 0);
}

function mover(id, dir) {
  const n = M.nodos[id]; const hermanos = hijos(n.padre); const i = hermanos.findIndex(x => x.id === id); const j = i + dir;
  if (j < 0 || j >= hermanos.length) return;
  [hermanos[i].orden, hermanos[j].orden] = [hermanos[j].orden, hermanos[i].orden];
  guardarMeta(); renderArbol();
}

function renombrarEnLinea(id) {
  const fila = $(`.nodo[data-id="${id}"]`); if (!fila) return;
  const t = $('.t', fila); const n = M.nodos[id];
  const input = document.createElement('input'); input.value = n.titulo;
  t.replaceWith(input); input.focus(); input.select();
  const fin = (ok) => { if (ok && input.value.trim()) { n.titulo = input.value.trim(); guardarMeta(); if (M.sel[M.actual] === id) $('#titulo-nodo').value = n.titulo; } renderArbol(); actualizarMiga(); };
  input.onkeydown = (e) => { if (e.key === 'Enter') fin(true); if (e.key === 'Escape') fin(false); };
  input.onblur = () => fin(true);
}

function nuevoNodo(tipo, padreForzado) {
  guardarTexto.ya();
  const pid = M.actual; const sel = M.nodos[M.sel[pid]];
  let padre = null, orden;
  if (tipo === 'esc') {
    padre = padreForzado || (sel ? (sel.tipo === 'esc' ? sel.padre : sel.tipo === 'cap' ? sel.id : null) : null);
    if (!padre) { const caps = hijos(null).filter(n => n.tipo === 'cap'); if (!caps.length) return nuevoNodo('cap'); padre = caps[caps.length - 1].id; }
    const hs = hijos(padre);
    orden = sel && sel.tipo === 'esc' && sel.padre === padre ? sel.orden + 0.5 : hs.length + 1;
    M.abiertos[padre] = true;
  } else {
    const top = hijos(null);
    const ref = sel ? (sel.tipo === 'esc' ? M.nodos[sel.padre] : sel) : null;
    orden = ref && ref.padre === null ? ref.orden + 0.5 : top.length + 1;
  }
  const id = uid();
  const numCaps = nodosDe(pid).filter(n => n.tipo === 'cap').length;
  const numPartes = nodosDe(pid).filter(n => n.tipo === 'parte').length;
  const ORD = ['Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Séptima', 'Octava'];
  const titulo = tipo === 'cap' ? `Capítulo ${numCaps + 1}` : tipo === 'parte' ? `${ORD[numPartes] || 'Otra'} parte` : `Escena ${hijos(padre).length + 1}`;
  M.nodos[id] = { id, pid, padre, tipo, titulo, orden, estado: 'idea', sinopsis: '', pov: '', notas: '', palabras: 0 };
  renumerar(padre);
  guardarMeta();
  if (tipo === 'parte') { renderArbol(); renombrarEnLinea(id); return; }
  abrirNodo(id);
  setTimeout(() => { $('#titulo-nodo').select(); $('#titulo-nodo').focus(); }, 30);
}

async function borrarNodo(id) {
  const n = M.nodos[id];
  const afectados = [n, ...(n.tipo === 'cap' ? hijos(id) : [])];
  const palabras = afectados.reduce((a, x) => a + (x.palabras || 0), 0);
  if (palabras > 0 && !(await preguntar(`¿Borrar «${n.titulo}»?`, `Tiene ${plural(palabras, 'palabra')}${afectados.length > 1 ? ' contando sus escenas' : ''}. Podrás deshacerlo justo después.`, 'Borrar', true))) return;
  guardarTexto.ya();
  const copia = afectados.map(x => ({ nodo: structuredClone(x), texto: T[x.id] || '' }));
  afectados.forEach(x => { delete M.nodos[x.id]; delete T[x.id]; Store.remove('mesa:t:' + x.id); });
  if (afectados.some(x => x.id === M.sel[M.actual])) {
    const resto = ordenLectura().filter(x => x.tipo !== 'parte');
    M.sel[M.actual] = resto.length ? resto[0].id : null;
  }
  renumerar(n.padre); guardarMeta(); renderArbol(); abrirNodo(M.sel[M.actual]);
  aviso(`«${n.titulo}» borrado`, { texto: 'Deshacer', fn: () => {
    copia.forEach(c => { M.nodos[c.nodo.id] = c.nodo; T[c.nodo.id] = c.texto; Store.set('mesa:t:' + c.nodo.id, c.texto); });
    guardarMeta(); renderArbol(); abrirNodo(n.id);
  } });
}

async function unirEscenas(capId) {
  const cap = M.nodos[capId]; const es = hijos(capId);
  if (!(await preguntar('¿Unir las escenas?', `Las ${es.length} escenas pasarán al texto del capítulo, separadas por «* * *».`, 'Unir'))) return;
  guardarTexto.ya();
  let html = T[capId] || '';
  es.forEach(e => { if (html.trim()) html += '<p class="sep">* * *</p>'; html += T[e.id] || ''; delete M.nodos[e.id]; delete T[e.id]; Store.remove('mesa:t:' + e.id); });
  T[capId] = html; await Store.set('mesa:t:' + capId, html);
  cap.palabras = Analisis.contar(htmlATexto(html));
  guardarMeta(); renderArbol(); abrirNodo(capId);
}

// =====================================================================
//  EDITOR
// =====================================================================
const editor = () => $('#editor');
let nodoAbierto = null;
let palabrasAntes = 0;
let revisando = false;
let estadoGuardado = '';

function htmlATexto(html) {
  const d = document.createElement('div'); d.innerHTML = html;
  return mapaTexto(d).texto;
}

// Recorre el editor y construye el texto plano junto con dónde está cada trozo.
function mapaTexto(raiz) {
  let texto = ''; const segs = [];
  const BLOQUE = /^(P|DIV|H[1-6]|LI|BLOCKQUOTE)$/;
  (function walk(node) {
    for (const c of node.childNodes) {
      if (c.nodeType === 3) { segs.push({ node: c, ini: texto.length }); texto += c.data; }
      else if (c.nodeType === 1) {
        if (c.tagName === 'BR') { texto += '\n'; continue; }
        const bloque = BLOQUE.test(c.tagName);
        if (bloque && texto.length && !texto.endsWith('\n')) texto += '\n';
        walk(c);
        if (bloque && !texto.endsWith('\n')) texto += '\n';
      }
    }
  })(raiz);
  return { texto, segs };
}

// Limpia HTML: solo párrafos con cursiva y negrita
function limpiarHTML(html) {
  const d = document.createElement('div'); d.innerHTML = html;
  const parrafos = [];
  let actual = '';
  const cerrar = () => { if (actual.replace(/<[^>]+>/g, '').trim() || /<br>/.test(actual)) parrafos.push(actual); actual = ''; };
  (function walk(node, i, b) {
    for (const c of node.childNodes) {
      if (c.nodeType === 3) {
        let t = esc(c.data.replace(/\s+/g, ' '));
        if (!t) continue;
        if (i) t = `<i>${t}</i>`; if (b) t = `<b>${t}</b>`;
        actual += t;
      } else if (c.nodeType === 1) {
        const tg = c.tagName;
        if (/^(SCRIPT|STYLE|META|LINK|TITLE)$/.test(tg)) continue;
        if (tg === 'BR') { cerrar(); continue; }
        const st = c.getAttribute('style') || '';
        const ni = i || tg === 'I' || tg === 'EM' || /font-style:\s*italic/i.test(st);
        const nb = b || tg === 'B' || tg === 'STRONG' || /font-weight:\s*(bold|[6-9]00)/i.test(st);
        const bloque = /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|TR|SECTION|ARTICLE)$/.test(tg);
        if (bloque) cerrar();
        walk(c, ni, nb);
        if (bloque) cerrar();
      }
    }
  })(d, false, false);
  cerrar();
  return parrafos.map(p => {
    const txt = p.replace(/<[^>]+>/g, '').trim();
    if (/^(\*\s*){3}$|^#$/.test(txt)) return '<p class="sep">* * *</p>';
    return `<p>${p.trim().replace(/<\/i><i>/g, '').replace(/<\/b><b>/g, '')}</p>`;
  }).join('');
}

function abrirNodo(id) {
  if (nodoAbierto && nodoAbierto !== id) guardarTexto.ya();
  const n = id && M.nodos[id];
  const ed = editor();
  if (!n || n.tipo === 'parte') {
    nodoAbierto = null;
    ed.innerHTML = ''; ed.contentEditable = 'false';
    $('#titulo-nodo').value = n ? n.titulo : '';
    $('#sinopsis-mini').textContent = n ? 'Las partes solo agrupan capítulos. Elige un capítulo para escribir.' : 'Crea un capítulo para empezar.';
    if (n) { M.sel[M.actual] = id; guardarMeta(); }
    renderArbol(); actualizarMiga(); actualizarEstadisticas(); renderLateral();
    return;
  }
  ed.contentEditable = 'true';
  nodoAbierto = id;
  M.sel[M.actual] = id; guardarMeta();
  ed.innerHTML = T[id] || '';
  palabrasAntes = n.palabras || 0;
  $('#titulo-nodo').value = n.titulo;
  $('#sinopsis-mini').textContent = n.sinopsis || '';
  renderArbol(); actualizarMiga(); actualizarEstadisticas(); renderLateral();
  if (revisando) analizarYa();
  $('#hoja-wrap').scrollTop = 0;
}

function actualizarMiga() {
  const n = M.nodos[nodoAbierto || M.sel[M.actual]];
  if (!n) { $('#miga').textContent = proyecto().titulo; return; }
  const cam = [proyecto().titulo];
  const cap = n.tipo === 'esc' ? M.nodos[n.padre] : null;
  if (cap) cam.push(cap.titulo);
  cam.push(n.titulo);
  $('#miga').textContent = cam.join('  ›  ');
}

const guardarTexto = debounce(async () => {
  if (!nodoAbierto) return;
  const n = M.nodos[nodoAbierto]; if (!n) return;
  const html = limpiarHTMLRapido(editor());
  T[n.id] = html;
  const nuevas = Analisis.contar(mapaTexto(editor()).texto);
  const delta = nuevas - palabrasAntes;
  if (delta > 0) sumarEscritas(delta);
  palabrasAntes = nuevas;
  n.palabras = nuevas;
  await Store.set('mesa:t:' + n.id, html);
  guardarMeta();
  estadoGuardado = 'Guardado';
  renderArbol();
  actualizarEstadisticas();
}, 700);

// Para guardar: el editor ya contiene HTML sencillo; quitamos estilos pegados y spans.
function limpiarHTMLRapido(ed) {
  const html = ed.innerHTML;
  if (/<(span|font|h\d|ul|ol|table|img|a )|style=/i.test(html)) {
    const limpio = limpiarHTML(html);
    return limpio;
  }
  return html.replace(/<div>/g, '<p>').replace(/<\/div>/g, '</p>').replace(/<em>/g, '<i>').replace(/<\/em>/g, '</i>').replace(/<strong>/g, '<b>').replace(/<\/strong>/g, '</b>');
}

function actualizarEstadisticas() {
  const n = M.nodos[nodoAbierto];
  const total = totalProyecto();
  const hoy = totalDia(diaStr()); const obj = objetivoHoy();
  let html = '';
  if (n) {
    if (n.tipo === 'esc') html += `<span>Escena <b>${fmt(n.palabras)}</b></span><span>Capítulo <b>${fmt(palabrasCap(M.nodos[n.padre]))}</b></span>`;
    else html += `<span>Capítulo <b>${fmt(palabrasCap(n))}</b></span>`;
  }
  html += `<span>Novela <b>${fmt(total)}</b></span>`;
  html += `<span>Hoy <b>${fmt(hoy)}</b>${obj ? ' / ' + fmt(obj) : ''}${obj && hoy >= obj ? ' ✓' : ''}</span>`;
  const sel = getSelection();
  if (sel && !sel.isCollapsed && editor().contains(sel.anchorNode)) html += `<span>Selección <b>${fmt(Analisis.contar(sel.toString()))}</b></span>`;
  html += `<span class="guardado" id="guardado">${estadoGuardado}</span>`;
  $('#estadisticas').innerHTML = html;
}

function eventosEditor() {
  const ed = editor();
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}

  ed.addEventListener('input', (e) => {
    // «--» → raya de diálogo
    if (e.inputType === 'insertText' && e.data === '-') {
      const s = getSelection(); const r = s.rangeCount && s.getRangeAt(0);
      if (r && r.startContainer.nodeType === 3 && r.startOffset >= 2 && r.startContainer.data.slice(r.startOffset - 2, r.startOffset) === '--') {
        const rr = document.createRange(); rr.setStart(r.startContainer, r.startOffset - 2); rr.setEnd(r.startContainer, r.startOffset);
        s.removeAllRanges(); s.addRange(rr); document.execCommand('insertText', false, '—');
      }
    }
    // El primer texto escrito suelto se mete en un párrafo
    if ([...ed.childNodes].some(n => n.nodeType === 3 && n.data.trim())) document.execCommand('formatBlock', false, 'p');
    // Separador de escena
    if (e.inputType === 'insertParagraph') {
      $$('p,div', ed).forEach(p => p.classList.toggle('sep', /^\s*(\*\s*){3}\s*$/.test(p.textContent)));
    }
    if (estadoGuardado !== 'Escribiendo…') { estadoGuardado = 'Escribiendo…'; $('#guardado') && ($('#guardado').textContent = estadoGuardado); }
    guardarTexto();
    if (revisando) analizar();
  });

  ed.addEventListener('paste', (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const txt = e.clipboardData.getData('text/plain');
    let limpio;
    if (html) limpio = limpiarHTML(html);
    else limpio = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => /^(\*\s*){3}$/.test(l) ? '<p class="sep">* * *</p>' : `<p>${esc(l)}</p>`).join('');
    if (!limpio) return;
    // Si es un solo párrafo, pégalo dentro del actual
    const uno = (limpio.match(/<p/g) || []).length === 1;
    document.execCommand('insertHTML', false, uno ? limpio.replace(/^<p[^>]*>|<\/p>$/g, '') : limpio);
  });

  ed.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); guardarTexto.ya(); aviso('Guardado'); }
  });
  ed.addEventListener('blur', () => guardarTexto.ya());
  document.addEventListener('selectionchange', debounce(() => {
    if ($('#v-escribir').classList.contains('on')) actualizarEstadisticas();
    const s = getSelection();
    if (s && !s.isCollapsed && ed.contains(s.anchorNode) && pestanaLateral === 'sinonimos') {
      const w = s.toString().trim();
      if (w && w.split(/\s+/).length <= 3 && w.length < 40) { rangoGuardado = s.getRangeAt(0).cloneRange(); buscarSinonimos(w); }
    }
  }, 250));

  $('#titulo-nodo').addEventListener('input', (e) => {
    const n = M.nodos[M.sel[M.actual]]; if (!n) return;
    n.titulo = e.target.value; guardarMeta(); renderArbolSuave(); actualizarMiga();
  });
  $('#titulo-nodo').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ed.focus(); } });
  $('#titulo-proyecto').addEventListener('input', (e) => { proyecto().titulo = e.target.value; guardarMeta(); actualizarMiga(); });

  $('#add-cap').onclick = () => nuevoNodo('cap');
  $('#add-esc').onclick = () => nuevoNodo('esc');
  $('#add-parte').onclick = () => nuevoNodo('parte');
  $('#btn-revisar').onclick = () => alternarRevision();
  $('#btn-panel').onclick = () => { $('#v-escribir').classList.toggle('sin-panel'); };
  $('#btn-foco').onclick = () => alternarFoco();
  $('#btn-sesion').onclick = () => modalSesion();
  $('#reloj-fin').onclick = () => terminarSesion(true);
  $('#btn-proyectos').onclick = () => modalProyectos();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#app').classList.contains('foco-total') && !$('.velo')) alternarFoco(false); });
  window.addEventListener('beforeunload', () => { guardarTexto.ya(); Store.set('mesa:meta', M); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { guardarTexto.ya(); Store.set('mesa:meta', M); } });
}
const renderArbolSuave = debounce(renderArbol, 200);

function alternarFoco(forzar) {
  const on = forzar != null ? forzar : !$('#app').classList.contains('foco-total');
  $('#app').classList.toggle('foco-total', on);
  $('#v-escribir').classList.toggle('foco', on);
  if (on) aviso('Modo foco · pulsa Esc para salir');
}

// =====================================================================
//  REVISIÓN EN VIVO (CSS Custom Highlight API: no toca tu texto)
// =====================================================================
let ultimoAnalisis = null;
const TIPOS = { rep: 'Repeticiones cercanas', ment: 'Adverbios en -mente', mul: 'Muletillas', larga: 'Frases largas', eco: 'Frases que empiezan igual' };

function alternarRevision(on) {
  revisando = on != null ? on : !revisando;
  $('#btn-revisar').classList.toggle('on', revisando);
  if (revisando) { analizarYa(); if ($('#v-escribir').classList.contains('sin-panel')) $('#v-escribir').classList.remove('sin-panel'); cambiarPestana('revision'); }
  else { limpiarResaltado(); renderLateral(); }
}
function limpiarResaltado() { if (window.CSS && CSS.highlights) Object.keys(TIPOS).concat('actual').forEach(k => CSS.highlights.delete(k)); }

const analizar = debounce(() => analizarYa(), 450);
function analizarYa() {
  if (!revisando || !nodoAbierto) { limpiarResaltado(); return; }
  const mapa = mapaTexto(editor());
  const A = M.ajustes;
  const r = Analisis.analizar(mapa.texto, { repDist: A.repDist, fraseLarga: A.fraseLarga, muletillas: A.muletillas || Analisis.MULETILLAS_DEF, ignorar: A.ignorar });
  ultimoAnalisis = { ...r, mapa };
  if (window.CSS && CSS.highlights) {
    const grupos = {}; Object.keys(TIPOS).forEach(k => grupos[k] = []);
    r.items.forEach(it => { if (A.mostrar[it.tipo] === false) return; const rg = rango(mapa, it.s, it.e); if (rg) grupos[it.tipo].push(rg); });
    Object.entries(grupos).forEach(([k, rs]) => { const h = new Highlight(...rs); h.priority = { larga: 0, eco: 1, rep: 2, ment: 3, mul: 4 }[k]; CSS.highlights.set(k, h); });
  }
  if (pestanaLateral === 'revision') renderLateral();
}
function rango(mapa, s, e) {
  const busca = (pos) => {
    let lo = 0, hi = mapa.segs.length - 1, r = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (mapa.segs[mid].ini <= pos) { r = mid; lo = mid + 1; } else hi = mid - 1; }
    return r < 0 ? null : mapa.segs[r];
  };
  const a = busca(s), b = busca(e - 1);
  if (!a || !b) return null;
  try {
    const r = new Range();
    r.setStart(a.node, Math.min(s - a.ini, a.node.length));
    r.setEnd(b.node, Math.min(e - b.ini, b.node.length));
    return r;
  } catch (err) { return null; }
}
const cursorRev = {};
function irAOcurrencia(tipo, clave) {
  if (!ultimoAnalisis) return;
  let lista;
  if (tipo === 'top') {
    lista = [];
    const re = new RegExp(`(?<![\\p{L}])${clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'giu');
    let m; while ((m = re.exec(ultimoAnalisis.mapa.texto))) lista.push({ s: m.index, e: m.index + m[0].length });
  } else lista = ultimoAnalisis.items.filter(it => it.tipo === tipo && (clave == null || it.clave === clave));
  if (!lista.length) return;
  const k = tipo + '|' + clave;
  cursorRev[k] = ((cursorRev[k] ?? -1) + 1) % lista.length;
  const it = lista[cursorRev[k]];
  const r = rango(ultimoAnalisis.mapa, it.s, it.e); if (!r) return;
  CSS.highlights.set('actual', new Highlight(r));
  const rect = r.getBoundingClientRect(); const w = $('#hoja-wrap'); const wr = w.getBoundingClientRect();
  w.scrollTop += rect.top - wr.top - wr.height / 3;
  setTimeout(() => CSS.highlights.delete('actual'), 2200);
}

// =====================================================================
//  PANEL LATERAL
// =====================================================================
let pestanaLateral = 'escena';
let rangoGuardado = null;
function cambiarPestana(p) { pestanaLateral = p; $$('#pestanas button').forEach(b => b.classList.toggle('on', b.dataset.p === p)); renderLateral(); }

function renderLateral() {
  const c = $('#lateral-cuerpo'); if (!c) return;
  const n = M.nodos[nodoAbierto];
  if (pestanaLateral === 'escena') {
    if (!n) { c.innerHTML = '<div class="vacio">Elige un capítulo o una escena</div>'; return; }
    const pjs = M.personajes.filter(p => p.pid === M.actual);
    c.innerHTML = `
      <label class="campo"><span>Estado</span><select id="l-estado">${['idea', 'borrador', 'revisado', 'terminado'].map(e => `<option value="${e}"${n.estado === e ? ' selected' : ''}>${e[0].toUpperCase() + e.slice(1)}</option>`).join('')}</select></label>
      <label class="campo"><span>De qué va (sinopsis)</span><textarea id="l-sin" rows="4" placeholder="En dos líneas: qué pasa y qué cambia">${esc(n.sinopsis)}</textarea></label>
      <label class="campo"><span>Punto de vista</span><select id="l-pov"><option value="">—</option>${pjs.map(p => `<option value="${p.id}"${n.pov === p.id ? ' selected' : ''}>${esc(nombrePj(p))}</option>`).join('')}</select></label>
      <label class="campo"><span>Cuándo pasa (en la historia)</span><input id="l-cuando" value="${esc(n.cuando || '')}" placeholder="Día 3, sábado por la noche…"></label>
      <label class="campo"><span>Notas de esta parte</span><textarea id="l-notas" rows="6" placeholder="Lo que no quieres olvidar al reescribir">${esc(n.notas)}</textarea></label>
      <p class="tenue" style="font-size:12px">Truco: escribe <b>* * *</b> en una línea para separar escenas dentro del capítulo, y <b>--</b> para la raya de diálogo.</p>`;
    $('#l-estado').onchange = (e) => { n.estado = e.target.value; guardarMeta(); renderArbol(); };
    $('#l-sin').oninput = (e) => { n.sinopsis = e.target.value; $('#sinopsis-mini').textContent = n.sinopsis; guardarMeta(); };
    $('#l-pov').onchange = (e) => { n.pov = e.target.value; guardarMeta(); };
    $('#l-cuando').oninput = (e) => { n.cuando = e.target.value; guardarMeta(); };
    $('#l-notas').oninput = (e) => { n.notas = e.target.value; guardarMeta(); };
  } else if (pestanaLateral === 'revision') {
    if (!revisando) {
      c.innerHTML = `<p class="suave" style="margin-top:0">Marca en el texto, sin tocarlo, lo que conviene mirar al revisar:</p>
      <div class="leyenda">${Object.entries(TIPOS).map(([k, v]) => `<label><span class="mues ${k}"></span>${v}</label>`).join('')}</div>
      <button class="btn prim" id="l-rev-on" style="width:100%;justify-content:center">Revisar este texto</button>`;
      $('#l-rev-on').onclick = () => alternarRevision(true);
      return;
    }
    const r = ultimoAnalisis ? ultimoAnalisis.resumen : null;
    if (!r) { c.innerHTML = ''; return; }
    const A = M.ajustes;
    const cuenta = { rep: r.rep.reduce((a, x) => a + x[1], 0), ment: r.ment.reduce((a, x) => a + x[1], 0), mul: r.mul.reduce((a, x) => a + x[1], 0), larga: r.larga, eco: r.eco.reduce((a, x) => a + x[1], 0) };
    const lista = (tipo, arr, ignorable) => arr.length ? `<ul class="lista-rev">${arr.slice(0, 14).map(([k, v, lab]) => `<li data-t="${tipo}" data-k="${esc(k)}"><span>${esc(String(lab || k).replace(/\*/g, "…"))}</span><span>${v}${ignorable ? ` <button class="icono" data-ign="${esc(lab || k)}" title="No marcar más esta palabra" style="padding:0 3px">✕</button>` : ''}</span></li>`).join('')}</ul>` : '<p class="tenue" style="margin:0 0 16px">Nada que marcar.</p>';
    c.innerHTML = `
      <div class="leyenda">${Object.entries(TIPOS).map(([k, v]) => `<label><input type="checkbox" data-mostrar="${k}"${A.mostrar[k] !== false ? ' checked' : ''} style="accent-color:var(--verde)"><span class="mues ${k}"></span>${v}<span class="cuenta">${cuenta[k]}</span></label>`).join('')}</div>
      <p class="suave num" style="font-size:12.5px;margin:-6px 0 16px">${fmt(r.palabras)} palabras · ${fmt(r.frases)} frases · ${r.media} por frase · ${r.dialogo} % de diálogo</p>
      <h2>Repeticiones cercanas</h2>${lista('rep', r.rep, true)}
      <h2>Muletillas</h2>${lista('mul', r.mul)}
      <h2>Adverbios en -mente</h2>${lista('ment', r.ment)}
      ${r.larga ? `<h2>Frases largas</h2><ul class="lista-rev"><li data-t="larga"><span>Ir a la siguiente</span><span>${r.larga}</span></li></ul>` : ''}
      ${r.eco.length ? `<h2>Empiezan igual</h2>${lista('eco', r.eco)}` : ''}
      ${r.top.length ? `<h2>Las que más repites</h2>${lista('top', r.top)}` : ''}
      <p class="tenue" style="font-size:12px">Clic en una palabra para saltar a cada aparición. Cambia la lista de muletillas en Ajustes.</p>`;
    $$('[data-mostrar]', c).forEach(ch => ch.onchange = () => { A.mostrar[ch.dataset.mostrar] = ch.checked; guardarMeta(); analizarYa(); });
    $$('li[data-t]', c).forEach(li => li.onclick = (e) => {
      if (e.target.closest('[data-ign]')) { const w = e.target.closest('[data-ign]').dataset.ign; A.ignorar = [...new Set([...(A.ignorar || []), w])]; guardarMeta(); analizarYa(); aviso(`«${w}» ya no se marcará`); return; }
      irAOcurrencia(li.dataset.t, li.dataset.k ?? null);
    });
  } else if (pestanaLateral === 'sinonimos') {
    c.innerHTML = `<input class="txt" id="l-sin-q" placeholder="Palabra… (o selecciónala en el texto)" style="margin-bottom:12px"><div class="sinonimos" id="l-sin-r"><p class="tenue">Selecciona una palabra en tu texto y aquí verás sus sinónimos. Clic en uno para cambiarla.</p></div>`;
    $('#l-sin-q').oninput = debounce((e) => { rangoGuardado = null; buscarSinonimos(e.target.value.trim()); }, 250);
  } else if (pestanaLateral === 'notas') {
    const ideas = M.ideas.filter(i => i.pid === M.actual && !i.hecha).slice(0, 40);
    c.innerHTML = `<input class="txt" id="l-idea" placeholder="Apunta una idea y pulsa Enter" style="margin-bottom:12px">
      ${ideas.length ? ideas.map(i => `<div class="idea" style="margin-bottom:8px;padding:10px 12px"><div class="cat">${esc(i.cat)}</div><div class="tx" style="font-size:14.5px;margin:3px 0 0">${esc(i.texto)}</div></div>`).join('') : '<div class="vacio">Tu libreta está vacía</div>'}`;
    $('#l-idea').onkeydown = (e) => { if (e.key === 'Enter' && e.target.value.trim()) { nuevaIdea(e.target.value.trim(), 'Escritura'); renderLateral(); setTimeout(() => $('#l-idea').focus(), 0); } };
  }
}

// ---------- sinónimos (tesauro libre de LibreOffice) ----------
let tesauroCargando = null;
function cargarTesauro() {
  if (self.TESAURO) return Promise.resolve();
  if (!tesauroCargando) tesauroCargando = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'data/tesauro.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  return tesauroCargando;
}
function sinonimosDe(palabra) {
  const T_ = self.TESAURO; if (!T_) return [];
  let w = palabra.toLowerCase().trim();
  if (self.LEXICO && LEXICO.irregulares[w]) w = LEXICO.irregulares[w];
  let idx = T_.w[w];
  if (!idx) { // prueba quitando plural o femenino
    const prueba = [w.replace(/es$/, ''), w.replace(/s$/, ''), w.replace(/a$/, 'o'), w.replace(/as$/, 'o'), w.replace(/os$/, 'o')];
    for (const p of prueba) if (T_.w[p]) { idx = T_.w[p]; break; }
  }
  return (idx || []).map(i => T_.g[i].split('|'));
}
async function buscarSinonimos(w, destino = '#l-sin-r') {
  const caja = $(destino); if (!caja) return;
  if ($('#l-sin-q') && destino === '#l-sin-r' && $('#l-sin-q').value !== w && rangoGuardado) $('#l-sin-q').value = w;
  if (!w) { caja.innerHTML = ''; return; }
  caja.innerHTML = '<p class="tenue">Buscando…</p>';
  await cargarTesauro();
  const grupos = sinonimosDe(w);
  if (!grupos.length) { caja.innerHTML = `<p class="tenue">No tengo sinónimos para «${esc(w)}».</p>`; return; }
  caja.innerHTML = grupos.map(g => `<div class="grupo">${g.map(s => `<span class="chip" data-s="${esc(s)}">${esc(s)}</span>`).join('')}</div>`).join('');
  $$('.chip', caja).forEach(ch => ch.onclick = () => usarPalabra(ch.dataset.s, w));
}
function usarPalabra(nueva, original) {
  if (rangoGuardado && editor().contains(rangoGuardado.startContainer) && rangoGuardado.toString().trim().toLowerCase() === (original || '').toLowerCase()) {
    const viejo = rangoGuardado.toString();
    let n = nueva;
    if (viejo.trim()[0] && viejo.trim()[0] === viejo.trim()[0].toUpperCase()) n = n[0].toUpperCase() + n.slice(1);
    const s = getSelection(); s.removeAllRanges(); s.addRange(rangoGuardado);
    document.execCommand('insertText', false, viejo.replace(viejo.trim(), n));
    rangoGuardado = null;
    aviso(`Cambiado por «${n}»`);
  } else {
    copiar(nueva);
  }
}
function copiar(t) {
  navigator.clipboard.writeText(t).then(() => aviso(`«${t}» copiado`)).catch(() => aviso(t));
  if (!M.banco.includes(t)) { M.banco.unshift(t); M.banco = M.banco.slice(0, 300); guardarMeta(); }
}

// =====================================================================
//  SESIONES DE ESCRITURA
// =====================================================================
let tic = null;
// Estado del bloqueo de webs (lo lee el fondo de la extensión)
let BLOQ = { webs: [], siempre: false, pausaHasta: 0, sesionHasta: 0 };
async function guardarBloq(cambios = {}) {
  Object.assign(BLOQ, cambios);
  BLOQ.webs = M.ajustes.webs.slice();
  await Store.set('mesa:bloq', { ...BLOQ });
}
const bloqueoActivo = () => (BLOQ.sesionHasta || 0) > Date.now() || (BLOQ.siempre && Date.now() >= (BLOQ.pausaHasta || 0));

function modalSesion() {
  if (M.sesion) { aviso('Ya tienes una sesión en marcha'); return; }
  const A = M.ajustes;
  const ult = M.stats.sesiones[M.stats.sesiones.length - 1];
  const DUR = [15, 25, 45, 60];
  let dur = A.ultimaDuracion ?? 25;
  modal(`<h2>Sesión</h2><h3>¿Cuánto rato vas a escribir?</h3>
    <div class="opciones" style="grid-template-columns:repeat(6,1fr)">${DUR.map(m => `<button data-m="${m}"${m === dur ? ' class="on"' : ''}>${m} min</button>`).join('')}
      <input class="txt" id="s-otra" type="number" min="1" max="300" placeholder="min" value="${DUR.includes(dur) || !dur ? '' : dur}" style="text-align:center;padding:0 4px">
      <button data-m="0"${dur === 0 ? ' class="on"' : ''}>Libre</button></div>
    <label class="check"><input type="checkbox" id="s-word"${A.enWord ? ' checked' : ''}><span>Escribo en Word (u otro programa)<small>Al acabar te pregunto cuántas palabras han caído y las sumo a hoy y a la novela.</small></span></label>
    <label class="campo" id="s-word-c" style="margin:-4px 0 14px 26px;${A.enWord ? '' : 'display:none'}"><span>Palabras que tiene ahora el documento (opcional: así al acabar solo pones el nuevo recuento y yo resto)</span><input id="s-ini" type="number" min="0" placeholder="Opcional"></label>
    <label class="check"><input type="checkbox" id="s-bloq"${A.bloquear ? ' checked' : ''}><span>Bloquear webs durante la sesión<small>${esc(A.webs.slice(0, 3).join(', '))}${A.webs.length > 3 ? ` y ${A.webs.length - 3} más` : ''} · cámbialas en Ajustes</small></span></label>
    <label class="check"><input type="checkbox" id="s-foco"${A.focoEnSesion ? ' checked' : ''}><span>Modo foco<small>Solo tu texto en pantalla. Esc para salir.</small></span></label>
    <label class="check"><input type="checkbox" id="s-son"${A.sonido ? ' checked' : ''}><span>Sonido al acabar</span></label>
    <button class="btn prim" id="s-ir" style="width:100%;justify-content:center;padding:12px">Empezar</button>
    ${ult ? `<p class="tenue" style="text-align:center;margin:12px 0 0;font-size:12.5px">Última sesión: ${ult.min} min y ${plural(ult.palabras, 'palabra')}</p>` : ''}`,
    { ancho: 520, alAbrir: (m, cerrar) => {
      const etiqueta = () => { $('#s-ir', m).textContent = dur ? `Empezar ${dur} min` : 'Empezar sesión libre'; };
      etiqueta();
      $$('[data-m]', m).forEach(b => b.onclick = () => { dur = +b.dataset.m; $('#s-otra', m).value = ''; $$('[data-m]', m).forEach(x => x.classList.toggle('on', x === b)); etiqueta(); });
      $('#s-otra', m).oninput = (e) => { const v = parseInt(e.target.value, 10); if (v > 0) { dur = v; $$('[data-m]', m).forEach(x => x.classList.remove('on')); etiqueta(); } };
      $('#s-word', m).onchange = (e) => { $('#s-word-c', m).style.display = e.target.checked ? '' : 'none'; };
      $('#s-ir', m).onclick = () => {
        A.bloquear = $('#s-bloq', m).checked; A.focoEnSesion = $('#s-foco', m).checked; A.sonido = $('#s-son', m).checked; A.ultimaDuracion = dur;
        A.enWord = $('#s-word', m).checked;
        const ini = $('#s-ini', m).value === '' ? null : parseInt($('#s-ini', m).value, 10);
        cerrar(); empezarSesion(dur, A.enWord, ini);
      };
    } });
}

async function empezarSesion(min, word = false, inicioDoc = null) {
  const ahora = Date.now();
  M.sesion = { inicio: ahora, fin: min ? ahora + min * 60000 : null, min, palabras: 0, word, inicioDoc, bloqueo: M.ajustes.bloquear };
  guardarMeta();
  if (M.ajustes.bloquear) await guardarBloq({ sesionHasta: M.sesion.fin || ahora + 6 * 3600000 });
  if (!word) {
    if (vistaActual !== 'escribir') mostrarVista('escribir');
    if (M.ajustes.focoEnSesion) alternarFoco(true);
    if (!nodoAbierto) { const p = ordenLectura().find(n => n.tipo !== 'parte'); if (p) abrirNodo(p.id); }
    editor().focus();
  }
  arrancarReloj();
  if (word) aviso('Sesión en marcha. Ve a tu Word: aquí sigue el reloj.');
}
function arrancarReloj() {
  clearInterval(tic);
  $('#reloj').classList.add('on'); $('#btn-sesion').style.display = 'none';
  const pinta = () => {
    const s = M.sesion; if (!s) return;
    let seg;
    if (s.fin) { seg = Math.max(0, Math.round((s.fin - Date.now()) / 1000)); if (seg <= 0) { terminarSesion(false); return; } }
    else seg = Math.round((Date.now() - s.inicio) / 1000);
    const h = Math.floor(seg / 3600), m = Math.floor(seg % 3600 / 60), ss = seg % 60;
    const t = (h ? h + ':' + pad(m) : m) + ':' + pad(ss);
    $('#reloj-t').textContent = t;
    $('#reloj-p').textContent = s.word ? '· en Word' : `· +${fmt(s.palabras)}`;
    document.title = `${t} · Novelia Studio`;
    const r = $('#reloj-inicio'); if (r) r.textContent = t;
  };
  pinta(); tic = setInterval(pinta, 1000);
}
async function terminarSesion(manual) {
  const s = M.sesion; if (!s) return;
  guardarTexto.ya();
  clearInterval(tic);
  M.sesion = null; guardarMeta();
  const min = Math.max(1, Math.round((Date.now() - s.inicio) / 60000));
  await guardarBloq({ sesionHasta: 0 });
  $('#reloj').classList.remove('on'); $('#btn-sesion').style.display = '';
  document.title = 'Novelia Studio';
  if (!manual && M.ajustes.sonido) campanita();
  alternarFoco(false);
  if (vistaActual === 'inicio') mostrarVista('inicio');
  if (s.word) {
    const conIni = s.inicioDoc !== null && s.inicioDoc !== undefined;
    modal(`<div style="text-align:center"><h2>${manual ? 'Sesión terminada' : '¡Tiempo!'}</h2><h3>${min} minutos. ¿Cuánto ha caído?</h3>
      ${conIni ? `<p class="suave" style="margin-top:-4px">Al empezar el documento tenía ${fmt(s.inicioDoc)} palabras.</p>` : ''}
      <input class="txt" id="w-n" type="number" min="0" placeholder="${conIni ? 'Recuento actual del documento' : 'Palabras escritas'}" style="font-size:20px;text-align:center;margin:8px 0 16px">
      <div class="pie" style="justify-content:center"><button class="btn" id="w-no">Descartar</button><button class="btn prim" id="w-ok">Guardar</button></div></div>`,
      { alAbrir: (m, cerrar) => {
        const ok = () => {
          const v = parseInt($('#w-n', m).value, 10);
          if (isNaN(v) || v < 0) { aviso('Pon un número'); return; }
          const n = conIni ? Math.max(0, v - s.inicioDoc) : v;
          apuntarFuera(n); s.palabras = (s.palabras || 0) + n;
          cerrar(); registrarSesion(s, min, manual);
        };
        $('#w-ok', m).onclick = ok;
        $('#w-n', m).onkeydown = (e) => { if (e.key === 'Enter') ok(); };
        $('#w-no', m).onclick = () => { cerrar(); registrarSesion(s, min, manual, true); };
      } });
  } else registrarSesion(s, min, manual);
}
function registrarSesion(s, min, manual, sinResumen) {
  M.stats.sesiones.push({ inicio: s.inicio, min, palabras: s.palabras || 0, hora: new Date(s.inicio).getHours(), word: !!s.word });
  M.stats.sesiones = M.stats.sesiones.slice(-1000);
  guardarMeta();
  if (vistaActual !== 'escribir') mostrarVista(vistaActual); else actualizarEstadisticas();
  if (sinResumen) return;
  const ritmo = Math.round(s.palabras / min * 60);
  modal(`<div style="text-align:center"><h2>${manual ? 'Sesión terminada' : '¡Tiempo!'}</h2>
    <div class="grande" style="margin:10px 0 4px">${fmt(s.palabras)}</div>
    <p class="suave">palabras en ${min} min${s.palabras ? ` · ${fmt(ritmo)} por hora` : ''}</p>
    <p style="font-family:var(--serif);font-size:18px;font-style:italic;margin:18px 0">${s.palabras / min >= 20 ? '¡Vas lanzada!' : s.palabras > 300 ? 'Buen trabajo. La historia avanza.' : s.palabras > 0 ? 'Cada palabra cuenta. Mañana, más.' : 'Hay días de pensar más que de escribir. También cuentan.'}</p>
    <p class="suave" style="font-size:13px">Hoy llevas ${fmt(totalDia(diaStr()))}${objetivoHoy() ? ' de ' + fmt(objetivoHoy()) : ''}.</p>
    <div class="pie" style="justify-content:center"><button class="btn" data-cerrar>Cerrar</button><button class="btn prim" id="otra">Otra sesión</button></div></div>`,
    { alAbrir: (m, cerrar) => { $('#otra', m).onclick = () => { cerrar(); modalSesion(); }; } });
}
function campanita() {
  try {
    const ac = new AudioContext();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(ac.destination);
      const t = ac.currentTime + i * 0.18;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
      o.start(t); o.stop(t + 1.5);
    });
  } catch (e) {}
}

// =====================================================================
//  NOVELAS (proyectos)
// =====================================================================
function modalProyectos() {
  modal(`<h3>Tus novelas</h3><div id="lp"></div><div class="pie"><button class="btn" data-cerrar>Cerrar</button><button class="btn prim" id="np">+ Nueva novela</button></div>`, {
    alAbrir: (m, cerrar) => {
      $('#lp', m).innerHTML = M.proyectos.map(p => `<div class="nodo${p.id === M.actual ? ' sel' : ''}" data-p="${p.id}" style="padding:10px 12px"><span class="t" style="font-family:var(--serif);font-size:17px">${esc(p.titulo)}</span><span class="n">${fmt(totalProyecto(p.id))} palabras</span></div>`).join('');
      $$('[data-p]', m).forEach(d => d.onclick = () => { cerrar(); cambiarProyecto(d.dataset.p); });
      $('#np', m).onclick = async () => { cerrar(); const t = await pedirTexto('Nueva novela', '', 'Título'); if (t) crearProyecto(t); };
    }
  });
}
function crearProyecto(titulo, conCapitulo = true) {
  const pid = uid();
  M.proyectos.push({ id: pid, titulo, objetivo: 80000, fechaLimite: diaStr(sumarDias(new Date(), 180)), creado: Date.now() });
  if (conCapitulo) { const c = uid(); M.nodos[c] = { id: c, pid, padre: null, tipo: 'cap', titulo: 'Capítulo 1', orden: 1, estado: 'idea', sinopsis: '', pov: '', notas: '', palabras: 0 }; M.sel[pid] = c; }
  cambiarProyecto(pid);
  return pid;
}
function cambiarProyecto(pid) {
  guardarTexto.ya();
  M.actual = pid; guardarMeta();
  nodoAbierto = null;
  abrirNodo(M.sel[pid] || (ordenLectura().find(n => n.tipo !== 'parte') || {}).id);
  if (vistaActual !== 'escribir') mostrarVista(vistaActual);
}

// =====================================================================
//  IDEAS (libreta)
// =====================================================================
function nuevaIdea(texto, cat, extra = {}) {
  M.ideas.unshift({ id: uid(), pid: M.actual, texto, cat, hecha: false, creada: Date.now(), ...extra });
  guardarMeta();
}
async function recogerBuzon() {
  const inbox = await Store.get('mesa:inbox');
  if (!inbox || !inbox.length) return;
  inbox.forEach(it => {
    if (it.tipo === 'banco') { if (!M.banco.includes(it.texto)) M.banco.unshift(it.texto); }
    else { if (!M.etiquetas.includes('Web')) M.etiquetas.push('Web'); nuevaIdea(it.texto, 'Web', { url: it.url, titulo: it.titulo }); }
  });
  await Store.remove('mesa:inbox');
  guardarMeta();
  if (vistaActual === 'libreta' || vistaActual === 'lexico') mostrarVista(vistaActual);
}

// =====================================================================
//  NAVEGACIÓN ENTRE VISTAS
// =====================================================================
let vistaActual = 'escribir';
function mostrarVista(v) {
  if (vistaActual === 'escribir' && v !== 'escribir') guardarTexto.ya();
  if (vistaActual === 'leer' && v !== 'leer' && typeof pararLectura === 'function') pararLectura();
  vistaActual = v;
  $$('.vista').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
  $$('#rail button').forEach(b => b.classList.toggle('on', b.dataset.vista === v));
  const r = VISTAS[v]; if (r) r($('#v-' + v));
  if (v === 'escribir') { renderArbol(); actualizarEstadisticas(); if (revisando) analizarYa(); else limpiarResaltado(); }
  try { localStorage.setItem('mesa:vista', v); } catch (e) {}
}

function aplicarAparencia() {
  const A = M.ajustes;
  const tema = A.tema === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'noche' : 'papel') : A.tema;
  document.documentElement.dataset.theme = tema;
  document.documentElement.style.setProperty('--letra', A.letra + 'px');
  document.documentElement.style.setProperty('--ancho', A.ancho + 'px');
  if (typeof aplicarAcento === 'function') aplicarAcento();
}

// =====================================================================
//  ARRANQUE
// =====================================================================
async function iniciar() {
  M = await Store.get('mesa:meta');
  if (!M) { M = metaNueva(); await Store.set('mesa:meta', M); }
  M.ajustes = Object.assign(structuredClone(AJUSTES_DEF), M.ajustes || {});
  M.ajustes.mostrar = Object.assign({}, AJUSTES_DEF.mostrar, M.ajustes.mostrar || {});
  ['ideas', 'personajes', 'retos', 'banco', 'cabos', 'crono'].forEach(k => M[k] = M[k] || []);
  M.estructura = M.estructura || {};
  M.etiquetas = M.etiquetas || ['Trama', 'Personajes', 'Escritura', 'Estructura'];
  M.ideas.forEach(i => { if (i.cat && !M.etiquetas.includes(i.cat)) M.etiquetas.push(i.cat); });
  M.stats = M.stats || { dias: {}, sesiones: [], recordRacha: 0 };
  migrarPersonajes();
  // textos (sin cargar las imágenes del tablero)
  let claves = null;
  if (HAY_CHROME && chrome.storage.local.getKeys) { try { claves = (await chrome.storage.local.getKeys()).filter(k => k.startsWith('mesa:t:')); } catch (e) {} }
  const todo = claves ? (claves.length ? await chrome.storage.local.get(claves) : {}) : await Store.todo();
  Object.keys(todo).forEach(k => { if (k.startsWith('mesa:t:')) T[k.slice(7)] = todo[k]; });
  BLOQ = Object.assign(BLOQ, (await Store.get('mesa:bloq')) || {});
  if (!BLOQ.webs || !BLOQ.webs.length) await guardarBloq();

  aplicarAparencia();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarAparencia);
  eventosArbol(); eventosEditor();
  $$('#pestanas button').forEach(b => b.onclick = () => cambiarPestana(b.dataset.p));
  $$('#rail button').forEach(b => b.onclick = () => mostrarVista(b.dataset.vista));

  nodoAbierto = null;
  abrirNodo(M.sel[M.actual] || (ordenLectura().find(n => n.tipo !== 'parte') || {}).id);
  let v = 'escribir'; try { v = localStorage.getItem('mesa:vista') || 'escribir'; } catch (e) {}
  if (location.hash) v = location.hash.slice(1);
  if (/^leer-/.test(v)) { pestanaLeer = 'suelto'; v = 'leer'; }
  mostrarVista(VISTAS[v] || v === 'escribir' ? v : 'escribir');
  window.addEventListener('hashchange', () => {
    let h = location.hash.slice(1);
    if (/^leer-/.test(h)) { pestanaLeer = 'suelto'; h = 'leer'; }
    if (VISTAS[h] || h === 'escribir') mostrarVista(h);
  });

  if (M.sesion) { if (M.sesion.fin && M.sesion.fin < Date.now()) terminarSesion(false); else arrancarReloj(); }
  await recogerBuzon();
  if (HAY_CHROME) chrome.storage.onChanged.addListener((ch) => {
    if (ch['mesa:inbox'] && ch['mesa:inbox'].newValue) recogerBuzon();
    if (ch['mesa:suelto'] && ch['mesa:suelto'].newValue) { pestanaLeer = 'suelto'; mostrarVista('leer'); }
    if (ch['mesa:bloq'] && ch['mesa:bloq'].newValue) { BLOQ = Object.assign(BLOQ, ch['mesa:bloq'].newValue); if (vistaActual === 'inicio') pintarBloqueoInicio(); }
    if (vistaActual === 'tablero' && Object.keys(ch).some(k => k.startsWith('item:') && !ch[k].oldValue) && !document.querySelector('.tcard textarea')) VISTAS.tablero($('#v-tablero'));
  });
  setInterval(() => { if (vistaActual === 'escribir') actualizarEstadisticas(); }, 60000);
}
