'use strict';
// =====================================================================
//  Novelia Studio — vistas: Inicio, Leer, Libreta, Personajes,
//  Léxico, Progreso, Retos y Ajustes.
// =====================================================================

const VISTAS = {};
const COLORES_PJ = ['#2f5d50', '#a5432f', '#6b5b95', '#c9862b', '#3d6f9e', '#8a4f6b', '#55703a', '#7a5c44'];
const inicial = (s) => (s || '?').trim()[0]?.toUpperCase() || '?';

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const nombreArchivo = (s) => (s || 'novela').replace(/[\\/:*?"<>|]+/g, '').trim() || 'novela';

// Párrafos (HTML con <i>/<b>) de un texto guardado
function parrafosDe(html) {
  const d = document.createElement('div'); d.innerHTML = limpiarHTML(html || '');
  const out = [];
  [...d.children].forEach(p => {
    const t = p.textContent.trim();
    if (!t) return;
    if (p.classList.contains('sep') || /^(\*\s*){3}$/.test(t)) out.push('***'); else out.push(p.innerHTML);
  });
  if (!d.children.length && d.textContent.trim()) out.push(esc(d.textContent.trim()));
  return out;
}
function estructuraNovela(pid = M.actual) {
  const caps = [];
  hijos(null, pid).forEach(n => {
    if (n.tipo === 'parte') { caps.push({ parte: true, titulo: n.titulo, id: n.id }); return; }
    let ps = parrafosDe(T[n.id]);
    hijos(n.id, pid).forEach(e => { const pe = parrafosDe(T[e.id]); if (!pe.length) return; if (ps.length) ps.push('***'); ps = ps.concat(pe); });
    caps.push({ titulo: n.titulo, parrafos: ps, id: n.id });
  });
  return caps;
}

// ---------- exportar ----------
function exportarDocx() {
  guardarTexto.ya();
  const p = proyecto();
  const blob = Docx.escribirDocx({ titulo: p.titulo, autora: M.perfil.nombre, capitulos: estructuraNovela() });
  descargar(blob, nombreArchivo(p.titulo) + '.docx');
  aviso('Descargando el Word…');
}
function exportarTxt() {
  guardarTexto.ya();
  const p = proyecto();
  let t = p.titulo.toUpperCase() + '\n' + (M.perfil.nombre || '') + '\n\n';
  estructuraNovela().forEach(c => {
    if (c.parte) { t += '\n\n' + c.titulo.toUpperCase() + '\n\n'; return; }
    t += '\n\n' + c.titulo + '\n\n';
    c.parrafos.forEach(ph => { const d = document.createElement('div'); d.innerHTML = ph; t += (ph === '***' ? '* * *' : d.textContent) + '\n\n'; });
  });
  descargar(new Blob([t], { type: 'text/plain;charset=utf-8' }), nombreArchivo(p.titulo) + '.txt');
}

// ---------- importar ----------
const RE_CAP = /^\s*((cap[ií]tulo|prólogo|prologo|epílogo|epilogo|interludio|parte)\b.{0,70}|(primera|segunda|tercera|cuarta|quinta|sexta|última) parte)$/i;
const RE_PARTE = /^\s*(parte\b|(primera|segunda|tercera|cuarta|quinta|sexta|última) parte$)/i;
async function importarArchivo(file, destino) {
  let parrafos = []; // {texto, html, titulo:boolean}
  let tituloDoc = '';
  if (/\.docx$/i.test(file.name)) {
    const ps = await Docx.leerDocx(file);
    parrafos = ps.filter(p => p.text.trim()).filter(p => {
      if (/^(title|t[ií]tulo|ttulo)$/i.test(p.style)) { tituloDoc = tituloDoc || p.text.trim(); return false; }
      return !/subt[ií]tulo|subttulo|subtitle/i.test(p.style);
    }).map(p => ({ texto: p.text.trim(), html: p.html.trim(), titulo: (/^(heading|t[ií]tulo|ttulo)\s*\d|^parte$/i.test(p.style) && p.text.trim().length < 90) || RE_CAP.test(p.text) }));
  } else {
    const txt = await file.text();
    parrafos = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
      const md = l.match(/^#{1,3}\s+(.*)$/);
      if (md) return { texto: md[1], html: esc(md[1]), titulo: true };
      return { texto: l, html: esc(l).replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/_([^_]+)_/g, '<i>$1</i>'), titulo: RE_CAP.test(l) };
    });
  }
  if (!parrafos.length) { aviso('El archivo está vacío'); return; }
  // Trocear en capítulos
  const caps = []; let actual = null;
  parrafos.forEach(p => {
    if (p.titulo) { actual = { titulo: p.texto, ps: [], parte: RE_PARTE.test(p.texto) }; caps.push(actual); return; }
    if (!actual || actual.parte) { actual = { titulo: actual && actual.parte ? 'Sin título' : 'Capítulo 1', ps: [] }; caps.push(actual); }
    actual.ps.push(p);
  });
  let pid = M.actual;
  if (destino === 'nueva') pid = crearProyecto(tituloDoc || file.name.replace(/\.[^.]+$/, ''), false);
  let orden = hijos(null, pid).length;
  let primero = null; let palabras = 0;
  for (const c of caps) {
    const id = uid();
    if (c.parte && !c.ps.length) { M.nodos[id] = { id, pid, padre: null, tipo: 'parte', titulo: c.titulo, orden: ++orden }; continue; }
    const html = c.ps.map(p => /^(\*\s*){3}$|^#$/.test(p.texto) ? '<p class="sep">* * *</p>' : `<p>${p.html}</p>`).join('');
    const n = Analisis.contar(htmlATexto(html));
    palabras += n;
    M.nodos[id] = { id, pid, padre: null, tipo: 'cap', titulo: c.titulo, orden: ++orden, estado: 'borrador', sinopsis: '', pov: '', notas: '', palabras: n };
    T[id] = html; await Store.set('mesa:t:' + id, html);
    if (!primero) primero = id;
  }
  M.actual = pid; if (primero) M.sel[pid] = primero;
  guardarMeta();
  nodoAbierto = null;
  abrirNodo(M.sel[pid]);
  mostrarVista('escribir');
  aviso(`Importado: ${plural(caps.filter(c => !c.parte || c.ps.length).length, 'capítulo')} y ${plural(palabras, 'palabra')}`);
}
function elegirArchivoImportar() {
  modal(`<h3>Importar texto</h3><p class="suave">Un Word (.docx) o un .txt. Lo divido en capítulos donde ponga «Capítulo…», «Prólogo», «Epílogo» o donde haya un título. Las cursivas se mantienen. No cuenta como escrito hoy.</p>
    <label class="check"><input type="radio" name="dst" value="actual" checked><span>Añadir a «${esc(proyecto().titulo)}»</span></label>
    <label class="check"><input type="radio" name="dst" value="nueva"><span>Crear una novela nueva con el archivo</span></label>
    <input type="file" id="fimp" accept=".docx,.txt,.md" hidden>
    <div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="elegir">Elegir archivo…</button></div>`,
    { alAbrir: (m, cerrar) => {
      $('#elegir', m).onclick = () => $('#fimp', m).click();
      $('#fimp', m).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const d = $('input[name=dst]:checked', m).value; cerrar(); try { await importarArchivo(f, d); } catch (err) { aviso('No he podido leerlo: ' + err.message); } };
    } });
}

