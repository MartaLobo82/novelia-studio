'use strict';
// =====================================================================
//  Planner — Ajustes: Google, copias, importar del Excel, accesos
//  rápidos, calendarios y las listas de los desplegables (lo que era
//  la pestaña Config).
// =====================================================================

const LISTAS_EDITABLES = [
  ['Estados', [...Object.keys(CATS).map(k => [`estados.${k}`, `${CATS[k].e} ${CATS[k].n}`]), ['estados.eventos', '📅 Eventos'], ['estados.descarga', '🧠 Descarga mental'], ['estados.objetivos', '🎯 Objetivos']]],
  ['Tareas', [['prioridad', 'Prioridad'], ['energia', 'Energía'], ['personas', 'Personas (Médicos)']]],
  ['Descarga y objetivos', [['catDescarga', 'Categorías de la descarga'], ['catObjetivos', 'Categorías de objetivos']]],
  ['Newsletter', [['segmentos', 'Segmentos'], ['tiposNews', 'Tipos'], ['librosNews', 'Libros']]],
  ['Redes', [['formatos', 'Formatos'], ['donde', 'Dónde'], ['pilares', 'Pilares'], ['objetivosRRSS', 'Objetivos']]],
  ['Compra', [['catCompra', 'Tipos de producto'], ['supers', 'Supermercados']]],
];
const leerLista = (ruta) => ruta.split('.').reduce((o, k) => o && o[k], D.listas) || [];
const ponerLista = (ruta, v) => { const p = ruta.split('.'); const ult = p.pop(); p.reduce((o, k) => o[k], D.listas)[ult] = v; };

