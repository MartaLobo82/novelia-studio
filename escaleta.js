'use strict';
// =====================================================================
//  Novelia Studio — Escaleta (Plan › Escaleta) e «Importar biblia».
//  La escaleta vive en los propios capítulos de la novela (M.nodos):
//  título, sinopsis, POV, cuándo, estado y notas son los mismos que ves
//  en Escribir; lo propio de la escaleta va en nodo.e.
// =====================================================================

const PASOS_GUION = ['Arranque', 'Choque', 'Giro', 'Remate'];
let escAbiertos = new Set(), escBusca = '', escPov = '', escEstado = '';

const escDe = (n) => (n.e = n.e || {});
const sinNumero = (t) => (t || '').replace(/^Cap[ií]tulo\s+\d+\s*[·:.\-–—]\s*/i, '');
function povTexto(n) {
  if (n.pov === 'dual') return 'Dual';
  const p = M.personajes.find(x => x.id === n.pov);
  return p ? nombrePj(p) : '';
}
function povColor(n) {
  if (n.pov === 'dual') return 'var(--tinta)';
  const p = M.personajes.find(x => x.id === n.pov);
  return p ? p.color : 'var(--linea-fuerte)';
}

// ---------- vista ----------
function pintarEscaleta(c) {
  const pid = M.actual;
  const top = hijos(null, pid);
  const caps = top.filter(n => n.tipo === 'cap');
  const pjs = M.personajes.filter(p => p.pid === pid).sort((a, b) => nombrePj(a).localeCompare(nombrePj(b), 'es'));
  const hoy = diaStr();
  const obj = caps.reduce((a, n) => a + (Number(escDe(n).obj) || 0), 0);
  const escritas = caps.reduce((a, n) => a + palabrasCap(n), 0);
  const terminados = caps.filter(n => n.estado === 'terminado').length;
  const deHoy = caps.find(n => escDe(n).plan === hoy);
  const q = escBusca.toLowerCase();
  const visible = (n) => {
    const e = escDe(n);
    if (escPov && n.pov !== escPov) return false;
    if (escEstado && (n.estado || 'idea') !== escEstado) return false;
    if (!q) return true;
    return [n.titulo, n.sinopsis, n.notas, n.cuando, e.funcion, e.personajes, e.simbolos, e.revela, e.cierre, ...(e.pasos || [])].join(' ').toLowerCase().includes(q);
  };

  c.innerHTML = `<p class="sub" style="margin-top:-12px">Capítulo a capítulo: qué pasa, quién lo cuenta y cuándo. Es lo mismo que ves en Escribir; si cambias algo aquí, cambia allí.</p>
    <div class="tarjeta esc-resumen">
      <div><b class="num">${caps.length}</b> capítulos</div>
      <div><b class="num">${fmt(escritas)}</b>${obj ? ` de ${fmt(obj)}` : ''} palabras</div>
      <div><b class="num">${terminados}</b> terminados</div>
      ${deHoy ? `<div class="esc-hoy">Hoy toca: <a href="#" data-escribir="${deHoy.id}">${esc(deHoy.titulo)}</a></div>` : ''}
      <span style="flex:1"></span>
      <button class="btn peq" id="esc-importar">Importar biblia…</button>
      <button class="btn peq" id="esc-pdf">Imprimir / PDF</button>
    </div>
    ${typeof avisoAtraso === 'function' ? avisoAtraso() : ''}
    <div class="fila" style="flex-wrap:wrap;margin:14px 0">
      <input class="txt" id="esc-q" placeholder="Buscar (bufanda, Rubén, campanario…)" value="${esc(escBusca)}" style="width:260px">
      <select class="txt" id="esc-fpov" style="width:auto;padding:6px 8px"><option value="">Todos los POV</option>${pjs.map(p => `<option value="${p.id}"${escPov === p.id ? ' selected' : ''}>${esc(nombrePj(p))}</option>`).join('')}<option value="dual"${escPov === 'dual' ? ' selected' : ''}>Dual</option></select>
      <select class="txt" id="esc-fest" style="width:auto;padding:6px 8px"><option value="">Todos los estados</option>${['idea', 'borrador', 'revisado', 'terminado'].map(e => `<option value="${e}"${escEstado === e ? ' selected' : ''}>${e[0].toUpperCase() + e.slice(1)}</option>`).join('')}</select>
      <span style="flex:1"></span>
      <button class="btn peq" id="esc-todo">${escAbiertos.size ? 'Cerrar todos' : 'Abrir todos'}</button>
      <button class="btn peq prim" id="esc-nuevo">+ Capítulo</button>
    </div>
    <div id="esc-lista"></div>`;

  const lista = $('#esc-lista', c);
  if (!caps.length) {
    lista.innerHTML = `<div class="tarjeta vacio">La escaleta está vacía.<br><span style="font-size:14px">Añade un capítulo o importa la biblia de tu novela.</span></div>`;
  }
  let num = 0, hayVisibles = false;
  top.forEach(n => {
    if (n.tipo === 'parte') { lista.append(el('h3', { class: 'esc-parte' }, n.titulo)); return; }
    num++;
    if (!visible(n)) return;
    hayVisibles = true;
    lista.append(tarjetaCap(n, num, pjs, hoy, c));
  });
  if (caps.length && !hayVisibles) lista.innerHTML = '<div class="tarjeta vacio">Ningún capítulo coincide.</div>';
  $$('.esc-parte', lista).forEach(h => { const sig = h.nextElementSibling; if (!sig || sig.classList.contains('esc-parte')) h.remove(); });

  $('#esc-q', c).oninput = debounce((e) => { escBusca = e.target.value; pintarEscaleta(c); const b = $('#esc-q', c); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }, 250);
  $('#esc-fpov', c).onchange = (e) => { escPov = e.target.value; pintarEscaleta(c); };
  $('#esc-fest', c).onchange = (e) => { escEstado = e.target.value; pintarEscaleta(c); };
  $('#esc-todo', c).onclick = () => { escAbiertos = escAbiertos.size ? new Set() : new Set(caps.map(n => n.id)); pintarEscaleta(c); };
  $('#esc-pdf', c).onclick = () => { escAbiertos = new Set(caps.map(n => n.id)); pintarEscaleta(c); setTimeout(() => window.print(), 100); };
  $('#esc-importar', c).onclick = elegirBiblia;
  if (typeof enlazarAtraso === 'function') enlazarAtraso(c, () => pintarEscaleta(c));
  $('#esc-nuevo', c).onclick = () => {
    const id = uid();
    M.nodos[id] = { id, pid, padre: null, tipo: 'cap', titulo: `Capítulo ${caps.length + 1}`, orden: top.length + 1, estado: 'idea', sinopsis: '', pov: '', notas: '', palabras: 0, e: {} };
    escAbiertos.add(id); guardarMeta(); pintarEscaleta(c);
    const t = $(`[data-cap="${id}"] [data-f="titulo"]`, c); if (t) { t.focus(); t.select(); t.scrollIntoView({ block: 'center' }); }
  };
  $$('[data-escribir]', c).forEach(a => a.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); mostrarVista('escribir'); abrirNodo(a.dataset.escribir); });
}