// =====================================================================
//  INICIO
// =====================================================================
VISTAS.inicio = (el) => {
  const P = M.perfil, p = proyecto();
  const total = totalProyecto(), pct = p.objetivo ? Math.min(100, Math.round(total / p.objetivo * 100)) : 0;
  const hoy = totalDia(diaStr()), obj = objetivoHoy(), r = racha();
  const faltanDias = p.fechaLimite ? diasEntre(new Date(), deStr(p.fechaLimite)) : null;
  const retos = M.retos.filter(x => deStr(x.fin) >= deStr(diaStr()));
  const ideas = M.ideas.filter(i => !i.hecha).slice(0, 4);
  const enlaces = Object.entries(P.enlaces || {}).filter(([, v]) => v);
  const hora = new Date().getHours();
  const saludo = hora < 6 ? 'Buenas noches' : hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches';
  el.innerHTML = `<div class="pagina">
    <p class="suave" style="margin:0 0 6px">${saludo}${P.nombre ? ', ' + esc(P.nombre.split(' ')[0]) : ''}</p>
    ${!M.importadoTaller ? `<div class="tarjeta aviso-taller" style="margin-bottom:18px;display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:240px"><b>¿Vienes de las 13 extensiones del Taller?</b><div class="suave" style="font-size:13px">Trae tus cabos, ideas, personajes, cronología, estructura, tablero, palabras y ajustes con la copia de seguridad.</div></div><button class="btn prim" id="ir-importar">Traer mis datos</button><button class="icono" id="ocultar-importar" title="No volver a mostrar">✕</button></div>` : ''}
    <div class="tarjeta" style="margin-bottom:18px">
      <div class="perfil">
        <div class="foto">${P.foto ? `<img src="${P.foto}" alt="">` : esc(inicial(P.nombre))}</div>
        <div style="flex:1;min-width:0">
          <h1 style="margin:0">${esc(P.nombre || 'Tu nombre')}</h1>
          <div class="suave">${esc(P.usuario || '')}${P.genero ? ' · ' + esc(P.genero) : ''}</div>
          ${P.bio ? `<p style="font-family:var(--serif);font-size:16px;margin:10px 0 8px;white-space:pre-wrap">${esc(P.bio)}</p>` : ''}
          ${enlaces.length ? `<div class="enlaces">${enlaces.map(([k, v]) => `<a href="${esc(/^https?:/.test(v) ? v : 'https://' + v)}" target="_blank">${esc(k[0].toUpperCase() + k.slice(1))}</a>`).join('')}</div>` : ''}
        </div>
        <button class="btn" id="ed-perfil">Editar perfil</button>
      </div>
    </div>
    <div class="rejilla r2" style="margin-bottom:18px">
      <div class="tarjeta">
        <h2>Proyecto actual</h2>
        <h3>${esc(p.titulo)}</h3>
        <div class="barra-prog"><i style="width:${pct}%"></i></div>
        <div class="fila sep"><span class="num"><b>${fmt(total)}</b> de ${fmt(p.objetivo)} palabras</span><span class="suave num">${pct} %</span></div>
        ${p.fechaLimite ? `<p class="suave" style="margin:8px 0 14px">Fecha de entrega: ${fechaLarga(deStr(p.fechaLimite))} · ${faltanDias >= 0 ? plural(faltanDias, 'día') + (faltanDias === 1 ? ' queda' : ' quedan') : 'ya pasó'}</p>` : '<p></p>'}
        <div class="fila"><button class="btn prim" id="seguir">Seguir escribiendo</button><button class="btn" id="cambiar">Otras novelas</button></div>
      </div>
      <div class="tarjeta">
        <h2>Hoy</h2>
        <div class="grande">${fmt(hoy)}<small> / ${fmt(obj)}</small></div>
        <p class="suave" style="margin:6px 0 12px">${obj && hoy >= obj ? 'Objetivo cumplido. Lo que sigas escribiendo te adelanta trabajo.' : obj ? `Te faltan ${plural(obj - hoy, 'palabra')} para el objetivo de hoy.` : '¡Ya has llegado a tu objetivo de la novela!'}</p>
        <div class="fila"><span style="font-size:22px">🔥</span><span><b>${plural(r, 'día')}</b> de racha · récord ${plural(M.stats.recordRacha || 0, 'día')}</span></div>
      </div>
    </div>
    <div class="rejilla r2">
      <div class="tarjeta">
        <div class="fila sep"><h2 style="margin:0">Retos</h2><button class="btn peq" id="ir-retos">Ver todos</button></div>
        <div style="margin-top:12px">${retos.length ? retos.slice(0, 3).map(tarjetaReto).join('') : '<div class="vacio" style="padding:16px">Sin retos activos. ¿Te apuntas a escribir en noviembre?</div>'}</div>
      </div>
      <div class="tarjeta">
        <div class="fila sep"><h2 style="margin:0">Últimas ideas</h2><button class="btn peq" id="ir-libreta">Libreta</button></div>
        <div style="margin-top:12px">${ideas.length ? ideas.map(i => `<div style="padding:8px 0;border-bottom:1px solid var(--linea)"><span class="suave" style="font-size:11px;text-transform:uppercase;letter-spacing:.08em">${esc(i.cat)}</span><div style="font-family:var(--serif);font-size:16px">${esc(i.texto.length > 140 ? i.texto.slice(0, 140) + '…' : i.texto)}</div></div>`).join('') : '<div class="vacio" style="padding:16px">Nada apuntado todavía</div>'}</div>
      </div>
    </div>
  </div>`;
  const cabos = M.cabos.filter(c => c.pid === M.actual && !c.done);
  const extra = document.createElement('div');
  extra.className = 'rejilla r2'; extra.style.marginTop = '18px';
  extra.innerHTML = `<div class="tarjeta" id="inicio-bloq"></div>
    <div class="tarjeta"><div class="fila sep"><h2 style="margin:0">Cabos sueltos</h2><button class="btn peq" id="ir-cabos">Ver todos</button></div>
      <div style="margin-top:12px">${cabos.length ? cabos.sort(ordenCabos).slice(0, 5).map(c => `<div class="fila" style="padding:6px 0;border-bottom:1px solid var(--linea)"><span class="prio p-${c.prio}"></span><span style="flex:1">${esc(c.text)}</span>${c.due ? `<span class="suave" style="font-size:12px">${fechaCorta(c.due)}</span>` : ''}</div>`).join('') + (cabos.length > 5 ? `<p class="suave" style="font-size:12.5px;margin:8px 0 0">y ${cabos.length - 5} más</p>` : '') : '<div class="vacio" style="padding:16px">Ni un cabo suelto. ¿Seguro? 👀</div>'}</div></div>`;
  $('.pagina', el).appendChild(extra);
  pintarBloqueoInicio();
  $('#ir-cabos', el).onclick = () => { planTab = 'cabos'; mostrarVista('plan'); };
  if ($('#ir-importar', el)) {
    $('#ir-importar', el).onclick = () => elegirCopiaTaller();
    $('#ocultar-importar', el).onclick = () => { M.importadoTaller = 'oculto'; guardarMeta(); mostrarVista('inicio'); };
  }
  $('#seguir', el).onclick = () => mostrarVista('escribir');
  $('#cambiar', el).onclick = () => modalProyectos();
  $('#ir-retos', el).onclick = () => mostrarVista('retos');
  $('#ir-libreta', el).onclick = () => mostrarVista('libreta');
  $('#ed-perfil', el).onclick = () => editarPerfil();
  enlazarRetos(el);
};

