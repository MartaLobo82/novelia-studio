'use strict';
// =====================================================================
//  Novelia Studio — PUBLICAR (por novela): Ficha, Amazon KDP,
//  Producción y lectoras beta, Lanzamiento, Redes, Citas y Web.
//  Y «Tu Mesa»: color e icono.
// =====================================================================

const copiarTexto = (t, msg = 'Copiado') => navigator.clipboard.writeText(t).then(() => aviso(msg)).catch(() => aviso('No he podido copiar'));
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ---------- imágenes guardadas aparte (portada, A+) ----------
async function guardarImagen(file, maxLado = 2000) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((r, e) => { img.onload = r; img.onerror = e; img.src = url; });
  const k = Math.min(1, maxLado / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  const id = uid();
  await Store.set('mesa:img:' + id, { data: c.toDataURL('image/jpeg', 0.9), w: img.width, h: img.height });
  return id;
}
const leerImagen = async (id) => id ? (await Store.get('mesa:img:' + id)) || null : null;
// Elegir imagen: de tu ordenador o de tus tableros
function elegirImagen() {
  return new Promise(async (res) => {
    const all = HAY_CHROME ? await chrome.storage.local.get(null) : {};
    const imgs = Object.keys(all).filter(k => k.startsWith('item:') && all[k].type === 'img').map(k => all[k]).slice(0, 60);
    modal(`<h3>Elegir imagen</h3><button class="btn prim" id="ei-subir">Subir desde el ordenador…</button><input type="file" id="ei-f" accept="image/*" hidden>
      ${imgs.length ? `<h2 style="margin-top:18px">De tus tableros</h2><div class="ei-grid">${imgs.map(i => `<img src="${i.src}" data-it="${i.id}" alt="">`).join('')}</div>` : ''}
      <div class="pie"><button class="btn" data-cerrar>Cancelar</button></div>`, { ancho: 620, alAbrir: (m, cerrar) => {
      $('#ei-subir', m).onclick = () => $('#ei-f', m).click();
      $('#ei-f', m).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const id = await guardarImagen(f); cerrar(); res(id); };
      $$('[data-it]', m).forEach(im => im.onclick = async () => {
        const it = all['item:' + im.dataset.it]; const id = uid();
        await Store.set('mesa:img:' + id, { data: it.src, w: it.w, h: it.h }); cerrar(); res(id);
      });
    } });
  });
}

// ---------- datos de Publicar ----------
const FASES_PROD = ['Primer borrador', 'Reescritura', 'Lectoras beta', 'Corrección', 'Revisión final', 'Portada', 'Maquetación ebook (Kindle Create)', 'Maquetación papel', 'Subido a KDP'];
const TAREAS_LANZ = [
  [-90, 'Portada encargada o terminada', 'Producción'], [-75, 'Corrección profesional terminada', 'Producción'],
  [-60, 'Fecha de lanzamiento y de preventa decididas', 'Amazon'], [-60, 'Ficha completa: sinopsis, palabras clave y categorías', 'Amazon'],
  [-45, 'Maquetar ebook (Kindle Create) y papel', 'Producción'], [-45, 'Subir la preventa a KDP', 'Amazon'],
  [-40, 'Revelación de portada (redes + newsletter)', 'Redes'], [-35, 'Página del libro en la web', 'Web'],
  [-30, 'Buscar lectoras ARC y bookstagrammers', 'Lectoras'], [-30, 'Preparar el contenido A+', 'Amazon'],
  [-21, 'Enviar los ejemplares anticipados (ARC)', 'Lectoras'], [-21, 'Primer capítulo en la newsletter', 'Newsletter'],
  [-14, 'Batch de reels y carruseles del lanzamiento', 'Redes'], [-14, 'Programar la newsletter de lanzamiento en MailerLite', 'Newsletter'],
  [-7, 'Cuenta atrás en stories', 'Redes'], [-5, 'Subir el archivo final del ebook (antes del cierre de la preventa: mira el aviso de KDP)', 'Amazon'],
  [-3, 'Revisar la ficha de Amazon: precio, categorías y A+', 'Amazon'],
  [0, 'Día D: reel, post, stories y newsletter', 'Redes'], [0, 'Enlaces de compra en la web y en la bio', 'Web'],
  [1, 'Compartir las primeras reseñas', 'Redes'], [3, 'Recordar a las lectoras ARC que dejen reseña', 'Lectoras'],
  [7, 'Mirar ventas y ranking', 'Amazon'], [14, 'Carrusel «Lo que dicen las lectoras»', 'Redes'], [30, 'Balance del lanzamiento', 'Amazon']
];
const CATS_LANZ = ['Producción', 'Amazon', 'Redes', 'Newsletter', 'Web', 'Lectoras'];
const HASHTAGS_DEF = '#novelaromantica #romanticacontemporanea #bookstagram #librosrecomendados #literaturaromantica';
function pub(pid = M.actual) {
  M.publicar = M.publicar || {};
  if (!M.publicar[pid]) {
    const p = M.proyectos.find(x => x.id === pid);
    M.publicar[pid] = {
      ficha: { titulo: p ? p.titulo : '', subtitulo: '', serie: '', numero: '', genero: M.perfil.genero || 'Romance', subgenero: '', tropos: [], avisos: '', comparables: '', pitch: '', sinopsisCorta: '', sinopsisLarga: '', portada: null },
      kdp: { keywords: ['', '', '', '', '', '', ''], categorias: ['', '', ''], formatos: { ebook: {}, blanda: {}, dura: {} }, enlaces: { amazon: '', papel: '', otros: '' }, aplus: [] },
      prod: { fases: FASES_PROD.map(n => ({ id: uid(), nombre: n, estado: 'pendiente', fecha: '', archivo: '', quien: '' })), betas: [] },
      lanz: { fecha: '', preventa: '', tareas: [] },
      redes: [], citas: []
    };
  }
  const P = M.publicar[pid];
  P.citas = P.citas || []; P.redes = P.redes || [];
  return P;
}

// =====================================================================
//  VISTA PUBLICAR
// =====================================================================
let pubTab = 'ficha';
VISTAS.publicar = (cont) => {
  const P = pub(); const p = proyecto();
  const L = P.lanz;
  const faltan = L.fecha ? diasEntre(new Date(), deStr(L.fecha)) : null;
  const pendientes = L.tareas.filter(t => !t.hecho).length;
  const tabs = [['ficha', 'Ficha'], ['kdp', 'Amazon KDP'], ['prod', 'Producción'], ['lanz', 'Lanzamiento'], ['redes', 'Redes'], ['citas', 'Citas'], ['web', 'Web']];
  cont.innerHTML = `<div class="pagina" style="max-width:1180px">
    <div class="fila sep" style="flex-wrap:wrap;align-items:flex-end;margin-bottom:8px"><div><h1>Publicar «${esc(P.ficha.titulo || p.titulo)}»</h1>
      <p class="sub" style="margin-bottom:0">${L.fecha ? (faltan > 0 ? `Sale el ${fechaLarga(deStr(L.fecha))}: <b>faltan ${plural(faltan, 'día')}</b>` : faltan === 0 ? '<b>¡Hoy es el día!</b>' : `Salió el ${fechaLarga(deStr(L.fecha))}`) + (L.tareas.length ? ` · ${plural(pendientes, 'tarea pendiente', 'tareas pendientes')}` : '') : 'Todo lo de publicar y lanzar esta novela, junto.'}</p></div></div>
    <div class="segmentos" style="margin:18px 0 22px;flex-wrap:wrap">${tabs.map(([k, t]) => `<button data-pb="${k}"${pubTab === k ? ' class="on"' : ''}>${t}</button>`).join('')}</div>
    <div id="pub-cuerpo"></div></div>`;
  $$('[data-pb]', cont).forEach(b => b.onclick = () => { pubTab = b.dataset.pb; VISTAS.publicar(cont); });
  const c = $('#pub-cuerpo', cont);
  ({ ficha: pubFicha, kdp: pubKdp, prod: pubProd, lanz: pubLanz, redes: pubRedes, citas: pubCitas, web: pubWeb })[pubTab](c, P, cont);
};
const guardarPub = debounce(() => guardarMeta(), 400);
// Enlaza inputs con data-ruta="ficha.titulo" al objeto P
function enlazarRutas(raiz, P, alCambiar) {
  $$('[data-ruta]', raiz).forEach(i => {
    const ruta = i.dataset.ruta.split('.');
    const set = () => {
      let o = P; for (let k = 0; k < ruta.length - 1; k++) o = o[ruta[k]] = o[ruta[k]] || {};
      o[ruta[ruta.length - 1]] = i.type === 'checkbox' ? i.checked : i.value;
      guardarPub(); alCambiar && alCambiar(i);
    };
    i.addEventListener('input', set); i.addEventListener('change', set);
  });
}
const val = (P, ruta) => { let o = P; for (const k of ruta.split('.')) { if (o == null) return ''; o = o[k]; } return o == null ? '' : o; };
const contador = (n, max) => `<span class="cont${n > max ? ' pasado' : ''}">${fmt(n)} / ${fmt(max)}</span>`;