function tarjetaCap(n, num, pjs, hoy, c) {
  const e = escDe(n);
  e.pasos = e.pasos || ['', '', '', ''];
  const abierto = escAbiertos.has(n.id);
  const w = palabrasCap(n), o = Number(e.obj) || 0;
  const pov = povTexto(n);
  const atrasado = e.plan && e.plan < hoy && w < o * 0.8 && n.estado !== 'terminado';
  const card = el('div', { class: 'tarjeta esc-cap' + (abierto ? ' abierta' : ''), 'data-cap': n.id });
  const cab = el('div', { class: 'esc-cab' },
    el('span', { class: 'esc-num num' }, num),
    el('div', { style: 'min-width:0;flex:1' },
      el('div', { class: 'fila', style: 'gap:8px;flex-wrap:wrap' },
        el('span', { class: `estado e-${n.estado || 'idea'}`, title: n.estado || 'idea' }),
        el('span', { class: 'esc-tit' }, sinNumero(n.titulo) || 'Sin título'),
        pov ? el('span', { class: 'esc-pov' }, el('i', { style: `background:${povColor(n)}` }), pov) : null,
        n.cuando ? el('span', { class: 'esc-meta' }, n.cuando) : null,
        e.funcion ? el('span', { class: 'etq-mom' }, e.funcion) : null,
        e.cliff ? el('span', { class: 'esc-meta', title: 'Termina en cliffhanger' }, '⚑ cliffhanger') : null),
      !abierto && n.sinopsis ? el('div', { class: 'esc-sin' }, n.sinopsis) : null),
    el('div', { class: 'esc-der' },
      e.plan ? el('div', { class: 'esc-meta' + (e.plan === hoy ? ' hoy' : atrasado ? ' tarde' : '') }, e.plan === hoy ? 'Toca hoy' : `Escribir el ${fechaCorta(e.plan)}`) : null,
      el('div', { class: 'esc-meta num' }, o ? `${fmt(w)} / ${fmt(o)}` : `${fmt(w)} palabras`),
      o ? el('div', { class: 'esc-barra' }, el('i', { style: `width:${Math.min(100, w / o * 100)}%` })) : null));
  cab.onclick = (ev) => {
    if (ev.target.closest('a,button,input,select,textarea')) return;
    if (escAbiertos.has(n.id)) escAbiertos.delete(n.id); else escAbiertos.add(n.id);
    pintarEscaleta(c);
  };
  card.append(cab);
  if (!abierto) return card;

  // ---- ficha abierta ----
  const guardar = debounce(() => guardarMeta(), 300);
  const campo = (etq, input, ancho) => el('label', { class: 'campo', style: ancho ? `grid-column:${ancho}` : '' }, el('span', {}, etq), input);
  const txt = (val, set, ph = '', filas = 0) => {
    const i = filas ? el('textarea', { rows: filas, placeholder: ph }, val || '') : el('input', { value: val || '', placeholder: ph });
    i.addEventListener('input', () => { set(i.value); guardar(); });
    return i;
  };
  const titulo = txt(n.titulo, v => { n.titulo = v; }, 'Capítulo 1 · Título');
  titulo.dataset.f = 'titulo';
  const povSel = el('select', { onchange: ev => { n.pov = ev.target.value; guardarMeta(); pintarEscaleta(c); } },
    el('option', { value: '' }, '—'), ...pjs.map(p => el('option', { value: p.id, selected: n.pov === p.id }, nombrePj(p))), el('option', { value: 'dual', selected: n.pov === 'dual' }, 'Dual (los dos)'));
  const estSel = el('select', { onchange: ev => { n.estado = ev.target.value; guardarMeta(); pintarEscaleta(c); } },
    ...['idea', 'borrador', 'revisado', 'terminado'].map(s => el('option', { value: s, selected: (n.estado || 'idea') === s }, s[0].toUpperCase() + s.slice(1))));
  const objIn = el('input', { type: 'number', min: 0, step: 100, value: e.obj || '', placeholder: '2000' });
  objIn.addEventListener('input', () => { e.obj = objIn.value === '' ? '' : Number(objIn.value); guardar(); });
  const plan = el('input', { type: 'date', value: e.plan || '' });
  plan.addEventListener('change', () => { e.plan = plan.value; guardarMeta(); });
  const cliff = el('label', { class: 'check', style: 'margin-top:22px' }, el('input', { type: 'checkbox', checked: !!e.cliff, onchange: ev => { e.cliff = ev.target.checked; guardarMeta(); } }), el('span', {}, 'Termina en cliffhanger'));

  const escenas = hijos(n.id, n.pid);
  const cuerpo = el('div', { class: 'esc-cuerpo' },
    el('div', { class: 'rejilla esc-r4' },
      campo('Título', titulo, '1/-1'),
      campo('Qué pasa', txt(n.sinopsis, v => { n.sinopsis = v; }, 'En pocas líneas: qué pasa y qué cambia', 6), '1/-1'),
      campo('Punto de vista', povSel), campo('Cuándo pasa', txt(n.cuando, v => { n.cuando = v; }, '22 dic (noche)')),
      campo('Función en la historia', txt(e.funcion, v => { e.funcion = v; }, 'Detonante, primer beso…')), campo('Estado', estSel),
      campo('Palabras objetivo', objIn), campo('Escribirlo el', plan), cliff),
    el('h4', { class: 'esc-h' }, 'Guion de escenas'),
    el('div', { class: 'rejilla esc-r4' },
      campo('Emoción al entrar', txt(e.emoEntra, v => { e.emoEntra = v; }, 'Resignada, irónica'), '1/3'),
      campo('Emoción al salir', txt(e.emoSale, v => { e.emoSale = v; }, 'Descolocada'), '3/-1'),
      ...PASOS_GUION.map((p, i) => campo(`${i + 1} · ${p}`, txt(e.pasos[i], v => { e.pasos[i] = v; }, '', 6))),
      campo('Última frase / cierre', txt(e.cierre, v => { e.cierre = v; }, '«Hola, Jules.»'), '1/-1')),
    el('h4', { class: 'esc-h' }, 'Continuidad'),
    el('div', { class: 'rejilla esc-r4' },
      campo('Personajes que salen', txt(e.personajes, v => { e.personajes = v; }, 'Julia, Mateo, Marina'), '1/3'),
      campo('Símbolos', txt(e.simbolos, v => { e.simbolos = v; }, 'Bufanda roja, campanas'), '3/-1'),
      campo('Qué se revela o cambia', txt(e.revela, v => { e.revela = v; }, 'Mateo es el alcalde'), '1/-1'),
      campo('Notas', txt(n.notas, v => { n.notas = v; }, 'Lo que no quieres olvidar', 3), '1/-1')),
    escenas.length ? el('h4', { class: 'esc-h' }, `Escenas (${escenas.length})`) : null,
    ...escenas.map((s, i) => el('div', { class: 'esc-escena' },
      el('span', { class: `estado e-${s.estado || 'idea'}` }),
      el('div', { style: 'flex:1;min-width:0' },
        (() => { const t = el('input', { class: 'txt', value: s.titulo || '', placeholder: `Escena ${i + 1}` }); t.addEventListener('input', () => { s.titulo = t.value; guardar(); }); return t; })(),
        (() => { const t = el('textarea', { class: 'txt', rows: 2, placeholder: 'Qué pasa en esta escena' }, s.sinopsis || ''); t.addEventListener('input', () => { s.sinopsis = t.value; guardar(); }); return t; })()),
      el('a', { href: '#', 'data-escribir': s.id, class: 'esc-meta' }, 'Escribir →'))),
    el('div', { class: 'fila', style: 'margin-top:14px;flex-wrap:wrap' },
      el('button', { class: 'btn prim peq', 'data-escribir': n.id }, 'Escribir este capítulo →'),
      el('button', { class: 'btn peq', onclick: () => { const id = uid(); M.nodos[id] = { id, pid: n.pid, padre: n.id, tipo: 'esc', titulo: `Escena ${escenas.length + 1}`, orden: escenas.length + 1, estado: 'idea', sinopsis: '', pov: n.pov || '', notas: '', palabras: 0 }; M.abiertos[n.id] = true; guardarMeta(); pintarEscaleta(c); } }, '+ Escena'),
      el('button', { class: 'btn peq', title: 'Subir', onclick: () => { mover(n.id, -1); pintarEscaleta(c); } }, '↑'),
      el('button', { class: 'btn peq', title: 'Bajar', onclick: () => { mover(n.id, 1); pintarEscaleta(c); } }, '↓'),
      el('span', { style: 'flex:1' }),
      el('button', { class: 'btn peq', style: 'color:var(--rojo)', onclick: async () => { await borrarNodo(n.id); if (vistaActual !== 'plan') mostrarVista('plan'); else pintarEscaleta(c); } }, 'Borrar capítulo')));
  card.append(cuerpo);
  return card;
}

