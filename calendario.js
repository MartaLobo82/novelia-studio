'use strict';
// =====================================================================
//  Novelia Studio — Calendario y reparto de capítulos.
//  En cada día: qué capítulo toca (escaleta), cuánto escribiste, plazos
//  (entrega, cabos, producción, lanzamiento, redes) y tus eventos.
//  Sirve para todas las novelas a la vez o solo para la abierta.
// =====================================================================

const DIAS_SEM = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const mayus = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
let calMes = null, calDia = null, calTodas = false;
const colorNovela = (pid) => COLORES_PJ[Math.max(0, M.proyectos.findIndex(p => p.id === pid)) % COLORES_PJ.length];
const capsDe = (pid) => hijos(null, pid).filter(n => n.tipo === 'cap');
function capPendiente(n) {
  if (['revisado', 'terminado'].includes(n.estado)) return false;
  const o = Number((n.e || {}).obj) || 0;
  return o ? palabrasCap(n) < o * 0.8 : (n.estado || 'idea') === 'idea';
}
function atrasados(pid = M.actual) {
  const hoy = diaStr();
  return capsDe(pid).filter(n => n.e && n.e.plan && n.e.plan < hoy && capPendiente(n));
}

// ---------- todo lo que pasa en el calendario ----------
function cosasCalendario(pids) {
  const out = {}; // fecha -> [{tipo, txt, pid, id, ...}]
  const add = (f, x) => { if (!f) return; (out[f] = out[f] || []).push(x); };
  pids.forEach(pid => {
    const p = M.proyectos.find(x => x.id === pid); if (!p) return;
    const caps = capsDe(pid);
    caps.forEach((n, i) => { if (n.e && n.e.plan) add(n.e.plan, { tipo: 'cap', pid, id: n.id, num: i + 1, txt: sinNumero(n.titulo) || `Capítulo ${i + 1}`, hecho: !capPendiente(n), obj: Number(n.e.obj) || 0 }); });
    if (p.fechaLimite) add(p.fechaLimite, { tipo: 'entrega', pid, txt: `Entrega: ${p.titulo}` });
    M.cabos.filter(c => c.pid === pid && c.due && !c.done).forEach(c => add(c.due, { tipo: 'cabo', pid, id: c.id, txt: c.text }));
    const P = M.publicar && M.publicar[pid];
    if (P) {
      (P.prod && P.prod.fases || []).filter(f => f.fecha).forEach(f => add(f.fecha, { tipo: 'prod', pid, txt: f.nombre, hecho: f.estado === 'hecho' }));
      if (P.lanz && P.lanz.fecha) {
        add(P.lanz.fecha, { tipo: 'lanz', pid, txt: `Lanzamiento: ${p.titulo}` });
        if (P.lanz.preventa) add(P.lanz.preventa, { tipo: 'lanz', pid, txt: `Preventa: ${p.titulo}` });
        (P.lanz.tareas || []).filter(t => !t.hecho).forEach(t => add(diaStr(sumarDias(deStr(P.lanz.fecha), t.dias)), { tipo: 'tarea', pid, txt: t.texto }));
      }
      (P.redes || []).filter(r => r.fecha && !r.publicado).forEach(r => add(r.fecha, { tipo: 'redes', pid, txt: `${r.formato}: ${r.tema || 'sin tema'}` }));
    }
  });
  (M.eventos || []).filter(e => !e.pid || pids.includes(e.pid)).forEach(e => add(e.fecha, { tipo: 'evento', pid: e.pid, id: e.id, txt: e.titulo, ev: e }));
  return out;
}
const ICO_CAL = { cap: '✎', entrega: '🏁', cabo: '⚑', prod: '📦', lanz: '🚀', tarea: '☐', redes: '📱', evento: '•' };