VISTAS.ajustes = (cont) => {
  const A = D.ajustes;
  cont.innerHTML = `<div class="pagina ajustes">${cabecera('⚙️ Ajustes', '')}
    <div class="rejilla r2">
      <section class="tarjeta"><h2>Tú</h2>
        <label class="campo"><span>Tu nombre (para el saludo)</span><input id="aj-nombre" value="${esc(A.nombre ?? 'Marta')}"></label>
        <label class="campo"><span>Aspecto</span><select id="aj-tema"><option value="auto">Como el sistema</option><option value="claro"${A.tema === 'claro' ? ' selected' : ''}>Claro</option><option value="noche"${A.tema === 'noche' ? ' selected' : ''}>Oscuro</option></select></label>
        <label class="campo"><span>Fechas clave que se ven en Inicio</span><input id="aj-claves" type="number" min="1" max="10" value="${A.diasClave || 4}"></label>
      </section>
      ${typeof tarjetaGoogle === 'function' ? tarjetaGoogle() : ''}
      <section class="tarjeta"><h2>Copias de seguridad</h2>
        <p class="suave" style="margin-top:0">Tus datos viven en este navegador. Guarda una copia de vez en cuando (y conecta Google para tenerlos también en el móvil).</p>
        <div class="fila-btns"><button class="btn prim" id="aj-copia">Descargar copia ahora</button><button class="btn" id="aj-rest">Restaurar una copia…</button></div>
        <label class="campo"><span>Copia automática a Descargas</span><select id="aj-auto">${[[0, 'Nunca'], [1, 'Cada día'], [7, 'Cada semana'], [30, 'Cada mes']].map(([v, t]) => `<option value="${v}"${(A.copiaDias ?? 7) === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        <p class="tenue">${A.ultimaCopia ? 'Última copia: ' + new Date(A.ultimaCopia).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'Aún no has hecho ninguna copia.'}</p>
      </section>
      <section class="tarjeta"><h2>Traer datos del Excel</h2>
        <p class="suave" style="margin-top:0">Carga el archivo <b>planner-importar.json</b> que te preparó Claude a partir de tu Planner Mensual de Excel.</p>
        <button class="btn" id="aj-imp">Importar archivo…</button>
        <p class="tenue">Puedes juntarlo con lo que ya tienes (no duplica nada) o sustituirlo todo.</p>
      </section>
      <section class="tarjeta"><h2>Accesos rápidos</h2>
        <p class="suave" style="margin-top:0">Uno por línea: <code>Texto | dirección</code></p>
        <textarea id="aj-enl" rows="8">${esc(D.enlaces.map(e => `${e.t} | ${e.url}`).join('\n'))}</textarea>
      </section>
      <section class="tarjeta"><h2>Calendarios</h2>
        <p class="suave" style="margin-top:0">El punto de color de cada calendario y cuáles cuentan como <b>fechas clave</b> (las que salen en Inicio con cuenta atrás).</p>
        <div id="aj-cals">${D.calendarios.map((c, i) => `<div class="cal-fila" data-i="${i}"><input data-c="punto" value="${esc(c.punto || '')}" class="punto-in" aria-label="Punto"><input data-c="nombre" value="${esc(c.nombre)}" aria-label="Nombre"><label class="check-peq"><input type="checkbox" data-clave${D.clave.includes(c.nombre) ? ' checked' : ''}> clave</label><button class="icono" data-quitar title="Quitar">✕</button></div>`).join('')}</div>
        <button class="btn peq" id="aj-addcal">+ Calendario</button>
      </section>
    </div>
    <section class="tarjeta" style="margin-top:18px"><h2>Listas de los desplegables</h2>
      <p class="suave" style="margin-top:0">Lo que era la pestaña Config. Una opción por línea; el emoji del principio es parte del nombre. <b>Ojo:</b> en los estados, lo que lleva «Completada», «Enviada», «Publicado», «Lanzado» o «Conseguido» cuenta como hecho, y «Cancelada», «Descartada» o «Eliminada» como anulado.</p>
      ${LISTAS_EDITABLES.map(([g, ls]) => `<h4 class="sep-form">${g}</h4><div class="listas">${ls.map(([ruta, t]) => `<label class="campo"><span>${t}</span><textarea data-lista="${ruta}" rows="${Math.min(9, Math.max(3, leerLista(ruta).length + 1))}">${esc(leerLista(ruta).join('\n'))}</textarea></label>`).join('')}</div>`).join('')}
      <button class="btn peq" id="aj-listas-def">Volver a las listas de serie</button>
    </section>
    <section class="tarjeta peligro-zona"><h2>Empezar de cero</h2><p class="suave" style="margin-top:0">Borra todos los datos de este aparato (antes te descargo una copia).</p><button class="btn peligro" id="aj-borrar">Borrar todo</button></section>
    <p class="tenue pie-app">Planner · versión ${VERSION_APP}</p>
  </div>`;

  $('#aj-nombre', cont).onchange = (e) => { A.nombre = e.target.value.trim(); cambio(false); };
  $('#aj-tema', cont).onchange = (e) => { A.tema = e.target.value; aplicarTema(); cambio(false); };
  $('#aj-claves', cont).onchange = (e) => { A.diasClave = Math.max(1, Math.min(10, +e.target.value || 4)); cambio(false); };
  $('#aj-auto', cont).onchange = (e) => { A.copiaDias = +e.target.value; cambio(false); };
  $('#aj-copia', cont).onclick = () => hacerCopia();
  $('#aj-rest', cont).onclick = () => elegirArchivo(async (j) => {
    if (!j || j.app !== 'planner' || !j.datos) return aviso('Ese archivo no es una copia del Planner');
    if (j.tipo === 'importar-excel') return importarConPregunta(j);
    if (!(await preguntar('¿Restaurar esta copia?', `Es del ${new Date(j.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}. Sustituye todo lo que hay ahora (antes te descargo una copia de lo actual).`, 'Restaurar'))) return;
    await hacerCopia('antes de restaurar');
    D = completar(j.datos); cambio(); aviso('Copia restaurada');
  });
  $('#aj-imp', cont).onclick = () => elegirArchivo((j) => {
    if (!j || j.app !== 'planner' || !j.datos) return aviso('Ese archivo no es del Planner');
    importarConPregunta(j);
  });
  $('#aj-enl', cont).onchange = (e) => {
    D.enlaces = e.target.value.split('\n').map(l => l.split('|')).filter(p => p[0].trim()).map(([t, ...u]) => ({ t: t.trim(), url: u.join('|').trim() }));
    cambio(false);
  };
  $$('.cal-fila', cont).forEach(f => {
    const c = D.calendarios[+f.dataset.i];
    $$('[data-c]', f).forEach(i => i.onchange = () => {
      const antes = c.nombre; c[i.dataset.c] = i.value.trim();
      if (i.dataset.c === 'nombre' && antes !== c.nombre) { D.eventos.forEach(e => { if (e.cal === antes) e.cal = c.nombre; }); D.clave = D.clave.map(n => n === antes ? c.nombre : n); }
      cambio(false);
    });
    $('[data-clave]', f).onchange = (e) => { D.clave = D.clave.filter(n => n !== c.nombre); if (e.target.checked) D.clave.push(c.nombre); cambio(false); };
    $('[data-quitar]', f).onclick = () => { D.calendarios.splice(+f.dataset.i, 1); cambio(); };
  });
  $('#aj-addcal', cont).onclick = async () => { const n = await pedirTexto('Nuevo calendario', '', 'Nombre'); if (n) { D.calendarios.push({ nombre: n.toUpperCase(), punto: '⚪' }); cambio(); } };
  $$('[data-lista]', cont).forEach(t => t.onchange = () => {
    const v = t.value.split('\n').map(s => s.trim()).filter(Boolean);
    if (!v.length) { aviso('Una lista no puede quedarse vacía'); t.value = leerLista(t.dataset.lista).join('\n'); return; }
    ponerLista(t.dataset.lista, v); cambio(false);
  });
  $('#aj-listas-def', cont).onclick = async () => { if (await preguntar('¿Volver a las listas de serie?', 'Se pierden los cambios que hayas hecho en los desplegables. Tus tareas no se tocan.', 'Volver')) { D.listas = listasPorDefecto(); cambio(); } };
  $('#aj-borrar', cont).onclick = async () => {
    if (!(await preguntar('¿Borrar todo?', 'Se borran todas tus tareas, eventos, menús… de este aparato. Antes te descargo una copia.', 'Borrar todo', true))) return;
    await hacerCopia('antes de borrar');
    const aj = D.ajustes; D = datosVacios(); D.ajustes = aj; cambio(); aviso('Todo borrado. Tienes la copia en Descargas.');
  };
  if (typeof enlazarGoogle === 'function') enlazarGoogle(cont);
};

function elegirArchivo(fn) {
  const i = el('input', { type: 'file', accept: '.json,application/json' });
  i.onchange = async () => {
    const f = i.files[0]; if (!f) return;
    try { fn(JSON.parse(await f.text())); } catch (e) { aviso('No he podido leer ese archivo'); }
  };
  i.click();
}
function importarConPregunta(j) {
  const d = j.datos || {};
  const n = (k) => (d[k] || []).length;
  modal(`<h3>Importar del Excel</h3>
    <p class="suave">El archivo trae ${plural(n('tareas'), 'tarea', 'tareas')}, ${plural(n('eventos'), 'evento', 'eventos')}, ${plural(n('batch'), 'pieza', 'piezas')} de redes, ${plural(n('ideas'), 'idea', 'ideas')}, ${plural(n('objetivos'), 'objetivo', 'objetivos')}, ${plural(n('descarga'), 'apunte', 'apuntes')} y ${plural(Object.keys((d.dispo || {}).dias || {}).length, 'día', 'días')} de turnos.</p>
    <div class="opciones-imp">
      <label><input type="radio" name="imp" value="juntar" checked> <b>Juntar</b> con lo que ya tengo <small>Añade lo que falte; lo que ya tienes no se toca. Importar dos veces no duplica.</small></label>
      <label><input type="radio" name="imp" value="sustituir"> <b>Sustituir</b> todo <small>Te descargo antes una copia de lo actual.</small></label></div>
    <div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="im-ok">Importar</button></div>`, {
    alAbrir: (m, cerrar) => {
      $('#im-ok', m).onclick = async () => {
        const modo = $('input[name=imp]:checked', m).value;
        cerrar();
        if (modo === 'sustituir' && (D.tareas.length || D.eventos.length)) await hacerCopia('antes de importar');
        importarDatos(j, modo);
        aviso('Datos del Excel importados');
        irA('inicio');
      };
    }
  });
}
async function hacerCopia(motivo) {
  const d = new Date();
  const nombre = `Planner · Copia ${aStr(d)} ${pad(d.getHours())}h${pad(d.getMinutes())}${motivo ? ' (' + motivo + ')' : ''}.json`;
  await guardarYa();
  descargar(new Blob([JSON.stringify({ app: 'planner', tipo: 'copia', version: 1, fecha: d.toISOString(), datos: D })], { type: 'application/json' }), nombre);
  D.ajustes.ultimaCopia = Date.now(); guardarPronto();
  if (!motivo) aviso('Copia guardada en Descargas');
}
function aplicarTema() {
  const t = D && D.ajustes.tema;
  const noche = t === 'noche' || (t !== 'claro' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = noche ? 'noche' : 'claro';
  const m = $('meta[name=theme-color]'); if (m) m.content = noche ? '#1c1916' : '#9c4f35';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => aplicarTema());
