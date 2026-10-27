'use strict';
// =====================================================================
//  Planner — Descarga mental: apunta sin pensar y ordénalo después.
//  «Pasar a tarea» la crea en su categoría con fecha, de un toque.
// =====================================================================

// De la categoría probable (Descarga) a la categoría de tareas
function catDesdeDescarga(c) {
  const s = quitarTildes(c);
  if (/novela/.test(s)) return 'novela'; if (/web/.test(s)) return 'web'; if (/newsletter|blog/.test(s)) return 'newsletter';
  if (/redes/.test(s)) return 'redes'; if (/etsy/.test(s)) return 'etsy'; if (/club/.test(s)) return 'club'; if (/nino/.test(s)) return 'ninos';
  if (/casa/.test(s)) return 'casa'; if (/medic/.test(s)) return 'medicos'; if (/formacion/.test(s)) return 'formacion';
  return '';
}

VISTAS.descarga = (cont) => {
  const verTodo = !!UI.dTodo;
  const L = D.listas.estados.descarga;
  const procesada = (d) => /Movida|Descartada|Completada/.test(d.estado || '');
  const lista = D.descarga.filter(d => verTodo || !procesada(d));
  const ocultos = D.descarga.length - lista.length;
  const meses = MESES.map(may);

  cont.innerHTML = `<div class="pagina descarga">
    ${cabecera('🧠 Descarga mental', 'Apunta aquí cualquier cosa que se te pase por la cabeza, sin pararte a pensar en categoría ni fecha. Cuando tengas un hueco, la pasas a su sitio.')}
    <form class="captura tarjeta" id="de-form"><input id="de-t" placeholder="Lo que tengas en la cabeza…" autocomplete="off"><button class="btn prim">Apuntar</button></form>
    <div class="barra-filtros"><span class="tenue">${plural(D.descarga.filter(d => !procesada(d)).length, 'apunte por ordenar', 'apuntes por ordenar')}</span><span class="hueco"></span>
      ${ocultos || verTodo ? `<label class="check-peq"><input type="checkbox" id="de-todo"${verTodo ? ' checked' : ''}> ver también los ya ordenados${ocultos ? ` (${ocultos})` : ''}</label>` : ''}</div>
    <div class="lista grande" id="de-lista">${lista.length ? lista.map(d => `
      <div class="apunte tarjeta ${procesada(d) ? 'hecho' : ''}" data-id="${d.id}">
        <div class="ap-cab"><input class="ap-t" data-campo="tarea" value="${esc(d.tarea)}" aria-label="Apunte"><span class="tenue">${d.fecha ? fechaCorta(d.fecha) : ''}</span>
          <button class="icono" data-menu title="Más">⋯</button></div>
        <div class="ap-campos">
          <select data-campo="cat" aria-label="Categoría probable"><option value="">Categoría…</option>${D.listas.catDescarga.map(o => `<option${o === d.cat ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>
          <select data-campo="mes" aria-label="Mes tentativo"><option value="">Mes…</option>${meses.map(o => `<option${o === d.mes ? ' selected' : ''}>${o}</option>`).join('')}</select>
          <select data-campo="estado" aria-label="Estado">${L.map(o => `<option${o === d.estado ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>
          <input data-campo="notas" value="${esc(d.notas || '')}" placeholder="Notas">
          ${procesada(d) ? '' : '<button class="btn peq prim" data-pasar>Pasar a tarea →</button>'}
        </div>
      </div>`).join('') : '<p class="vacio">🧘 Cabeza despejada: no tienes nada por ordenar</p>'}</div>
    <details class="ayuda tarjeta"><summary>Cómo ordenar</summary><ol><li>Cuando tengas un hueco, revisa esta lista y decide la categoría y el mes.</li><li>Pulsa <b>Pasar a tarea</b>: se crea en su categoría con la fecha que elijas y aquí queda como «Movida a su pestaña».</li><li>Si ya no hace falta, ponla como «Descartada».</li></ol></details>
  </div>`;

  $('#de-form', cont).onsubmit = (e) => {
    e.preventDefault(); const t = $('#de-t', cont).value.trim(); if (!t) return;
    D.descarga.unshift({ id: uid(), fecha: hoy(), tarea: t, estado: L[0] }); cambio();
    setTimeout(() => $('#de-t').focus(), 40);
  };
  if ($('#de-todo', cont)) $('#de-todo', cont).onchange = (e) => { UI.dTodo = e.target.checked; guardarUI(); pintar(); };
  $$('.apunte', cont).forEach(n => {
    const d = D.descarga.find(x => x.id === n.dataset.id);
    $$('[data-campo]', n).forEach(i => i.onchange = () => { d[i.dataset.campo] = i.value.trim(); cambio(i.tagName === 'SELECT'); });
    $('[data-menu]', n).onclick = (e) => menuEmergente(e.currentTarget, [
      { t: '⛔ Descartar', fn: () => { d.estado = '⛔Descartada'; cambio(); } },
      { t: '🗑️ Borrar', peligro: true, fn: () => borrarConDeshacer('descarga', d.id, 'Apunte borrado') },
    ]);
    const p = $('[data-pasar]', n);
    if (p) p.onclick = () => pasarATarea(d);
  });
};

function pasarATarea(d) {
  const cat = catDesdeDescarga(d.cat);
  // Fecha propuesta: el día 1 del mes tentativo (si ya ha pasado, hoy)
  let fecha = hoy();
  const m = MESES.indexOf((d.mes || '').toLowerCase());
  if (m >= 0) { const H = aFecha(hoy()); let y = H.getFullYear(); if (m < H.getMonth()) y++; const f = `${y}-${pad(m + 1)}-01`; fecha = f > hoy() ? f : hoy(); }
  const marcar = () => { d.estado = '📂Movida a su pestaña'; cambio(); };
  if (cat === 'redes') {
    // A Redes va como idea del banco
    D.ideas.push({ id: uid(), n: Math.max(0, ...D.ideas.map(x => Number(x.n) || 0)) + 1, tema: d.tarea, porque: d.notas || '' });
    marcar(); aviso('Pasada al banco de ideas de Redes'); return;
  }
  const antes = D.tareas.length;
  editarTarea({ cat: cat || UI.ultimaCat || 'novela', tarea: d.tarea, notas: d.notas || '', fecha, prioridad: '🟠Media' }, { nueva: true });
  // Cuando se guarde la tarea, se marca el apunte
  const vigilar = setInterval(() => {
    if (!document.querySelector('.velo')) { clearInterval(vigilar); if (D.tareas.length > antes) marcar(); }
  }, 300);
}