// ---------- Ficha ----------
async function pubFicha(c, P) {
  const F = P.ficha;
  const cmp = (ruta, et, ph = '', extra = '') => `<label class="campo"><span>${et}</span><input data-ruta="${ruta}" value="${esc(val(P, ruta))}" placeholder="${esc(ph)}" ${extra}></label>`;
  const area = (ruta, et, ph, filas, max) => `<label class="campo"><span class="fila sep">${et}${max ? contador(String(val(P, ruta)).length, max) : ''}</span><textarea data-ruta="${ruta}" rows="${filas}" placeholder="${esc(ph)}" data-max="${max || ''}">${esc(val(P, ruta))}</textarea></label>`;
  const portada = await leerImagen(F.portada);
  c.innerHTML = `<div class="rejilla" style="grid-template-columns:240px minmax(0,1fr);gap:22px;align-items:start">
    <div><div class="portada${portada ? '' : ' vacia'}" id="fi-portada">${portada ? `<img src="${portada.data}" alt="Portada">` : '<span>Sube la portada</span>'}</div>
      <div class="fila" style="margin-top:8px;justify-content:center"><button class="btn peq" id="fi-subir">${portada ? 'Cambiar' : 'Subir portada'}</button>${portada ? '<button class="btn peq" id="fi-quitar">Quitar</button>' : ''}</div>
      ${portada ? `<p class="tenue" style="font-size:12px;text-align:center">${portada.w} × ${portada.h} px${portada.h / portada.w < 1.5 || portada.h / portada.w > 1.7 ? '<br>KDP recomienda proporción 1,6 (p. ej. 1600 × 2560)' : ''}</p>` : '<p class="tenue" style="font-size:12px;text-align:center">KDP recomienda 1600 × 2560 px para el ebook.</p>'}
    </div>
    <div class="tarjeta">
      <div class="rejilla r2" style="gap:2px 16px">${cmp('ficha.titulo', 'Título')}${cmp('ficha.subtitulo', 'Subtítulo', 'Opcional')}${cmp('ficha.serie', 'Serie', 'Amor en Nueva York')}${cmp('ficha.numero', 'Número en la serie', '3')}${cmp('ficha.genero', 'Género', 'Romance')}${cmp('ficha.subgenero', 'Subgénero', 'Comedia romántica contemporánea')}</div>
      <div class="campo"><span>Tropos (Enter para añadir)</span><div id="fi-tropos" class="fila" style="flex-wrap:wrap;gap:0">${(F.tropos || []).map((t, i) => `<span class="chip on" data-qt="${i}" title="Quitar">${esc(t)} ×</span>`).join('')}<input class="txt" id="fi-tropo" placeholder="enemies to lovers, slow burn, fake dating…" style="flex:1;min-width:200px"></div>
        <div style="margin-top:6px">${['enemies to lovers', 'friends to lovers', 'second chance', 'fake dating', 'forced proximity', 'slow burn', 'grumpy x sunshine', 'only one bed', 'small town', 'office romance', 'brother\'s best friend', 'he falls first', 'romance navideño'].filter(t => !(F.tropos || []).includes(t)).map(t => `<span class="chip" data-at="${esc(t)}" style="font-size:12px">+ ${esc(t)}</span>`).join('')}</div></div>
      ${cmp('ficha.comparables', 'Para fans de… (libros o autoras parecidas)', 'Emily Henry, Ali Hazelwood…')}
      ${cmp('ficha.avisos', 'Avisos de contenido', 'Escenas explícitas, duelo…')}
      ${area('ficha.pitch', 'Frase gancho (una línea)', 'Ella odia la Navidad. Él se gana la vida vendiéndola.', 2, 150)}
      ${area('ficha.sinopsisCorta', 'Sinopsis corta (redes, newsletter)', 'Tres o cuatro frases.', 4, 500)}
      <label class="campo"><span class="fila sep">Sinopsis larga (la de Amazon: dale formato en la pestaña Amazon KDP)${contador(String(F.sinopsisLarga || '').length, 4000)}</span><textarea data-ruta="ficha.sinopsisLarga" rows="10" data-max="4000">${esc(F.sinopsisLarga || '')}</textarea></label>
      <p class="tenue" style="font-size:12.5px;margin:0">Te llevará ${plural(Math.round(totalProyecto() / 250), 'página')} aproximadamente (${fmt(totalProyecto())} palabras).</p>
    </div></div>`;
  enlazarRutas(c, P, (i) => { if (i.dataset.max) { const s = i.closest('.campo').querySelector('.cont'); if (s) s.outerHTML = contador(i.value.length, +i.dataset.max); } });
  $('#fi-subir', c).onclick = async () => { const id = await elegirImagen(); if (!id) return; F.portada = id; guardarMeta(); pubFicha(c, P); };
  if ($('#fi-quitar', c)) $('#fi-quitar', c).onclick = () => { Store.remove('mesa:img:' + F.portada); F.portada = null; guardarMeta(); pubFicha(c, P); };
  $('#fi-tropo', c).onkeydown = (e) => { if (e.key === 'Enter' && e.target.value.trim()) { F.tropos = [...new Set([...(F.tropos || []), e.target.value.trim()])]; guardarMeta(); pubFicha(c, P).then(() => $('#fi-tropo', c).focus()); } };
  $$('[data-at]', c).forEach(x => x.onclick = () => { F.tropos = [...(F.tropos || []), x.dataset.at]; guardarMeta(); pubFicha(c, P); });
  $$('[data-qt]', c).forEach(x => x.onclick = () => { F.tropos.splice(+x.dataset.qt, 1); guardarMeta(); pubFicha(c, P); });
}