function editarPerfil() {
  const P = M.perfil;
  modal(`<h3>Tu perfil</h3>
    <div class="fila" style="margin-bottom:14px"><div class="perfil"><div class="foto" id="pf-foto" style="width:64px;height:64px;font-size:28px">${P.foto ? `<img src="${P.foto}">` : esc(inicial(P.nombre))}</div></div>
      <button class="btn peq" id="pf-subir">Cambiar foto</button>${P.foto ? '<button class="btn peq" id="pf-quitar">Quitar</button>' : ''}<input type="file" id="pf-file" accept="image/*" hidden></div>
    <label class="campo"><span>Nombre (o seudónimo)</span><input id="pf-n" value="${esc(P.nombre)}"></label>
    <div class="rejilla r2" style="gap:10px"><label class="campo"><span>Usuario</span><input id="pf-u" value="${esc(P.usuario)}"></label><label class="campo"><span>Género</span><input id="pf-g" value="${esc(P.genero)}"></label></div>
    <label class="campo"><span>Bio</span><textarea id="pf-b" rows="3" placeholder="Escritora de romance · Mi primera novela, muy pronto">${esc(P.bio)}</textarea></label>
    <div class="rejilla r3" style="gap:10px"><label class="campo"><span>Instagram</span><input id="pf-i" value="${esc(P.enlaces.instagram)}"></label><label class="campo"><span>TikTok</span><input id="pf-t" value="${esc(P.enlaces.tiktok)}"></label><label class="campo"><span>Web</span><input id="pf-w" value="${esc(P.enlaces.web)}"></label></div>
    <div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="pf-ok">Guardar</button></div>`, { ancho: 560, alAbrir: (m, cerrar) => {
    let foto = P.foto;
    $('#pf-subir', m).onclick = () => $('#pf-file', m).click();
    $('#pf-quitar', m) && ($('#pf-quitar', m).onclick = () => { foto = ''; $('#pf-foto', m).textContent = inicial(P.nombre); });
    $('#pf-file', m).onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const img = new Image(); img.onload = () => {
        const c = document.createElement('canvas'); const s = 240; c.width = c.height = s;
        const k = Math.max(s / img.width, s / img.height); const w = img.width * k, h = img.height * k;
        c.getContext('2d').drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
        foto = c.toDataURL('image/jpeg', .85); $('#pf-foto', m).innerHTML = `<img src="${foto}">`;
      }; img.src = URL.createObjectURL(f);
    };
    $('#pf-ok', m).onclick = () => {
      Object.assign(P, { nombre: $('#pf-n', m).value.trim(), usuario: $('#pf-u', m).value.trim(), genero: $('#pf-g', m).value.trim(), bio: $('#pf-b', m).value.trim(), foto, enlaces: { instagram: $('#pf-i', m).value.trim(), tiktok: $('#pf-t', m).value.trim(), web: $('#pf-w', m).value.trim() } });
      guardarMeta(); cerrar(); mostrarVista('inicio');
    };
  } });
}