VISTAS.calendario = (cont) => {
  const hoy = new Date();
  if (!calMes) calMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const pids = calTodas ? M.proyectos.map(p => p.id) : [M.actual];
  const C = cosasCalendario(pids);
  const y = calMes.getFullYear(), mo = calMes.getMonth();
  const primero = new Date(y, mo, 1), off = (primero.getDay() + 6) % 7;
  const dias = new Date(y, mo + 1, 0).getDate();
  const atr = atrasados();
  const p = proyecto();
  const capsPlan = capsDe(M.actual).filter(n => n.e && n.e.plan);
  const celdas = [];
  for (let i = 0; i < off; i++) celdas.push('<div class="cal-d vacia"></div>');
  for (let d = 1; d <= dias; d++) {
    const f = diaStr(new Date(y, mo, d));
    const xs = C[f] || [];
    const w = totalDia(f);
    const libre = !esDiaDeEscritura(new Date(y, mo, d));
    celdas.push(`<div class="cal-d${f === diaStr() ? ' hoy' : ''}${f === calDia ? ' sel' : ''}${libre ? ' libre' : ''}${f < diaStr() ? ' pasado' : ''}" data-f="${f}">
      <div class="cal-n"><span>${d}</span>${w ? `<span class="cal-w num" title="${fmt(w)} palabras escritas">${w >= 1000 ? (w / 1000).toFixed(1).replace('.', ',') + 'k' : w}</span>` : ''}</div>
      ${xs.slice(0, 4).map(x => `<div class="cal-it t-${x.tipo}${x.hecho ? ' hecho' : ''}${x.tipo === 'cap' && !x.hecho && f < diaStr() ? ' tarde' : ''}"${x.tipo === 'cap' ? ` draggable="true" data-cap="${x.id}"` : ''} style="--c:${colorNovela(x.pid)}" title="${esc(x.txt)}">${x.tipo === 'cap' ? `<b>${x.num}</b> ` : ICO_CAL[x.tipo] + ' '}${esc(x.txt)}</div>`).join('')}
      ${xs.length > 4 ? `<div class="cal-mas">+${xs.length - 4}</div>` : ''}</div>`);
  }
  cont.innerHTML = `<div class="pagina" style="max-width:1180px">
    <div class="fila sep" style="flex-wrap:wrap;align-items:flex-end;margin-bottom:14px"><div><h1>Calendario</h1><p class="sub" style="margin:0">${calTodas ? 'Todas tus novelas' : `«${esc(p.titulo)}»`}${p.fechaLimite && !calTodas ? ` · entrega el ${fechaLarga(deStr(p.fechaLimite))}` : ''}</p></div>
      <div class="fila" style="flex-wrap:wrap"><div class="segmentos peq"><button data-todas="0"${!calTodas ? ' class="on"' : ''}>Esta novela</button><button data-todas="1"${calTodas ? ' class="on"' : ''}>Todas</button></div>
        <button class="btn peq" id="cal-rep">Repartir capítulos…</button><button class="btn peq" id="cal-ics">Pasar a Google Calendar</button></div></div>
    ${atr.length ? `<div class="aviso-est cal-atr">⚠ Llevas ${plural(atr.length, 'capítulo')} con el día pasado sin escribir (${atr.slice(0, 6).map(n => numCap(n)).join(', ')}${atr.length > 6 ? '…' : ''}). <button class="btn peq prim" id="cal-reorg">Reorganizar lo que falta</button></div>` : ''}
    <div class="cal-wrap"><div class="tarjeta cal">
      <div class="fila sep" style="margin-bottom:10px"><button class="btn peq" id="cal-ant">‹</button><h3 style="margin:0">${mayus(calMes.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))}</h3><div class="fila" style="gap:6px"><button class="btn peq" id="cal-hoy">Hoy</button><button class="btn peq" id="cal-sig">›</button></div></div>
      <div class="cal-g">${DIAS_SEM.map(d => `<div class="cal-h">${d}</div>`).join('')}${celdas.join('')}</div>
      <div class="cal-ley"><span><b class="cal-it t-cap" style="--c:${colorNovela(M.actual)}">3</b> capítulo que toca</span><span>🏁 entrega</span><span>⚑ cabo suelto</span><span>📦 producción</span><span>🚀 lanzamiento</span><span>📱 redes</span><span class="cal-w">1,9k</span><span>palabras escritas</span></div>
      ${!capsPlan.length && !calTodas ? '<p class="tenue" style="font-size:12.5px;margin:8px 0 0">Ningún capítulo tiene día todavía. Usa «Repartir capítulos…» o pon el día en Plan › Escaleta.</p>' : ''}
    </div><div id="cal-det"></div></div></div>`;
  $$('[data-todas]', cont).forEach(b => b.onclick = () => { calTodas = b.dataset.todas === '1'; VISTAS.calendario(cont); });
  $('#cal-ant', cont).onclick = () => { calMes = new Date(y, mo - 1, 1); VISTAS.calendario(cont); };
  $('#cal-sig', cont).onclick = () => { calMes = new Date(y, mo + 1, 1); VISTAS.calendario(cont); };
  $('#cal-hoy', cont).onclick = () => { calMes = null; calDia = diaStr(); VISTAS.calendario(cont); };
  $('#cal-rep', cont).onclick = () => modalReparto(() => VISTAS.calendario(cont));
  if ($('#cal-reorg', cont)) $('#cal-reorg', cont).onclick = () => modalReparto(() => VISTAS.calendario(cont), true);
  $('#cal-ics', cont).onclick = () => exportarCalendario(pids);
  $$('.cal-d[data-f]', cont).forEach(d => {
    d.onclick = () => { calDia = d.dataset.f; $$('.cal-d.sel', cont).forEach(x => x.classList.remove('sel')); d.classList.add('sel'); detalleDia(cont, C); };
    d.ondragover = (e) => { e.preventDefault(); d.classList.add('soltar'); };
    d.ondragleave = () => d.classList.remove('soltar');
    d.ondrop = (e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/cap'); const n = M.nodos[id]; if (n) { escDe(n).plan = d.dataset.f; guardarMeta(); calDia = d.dataset.f; VISTAS.calendario(cont); aviso(`${sinNumero(n.titulo)}: el ${fechaLarga(deStr(d.dataset.f))}`); } };
  });
  $$('[data-cap][draggable]', cont).forEach(x => x.ondragstart = (e) => { e.dataTransfer.setData('text/cap', x.dataset.cap); });
  if (calDia) detalleDia(cont, C);
};

function detalleDia(cont, C) {
  const f = calDia, xs = C[f] || [], c = $('#cal-det', cont);
  const d = deStr(f), w = totalDia(f);
  const titulo = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const caps = xs.filter(x => x.tipo === 'cap');
  c.innerHTML = `<div class="tarjeta cal-panel"><h3 style="margin-bottom:2px">${mayus(titulo)}</h3>
    <p class="suave" style="margin:0 0 12px;font-size:13px">${w ? `${fmt(w)} palabras escritas` : f < diaStr() ? 'No escribiste' : esDiaDeEscritura(d) ? 'Día de escritura' : 'Día libre'}${caps.length ? ` · objetivo ${fmt(caps.reduce((a, x) => a + x.obj, 0))}` : ''}</p>
    ${xs.length ? xs.map(x => `<div class="cal-li t-${x.tipo}" style="--c:${colorNovela(x.pid)}"><span class="cal-ico">${x.tipo === 'cap' ? x.num : ICO_CAL[x.tipo]}</span><div style="flex:1;min-width:0">
        <div>${esc(x.txt)}${x.hecho ? ' <span class="tenue">✓</span>' : ''}</div>${calTodas && x.pid ? `<div class="tenue" style="font-size:12px">${esc((M.proyectos.find(p => p.id === x.pid) || {}).titulo || '')}</div>` : ''}
        ${x.tipo === 'cap' ? `<div class="fila" style="gap:6px;margin-top:5px;flex-wrap:wrap"><button class="btn peq prim" data-esc="${x.id}">Escribir</button><label class="tenue fila" style="font-size:12px;gap:4px">Mover al <input type="date" class="txt" data-mover="${x.id}" value="${f}" style="width:auto;padding:3px 6px"></label><button class="btn peq" data-quitar="${x.id}">Sin día</button></div>` : ''}
      </div>${x.tipo === 'evento' ? `<button class="icono" data-borrar-ev="${x.id}" title="Borrar">✕</button>` : ''}</div>`).join('') : '<p class="tenue">Nada este día.</p>'}
    <div class="fila" style="margin-top:12px"><input class="txt" id="ev-tit" placeholder="Añadir algo a este día (portada, beta…)"><button class="btn peq" id="ev-ok">Añadir</button></div></div>`;
  $$('[data-esc]', c).forEach(b => b.onclick = () => { if (M.nodos[b.dataset.esc].pid !== M.actual) cambiarProyecto(M.nodos[b.dataset.esc].pid); mostrarVista('escribir'); abrirNodo(b.dataset.esc); });
  $$('[data-mover]', c).forEach(i => i.onchange = () => { if (!i.value) return; escDe(M.nodos[i.dataset.mover]).plan = i.value; guardarMeta(); calDia = i.value; calMes = new Date(deStr(i.value).getFullYear(), deStr(i.value).getMonth(), 1); VISTAS.calendario(cont); });
  $$('[data-quitar]', c).forEach(b => b.onclick = () => { escDe(M.nodos[b.dataset.quitar]).plan = ''; guardarMeta(); VISTAS.calendario(cont); });
  $$('[data-borrar-ev]', c).forEach(b => b.onclick = () => { M.eventos = M.eventos.filter(e => e.id !== b.dataset.borrarEv); guardarMeta(); VISTAS.calendario(cont); });
  const add = () => { const t = $('#ev-tit', c).value.trim(); if (!t) return; M.eventos.push({ id: uid(), pid: calTodas ? null : M.actual, fecha: f, titulo: t }); guardarMeta(); VISTAS.calendario(cont); };
  $('#ev-ok', c).onclick = add; $('#ev-tit', c).onkeydown = (e) => { if (e.key === 'Enter') add(); };
  if (matchMedia('(max-width: 760px)').matches) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- repartir lo que falta ----------
function calcularReparto(pid, desde, hasta, diasSem, colchon) {
  const pend = capsDe(pid).filter(capPendiente);
  const dias = [];
  for (let d = deStr(desde); d <= deStr(hasta); d = sumarDias(d, 1)) if (diasSem.includes(d.getDay())) dias.push(diaStr(d));
  const usables = dias.slice(0, Math.max(1, dias.length - colchon));
  const plan = {};
  if (!pend.length || !usables.length) return { pend, dias: usables, plan, fin: null };
  if (usables.length >= pend.length) pend.forEach((n, i) => { plan[n.id] = usables[i]; });
  else pend.forEach((n, i) => { plan[n.id] = usables[Math.floor(i * usables.length / pend.length)]; }); // todos los días con algo, los capítulos seguidos
  const fechas = Object.values(plan).sort();
  return { pend, dias: usables, plan, fin: fechas[fechas.length - 1] };
}
function modalReparto(alAcabar, desdeAviso) {
  const p = proyecto(), A = M.ajustes;
  let diasSem = (p.diasEscritura || A.diasEscritura || [0, 1, 2, 3, 4, 5, 6]).slice();
  const hasta0 = p.fechaLimite && p.fechaLimite >= diaStr() ? p.fechaLimite : diaStr(sumarDias(new Date(), 30));
  modal(`<h3>Repartir los capítulos que faltan</h3>
    <p class="suave" style="margin-top:-6px;font-size:13px">Pongo día a cada capítulo sin terminar de «${esc(p.titulo)}», en orden, entre estas fechas. Los capítulos terminados no se tocan.</p>
    <div class="rejilla r2" style="gap:0 12px"><label class="campo"><span>Desde</span><input type="date" id="rp-de" value="${diaStr()}"></label><label class="campo"><span>Hasta</span><input type="date" id="rp-a" value="${hasta0}"></label></div>
    <div class="campo"><span>Días que escribes</span><div id="rp-dias">${[1, 2, 3, 4, 5, 6, 0].map(d => `<span class="chip${diasSem.includes(d) ? ' on' : ''}" data-d="${d}">${DIAS_CORTOS[d]}</span>`).join('')}</div></div>
    <label class="campo"><span>Días de colchón al final, sin capítulos</span><input type="number" id="rp-col" min="0" max="30" value="${p.colchon ?? 0}" style="width:90px"></label>
    <label class="check"><input type="checkbox" id="rp-auto"${p.replanAuto ? ' checked' : ''}><span>Hazlo sola cada vez que me retrase<small>Al abrir la app, si hay un capítulo con el día pasado sin escribir, reparto de nuevo lo que falta.</small></span></label>
    <div class="aviso-est ok" id="rp-res"></div>
    <div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="rp-ok">Repartir</button></div>`, {
    alAbrir: (m, cerrar) => {
      const calc = () => calcularReparto(M.actual, $('#rp-de', m).value, $('#rp-a', m).value, diasSem, Math.max(0, +$('#rp-col', m).value || 0));
      const pinta = () => {
        const r = calc();
        $('#rp-res', m).innerHTML = !r.pend.length ? 'No queda ningún capítulo por escribir. 🎉' : !r.dias.length ? 'No hay días de escritura en esas fechas.'
          : `${plural(r.pend.length, 'capítulo')} en ${plural(r.dias.length, 'día')}: ${r.dias.length >= r.pend.length ? 'uno al día' : `unos ${(r.pend.length / r.dias.length).toFixed(1).replace('.', ',')} al día`}. Terminarías el ${fechaLarga(deStr(r.fin))}.`;
      };
      pinta();
      ['#rp-de', '#rp-a', '#rp-col'].forEach(s => $(s, m).oninput = pinta);
      $$('[data-d]', m).forEach(ch => ch.onclick = () => { const d = +ch.dataset.d; diasSem = diasSem.includes(d) ? diasSem.filter(x => x !== d) : [...diasSem, d]; ch.classList.toggle('on'); pinta(); });
      $('#rp-ok', m).onclick = () => {
        const r = calc(); if (!r.pend.length || !r.dias.length) { cerrar(); return; }
        r.pend.forEach(n => { escDe(n).plan = r.plan[n.id]; });
        p.diasEscritura = diasSem; p.colchon = Math.max(0, +$('#rp-col', m).value || 0); p.replanAuto = $('#rp-auto', m).checked;
        guardarMeta(); cerrar(); aviso(`Repartidos ${plural(r.pend.length, 'capítulo')} hasta el ${fechaLarga(deStr(r.fin))}`);
        if (alAcabar) alAcabar();
      };
    }
  });
}
// Al abrir: reparto automático si la novela lo tiene activado
function repartoAutomatico() {
  M.proyectos.forEach(p => {
    if (!p.replanAuto || !atrasados(p.id).length) return;
    const hasta = p.fechaLimite && p.fechaLimite > diaStr() ? p.fechaLimite : null;
    if (!hasta) return;
    const r = calcularReparto(p.id, diaStr(), hasta, p.diasEscritura || M.ajustes.diasEscritura || [0, 1, 2, 3, 4, 5, 6], p.colchon ?? 0);
    if (!r.pend.length || !r.dias.length) return;
    r.pend.forEach(n => { escDe(n).plan = r.plan[n.id]; });
    guardarMeta();
    setTimeout(() => aviso(`He reorganizado «${p.titulo}»: terminas el ${fechaLarga(deStr(r.fin))}`), 1500);
  });
}

// ---------- .ics para Google Calendar ----------
function exportarCalendario(pids) {
  const C = cosasCalendario(pids);
  const f = (d) => d.replace(/-/g, '');
  const limpio = (s) => String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\n/g, ' ');
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Novelia Studio//ES\r\nX-WR-CALNAME:Novelia\r\n', n = 0;
  Object.entries(C).forEach(([fecha, xs]) => {
    if (fecha < diaStr()) return;
    xs.forEach(x => {
      if (x.hecho) return;
      const tit = (M.proyectos.find(p => p.id === x.pid) || {}).titulo;
      const s = x.tipo === 'cap' ? `✎ Escribir cap. ${x.num}: ${x.txt}${x.obj ? ` (${fmt(x.obj)} palabras)` : ''}` : `${ICO_CAL[x.tipo]} ${x.txt}`;
      ics += `BEGIN:VEVENT\r\nUID:novelia-${x.tipo}-${x.id || uid()}-${f(fecha)}\r\nDTSTAMP:${f(diaStr())}T000000Z\r\nDTSTART;VALUE=DATE:${f(fecha)}\r\nDTEND;VALUE=DATE:${f(diaStr(sumarDias(deStr(fecha), 1)))}\r\nSUMMARY:${limpio(s)}\r\n${tit ? `DESCRIPTION:${limpio(tit)}\r\n` : ''}END:VEVENT\r\n`;
      n++;
    });
  });
  ics += 'END:VCALENDAR\r\n';
  if (!n) { aviso('No hay nada de hoy en adelante para pasar'); return; }
  descargar(new Blob([ics], { type: 'text/calendar' }), `Novelia ${calTodas ? 'todas' : nombreArchivo(proyecto().titulo)}.ics`);
  modal(`<h3>Pasar a Google Calendar</h3><p>He descargado un archivo con ${plural(n, 'cosa', 'cosas')} de hoy en adelante.</p>
    <ol class="suave" style="padding-left:18px;font-size:13.5px"><li>Abre <b>calendar.google.com</b> en el ordenador.</li><li>Rueda dentada › <b>Configuración</b> › <b>Importar y exportar</b>.</li><li>Elige el archivo y el calendario donde quieres meterlo › <b>Importar</b>.</li></ol>
    <p class="tenue" style="font-size:12.5px">Si luego cambias fechas aquí, vuelve a importarlo: Google reconoce los mismos días y no los duplica.</p><div class="pie"><button class="btn prim" data-cerrar>Entendido</button></div>`);
}

// ---------- avisos fuera del calendario ----------
function avisoAtraso(pid = M.actual) {
  const a = atrasados(pid); if (!a.length) return '';
  return `<div class="aviso-est cal-atr">⚠ ${plural(a.length, 'capítulo')} con el día pasado sin escribir. <button class="btn peq prim" data-reorg>Reorganizar</button> <a href="#" data-ircal class="tenue" style="font-size:12.5px">Ver calendario</a></div>`;
}
function enlazarAtraso(c, rehacer) {
  $$('[data-reorg]', c).forEach(b => b.onclick = () => modalReparto(rehacer));
  $$('[data-ircal]', c).forEach(a => a.onclick = (e) => { e.preventDefault(); mostrarVista('calendario'); });
}
// En Inicio: lo que toca hoy y el aviso de retraso
(() => {
  const original = VISTAS.inicio;
  VISTAS.inicio = (el) => {
    original(el);
    const pag = $('.pagina', el); if (!pag) return;
    const hoyCaps = capsDe(M.actual).filter(n => n.e && n.e.plan === diaStr());
    const html = avisoAtraso() + (hoyCaps.length ? `<div class="tarjeta" style="margin-bottom:18px;padding:14px 18px"><h2 style="margin-bottom:6px">Hoy toca</h2>${hoyCaps.map(n => `<div class="fila sep" style="flex-wrap:wrap"><span style="font:400 18px var(--serif)">${esc(n.titulo)}</span><span class="fila"><span class="tenue num">${fmt(palabrasCap(n))}${n.e.obj ? ' / ' + fmt(n.e.obj) : ''}</span><button class="btn prim peq" data-esc-hoy="${n.id}">Escribir</button></span></div>`).join('')}</div>` : '');
    if (!html) return;
    const caja = document.createElement('div'); caja.innerHTML = html;
    const ref = pag.children[1] || null; pag.insertBefore(caja, ref);
    enlazarAtraso(caja, () => VISTAS.inicio(el));
    $$('[data-esc-hoy]', caja).forEach(b => b.onclick = () => { mostrarVista('escribir'); abrirNodo(b.dataset.escHoy); });
  };
})();
// Arranque: espera a que la app haya cargado los datos
(function esperar() { if (typeof M !== 'undefined' && M && M.proyectos && document.querySelector('.vista.on')) { try { repartoAutomatico(); } catch (e) { console.error(e); } } else setTimeout(esperar, 300); })();