// ---------- lo que se ve en Escribir, en el panel de la escena ----------
function cajaEscaleta(n) {
  const nodo = n.tipo === 'esc' ? M.nodos[n.padre] : n;
  const e = nodo && nodo.e;
  if (!e) return '';
  const pasos = (e.pasos || []).map((p, i) => p ? `<li><b>${PASOS_GUION[i]}.</b> ${esc(p)}</li>` : '').join('');
  const datos = [e.funcion, e.obj ? `${fmt(e.obj)} palabras` : '', e.cliff ? '⚑ cliffhanger' : ''].filter(Boolean).join(' · ');
  if (!pasos && !datos && !e.cierre && !e.emoEntra) return '';
  return `<details class="caja-esc" open><summary>Escaleta${n.tipo === 'esc' ? ' del capítulo' : ''}</summary>
    ${datos ? `<div class="tenue" style="font-size:12.5px;margin:4px 0 6px">${esc(datos)}</div>` : ''}
    ${e.emoEntra || e.emoSale ? `<div style="font-size:13px;margin-bottom:6px">${esc(e.emoEntra || '…')} → ${esc(e.emoSale || '…')}</div>` : ''}
    ${pasos ? `<ol>${pasos}</ol>` : ''}
    ${e.cierre ? `<div style="font-size:13px"><b>Cierre:</b> ${esc(e.cierre)}</div>` : ''}
    ${e.revela ? `<div style="font-size:13px;margin-top:4px"><b>Se revela:</b> ${esc(e.revela)}</div>` : ''}
    <a href="#" class="tenue" style="font-size:12px" onclick="event.preventDefault();planTab='escaleta';escAbiertos.add('${nodo.id}');mostrarVista('plan')">Editar en Plan › Escaleta</a></details>`;
}