// =====================================================================
//  RETOS
// =====================================================================
function progresoReto(r) {
  let n = 0; for (let d = deStr(r.inicio); d <= deStr(r.fin); d = sumarDias(d, 1)) n += totalDia(diaStr(d));
  return n;
}
function tarjetaReto(r) {
  const hecho = progresoReto(r); const pct = Math.min(100, Math.round(hecho / r.objetivo * 100));
  const hoy = deStr(diaStr()); const ini = deStr(r.inicio), fin = deStr(r.fin);
  let estado;
  if (hoy < ini) estado = `Empieza en ${plural(diasEntre(hoy, ini), 'día')}`;
  else if (hoy > fin) estado = hecho >= r.objetivo ? 'Conseguido 🎉' : 'Terminado';
  else { const quedan = diasEntre(hoy, fin) + 1; const falta = Math.max(0, r.objetivo - hecho); estado = falta ? `Te tocan ${fmt(Math.ceil(falta / quedan))} al día · ${plural(quedan, 'día')}` : 'Conseguido 🎉'; }
  return `<div class="reto"><div class="fila sep"><span class="etq">${r.oficial ? 'Reto clásico' : 'Tu reto'} · ${esc(estado)}</span><button class="icono" data-borrar-reto="${r.id}" title="Quitar reto">✕</button></div>
    <div style="font-family:var(--serif);font-size:18px;margin:4px 0 2px">${esc(r.nombre)}</div>
    <div class="suave" style="font-size:12.5px">${fmt(r.objetivo)} palabras · ${fechaLarga(ini)} – ${fechaLarga(fin)}</div>
    <div class="barra-prog"><i style="width:${pct}%"></i></div><div class="suave num" style="font-size:12.5px">${fmt(hecho)} de ${fmt(r.objetivo)} · ${pct} %</div></div>`;
}
function enlazarRetos(el) {
  $$('[data-borrar-reto]', el).forEach(b => b.onclick = async () => {
    if (!(await preguntar('¿Quitar el reto?', 'Tus palabras escritas no se tocan.', 'Quitar', true))) return;
    M.retos = M.retos.filter(r => r.id !== b.dataset.borrarReto); guardarMeta(); mostrarVista(vistaActual);
  });
}
VISTAS.retos = (el) => {
  const y = new Date().getFullYear();
  const hoy = new Date();
  const PRESETS = [
    { nombre: 'Escribe tu novela en noviembre', objetivo: 50000, inicio: `${y}-11-01`, fin: `${y}-11-30`, oficial: true },
    { nombre: '30 días, 500 palabras al día', objetivo: 15000, inicio: diaStr(hoy), fin: diaStr(sumarDias(hoy, 29)), oficial: true },
    { nombre: 'Una semana para acabar el capítulo', objetivo: 5000, inicio: diaStr(hoy), fin: diaStr(sumarDias(hoy, 6)), oficial: true },
    { nombre: 'Fin de semana de escritura', objetivo: 4000, inicio: diaStr(sumarDias(hoy, (6 - hoy.getDay() + 7) % 7)), fin: diaStr(sumarDias(hoy, (6 - hoy.getDay() + 7) % 7 + 1)), oficial: true }
  ];
  const activos = M.retos.filter(r => deStr(r.fin) >= deStr(diaStr()));
  const terminados = M.retos.filter(r => deStr(r.fin) < deStr(diaStr()));
  el.innerHTML = `<div class="pagina">
    <h1>Retos de escritura</h1><p class="sub">Un objetivo con fecha. Cuenta todo lo que escribas entre esos días, en cualquier novela.</p>
    <div class="rejilla r2">
      <div>
        <h2>En marcha y próximos</h2>
        ${activos.length ? activos.map(tarjetaReto).join('') : '<div class="tarjeta vacio">Ninguno todavía</div>'}
        ${terminados.length ? `<h2 style="margin-top:26px">Terminados</h2>${terminados.map(tarjetaReto).join('')}` : ''}
      </div>
      <div>
        <h2>Apúntate</h2>
        ${PRESETS.filter(pr => !M.retos.some(r => r.nombre === pr.nombre && r.inicio === pr.inicio)).map((pr, i) => `<div class="reto"><div style="font-family:var(--serif);font-size:18px">${esc(pr.nombre)}</div><div class="suave" style="font-size:12.5px;margin-bottom:10px">${fmt(pr.objetivo)} palabras · ${fechaLarga(deStr(pr.inicio))} – ${fechaLarga(deStr(pr.fin))}</div><button class="btn peq prim" data-preset="${i}">Unirme</button></div>`).join('')}
        <button class="btn" id="nuevo-reto" style="margin-top:6px">+ Crear mi propio reto</button>
      </div>
    </div></div>`;
  $$('[data-preset]', el).forEach(b => b.onclick = () => { const pr = PRESETS.filter(pr => !M.retos.some(r => r.nombre === pr.nombre && r.inicio === pr.inicio))[b.dataset.preset]; M.retos.push({ id: uid(), ...pr }); guardarMeta(); mostrarVista('retos'); aviso('¡Apuntada!'); });
  $('#nuevo-reto', el).onclick = () => modal(`<h3>Nuevo reto</h3>
    <label class="campo"><span>Nombre</span><input id="r-n" placeholder="Terminar el primer borrador"></label>
    <label class="campo"><span>Palabras</span><input id="r-o" type="number" value="10000" min="100" step="100"></label>
    <div class="rejilla r2" style="gap:10px"><label class="campo"><span>Desde</span><input id="r-i" type="date" value="${diaStr()}"></label><label class="campo"><span>Hasta</span><input id="r-f" type="date" value="${diaStr(sumarDias(new Date(), 30))}"></label></div>
    <div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="r-ok">Crear</button></div>`, { alAbrir: (m, cerrar) => {
    $('#r-ok', m).onclick = () => {
      const r = { id: uid(), nombre: $('#r-n', m).value.trim() || 'Mi reto', objetivo: +$('#r-o', m).value || 1000, inicio: $('#r-i', m).value, fin: $('#r-f', m).value };
      if (!r.inicio || !r.fin || r.fin < r.inicio) { aviso('Revisa las fechas'); return; }
      M.retos.push(r); guardarMeta(); cerrar(); mostrarVista('retos');
    };
  } });
  enlazarRetos(el);
};

