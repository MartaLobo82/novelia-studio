'use strict';
// =====================================================================
//  Planner — Redes: calendario de publicaciones, batch (una fila por
//  pieza, con sus pasos) y banco de ideas.
// =====================================================================

VISTAS.redes = (cont) => {
  const p = UI.rPest || 'calendario';
  cont.innerHTML = `<div class="pagina ancha redes">${cabecera('📱 Redes', 'Lo que publicas, lo que tienes a medias y las ideas para el próximo batch.',
    `<button class="btn" id="re-idea">+ Idea</button><button class="btn prim" id="re-pieza">+ Pieza</button>`)}
    ${pestanas([['calendario', '🗓️ Calendario'], ['batch', '🎬 Batch'], ['banco', '💡 Banco de ideas']], p, 'rPest')}
    <div id="re-cuerpo"></div></div>`;
  enlazarPestanas(cont);
  $('#re-idea', cont).onclick = () => editarIdea({}, { nueva: true });
  $('#re-pieza', cont).onclick = () => editarPieza({ fecha: UI.rDia || hoy(), formato: 'Post', donde: 'Instagram', prioridad: '🟠Media' }, { nueva: true });
  const c = $('#re-cuerpo', cont);
  if (p === 'batch') redesBatch(c); else if (p === 'banco') redesBanco(c); else redesCalendario(c);
};

function pasosPieza(b) {
  return `<div class="pasos">${PASOS_PIEZA.map(([k, t]) => `<button data-paso="${k}" class="${b[k] ? 'on' : ''}" title="${t}">${{ grabado: '🎥', editado: '✂️', captionListo: '✍️', programado: '⏱️', publicado: '📳' }[k]}</button>`).join('')}</div>`;
}
function enlazarPasos(cont) {
  $$('[data-pieza]', cont).forEach(n => {
    const b = D.batch.find(x => x.id === n.dataset.pieza); if (!b) return;
    n.onclick = (e) => {
      const paso = e.target.closest('[data-paso]');
      if (paso) { e.stopPropagation(); b[paso.dataset.paso] = !b[paso.dataset.paso]; cambio(); return; }
      editarPieza(b);
    };
  });
}

function redesCalendario(c) {
  if (!UI.rMes) UI.rMes = mesDe(hoy());
  const ym = UI.rMes, fmt = UI.rFmt || 'Todos', H = hoy();
  const semanas = semanasDelMes(ym);
  const piezas = D.batch.filter(b => b.fecha && (fmt === 'Todos' || b.formato === fmt));
  const delMes = piezas.filter(b => mesDe(b.fecha) === ym);
  c.innerHTML = `<div class="nav-cal"><button class="icono" id="rc-ant">‹</button><h2 class="titulo-cal">${nombreMes(ym)}</h2><button class="icono" id="rc-sig">›</button>
      <div class="segmentado peq">${['Todos', ...D.listas.formatos].map(f => `<button data-fmt="${f}" class="${f === fmt ? 'on' : ''}">${FORMATO_E[f] || ''} ${f}</button>`).join('')}</div>
      <span class="tenue">${plural(delMes.length, 'pieza', 'piezas')} · ${delMes.filter(b => b.publicado).length} publicadas</span></div>
    <div class="mes redes-mes">${DIAS.map(d => `<div class="cab-dia">${may(d).slice(0, 3)}</div>`).join('')}
      ${semanas.flat().map(f => {
        const xs = piezas.filter(b => b.fecha === f);
        return `<div class="celda ${mesDe(f) !== ym ? 'fuera' : ''} ${f === H ? 'hoy' : ''}" data-dia="${f}"><div class="num"><span>${aFecha(f).getDate()}</span></div>
          ${xs.map(b => `<div class="pieza-cal ${b.publicado ? 'hecho' : ''} ${!b.publicado && b.fecha < H ? 'atrasada' : ''}" data-pieza="${b.id}" draggable="true" data-arr="pieza:${b.id}">${b.publicado ? '✅ ' : ''}${FORMATO_E[b.formato] || ''} <b>${esc(b.formato || '')}</b> ${esc(temaPieza(b))}</div>`).join('')}</div>`;
      }).join('')}</div>
    <p class="tenue leyenda-redes">🎬 Reel · 🗂️ Carrusel · 📷 Post · ⭕ Story · ✅ publicado. Toca un día vacío para añadir una pieza; arrastra para moverla.</p>`;
  $('#rc-ant', c).onclick = () => { UI.rMes = sumarMeses(ym, -1); guardarUI(); pintar(); };
  $('#rc-sig', c).onclick = () => { UI.rMes = sumarMeses(ym, 1); guardarUI(); pintar(); };
  $$('[data-fmt]', c).forEach(b => b.onclick = () => { UI.rFmt = b.dataset.fmt; guardarUI(); pintar(); });
  $$('[data-pieza]', c).forEach(n => {
    n.onclick = (e) => { e.stopPropagation(); editarPieza(D.batch.find(x => x.id === n.dataset.pieza)); };
    n.ondragstart = (e) => { e.dataTransfer.setData('text/plain', n.dataset.arr); };
  });
  $$('.celda', c).forEach(cel => {
    cel.onclick = () => editarPieza({ fecha: cel.dataset.dia, formato: fmt !== 'Todos' ? fmt : 'Post', donde: 'Instagram', prioridad: '🟠Media' }, { nueva: true });
    cel.ondragover = (e) => { e.preventDefault(); cel.classList.add('soltar'); };
    cel.ondragleave = () => cel.classList.remove('soltar');
    cel.ondrop = (e) => { e.preventDefault(); cel.classList.remove('soltar'); const [, id] = e.dataTransfer.getData('text/plain').split(':'); const b = D.batch.find(x => x.id === id); if (b) { const antes = b.fecha; b.fecha = cel.dataset.dia; cambio(); aviso('Pieza movida', { t: 'Deshacer', fn: () => { b.fecha = antes; cambio(); } }); } };
  });
}

