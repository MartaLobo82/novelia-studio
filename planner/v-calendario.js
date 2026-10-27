'use strict';
// =====================================================================
//  Planner — Calendario: el mes con tareas, piezas de redes, eventos y
//  tu franja libre de cada día. Arrastra para cambiar de día.
// =====================================================================

VISTAS.calendario = (cont) => {
  const H = hoy();
  const modo = UI.calModo || 'mes';
  if (!UI.calMes) UI.calMes = mesDe(H);
  const ym = UI.calMes;
  const dia = UI.calDia && (modo === 'año' || mesDe(UI.calDia) === ym || semanasDelMes(ym).flat().includes(UI.calDia)) ? UI.calDia : (mesDe(H) === ym ? H : primeroMes(ym));
  const ocultas = new Set(UI.calOcultas || []);
  const visible = (x) => !ocultas.has(x.cat);
  const tituloNav = modo === 'año' ? ym.slice(0, 4) : nombreMes(ym);

  const nav = `<div class="nav-cal"><button class="icono" id="ca-ant" aria-label="Anterior">‹</button><h2 class="titulo-cal">${tituloNav}</h2><button class="icono" id="ca-sig" aria-label="Siguiente">›</button>
    <button class="btn peq" id="ca-hoy">Hoy</button><div class="segmentado peq"><button data-modo="mes" class="${modo === 'mes' ? 'on' : ''}">Mes</button><button data-modo="año" class="${modo === 'año' ? 'on' : ''}">Año</button></div></div>`;
  const filtros = `<div class="filtros-cal">${[...Object.keys(CATS), 'redes', 'eventos'].map(k => `<button data-oc="${k}" class="${ocultas.has(k) ? 'off' : ''}" style="--c:${catDe(k).color}" title="${esc(catDe(k).n)}">${catDe(k).e}<span> ${esc(catDe(k).n)}</span></button>`).join('')}</div>`;

  if (modo === 'año') {
    const y = ym.slice(0, 4);
    const todo = elementos({ desde: `${y}-01-01`, hasta: `${y}-12-31` }).filter(visible);
    const cuenta = {};
    todo.forEach(x => { cuenta[x.fecha] = (cuenta[x.fecha] || 0) + 1; });
    cont.innerHTML = `<div class="pagina ancha">${cabecera('Calendario', '', '')}${nav}${filtros}
      <div class="anio">${MESES.map((m, i) => { const mm = `${y}-${pad(i + 1)}`; return `<div class="tarjeta mes-mini"><h4 data-ir="${mm}">${may(m)}</h4><div class="mini-mes">${DIAS_C.map(d => `<b>${d}</b>`).join('')}${semanasDelMes(mm).flat().map(f => `<button data-dia="${f}" class="${mesDe(f) !== mm ? 'fuera' : ''} ${f === H ? 'hoy' : ''} ${cuenta[f] ? 'n' + Math.min(4, cuenta[f]) : ''}">${aFecha(f).getDate()}</button>`).join('')}</div></div>`; }).join('')}</div></div>`;
    enlazarNav(cont, modo);
    $$('[data-ir]', cont).forEach(h => h.onclick = () => { UI.calMes = h.dataset.ir; UI.calModo = 'mes'; guardarUI(); pintar(); });
    $$('.mini-mes [data-dia]', cont).forEach(b => b.onclick = () => { UI.calMes = mesDe(b.dataset.dia); UI.calDia = b.dataset.dia; UI.calModo = 'mes'; guardarUI(); pintar(); });
    return;
  }

  const semanas = semanasDelMes(ym);
  const desde = semanas[0][0], hasta = semanas[semanas.length - 1][6];
  const todo = elementos({ desde, hasta }).filter(visible);
  // Eventos de varios días: se repiten en cada día
  const porDia = {};
  todo.forEach(x => {
    const fin = x.tipo === 'evento' && x.ref.hasta && x.ref.hasta > x.fecha ? x.ref.hasta : x.fecha;
    for (let f = x.fecha < desde ? desde : x.fecha; f <= fin && f <= hasta; f = sumarDias(f, 1)) (porDia[f] = porDia[f] || []).push(x);
  });
  Object.values(porDia).forEach(l => l.sort((a, b) => (a.tipo === 'evento' ? 0 : 1) - (b.tipo === 'evento' ? 0 : 1) || ordenFecha(a, b)));
  const delDia = porDia[dia] || [];
  const MAX = 4;

  cont.innerHTML = `<div class="pagina ancha calendario">${cabecera('Calendario', '', `<button class="btn prim" id="ca-nueva">+ Tarea</button>`)}
    ${nav}${filtros}
    <div class="cal-layout">
      <div class="mes" role="grid">
        ${DIAS.map(d => `<div class="cab-dia">${may(d).slice(0, 3)}</div>`).join('')}
        ${semanas.flat().map(f => {
          const xs = porDia[f] || []; const fr = franjaDe(f);
          return `<div class="celda ${mesDe(f) !== ym ? 'fuera' : ''} ${f === H ? 'hoy' : ''} ${f === dia ? 'sel' : ''} ${diaSemana(f) >= 5 ? 'finde' : ''}" data-dia="${f}">
            <div class="num"><span>${aFecha(f).getDate()}</span>${fr && diaSemana(f) < 5 ? `<i title="${esc(fr)}">${iconoFranja(fr)}</i>` : ''}</div>
            ${xs.slice(0, MAX).map(x => `<div class="mini ${x.tipo === 'evento' ? 'ev' : ''} ${esHecho(x.estado) ? 'hecho' : ''} ${atrasada(x) ? 'atrasada' : ''}" style="--c:${catDe(x.cat).color}" ${x.tipo !== 'evento' ? `draggable="true" data-arr="${x.tipo}:${x.id}"` : ''}>${x.tipo === 'evento' ? (x.punto || '•') + ' ' : ''}${esc(x.titulo)}</div>`).join('')}
            ${xs.length > MAX ? `<div class="mas">+${xs.length - MAX} más</div>` : ''}
            ${xs.length ? `<div class="puntos">${xs.slice(0, 6).map(x => `<i style="--c:${catDe(x.cat).color}"></i>`).join('')}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <aside class="dia-panel tarjeta">
        <div class="t-cab"><h2>${fechaLarga(dia)}</h2><button class="btn peq" id="ca-add">+ Añadir</button></div>
        ${infoDia(dia)}
        <div class="lista" id="ca-dia">${delDia.length ? delDia.map(x => filaElemento(x, { fecha: false, plazoVis: false })).join('') : '<p class="vacio">Nada apuntado este día</p>'}</div>
      </aside>
    </div></div>`;

  enlazarNav(cont, modo);
  enlazarItems($('#ca-dia', cont), delDia);
  $$('.celda', cont).forEach(c => {
    c.onclick = (e) => {
      if (UI.calDia === c.dataset.dia && !e.target.closest('.mini') && matchMedia('(min-width: 761px)').matches) { nuevaTarea({ fecha: c.dataset.dia }); return; }
      UI.calDia = c.dataset.dia; guardarUI(); pintar();
      if (!matchMedia('(min-width: 761px)').matches) setTimeout(() => $('.dia-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };
    c.ondragover = (e) => { e.preventDefault(); c.classList.add('soltar'); };
    c.ondragleave = () => c.classList.remove('soltar');
    c.ondrop = (e) => {
      e.preventDefault(); c.classList.remove('soltar');
      const [tipo, id] = (e.dataTransfer.getData('text/plain') || '').split(':');
      const r = buscarRef(tipo, id); if (!r || r.fecha === c.dataset.dia) return;
      const antes = r.fecha; r.fecha = c.dataset.dia; UI.calDia = c.dataset.dia; cambio();
      aviso(`Movida al ${fechaCorta(c.dataset.dia)}`, { t: 'Deshacer', fn: () => { r.fecha = antes; cambio(); } });
    };
  });
  $$('[data-arr]', cont).forEach(m => {
    m.ondragstart = (e) => { e.stopPropagation(); e.dataTransfer.setData('text/plain', m.dataset.arr); e.dataTransfer.effectAllowed = 'move'; };
  });
  $('#ca-nueva', cont).onclick = () => nuevaTarea({ fecha: dia });
  $('#ca-add', cont).onclick = (e) => menuEmergente(e.currentTarget, [
    { t: '✅ Tarea', fn: () => nuevaTarea({ fecha: dia }) },
    { t: '📱 Pieza de redes', fn: () => editarPieza({ fecha: dia, formato: 'Post', donde: 'Instagram', prioridad: '🟠Media' }, { nueva: true }) },
    { t: '📅 Evento', fn: () => editarEvento({ fecha: dia }, { nueva: true }) },
  ]);
};

function infoDia(f) {
  const fr = franjaDe(f), t = turnoDe(f), ex = extraDe(f);
  const notas = (D.dispo.dias[f] || {}).notas;
  const menu = D.menu[f];
  const filas = [];
  if (fr) filas.push(`<div>${iconoFranja(fr)} <b>${esc(fr)}</b>${t ? ` <span class="tenue">· turno ${t.toLowerCase()}</span>` : ''}</div>`);
  if (ex) filas.push(`<div>🧒 ${esc(ex)}</div>`);
  if (notas) filas.push(`<div>📝 ${esc(notas)}</div>`);
  if (menu) filas.push(`<div>🍽️ ${COMIDAS.filter(([k]) => menu[k]).map(([k, t]) => `${t.split(' ')[0]} ${esc(menu[k])}`).join(' · ')}</div>`);
  return filas.length ? `<div class="info-dia">${filas.join('')}</div>` : '';
}
function enlazarNav(cont, modo) {
  const mover = (n) => { UI.calMes = modo === 'año' ? sumarMeses(UI.calMes, 12 * n) : sumarMeses(UI.calMes, n); guardarUI(); pintar(); };
  $('#ca-ant', cont).onclick = () => mover(-1);
  $('#ca-sig', cont).onclick = () => mover(1);
  $('#ca-hoy', cont).onclick = () => { UI.calMes = mesDe(hoy()); UI.calDia = hoy(); guardarUI(); pintar(); };
  $$('[data-modo]', cont).forEach(b => b.onclick = () => { UI.calModo = b.dataset.modo; guardarUI(); pintar(); });
  $$('[data-oc]', cont).forEach(b => b.onclick = () => {
    const s = new Set(UI.calOcultas || []); s.has(b.dataset.oc) ? s.delete(b.dataset.oc) : s.add(b.dataset.oc);
    UI.calOcultas = [...s]; guardarUI(); pintar();
  });
}