// =====================================================================
//  PROGRESO
// =====================================================================
VISTAS.progreso = (el) => {
  const p = proyecto(); const hoyS = diaStr();
  const hoy = totalDia(hoyS), obj = objetivoHoy(), r = racha();
  const dHoy = M.stats.dias[hoyS] || { w: 0, m: 0 };
  // semana (lunes a domingo)
  const ahora = new Date(); const lunes = sumarDias(ahora, -((ahora.getDay() + 6) % 7));
  const semana = [...Array(7)].map((_, i) => { const d = sumarDias(lunes, i); return { d, s: diaStr(d), n: totalDia(diaStr(d)) }; });
  const maxS = Math.max(obj || 1, ...semana.map(x => x.n));
  const totalSemana = semana.reduce((a, x) => a + x.n, 0);
  // proyecto
  const total = totalProyecto(); const falta = Math.max(0, p.objetivo - total);
  const dias = p.fechaLimite ? (deStr(p.fechaLimite) < deStr(hoyS) ? 0 : diasDeEscrituraHasta(deStr(p.fechaLimite))) : null;
  const metaSemana = M.ajustes.objetivoSemanal || (obj ? obj * (M.ajustes.diasEscritura || [1]).length : 0);
  const ult14 = [...Array(14)].reduce((a, _, i) => a + totalDia(diaStr(sumarDias(ahora, -i))), 0);
  const diasConEscritura = [...Array(14)].filter((_, i) => totalDia(diaStr(sumarDias(ahora, -i))) > 0).length;
  const ritmo = diasConEscritura >= 3 ? ult14 / 14 : 0;
  const terminaEn = ritmo > 0 ? sumarDias(ahora, Math.ceil(falta / ritmo)) : null;
  // franjas
  const franja = (h) => h >= 6 && h < 14 ? 'mañana' : h >= 14 && h < 21 ? 'tarde' : 'noche';
  const porF = { mañana: { w: 0, min: 0 }, tarde: { w: 0, min: 0 }, noche: { w: 0, min: 0 } };
  M.stats.sesiones.slice(-60).forEach(s => { const f = porF[franja(s.hora ?? new Date(s.inicio).getHours())]; f.w += s.palabras; f.min += s.min; });
  let mejor = Object.entries(porF).filter(([, v]) => v.min >= 10).map(([k, v]) => [k, v.w / v.min * 60]).sort((a, b) => b[1] - a[1])[0];
  let frase;
  if (mejor) frase = `Rindes más por la ${mejor[0]}: ${fmt(mejor[1])} palabras por hora.`;
  else {
    const porH = { mañana: 0, tarde: 0, noche: 0 };
    Object.values(M.stats.dias).forEach(d => Object.entries(d.h || {}).forEach(([h, n]) => porH[franja(+h)] += n));
    const top = Object.entries(porH).sort((a, b) => b[1] - a[1])[0];
    frase = top[1] ? `Escribes más por la ${top[0]}. Haz alguna sesión con temporizador y te diré a qué ritmo.` : 'Cuando escribas unos días te diré a qué hora rindes más.';
  }
  // mapa de calor: 26 semanas
  const finMapa = sumarDias(ahora, 6 - ((ahora.getDay() + 6) % 7));
  const iniMapa = sumarDias(finMapa, -26 * 7 + 1);
  let celdas = '';
  for (let d = iniMapa; d <= finMapa; d = sumarDias(d, 1)) {
    const n = totalDia(diaStr(d)); const k = d > ahora ? '' : n === 0 ? '' : n < 250 ? 'n1' : n < 600 ? 'n2' : n < 1200 ? 'n3' : 'n4';
    celdas += `<i class="${k}" title="${fechaLarga(d)}: ${fmt(n)}" style="${d > ahora ? 'opacity:.35' : ''}"></i>`;
  }
  el.innerHTML = `<div class="pagina">
    <h1>Mil palabras</h1><p class="sub">Tu ritmo, tu racha y cuánto te queda para «${esc(p.titulo)}».</p>
    <div class="rejilla r2" style="margin-bottom:18px">
      <div class="tarjeta">
        <h2>Hoy · desde la mesa</h2>
        <div class="grande">${fmt(hoy)}<small> / ${fmt(obj)}</small></div>
        <div class="barra-prog"><i style="width:${obj ? Math.min(100, hoy / obj * 100) : 100}%"></i></div>
        <p class="suave" style="margin:4px 0 14px">${obj && hoy >= obj ? 'Objetivo cumplido. Lo que sigas escribiendo te rebaja el de mañana.' : obj ? `Te faltan ${plural(obj - hoy, 'palabra')}.` : 'Has llegado al objetivo de la novela.'}${dHoy.m ? ` <span class="tenue">(${fmt(dHoy.m)} apuntadas a mano)</span>` : ''}</p>
        <div class="fila"><span class="suave" style="font-size:13px">¿Has escrito fuera de Novelia?</span><input class="txt" id="pr-man" type="number" min="1" placeholder="Palabras" style="width:110px;padding:5px 8px"><button class="btn peq" id="pr-ap">Apuntar</button></div>
        <button class="btn peq" id="pr-corr" style="margin-top:10px;border:0;padding-left:0;text-decoration:underline;background:none">Me he pasado, corregir</button>
      </div>
      <div class="tarjeta">
        <h2>Racha de escritura</h2>
        <div class="grande">${fmt(r)}<small> ${r === 1 ? 'día' : 'días'}</small></div>
        <div class="racha">${semana.map(x => `<span class="dia${x.n >= Math.max(1, M.ajustes.minRacha) ? ' hecho' : ''}${x.s === hoyS ? ' hoy' : ''}${esDiaDeEscritura(x.d) ? '' : ' libre'}" title="${fechaLarga(x.d)}: ${fmt(x.n)}">${DIAS_CORTOS[x.d.getDay()]}</span>`).join('')}</div>
        <p class="suave" style="margin:6px 0 0">${hoy >= Math.max(1, M.ajustes.minRacha) ? 'Hoy ya has escrito. La racha sigue.' : `Escribe ${plural(Math.max(1, M.ajustes.minRacha) - hoy, 'palabra')} más hoy para no romperla.`} Récord: ${plural(M.stats.recordRacha || 0, 'día')}.</p>
      </div>
    </div>
    <div class="rejilla r2" style="margin-bottom:18px">
      <div class="tarjeta">
        <div class="fila sep"><h2 style="margin:0">Esta semana</h2><span class="suave num">${fmt(totalSemana)}${metaSemana ? ' / ' + fmt(metaSemana) : ''}</span></div>
        <div class="barras">${semana.map(x => `<div class="b${obj && x.n >= obj ? ' meta' : ''}${x.s === hoyS ? ' hoy' : ''}${esDiaDeEscritura(x.d) ? '' : ' libre'}" title="${esDiaDeEscritura(x.d) ? '' : 'Día libre'}"><span class="num">${x.n ? fmt(x.n) : ''}</span><i style="height:${Math.round(x.n / maxS * 100)}%"></i><span>${DIAS_CORTOS[x.d.getDay()]}</span></div>`).join('')}</div>
      </div>
      <div class="tarjeta">
        <h2>La novela</h2>
        <div class="fila sep num"><span><b>${fmt(total)}</b> / ${fmt(p.objetivo)}</span><span class="suave">${p.objetivo ? Math.min(100, Math.round(total / p.objetivo * 100)) : 0} %</span></div>
        <div class="barra-prog"><i style="width:${p.objetivo ? Math.min(100, total / p.objetivo * 100) : 0}%"></i></div>
        <p style="margin:10px 0 4px">${falta ? `Te faltan <b>${fmt(falta)}</b> palabras${dias != null ? (dias > 0 ? ` en ${plural(dias, 'día')} de escritura (hasta el ${fechaLarga(deStr(p.fechaLimite))}): unas <b>${fmt(Math.ceil(falta / dias))}</b> al día.` : '. La fecha de entrega ya ha pasado.') : '.'}` : '¡Has llegado al objetivo! 🎉'}</p>
        <p class="suave" style="margin:0 0 4px;font-size:12.5px">${fmt(palabrasMesa())} escritas en Novelia · ${fmt(p.palabrasFuera || 0)} fuera (Word)</p>
        <p class="suave" style="margin:0">${ritmo > 0 ? `Tu ritmo de las dos últimas semanas: ${fmt(ritmo)} al día.${terminaEn && falta ? ` Así terminarías el ${fechaLarga(terminaEn)}.` : ''}` : 'Cuando lleves unos días te diré cuándo terminas a tu ritmo.'}</p>
        <button class="btn peq" id="pr-obj" style="margin-top:12px">Cambiar objetivo y fecha</button>
      </div>
    </div>
    <div class="rejilla r2">
      <div class="tarjeta"><h2>Cuándo rindes más</h2><p style="font-family:var(--serif);font-size:18px;margin:0">${frase}</p>
        <p class="suave" style="margin:10px 0 0">${M.stats.sesiones.length ? `${plural(M.stats.sesiones.length, 'sesión', 'sesiones')} · ${fmt(M.stats.sesiones.reduce((a, s) => a + s.min, 0))} min en total` : ''}</p></div>
      <div class="tarjeta"><h2>Últimos seis meses</h2><div class="mapa-calor">${celdas}</div></div>
    </div>
  </div>`;
  $('#pr-ap', el).onclick = () => { const n = +$('#pr-man', el).value; if (n > 0) { apuntarFuera(n); mostrarVista('progreso'); aviso(`+${fmt(n)} apuntadas a hoy y a la novela`); } };
  $('#pr-corr', el).onclick = async () => {
    const v = await pedirTexto('Corregir lo de hoy', String(totalDia(hoyS)), '¿Cuántas palabras has escrito hoy de verdad?');
    if (v === '' || v == null || isNaN(+v)) return;
    apuntarFuera(+v - totalDia(hoyS)); mostrarVista('progreso');
  };
  $('#pr-obj', el).onclick = () => editarObjetivo();
};
function editarObjetivo() {
  const p = proyecto(), A = M.ajustes;
  modal(`<h3>Objetivo de «${esc(p.titulo)}»</h3>
    <div class="rejilla r2" style="gap:10px"><label class="campo"><span>Palabras de la novela</span><input id="o-p" type="number" step="1000" value="${p.objetivo}"></label>
    <label class="campo"><span>Fecha de entrega</span><input id="o-f" type="date" value="${p.fechaLimite || ''}"></label></div>
    <label class="campo"><span>Objetivo diario (0 = lo calculo yo con la fecha)</span><input id="o-d" type="number" min="0" step="50" value="${A.objetivoDiario}"></label>
    <label class="campo"><span>Palabras ya escritas fuera de Novelia (en Word): cuentan para el total de la novela</span><input id="o-fu" type="number" min="0" step="100" value="${p.palabrasFuera || 0}"></label>
    <div class="campo"><span>Días que escribes (los demás son libres y no rompen la racha)</span><div id="o-dias">${[1, 2, 3, 4, 5, 6, 0].map(d => `<span class="chip${(A.diasEscritura || []).includes(d) ? ' on' : ''}" data-d="${d}">${DIAS_CORTOS[d]}</span>`).join('')}</div></div>
    <div class="rejilla r2" style="gap:10px"><label class="campo"><span>Mínimo para que cuente la racha</span><input id="o-r" type="number" min="1" step="10" value="${A.minRacha}"></label>
    <label class="campo"><span>Objetivo semanal (0 = automático)</span><input id="o-s" type="number" min="0" step="100" value="${A.objetivoSemanal || 0}"></label></div>
    <div class="pie"><button class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="o-ok">Guardar</button></div>`, { alAbrir: (m, cerrar) => {
    let dias = (A.diasEscritura || [0, 1, 2, 3, 4, 5, 6]).slice();
    $$('[data-d]', m).forEach(c => c.onclick = () => { const d = +c.dataset.d; dias = dias.includes(d) ? dias.filter(x => x !== d) : [...dias, d]; c.classList.toggle('on', dias.includes(d)); });
    $('#o-ok', m).onclick = () => {
      if (!dias.length) { aviso('Elige al menos un día de escritura'); return; }
      p.objetivo = +$('#o-p', m).value || 0; p.fechaLimite = $('#o-f', m).value; A.objetivoDiario = +$('#o-d', m).value || 0; A.minRacha = Math.max(1, +$('#o-r', m).value || 1);
      p.palabrasFuera = Math.max(0, +$('#o-fu', m).value || 0); A.diasEscritura = dias; A.objetivoSemanal = Math.max(0, +$('#o-s', m).value || 0);
      guardarMeta(); cerrar(); mostrarVista(vistaActual); renderArbol();
    };
  } });
}

