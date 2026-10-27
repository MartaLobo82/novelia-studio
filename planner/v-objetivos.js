'use strict';
// =====================================================================
//  Planner — Objetivos: las metas de cada mes (no las tareas del día).
//  Cada mes muestra sus objetivos y cuántas tareas llevas hechas.
// =====================================================================

function tareasDeObjetivo(cat, ym, lista) {
  const s = quitarTildes(cat);
  const f = /novela/.test(s) ? x => x.cat === 'novela' : /formacion/.test(s) ? x => x.cat === 'formacion' : /^web/.test(s) ? x => x.cat === 'web'
    : /newsletter/.test(s) ? x => x.cat === 'newsletter' && !/Blog/i.test(x.ref.canal || '') : /blog/.test(s) ? x => x.cat === 'newsletter' && /Blog/i.test(x.ref.canal || '')
    : /redes/.test(s) ? x => x.cat === 'redes' : /etsy/.test(s) ? x => x.cat === 'etsy' : /club/.test(s) ? x => x.cat === 'club' : /nino/.test(s) ? x => x.cat === 'ninos'
    : /casa/.test(s) ? x => x.cat === 'casa' : /medic/.test(s) ? x => x.cat === 'medicos' : null;
  if (!f) return null;
  return lista.filter(x => mesDe(x.fecha) === ym && f(x) && !esAnulada(x.estado));
}

VISTAS.objetivos = (cont) => {
  const H = hoy();
  const Y = UI.oAnio || aFecha(H).getFullYear();
  const todo = elementos({ desde: `${Y}-01-01`, hasta: `${Y}-12-31`, conEventos: false });
  const estados = D.listas.estados.objetivos;

  cont.innerHTML = `<div class="pagina ancha objetivos">
    ${cabecera('🎯 Objetivos', 'Las metas de cada mes (lo que quieres conseguir), no las tareas del día a día.',
      `<div class="nav-cal"><button class="icono" id="ob-ant">‹</button><h2 class="titulo-cal">${Y}</h2><button class="icono" id="ob-sig">›</button></div><button class="btn prim" id="ob-nuevo">+ Objetivo</button>`)}
    <div class="meses-obj">${MESES.map((m, i) => {
      const mes = i + 1, ym = `${Y}-${pad(mes)}`;
      const objs = D.objetivos.filter(o => o.anio === Y && o.mes === mes);
      const del = todo.filter(x => mesDe(x.fecha) === ym && !esAnulada(x.estado));
      const esteMes = mesDe(H) === ym;
      if (!objs.length && !del.length && !esteMes && ym < mesDe(H)) return '';
      return `<section class="tarjeta mes-obj ${esteMes ? 'actual' : ''}">
        <div class="t-cab"><h3>${may(m)}${esteMes ? ' <span class="pill">este mes</span>' : ''}</h3><button class="icono" data-add="${mes}" title="Añadir objetivo">＋</button></div>
        <p class="tenue cifras-mes">🎯 ${objs.filter(o => esHecho(o.estado)).length}/${objs.length} conseguidos · ✅ ${del.filter(x => esHecho(x.estado)).length}/${del.length} tareas</p>
        <ul class="objs">${objs.map(o => {
          const ts = tareasDeObjetivo(o.cat, ym, todo);
          return `<li data-obj="${o.id}" class="${esHecho(o.estado) ? 'hecho' : ''} ${esAnulada(o.estado) ? 'anulada' : ''}"><button class="check" data-ocheck>${esHecho(o.estado) ? '✓' : ''}</button>
            <span>${esc(o.texto)}<small>${esc(o.cat || '')}${ts ? ` · ${plural(ts.length, 'tarea', 'tareas')}, ${ts.filter(x => esHecho(x.estado)).length} ✅` : ''}</small></span>
            <select data-oest aria-label="Estado">${estados.map(e => `<option${e === o.estado ? ' selected' : ''}>${esc(e)}</option>`).join('')}</select></li>`;
        }).join('') || '<li class="vacio">Sin objetivos</li>'}</ul>
      </section>`;
    }).join('')}</div></div>`;

  $('#ob-ant', cont).onclick = () => { UI.oAnio = Y - 1; guardarUI(); pintar(); };
  $('#ob-sig', cont).onclick = () => { UI.oAnio = Y + 1; guardarUI(); pintar(); };
  $('#ob-nuevo', cont).onclick = () => editarObjetivo({ mes: Y === aFecha(H).getFullYear() ? aFecha(H).getMonth() + 1 : 1, anio: Y, estado: estados[0] }, { nueva: true });
  $$('[data-add]', cont).forEach(b => b.onclick = () => editarObjetivo({ mes: +b.dataset.add, anio: Y, estado: estados[0] }, { nueva: true }));
  $$('[data-obj]', cont).forEach(li => {
    const o = D.objetivos.find(x => x.id === li.dataset.obj);
    li.onclick = (e) => {
      if (e.target.closest('select')) return;
      if (e.target.closest('[data-ocheck]')) { o.estado = esHecho(o.estado) ? estados[0] : '✅Conseguido'; cambio(); return; }
      editarObjetivo(o);
    };
    $('[data-oest]', li).onchange = (e) => { o.estado = e.target.value; cambio(); };
  });
};