// =====================================================================
//  IMPORTAR BIBLIA (archivo .json que prepara Claude a partir de tu
//  Word, Excel o Docs: app = «novelia-biblia»)
// =====================================================================
function elegirBiblia() {
  const f = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  f.onchange = async () => {
    const a = f.files[0]; f.remove(); if (!a) return;
    let B; try { B = JSON.parse(await a.text()); } catch (err) { aviso('Ese archivo no se puede leer'); return; }
    if (!B || B.app !== 'novelia-biblia') { aviso(B && ['mesa-de-escritura', 'novelia-studio'].includes(B.app) ? 'Eso es una copia de seguridad: se restaura en Ajustes' : 'Ese archivo no es una biblia para Novelia'); return; }
    modalBiblia(B);
  };
  document.body.append(f); f.click();
}

function modalBiblia(B) {
  const actual = proyecto();
  // Si solo trae personajes (o fichas sueltas), lo normal es meterlo en la novela abierta
  const mismo = M.proyectos.find(p => p.titulo.trim().toLowerCase() === (B.titulo || '').trim().toLowerCase()) || (!(B.capitulos || []).length ? actual : null);
  const cuenta = [
    [B.capitulos, 'capítulo', 'capítulos', 'Escaleta'], [B.personajes, 'personaje', 'personajes', 'Personajes'], [B.crono, 'momento', 'momentos', 'Cronología'],
    [B.siembras, 'siembra', 'siembras', 'Continuidad'], [B.secretos, 'secreto', 'secretos', 'Continuidad'],
    [B.cabos, 'cabo suelto', 'cabos sueltos', 'Cabos sueltos'], [B.notas, 'nota', 'notas', 'Libreta'],
  ].filter(([x]) => x && x.length);
  const cats = [...new Set((B.notas || []).map(n => n.cat))];
  modal(`<h3>Importar «${esc(B.titulo || 'biblia')}»</h3>
    <ul class="lista-imp">${cuenta.map(([x, s, pl, d]) => `<li><b class="num">${x.length}</b> ${x.length === 1 ? s : pl} <span class="tenue">→ ${d}</span></li>`).join('')}
      ${B.momentos ? `<li><b class="num">${Object.keys(B.momentos).length}</b> momentos clave <span class="tenue">→ Estructura romántica</span></li>` : ''}</ul>
    ${cats.length ? `<p class="tenue" style="font-size:12.5px;margin:-4px 0 12px">En la libreta, con las etiquetas: ${cats.map(esc).join(', ')}.</p>` : ''}
    <div class="campo"><span>¿Dónde lo meto?</span>
      <label class="check"><input type="radio" name="dest" value="nueva"${mismo ? '' : ' checked'}><span>En una novela nueva: «${esc(B.titulo)}»</span></label>
      <label class="check"><input type="radio" name="dest" value="${(mismo || actual).id}"${mismo ? ' checked' : ''}><span>En «${esc((mismo || actual).titulo)}»${(mismo || actual).id === actual.id ? ' (la que tienes abierta)' : ''}</span></label></div>
    ${(B.personajes || []).length ? `<label class="check"><input type="checkbox" id="bi-act"><span>Si un personaje ya existe, actualizar su ficha con lo de esta biblia<small>Sin marcar, solo relleno lo que esté vacío y no cambio nada de lo que ya tienes.</small></span></label>` : ''}
    ${B.objetivo ? `<label class="check"><input type="checkbox" id="bi-obj" checked><span>Objetivo: ${fmt(B.objetivo)} palabras${B.fechaLimite ? ` para el ${fechaLarga(deStr(B.fechaLimite))}` : ''}</span></label>` : ''}
    <p class="suave" style="font-size:13px">No se borra nada y no toco lo que hayas escrito. Si la novela ya tiene capítulos, completo su escaleta en orden (el 1 con el 1…) y solo relleno lo que esté vacío. Si la importas dos veces, no se duplica.</p>
    <div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="bi-ok">Importar</button></div>`, {
    ancho: 520,
    alAbrir: (m, cerrar) => {
      $('#bi-ok', m).onclick = () => {
        const dest = $('input[name="dest"]:checked', m).value;
        const obj = $('#bi-obj', m) ? $('#bi-obj', m).checked : false;
        B.actualizarPjs = $('#bi-act', m) ? $('#bi-act', m).checked : false;
        cerrar();
        try {
          const r = aplicarBiblia(B, dest === 'nueva' ? null : dest, obj);
          guardarMeta.ya ? guardarMeta.ya() : guardarMeta();
          cambiarProyecto(r.pid);
          planTab = 'escaleta'; mostrarVista('plan');
          aviso(`Importado: ${r.resumen}`);
        } catch (err) { console.error(err); aviso('Algo ha fallado al importar. No se ha guardado nada a medias: recarga la app.'); }
      };
    }
  });
}

