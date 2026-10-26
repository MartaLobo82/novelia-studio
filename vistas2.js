'use strict';
// =====================================================================
//  Novelia Studio — lo que venía de las 13 extensiones del Taller:
//  Libreta, Personajes, Plan (Estructura romántica, Cronología, Cabos
//  sueltos), Tablero, Leer y escuchar, Texto pegado, Bloqueo, Ajustes
//  e importador de la copia de seguridad.
// =====================================================================

// =====================================================================
//  LIBRETA
// =====================================================================
let filtroIdeas = 'Todas', catNueva = null, buscaIdeas = '';
VISTAS.libreta = (cont) => {
  const tags = M.etiquetas;
  if (!catNueva || !tags.includes(catNueva)) catNueva = tags[0];
  const todas = M.ideas.filter(i => i.pid === M.actual || !i.pid);
  const lista = todas.filter(i => filtroIdeas === 'Todas' ? !i.hecha : filtroIdeas === 'Hechas' ? i.hecha : i.cat === filtroIdeas && !i.hecha)
    .filter(i => !buscaIdeas || i.texto.toLowerCase().includes(buscaIdeas.toLowerCase()));
  cont.innerHTML = `<div class="pagina">
    <div class="fila sep" style="align-items:flex-start;flex-wrap:wrap"><div><h1>La libreta</h1><p class="sub">Ideas sueltas. Desde cualquier web: selecciona texto, botón derecho → Novelia Studio → «Llevar a la libreta».</p></div>
      <div class="fila"><button class="btn peq" id="li-txt">Exportar .txt</button><button class="btn peq" id="li-doc">Exportar a Word</button></div></div>
    <div class="entrada-idea"><input class="txt" id="li-in" placeholder="Apunta la idea y pulsa Enter"></div>
    <div style="margin-bottom:6px"><span class="suave" style="font-size:12px;margin-right:6px">Va en:</span>${tags.map(c => `<span class="chip${c === catNueva ? ' on' : ''}" data-cn="${esc(c)}" title="Clic para elegir · doble clic para borrar la etiqueta">${esc(c)}</span>`).join('')}<span class="chip" id="li-nueva">+ nueva</span></div>
    <div class="fila sep" style="margin:16px 0 14px;flex-wrap:wrap"><div>${['Todas', ...tags, 'Hechas'].map(c => `<span class="chip${c === filtroIdeas ? ' on' : ''}" data-f="${esc(c)}">${esc(c)}</span>`).join('')}</div>
      <input class="txt" id="li-busca" placeholder="Buscar…" value="${esc(buscaIdeas)}" style="width:200px"></div>
    <div class="ideas">${lista.length ? lista.map(i => `<div class="idea${i.hecha ? ' hecha' : ''}" data-id="${i.id}">
      <select class="cat-sel" data-cat>${tags.map(t => `<option${t === i.cat ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
      <div class="tx" contenteditable="true">${esc(i.texto)}</div>
      ${i.url ? `<div style="font-size:12px;margin-bottom:6px"><a href="${esc(i.url)}" target="_blank">${esc((i.titulo || i.url).slice(0, 60))}</a></div>` : ''}
      <div class="pie-idea"><span>${new Date(i.creada).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span><span><button class="icono" data-hecha title="${i.hecha ? 'Recuperar' : 'Hecha'}">${i.hecha ? '↺' : '✓'}</button><button class="icono" data-borrar title="Borrar">✕</button></span></div></div>`).join('') : `<div class="vacio" style="grid-column:1/-1">${todas.length ? 'Nada coincide.' : 'La libreta está en blanco. Por ahora.'}</div>`}</div></div>`;
  const inp = $('#li-in', cont);
  inp.onkeydown = (e) => { if (e.key === 'Enter' && inp.value.trim()) { nuevaIdea(inp.value.trim(), catNueva); VISTAS.libreta(cont); $('#li-in', cont).focus(); aviso(`Guardada en ${catNueva}`); } };
  $$('[data-cn]', cont).forEach(c => {
    c.onclick = () => { catNueva = c.dataset.cn; VISTAS.libreta(cont); $('#li-in', cont).focus(); };
    c.ondblclick = () => {
      const t = c.dataset.cn;
      if (M.etiquetas.length <= 1) return;
      if (M.ideas.some(i => i.cat === t)) { aviso('Hay ideas con esa etiqueta; no la borro'); return; }
      M.etiquetas = M.etiquetas.filter(x => x !== t); guardarMeta(); VISTAS.libreta(cont);
    };
  });
  $('#li-nueva', cont).onclick = async () => { const t = await pedirTexto('Nueva etiqueta', '', 'Nombre'); if (t && !M.etiquetas.includes(t)) { M.etiquetas.push(t); catNueva = t; guardarMeta(); } VISTAS.libreta(cont); };
  $$('[data-f]', cont).forEach(c => c.onclick = () => { filtroIdeas = c.dataset.f; VISTAS.libreta(cont); });
  $('#li-busca', cont).oninput = debounce((e) => { buscaIdeas = e.target.value; VISTAS.libreta(cont); const b = $('#li-busca', cont); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }, 250);
  $$('.idea', cont).forEach(card => {
    const idea = M.ideas.find(i => i.id === card.dataset.id);
    $('.tx', card).onblur = (e) => { const t = e.target.innerText.trim(); if (t && t !== idea.texto) { idea.texto = t; guardarMeta(); } };
    $('[data-cat]', card).onchange = (e) => { idea.cat = e.target.value; guardarMeta(); VISTAS.libreta(cont); };
    $('[data-hecha]', card).onclick = () => { idea.hecha = !idea.hecha; guardarMeta(); VISTAS.libreta(cont); };
    $('[data-borrar]', card).onclick = () => { const i = M.ideas.indexOf(idea); M.ideas.splice(i, 1); guardarMeta(); VISTAS.libreta(cont); aviso('Idea borrada', { texto: 'Deshacer', fn: () => { M.ideas.splice(i, 0, idea); guardarMeta(); VISTAS.libreta(cont); } }); };
  });
  const agrupadas = () => M.etiquetas.map(t => [t, todas.filter(i => i.cat === t).sort((a, b) => a.creada - b.creada)]).filter(([, l]) => l.length);
  $('#li-txt', cont).onclick = () => {
    if (!todas.length) return aviso('La libreta está vacía');
    const t = `MI LIBRETA — ${fechaLarga(new Date())}\n\n` + agrupadas().map(([t, ns]) => `== ${t.toUpperCase()} ==\n\n` + ns.map(n => `• ${n.texto}${n.hecha ? ' (hecha)' : ''}`).join('\n\n')).join('\n\n\n');
    descargar(new Blob(['﻿' + t], { type: 'text/plain;charset=utf-8' }), `Mi libreta ${diaStr()}.txt`);
  };
  $('#li-doc', cont).onclick = () => {
    if (!todas.length) return aviso('La libreta está vacía');
    const html = `<html><head><meta charset="utf-8"><title>Mi libreta</title><style>body{font-family:Georgia,serif;font-size:12pt}h1,h2{color:#2f5d50}h2{border-bottom:1px solid #ddd;margin-top:24pt}p{margin:0 0 10pt}</style></head><body><h1>Mi libreta</h1><p style="color:#777">${fechaLarga(new Date())}</p>` +
      agrupadas().map(([t, ns]) => `<h2>${esc(t)}</h2>` + ns.map(n => `<p>${esc(n.texto).replace(/\n/g, '<br>')}</p>`).join('')).join('') + '</body></html>';
    descargar(new Blob([html], { type: 'application/msword' }), `Mi libreta ${diaStr()}.doc`);
  };
};