function redesBatch(c) {
  const ver = UI.rVer || 'pendientes', H = hoy();
  let piezas = [...D.batch];
  if (ver === 'pendientes') piezas = piezas.filter(b => !b.publicado);
  piezas.sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
  if (ver === 'todas') piezas.reverse();
  const n = (f) => D.batch.filter(f).length;
  c.innerHTML = `<div class="barra-filtros"><div class="segmentado">${[['pendientes', 'Sin publicar'], ['todas', 'Todas']].map(([k, t]) => `<button data-ver="${k}" class="${k === ver ? 'on' : ''}">${t}</button>`).join('')}</div>
      <span class="tenue">💡 ${n(b => estadoPieza(b) === '💡Idea')} ideas · 📈 ${n(b => estadoPieza(b) === '📈 En proceso')} en proceso · 🚀 ${n(b => estadoPieza(b) === '🚀Diseñado')} diseñadas · ⏱️ ${n(b => estadoPieza(b) === '⏱️Programada')} programadas · 📳 ${n(b => b.publicado)} publicadas</span></div>
    <p class="tenue" style="margin-top:0">Toca los iconos para marcar cada paso: 🎥 grabado/diseñado · ✂️ editado · ✍️ caption listo · ⏱️ programado · 📳 publicado. El estado sale solo.</p>
    <div class="tabla-batch">${piezas.map(b => `<div class="fila-batch ${b.publicado ? 'hecho' : ''} ${!b.publicado && b.fecha && b.fecha < H ? 'atrasada' : ''}" data-pieza="${b.id}">
      <div class="fb-fecha">${b.fecha ? `<b>${aFecha(b.fecha).getDate()}</b><span>${MESES_C[aFecha(b.fecha).getMonth()]}</span>` : '<span>sin fecha</span>'}</div>
      <div class="fb-cuerpo"><div class="t1">${FORMATO_E[b.formato] || ''} ${esc(temaPieza(b) || 'sin tema')}</div>
        <div class="t2"><span>${esc(b.formato || '')}${b.donde ? ' · ' + esc(b.donde) : ''}</span>${b.idea !== '' && b.idea != null ? `<span>idea nº ${esc(b.idea)}</span>` : ''}<span>${estadoPieza(b)}</span>${ganchoPieza(b) ? `<span class="tenue">«${esc(ganchoPieza(b))}»</span>` : ''}</div></div>
      ${pasosPieza(b)}</div>`).join('') || '<p class="vacio">No hay piezas aquí. Pasa ideas del banco al batch.</p>'}</div>`;
  $$('[data-ver]', c).forEach(b => b.onclick = () => { UI.rVer = b.dataset.ver; guardarUI(); pintar(); });
  enlazarPasos(c);
}

function redesBanco(c) {
  const ver = UI.rBanco || 'sinusar';
  const enBatch = (i) => D.batch.some(b => String(b.idea) === String(i.n));
  let ideas = [...D.ideas].sort((a, b) => (Number(a.n) || 0) - (Number(b.n) || 0));
  if (ver === 'sinusar') ideas = ideas.filter(i => !enBatch(i));
  const cuenta = (campo, valor) => D.ideas.filter(i => i[campo] === valor).length;
  const sinUsar = D.ideas.filter(i => !enBatch(i)).length;
  c.innerHTML = `<div class="barra-filtros"><div class="segmentado">${[['sinusar', `Sin usar (${sinUsar})`], ['todas', `Todas (${D.ideas.length})`]].map(([k, t]) => `<button data-banco="${k}" class="${k === ver ? 'on' : ''}">${t}</button>`).join('')}</div>
      <span class="tenue">Mezcla: ${D.listas.objetivosRRSS.map(o => `${o} ${cuenta('objetivo', o)}`).join(' · ')} — Pilares: ${D.listas.pilares.map(o => `${o} ${cuenta('pilar', o)}`).join(' · ')}</span></div>
    ${sinUsar < 5 ? '<p class="nota">💡 Te quedan pocas ideas sin usar: toca pasar el prompt de pilares.</p>' : ''}
    <div class="ideas">${ideas.map(i => `<div class="idea tarjeta ${enBatch(i) ? 'usada' : ''}" data-idea="${i.id}">
      <div class="t-cab"><span class="n">nº ${esc(i.n)}</span><span class="tenue">${esc([i.pilar, i.objetivo, i.formato].filter(Boolean).join(' · '))}</span>${enBatch(i) ? '<span class="pill">✅ en el batch</span>' : '<button class="btn peq" data-albatch>Al batch →</button>'}</div>
      <h4>${esc(i.tema)}</h4>${i.gancho ? `<p class="gancho">«${esc(i.gancho)}»</p>` : ''}${i.porque ? `<p class="tenue">${esc(i.porque)}</p>` : ''}</div>`).join('') || '<p class="vacio">Todas las ideas están ya en el batch.</p>'}</div>`;
  $$('[data-banco]', c).forEach(b => b.onclick = () => { UI.rBanco = b.dataset.banco; guardarUI(); pintar(); });
  $$('[data-idea]', c).forEach(n => {
    const i = D.ideas.find(x => x.id === n.dataset.idea);
    n.onclick = (e) => {
      if (e.target.closest('[data-albatch]')) { editarPieza({ idea: i.n, formato: i.formato || 'Post', donde: 'Instagram', prioridad: '🟠Media', fecha: '' }, { nueva: true }); return; }
      editarIdea(i);
    };
  });
}