function aplicarBiblia(B, pidDestino, usarObjetivo) {
  let pid = pidDestino;
  const ahora = Date.now();
  if (!pid) {
    pid = uid();
    M.proyectos.push({ id: pid, titulo: B.titulo || 'Novela importada', objetivo: B.objetivo || 80000, fechaLimite: B.fechaLimite || diaStr(sumarDias(new Date(), 180)), creado: ahora });
  }
  const P = M.proyectos.find(p => p.id === pid);
  if (usarObjetivo) { if (B.objetivo) P.objetivo = B.objetivo; if (B.fechaLimite) P.fechaLimite = B.fechaLimite; }
  if (B.modoCrono && !P.modoCrono) P.modoCrono = B.modoCrono;
  const idDe = (x) => `${x}-${pid}`;
  const hecho = [];

  // --- personajes (se unen por el nombre) ---
  const norm = (s) => (s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const mios = () => M.personajes.filter(p => p.pid === pid);
  let nPj = 0, nAct = 0;
  (B.personajes || []).forEach(x => {
    const nombre = x.f && x.f.nombre; if (!nombre) return;
    // se reconoce por el nombre o por un apodo («la madre de Mateo» = Asun)
    const formas = (f) => [f.nombre, ...String(f.apodos || '').split(/[,;]/)].map(s => norm(String(s || '').replace(/\([^)]*\)/g, '')).replace(/^(el|la|los|las)\s+/, '').replace(/[«»"]/g, '').trim()).filter(s => s.length > 1);
    const mias = formas(x.f);
    const ya = mios().find(p => norm(nombrePj(p)) === norm(nombre)) || mios().find(p => formas(p.f).some(f => mias.includes(f)));
    if (ya) {
      Object.entries(x.f).forEach(([k, v]) => {
        if (!v || k === 'nombre') return;
        if (!ya.f[k]) ya.f[k] = v;
        else if (B.actualizarPjs && k !== 'apodos' && ya.f[k] !== v) ya.f[k] = v;
      });
      ya.extra = ya.extra || [];
      (x.extra || []).forEach(d => {
        const e = ya.extra.find(e => norm(e.k) === norm(d.k));
        if (!e) ya.extra.push({ k: d.k, v: d.v }); else if (B.actualizarPjs && d.v) e.v = d.v;
      });
      nAct++;
    } else {
      M.personajes.push({ id: uid(), pid, color: COLORES_PJ[mios().length % COLORES_PJ.length], f: { ...x.f }, extra: (x.extra || []).map(d => ({ k: d.k, v: d.v })) });
      nPj++;
    }
  });
  if (nPj) hecho.push(plural(nPj, 'personaje nuevo', 'personajes nuevos'));
  if (nAct) hecho.push(`${plural(nAct, 'ficha')} ${B.actualizarPjs ? 'actualizada' + (nAct === 1 ? '' : 's') : 'completada' + (nAct === 1 ? '' : 's')}`);
  const povId = (t) => {
    if (!t) return '';
    if (norm(t) === 'dual') return 'dual';
    const p = mios().find(p => norm(nombrePj(p)) === norm(t) || norm(nombrePj(p)).split(' ')[0] === norm(t));
    return p ? p.id : '';
  };

  // --- capítulos y escaleta ---
  const top = hijos(null, pid);
  const existentes = top.filter(n => n.tipo === 'cap');
  const porDefecto = (t) => !t || /^Cap[ií]tulo\s+\d+$/i.test(t.trim());
  const capIds = [];
  let nCap = 0;
  (B.capitulos || []).forEach((x, i) => {
    let n = existentes[i];
    if (!n) { nCap++; const id = uid(); n = M.nodos[id] = { id, pid, padre: null, tipo: 'cap', titulo: '', orden: 1e6 + i, estado: x.estado || 'idea', sinopsis: '', pov: '', notas: '', palabras: 0 }; }
    if (porDefecto(n.titulo)) n.titulo = x.titulo || n.titulo || `Capítulo ${i + 1}`;
    if (!n.sinopsis && x.sinopsis) n.sinopsis = x.sinopsis;
    if (!n.pov) n.pov = povId(x.pov);
    if (!n.cuando && x.cuando) n.cuando = x.cuando;
    const notas = [x.notas, x.notasGuion ? 'Guion: ' + x.notasGuion : ''].filter(Boolean).join('\n');
    if (notas && !(n.notas || '').includes(notas)) n.notas = [n.notas, notas].filter(Boolean).join('\n');
    const e = escDe(n);
    const nuevo = { acto: x.acto, funcion: x.funcion, obj: x.obj, personajes: x.personajes, simbolos: x.simbolos, revela: x.revela, cliff: x.cliff, plan: x.plan, emoEntra: x.emoEntra, emoSale: x.emoSale, cierre: x.cierre };
    Object.entries(nuevo).forEach(([k, v]) => { if (v !== undefined && v !== '' && (e[k] === undefined || e[k] === '' || e[k] === false)) e[k] = v; });
    e.pasos = (e.pasos && e.pasos.some(Boolean)) ? e.pasos : (x.pasos || ['', '', '', '']).slice(0, 4);
    capIds.push(n.id);
  });
  if (nCap) hecho.push(plural(nCap, 'capítulo'));
  if (capIds.length > nCap) hecho.push(`escaleta de ${plural(capIds.length - nCap, 'capítulo')} que ya tenías`);

  // --- partes (actos) y orden ---
  if ((B.actos || []).length && !top.some(n => n.tipo === 'parte')) {
    const orden = [];
    const usados = new Set();
    B.actos.forEach(a => {
      const id = uid();
      M.nodos[id] = { id, pid, padre: null, tipo: 'parte', titulo: a.titulo, orden: 0, estado: 'idea', sinopsis: '', pov: '', notas: '', palabras: 0 };
      orden.push(id);
      (a.caps || []).forEach(k => { const cid = capIds[k - 1]; if (cid && !usados.has(cid)) { orden.push(cid); usados.add(cid); } });
    });
    hijos(null, pid).forEach(n => { if (!orden.includes(n.id)) orden.push(n.id); });
    orden.forEach((id, i) => { M.nodos[id].orden = i + 1; });
  } else {
    hijos(null, pid).forEach((n, i) => { n.orden = i + 1; });
  }
  if (!M.sel[pid] || !M.nodos[M.sel[pid]]) M.sel[pid] = capIds[0] || M.sel[pid];

  // --- estructura romántica ---
  if (B.momentos || B.povEstructura) {
    const E = M.estructura[pid] = M.estructura[pid] || { caps: 30, momentos: {}, capitulos: {} };
    if (capIds.length) E.caps = Math.max(3, hijos(null, pid).filter(n => n.tipo === 'cap').length);
    Object.entries(B.momentos || {}).forEach(([k, v]) => { const m = E.momentos[k] = E.momentos[k] || { cap: '', nota: '', hecho: false }; if (!m.cap) m.cap = v.cap; if (!m.nota) m.nota = v.nota || ''; });
    (B.capitulos || []).forEach((x, i) => {
      const cc = E.capitulos[i + 1] = E.capitulos[i + 1] || { pov: '', t: '', r: '' };
      if (!cc.pov && B.povEstructura && B.povEstructura[x.pov]) cc.pov = B.povEstructura[x.pov];
      if (!cc.r) cc.r = x.funcion || '';
    });
  }

  // --- cronología ---
  const yaCr = new Set(M.crono.map(e => e.id));
  let nCr = 0;
  (B.crono || []).forEach(x => { const id = idDe(x.id); if (yaCr.has(id)) return; M.crono.push({ id, pid, fecha: x.fecha || '', dia: x.dia ?? '', hora: x.hora || '', cap: x.cap ?? '', tipo: x.tipo || 'escena', titulo: x.titulo || '', desc: x.desc || '', pjs: x.pjs || [] }); nCr++; });
  if (nCr) hecho.push(plural(nCr, 'momento') + ' en la cronología');

  // --- cabos sueltos ---
  const yaCb = new Set(M.cabos.map(e => e.id));
  let nCb = 0;
  (B.cabos || []).forEach((x, i) => { const id = idDe(x.id); if (yaCb.has(id)) return; M.cabos.push({ id, pid, text: x.text, prio: x.prio || 'media', due: x.due || '', done: !!x.done, doneAt: x.done ? diaStr() : null, created: ahora + i }); nCb++; });
  if (nCb) hecho.push(plural(nCb, 'cabo suelto', 'cabos sueltos'));

  // --- continuidad: siembras y secretos ---
  M.siembras = M.siembras || []; M.secretos = M.secretos || [];
  const yaS = new Set([...M.siembras, ...M.secretos].map(e => e.id));
  let nS = 0, nX = 0;
  (B.siembras || []).forEach(x => { const id = idDe(x.id); if (yaS.has(id)) return; M.siembras.push({ id, pid, que: x.que || '', siembra: x.siembra || [], recoge: x.recoge || [], nota: x.nota || '', hecho: {} }); nS++; });
  (B.secretos || []).forEach(x => { const id = idDe(x.id); if (yaS.has(id)) return; M.secretos.push({ id, pid, que: x.que || '', saben: x.saben || '', enteran: x.enteran || [], nota: x.nota || '' }); nX++; });
  if (nS) hecho.push(plural(nS, 'siembra'));
  if (nX) hecho.push(plural(nX, 'secreto'));

  // --- libreta ---
  const yaId = new Set(M.ideas.map(e => e.id));
  const nuevas = [];
  (B.notas || []).forEach((x, i) => {
    const id = idDe(x.id); if (yaId.has(id)) return;
    if (x.cat && !M.etiquetas.includes(x.cat)) M.etiquetas.push(x.cat);
    nuevas.push({ id, pid, texto: x.texto, cat: x.cat || M.etiquetas[0], hecha: false, creada: ahora - i });
  });
  M.ideas = [...nuevas, ...M.ideas];
  if (nuevas.length) hecho.push(plural(nuevas.length, 'nota') + ' en la libreta');

  return { pid, resumen: hecho.join(', ') || 'no había nada nuevo' };
}