// ---------- Amazon KDP ----------
const PROHIBIDAS = ['gratis', 'free', 'novedad', 'oferta', 'rebaja', 'descuento', 'mejor', 'best seller', 'bestseller', 'más vendido', 'kindle unlimited', 'kdp select', 'kindle', 'libro', 'libros', 'ebook', 'disponible'];
const MODULOS_APLUS = {
  cabecera: { n: 'Imagen de cabecera con texto', med: '970 × 600 px', imgs: 1 },
  superpuesto: { n: 'Imagen con texto superpuesto', med: '1940 × 600 px (mínimo 970 × 300). No pongas texto en la imagen: va en el recuadro', imgs: 1 },
  izquierda: { n: 'Imagen a la izquierda y texto', med: '600 × 600 px (300 ppp)', imgs: 1 },
  derecha: { n: 'Imagen a la derecha y texto', med: '600 × 600 px (300 ppp)', imgs: 1 },
  tres: { n: 'Tres imágenes con texto', med: '600 × 600 px cada una (mínimo 300 × 300)', imgs: 3 },
  comparativa: { n: 'Comparativa (tus otros libros o la serie)', med: 'Portadas, mínimo 150 × 300 px. Hasta 5 libros', imgs: 0 },
  texto: { n: 'Solo texto (descripción)', med: 'Hasta 6000 caracteres', imgs: 0 },
  logo: { n: 'Logo / firma de autora', med: '600 × 180 px', imgs: 1 }
};
function pubKdp(c, P) {
  const K = P.kdp, F = P.ficha;
  const enMetadatos = [F.titulo, F.subtitulo, F.serie, M.perfil.nombre, ...(K.categorias || [])].join(' ').toLowerCase();
  const avisosKw = (kw) => {
    const t = kw.trim().toLowerCase(); if (!t) return [];
    const a = [];
    if (t.length > 50) a.push('más de 50 caracteres');
    PROHIBIDAS.forEach(p => { if (new RegExp(`(^|\\s)${p}(\\s|$)`, 'i').test(t)) a.push(`«${p}» no está permitido o no ayuda`); });
    if (/["“”«»<>]/.test(t)) a.push('sin comillas ni etiquetas');
    t.split(/\s+/).filter(w => w.length > 3 && enMetadatos.includes(w)).slice(0, 2).forEach(w => a.push(`«${w}» ya está en el título, autora o categorías`));
    const repes = (K.keywords || []).filter(x => x.trim().toLowerCase() === t).length; if (repes > 1) a.push('repetida');
    return a;
  };
  const fmtFormato = (k, n) => { const f = K.formatos[k] = K.formatos[k] || {};
    return `<div class="tarjeta" style="padding:14px"><h3 style="font-size:17px">${n}</h3>
      <div class="rejilla r2" style="gap:2px 10px"><label class="campo"><span>Estado</span><select data-ruta="kdp.formatos.${k}.estado">${['', 'Borrador', 'Preventa', 'En revisión', 'Publicado'].map(o => `<option${o === (f.estado || '') ? ' selected' : ''}>${o}</option>`).join('')}</select></label>
      <label class="campo"><span>Precio (€)</span><input data-ruta="kdp.formatos.${k}.precio" value="${esc(f.precio || '')}" placeholder="${k === 'ebook' ? '3,99' : '14,99'}"></label>
      <label class="campo"><span>${k === 'ebook' ? 'ASIN' : 'ISBN'}</span><input data-ruta="kdp.formatos.${k}.id" value="${esc(f.id || '')}"></label>
      <label class="campo"><span>Fecha</span><input type="date" data-ruta="kdp.formatos.${k}.fecha" value="${esc(f.fecha || '')}"></label></div>
      ${k === 'ebook' ? `<label class="check" style="margin:0"><input type="checkbox" data-ruta="kdp.formatos.ebook.ku"${f.ku ? ' checked' : ''}><span>En Kindle Unlimited (KDP Select)</span></label>` : ''}</div>`; };
  c.innerHTML = `<div class="rejilla" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start">
    <div class="tarjeta"><h2>Palabras clave (7 casillas)</h2>
      <p class="tenue" style="font-size:12.5px;margin:-6px 0 10px">Frases que buscaría tu lectora: «comedia romántica navidad pueblo», «romance enemies to lovers oficina»… Sin repetir lo que ya está en el título o las categorías.</p>
      ${(K.keywords || []).map((kw, i) => { const a = avisosKw(kw); return `<div class="kw"><span class="kw-n">${i + 1}</span><input class="txt" data-kw="${i}" value="${esc(kw)}" maxlength="80"><span class="kw-c${kw.length > 50 ? ' pasado' : ''}">${kw.length}/50</span></div><div class="kw-av" data-kwav="${i}">${a.map(esc).join(' · ')}</div>`; }).join('')}
      <button class="btn peq" id="kd-copiar-kw" style="margin-top:8px">Copiar las 7</button>
      <h2 style="margin-top:22px">Categorías (hasta 3)</h2>
      ${(K.categorias || []).map((ct, i) => `<input class="txt" data-cat-k="${i}" value="${esc(ct)}" placeholder="${['Romántica › Comedia romántica', 'Romántica › Contemporánea', 'Romántica › Navidad'][i]}" style="margin-bottom:6px">`).join('')}
      <h2 style="margin-top:22px">Enlaces de compra</h2>
      <label class="campo"><span>Amazon (ebook)</span><input data-ruta="kdp.enlaces.amazon" value="${esc(K.enlaces.amazon || '')}" placeholder="https://www.amazon.es/dp/…"></label>
      <label class="campo"><span>Amazon (papel)</span><input data-ruta="kdp.enlaces.papel" value="${esc(K.enlaces.papel || '')}"></label>
      <label class="campo"><span>Otros (uno por línea: tienda | enlace)</span><textarea data-ruta="kdp.enlaces.otros" rows="2">${esc(K.enlaces.otros || '')}</textarea></label>
    </div>
    <div><div class="rejilla" style="gap:12px">${fmtFormato('ebook', 'Ebook')}${fmtFormato('blanda', 'Tapa blanda')}${fmtFormato('dura', 'Tapa dura')}</div></div>
  </div>
  <div class="tarjeta" style="margin-top:18px"><div class="fila sep" style="flex-wrap:wrap"><h2 style="margin:0">Descripción para Amazon</h2><span id="kd-cont"></span></div>
    <p class="tenue" style="font-size:12.5px;margin:6px 0 10px">KDP admite estas etiquetas: negrita, cursiva, subrayado, títulos pequeños (h4–h6), saltos, párrafos y listas. Las etiquetas cuentan para el límite de 4000 caracteres.</p>
    <div class="fila" style="flex-wrap:wrap;margin-bottom:8px">${[['b', '<b>N</b>'], ['i', '<i>C</i>'], ['u', '<u>S</u>'], ['h4', 'Título'], ['p', 'Párrafo'], ['br', 'Salto'], ['li', 'Lista']].map(([t, l]) => `<button class="btn peq" data-tag="${t}">${l}</button>`).join('')}
      <span style="flex:1"></span><button class="btn peq" id="kd-desde">Traer la sinopsis larga</button><button class="btn peq prim" id="kd-copiar">Copiar para KDP</button></div>
    <div class="rejilla r2" style="gap:14px"><textarea class="txt" id="kd-desc" rows="14" style="font:13px/1.5 ui-monospace,Menlo,monospace">${esc(K.descripcion || '')}</textarea>
      <div class="kd-prev" id="kd-prev"></div></div><div id="kd-av"></div></div>
  <div class="tarjeta" style="margin-top:18px"><div class="fila sep"><h2 style="margin:0">Contenido A+</h2><button class="btn peq" id="ap-add">+ Añadir módulo</button></div>
    <p class="tenue" style="font-size:12.5px;margin:6px 0 12px">Planifica los módulos antes de montarlos en KDP (Marketing › Contenido A+). Imágenes JPG o PNG de 3 MB como máximo, sin texto pequeño encima.</p>
    <div id="ap-lista"></div></div>`;
  enlazarRutas(c, P);
  const avisarKw = debounce(() => $$('[data-kwav]', c).forEach(d => { d.textContent = avisosKw(K.keywords[+d.dataset.kwav] || '').join(' · '); }), 300);
  $$('[data-kw]', c).forEach(i => { i.oninput = () => { K.keywords[+i.dataset.kw] = i.value; guardarPub(); const s = i.parentElement.querySelector('.kw-c'); s.textContent = i.value.length + '/50'; s.classList.toggle('pasado', i.value.length > 50); avisarKw(); }; });
  $$('[data-cat-k]', c).forEach(i => i.oninput = () => { K.categorias[+i.dataset.catK] = i.value; guardarPub(); });
  $('#kd-copiar-kw', c).onclick = () => copiarTexto(K.keywords.filter(Boolean).join('\n'), 'Palabras clave copiadas');
  // descripción
  const ta = $('#kd-desc', c);
  const PERMITIDAS = /^(b|i|em|u|br|p|h4|h5|h6|ol|ul|li)$/i;
  const pinta = () => {
    const v = ta.value; K.descripcion = v; guardarPub();
    $('#kd-cont', c).innerHTML = contador(v.length, 4000);
    const malas = [...new Set([...v.matchAll(/<\/?([a-z0-9]+)[^>]*>/gi)].map(m => m[1].toLowerCase()).filter(t => !PERMITIDAS.test(t)))];
    $('#kd-av', c).innerHTML = malas.length ? `<div class="aviso-est">⚠ KDP no admite: ${malas.map(t => '&lt;' + esc(t) + '&gt;').join(', ')}</div>` : '';
    const d = document.createElement('div'); d.innerHTML = v.replace(/\n/g, ' ');
    $$('*', d).forEach(e => { if (!PERMITIDAS.test(e.tagName)) e.replaceWith(...e.childNodes); else [...e.attributes].forEach(a => e.removeAttribute(a.name)); });
    $('#kd-prev', c).innerHTML = d.innerHTML || '<p class="tenue">Así se verá en Amazon.</p>';
  };
  ta.oninput = pinta; pinta();
  $$('[data-tag]', c).forEach(b => b.onclick = () => {
    const t = b.dataset.tag; const s = ta.selectionStart, e = ta.selectionEnd; const sel = ta.value.slice(s, e);
    const ins = t === 'br' ? '<br>' : t === 'li' ? `<ul>\n<li>${sel || 'Elemento'}</li>\n</ul>` : `<${t}>${sel || ''}</${t}>`;
    ta.setRangeText(ins, s, e, 'end'); ta.focus(); pinta();
  });
  $('#kd-desde', c).onclick = () => { const t = (P.ficha.sinopsisLarga || '').trim(); if (!t) return aviso('Escribe primero la sinopsis larga en Ficha'); ta.value = t.split(/\n\s*\n|\n/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('\n'); pinta(); };
  $('#kd-copiar', c).onclick = () => copiarTexto(ta.value, 'Descripción copiada: pégala en KDP');
  // A+
  const pintaAp = async () => {
    const caja = $('#ap-lista', c);
    if (!K.aplus.length) { caja.innerHTML = '<div class="vacio" style="padding:16px">Sin módulos todavía. Un buen comienzo: una cabecera con la frase gancho, tres imágenes con los tropos y la comparativa con tus otros libros.</div>'; return; }
    const imgs = {};
    for (const m of K.aplus) for (const id of (m.imgs || [])) if (id) imgs[id] = await leerImagen(id);
    caja.innerHTML = K.aplus.map((m, i) => { const t = MODULOS_APLUS[m.tipo] || MODULOS_APLUS.texto; return `<div class="ap-mod" data-i="${i}">
      <div class="fila sep"><select class="txt" data-ap-tipo style="width:auto;padding:4px 8px">${Object.entries(MODULOS_APLUS).map(([k, x]) => `<option value="${k}"${k === m.tipo ? ' selected' : ''}>${i + 1}. ${x.n}</option>`).join('')}</select>
        <span><button class="icono" data-ap-sub title="Subir">↑</button><button class="icono" data-ap-baj title="Bajar">↓</button><button class="icono" data-ap-del title="Quitar">✕</button></span></div>
      <p class="tenue" style="font-size:12px;margin:4px 0 8px">Medida: ${t.med}</p>
      ${t.imgs ? `<div class="fila" style="gap:8px;margin-bottom:8px">${[...Array(t.imgs)].map((_, j) => { const id = (m.imgs || [])[j]; const im = id && imgs[id]; return `<button class="ap-img" data-ap-img="${j}">${im ? `<img src="${im.data}" alt=""><small>${im.w}×${im.h}</small>` : '+ imagen'}</button>`; }).join('')}</div>` : ''}
      <input class="txt" data-ap-tit value="${esc(m.titulo || '')}" placeholder="Titular" style="margin-bottom:6px">
      <textarea class="txt" data-ap-txt rows="3" placeholder="Texto del módulo">${esc(m.texto || '')}</textarea></div>`; }).join('');
    $$('.ap-mod', caja).forEach(d => {
      const m = K.aplus[+d.dataset.i];
      $('[data-ap-tipo]', d).onchange = (e) => { m.tipo = e.target.value; guardarMeta(); pintaAp(); };
      $('[data-ap-tit]', d).oninput = (e) => { m.titulo = e.target.value; guardarPub(); };
      $('[data-ap-txt]', d).oninput = (e) => { m.texto = e.target.value; guardarPub(); };
      $('[data-ap-del]', d).onclick = () => { K.aplus.splice(+d.dataset.i, 1); guardarMeta(); pintaAp(); };
      $('[data-ap-sub]', d).onclick = () => { const i = +d.dataset.i; if (i > 0) { [K.aplus[i - 1], K.aplus[i]] = [K.aplus[i], K.aplus[i - 1]]; guardarMeta(); pintaAp(); } };
      $('[data-ap-baj]', d).onclick = () => { const i = +d.dataset.i; if (i < K.aplus.length - 1) { [K.aplus[i + 1], K.aplus[i]] = [K.aplus[i], K.aplus[i + 1]]; guardarMeta(); pintaAp(); } };
      $$('[data-ap-img]', d).forEach(b => b.onclick = async () => { const id = await elegirImagen(); if (!id) return; m.imgs = m.imgs || []; m.imgs[+b.dataset.apImg] = id; guardarMeta(); pintaAp(); });
    });
  };
  $('#ap-add', c).onclick = () => { K.aplus.push({ id: uid(), tipo: K.aplus.length ? 'tres' : 'cabecera', titulo: '', texto: '', imgs: [] }); guardarMeta(); pintaAp(); };
  pintaAp();
}

// ---------- Producción y lectoras beta ----------
function pubProd(c, P) {
  const R = P.prod;
  const hechas = R.fases.filter(f => f.estado === 'hecho').length;
  c.innerHTML = `<div class="tarjeta"><div class="fila sep"><h2 style="margin:0">Fases (${hechas}/${R.fases.length})</h2><button class="btn peq" id="pr-add">+ Fase</button></div>
      <div class="barra-prog"><i style="width:${R.fases.length ? hechas / R.fases.length * 100 : 0}%"></i></div>
      <p class="tenue" style="font-size:12.5px;margin:4px 0 10px">Apunta en cada fase qué archivo es el bueno («PROYECTO MAR - 2ª REVISIÓN SIN MULETILLAS.docx»), y así no tienes que adivinarlo.</p>
      <div class="fases">${R.fases.map((f, i) => `<div class="fase-p e-${f.estado}" data-i="${i}">
        <select class="txt" data-f="estado">${[['pendiente', 'Pendiente'], ['curso', 'En curso'], ['hecho', 'Hecho']].map(([k, t]) => `<option value="${k}"${f.estado === k ? ' selected' : ''}>${t}</option>`).join('')}</select>
        <input class="txt fase-n" data-f="nombre" value="${esc(f.nombre)}">
        <input class="txt" data-f="quien" value="${esc(f.quien || '')}" placeholder="Quién">
        <input class="txt" type="date" data-f="fecha" value="${esc(f.fecha || '')}">
        <input class="txt" data-f="archivo" value="${esc(f.archivo || '')}" placeholder="Archivo / versión">
        <button class="icono" data-fdel title="Quitar">✕</button></div>`).join('')}</div></div>
    <div class="tarjeta" style="margin-top:18px"><div class="fila sep"><h2 style="margin:0">Lectoras beta y correctora</h2><button class="btn peq" id="bt-add">+ Persona</button></div>
      <div class="betas">${R.betas.length ? R.betas.map((b, i) => `<div class="beta" data-i="${i}">
        <div class="rejilla" style="grid-template-columns:1.2fr 1fr .9fr .9fr .9fr auto;gap:6px;align-items:end">
          <label class="campo"><span>Nombre</span><input data-b="nombre" value="${esc(b.nombre || '')}"></label>
          <label class="campo"><span>Papel</span><select data-b="papel">${['Lectora beta', 'Lectora ARC', 'Correctora', 'Sensitivity reader', 'Otra'].map(o => `<option${o === b.papel ? ' selected' : ''}>${o}</option>`).join('')}</select></label>
          <label class="campo"><span>Enviado</span><input type="date" data-b="enviado" value="${esc(b.enviado || '')}"></label>
          <label class="campo"><span>Devuelto</span><input type="date" data-b="devuelto" value="${esc(b.devuelto || '')}"></label>
          <label class="campo"><span>Capítulos</span><input data-b="caps" value="${esc(b.caps || '')}" placeholder="1-15"></label>
          <button class="icono" data-bdel style="margin-bottom:14px">✕</button></div>
        <textarea class="txt" data-b="notas" rows="2" placeholder="Qué te ha dicho">${esc(b.notas || '')}</textarea>
        <label class="check" style="margin:6px 0 0"><input type="checkbox" data-b="resena"${b.resena ? ' checked' : ''}><span>Ha dejado reseña</span></label></div>`).join('') : '<div class="vacio" style="padding:16px">Nadie todavía.</div>'}</div></div>`;
  $$('.fase-p', c).forEach(d => { const f = R.fases[+d.dataset.i];
    $$('[data-f]', d).forEach(i => { i.oninput = i.onchange = () => { f[i.dataset.f] = i.value; guardarPub(); if (i.dataset.f === 'estado') pubProd(c, P); }; });
    $('[data-fdel]', d).onclick = () => { R.fases.splice(+d.dataset.i, 1); guardarMeta(); pubProd(c, P); }; });
  $('#pr-add', c).onclick = () => { R.fases.push({ id: uid(), nombre: 'Nueva fase', estado: 'pendiente', fecha: '', archivo: '', quien: '' }); guardarMeta(); pubProd(c, P); };
  $$('.beta', c).forEach(d => { const b = R.betas[+d.dataset.i];
    $$('[data-b]', d).forEach(i => { i.oninput = i.onchange = () => { b[i.dataset.b] = i.type === 'checkbox' ? i.checked : i.value; guardarPub(); }; });
    $('[data-bdel]', d).onclick = () => { R.betas.splice(+d.dataset.i, 1); guardarMeta(); pubProd(c, P); }; });
  $('#bt-add', c).onclick = () => { R.betas.push({ id: uid(), nombre: '', papel: 'Lectora beta' }); guardarMeta(); pubProd(c, P); };
}

// ---------- Lanzamiento ----------
let lanzFiltro = '';
function pubLanz(c, P, cont) {
  const L = P.lanz;
  const fechaDe = (t) => L.fecha ? sumarDias(deStr(L.fecha), t.dias) : null;
  const orden = L.tareas.slice().sort((a, b) => a.dias - b.dias);
  const hoy = deStr(diaStr());
  const grupos = [];
  orden.filter(t => !lanzFiltro || t.cat === lanzFiltro).forEach(t => {
    const d = fechaDe(t);
    const l = !d ? (t.dias === 0 ? 'Día D' : t.dias < 0 ? `${-t.dias} días antes` : `${t.dias} días después`) : t.dias === 0 ? `Día D · ${fechaLarga(d)}` : `${fechaLarga(d)} · ${t.dias < 0 ? `D${t.dias}` : `D+${t.dias}`}`;
    if (!grupos.length || grupos[grupos.length - 1].l !== l) grupos.push({ l, d, items: [] });
    grupos[grupos.length - 1].items.push(t);
  });
  c.innerHTML = `<div class="rejilla" style="grid-template-columns:300px minmax(0,1fr);gap:20px;align-items:start">
    <div class="tarjeta" style="position:sticky;top:16px">
      <label class="campo"><span>Fecha de lanzamiento (día D)</span><input type="date" id="la-f" value="${esc(L.fecha || '')}"></label>
      <label class="campo"><span>Abre la preventa</span><input type="date" id="la-p" value="${esc(L.preventa || '')}"></label>
      ${L.fecha ? `<div class="grande" style="font-size:44px;margin:6px 0">${Math.max(0, diasEntre(new Date(), deStr(L.fecha)))}<small> días</small></div>` : ''}
      <p class="suave" style="font-size:13px">${L.tareas.length ? `${L.tareas.filter(t => t.hecho).length} de ${L.tareas.length} tareas hechas` : 'Empieza con la plantilla: la ajustas a tu gusto después.'}</p>
      ${L.tareas.length ? '' : '<button class="btn prim" id="la-plantilla" style="width:100%;justify-content:center">Usar la plantilla de lanzamiento</button>'}
      <div style="margin-top:12px">${['', ...CATS_LANZ].map(k => `<span class="chip${k === lanzFiltro ? ' on' : ''}" data-lf="${k}">${k || 'Todo'}</span>`).join('')}</div>
      <h2 style="margin-top:16px">Añadir tarea</h2>
      <input class="txt" id="la-t" placeholder="Qué hay que hacer" style="margin-bottom:6px">
      <div class="fila"><input class="txt" id="la-d" type="number" value="-7" style="width:80px" title="Días respecto al día D (negativo = antes)"><select class="txt" id="la-c" style="flex:1">${CATS_LANZ.map(k => `<option>${k}</option>`).join('')}</select><button class="btn peq" id="la-ok">Añadir</button></div>
      <p class="tenue" style="font-size:12px;margin:6px 0 0">Días respecto al día D: −14 = dos semanas antes.</p>
      ${L.fecha ? '<button class="btn peq" id="la-redes" style="margin-top:14px">Crear plan de redes del lanzamiento</button><button class="btn peq" id="la-ics" style="margin-top:8px">Descargar para Google Calendar (.ics)</button>' : ''}
    </div>
    <div>${grupos.length ? grupos.map(g => `<div class="lz-grupo${g.d && g.d < hoy ? ' pasado' : ''}${g.d && diaStr(g.d) === diaStr() ? ' hoy' : ''}"><h4>${esc(g.l)}</h4>${g.items.map(t => `<div class="lz-t${t.hecho ? ' hecho' : ''}${g.d && g.d < hoy && !t.hecho ? ' tarde' : ''}" data-id="${t.id}"><input type="checkbox"${t.hecho ? ' checked' : ''} data-hecho><span class="lz-cat c-${esc(t.cat)}">${esc(t.cat)}</span><span class="lz-tx" title="Doble clic para editar">${esc(t.texto)}</span>${g.d && g.d < hoy && !t.hecho ? '<span style="color:var(--rojo);font-size:12px;white-space:nowrap">atrasada</span>' : ''}<button class="icono" data-del>✕</button></div>`).join('')}</div>`).join('') : '<div class="tarjeta vacio">Pon la fecha y usa la plantilla, o añade tus tareas.</div>'}</div></div>`;
  $('#la-f', c).onchange = (e) => { L.fecha = e.target.value; guardarMeta(); VISTAS.publicar(cont); };
  $('#la-p', c).onchange = (e) => { L.preventa = e.target.value; guardarMeta(); };
  if ($('#la-plantilla', c)) $('#la-plantilla', c).onclick = () => { L.tareas = TAREAS_LANZ.map(([d, t, k]) => ({ id: uid(), dias: d, texto: t, cat: k, hecho: false })); guardarMeta(); VISTAS.publicar(cont); };
  $$('[data-lf]', c).forEach(x => x.onclick = () => { lanzFiltro = x.dataset.lf; pubLanz(c, P, cont); });
  const add = () => { const t = $('#la-t', c).value.trim(); if (!t) return; L.tareas.push({ id: uid(), dias: parseInt($('#la-d', c).value, 10) || 0, texto: t, cat: $('#la-c', c).value, hecho: false }); guardarMeta(); pubLanz(c, P, cont); };
  $('#la-ok', c).onclick = add; $('#la-t', c).onkeydown = (e) => { if (e.key === 'Enter') add(); };
  $$('.lz-t', c).forEach(d => { const t = L.tareas.find(x => x.id === d.dataset.id);
    $('[data-hecho]', d).onchange = (e) => { t.hecho = e.target.checked; guardarMeta(); d.classList.toggle('hecho', t.hecho); };
    $('[data-del]', d).onclick = () => { L.tareas = L.tareas.filter(x => x !== t); guardarMeta(); pubLanz(c, P, cont); };
    $('.lz-tx', d).ondblclick = async () => { const v = await pedirTexto('Editar tarea', t.texto, 'Tarea'); if (v) { t.texto = v; guardarMeta(); pubLanz(c, P, cont); } };
  });
  if ($('#la-redes', c)) $('#la-redes', c).onclick = () => { crearPlanRedes(P); pubTab = 'redes'; VISTAS.publicar(cont); };
  if ($('#la-ics', c)) $('#la-ics', c).onclick = () => descargarIcs(P);
}
function crearPlanRedes(P) {
  const t = P.ficha.titulo || proyecto().titulo;
  const plan = [[-40, 'Revelación de portada', 'Carrusel', 'Instagram', 'Por fin puedo enseñárosla'], [-30, `Tropos de ${t}`, 'Carrusel', 'Instagram', 'Si te gustan estos tropos, este libro es para ti'],
    [-21, `Frase de ${t}`, 'Reel', 'IG + TikTok', 'Una frase que aún no ha leído nadie'], [-14, `${t} vibes`, 'Post', 'Instagram', 'Moodboard sin spoilers'],
    [-10, 'Conoce a los protagonistas', 'Carrusel', 'Instagram', 'Ella es… y él es…'], [-7, `Cuenta atrás: ${t}`, 'Reel', 'IG + TikTok', 'Queda una semana y ya no puedo guardar el secreto'],
    [-1, 'Mañana sale', 'Story', 'Stories', 'Activa el recordatorio'], [0, `Día de lanzamiento: ${t}`, 'Reel', 'IG + TikTok', 'Ya está aquí'],
    [3, 'Lo que dicen las lectoras', 'Carrusel', 'Instagram', 'No lo digo yo, lo dicen ellas'], [10, P.ficha.serie ? `Por dónde empezar: ${P.ficha.serie}` : 'Por dónde empezar a leerme', 'Carrusel', 'Instagram', '¿Nunca me has leído? Empieza por aquí']];
  const ya = new Set(P.redes.map(r => r.tema));
  let n = 0;
  plan.forEach(([d, tema, formato, donde, gancho]) => { if (ya.has(tema)) return; if (sumarDias(deStr(P.lanz.fecha), d) < deStr(diaStr())) return; n++; P.redes.push({ id: uid(), fecha: diaStr(sumarDias(deStr(P.lanz.fecha), d)), tema, formato, donde, gancho, guion: '', caption: '', cta: d === 0 ? 'Link directo en mi bio' : '', hashtags: HASHTAGS_DEF, audio: '', grabado: false, editado: false, captionListo: false, programado: false, publicado: false, prioridad: d === 0 ? 'Alta' : 'Media', notas: '' }); });
  guardarMeta(); aviso(n ? `Plan de redes: ${plural(n, 'publicación nueva', 'publicaciones nuevas')} (solo de hoy en adelante)` : 'No hay publicaciones nuevas que añadir');
}
function descargarIcs(P) {
  const t = P.ficha.titulo || proyecto().titulo;
  const f = (d) => diaStr(d).replace(/-/g, '');
  const ev = (d, s) => `BEGIN:VEVENT\r\nUID:${uid()}@mesa\r\nDTSTAMP:${f(new Date())}T000000Z\r\nDTSTART;VALUE=DATE:${f(d)}\r\nDTEND;VALUE=DATE:${f(sumarDias(d, 1))}\r\nSUMMARY:${s.replace(/[,;]/g, ' ')}\r\nEND:VEVENT\r\n`;
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Novelia Studio//ES\r\n';
  P.lanz.tareas.filter(x => !x.hecho).forEach(x => { ics += ev(sumarDias(deStr(P.lanz.fecha), x.dias), `📚 ${t}: ${x.texto}`); });
  P.redes.filter(r => r.fecha && !r.publicado).forEach(r => { ics += ev(deStr(r.fecha), `📱 ${r.formato}: ${r.tema}`); });
  ics += 'END:VCALENDAR\r\n';
  descargar(new Blob([ics], { type: 'text/calendar' }), `Lanzamiento ${nombreArchivo(t)}.ics`);
  aviso('Ábrelo o impórtalo en Google Calendar');
}

// ---------- Redes (mismas columnas que tu BATCH) ----------
const FORMATOS = { Post: '📷', Reel: '🎬', Carrusel: '🗂️', Story: '⭕' };
const PASOS = [['grabado', 'Grabado / diseñado'], ['editado', 'Editado'], ['captionListo', 'Caption listo'], ['programado', 'Programado'], ['publicado', 'Publicado']];
const estadoRed = (r) => r.publicado ? '✅ Publicado' : r.programado ? '⏱️ Programado' : r.captionListo ? '✍️ Caption listo' : r.editado ? '✂️ Editado' : r.grabado ? '🚀 Diseñado' : '💡 Idea';
let redAbierta = null;
function pubRedes(c, P, cont) {
  const R = P.redes.slice().sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
  c.innerHTML = `<div class="fila" style="flex-wrap:wrap;margin-bottom:14px"><button class="btn prim" id="rd-add">+ Publicación</button>
      ${P.lanz.fecha ? '<button class="btn" id="rd-plan">Crear plan de lanzamiento</button>' : ''}<span style="flex:1"></span>
      <button class="btn peq" id="rd-batch" title="Copia las filas con las columnas de tu Planner (pestaña BATCH) para pegarlas allí">Copiar para mi Planner (BATCH)</button></div>
    ${R.length ? `<div class="tarjeta" style="padding:6px 10px"><table class="tabla"><thead><tr><th>Fecha</th><th>Formato</th><th>Tema</th><th>Gancho</th><th>Estado</th><th></th></tr></thead><tbody>
      ${R.map(r => `<tr data-id="${r.id}"${r.id === redAbierta ? ' class="abierta"' : ''}><td class="num" style="white-space:nowrap">${r.fecha ? `${DIAS_LARGOS[deStr(r.fecha).getDay()].slice(0, 3)} ${fechaCorta(r.fecha)}` : '—'}</td><td>${FORMATOS[r.formato] || ''} ${esc(r.formato)}<div class="tenue" style="font-size:11.5px">${esc(r.donde)}</div></td><td><b>${esc(r.tema)}</b></td><td class="suave">${esc(r.gancho)}</td><td style="white-space:nowrap">${estadoRed(r)}</td><td><button class="icono" data-rdel>✕</button></td></tr>
        ${r.id === redAbierta ? `<tr class="red-ed"><td colspan="6">${formRed(r, P)}</td></tr>` : ''}`).join('')}</tbody></table></div>`
      : '<div class="tarjeta vacio">Sin publicaciones. Añade una, o pon la fecha de lanzamiento y crea el plan.</div>'}`;
  $('#rd-add', c).onclick = () => { const r = { id: uid(), fecha: diaStr(), tema: '', formato: 'Post', donde: 'Instagram', gancho: '', guion: '', caption: '', cta: '', hashtags: HASHTAGS_DEF, audio: '', prioridad: 'Media', notas: '' }; P.redes.push(r); redAbierta = r.id; guardarMeta(); pubRedes(c, P, cont); };
  if ($('#rd-plan', c)) $('#rd-plan', c).onclick = () => { crearPlanRedes(P); pubRedes(c, P, cont); };
  $('#rd-batch', c).onclick = () => {
    const limpio = (s) => String(s || '').replace(/[\t\n]+/g, ' ').trim();
    const filas = R.map((r, i) => [r.fecha ? deStr(r.fecha).toLocaleDateString('es-ES') : '', r.fecha ? DIAS_LARGOS[deStr(r.fecha).getDay()] : '', '', r.tema, r.formato, r.donde, r.gancho, r.guion, r.caption, r.cta, r.hashtags, r.audio, ...PASOS.map(([k]) => r[k] ? 'Sí' : 'No')].map(limpio).join('\t'));
    copiarTexto(filas.join('\n'), `${plural(filas.length, 'fila copiada', 'filas copiadas')}: pégalas en BATCH, columna «Fecha publicación»`);
  };
  $$('tr[data-id]', c).forEach(tr => {
    tr.onclick = (e) => { if (e.target.closest('[data-rdel]')) return; redAbierta = redAbierta === tr.dataset.id ? null : tr.dataset.id; pubRedes(c, P, cont); };
    $('[data-rdel]', tr).onclick = async () => { const r = P.redes.find(x => x.id === tr.dataset.id); if (!(await preguntar('¿Quitar esta publicación?', r.tema || '', 'Quitar', true))) return; P.redes = P.redes.filter(x => x !== r); guardarMeta(); pubRedes(c, P, cont); };
  });
  const ed = $('.red-ed', c);
  if (ed) {
    const r = P.redes.find(x => x.id === redAbierta);
    $$('[data-r]', ed).forEach(i => { i.oninput = i.onchange = () => { r[i.dataset.r] = i.type === 'checkbox' ? i.checked : i.value; guardarPub(); if (i.type === 'checkbox' || i.tagName === 'SELECT' || i.type === 'date') { const fila = $(`tr[data-id="${r.id}"]`, c); if (fila) fila.children[4].textContent = estadoRed(r); } }; });
    $$('[data-cita-usar]', ed).forEach(b => b.onclick = () => { const ci = P.citas.find(x => x.id === b.dataset.citaUsar); r.guion = (r.guion ? r.guion + '\n' : '') + `«${ci.texto}»`; guardarMeta(); pubRedes(c, P, cont); });
    $('[data-r="tema"]', ed).focus();
  }
}
function formRed(r, P) {
  const inp = (k, et, ph = '', tipo = 'text') => `<label class="campo"><span>${et}</span><input type="${tipo}" data-r="${k}" value="${esc(r[k] || '')}" placeholder="${esc(ph)}"></label>`;
  const ta = (k, et, filas, ph = '') => `<label class="campo"><span>${et}</span><textarea data-r="${k}" rows="${filas}" placeholder="${esc(ph)}">${esc(r[k] || '')}</textarea></label>`;
  return `<div class="rejilla r3" style="gap:2px 14px">${inp('fecha', 'Fecha', '', 'date')}
      <label class="campo"><span>Formato</span><select data-r="formato">${Object.keys(FORMATOS).map(o => `<option${o === r.formato ? ' selected' : ''}>${o}</option>`).join('')}</select></label>
      <label class="campo"><span>Dónde</span><select data-r="donde">${['Instagram', 'IG + TikTok', 'TikTok', 'Stories', 'Facebook', 'Newsletter'].map(o => `<option${o === r.donde ? ' selected' : ''}>${o}</option>`).join('')}</select></label></div>
    ${inp('tema', 'Tema')}${inp('gancho', 'Gancho', 'Lo primero que se lee o se oye')}
    ${ta('guion', 'Guion / texto de las slides', 4)}
    <div class="rejilla r2" style="gap:2px 14px">${ta('caption', 'Caption', 4)}<div>${inp('cta', 'CTA', 'Link en bio, comenta…')}${inp('audio', 'Audio')}</div></div>
    ${inp('hashtags', 'Hashtags')}
    <div class="fila" style="flex-wrap:wrap;gap:14px;margin:4px 0 10px">${PASOS.map(([k, t]) => `<label class="fila" style="gap:6px;font-size:13px"><input type="checkbox" data-r="${k}"${r[k] ? ' checked' : ''} style="accent-color:var(--verde)">${t}</label>`).join('')}</div>
    ${inp('notas', 'Notas')}
    ${P.citas.length ? `<div class="tenue" style="font-size:12.5px;margin-bottom:4px">Usar una cita del libro en el guion:</div>${P.citas.slice(0, 8).map(ci => `<span class="chip" data-cita-usar="${ci.id}" style="font-family:var(--serif);font-size:13px">«${esc(ci.texto.slice(0, 60))}${ci.texto.length > 60 ? '…' : ''}»</span>`).join('')}` : ''}`;
}

// ---------- Citas y tarjetas para redes ----------
function guardarCita(texto, capTitulo) {
  const P = pub();
  const t = texto.replace(/\s+/g, ' ').trim();
  if (!t) return;
  if (P.citas.some(c => c.texto === t)) return aviso('Esa cita ya estaba guardada');
  P.citas.unshift({ id: uid(), texto: t, cap: capTitulo || '', creada: Date.now() });
  guardarMeta(); aviso('Cita guardada en Publicar › Citas');
}
const ESTILOS_TARJ = {
  acento: { n: 'Color', fondo: () => getComputedStyle(document.documentElement).getPropertyValue('--acento-base').trim() || '#2f5d50', tinta: '#fffdf8' },
  papel: { n: 'Papel', fondo: () => '#f6f1e8', tinta: '#2a2420' },
  noche: { n: 'Noche', fondo: () => '#1b1916', tinta: '#ece5da' },
  rosa: { n: 'Rosa', fondo: () => '#f3d9dc', tinta: '#5a1f30' },
  imagen: { n: 'Con imagen', fondo: () => '#000', tinta: '#ffffff' }
};
let tarjCfg = { formato: '1080x1350', estilo: 'acento', img: null };
function pubCitas(c, P) {
  c.innerHTML = `<div class="rejilla" style="grid-template-columns:minmax(0,1fr) 420px;gap:20px;align-items:start">
    <div><p class="sub" style="margin-top:0">Guarda frases mientras escribes o relees: selecciona el texto y pulsa <b>❝ Guardar cita</b>. Luego conviértelas en tarjetas para Instagram o en el gancho de un reel.</p>
      <div class="entrada-idea"><input class="txt" id="ct-in" placeholder="O escribe o pega una cita y pulsa Enter"></div>
      ${P.citas.length ? P.citas.map(ci => `<div class="cita${ci.id === tarjCfg.cita ? ' sel' : ''}" data-id="${ci.id}"><div class="cita-t">«${esc(ci.texto)}»</div><div class="fila sep tenue" style="font-size:12px"><span>${esc(ci.cap || '')}</span><span><button class="btn peq" data-tarj>Hacer tarjeta</button> <button class="icono" data-copiar title="Copiar">⧉</button><button class="icono" data-del title="Quitar">✕</button></span></div></div>`).join('') : '<div class="tarjeta vacio">Todavía no hay citas.</div>'}</div>
    <div class="tarjeta" style="position:sticky;top:16px" id="ct-tarjeta">${tarjCfg.cita ? '' : '<div class="vacio">Elige «Hacer tarjeta» en una cita</div>'}</div></div>`;
  $('#ct-in', c).onkeydown = (e) => { if (e.key === 'Enter' && e.target.value.trim()) { guardarCita(e.target.value, ''); pubCitas(c, P); } };
  $$('.cita', c).forEach(d => { const ci = P.citas.find(x => x.id === d.dataset.id);
    $('[data-tarj]', d).onclick = () => { tarjCfg.cita = ci.id; pubCitas(c, P); };
    $('[data-copiar]', d).onclick = () => copiarTexto(`«${ci.texto}»`);
    $('[data-del]', d).onclick = () => { P.citas = P.citas.filter(x => x !== ci); if (tarjCfg.cita === ci.id) tarjCfg.cita = null; guardarMeta(); pubCitas(c, P); };
  });
  if (tarjCfg.cita && P.citas.some(x => x.id === tarjCfg.cita)) pintarTarjeta($('#ct-tarjeta', c), P);
}
async function pintarTarjeta(caja, P) {
  const ci = P.citas.find(x => x.id === tarjCfg.cita);
  caja.innerHTML = `<h2>Tarjeta</h2>
    <div class="segmentos peq" style="margin-bottom:8px">${[['1080x1350', 'Post 4:5'], ['1080x1080', 'Cuadrada'], ['1080x1920', 'Story / reel']].map(([k, t]) => `<button data-tf="${k}"${tarjCfg.formato === k ? ' class="on"' : ''}>${t}</button>`).join('')}</div>
    <div style="margin-bottom:10px">${Object.entries(ESTILOS_TARJ).map(([k, e]) => `<span class="chip${tarjCfg.estilo === k ? ' on' : ''}" data-te="${k}">${e.n}</span>`).join('')}</div>
    ${tarjCfg.estilo === 'imagen' ? '<button class="btn peq" id="tj-img" style="margin-bottom:10px">Elegir imagen de fondo…</button>' : ''}
    <canvas id="tj-c" style="width:100%;border-radius:10px;box-shadow:var(--sombra)"></canvas>
    <div class="fila" style="margin-top:10px"><button class="btn prim" id="tj-png">Descargar PNG</button><button class="btn" id="tj-tab">Guardar en el tablero</button></div>`;
  $$('[data-tf]', caja).forEach(b => b.onclick = () => { tarjCfg.formato = b.dataset.tf; pintarTarjeta(caja, P); });
  $$('[data-te]', caja).forEach(b => b.onclick = () => { tarjCfg.estilo = b.dataset.te; pintarTarjeta(caja, P); });
  if ($('#tj-img', caja)) $('#tj-img', caja).onclick = async () => { const id = await elegirImagen(); if (id) { tarjCfg.img = id; pintarTarjeta(caja, P); } };
  const [W, H] = tarjCfg.formato.split('x').map(Number);
  const cv = $('#tj-c', caja); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const est = ESTILOS_TARJ[tarjCfg.estilo];
  g.fillStyle = est.fondo(); g.fillRect(0, 0, W, H);
  const bg = tarjCfg.estilo === 'imagen' ? await leerImagen(tarjCfg.img || P.ficha.portada) : null;
  if (bg) {
    const im = new Image(); await new Promise(r => { im.onload = r; im.onerror = r; im.src = bg.data; });
    const k = Math.max(W / im.width, H / im.height); const w = im.width * k, h = im.height * k;
    g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
    g.fillStyle = 'rgba(0,0,0,.42)'; g.fillRect(0, 0, W, H);
  }
  const serif = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif';
  const margen = 120, ancho = W - margen * 2;
  const texto = ci.texto;
  let tam = 74, lineas = [];
  const partir = (t) => { const out = []; let l = ''; t.split(' ').forEach(w => { const p = l ? l + ' ' + w : w; if (g.measureText(p).width > ancho && l) { out.push(l); l = w; } else l = p; }); if (l) out.push(l); return out; };
  for (; tam >= 30; tam -= 2) { g.font = `italic ${tam}px ${serif}`; lineas = partir(texto); if (lineas.length * tam * 1.38 < H * 0.55) break; }
  const alto = lineas.length * tam * 1.38;
  let y = (H - alto) / 2 + tam * 0.4;
  g.fillStyle = est.tinta; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.globalAlpha = 0.35; g.font = `${tam * 2.6}px ${serif}`; g.fillText('“', W / 2, y - tam * 1.5); g.globalAlpha = 1;
  g.font = `italic ${tam}px ${serif}`;
  lineas.forEach((l, i) => g.fillText(l, W / 2, y + i * tam * 1.38));
  g.font = `600 30px ui-sans-serif, system-ui, sans-serif`; g.globalAlpha = 0.85;
  const pie = [P.ficha.titulo || proyecto().titulo, M.perfil.nombre].filter(Boolean).join(' · ').toUpperCase();
  g.fillText(pie.split('').join(String.fromCharCode(8202)), W / 2, H - 120); g.globalAlpha = 1;
  $('#tj-png', caja).onclick = () => cv.toBlob(b => descargar(b, `Cita ${nombreArchivo((P.ficha.titulo || 'novela'))} ${tarjCfg.formato}.png`), 'image/png');
  $('#tj-tab', caja).onclick = async () => {
    const boards = await getBoards();
    const b = boards.find(x => (x.nombre || '').toLowerCase() === (P.ficha.titulo || proyecto().titulo).toLowerCase()) || boards[0];
    await guardarItem({ board: b.id, type: 'img', src: cv.toDataURL('image/jpeg', 0.88), w: W, h: H, note: `Cita: «${texto.slice(0, 80)}»`, pageUrl: '', pageTitle: '' });
    aviso(`Guardada en el tablero «${b.nombre}»`);
  };
}
// Botón flotante «Guardar cita» al seleccionar texto en Escribir o Leer
(function () {
  const b = el('button', { class: 'btn-cita', type: 'button' }, '❝ Guardar cita');
  document.body.append(b);
  let texto = '', cap = '';
  const ocultar = () => b.classList.remove('on');
  document.addEventListener('mouseup', (e) => {
    if (e.target === b) return;
    setTimeout(() => {
      const s = getSelection();
      const zona = s && s.anchorNode && (s.anchorNode.parentElement || s.anchorNode).closest && (s.anchorNode.parentElement || s.anchorNode).closest('#editor, #libro, #su-libro, .suelto-vista');
      const t = s ? s.toString().trim() : '';
      if (!zona || t.length < 12 || t.length > 600) return ocultar();
      texto = t;
      const n = M.nodos[nodoAbierto]; cap = zona.id === 'editor' && n ? (n.tipo === 'esc' ? (M.nodos[n.padre] || {}).titulo : n.titulo) : '';
      const r = s.getRangeAt(0).getBoundingClientRect();
      b.style.left = Math.min(innerWidth - 150, Math.max(10, r.left + r.width / 2 - 65)) + 'px';
      b.style.top = Math.max(10, r.top - 44) + 'px';
      b.classList.add('on');
    }, 10);
  });
  document.addEventListener('mousedown', (e) => { if (e.target !== b) ocultar(); });
  document.addEventListener('scroll', ocultar, true);
  b.addEventListener('click', () => { guardarCita(texto, cap); ocultar(); });
})();

// ---------- Web ----------
async function pubWeb(c, P) {
  const F = P.ficha, K = P.kdp;
  const otros = String(K.enlaces.otros || '').split('\n').map(l => l.split('|').map(s => s.trim())).filter(x => x[1]);
  const botones = [K.enlaces.amazon && ['Comprar en Amazon', K.enlaces.amazon], K.enlaces.papel && ['En papel', K.enlaces.papel], ...otros.map(([n, u]) => [n, u])].filter(Boolean);
  const html = `<div class="libro-ficha" style="display:flex;gap:32px;flex-wrap:wrap;align-items:flex-start">
  <!-- Sustituye la imagen por la portada subida a tu biblioteca de medios -->
  <img src="PORTADA.jpg" alt="${esc(F.titulo)}" style="width:260px;max-width:100%;border-radius:6px;box-shadow:0 10px 30px rgba(0,0,0,.15)">
  <div style="flex:1;min-width:260px">
    ${F.serie ? `<p style="text-transform:uppercase;letter-spacing:.12em;font-size:13px;opacity:.7">${esc(F.serie)}${F.numero ? ' · Libro ' + esc(F.numero) : ''}</p>` : ''}
    <h2>${esc(F.titulo)}</h2>${F.subtitulo ? `\n    <p><em>${esc(F.subtitulo)}</em></p>` : ''}
    ${F.pitch ? `<p style="font-size:1.2em"><strong>${esc(F.pitch)}</strong></p>` : ''}
    ${(F.sinopsisLarga || F.sinopsisCorta || '').split(/\n\s*\n|\n/).filter(x => x.trim()).map(x => `<p>${esc(x.trim())}</p>`).join('\n    ')}
    ${(F.tropos || []).length ? `<p style="opacity:.8">${F.tropos.map(t => '#' + esc(t)).join(' · ')}</p>` : ''}
    <p>${botones.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener" style="display:inline-block;margin:4px 8px 4px 0;padding:10px 18px;border-radius:999px;background:#2f5d50;color:#fff;text-decoration:none">${esc(n)}</a>`).join('')}</p>
  </div>
</div>`;
  c.innerHTML = `<div class="rejilla r2" style="gap:18px;align-items:start">
    <div class="tarjeta"><h2>Así quedaría la página del libro</h2><div class="web-prev">${html.replace('PORTADA.jpg', (await leerImagen(F.portada) || {}).data || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22260%22 height=%22400%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23ddd%22/%3E%3C/svg%3E')}</div></div>
    <div class="tarjeta"><h2>Para tu web (WordPress)</h2>
      <ol style="padding-left:20px;line-height:1.7;margin:0 0 12px"><li>En WordPress, crea la página del libro y añade un bloque <b>HTML personalizado</b>.</li><li>Pega este código y cambia <code>PORTADA.jpg</code> por la portada de tu biblioteca de medios.</li></ol>
      <textarea class="txt" rows="14" readonly style="font:12px/1.5 ui-monospace,Menlo,monospace">${esc(html)}</textarea>
      <div class="fila" style="margin-top:10px"><button class="btn prim" id="wb-copiar">Copiar HTML</button>${F.portada ? '<button class="btn" id="wb-portada">Descargar portada</button>' : ''}</div>
      <p class="tenue" style="font-size:12.5px;margin:12px 0 0">Los datos salen de Ficha y de Amazon KDP (enlaces). Si quieres, en el chat con Claude te la puedo crear directamente en tu web.</p></div></div>`;
  $('#wb-copiar', c).onclick = () => copiarTexto(html, 'HTML copiado');
  if ($('#wb-portada', c)) $('#wb-portada', c).onclick = async () => { const im = await leerImagen(F.portada); const b = await (await fetch(im.data)).blob(); descargar(b, `Portada ${nombreArchivo(F.titulo)}.jpg`); };
}

// ---------- Inicio: tarjeta de lanzamiento ----------
function tarjetaLanzamientoInicio() {
  const proximos = M.proyectos.map(p => ({ p, P: M.publicar && M.publicar[p.id] })).filter(x => x.P && x.P.lanz && x.P.lanz.fecha && diasEntre(new Date(), deStr(x.P.lanz.fecha)) >= -30)
    .sort((a, b) => a.P.lanz.fecha.localeCompare(b.P.lanz.fecha));
  if (!proximos.length) return '';
  return proximos.slice(0, 2).map(({ p, P }) => {
    const f = deStr(P.lanz.fecha); const d = diasEntre(new Date(), f);
    const pend = P.lanz.tareas.filter(t => !t.hecho).sort((a, b) => a.dias - b.dias).slice(0, 4);
    const redes = P.redes.filter(r => !r.publicado && r.fecha && diasEntre(new Date(), deStr(r.fecha)) >= 0 && diasEntre(new Date(), deStr(r.fecha)) <= 7);
    return `<div class="tarjeta lanz-ini" data-pid="${p.id}" style="margin-bottom:18px"><div class="fila sep" style="flex-wrap:wrap"><div><h2 style="margin:0">Lanzamiento</h2><h3 style="margin:6px 0 0">${esc(P.ficha.titulo || p.titulo)}</h3></div>
      <div style="text-align:right"><div class="grande" style="font-size:40px">${d > 0 ? d : d === 0 ? '¡Hoy!' : '✓'}</div><div class="suave" style="font-size:12.5px">${d > 0 ? 'días · ' : ''}${fechaLarga(f)}</div></div></div>
      ${pend.length ? `<div style="margin-top:10px">${pend.map(t => `<div class="fila" style="padding:5px 0;border-bottom:1px solid var(--linea)"><span class="lz-cat c-${esc(t.cat)}">${esc(t.cat)}</span><span style="flex:1">${esc(t.texto)}</span>${sumarDias(f, t.dias) < deStr(diaStr()) ? `<span class="num" style="font-size:12px;color:var(--rojo)">atrasada · ${fechaCorta(diaStr(sumarDias(f, t.dias)))}</span>` : `<span class="suave num" style="font-size:12px">${fechaCorta(diaStr(sumarDias(f, t.dias)))}</span>`}</div>`).join('')}</div>` : ''}
      ${redes.length ? `<p class="suave" style="font-size:12.5px;margin:10px 0 0">Esta semana en redes: ${redes.map(r => `${FORMATOS[r.formato] || ''} ${esc(r.tema)}`).join(' · ')}</p>` : ''}
      <button class="btn peq" data-ir-pub style="margin-top:12px">Abrir Publicar</button></div>`;
  }).join('');
}

// =====================================================================
//  TU MESA: color e icono
// =====================================================================
const ACENTOS = [['#2f5d50', 'Verde'], ['#7a1f3d', 'Vino'], ['#b5536b', 'Rosa'], ['#3d6a8a', 'Azul'], ['#6b4f8a', 'Morado'], ['#c27c4e', 'Teja'], ['#2b2622', 'Tinta']];
function aplicarAcento() {
  const A = M.ajustes; const ac = A.acento || '#2f5d50';
  const r = document.documentElement;
  r.style.setProperty('--acento-base', ac);
  const noche = r.dataset.theme === 'noche';
  r.style.setProperty('--verde', noche ? `color-mix(in srgb, ${ac} 60%, #ffffff)` : ac);
  r.style.setProperty('--verde-claro', noche ? `color-mix(in srgb, ${ac} 28%, #22201c)` : `color-mix(in srgb, ${ac} 14%, #fffdf8)`);
  const logo = $('.rail .logo');
  if (logo) {
    const ic = A.icono || { tipo: 'letra', texto: 'N' };
    logo.style.background = ic.tipo === 'imagen' ? 'transparent' : ac;
    logo.innerHTML = ic.tipo === 'imagen' && ic.img ? `<img src="${ic.img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:11px">` : esc(ic.texto || 'N');
    logo.style.fontStyle = ic.tipo === 'emoji' ? 'normal' : 'italic';
  }
}
function dibujarIcono(ic, color, lado) {
  const cv = document.createElement('canvas'); cv.width = cv.height = lado;
  const g = cv.getContext('2d');
  return new Promise(async (res) => {
    const rr = lado * 0.24;
    g.beginPath(); g.moveTo(rr, 0); g.arcTo(lado, 0, lado, lado, rr); g.arcTo(lado, lado, 0, lado, rr); g.arcTo(0, lado, 0, 0, rr); g.arcTo(0, 0, lado, 0, rr); g.closePath();
    if (ic.tipo === 'imagen' && ic.img) {
      const im = new Image(); await new Promise(r => { im.onload = r; im.onerror = r; im.src = ic.img; });
      g.save(); g.clip(); const k = Math.max(lado / im.width, lado / im.height); g.drawImage(im, (lado - im.width * k) / 2, (lado - im.height * k) / 2, im.width * k, im.height * k); g.restore();
    } else {
      g.fillStyle = color; g.fill();
      g.fillStyle = '#fffdf8'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const t = ic.texto || 'N';
      g.font = ic.tipo === 'emoji' ? `${lado * 0.62}px "Apple Color Emoji","Segoe UI Emoji",sans-serif` : `italic 600 ${lado * (t.length > 1 ? 0.5 : 0.68)}px "Iowan Old Style",Palatino,Georgia,serif`;
      g.fillText(t, lado / 2, lado / 2 + lado * 0.04);
    }
    res(cv);
  });
}
async function aplicarIconoChrome() {
  const ic = M.ajustes.icono; if (!ic) return;
  const datos = {}; const urls = {};
  for (const l of [16, 32, 48, 128]) { const cv = await dibujarIcono(ic, M.ajustes.acento || '#2f5d50', l); datos[l] = cv.getContext('2d').getImageData(0, 0, l, l); if (l === 32 || l === 128) urls[l] = cv.toDataURL('image/png'); }
  await Store.set('mesa:icono', { urls, acento: M.ajustes.acento, icono: ic });
  if (window.Puente) Puente.pedir({ tipo: 'icono', urls });
  const fav = $('link[rel=icon]'); if (fav) fav.href = urls[32];
}
function tarjetaTuMesa() {
  const A = M.ajustes; const ic = A.icono || { tipo: 'letra', texto: 'N' };
  return `<div class="tarjeta" id="aj-tumesa"><h2>Tu Novelia: color e icono</h2>
    <div class="campo"><span>Color</span><div class="fila" style="flex-wrap:wrap">${ACENTOS.map(([c, n]) => `<button class="color-ac${(A.acento || '#2f5d50') === c ? ' on' : ''}" data-ac="${c}" title="${n}" style="background:${c}"></button>`).join('')}
      <label class="fila suave" style="font-size:12.5px;gap:6px;margin-left:6px">Otro <input type="color" id="tm-color" value="${A.acento || '#2f5d50'}" style="width:36px;height:28px;border:0;background:none;padding:0"></label></div></div>
    <div class="campo"><span>Icono (en la barra de Chrome y arriba a la izquierda)</span>
      <div class="fila" style="flex-wrap:wrap"><div class="segmentos peq">${[['letra', 'Letra'], ['emoji', 'Emoji'], ['imagen', 'Imagen']].map(([k, t]) => `<button data-it="${k}"${ic.tipo === k ? ' class="on"' : ''}>${t}</button>`).join('')}</div>
        ${ic.tipo === 'imagen' ? '<button class="btn peq" id="tm-img">Elegir imagen…</button>' : `<input class="txt" id="tm-txt" value="${esc(ic.texto || (ic.tipo === 'emoji' ? '✍️' : 'N'))}" maxlength="${ic.tipo === 'emoji' ? 4 : 2}" style="width:70px;text-align:center;font-size:18px">`}
        ${ic.tipo === 'emoji' ? ['✍️', '📖', '🖋️', '🌊', '💌', '☕', '🌙', '🍂'].map(e => `<span class="chip" data-emo="${e}" style="font-size:16px">${e}</span>`).join('') : ''}
        <canvas id="tm-prev" width="64" height="64" style="width:40px;height:40px;margin-left:8px"></canvas></div></div>
    <p class="tenue" style="font-size:12.5px;margin:0">El icono del Dock lo pone el sistema al instalar la app; este cambia el de la ventana y el del ayudante en Chrome.</p></div>`;
}
function enlazarTuMesa(cont) {
  const A = M.ajustes; A.icono = A.icono || { tipo: 'letra', texto: 'N' };
  const prev = async () => { const cv = await dibujarIcono(A.icono, A.acento || '#2f5d50', 64); const p = $('#tm-prev', cont); if (p) p.getContext('2d').clearRect(0, 0, 64, 64), p.getContext('2d').drawImage(cv, 0, 0); };
  const aplicar = debounce(async () => { guardarMeta(); aplicarAcento(); await aplicarIconoChrome(); prev(); }, 200);
  $$('[data-ac]', cont).forEach(b => b.onclick = () => { A.acento = b.dataset.ac; aplicar(); $$('[data-ac]', cont).forEach(x => x.classList.toggle('on', x === b)); $('#tm-color', cont).value = A.acento; });
  $('#tm-color', cont).oninput = (e) => { A.acento = e.target.value; $$('[data-ac]', cont).forEach(x => x.classList.remove('on')); aplicar(); };
  $$('[data-it]', cont).forEach(b => b.onclick = () => { A.icono = { tipo: b.dataset.it, texto: b.dataset.it === 'emoji' ? '✍️' : b.dataset.it === 'letra' ? 'N' : '', img: A.icono.img }; guardarMeta(); VISTAS.ajustes(cont).then(() => { aplicar(); $('#aj-tumesa', cont).scrollIntoView({ block: 'center' }); }); });
  if ($('#tm-txt', cont)) $('#tm-txt', cont).oninput = (e) => { A.icono.texto = e.target.value.trim() || 'N'; aplicar(); };
  $$('[data-emo]', cont).forEach(x => x.onclick = () => { A.icono.texto = x.dataset.emo; $('#tm-txt', cont).value = x.dataset.emo; aplicar(); });
  if ($('#tm-img', cont)) $('#tm-img', cont).onclick = async () => { const id = await elegirImagen(); if (!id) return; const im = await leerImagen(id); const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); const i = new Image(); await new Promise(r => { i.onload = r; i.src = im.data; }); const k = Math.max(256 / i.width, 256 / i.height); g.drawImage(i, (256 - i.width * k) / 2, (256 - i.height * k) / 2, i.width * k, i.height * k); A.icono.img = cv.toDataURL('image/png'); Store.remove('mesa:img:' + id); aplicar(); };
  prev();
}

// ---------- enganches con el resto de la app ----------
(function () {
  const ajustesOrig = VISTAS.ajustes;
  VISTAS.ajustes = async (cont) => {
    await ajustesOrig(cont);
    const rej = $('.pagina .rejilla', cont);
    if (rej) { const d = document.createElement('div'); d.innerHTML = tarjetaTuMesa(); rej.insertBefore(d.firstElementChild, rej.children[1]); enlazarTuMesa(cont); }
  };
  const inicioOrig = VISTAS.inicio;
  VISTAS.inicio = (cont) => {
    inicioOrig(cont);
    const html = tarjetaLanzamientoInicio();
    if (html) {
      const d = document.createElement('div'); d.innerHTML = html;
      const ref = $('.pagina > .rejilla', cont);
      [...d.children].forEach(x => $('.pagina', cont).insertBefore(x, ref));
      $$('[data-ir-pub]', cont).forEach(b => b.onclick = () => { const pid = b.closest('[data-pid]').dataset.pid; if (pid !== M.actual) cambiarProyecto(pid); pubTab = 'lanz'; mostrarVista('publicar'); });
    }
  };
})();

// ---------- arranque ----------
(async () => { if (window.NOVELIA_APP) await prepararApp(); await iniciar(); aplicarAcento(); if (window.NOVELIA_APP) despuesDeIniciar(); })();