// =====================================================================
//  LÉXICO
// =====================================================================
let lexCat = 'Temas', lexSub = 'Hospital', lexBusca = '';
VISTAS.lexico = (el) => {
  const L = self.LEXICO;
  const cats = ['Diccionario', 'Temas', 'Emociones', 'Sentidos', 'Acciones', 'Diálogo', 'Conectores', 'Mi banco'];
  const subs = lexCat === 'Temas' ? Object.keys(L.temas) : lexCat === 'Emociones' ? Object.keys(L.emociones) : lexCat === 'Acciones' ? Object.keys(L.acciones) : null;
  if (subs && !subs.includes(lexSub)) lexSub = subs[0];
  const chips = (arr) => arr.map(w => `<span class="chip" data-w="${esc(w)}">${esc(w)}</span>`).join('');
  let cuerpo = '';
  if (lexCat === 'Diccionario') cuerpo = `<div id="lex-sin" class="sinonimos"><p class="tenue">Escribe una palabra arriba para ver sus sinónimos.</p></div>`;
  else if (lexCat === 'Temas') { const t = L.temas[lexSub]; cuerpo = `<h3>${esc(lexSub)}</h3><p class="tenue" style="margin-top:0">${t.hay.length + t.es.length + t.pasa.length} palabras y expresiones</p><div class="lex-grupo"><h2>Qué hay</h2>${chips(t.hay)}</div><div class="lex-grupo"><h2>Cómo es</h2>${chips(t.es)}</div><div class="lex-grupo"><h2>Qué pasa</h2>${chips(t.pasa)}</div>`; }
  else if (lexCat === 'Emociones') { const t = L.emociones[lexSub]; cuerpo = `<h3>${esc(lexSub)}</h3><p class="tenue" style="margin-top:0">Muéstralo en vez de nombrarlo</p><div class="lex-grupo"><h2>En el cuerpo</h2>${chips(t.cuerpo)}</div><div class="lex-grupo"><h2>Gestos</h2>${chips(t.gestos)}</div><div class="lex-grupo"><h2>Por dentro</h2>${chips(t.dentro)}</div>`; }
  else if (lexCat === 'Sentidos') cuerpo = Object.entries(L.sentidos).map(([k, v]) => `<div class="lex-grupo"><h2>${k}</h2>${chips(v)}</div>`).join('');
  else if (lexCat === 'Acciones') cuerpo = `<h3>En vez de «${esc(lexSub.toLowerCase())}»</h3><div class="lex-grupo">${chips(L.acciones[lexSub])}</div>`;
  else if (lexCat === 'Diálogo') cuerpo = `<p class="tenue" style="margin-top:0">Verbos para acompañar a la raya, por tono. Úsalos con moderación: «dijo» casi no se ve.</p>` + Object.entries(L.dialogo).map(([k, v]) => `<div class="lex-grupo"><h2>${k}</h2>${chips(v)}</div>`).join('');
  else if (lexCat === 'Conectores') cuerpo = Object.entries(L.conectores).map(([k, v]) => `<div class="lex-grupo"><h2>${k}</h2>${chips(v)}</div>`).join('');
  else if (lexCat === 'Mi banco') cuerpo = M.banco.length ? `<p class="tenue" style="margin-top:0">Lo que has copiado o guardado desde otras webs.</p><div class="lex-grupo">${chips(M.banco)}</div><button class="btn peq" id="lex-vaciar">Vaciar banco</button>` : '<div class="vacio">Cada palabra que copies aquí se guarda en tu banco</div>';
  el.innerHTML = `<div class="pagina">
    <h1>Léxico</h1><p class="sub">Clic = copiar (y se guarda en Mi banco) · doble clic = sus sinónimos.</p>
    <input class="buscador" id="lex-q" placeholder="Busca en el léxico: humo, miedo, mar…" value="${esc(lexBusca)}">
    <div id="lex-res"></div>
    <div class="lex-cats">${cats.map(c => `<span class="chip${c === lexCat ? ' on' : ''}" data-cat="${c}">${c}</span>`).join('')}</div>
    ${subs ? `<div style="margin-bottom:18px">${subs.map(s => `<span class="chip${s === lexSub ? ' on' : ''}" data-sub="${esc(s)}" style="font-size:12.5px">${esc(s)}</span>`).join('')}</div>` : ''}
    <div class="tarjeta">${cuerpo}</div></div>`;
  $$('[data-cat]', el).forEach(c => c.onclick = () => { lexCat = c.dataset.cat; VISTAS.lexico(el); });
  $$('[data-sub]', el).forEach(c => c.onclick = () => { lexSub = c.dataset.sub; VISTAS.lexico(el); });
  $('#lex-vaciar', el) && ($('#lex-vaciar', el).onclick = () => { M.banco = []; guardarMeta(); VISTAS.lexico(el); });
  enlazarChips(el);
  const q = $('#lex-q', el);
  q.oninput = debounce(() => { lexBusca = q.value.trim(); buscarLexico(el); }, 250);
  if (lexBusca) buscarLexico(el);
};
function enlazarChips(raiz) {
  $$('[data-w]', raiz).forEach(c => {
    let t = null;
    c.onclick = () => { clearTimeout(t); t = setTimeout(() => copiar(c.dataset.w), 220); };
    c.ondblclick = () => { clearTimeout(t); lexBusca = c.dataset.w; lexCat = 'Diccionario'; VISTAS.lexico($('#v-lexico')); };
  });
}
async function buscarLexico(el) {
  const caja = $('#lex-res', el); const w = lexBusca.toLowerCase();
  if (!w) { caja.innerHTML = ''; if (lexCat === 'Diccionario') $('#lex-sin', el).innerHTML = '<p class="tenue">Escribe una palabra arriba para ver sus sinónimos.</p>'; return; }
  await cargarTesauro();
  const grupos = sinonimosDe(w);
  // en el léxico propio
  const L = self.LEXICO; const hits = [];
  Object.entries(L.temas).forEach(([k, t]) => { if (k.toLowerCase().includes(w) || [...t.hay, ...t.es, ...t.pasa].some(x => x.toLowerCase().includes(w))) hits.push(['Temas', k]); });
  Object.entries(L.emociones).forEach(([k, t]) => { if (k.toLowerCase().includes(w) || [...t.cuerpo, ...t.gestos, ...t.dentro].some(x => x.toLowerCase().includes(w))) hits.push(['Emociones', k]); });
  Object.entries(L.acciones).forEach(([k, t]) => { if (k.toLowerCase().includes(w) || t.some(x => x.toLowerCase().includes(w))) hits.push(['Acciones', k]); });
  caja.innerHTML = `<div class="tarjeta" style="margin-bottom:18px">
    ${grupos.length ? `<h2>Sinónimos de «${esc(lexBusca)}»</h2><div class="sinonimos">${grupos.map(g => `<div class="grupo">${g.map(s => `<span class="chip" data-w="${esc(s)}">${esc(s)}</span>`).join('')}</div>`).join('')}</div>` : `<p class="tenue" style="margin:0 0 8px">Sin sinónimos para «${esc(lexBusca)}».</p>`}
    ${hits.length ? `<h2 style="margin-top:14px">También en el léxico</h2>${hits.slice(0, 12).map(([c, k]) => `<span class="chip" data-ir-cat="${c}" data-ir-sub="${esc(k)}">${c} › ${esc(k)}</span>`).join('')}` : ''}</div>`;
  enlazarChips(caja);
  $$('[data-ir-cat]', caja).forEach(c => c.onclick = () => { lexCat = c.dataset.irCat; lexSub = c.dataset.irSub; lexBusca = ''; VISTAS.lexico(el); });
}