// =====================================================================
//  PERSONAJES (la ficha completa de la Biblia de personajes)
// =====================================================================
const GRUPOS_PJ = [
  { titulo: 'Lo básico', campos: [
    { k: 'apodos', l: 'Apodos', ph: 'Phé, «la francesa»' },
    { k: 'rol', l: 'Papel', ops: ['', 'Protagonista', 'Interés amoroso', 'Secundario', 'Antagonista', 'Familia', 'Amistad', 'Mención'] },
    { k: 'edad', l: 'Edad', ph: '29' }, { k: 'cumple', l: 'Cumpleaños', ph: '14 de marzo' },
    { k: 'oficio', l: 'Trabajo', ph: 'Restauradora de libros' }, { k: 'vive', l: 'Dónde vive', ph: 'Piso en Lavapiés' }] },
  { titulo: 'Cómo es por fuera', campos: [
    { k: 'ojos', l: 'Ojos', ph: 'Verdes, con motas doradas' }, { k: 'pelo', l: 'Pelo', ph: 'Castaño, ondulado, por los hombros' },
    { k: 'cuerpo', l: 'Altura y complexión', ph: '1,62, menuda' }, { k: 'estilo', l: 'Cómo viste', ph: 'Jerséis enormes, botas' },
    { k: 'rasgos', l: 'Marcas, tatuajes, lunares', ph: 'Cicatriz en la ceja izquierda', full: true }, { k: 'olor', l: 'Olor / perfume', ph: 'Vainilla y papel viejo' }] },
  { titulo: 'Cómo habla', campos: [
    { k: 'voz', l: 'Forma de hablar', ph: 'Frases cortas, ironía, tacos cuando se enfada', full: true, area: 2 },
    { k: 'muletillas', l: 'Expresiones / muletillas', ph: '«Ni de broma», «mira tú»', full: true }] },
  { titulo: 'Por dentro', campos: [
    { k: 'personalidad', l: 'Personalidad', full: true, area: 2 },
    { k: 'deseo', l: 'Qué quiere', area: 2 }, { k: 'necesita', l: 'Qué necesita de verdad', area: 2 },
    { k: 'herida', l: 'Su herida', area: 2 }, { k: 'miedo', l: 'Su mayor miedo', area: 2 },
    { k: 'secreto', l: 'Su secreto', area: 2 }, { k: 'arco', l: 'Arco: de… a…', area: 2 }] },
  { titulo: 'Relaciones', campos: [{ k: 'relaciones', l: 'Con quién y cómo', ph: 'Ant: ex de la adolescencia, seis años sin hablarse…', full: true, area: 3 }] },
  { titulo: 'Notas', campos: [{ k: 'notas', l: 'Todo lo demás', full: true, area: 4 }] }
];
const nombrePj = (p) => (p.f ? p.f.nombre : p.nombre) || '';
const inicialesPj = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
function migrarPersonajes() {
  M.personajes.forEach(p => {
    if (p.f) return;
    p.f = { nombre: p.nombre || '', apodos: p.apodo || '', rol: p.rol || '', edad: p.edad || '', oficio: p.oficio || '', rasgos: p.aspecto || '',
      personalidad: p.personalidad || '', deseo: p.quiere || '', necesita: p.necesita || '', herida: p.herida || '', arco: p.arco || '',
      voz: p.voz || '', relaciones: p.relaciones || '', notas: p.notas || '' };
    p.extra = p.extra || [];
    ['nombre', 'apodo', 'rol', 'edad', 'oficio', 'aspecto', 'personalidad', 'quiere', 'necesita', 'herida', 'arco', 'voz', 'relaciones', 'notas'].forEach(k => delete p[k]);
  });
}
let pjSel = null, pjBusca = '';
VISTAS.personajes = (cont) => {
  const pjs = M.personajes.filter(p => p.pid === M.actual).sort((a, b) => nombrePj(a).localeCompare(nombrePj(b), 'es'));
  const q = pjBusca.toLowerCase();
  const texto = (p) => [...Object.values(p.f || {}), ...(p.extra || []).flatMap(e => [e.k, e.v])].join(' ').toLowerCase();
  const visibles = pjs.filter(p => !q || texto(p).includes(q));
  if (!pjSel || !pjs.some(p => p.id === pjSel)) pjSel = pjs[0] && pjs[0].id;
  const p = pjs.find(x => x.id === pjSel);
  let apariciones = '';
  if (p && nombrePj(p).trim()) {
    const nombres = [nombrePj(p).trim().split(/\s+/)[0], ...(p.f.apodos || '').split(/[,;]/).map(s => s.replace(/[«»"]/g, '').trim())].filter(x => x && x.length > 1);
    const re = new RegExp(`(?<![\\p{L}])(${nombres.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}])`, 'giu');
    const cuenta = estructuraNovela().filter(c => !c.parte).map(c => { const t = htmlATexto(c.parrafos.map(x => `<p>${x}</p>`).join('')); return { t: c.titulo, id: c.id, n: (t.match(re) || []).length }; }).filter(x => x.n);
    const pov = Object.values(M.nodos).filter(n => n.pid === M.actual && n.pov === p.id).length;
    apariciones = `<div class="tarjeta" style="margin-top:18px;padding:16px"><h2>En la novela</h2>${cuenta.length ? `<p style="margin:0 0 8px">Sale ${plural(cuenta.reduce((a, x) => a + x.n, 0), 'vez', 'veces')} en ${plural(cuenta.length, 'capítulo')}${pov ? ` · narra ${plural(pov, 'escena')}` : ''}.</p>${cuenta.map(x => `<span class="chip" data-ir="${x.id}">${esc(x.t)} · ${x.n}</span>`).join('')}` : '<p class="tenue" style="margin:0">Todavía no aparece por su nombre en lo que has escrito en Novelia.</p>'}</div>`;
  }
  const campo = (c) => {
    const v = (p.f[c.k] || '');
    const input = c.ops ? `<select data-k="${c.k}">${c.ops.map(o => `<option value="${esc(o)}"${o === v ? ' selected' : ''}>${o || '—'}</option>`).join('')}</select>`
      : c.area ? `<textarea data-k="${c.k}" rows="${c.area}" placeholder="${esc(c.ph || '')}">${esc(v)}</textarea>`
      : `<input data-k="${c.k}" value="${esc(v)}" placeholder="${esc(c.ph || '')}">`;
    return `<label class="campo" style="${c.full ? 'grid-column:1/-1' : ''}"><span>${c.l}</span>${input}</label>`;
  };
  cont.innerHTML = `<div class="pagina" style="max-width:1120px">
    <div class="fila sep" style="align-items:flex-start;flex-wrap:wrap"><div><h1>Personajes</h1><p class="sub">La biblia de «${esc(proyecto().titulo)}».</p></div><button class="btn peq" id="pj-word">Exportar a Word</button></div>
    <div class="personajes">
      <div class="lista-pj"><input class="txt" id="pj-q" placeholder="Buscar (ojos verdes, Lavapiés…)" value="${esc(pjBusca)}" style="margin-bottom:10px">
        ${visibles.map(x => `<div class="pj${x.id === pjSel ? ' sel' : ''}" data-pj="${x.id}"><span class="avatar" style="background:${x.color}">${esc(inicialesPj(nombrePj(x)))}</span><div style="min-width:0"><div class="pj-n" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(nombrePj(x) || 'Sin nombre')}</div><small>${esc([x.f.rol, x.f.edad ? x.f.edad + ' años' : ''].filter(Boolean).join(' · '))}</small></div></div>`).join('') || (pjs.length ? '<p class="tenue">Nadie coincide.</p>' : '')}
        <button class="btn" id="pj-nuevo" style="margin-top:10px;width:100%;justify-content:center">+ Nuevo personaje</button>${apariciones}</div>
      <div>${p ? `<div class="tarjeta">
        <div class="fila" style="margin-bottom:6px"><span class="avatar" style="background:${p.color};width:52px;height:52px;font-size:20px" id="pj-av">${esc(inicialesPj(nombrePj(p)))}</span>
          <input id="pj-nombre" value="${esc(nombrePj(p))}" placeholder="Nombre del personaje" style="flex:1;border:0;background:none;font:400 30px var(--serif);outline:none;min-width:0"><button class="icono" id="pj-borrar" title="Borrar personaje">✕</button></div>
        <div style="margin:0 0 6px 62px">${COLORES_PJ.map(c => `<span class="color-pj${c === p.color ? ' on' : ''}" data-color="${c}" style="background:${c}"></span>`).join('')}</div>
        ${GRUPOS_PJ.slice(0, -2).map(g => `<h2 style="margin-top:20px">${g.titulo}</h2><div class="rejilla r2" style="gap:2px 16px">${g.campos.map(campo).join('')}</div>`).join('')}
        <h2 style="margin-top:20px">Datos sueltos</h2><p class="tenue" style="margin:-6px 0 8px;font-size:12.5px">Lo que no cabe arriba: alergias, coche, mascota, canción favorita…</p>
        <div id="pj-extra">${(p.extra || []).map((e, i) => `<div class="fila" style="margin-bottom:6px"><input class="txt" data-ek="${i}" value="${esc(e.k)}" placeholder="Dato (p. ej. Coche)" style="flex:1"><input class="txt" data-ev="${i}" value="${esc(e.v)}" placeholder="Valor (p. ej. Golf rojo de 2009)" style="flex:2"><button class="icono" data-equitar="${i}">✕</button></div>`).join('')}</div>
        <button class="btn peq" id="pj-dato">+ Añadir dato</button>
        ${GRUPOS_PJ.slice(-2).map(g => `<h2 style="margin-top:20px">${g.titulo}</h2><div class="rejilla r2" style="gap:2px 16px">${g.campos.map(campo).join('')}</div>`).join('')}
      </div>` : '<div class="tarjeta vacio">Tu biblia está vacía. Empieza por tu protagonista.</div>'}</div>
    </div></div>`;
  $$('[data-pj]', cont).forEach(d => d.onclick = () => { pjSel = d.dataset.pj; VISTAS.personajes(cont); });
  $('#pj-q', cont).oninput = debounce((e) => { pjBusca = e.target.value; VISTAS.personajes(cont); const b = $('#pj-q', cont); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }, 250);
  $('#pj-nuevo', cont).onclick = () => { const n = { id: uid(), pid: M.actual, color: COLORES_PJ[M.personajes.length % COLORES_PJ.length], f: { nombre: '' }, extra: [] }; M.personajes.push(n); pjSel = n.id; pjBusca = ''; guardarMeta(); VISTAS.personajes(cont); $('#pj-nombre', cont).focus(); };
  $('#pj-word', cont).onclick = () => exportarBiblia(pjs);
  $$('[data-ir]', cont).forEach(c => c.onclick = () => { mostrarVista('escribir'); abrirNodo(c.dataset.ir); });
  if (!p) return;
  $('#pj-nombre', cont).oninput = (e) => { p.f.nombre = e.target.value; guardarMeta(); const l = $(`[data-pj="${p.id}"] .pj-n`, cont); if (l) l.textContent = p.f.nombre || 'Sin nombre'; $$(`[data-pj="${p.id}"] .avatar, #pj-av`, cont).forEach(a => a.textContent = inicialesPj(p.f.nombre)); };
  $$('[data-k]', cont).forEach(i => i.oninput = i.onchange = () => { p.f[i.dataset.k] = i.value; guardarMeta(); });
  $$('[data-color]', cont).forEach(c => c.onclick = () => { p.color = c.dataset.color; guardarMeta(); VISTAS.personajes(cont); });
  $$('[data-ek]', cont).forEach(i => i.oninput = () => { p.extra[+i.dataset.ek].k = i.value; guardarMeta(); });
  $$('[data-ev]', cont).forEach(i => i.oninput = () => { p.extra[+i.dataset.ev].v = i.value; guardarMeta(); });
  $$('[data-equitar]', cont).forEach(b => b.onclick = () => { p.extra.splice(+b.dataset.equitar, 1); guardarMeta(); VISTAS.personajes(cont); });
  $('#pj-dato', cont).onclick = () => { p.extra = p.extra || []; p.extra.push({ k: '', v: '' }); guardarMeta(); VISTAS.personajes(cont); const ins = $$('[data-ek]', cont); ins[ins.length - 1].focus(); };
  $('#pj-borrar', cont).onclick = async () => { if (!(await preguntar(`¿Borrar a ${nombrePj(p) || 'este personaje'}?`, 'Se borra su ficha. El texto de la novela no se toca.', 'Borrar', true))) return; M.personajes = M.personajes.filter(x => x.id !== p.id); guardarMeta(); VISTAS.personajes(cont); };
};
function exportarBiblia(pjs) {
  if (!pjs.length) return aviso('No hay personajes');
  const e = (s) => esc(s).replace(/\n/g, '<br>');
  const body = pjs.map(p => `<h1>${e(nombrePj(p) || 'Sin nombre')}</h1>` + GRUPOS_PJ.map(g => {
    const filas = g.campos.filter(c => p.f[c.k]).map(c => `<p><b>${e(c.l)}:</b> ${e(p.f[c.k])}</p>`).join('');
    return filas ? `<h2>${e(g.titulo)}</h2>${filas}` : '';
  }).join('') + ((p.extra || []).filter(x => x.k || x.v).length ? '<h2>Datos sueltos</h2>' + p.extra.filter(x => x.k || x.v).map(x => `<p><b>${e(x.k)}:</b> ${e(x.v)}</p>`).join('') : '')).join('<br style="page-break-before:always">');
  const html = `<html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;font-size:11.5pt}h1{color:#2f5d50;font-size:20pt}h2{color:#2f5d50;font-size:12pt;border-bottom:1px solid #ddd;margin-top:14pt}p{margin:0 0 5pt}</style></head><body>${body}</body></html>`;
  descargar(new Blob([html], { type: 'application/msword' }), `Biblia de personajes ${nombreArchivo(proyecto().titulo)}.doc`);
}

// =====================================================================
//  PLAN: Escaleta (escaleta.js) · Estructura romántica · Cronología · Cabos sueltos
// =====================================================================
let planTab = 'escaleta';
VISTAS.plan = (cont) => {
  cont.innerHTML = `<div class="pagina" style="max-width:1180px">
    <div class="fila sep" style="flex-wrap:wrap;align-items:flex-end;margin-bottom:22px"><div><h1>Plan de «${esc(proyecto().titulo)}»</h1></div>
      <div class="segmentos">${[['escaleta', 'Escaleta'], ['estructura', 'Estructura romántica'], ['crono', 'Cronología'], ['cabos', 'Cabos sueltos']].map(([k, t]) => `<button data-pt="${k}"${planTab === k ? ' class="on"' : ''}>${t}</button>`).join('')}</div></div>
    <div id="plan-cuerpo"></div></div>`;
  $$('[data-pt]', cont).forEach(b => b.onclick = () => { planTab = b.dataset.pt; VISTAS.plan(cont); });
  const c = $('#plan-cuerpo', cont);
  if (planTab === 'escaleta') pintarEscaleta(c);
  else if (planTab === 'estructura') pintarEstructura(c);
  else if (planTab === 'crono') pintarCrono(c);
  else pintarCabos(c);
};

// ---------- Estructura romántica ----------
const capsMesa = () => hijos(null).filter(n => n.tipo === 'cap');
function estructura() {
  if (!M.estructura[M.actual]) M.estructura[M.actual] = { caps: Math.max(capsMesa().length, 30), momentos: {}, capitulos: {} };
  return M.estructura[M.actual];
}
function pintarEstructura(c) {
  const E = estructura();
  c.innerHTML = `<p class="sub" style="margin-top:-12px">Los momentos clave del género y la curva de tensión, capítulo a capítulo. Es una guía, no una ley.</p>
    <div class="tarjeta" style="margin-bottom:18px">
      <div class="fila sep" style="flex-wrap:wrap;margin-bottom:8px"><h2 style="margin:0">Curva de tensión</h2>
        <div class="fila"><label class="suave fila" style="font-size:13px">Capítulos previstos <input class="txt" id="es-caps" type="number" min="3" max="200" value="${E.caps}" style="width:76px;padding:4px 8px"></label><button class="btn peq" id="es-pdf">Imprimir / PDF</button></div></div>
      <div class="curva" id="es-curva"></div><div id="es-avisos"></div>
    </div>
    <div class="rejilla" style="grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;align-items:start" id="es-rej">
      <div class="tarjeta"><h2>Momentos clave</h2><div id="es-momentos"></div></div>
      <div class="tarjeta"><h2>Capítulos</h2><p class="tenue" style="font-size:12.5px;margin:-6px 0 10px">Punto de vista, tensión del 0 al 10 y qué pasa.</p><div id="es-caps-l"></div></div>
    </div>`;
  const guardar = debounce(() => guardarMeta(), 300);
  const idealCaps = (m) => [Math.max(1, Math.round(m.de / 100 * E.caps) || 1), Math.max(1, Math.round(m.a / 100 * E.caps))];
  const estado = (m, cap) => {
    if (!cap) return null;
    const [a, b] = idealCaps(m); const margen = Math.max(1, Math.round(E.caps * 0.03));
    return cap < a - margen ? 'pronto' : cap > b + margen ? 'tarde' : 'bien';
  };
  const pintaMomentos = () => {
    $('#es-momentos', c).replaceChildren(...FASES.map(f => el('div', { class: 'fase' },
      el('h3', {}, f.nombre), el('div', { class: 'tenue', style: 'font-size:13px;margin:-4px 0 8px' }, f.sub),
      ...MOMENTOS.filter(m => m.f === f.id).map(m => {
        const v = E.momentos[m.id] = E.momentos[m.id] || { cap: '', nota: '', hecho: false };
        const [a, b] = idealCaps(m);
        const st = el('div', { class: 'est-st' });
        const pintaSt = () => { const e = estado(m, v.cap); st.className = 'est-st ' + (e || ''); st.textContent = e === 'bien' ? 'En su sitio' : e === 'pronto' ? 'Un poco pronto' : e === 'tarde' ? 'Un poco tarde' : ''; };
        pintaSt();
        const cap = el('input', { type: 'number', min: 1, max: E.caps, value: v.cap, placeholder: 'cap.', class: 'txt', style: 'width:66px;padding:4px 6px;text-align:center' });
        cap.addEventListener('input', () => { v.cap = cap.value === '' ? '' : Number(cap.value); pintaSt(); guardar(); pintaCaps(); pintaCurva(); });
        const nota = el('input', { type: 'text', class: 'nota-mom', value: v.nota, placeholder: 'Qué pasa en tu novela…' });
        nota.addEventListener('input', () => { v.nota = nota.value; guardar(); });
        const fila = el('div', { class: 'mom' + (v.hecho ? ' hecho' : '') },
          el('input', { type: 'checkbox', checked: v.hecho, title: 'Escrito', onchange: e => { v.hecho = e.target.checked; fila.classList.toggle('hecho', v.hecho); guardar(); } }),
          el('div', { style: 'min-width:0' }, el('div', { class: 'mom-n' }, m.n), el('div', { class: 'mom-d' }, m.d), nota),
          el('div', { class: 'mom-cap' }, cap, el('div', { class: 'tenue', style: 'font-size:11px' }, a === b ? `ideal: cap. ${a}` : `ideal: ${a}–${b}`), st));
        return fila;
      }))));
  };
  const pintaCaps = () => {
    const porCap = {};
    MOMENTOS.forEach(m => { const x = E.momentos[m.id] && E.momentos[m.id].cap; if (x) (porCap[x] = porCap[x] || []).push(m.n); });
    const titulos = capsMesa();
    const filas = [];
    for (let i = 1; i <= E.caps; i++) {
      const cc = E.capitulos[i] = E.capitulos[i] || { pov: '', t: '', r: '' };
      const tv = el('span', { class: 'num', style: 'width:16px;text-align:right;font-size:12px' }, cc.t === '' ? '–' : cc.t);
      const rango_ = el('input', { type: 'range', min: 0, max: 10, step: 1, value: cc.t === '' ? 0 : cc.t, style: (cc.t === '' ? 'opacity:.35;' : '') + 'width:80px;accent-color:var(--verde)' });
      rango_.addEventListener('input', () => { cc.t = Number(rango_.value); tv.textContent = cc.t; rango_.style.opacity = 1; guardar(); pintaCurva(); });
      const res = el('input', { type: 'text', class: 'nota-mom', value: cc.r, placeholder: titulos[i - 1] ? titulos[i - 1].titulo : '…' });
      res.addEventListener('input', () => { cc.r = res.value; guardar(); });
      filas.push(el('div', { class: 'cap-fila' },
        el('span', { class: 'num cap-num' }, i),
        el('select', { class: 'txt', style: 'width:auto;padding:3px 4px;font-size:12.5px', onchange: e => { cc.pov = e.target.value; guardar(); } }, ...POVS.map(p => el('option', { value: p, selected: p === cc.pov }, p || '—'))),
        el('span', { class: 'fila', style: 'gap:6px' }, rango_, tv), res,
        el('div', { style: 'grid-column:2/-1' }, ...(porCap[i] || []).map(x => el('span', { class: 'etq-mom' }, '♥ ' + x)))));
    }
    $('#es-caps-l', c).replaceChildren(...filas);
  };
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  const pintaCurva = () => {
    const N = E.caps, W = 1000, H = 260, L = 34, R = 12, Tp = 18, B = 30;
    const x = i => L + (N === 1 ? 0 : (i - 1) / (N - 1) * (W - L - R));
    const y = t => Tp + (1 - t / 10) * (H - Tp - B);
    const pts = [];
    for (let i = 1; i <= N; i++) { const t = E.capitulos[i] && E.capitulos[i].t; if (t !== '' && t !== undefined) pts.push([i, t]); }
    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Curva de tensión por capítulo' });
    const grid = svg('g', { class: 'c-grid' }), axis = svg('g', { class: 'c-axis' });
    [0, 5, 10].forEach(t => { grid.append(svg('line', { x1: L, x2: W - R, y1: y(t), y2: y(t) })); const tx = svg('text', { x: L - 8, y: y(t) + 4, 'text-anchor': 'end' }); tx.textContent = t; axis.append(tx); });
    const paso = N <= 20 ? 1 : N <= 40 ? 2 : 5;
    for (let i = 1; i <= N; i++) if (i === 1 || i % paso === 0) { const tx = svg('text', { x: x(i), y: H - 8, 'text-anchor': 'middle' }); tx.textContent = i; axis.append(tx); }
    root.append(grid, axis);
    const porCap = {};
    MOMENTOS.forEach(m => { const cp = E.momentos[m.id] && E.momentos[m.id].cap; if (cp && cp <= N) (porCap[cp] = porCap[cp] || []).push(m.n); });
    const beats = svg('g', { class: 'c-beat' });
    Object.keys(porCap).forEach(cp => { beats.append(svg('line', { x1: x(+cp), x2: x(+cp), y1: Tp, y2: H - B }), svg('circle', { cx: x(+cp), cy: Tp - 2, r: 5 })); });
    root.append(beats);
    if (pts.length) {
      const d = pts.map(([i, t], k) => `${k ? 'L' : 'M'}${x(i)},${y(t)}`).join(' ');
      if (pts.length > 1) root.append(svg('path', { class: 'c-area', d: `${d} L${x(pts[pts.length - 1][0])},${y(0)} L${x(pts[0][0])},${y(0)} Z` }));
      root.append(svg('path', { class: 'c-line', d }));
      pts.forEach(([i, t]) => root.append(svg('circle', { class: 'c-pt', cx: x(i), cy: y(t), r: 4.5 })));
    } else {
      const tx = svg('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'c-vacio' });
      tx.textContent = 'Marca la tensión de los capítulos (abajo a la derecha) y aquí aparece la curva';
      root.append(tx);
    }
    const hx = svg('line', { class: 'c-hover', y1: Tp, y2: H - B, x1: -10, x2: -10, opacity: 0 });
    root.append(hx);
    const tip = el('div', { class: 'c-tip' });
    const colW = (W - L - R) / Math.max(1, N - 1);
    const titulos = capsMesa();
    for (let i = 1; i <= N; i++) {
      const r = svg('rect', { class: 'c-hit', x: x(i) - colW / 2, y: 0, width: colW, height: H });
      r.addEventListener('mouseenter', () => {
        const cc = E.capitulos[i] || {};
        hx.setAttribute('x1', x(i)); hx.setAttribute('x2', x(i)); hx.setAttribute('opacity', 1);
        tip.replaceChildren(el('b', {}, titulos[i - 1] ? titulos[i - 1].titulo : `Capítulo ${i}`), cc.t !== '' && cc.t !== undefined ? ` · tensión ${cc.t}` : ' · sin tensión marcada',
          cc.pov ? el('div', {}, `POV: ${cc.pov}`) : '', cc.r ? el('div', {}, cc.r) : '', ...(porCap[i] || []).map(m => el('div', { style: 'color:var(--rojo)' }, '♥ ' + m)));
        const box = $('#es-curva', c).getBoundingClientRect(), sc = box.width / W;
        tip.style.left = x(i) * sc + 'px';
        tip.style.top = y(cc.t === '' || cc.t === undefined ? 10 : cc.t) * sc + 'px';
        tip.style.opacity = 1;
      });
      r.addEventListener('mouseleave', () => { tip.style.opacity = 0; hx.setAttribute('opacity', 0); });
      root.append(r);
    }
    $('#es-curva', c).replaceChildren(root, tip);
    // avisos
    const w = [];
    let run = 1;
    for (let k = 1; k <= pts.length; k++) {
      const igual = k < pts.length && pts[k][1] === pts[k - 1][1] && pts[k][0] === pts[k - 1][0] + 1;
      if (igual) run++;
      else { if (run >= 3) w.push(`Tramo plano: los capítulos ${pts[k - run][0]}–${pts[k - 1][0]} tienen la misma tensión (${pts[k - 1][1]}). ¿Pasa algo entre ellos dos ahí?`); run = 1; }
    }
    for (let k = 3; k < pts.length; k++) {
      const [a, b, cc, d] = pts.slice(k - 3, k + 1);
      if (a[1] > b[1] && b[1] > cc[1] && cc[1] > d[1] && d[0] - a[0] === 3 && d[0] < N * 0.7) w.push(`La tensión baja cuatro capítulos seguidos (${a[0]}–${d[0]}). Ojo, que el lector puede soltar el libro.`);
    }
    let prev = null;
    MOMENTOS.forEach(m => {
      const cp = E.momentos[m.id] && E.momentos[m.id].cap;
      if (!cp) return;
      if (prev && cp < prev.c) w.push(`«${m.n}» (cap. ${cp}) va antes que «${prev.n}» (cap. ${prev.c}). Puede ser a propósito, pero revísalo.`);
      if (cp > N) w.push(`«${m.n}» está en el capítulo ${cp}, pero has previsto ${N}.`);
      prev = { c: cp, n: m.n };
    });
    const sin = MOMENTOS.filter(m => m.id !== 'epilogo' && !(E.momentos[m.id] && E.momentos[m.id].cap)).length;
    $('#es-avisos', c).replaceChildren(...(w.length ? w.map(t => el('div', { class: 'aviso-est' }, '⚠ ' + t)) : [el('div', { class: 'aviso-est ok' }, pts.length || sin < MOMENTOS.length - 1 ? `Todo en orden.${sin ? ` Te quedan ${sin} momentos clave por situar.` : ''}` : 'Cuando marques tensiones y momentos te aviso de tramos planos y cosas fuera de sitio.')]),
      ...(w.length && sin ? [el('div', { class: 'aviso-est ok' }, `Te quedan ${sin} momentos clave por situar.`)] : []));
  };
  pintaMomentos(); pintaCaps(); pintaCurva();
  $('#es-caps', c).onchange = (e) => { E.caps = Math.max(3, Math.min(200, Number(e.target.value) || 30)); guardarMeta(); pintarEstructura(c); };
  $('#es-pdf', c).onclick = () => window.print();
}

// ---------- Cronología ----------
const TIPOS_EV = { escena: 'Escena', fondo: 'Pasa fuera de escena', flashback: 'Recuerdo / flashback' };
const FRANJAS = { madrugada: 180, mañana: 540, manana: 540, mediodía: 780, mediodia: 780, tarde: 1020, noche: 1320 };
let cronoVista = 'crono', cronoEdit = null, cronoPjs = [], cronoFiltro = '';
function pintarCrono(c) {
  const p = proyecto();
  const modo = p.modoCrono || 'fecha';
  const evs = M.crono.filter(e => e.pid === M.actual);
  const horaMin = (h) => { if (!h) return null; const m = h.match(/(\d{1,2})[:.h](\d{2})?/); if (m) return +m[1] * 60 + (+m[2] || 0); const k = Object.keys(FRANJAS).find(f => h.toLowerCase().includes(f)); return k ? FRANJAS[k] : null; };
  const cuando = (e) => modo === 'fecha' ? (e.fecha ? deStr(e.fecha).getTime() / 86400000 : null) : (e.dia !== '' && e.dia !== undefined && e.dia !== null ? Number(e.dia) : null);
  const clave_ = (e) => { const x = cuando(e); return x === null ? Infinity : x * 1440 + (horaMin(e.hora) ?? 720); };
  const etiquetaDia = (e) => {
    if (modo === 'fecha') { if (!e.fecha) return 'Sin fecha'; const s = deStr(e.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1); }
    return cuando(e) === null ? 'Sin día' : `Día ${e.dia}`;
  };
  const salto = (d) => d <= 0 ? null : d === 1 ? (modo === 'fecha' ? 'al día siguiente' : 'un día después') : d < 14 ? `${d} días después` : d < 60 ? `${Math.round(d / 7)} semanas después` : d < 730 ? `${Math.round(d / 30.4)} meses después` : `${Math.round(d / 365)} años después`;
  const ed = cronoEdit ? M.crono.find(x => x.id === cronoEdit) : null;
  if (ed) cronoPjs = cronoPjs.length ? cronoPjs : [...(ed.pjs || [])];
  const nombresPj = [...new Set([...M.crono.flatMap(e => e.pjs || []), ...M.personajes.filter(x => x.pid === M.actual).map(nombrePj).filter(Boolean)])];
  const pjsEnEvs = [...new Set(evs.flatMap(e => e.pjs || []))].sort((a, b) => a.localeCompare(b, 'es'));
  c.innerHTML = `<p class="sub" style="margin-top:-12px">Qué pasa, cuándo y a quién. Para no liarte con fechas, viajes ni embarazos.</p>
    <div class="fila" style="flex-wrap:wrap;margin-bottom:16px">
      <div class="segmentos peq">${[['fecha', 'Fechas reales'], ['dia', 'Día 1, Día 2…']].map(([k, t]) => `<button data-modo="${k}"${modo === k ? ' class="on"' : ''}>${t}</button>`).join('')}</div>
      <div class="segmentos peq">${[['crono', 'Orden de la historia'], ['caps', 'Por capítulos']].map(([k, t]) => `<button data-cv="${k}"${cronoVista === k ? ' class="on"' : ''}>${t}</button>`).join('')}</div>
      <select class="txt" id="cr-filtro" style="width:auto;padding:5px 8px"><option value="">Todos los personajes</option>${pjsEnEvs.map(n => `<option${n === cronoFiltro ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <span style="flex:1"></span><button class="btn peq" id="cr-pdf">Imprimir / PDF</button></div>
    <div class="rejilla" style="grid-template-columns:320px minmax(0,1fr);gap:20px;align-items:start">
      <div class="tarjeta" id="cr-form" style="position:sticky;top:16px">
        <h3>${ed ? 'Editar momento' : 'Añadir un momento'}</h3>
        <div class="rejilla r2" style="gap:8px"><label class="campo"><span>${modo === 'fecha' ? 'Fecha' : 'Día de la historia'}</span>${modo === 'fecha' ? `<input id="cr-fecha" type="date" value="${esc(ed ? ed.fecha || '' : '')}">` : `<input id="cr-dia" type="number" min="0" placeholder="1" value="${ed ? esc(ed.dia ?? '') : ''}">`}</label>
          <label class="campo"><span>Hora</span><input id="cr-hora" placeholder="22:30 / noche" value="${esc(ed ? ed.hora || '' : '')}"></label></div>
        <div class="rejilla r2" style="gap:8px"><label class="campo"><span>Capítulo</span><input id="cr-cap" type="number" min="0" value="${ed ? esc(ed.cap ?? '') : ''}"></label>
          <label class="campo"><span>Tipo</span><select id="cr-tipo">${Object.entries(TIPOS_EV).map(([k, l]) => `<option value="${k}"${(ed ? ed.tipo : 'escena') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
        <label class="campo"><span>Título</span><input id="cr-tit" placeholder="Ant vuelve al pueblo" value="${esc(ed ? ed.titulo : '')}"></label>
        <label class="campo"><span>Qué pasa</span><textarea id="cr-desc" rows="3" placeholder="Opcional">${esc(ed ? ed.desc || '' : '')}</textarea></label>
        <label class="campo"><span>Personajes</span><input id="cr-pj" list="cr-pjs" placeholder="Nombre y Enter"></label>
        <datalist id="cr-pjs">${nombresPj.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
        <div id="cr-chips" style="margin:-4px 0 10px"></div>
        <div class="fila" style="justify-content:flex-end">${ed ? '<button class="btn peq" id="cr-borrar" style="color:var(--rojo)">Borrar</button><button class="btn peq" id="cr-cancelar">Cancelar</button>' : ''}<button class="btn prim" id="cr-ok">${ed ? 'Guardar cambios' : 'Añadir'}</button></div>
        <p class="tenue" style="font-size:12px;margin:10px 0 0">${modo === 'fecha' ? 'Sin fecha concreta: déjala vacía y aparecerá al final.' : 'Usa Día 0 para lo que pasa antes de que empiece la historia.'}</p>
      </div>
      <div id="cr-out"></div>
    </div>`;
  const chips = () => { $('#cr-chips', c).innerHTML = cronoPjs.map((n, i) => `<span class="chip on" data-qpj="${i}" title="Quitar">${esc(n)} ×</span>`).join(''); $$('[data-qpj]', c).forEach(x => x.onclick = () => { cronoPjs.splice(+x.dataset.qpj, 1); chips(); }); };
  chips();
  const addPj = () => { const i = $('#cr-pj', c); const v = i.value.trim().replace(/,$/, ''); if (v && !cronoPjs.includes(v)) cronoPjs.push(v); i.value = ''; chips(); };
  $('#cr-pj', c).onkeydown = (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addPj(); } };
  $('#cr-pj', c).onchange = addPj;
  const guardarEv = () => {
    const tit = $('#cr-tit', c).value.trim();
    if (!tit) { aviso('Ponle un título al momento'); return; }
    addPj();
    const datos = { fecha: $('#cr-fecha', c) ? $('#cr-fecha', c).value : (ed ? ed.fecha || '' : ''), dia: $('#cr-dia', c) ? ($('#cr-dia', c).value === '' ? '' : Number($('#cr-dia', c).value)) : (ed ? ed.dia ?? '' : ''),
      hora: $('#cr-hora', c).value.trim(), cap: $('#cr-cap', c).value === '' ? '' : Number($('#cr-cap', c).value), tipo: $('#cr-tipo', c).value, titulo: tit, desc: $('#cr-desc', c).value.trim(), pjs: [...cronoPjs] };
    if (ed) { Object.assign(ed, datos); aviso('Guardado'); }
    else { M.crono.push({ id: uid(), pid: M.actual, ...datos }); aviso('Añadido a la cronología'); }
    const seguir = { fecha: datos.fecha, dia: datos.dia, cap: datos.cap };
    cronoEdit = null; cronoPjs = []; guardarMeta(); pintarCrono(c);
    if ($('#cr-fecha', c)) $('#cr-fecha', c).value = seguir.fecha; if ($('#cr-dia', c)) $('#cr-dia', c).value = seguir.dia;
    $('#cr-cap', c).value = seguir.cap; $('#cr-tit', c).focus();
  };
  $('#cr-ok', c).onclick = guardarEv;
  $('#cr-tit', c).onkeydown = (e) => { if (e.key === 'Enter') guardarEv(); };
  if (ed) {
    $('#cr-cancelar', c).onclick = () => { cronoEdit = null; cronoPjs = []; pintarCrono(c); };
    $('#cr-borrar', c).onclick = async () => { if (!(await preguntar('¿Borrar este momento?', ed.titulo, 'Borrar', true))) return; M.crono = M.crono.filter(x => x.id !== ed.id); cronoEdit = null; cronoPjs = []; guardarMeta(); pintarCrono(c); };
  }
  $$('[data-modo]', c).forEach(b => b.onclick = () => { p.modoCrono = b.dataset.modo; guardarMeta(); pintarCrono(c); });
  $$('[data-cv]', c).forEach(b => b.onclick = () => { cronoVista = b.dataset.cv; pintarCrono(c); });
  $('#cr-filtro', c).onchange = (e) => { cronoFiltro = e.target.value; pintarCrono(c); };
  $('#cr-pdf', c).onclick = () => window.print();
  const abrir = (id) => { cronoEdit = id; cronoPjs = []; pintarCrono(c); };
  // salida
  const lista = evs.filter(e => !cronoFiltro || (e.pjs || []).includes(cronoFiltro));
  const out = $('#cr-out', c);
  if (!lista.length) { out.innerHTML = `<div class="tarjeta vacio">${evs.length ? 'Ese personaje no sale en ningún momento.' : 'La cronología está vacía. Añade el primer momento a la izquierda.'}</div>`; return; }
  const tarjeta = (e) => el('div', { class: `ev t-${e.tipo}${e.id === cronoEdit ? ' editando' : ''}`, onclick: () => abrir(e.id) },
    el('div', { class: 'ev-top' }, e.hora ? el('span', { class: 'ev-hora' }, e.hora) : null, el('span', { class: 'ev-tit' }, e.titulo),
      e.cap !== '' && e.cap !== undefined ? el('span', { class: 'etq-mom' }, `Cap. ${e.cap}`) : null, e.tipo !== 'escena' ? el('span', { class: 'tenue', style: 'font-size:12px' }, TIPOS_EV[e.tipo]) : null),
    e.desc ? el('div', { class: 'ev-desc' }, e.desc) : null,
    (e.pjs || []).length ? el('div', { class: 'ev-pjs' }, ...e.pjs.map(n => el('span', {}, n))) : null);
  if (cronoVista === 'crono') {
    const orden = lista.slice().sort((a, b) => clave_(a) - clave_(b));
    const grupos = [];
    orden.forEach(e => { const l = etiquetaDia(e); if (!grupos.length || grupos[grupos.length - 1].l !== l) grupos.push({ l, c: cuando(e), items: [] }); grupos[grupos.length - 1].items.push(e); });
    const tl = el('div', { class: 'linea-tiempo' });
    grupos.forEach((g, i) => {
      if (i > 0 && g.c !== null && grupos[i - 1].c !== null) { const t = salto(Math.round(g.c - grupos[i - 1].c)); if (t) tl.append(el('div', { class: 'lt-salto' }, '· ' + t + ' ·')); }
      const caps = [...new Set(g.items.map(e => e.cap).filter(x => x !== '' && x !== undefined))].sort((a, b) => a - b);
      tl.append(el('div', { class: 'lt-dia' }, el('h4', {}, g.l, caps.length ? el('small', {}, caps.length === 1 ? ` · cap. ${caps[0]}` : ` · caps. ${caps.join(', ')}`) : '')), ...g.items.map(tarjeta));
    });
    out.replaceChildren(tl);
  } else {
    const orden = lista.slice().sort((a, b) => ((a.cap === '' ? 1e9 : a.cap) - (b.cap === '' ? 1e9 : b.cap)) || (clave_(a) - clave_(b)));
    let maxPrev = -Infinity, ultCap = null, maxCap = -Infinity;
    const filas = orden.map(e => {
      const k = clave_(e);
      if (e.cap !== ultCap) { maxPrev = Math.max(maxPrev, maxCap); maxCap = -Infinity; ultCap = e.cap; }
      const atras = e.tipo !== 'flashback' && k !== Infinity && k < maxPrev;
      if (k !== Infinity && e.tipo !== 'flashback') maxCap = Math.max(maxCap, k);
      return el('tr', { onclick: () => abrir(e.id) }, el('td', {}, e.cap === '' ? '—' : e.cap), el('td', {}, etiquetaDia(e), e.hora ? el('div', { class: 'tenue' }, e.hora) : ''),
        el('td', {}, el('b', {}, e.titulo), e.tipo !== 'escena' ? el('div', { class: 'tenue' }, TIPOS_EV[e.tipo]) : '', atras ? el('div', { style: 'color:var(--rojo);font-size:12.5px' }, '⚠ Va antes en el tiempo que un capítulo anterior. ¿Es un recuerdo?') : ''),
        el('td', {}, (e.pjs || []).join(', ')));
    });
    out.replaceChildren(el('div', { class: 'tarjeta', style: 'padding:6px 10px' }, el('table', { class: 'tabla' }, el('thead', {}, el('tr', {}, ...['Cap.', 'Cuándo', 'Qué pasa', 'Quién'].map(h => el('th', {}, h)))), el('tbody', {}, ...filas))));
  }
}

// ---------- Cabos sueltos ----------
const PRIOS = ['alta', 'media', 'baja'];
const ordenCabos = (a, b) => (PRIOS.indexOf(a.prio) - PRIOS.indexOf(b.prio)) || (a.due && b.due ? a.due.localeCompare(b.due) : a.due ? -1 : b.due ? 1 : 0) || (a.created - b.created);
let prioNueva = 'media';
function pintarCabos(c) {
  const mios = M.cabos.filter(x => x.pid === M.actual);
  const pend = mios.filter(x => !x.done).sort(ordenCabos);
  const cerr = mios.filter(x => x.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  const vence = (due) => {
    if (!due) return '';
    const d = diasEntre(new Date(), deStr(due));
    if (d < 0) return `<span style="color:var(--rojo);font-weight:600">venció el ${fechaCorta(due)}</span>`;
    if (d === 0) return '<span style="color:var(--rojo);font-weight:600">vence hoy</span>';
    if (d <= 3) return `<span style="color:#b06a1f;font-weight:600">vence el ${fechaCorta(due)}</span>`;
    return `vence el ${fechaCorta(due)}`;
  };
  const fila = (x) => `<li class="cabo${x.done ? ' hecho' : ''}" data-id="${x.id}"><input type="checkbox"${x.done ? ' checked' : ''} data-ok><span class="prio p-${x.prio}" data-prio title="Prioridad ${x.prio} (clic para cambiar)"></span>
    <div style="flex:1;min-width:0"><div class="cabo-t" title="Doble clic para editar">${esc(x.text)}</div><div class="tenue" style="font-size:12px">${x.done && x.doneAt ? 'cerrado el ' + fechaCorta(x.doneAt) : vence(x.due)}</div></div><button class="icono" data-del title="Borrar">✕</button></li>`;
  c.innerHTML = `<p class="sub" style="margin-top:-12px">Lo que queda por cerrar en la novela.</p>
    <div class="rejilla" style="grid-template-columns:minmax(0,1fr) 300px;gap:20px;align-items:start">
      <div class="tarjeta">
        <div class="entrada-idea" style="margin-bottom:8px"><input class="txt" id="cb-in" placeholder="Qué queda por cerrar y pulsa Enter"></div>
        <div class="fila" style="flex-wrap:wrap;margin-bottom:6px">${PRIOS.map(p => `<span class="chip${p === prioNueva ? ' on' : ''}" data-pn="${p}">${p[0].toUpperCase() + p.slice(1)}</span>`).join('')}<span style="flex:1"></span><label class="suave fila" style="font-size:12.5px">Fecha límite <input class="txt" id="cb-due" type="date" style="width:auto;padding:4px 8px"></label></div>
        <ul class="cabos">${pend.length ? pend.map(fila).join('') : '<li class="vacio">Ni un cabo suelto. ¿Seguro? 👀</li>'}</ul>
        ${cerr.length ? `<details style="margin-top:12px"><summary class="suave" style="cursor:pointer">Cerrados (${cerr.length})</summary><ul class="cabos">${cerr.map(fila).join('')}</ul><button class="btn peq" id="cb-vaciar">Vaciar cerrados</button></details>` : ''}
      </div>
      <div class="tarjeta"><h2>Resumen</h2><p style="margin:0 0 6px"><b>${pend.length}</b> pendiente${pend.length === 1 ? '' : 's'}${pend.filter(x => x.prio === 'alta').length ? ` · <span style="color:var(--rojo)">${pend.filter(x => x.prio === 'alta').length} de prioridad alta</span>` : ''}</p>
        <p class="tenue" style="font-size:12.5px">Enter para guardar · doble clic en un cabo para editarlo · clic en el punto para cambiar la prioridad.</p>
        <button class="btn peq" id="cb-copiar">Copiar pendientes</button></div>
    </div>`;
  $$('[data-pn]', c).forEach(x => x.onclick = () => { prioNueva = x.dataset.pn; pintarCabos(c); $('#cb-in', c).focus(); });
  $('#cb-in', c).onkeydown = (e) => {
    if (e.key !== 'Enter' || !e.target.value.trim()) return;
    M.cabos.push({ id: uid(), pid: M.actual, text: e.target.value.trim(), prio: prioNueva, due: $('#cb-due', c).value || '', done: false, created: Date.now() });
    guardarMeta(); pintarCabos(c); $('#cb-in', c).focus();
  };
  $$('.cabo', c).forEach(li => {
    const x = M.cabos.find(k => k.id === li.dataset.id);
    $('[data-ok]', li).onchange = (e) => { x.done = e.target.checked; x.doneAt = x.done ? diaStr() : null; guardarMeta(); pintarCabos(c); if (x.done) aviso('Cabo cerrado ✓'); };
    $('[data-prio]', li).onclick = () => { x.prio = PRIOS[(PRIOS.indexOf(x.prio) + 1) % 3]; guardarMeta(); pintarCabos(c); };
    $('[data-del]', li).onclick = () => { M.cabos = M.cabos.filter(k => k.id !== x.id); guardarMeta(); pintarCabos(c); aviso('Cabo borrado', { texto: 'Deshacer', fn: () => { M.cabos.push(x); guardarMeta(); pintarCabos(c); } }); };
    $('.cabo-t', li).ondblclick = (e) => {
      const t = e.target;
      const box = el('div', {}, el('input', { class: 'txt', value: x.text, style: 'padding:4px 8px' }), el('div', { class: 'fila', style: 'margin-top:5px' }, el('input', { type: 'date', class: 'txt', value: x.due || '', style: 'width:auto;padding:3px 6px;font-size:12px', onchange: ev => { x.due = ev.target.value; } }), el('span', { class: 'tenue', style: 'font-size:12px' }, 'Enter guarda · Esc cancela')));
      t.replaceWith(box);
      const inp = $('input', box); inp.focus(); inp.select();
      inp.onkeydown = (ev) => { if (ev.key === 'Enter') { if (inp.value.trim()) x.text = inp.value.trim(); guardarMeta(); pintarCabos(c); } if (ev.key === 'Escape') pintarCabos(c); };
    };
  });
  if ($('#cb-vaciar', c)) $('#cb-vaciar', c).onclick = () => { M.cabos = M.cabos.filter(x => !(x.pid === M.actual && x.done)); guardarMeta(); pintarCabos(c); };
  $('#cb-copiar', c).onclick = async () => {
    if (!pend.length) return aviso('No hay nada pendiente');
    await navigator.clipboard.writeText(pend.map(x => `- [${x.prio.toUpperCase()}] ${x.text}${x.due ? ` (vence el ${fechaCorta(x.due)})` : ''}`).join('\n'));
    aviso('Pendientes copiados');
  };
}

// =====================================================================
//  TABLERO DE INSPIRACIÓN
// =====================================================================
let tabCur = null, tabTipo = '', tabBusca = '', tabEditar = null, lbLista = [], lbIdx = 0;
const TIPOS_TAB = [['', 'Todo'], ['img', 'Imágenes'], ['texto', 'Frases'], ['enlace', 'Enlaces'], ['nota', 'Notas']];
const dominio = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
VISTAS.tablero = async (cont) => {
  const all = await chrome.storage.local.get(null);
  let boards = all.tabBoards && all.tabBoards.length ? all.tabBoards : TABLEROS_INICIALES;
  let items = Object.keys(all).filter(k => k.startsWith('item:')).map(k => all[k]).sort((a, b) => b.created - a.created);
  const vacias = items.filter(i => i.type === 'nota' && !i.text && i.id !== tabEditar);
  if (vacias.length) { chrome.storage.local.remove(vacias.map(i => 'item:' + i.id)); items = items.filter(i => !vacias.includes(i)); }
  if (tabCur === null) tabCur = all.tabCur || boards[0].id;
  if (tabCur !== '*' && !boards.some(b => b.id === tabCur)) tabCur = boards[0].id;
  const guardarBoards = () => chrome.storage.local.set({ tabBoards: boards });
  const guardarIt = (it) => chrome.storage.local.set({ ['item:' + it.id]: it });
  const recargar = () => VISTAS.tablero(cont);
  const destino = () => tabCur === '*' ? boards[0].id : tabCur;
  const visibles = () => items.filter(i => (tabCur === '*' || i.board === tabCur) && (!tabTipo || i.type === tabTipo) && (!tabBusca || [i.text, i.note, i.title, i.url, i.pageTitle, i.pageUrl].join(' ').toLowerCase().includes(tabBusca.toLowerCase())));
  const cuenta = (id) => items.filter(i => id === '*' || i.board === id).length;
  const b = boards.find(x => x.id === tabCur);
  const total = cuenta(tabCur);
  cont.innerHTML = `<div class="pagina" style="max-width:1400px">
    <div class="fila sep" style="flex-wrap:wrap;align-items:flex-start"><div><h1>${esc(b ? b.nombre : 'Todo')}</h1><p class="sub">${total ? `${plural(total, 'cosa guardada', 'cosas guardadas')} · ` : ''}Botón derecho en cualquier imagen, frase o enlace → Novelia Studio → «Guardar en el tablero».</p></div></div>
    <div class="rejilla" style="grid-template-columns:220px minmax(0,1fr);gap:24px;align-items:start">
      <aside class="tarjeta" style="padding:10px;position:sticky;top:16px"><ul class="tab-boards" id="tb-boards"></ul><button class="btn peq" id="tb-nuevo" style="margin-top:8px">+ Nuevo tablero</button></aside>
      <div>
        <div class="fila" style="flex-wrap:wrap;margin-bottom:12px"><input class="txt" id="tb-q" placeholder="Buscar en notas, frases, webs…" value="${esc(tabBusca)}" style="width:230px">
          <span>${TIPOS_TAB.map(([k, l]) => `<span class="chip${tabTipo === k ? ' on' : ''}" data-tt="${k}">${l}</span>`).join('')}</span><span style="flex:1"></span>
          <button class="btn peq" id="tb-nota">+ Nota</button><button class="btn peq" id="tb-pdf">Imprimir / PDF</button></div>
        <div class="tb-drop" id="tb-drop">Arrastra aquí imágenes de tu ordenador o de otra web, o pégalas con Ctrl+V / Cmd+V</div>
        <div class="tb-grid" id="tb-grid"></div>
      </div></div></div>`;
  // tableros
  const fila = (bd, todo) => {
    const li = el('li', { class: 'tab-bd' + (tabCur === bd.id ? ' on' : ''), onclick: () => { tabCur = bd.id; chrome.storage.local.set({ tabCur }); recargar(); } },
      el('span', {}, bd.nombre), el('span', {}, el('span', { class: 'tenue', style: 'font-size:12px' }, cuenta(bd.id)), todo ? null : el('span', { class: 'tab-x', title: 'Renombrar o borrar (doble clic)', onclick: e => { e.stopPropagation(); renombrar(bd, li); } }, '✎')));
    if (!todo) li.addEventListener('dblclick', () => renombrar(bd, li));
    return li;
  };
  const renombrar = (bd, li) => {
    const inp = el('input', { class: 'txt', value: bd.nombre, style: 'padding:3px 6px' });
    let armado = false;
    const del = el('button', { class: 'icono', style: 'color:var(--rojo)', title: 'Borrar tablero' }, '🗑');
    del.addEventListener('mousedown', async (e) => {
      e.preventDefault();
      if (boards.length <= 1) return aviso('Tiene que quedar al menos un tablero');
      const n = items.filter(i => i.board === bd.id).length;
      if (n && !armado) { armado = true; del.textContent = `¿Borrar con ${n}?`; return; }
      boards = boards.filter(x => x.id !== bd.id);
      await chrome.storage.local.remove(items.filter(i => i.board === bd.id).map(i => 'item:' + i.id)); await guardarBoards();
      if (tabCur === bd.id) tabCur = boards[0].id;
      recargar();
    });
    li.replaceChildren(inp, del); inp.focus(); inp.select();
    const fin = async (ok) => { if (ok && inp.value.trim()) { bd.nombre = inp.value.trim(); await guardarBoards(); } recargar(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') fin(true); if (e.key === 'Escape') fin(false); };
    inp.onblur = () => fin(true); inp.onclick = (e) => e.stopPropagation();
  };
  $('#tb-boards', cont).replaceChildren(fila({ id: '*', nombre: 'Todo' }, true), ...boards.map(bd => fila(bd)));
  $('#tb-nuevo', cont).onclick = async () => { const bd = { id: Date.now().toString(36), nombre: 'Nuevo tablero' }; boards.push(bd); await guardarBoards(); tabCur = bd.id; await recargar(); const lis = $$('.tab-bd', cont); renombrar(bd, lis[lis.length - 1]); };
  $$('[data-tt]', cont).forEach(x => x.onclick = () => { tabTipo = x.dataset.tt; recargar(); });
  $('#tb-q', cont).oninput = debounce((e) => { tabBusca = e.target.value; recargar().then(() => { const q = $('#tb-q', cont); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }); }, 250);
  $('#tb-pdf', cont).onclick = () => window.print();
  $('#tb-nota', cont).onclick = async () => { tabTipo = ''; tabBusca = ''; const it = await guardarItem({ board: destino(), type: 'nota', text: '', pageUrl: '', pageTitle: '' }); tabEditar = it.id; recargar(); };
  // tarjetas
  const tarjeta = (it) => {
    const cuerpo = [];
    if (it.type === 'img') {
      const img = el('img', { src: it.src, alt: it.note || it.pageTitle || '', loading: 'lazy' });
      img.addEventListener('click', () => abrirLb(it));
      cuerpo.push(img);
      if (it.remote) cuerpo.push(el('span', { class: 'tb-remota', title: 'No pude guardar una copia: si la borran de la web, desaparecerá' }, 'enlazada'));
    } else if (it.type === 'texto') cuerpo.push(el('div', { class: 'tb-cita' }, it.text));
    else if (it.type === 'nota') cuerpo.push(el('div', { class: 'tb-nota' }, it.text));
    else cuerpo.push(el('a', { class: 'tb-enl', href: it.url, target: '_blank' }, el('span', { class: 'tb-ic' }, dominio(it.url)[0] || '·'), el('div', {}, el('b', {}, it.title || it.url), el('span', {}, dominio(it.url)))));
    const notaBox = el('div');
    const pintaNota = () => notaBox.replaceChildren(...(it.note ? [el('div', { class: 'tb-nt' }, it.note)] : []));
    pintaNota();
    const editar = () => {
      const ta = el('textarea', { placeholder: it.type === 'nota' ? 'Escribe…' : 'Una nota: por qué lo guardas, para qué escena…' });
      ta.value = it.type === 'nota' ? it.text : it.note;
      if (it.type === 'nota') cuerpo[0].style.display = 'none';
      notaBox.replaceChildren(ta); ta.focus();
      let hecho = false;
      const fin = () => {
        if (hecho) return; hecho = true; tabEditar = null;
        if (it.type === 'nota') {
          const v = ta.value.trim();
          if (!v && !it.text) { chrome.storage.local.remove('item:' + it.id); recargar(); return; }
          it.text = v || it.text; cuerpo[0].textContent = it.text; cuerpo[0].style.display = '';
        } else it.note = ta.value.trim();
        guardarIt(it); pintaNota();
      };
      ta.addEventListener('blur', fin);
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); } if (e.key === 'Escape') ta.blur(); });
    };
    const mover = el('select', { title: 'Mover a otro tablero', onchange: e => { it.board = e.target.value; guardarIt(it).then(recargar); aviso('Movido a ' + boards.find(x => x.id === it.board).nombre); } }, ...boards.map(bd => el('option', { value: bd.id, selected: bd.id === it.board }, bd.nombre)));
    let armado = false;
    const del = el('button', { title: 'Borrar' }, '×');
    del.addEventListener('click', () => {
      if (!armado) { armado = true; del.textContent = '¿Borrar?'; del.classList.add('armado'); setTimeout(() => { armado = false; del.textContent = '×'; del.classList.remove('armado'); }, 3000); return; }
      chrome.storage.local.remove('item:' + it.id).then(recargar);
    });
    const fecha = new Date(it.created).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const src = it.pageUrl && it.type !== 'enlace' ? el('a', { href: it.pageUrl, target: '_blank', title: it.pageTitle || it.pageUrl }, 'de ' + (dominio(it.pageUrl) || 'la web')) : el('span');
    const card = el('div', { class: 'tcard', 'data-id': it.id }, ...cuerpo, notaBox, el('div', { class: 'tb-meta' }, src, el('span', {}, fecha)),
      el('div', { class: 'tb-acts' }, el('button', { title: it.type === 'nota' ? 'Editar' : 'Añadir nota', onclick: editar }, '✎'), mover, del));
    if (tabEditar === it.id) setTimeout(editar, 0);
    return card;
  };
  const lista = visibles();
  const grid = $('#tb-grid', cont);
  if (!lista.length) grid.replaceChildren(el('div', { class: 'vacio', style: 'column-span:all;padding:50px 10px' }, total ? 'Nada coincide con la búsqueda.' : 'Este tablero está vacío. Busca en Pinterest, Instagram o donde quieras, botón derecho sobre una imagen y «Guardar en el tablero».'));
  else grid.replaceChildren(...lista.map(tarjeta));
  // visor
  const abrirLb = (it) => { lbLista = visibles().filter(i => i.type === 'img'); lbIdx = lbLista.findIndex(i => i.id === it.id); pintaLb(); $('#lb').classList.add('on'); };
  const pintaLb = () => {
    const it = lbLista[lbIdx];
    $('#lb-img').src = it.src;
    $('#lb-cap').replaceChildren(it.note ? el('div', { style: 'margin-bottom:4px' }, it.note) : '', it.pageUrl ? el('a', { href: it.pageUrl, target: '_blank' }, it.pageTitle || dominio(it.pageUrl)) : '');
    $('#lb-prev').style.visibility = lbIdx > 0 ? '' : 'hidden';
    $('#lb-next').style.visibility = lbIdx < lbLista.length - 1 ? '' : 'hidden';
  };
  if (!$('#lb')) {
    document.body.append(el('div', { class: 'lb', id: 'lb' }, el('button', { class: 'lb-cerrar', id: 'lb-x' }, '×'), el('button', { class: 'lb-nav lb-prev', id: 'lb-prev' }, '‹'),
      el('div', { style: 'text-align:center' }, el('img', { id: 'lb-img', alt: '' }), el('div', { class: 'lb-cap', id: 'lb-cap' })), el('button', { class: 'lb-nav lb-next', id: 'lb-next' }, '›')));
    const cerrar = () => $('#lb').classList.remove('on');
    $('#lb-x').onclick = cerrar;
    $('#lb').addEventListener('click', e => { if (e.target.id === 'lb') cerrar(); });
    document.addEventListener('keydown', e => { if (!$('#lb').classList.contains('on')) return; if (e.key === 'Escape') cerrar(); if (e.key === 'ArrowLeft') $('#lb-prev').click(); if (e.key === 'ArrowRight') $('#lb-next').click(); });
  }
  $('#lb-prev').onclick = () => { if (lbIdx > 0) { lbIdx--; pintaLb(); } };
  $('#lb-next').onclick = () => { if (lbIdx < lbLista.length - 1) { lbIdx++; pintaLb(); } };
  // pegar y arrastrar
  const addImagenBlob = async (blob) => { const img = await copiaImagen(await aDataURL(blob)); if (!img) return aviso('No he podido leer esa imagen'); await guardarItem({ board: destino(), type: 'img', src: img.data, w: img.w, h: img.h, pageUrl: '', pageTitle: '' }); aviso('Imagen guardada'); recargar(); };
  const addDesdeUrl = async (u) => {
    if (/\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(u) || u.startsWith('data:image')) {
      const img = await copiaImagen(u);
      await guardarItem({ board: destino(), type: 'img', src: img?.data || u, w: img?.w || 0, h: img?.h || 0, remote: !img, srcUrl: u, pageUrl: u.startsWith('data:') ? '' : u, pageTitle: '' });
    } else await guardarItem({ board: destino(), type: 'enlace', url: u, title: u });
    aviso('Guardado'); recargar();
  };
  tableroPegar = async (e) => {
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    const f = [...e.clipboardData.files].find(f => f.type.startsWith('image/'));
    if (f) return addImagenBlob(f);
    const t = e.clipboardData.getData('text').trim();
    if (!t) return;
    if (/^https?:\/\/\S+$/.test(t)) return addDesdeUrl(t);
    await guardarItem({ board: destino(), type: 'texto', text: t, pageUrl: '', pageTitle: '' });
    aviso('Frase guardada'); recargar();
  };
  const drop = $('#tb-drop', cont);
  let dragN = 0;
  tableroSoltar = {
    enter: (e) => { e.preventDefault(); dragN++; drop.classList.add('activo'); },
    leave: () => { if (--dragN <= 0) { dragN = 0; drop.classList.remove('activo'); } },
    over: (e) => e.preventDefault(),
    drop: async (e) => {
      e.preventDefault(); dragN = 0; drop.classList.remove('activo');
      const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
      if (files.length) { for (const f of files) await addImagenBlob(f); return; }
      const html = e.dataTransfer.getData('text/html');
      const m = html && html.match(/<img[^>]+src="([^"]+)"/i);
      const u = m ? m[1].replace(/&amp;/g, '&') : (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text')).split('\n')[0].trim();
      if (!u) return;
      if (m) { const img = await copiaImagen(u); await guardarItem({ board: destino(), type: 'img', src: img?.data || u, w: img?.w || 0, h: img?.h || 0, remote: !img, srcUrl: u, pageUrl: '', pageTitle: '' }); aviso('Imagen guardada'); recargar(); }
      else addDesdeUrl(u);
    }
  };
};
let tableroPegar = null, tableroSoltar = null;
document.addEventListener('paste', (e) => { if (vistaActual === 'tablero' && tableroPegar) tableroPegar(e); });
['dragenter', 'dragleave', 'dragover', 'drop'].forEach(ev => document.addEventListener(ev, (e) => {
  if (vistaActual !== 'tablero' || !tableroSoltar) return;
  if (e.target.closest && e.target.closest('.tcard')) return;
  tableroSoltar[{ dragenter: 'enter', dragleave: 'leave', dragover: 'over', drop: 'drop' }[ev]](e);
}));

// =====================================================================
//  LEER Y ESCUCHAR (tu novela o cualquier texto pegado)
// =====================================================================
let pestanaLeer = 'novela', letraLectura = 19;
// Lector: lee unidades (párrafos o frases) de un contenedor, frase a frase.
const Lector = {
  unidades: [], idx: 0, cola: [], leyendo: false, timer: null, raiz: null, alCambiar: null,
  voces() { return (typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : []); },
  vocesEs() { const t = this.voces(); const es = t.filter(v => /^es/i.test(v.lang)); const l = es.length ? es : t; return l.slice().sort((a, b) => (b.lang === 'es-ES') - (a.lang === 'es-ES') || /natural|google|online/i.test(b.name) - /natural|google|online/i.test(a.name)); },
  voz(nombre) { return this.voces().find(v => v.name === nombre) || this.vocesEs()[0]; },
  preparar(raiz, selector, alCambiar) { this.parar(); this.raiz = raiz; this.unidades = $$(selector, raiz); this.idx = 0; this.alCambiar = alCambiar; },
  marcar() {
    $$('.leyendo', this.raiz).forEach(x => x.classList.remove('leyendo'));
    const u = this.unidades[this.idx];
    if (u && (this.leyendo || this.idx > 0)) {
      u.classList.add('leyendo');
      const r = u.getBoundingClientRect(); if (r.top < 90 || r.bottom > innerHeight - 40) u.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    this.alCambiar && this.alCambiar();
  },
  hablar() {
    clearTimeout(this.timer);
    if (!this.leyendo) return;
    if (!this.cola.length) {
      if (this.idx >= this.unidades.length) { this.parar(); aviso('Fin del texto'); return; }
      const u = this.unidades[this.idx];
      const t = u.textContent;
      this.dlg = u.dataset.dlg === '1' || /^\s*[—–-]/.test(t);
      this.cola = (t.match(/[^.!?…]+(?:[.!?…]+["»”’)]*\s*|$)/g) || [t]).map(s => s.trim()).filter(Boolean);
      if (!this.cola.length) { this.idx++; this.hablar(); return; }
      this.marcar();
    }
    const frase = this.cola.shift();
    const A = M.ajustes;
    const ut = new SpeechSynthesisUtterance(frase);
    const v = this.voz(A.vozDialogos && this.dlg ? A.voz2 : A.voz);
    if (v) { ut.voice = v; ut.lang = v.lang; } else ut.lang = 'es-ES';
    ut.rate = A.velocidad || 1;
    ut.onend = () => {
      if (!this.leyendo || ut._cancelado) return;
      if (!this.cola.length) { this.idx++; this.timer = setTimeout(() => this.hablar(), A.pausaParrafo ? 600 : 60); }
      else this.hablar();
    };
    ut.onerror = (e) => { if (e.error !== 'interrupted' && e.error !== 'canceled') { aviso('La voz ha fallado; prueba otra'); this.pausar(); } };
    this._u = ut;
    speechSynthesis.speak(ut);
  },
  cortar() { clearTimeout(this.timer); if (this._u) this._u._cancelado = true; this.cola = []; try { speechSynthesis.cancel(); } catch (e) {} },
  leer(desde) {
    if (!this.unidades.length) return aviso('No hay texto que leer');
    if (!this.voces().length) return aviso('Tu ordenador todavía no ha cargado las voces: espera un momento');
    if (desde != null) this.idx = desde;
    if (this.idx >= this.unidades.length) this.idx = 0;
    this.cortar(); this.leyendo = true; this.hablar();
  },
  pausar() { this.leyendo = false; this.cortar(); this.marcar(); },
  parar() { this.leyendo = false; this.cortar(); if (this.raiz) $$('.leyendo', this.raiz).forEach(x => x.classList.remove('leyendo')); this.alCambiar && this.alCambiar(); },
  ir(i) { const era = this.leyendo; this.cortar(); this.idx = Math.max(0, Math.min(this.unidades.length - 1, i)); this.marcar(); if (era) { this.leyendo = true; this.hablar(); } }
};
function pararLectura() { Lector.parar(); }
document.addEventListener('keydown', (e) => {
  if (vistaActual !== 'leer' || e.target.matches('textarea, input, select, [contenteditable="true"]') || !Lector.unidades.length) return;
  if (e.code === 'Space') { e.preventDefault(); Lector.leyendo ? Lector.pausar() : Lector.leer(); }
  if (e.key === 'ArrowRight') Lector.ir(Lector.idx + 1);
  if (e.key === 'ArrowLeft') Lector.ir(Lector.idx - 1);
});

function barraVoz(cont, alLeer) {
  const A = M.ajustes;
  const vs = Lector.vocesEs();
  const op = (sel) => vs.length ? vs.map(v => `<option value="${esc(v.name)}"${v.name === sel ? ' selected' : ''}>${esc(v.name.replace(/^(Microsoft|Google) /, ''))} (${v.lang})</option>`).join('') : '<option>Voz del sistema</option>';
  return `<button class="btn peq" id="lv-prev" title="Anterior (←)">‹</button><button class="btn peq prim" id="lv-play" title="Leer / pausa (barra espaciadora)">▶ Escuchar</button><button class="btn peq" id="lv-next" title="Siguiente (→)">›</button><button class="btn peq" id="lv-stop" title="Parar">■</button>
    <select class="txt peq-sel" id="lv-voz" title="Voz">${op(A.voz)}</select>
    <label class="fila suave" style="font-size:12.5px;gap:4px"><input type="checkbox" id="lv-dlg"${A.vozDialogos ? ' checked' : ''} style="accent-color:var(--verde)">Otra voz en diálogos</label>
    <select class="txt peq-sel" id="lv-voz2" title="Voz para los diálogos"${A.vozDialogos ? '' : ' disabled'}>${op(A.voz2)}</select>
    <select class="txt peq-sel" id="lv-vel" title="Velocidad">${[0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75].map(v => `<option value="${v}"${v === (A.velocidad || 1) ? ' selected' : ''}>${String(v).replace('.', ',')}×</option>`).join('')}</select>`;
}
function enlazarBarraVoz(cont) {
  const A = M.ajustes;
  const pinta = () => { const b = $('#lv-play', cont); if (b) b.textContent = Lector.leyendo ? '❚❚ Pausa' : '▶ Escuchar'; };
  Lector.alCambiar = pinta;
  $('#lv-play', cont).onclick = () => { if (Lector.leyendo) Lector.pausar(); else { const vis = Lector.unidades.findIndex(p => p.getBoundingClientRect().bottom > 80); Lector.leer(Lector.idx > 0 ? Lector.idx : Math.max(0, vis)); } pinta(); };
  $('#lv-stop', cont).onclick = () => { Lector.parar(); Lector.idx = 0; pinta(); };
  $('#lv-prev', cont).onclick = () => Lector.ir(Lector.idx - 1);
  $('#lv-next', cont).onclick = () => Lector.ir(Lector.idx + 1);
  $('#lv-voz', cont).onchange = (e) => { A.voz = e.target.value; guardarMeta(); if (Lector.leyendo) { Lector.cortar(); Lector.leyendo = true; Lector.hablar(); } };
  $('#lv-voz2', cont).onchange = (e) => { A.voz2 = e.target.value; guardarMeta(); };
  $('#lv-dlg', cont).onchange = (e) => { A.vozDialogos = e.target.checked; $('#lv-voz2', cont).disabled = !A.vozDialogos; guardarMeta(); };
  $('#lv-vel', cont).onchange = (e) => { A.velocidad = +e.target.value; guardarMeta(); };
  if (!A.voz && Lector.vocesEs()[0]) A.voz = Lector.vocesEs()[0].name;
  if (!A.voz2) { const otra = Lector.vocesEs().find(v => v.name !== A.voz); if (otra) A.voz2 = otra.name; }
  if (typeof speechSynthesis !== 'undefined' && !Lector.voces().length) speechSynthesis.onvoiceschanged = () => { speechSynthesis.onvoiceschanged = null; if (vistaActual === 'leer' && !Lector.leyendo) VISTAS.leer(cont); };
}

VISTAS.leer = async (cont) => {
  guardarTexto.ya();
  Lector.parar();
  const pest = `<div class="segmentos peq">${[['novela', 'Tu novela'], ['suelto', 'Texto pegado']].map(([k, t]) => `<button data-pl="${k}"${pestanaLeer === k ? ' class="on"' : ''}>${t}</button>`).join('')}</div>`;
  if (pestanaLeer === 'suelto') return pintarSuelto(cont, pest);
  const p = proyecto(); const caps = estructuraNovela();
  let html = `<h1 style="text-align:center;font:400 40px var(--serif);margin:40px 0 6px">${esc(p.titulo)}</h1><p style="text-align:center;color:var(--suave);font-style:italic">${esc(M.perfil.nombre || '')}</p>`;
  caps.forEach(c => {
    if (c.parte) { html += `<div class="parte" id="lc-${c.id}">${esc(c.titulo)}</div>`; return; }
    html += `<h2 class="capitulo" id="lc-${c.id}">${esc(c.titulo)}</h2>`;
    let primero = true;
    c.parrafos.forEach(ph => { if (ph === '***') { html += '<p class="sep">* * *</p>'; primero = true; return; } html += `<p class="u ${primero ? 'primero' : ''}">${ph}</p>`; primero = false; });
  });
  cont.innerHTML = `<div class="barra-lectura">${pest}<select class="txt peq-sel" id="lee-ir">${caps.map(c => `<option value="${c.id}">${c.parte ? '— ' : ''}${esc(c.titulo)}</option>`).join('')}</select>
      <button class="btn peq" id="lee-menos">A−</button><button class="btn peq" id="lee-mas">A+</button>${barraVoz(cont)}
      <button class="btn peq" id="lee-pdf">PDF</button><button class="btn peq" id="lee-word">Word</button></div>
    <article class="libro" id="libro" style="font-size:${letraLectura}px">${html}</article>`;
  $$('[data-pl]', cont).forEach(b => b.onclick = () => { pestanaLeer = b.dataset.pl; VISTAS.leer(cont); });
  $('#lee-ir', cont).onchange = (e) => { const t = $('#lc-' + e.target.value, cont); if (t) cont.scrollTop = t.offsetTop - 70; };
  $('#lee-menos', cont).onclick = () => { letraLectura = Math.max(14, letraLectura - 1); $('#libro', cont).style.fontSize = letraLectura + 'px'; };
  $('#lee-mas', cont).onclick = () => { letraLectura = Math.min(30, letraLectura + 1); $('#libro', cont).style.fontSize = letraLectura + 'px'; };
  $('#lee-pdf', cont).onclick = () => window.print();
  $('#lee-word', cont).onclick = exportarDocx;
  Lector.preparar($('#libro', cont), 'p.u');
  enlazarBarraVoz(cont);
  $('#libro', cont).onclick = (e) => { if (!Lector.leyendo) return; const u = e.target.closest('p.u'); const i = Lector.unidades.indexOf(u); if (i >= 0) Lector.ir(i); };
  const sel = M.nodos[M.sel[M.actual]]; const capId = sel ? (sel.tipo === 'esc' ? sel.padre : sel.id) : null;
  if (capId && $('#lc-' + capId, cont)) { $('#lee-ir', cont).value = capId; requestAnimationFrame(() => { cont.scrollTop = $('#lc-' + capId, cont).offsetTop - 70; }); }
};

// ---------- Texto pegado: analizar muletillas o escuchar ----------
async function pintarSuelto(cont, pest) {
  const pend = await Store.get('mesa:suelto');
  let texto = (await Store.get('mesa:suelto-texto')) || '';
  let modo = 'editar';
  if (pend && pend.texto) { texto = pend.texto; modo = pend.modo === 'escuchar' ? 'escuchar' : 'analizar'; await Store.remove('mesa:suelto'); await Store.set('mesa:suelto-texto', texto); }
  if (location.hash.startsWith('#leer-')) history.replaceState(null, '', '#leer');
  const pinta = () => {
    limpiarResaltado();
    cont.innerHTML = `<div class="barra-lectura">${pest}
        ${modo === 'editar' ? '<button class="btn peq prim" id="su-an">Analizar muletillas</button><button class="btn peq" id="su-es">Escuchar</button><button class="btn peq" id="su-cap">Convertir en capítulo nuevo</button><button class="btn peq" id="su-borrar">Vaciar</button>'
          : `<button class="btn peq" id="su-ed">✎ Editar texto</button>${modo === 'analizar' ? '<button class="btn peq" id="su-es">Escuchar</button>' : barraVoz(cont) + '<button class="btn peq" id="su-an">Analizar</button>'}`}</div>
      <div class="pagina" style="max-width:1180px;padding-top:24px">${modo === 'editar'
        ? `<p class="sub">Pega aquí un trozo de Google Docs, Word o cualquier web. También puedes seleccionar texto en cualquier página y, con el botón derecho, elegir Novelia Studio → «Analizar muletillas» o «Escuchar en voz alta».</p><textarea class="txt" id="su-txt" style="min-height:60vh;font:17px/1.7 var(--serif);padding:18px" placeholder="Pega aquí tu texto…">${esc(texto)}</textarea>`
        : modo === 'analizar'
          ? `<div class="rejilla" style="grid-template-columns:minmax(0,1fr) 300px;gap:20px;align-items:start"><div class="tarjeta suelto-vista" id="su-vista"></div><div class="tarjeta" id="su-res" style="position:sticky;top:70px;max-height:calc(100vh - 100px);overflow:auto"></div></div>`
          : `<article class="libro" id="su-libro" style="padding-top:20px"></article>`}</div>`;
    $$('[data-pl]', cont).forEach(b => b.onclick = () => { Lector.parar(); pestanaLeer = b.dataset.pl; VISTAS.leer(cont); });
    const tomar = () => { const t = $('#su-txt', cont); if (t) { texto = t.value; Store.set('mesa:suelto-texto', texto); } return texto.trim(); };
    if ($('#su-an', cont)) $('#su-an', cont).onclick = () => { if (!tomar()) return aviso('Pega un texto primero'); Lector.parar(); modo = 'analizar'; pinta(); };
    if ($('#su-es', cont)) $('#su-es', cont).onclick = () => { if (!tomar()) return aviso('Pega un texto primero'); modo = 'escuchar'; pinta(); };
    if ($('#su-ed', cont)) $('#su-ed', cont).onclick = () => { Lector.parar(); modo = 'editar'; pinta(); $('#su-txt', cont).focus(); };
    if ($('#su-borrar', cont)) $('#su-borrar', cont).onclick = () => { texto = ''; Store.set('mesa:suelto-texto', ''); pinta(); };
    if ($('#su-txt', cont)) $('#su-txt', cont).oninput = debounce((e) => { texto = e.target.value; Store.set('mesa:suelto-texto', texto); }, 500);
    if ($('#su-cap', cont)) $('#su-cap', cont).onclick = async () => {
      if (!tomar()) return aviso('Pega un texto primero');
      const html = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => /^(\*\s*){3}$/.test(l) ? '<p class="sep">* * *</p>' : `<p>${esc(l)}</p>`).join('');
      const id = uid(); const n = Analisis.contar(texto);
      M.nodos[id] = { id, pid: M.actual, padre: null, tipo: 'cap', titulo: `Capítulo ${capsMesa().length + 1}`, orden: hijos(null).length + 1, estado: 'borrador', sinopsis: '', pov: '', notas: '', palabras: n };
      T[id] = html; await Store.set('mesa:t:' + id, html); guardarMeta();
      mostrarVista('escribir'); abrirNodo(id); aviso('Capítulo creado (no cuenta como escrito hoy)');
    };
    if (modo === 'analizar') analizarSuelto(cont);
    if (modo === 'escuchar') {
      const lib = $('#su-libro', cont);
      texto.split(/\n/).filter(l => l.trim()).forEach(par => {
        const p = el('p', { class: /^\s*[—–-]/.test(par) ? 'dlg' : '' });
        (par.match(/[^.!?…]+(?:[.!?…]+["»”’)]*\s*|$)/g) || [par]).filter(s => s.trim()).forEach(s => p.append(el('span', { class: 'u', 'data-dlg': /^\s*[—–-]/.test(par) ? '1' : '0' }, s)));
        lib.append(p);
      });
      Lector.preparar(lib, 'span.u');
      enlazarBarraVoz(cont);
      lib.onclick = (e) => { const u = e.target.closest('span.u'); const i = Lector.unidades.indexOf(u); if (i >= 0) { Lector.ir(i); if (!Lector.leyendo) Lector.leer(i); } };
      if (pend && pend.modo === 'escuchar') aviso('Pulsa ▶ o la barra espaciadora para escuchar');
    }
  };
  pinta();
}
function analizarSuelto(cont) {
  const vista = $('#su-vista', cont);
  Store.get('mesa:suelto-texto').then(t => {
    vista.textContent = t || '';
    const mapa = mapaTexto(vista);
    const A = M.ajustes;
    const r = Analisis.analizar(mapa.texto, { repDist: A.repDist, fraseLarga: A.fraseLarga, muletillas: A.muletillas || Analisis.MULETILLAS_DEF, ignorar: A.ignorar });
    const grupos = {}; Object.keys(TIPOS).forEach(k => grupos[k] = []);
    r.items.forEach(it => { if (A.mostrar[it.tipo] === false) return; const rg = rango(mapa, it.s, it.e); if (rg) grupos[it.tipo].push(rg); });
    Object.entries(grupos).forEach(([k, rs]) => { const h = new Highlight(...rs); h.priority = { larga: 0, eco: 1, rep: 2, ment: 3, mul: 4 }[k]; CSS.highlights.set(k, h); });
    const R = r.resumen;
    const lista = (tipo, arr) => arr.length ? `<ul class="lista-rev">${arr.slice(0, 20).map(([k, v, lab]) => `<li data-t="${tipo}" data-k="${esc(k)}"><span>${esc(String(lab || k).replace(/\*/g, '…'))}</span><span>${v}</span></li>`).join('')}</ul>` : '<p class="tenue" style="margin:0 0 14px">Nada.</p>';
    $('#su-res', cont).innerHTML = `<p class="suave num" style="font-size:12.5px;margin:0 0 14px">${fmt(R.palabras)} palabras · ${fmt(R.frases)} frases · ${R.media} por frase · ${R.dialogo} % de diálogo</p>
      <div class="leyenda">${Object.entries(TIPOS).map(([k, v]) => `<label><span class="mues ${k}"></span>${v}</label>`).join('')}</div>
      <h2>Muletillas</h2>${lista('mul', R.mul)}<h2>Repeticiones cercanas</h2>${lista('rep', R.rep)}<h2>Las que más repites</h2>${lista('top', R.top)}<h2>Adverbios en -mente</h2>${lista('ment', R.ment)}
      ${R.larga ? `<h2>Frases largas</h2><ul class="lista-rev"><li data-t="larga"><span>Ir a la siguiente</span><span>${R.larga}</span></li></ul>` : ''}`;
    ultimoAnalisis = { ...r, mapa };
    $$('#su-res li[data-t]', cont).forEach(li => li.onclick = () => irAOcurrenciaEn(li.dataset.t, li.dataset.k ?? null, cont));
  });
}
// Igual que irAOcurrencia, pero desplazando la vista de texto pegado
function irAOcurrenciaEn(tipo, clave, cont) {
  if (!ultimoAnalisis) return;
  let lista;
  if (tipo === 'top') { lista = []; const re = new RegExp(`(?<![\\p{L}])${clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'giu'); let m; while ((m = re.exec(ultimoAnalisis.mapa.texto))) lista.push({ s: m.index, e: m.index + m[0].length }); }
  else lista = ultimoAnalisis.items.filter(it => it.tipo === tipo && (clave == null || it.clave === clave));
  if (!lista.length) return;
  const k = 'su|' + tipo + '|' + clave;
  cursorRev[k] = ((cursorRev[k] ?? -1) + 1) % lista.length;
  const it = lista[cursorRev[k]];
  const r = rango(ultimoAnalisis.mapa, it.s, it.e); if (!r) return;
  CSS.highlights.set('actual', new Highlight(r));
  const rect = r.getBoundingClientRect();
  cont.scrollTop += rect.top - innerHeight / 3;
  setTimeout(() => CSS.highlights.delete('actual'), 2200);
}

// =====================================================================
//  BLOQUEO DE WEBS (tarjeta de Inicio)
// =====================================================================
async function pintarBloqueoInicio() {
  const c = $('#inicio-bloq'); if (!c) return;
  const ahora = Date.now();
  const sesion = (BLOQ.sesionHasta || 0) > ahora;
  const pausa = !sesion && BLOQ.siempre && (BLOQ.pausaHasta || 0) > ahora;
  const hhmm = (t) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const it = (await Store.get('mesa:intentos')) || {};
  const n = it.fecha === diaStr() ? it.n : 0;
  c.innerHTML = `<div class="fila sep"><h2 style="margin:0">Bloqueo de webs</h2><label class="interruptor"><input type="checkbox" id="bq-on"${BLOQ.siempre ? ' checked' : ''}${sesion ? ' disabled' : ''}><span></span></label></div>
    <p style="margin:10px 0 8px">${sesion ? `Sesión en marcha: todo bloqueado hasta las <b>${hhmm(BLOQ.sesionHasta)}</b>. Sin pausas, reina.` : !BLOQ.siempre ? 'Desactivado: ahora mismo puedes entrar en todo. Tú sabrás. (Se activa solo en las sesiones.)' : pausa ? `En pausa hasta las <b>${hhmm(BLOQ.pausaHasta)}</b>. Luego vuelve el bloqueo solo.` : 'Activo siempre. Si entras, te lo voy a recordar.'}</p>
    <p class="suave" style="font-size:12.5px;margin:0 0 10px">${esc(M.ajustes.webs.join(' · '))}</p>
    ${BLOQ.siempre && !sesion ? (pausa ? '<button class="btn peq" id="bq-seguir">Volver a bloquear ya</button>' : `<span class="suave" style="font-size:12.5px;margin-right:6px">Pausa de</span>${[5, 15, 30].map(m => `<button class="btn peq" data-pausa="${m}">${m} min</button>`).join(' ')}`) : ''}
    <p class="tenue" style="font-size:12.5px;margin:12px 0 0">${n === 0 ? 'Hoy no has intentado escaparte ni una vez. Así me gusta.' : n === 1 ? 'Hoy has intentado escaparte 1 vez.' : `Hoy has intentado escaparte ${n} veces. Lo sé todo.`}</p>`;
  if ($('#bq-on', c)) $('#bq-on', c).onchange = async (e) => { await guardarBloq({ siempre: e.target.checked, pausaHasta: 0 }); pintarBloqueoInicio(); };
  $$('[data-pausa]', c).forEach(b => b.onclick = async () => { await guardarBloq({ pausaHasta: Date.now() + +b.dataset.pausa * 60000 }); pintarBloqueoInicio(); });
  if ($('#bq-seguir', c)) $('#bq-seguir', c).onclick = async () => { await guardarBloq({ pausaHasta: 0 }); pintarBloqueoInicio(); };
}

// =====================================================================
//  AJUSTES
// =====================================================================
VISTAS.ajustes = async (cont) => {
  const A = M.ajustes; const p = proyecto();
  const ultima = await Store.get('mesa:ultimaCopia');
  cont.innerHTML = `<div class="pagina" style="max-width:860px">
    <h1>Ajustes</h1><p class="sub">Todo se guarda en tu propio Chrome. Nada sale de tu ordenador.</p>
    <div class="rejilla" style="gap:18px">
      <div class="tarjeta" id="aj-taller"><h2>Traer mis datos del Taller (las 13 extensiones)</h2>
        <ol style="margin:0 0 12px;padding-left:20px;line-height:1.7">
          <li>Pulsa el icono de <b>Copia de seguridad del taller</b> → <b>Hacer copia ahora</b>. Se guarda en Descargas › Taller de novela.</li>
          <li>Pulsa aquí y elige ese archivo («Copia … .json»).</li></ol>
        <div class="fila" style="flex-wrap:wrap"><button class="btn prim" id="aj-taller-b">Elegir la copia del Taller…</button>${M.importadoTaller && M.importadoTaller !== 'oculto' ? `<span class="suave" style="font-size:12.5px">Última importación: ${new Date(M.importadoTaller).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}. Puedes repetirla: no duplica nada.</span>` : ''}</div></div>

      <div class="tarjeta"><h2>Exportar e importar</h2>
        <div class="fila" style="flex-wrap:wrap"><button class="btn prim" id="aj-docx">Descargar «${esc(p.titulo)}» en Word</button><button class="btn" id="aj-txt">En .txt</button><button class="btn" id="aj-pdf">En PDF</button><button class="btn" id="aj-imp">Importar un Word o .txt…</button></div>
        <p class="tenue" style="margin:10px 0 0;font-size:12.5px">El Word sale con formato de manuscrito: Times 12, interlineado 1,5, sangría y cada capítulo en página nueva.</p></div>

      <div class="tarjeta"><h2>Apariencia</h2>
        <div class="rejilla r3" style="gap:10px">
          <label class="campo"><span>Tema</span><select id="aj-tema">${[['auto', 'Como el ordenador'], ['papel', 'Papel'], ['noche', 'Noche']].map(([v, t]) => `<option value="${v}"${A.tema === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="campo"><span>Tamaño de letra: <b id="aj-l-v">${A.letra}</b></span><input type="range" id="aj-letra" min="15" max="28" value="${A.letra}"></label>
          <label class="campo"><span>Ancho de la hoja: <b id="aj-a-v">${A.ancho}</b></span><input type="range" id="aj-ancho" min="520" max="960" step="20" value="${A.ancho}"></label>
        </div></div>

      <div class="tarjeta"><h2>Objetivos</h2>
        <p style="margin:0 0 10px">«${esc(p.titulo)}»: ${fmt(p.objetivo)} palabras${p.fechaLimite ? ' para el ' + fechaLarga(deStr(p.fechaLimite)) : ''} · ${fmt(p.palabrasFuera || 0)} escritas fuera · objetivo diario ${A.objetivoDiario ? fmt(A.objetivoDiario) : 'automático (' + fmt(objetivoHoy()) + ' hoy)'} · escribes ${(A.diasEscritura || []).length === 7 ? 'todos los días' : [1, 2, 3, 4, 5, 6, 0].filter(d => (A.diasEscritura || []).includes(d)).map(d => DIAS_CORTOS[d]).join(' ')} · racha desde ${plural(A.minRacha, 'palabra')}</p>
        <button class="btn peq" id="aj-obj">Cambiar</button></div>

      <div class="tarjeta"><h2>Bloqueo de webs</h2>
        <label class="check"><input type="checkbox" id="aj-siempre"${BLOQ.siempre ? ' checked' : ''}><span>Bloquearlas siempre, no solo en las sesiones<small>Con pausas de 5, 15 o 30 minutos desde Inicio.</small></span></label>
        <label class="campo"><span>Webs bloqueadas (una por línea)</span><textarea id="aj-webs" rows="6">${esc(A.webs.join('\n'))}</textarea></label>
        <p class="tenue" style="margin:0;font-size:12.5px">Las frases de la pantalla de bloqueo están en el archivo frases.js de la carpeta del ayudante.</p></div>

      <div class="tarjeta"><h2>Revisión</h2>
        <label class="campo"><span>Muletillas que quieres que te marque (una por línea; un * al final vale para cualquier terminación: sonri* = sonrió, sonriendo…)</span><textarea id="aj-mul" rows="8">${esc((A.muletillas || Analisis.MULETILLAS_DEF).join('\n'))}</textarea></label>
        <div class="rejilla r2" style="gap:10px">
          <label class="campo"><span>Repetición: misma palabra a menos de… palabras</span><input id="aj-dist" type="number" min="10" max="300" value="${A.repDist}"></label>
          <label class="campo"><span>Frase larga: más de… palabras</span><input id="aj-larga" type="number" min="15" max="120" value="${A.fraseLarga}"></label>
        </div>
        <label class="campo"><span>Palabras que no quieres que marque como repetidas (nombres, etc.)</span><textarea id="aj-ign" rows="3" placeholder="Una por línea">${esc((A.ignorar || []).join('\n'))}</textarea></label>
        <button class="btn peq" id="aj-mul-def">Volver a la lista original de muletillas</button></div>

      <div class="tarjeta"><h2>Lectura en voz alta</h2>
        <label class="check"><input type="checkbox" id="aj-pausa"${A.pausaParrafo ? ' checked' : ''}><span>Pausa un poco más larga entre párrafos</span></label>
        <p class="tenue" style="margin:0;font-size:12.5px">Las voces son las de tu ordenador; en Mac suele haber varias en español (las «Mejoradas» o «Premium» suenan mejor: Ajustes del sistema › Accesibilidad › Contenido leído). Elige la voz y la de los diálogos en Leer.</p></div>

      <div class="tarjeta"><h2>Copia de seguridad</h2>
        <p style="margin:0 0 10px">${ultima ? 'Última copia: ' + new Date(ultima).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' }) : 'Todavía no hay ninguna copia. Haz una ahora.'}<br><span class="suave">Se guardan en tu carpeta de Descargas («Novelia Studio · Copia …»). Muévelas a Drive o a un USB de vez en cuando. Incluyen también el tablero.</span></p>
        <div class="fila" style="flex-wrap:wrap"><button class="btn prim" id="aj-copia">Hacer copia ahora</button>
          <label class="fila suave" style="font-size:13px">Copia automática <select id="aj-cd" class="txt" style="width:auto;padding:4px 8px">${[[1, 'cada día'], [3, 'cada 3 días'], [7, 'cada semana'], [0, 'nunca']].map(([v, t]) => `<option value="${v}"${A.copiaDias === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
          <button class="btn" id="aj-rest">Restaurar desde una copia…</button><input type="file" id="aj-rest-f" accept=".json" hidden></div>
        <p style="margin:14px 0 8px" class="suave">¿Tienes la biblia de una novela (escaleta, personajes, cronología…)? Pásamela a Claude, te la devuelve en un archivo y la cargas aquí.</p>
        <button class="btn" id="aj-biblia">Importar biblia…</button></div>

      <div class="tarjeta"><h2>Novelas</h2>
        ${M.proyectos.map(x => `<div class="fila sep" style="padding:8px 0;border-bottom:1px solid var(--linea)"><span style="font-family:var(--serif);font-size:17px">${esc(x.titulo)} <span class="tenue num" style="font-family:var(--sans);font-size:12.5px">${fmt(totalProyecto(x.id))} palabras</span></span>
          <span>${x.id === M.actual ? '<span class="suave" style="font-size:12.5px;margin-right:8px">abierta</span>' : `<button class="btn peq" data-abrir="${x.id}">Abrir</button>`}${M.proyectos.length > 1 ? ` <button class="btn peq" data-borrar-p="${x.id}" style="color:var(--rojo)">Borrar</button>` : ''}</span></div>`).join('')}
        <button class="btn peq" id="aj-np" style="margin-top:12px">+ Nueva novela</button></div>
    </div></div>`;
  $('#aj-taller-b', cont).onclick = () => elegirCopiaTaller();
  $('#aj-docx', cont).onclick = exportarDocx;
  $('#aj-txt', cont).onclick = exportarTxt;
  $('#aj-pdf', cont).onclick = () => { pestanaLeer = 'novela'; mostrarVista('leer'); setTimeout(() => window.print(), 400); };
  $('#aj-imp', cont).onclick = elegirArchivoImportar;
  $('#aj-tema', cont).onchange = (e) => { A.tema = e.target.value; guardarMeta(); aplicarAparencia(); };
  $('#aj-letra', cont).oninput = (e) => { A.letra = +e.target.value; $('#aj-l-v', cont).textContent = A.letra; guardarMeta(); aplicarAparencia(); };
  $('#aj-ancho', cont).oninput = (e) => { A.ancho = +e.target.value; $('#aj-a-v', cont).textContent = A.ancho; guardarMeta(); aplicarAparencia(); };
  $('#aj-obj', cont).onclick = editarObjetivo;
  const lineas = (v) => v.split('\n').map(s => s.trim()).filter(Boolean);
  $('#aj-siempre', cont).onchange = (e) => guardarBloq({ siempre: e.target.checked, pausaHasta: 0 });
  $('#aj-webs', cont).oninput = debounce((e) => { A.webs = lineas(e.target.value).map(w => w.toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[\/?#]/)[0]).filter(w => /\./.test(w)); guardarMeta(); guardarBloq(); }, 500);
  $('#aj-mul', cont).oninput = debounce((e) => { A.muletillas = lineas(e.target.value); guardarMeta(); }, 400);
  $('#aj-mul-def', cont).onclick = () => { A.muletillas = null; guardarMeta(); VISTAS.ajustes(cont); aviso('Lista original recuperada'); };
  $('#aj-dist', cont).onchange = (e) => { A.repDist = Math.max(10, +e.target.value || 50); guardarMeta(); };
  $('#aj-larga', cont).onchange = (e) => { A.fraseLarga = Math.max(15, +e.target.value || 35); guardarMeta(); };
  $('#aj-ign', cont).oninput = debounce((e) => { A.ignorar = lineas(e.target.value); guardarMeta(); }, 400);
  $('#aj-pausa', cont).onchange = (e) => { A.pausaParrafo = e.target.checked; guardarMeta(); };
  $('#aj-cd', cont).onchange = (e) => { A.copiaDias = +e.target.value; Store.set('mesa:meta', M); };
  $('#aj-copia', cont).onclick = async () => {
    guardarTexto.ya(); await Store.set('mesa:meta', M);
    const r = await hacerCopiaApp();
    if (r && r.ok) { aviso('Copia guardada en Descargas'); VISTAS.ajustes(cont); } else aviso('No he podido guardar la copia');
  };
  $('#aj-rest', cont).onclick = () => $('#aj-rest-f', cont).click();
  $('#aj-biblia', cont).onclick = () => elegirBiblia();
  $('#aj-rest-f', cont).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    let j; try { j = JSON.parse(await f.text()); } catch (err) { aviso('Ese archivo no es una copia válida'); return; }
    if (j && j.app === 'Taller de novela') { importarTaller(j); return; }
    if (!j || !['mesa-de-escritura', 'novelia-studio'].includes(j.app) || !j.datos || !j.datos['mesa:meta']) { aviso('Ese archivo no es una copia de Novelia Studio'); return; }
    if (!(await preguntar('¿Restaurar esta copia?', `Copia del ${new Date(j.fecha).toLocaleString('es-ES')}. Antes de sustituir nada, descargo lo que tienes ahora en un archivo «Antes de restaurar».`, 'Restaurar'))) return;
    guardarTexto.ya(); await Store.set('mesa:meta', M);
    const ahora = await Store.todo();
    descargar(new Blob([JSON.stringify({ app: 'novelia-studio', version: 3, fecha: new Date().toISOString(), datos: ahora })], { type: 'application/json' }), `Antes de restaurar ${diaStr()}.json`);
    await new Promise(r => setTimeout(r, 600));
    await Store.limpiar();
    await chrome.storage.local.set(j.datos);
    location.reload();
  };
  $$('[data-abrir]', cont).forEach(b => b.onclick = () => { cambiarProyecto(b.dataset.abrir); VISTAS.ajustes(cont); });
  $$('[data-borrar-p]', cont).forEach(b => b.onclick = async () => {
    const x = M.proyectos.find(q => q.id === b.dataset.borrarP);
    if (!(await preguntar(`¿Borrar «${x.titulo}» entera?`, `Se borran sus ${fmt(totalProyecto(x.id))} palabras, capítulos, personajes, cabos, cronología y estructura. Esto no se puede deshacer (salvo con una copia de seguridad).`, 'Borrar novela', true))) return;
    nodosDe(x.id).forEach(n => { delete M.nodos[n.id]; delete T[n.id]; Store.remove('mesa:t:' + n.id); });
    ['personajes', 'ideas', 'cabos', 'crono'].forEach(k => M[k] = M[k].filter(q => q.pid !== x.id));
    delete M.estructura[x.id]; if (M.publicar) delete M.publicar[x.id];
    M.proyectos = M.proyectos.filter(q => q.id !== x.id); delete M.sel[x.id];
    if (M.actual === x.id) cambiarProyecto(M.proyectos[0].id);
    guardarMeta(); VISTAS.ajustes(cont);
  });
  $('#aj-np', cont).onclick = async () => { const t = await pedirTexto('Nueva novela', '', 'Título'); if (t) crearProyecto(t); };
};

// =====================================================================
//  IMPORTAR LA COPIA DEL TALLER (las 13 extensiones)
// =====================================================================
function elegirCopiaTaller() {
  const f = el('input', { type: 'file', accept: '.json', hidden: true });
  f.onchange = async () => {
    const file = f.files[0]; f.remove(); if (!file) return;
    let j; try { j = JSON.parse(await file.text()); } catch (e) { aviso('Ese archivo no es una copia válida'); return; }
    if (!j || j.app !== 'Taller de novela' || !j.extensiones) { aviso('Ese archivo no es una copia del Taller. Busca uno que se llame «Copia … .json» en Descargas › Taller de novela.'); return; }
    importarTaller(j);
  };
  document.body.append(f); f.click();
}

async function importarTaller(copia) {
  guardarTexto.ya();
  const porNombre = {};
  Object.values(copia.extensiones || {}).forEach(e => { if (e && e.nombre) porNombre[e.nombre] = e.data || {}; });
  const D = (n) => porNombre[n] || null;
  const hecho = [];
  const norm = (s) => String(s || '').trim().toLowerCase();
  // La novela principal: la de «Mil palabras» si tiene nombre; si no, la que tienes abierta
  const mp = D('Mil palabras') && D('Mil palabras').mp;
  const crearSilencioso = (titulo) => {
    const pid = uid();
    M.proyectos.push({ id: pid, titulo, objetivo: 80000, fechaLimite: diaStr(sumarDias(new Date(), 180)), creado: Date.now() });
    return pid;
  };
  let principal = M.actual;
  if (mp && mp.novel) {
    const ya = M.proyectos.find(p => norm(p.titulo) === norm(mp.novel));
    if (ya) principal = ya.id;
    else {
      const cur = proyecto();
      if (palabrasMesa(cur.id) === 0 && /^mi novela$/i.test(cur.titulo)) { cur.titulo = mp.novel; principal = cur.id; }
      else principal = crearSilencioso(mp.novel);
    }
  }
  const novelaDe = (nombre) => {
    if (!nombre || /^mi novela$/i.test(String(nombre).trim())) return principal;
    const ya = M.proyectos.find(p => norm(p.titulo) === norm(nombre));
    return ya ? ya.id : crearSilencioso(String(nombre).trim());
  };
  const P = M.proyectos.find(p => p.id === principal);

  // Mil palabras
  if (mp) {
    if (mp.total) P.objetivo = mp.total;
    if (mp.deadline) P.fechaLimite = mp.deadline;
    P.palabrasFuera = Math.max(0, mp.written || 0);
    if (mp.days && mp.days.length) M.ajustes.diasEscritura = mp.days.slice();
    if (mp.weekGoal) M.ajustes.objetivoSemanal = mp.weekGoal;
    const log = D('Mil palabras').mpLog || {};
    Object.entries(log).forEach(([d, n]) => { const x = dia(d); x.t = Math.max(0, n || 0); });
    hecho.push(`Mil palabras: ${fmt(mp.written || 0)} de ${fmt(mp.total || 0)} palabras y ${plural(Object.keys(log).length, 'día')} apuntados`);
  }
  // Sprints
  const sp = D('Sprint de escritura');
  if (sp && sp.sprints && sp.sprints.length) {
    const ya = new Set(M.stats.sesiones.map(s => s.inicio));
    let n = 0;
    sp.sprints.forEach(s => { if (ya.has(s.start)) return; M.stats.sesiones.push({ inicio: s.start, min: s.minutes, palabras: s.words || 0, hora: new Date(s.start).getHours(), word: true }); n++; });
    M.stats.sesiones.sort((a, b) => a.inicio - b.inicio);
    if (sp.sprintPrefs && sp.sprintPrefs.minutes) M.ajustes.ultimaDuracion = sp.sprintPrefs.minutes;
    hecho.push(`Sprints: ${plural(n, 'sesión nueva', 'sesiones nuevas')}`);
  }
  // Cabos sueltos
  const cb = D('Cabos sueltos');
  if (cb && cb.cabos && cb.cabos.length) {
    const ya = new Set(M.cabos.map(c => c.id));
    let n = 0; cb.cabos.forEach(c => { if (ya.has(c.id)) return; M.cabos.push({ ...c, pid: principal }); n++; });
    hecho.push(`Cabos sueltos: ${plural(n, 'cabo')}`);
  }
  // Mi libreta
  const lb = D('Mi libreta');
  if (lb && lb.notas && lb.notas.length) {
    (lb.notaTags || []).forEach(t => { if (!M.etiquetas.includes(t)) M.etiquetas.push(t); });
    const ya = new Set(M.ideas.map(i => i.id));
    let n = 0;
    lb.notas.forEach(x => { if (ya.has(x.id)) return; if (x.tag && !M.etiquetas.includes(x.tag)) M.etiquetas.push(x.tag); M.ideas.push({ id: x.id, pid: null, texto: x.text, cat: x.tag || M.etiquetas[0], hecha: false, creada: x.created || Date.now() }); n++; });
    M.ideas.sort((a, b) => b.creada - a.creada);
    hecho.push(`Mi libreta: ${plural(n, 'idea')}`);
  }
  // Vuelve a la novela
  const vu = D('Vuelve a la novela');
  if (vu) {
    // Si la lista de Novelia sigue siendo la de serie, se queda la tuya tal cual; si la habías cambiado, se juntan
    const VIEJA = ['facebook.com', 'instagram.com', 'tiktok.com', 'youtube.com', 'x.com', 'twitter.com', 'pinterest.com', 'netflix.com'];
    const deSerie = [AJUSTES_DEF.webs, VIEJA].some(l => JSON.stringify(M.ajustes.webs) === JSON.stringify(l));
    M.ajustes.webs = [...new Set([...(vu.blockSites || []), ...(deSerie ? [] : M.ajustes.webs)])];
    await guardarBloq({ siempre: vu.blockOn !== false && (vu.blockSites || []).length > 0, pausaHasta: 0 });
    hecho.push(`Vuelve a la novela: ${plural((vu.blockSites || []).length, 'web bloqueada', 'webs bloqueadas')}${BLOQ.siempre ? ' (bloqueo siempre activo, como lo tenías)' : ''}`);
  }
  // Biblia de personajes
  const bi = D('Biblia de personajes');
  if (bi && bi.personajes && bi.personajes.length) {
    let n = 0;
    bi.personajes.forEach(x => {
      const ya = M.personajes.find(p => p.id === x.id);
      const nuevo = { id: x.id, pid: novelaDe(x.f && x.f.novela), color: x.color || COLORES_PJ[0], f: { ...(x.f || {}) }, extra: x.extra || [] };
      if (ya) Object.assign(ya, nuevo); else { M.personajes.push(nuevo); n++; }
    });
    hecho.push(`Biblia de personajes: ${plural(bi.personajes.length, 'personaje')}`);
  }
  // Detector de muletillas
  const de = D('Detector de muletillas');
  if (de) {
    if (de.muletillas && de.muletillas.length) M.ajustes.muletillas = de.muletillas.slice();
    if (de.detectorText && !(await Store.get('mesa:suelto-texto'))) await Store.set('mesa:suelto-texto', de.detectorText);
    hecho.push(`Detector de muletillas: ${de.muletillas ? 'tu lista de ' + plural(de.muletillas.length, 'muletilla') : 'lista por defecto'}`);
  }
  // Cronología
  const cr = D('Cronología');
  if (cr && cr.crono && cr.crono.eventos) {
    const mapa = {};
    (cr.crono.novelas || []).forEach(nv => { mapa[nv.id] = novelaDe(nv.nombre); const pr = M.proyectos.find(p => p.id === mapa[nv.id]); if (pr && nv.modo) pr.modoCrono = nv.modo; });
    const ya = new Set(M.crono.map(e => e.id));
    let n = 0;
    cr.crono.eventos.forEach(e => { if (ya.has(e.id)) return; const { nov, ...resto } = e; M.crono.push({ ...resto, pid: mapa[nov] || principal }); n++; });
    hecho.push(`Cronología: ${plural(n, 'momento')}`);
  }
  // Diccionario
  const di = D('Diccionario');
  if (di && di.banco) {
    const palabras = Object.entries(di.banco).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    M.banco = [...new Set([...palabras, ...M.banco])].slice(0, 500);
    hecho.push(`Diccionario: ${plural(palabras.length, 'palabra')} en tu banco`);
  }
  // Lectura en voz alta
  const le = D('Lectura en voz alta');
  if (le && le.lectorPrefs) {
    const lp = le.lectorPrefs;
    Object.assign(M.ajustes, { velocidad: lp.rate || 1, voz: lp.voice || M.ajustes.voz, voz2: lp.voice2 || M.ajustes.voz2, vozDialogos: !!lp.dlg, pausaParrafo: lp.pausa !== false });
    hecho.push('Lectura en voz alta: tus voces y velocidad');
  }
  // Estructura romántica
  const es = D('Estructura romántica');
  if (es && es.estructura && es.estructura.novelas) {
    es.estructura.novelas.forEach(nv => { M.estructura[novelaDe(nv.nombre)] = { caps: nv.caps || 30, momentos: nv.momentos || {}, capitulos: nv.capitulos || {} }; });
    hecho.push(`Estructura romántica: ${plural(es.estructura.novelas.length, 'novela')}`);
  }
  // Tablero de inspiración
  const tb = D('Tablero de inspiración');
  if (tb) {
    const items = Object.keys(tb).filter(k => k.startsWith('item:'));
    const boardsAct = (await chrome.storage.local.get('tabBoards')).tabBoards || [];
    const boards = [...boardsAct];
    (tb.tabBoards || []).forEach(b => { const ya = boards.find(x => x.id === b.id); if (ya) ya.nombre = b.nombre; else boards.push(b); });
    const set = { tabBoards: boards.length ? boards : TABLEROS_INICIALES };
    items.forEach(k => set[k] = tb[k]);
    if (tb.tabCur) set.tabCur = tb.tabCur;
    await chrome.storage.local.set(set);
    hecho.push(`Tablero de inspiración: ${plural(items.length, 'cosa guardada', 'cosas guardadas')} en ${plural(set.tabBoards.length, 'tablero')}`);
  }
  M.importadoTaller = Date.now();
  M.actual = principal;
  await Store.set('mesa:meta', M);
  nodoAbierto = null;
  abrirNodo(M.sel[M.actual] || (ordenLectura().find(n => n.tipo !== 'parte') || {}).id);
  mostrarVista('inicio');
  const faltan = ['Cabos sueltos', 'Mi libreta', 'Vuelve a la novela', 'Mil palabras', 'Biblia de personajes', 'Detector de muletillas', 'Sprint de escritura', 'Cronología', 'Diccionario', 'Lectura en voz alta', 'Estructura romántica', 'Tablero de inspiración'].filter(n => !porNombre[n]);
  modal(`<h3>Ya está todo en Novelia Studio</h3>
    <p class="suave" style="margin-top:-6px">Copia del ${new Date(copia.fecha).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}.</p>
    <ul style="padding-left:20px;line-height:1.6;margin:0 0 12px">${hecho.map(h => `<li>${esc(h)}</li>`).join('') || '<li>La copia estaba vacía.</li>'}</ul>
    ${faltan.length ? `<p class="tenue" style="font-size:12.5px">No venían en la copia (o estaban vacías): ${esc(faltan.join(', '))}.</p>` : ''}
    <p style="font-size:14px">Cuando lo hayas mirado, ya puedes quitar las otras 13 extensiones en <b>chrome://extensions</b>. Tu copia sigue en Descargas por si acaso.</p>
    <div class="pie"><button class="btn prim" data-cerrar>Perfecto</button></div>`, { ancho: 560 });
}

