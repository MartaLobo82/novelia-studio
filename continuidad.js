'use strict';
// =====================================================================
//  Novelia Studio — Continuidad (Plan › Continuidad) y control de nombres.
//  Siembras: lo que plantas en un capítulo y tiene que volver más tarde.
//  Secretos: quién sabe qué y desde qué capítulo.
//  Sirve para cualquier novela: todo es por proyecto (pid).
// =====================================================================

const siembrasDe = (pid = M.actual) => (M.siembras = M.siembras || []).filter(s => s.pid === pid);
const secretosDe = (pid = M.actual) => (M.secretos = M.secretos || []).filter(s => s.pid === pid);
const numsDe = (txt) => [...new Set(String(txt || '').match(/\d+/g) || [])].map(Number).filter(n => n > 0 && n < 1000);
const numsTxt = (a) => (a || []).join(', ');
const normN = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const capsOrden = (pid = M.actual) => hijos(null, pid).filter(n => n.tipo === 'cap');
function numCap(nodo) {
  if (!nodo) return 0;
  const cap = nodo.tipo === 'esc' ? M.nodos[nodo.padre] : nodo;
  return capsOrden(cap.pid).findIndex(c => c.id === cap.id) + 1;
}
// «Rubén: 25 · Julia: 27 (en voz alta)» → [{quien:'Rubén', cap:25, txt:'Rubén: 25'}, …]
function parsearEnteran(txt) {
  return String(txt || '').split(/\s*[·\n]\s*/).map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/\((\d+)\)/) || s.match(/(\d+)/);
    const quien = s.includes(':') ? s.split(':')[0].trim() : (s.split(/\s+/).find(w => !/^(el|la|los|las|un|una)$/i.test(w)) || '').replace(/[^\p{L}]/gu, '');
    return { quien, cap: m ? Number(m[1]) : '', txt: s };
  });
}
const enteranTxt = (a) => (a || []).map(e => e.txt || `${e.quien}: ${e.cap}`).join(' · ');

// ---------- Plan › Continuidad ----------
let contTab = 'siembras';
function pintarContinuidad(c) {
  const pid = M.actual;
  const S = siembrasDe(), X = secretosDe();
  const total = capsOrden().length;
  c.innerHTML = `<p class="sub" style="margin-top:-12px">Lo que siembras y tiene que volver, y quién sabe qué en cada momento. Mientras escribes, el panel de la escena te avisa de lo que toca en ese capítulo.</p>
    <div class="fila" style="flex-wrap:wrap;margin-bottom:14px">
      <div class="segmentos peq">${[['siembras', `Siembras (${S.length})`], ['secretos', `Secretos (${X.length})`], ['nombres', 'Nombres']].map(([k, t]) => `<button data-ct="${k}"${contTab === k ? ' class="on"' : ''}>${t}</button>`).join('')}</div>
      <span style="flex:1"></span>${contTab !== 'nombres' ? `<button class="btn prim peq" id="ct-nuevo">+ ${contTab === 'siembras' ? 'Siembra' : 'Secreto'}</button>` : ''}</div>
    <div id="ct-cuerpo"></div>`;
  $$('[data-ct]', c).forEach(b => b.onclick = () => { contTab = b.dataset.ct; pintarContinuidad(c); });
  const cuerpo = $('#ct-cuerpo', c);
  const guardar = debounce(() => guardarMeta(), 300);
  const inp = (val, set, ph, cls = 'txt') => { const i = el('input', { class: cls, value: val || '', placeholder: ph }); i.addEventListener('input', () => { set(i.value); guardar(); }); return i; };

  if (contTab === 'nombres') return pintarNombresNovela(cuerpo);
  if ($('#ct-nuevo', c)) $('#ct-nuevo', c).onclick = () => {
    if (contTab === 'siembras') M.siembras.push({ id: uid(), pid, que: '', siembra: [], recoge: [], nota: '', hecho: {} });
    else M.secretos.push({ id: uid(), pid, que: '', saben: '', enteran: [], nota: '' });
    guardarMeta(); pintarContinuidad(c);
    const ins = $$('[data-que]', c); if (ins.length) { ins[ins.length - 1].focus(); ins[ins.length - 1].scrollIntoView({ block: 'center' }); }
  };

  if (contTab === 'siembras') {
    if (!S.length) { cuerpo.innerHTML = '<div class="tarjeta vacio">Nada sembrado todavía.<br><span style="font-size:14px">Una siembra es algo que aparece pronto y tiene que volver: un objeto, una frase, un miedo…</span></div>'; return; }
    const hechas = S.filter(s => [...s.siembra, ...s.recoge].every(n => s.hecho && s.hecho[n])).length;
    cuerpo.append(el('p', { class: 'suave', style: 'margin:0 0 10px' }, `${hechas} de ${S.length} completas. Toca un capítulo para marcarlo como hecho.`));
    S.forEach(s => {
      s.hecho = s.hecho || {};
      const chips = el('div', { class: 'ct-chips' });
      const pintaChips = () => chips.replaceChildren(
        ...s.siembra.map(n => chip(n, 'siembra')), s.recoge.length ? el('span', { class: 'tenue', style: 'margin:0 4px' }, '→') : null, ...s.recoge.map(n => chip(n, 'recoge')));
      const chip = (n, tipo) => el('span', { class: `chip ct-${tipo}${s.hecho[n] ? ' on' : ''}${n > total && total ? ' fuera' : ''}`, title: `${tipo === 'siembra' ? 'Se siembra' : 'Vuelve'} en el capítulo ${n}${s.hecho[n] ? ' · hecho' : ''}`,
        onclick: () => { s.hecho[n] = !s.hecho[n]; guardarMeta(); pintaChips(); } }, `${s.hecho[n] ? '✓ ' : ''}${n}`);
      pintaChips();
      const siem = inp(numsTxt(s.siembra), v => { s.siembra = numsDe(v); pintaChips(); }, '1, 3');
      const rec = inp(numsTxt(s.recoge), v => { s.recoge = numsDe(v); pintaChips(); }, '18, 26');
      const que = inp(s.que, v => { s.que = v; }, 'La bufanda roja'); que.dataset.que = 1;
      cuerpo.append(el('div', { class: 'tarjeta ct-item' },
        el('div', { class: 'ct-fila' },
          el('label', { class: 'campo', style: 'flex:2;min-width:180px' }, el('span', {}, 'Qué'), que),
          el('label', { class: 'campo', style: 'width:110px' }, el('span', {}, 'Se siembra en'), siem),
          el('label', { class: 'campo', style: 'width:130px' }, el('span', {}, 'Vuelve en'), rec),
          el('button', { class: 'icono', title: 'Borrar', onclick: () => { M.siembras = M.siembras.filter(x => x !== s); guardarMeta(); pintarContinuidad(c); aviso('Siembra borrada', { texto: 'Deshacer', fn: () => { M.siembras.push(s); guardarMeta(); pintarContinuidad(c); } }); } }, '✕')),
        el('div', { class: 'ct-fila' }, el('label', { class: 'campo', style: 'flex:1;margin:0' }, el('span', {}, 'Cómo / nota'), inp(s.nota, v => { s.nota = v; }, 'Primero la ve, luego la lleva puesta…')), chips)));
    });
  } else {
    if (!X.length) { cuerpo.innerHTML = '<div class="tarjeta vacio">Sin secretos apuntados.<br><span style="font-size:14px">Apunta lo que unos personajes saben y otros no, y en qué capítulo se enteran.</span></div>'; return; }
    X.forEach(s => {
      const que = inp(s.que, v => { s.que = v; }, 'Mateo es el alcalde'); que.dataset.que = 1;
      const ent = inp(enteranTxt(s.enteran), v => { s.enteran = parsearEnteran(v); pinta(); }, 'Julia: 5 · Rubén: 25');
      const prev = el('div', { class: 'ct-chips' });
      const pinta = () => prev.replaceChildren(...s.enteran.map(e => el('span', { class: 'chip ct-secreto' + (e.cap === '' ? ' fuera' : '') }, e.quien || '?', e.cap !== '' ? el('b', {}, ' · ' + e.cap) : ' · ¿cap.?')));
      pinta();
      cuerpo.append(el('div', { class: 'tarjeta ct-item' },
        el('div', { class: 'ct-fila' },
          el('label', { class: 'campo', style: 'flex:1;min-width:200px' }, el('span', {}, 'Secreto o información'), que),
          el('button', { class: 'icono', title: 'Borrar', onclick: () => { M.secretos = M.secretos.filter(x => x !== s); guardarMeta(); pintarContinuidad(c); aviso('Secreto borrado', { texto: 'Deshacer', fn: () => { M.secretos.push(s); guardarMeta(); pintarContinuidad(c); } }); } }, '✕')),
        el('div', { class: 'rejilla r2', style: 'gap:0 14px' },
          el('label', { class: 'campo' }, el('span', {}, 'Lo saben desde el principio'), inp(s.saben, v => { s.saben = v; }, 'Mateo, las amigas')),
          el('label', { class: 'campo' }, el('span', {}, 'Quién se entera y en qué capítulo'), ent)),
        prev,
        el('label', { class: 'campo', style: 'margin:8px 0 0' }, el('span', {}, 'Ojo / para no meter la pata'), inp(s.nota, v => { s.nota = v; }, 'Nadie puede llamarle «alcalde» delante de ella'))));
    });
  }
}

// ---------- avisos en el panel de la escena ----------
function cajaContinuidad(n) {
  const N = numCap(n); if (!N) return '';
  const cap = n.tipo === 'esc' ? M.nodos[n.padre] : n;
  const S = siembrasDe(cap.pid), X = secretosDe(cap.pid);
  if (!S.length && !X.length) return '';
  const e = cap.e || {};
  const pov = cap.pov === 'dual' ? '' : (M.personajes.find(p => p.id === cap.pov) || null);
  const quienes = normN([e.personajes || '', pov ? nombrePj(pov) : '', cap.pov === 'dual' ? hijos(null, cap.pid).length && M.personajes.filter(p => p.pid === cap.pid && p.f.rol === 'Protagonista').map(nombrePj).join(' ') : ''].join(' '));
  const sale = (quien) => {
    const ws = normN(quien).split(/[^a-zñ0-9]+/).filter(w => w.length > 2 && !['las', 'los', 'del', 'que'].includes(w));
    return ws.length && (quienes ? ws.some(w => new RegExp(`(^|[^a-zñ])${w}`).test(quienes)) : false);
  };
  const aqui = S.filter(s => s.siembra.includes(N)), vuelve = S.filter(s => s.recoge.includes(N));
  const revela = [], noSaben = [], visto = new Set();
  X.forEach(s => (s.enteran || []).slice().sort((a, b) => a.cap - b.cap).forEach(en => {
    const k = s.id + '|' + normN(en.quien);
    if (en.cap === N) { revela.push({ s, en }); visto.add(k); }
    else if (en.cap > N && !visto.has(k) && sale(en.quien)) { noSaben.push({ s, en }); visto.add(k); }
  }));
  const esPov = (q) => pov && normN(nombrePj(pov)).split(' ')[0] === normN(q).split(' ')[0];
  noSaben.sort((a, b) => (esPov(b.en.quien) - esPov(a.en.quien)) || a.en.cap - b.en.cap);
  if (!aqui.length && !vuelve.length && !revela.length && !noSaben.length) return '';
  const fila = (s, tipo) => `<label class="ct-aviso"><input type="checkbox" data-sh="${s.id}" data-n="${N}"${s.hecho && s.hecho[N] ? ' checked' : ''}><span><b>${tipo}</b> ${esc(s.que)}${s.nota ? `<small>${esc(s.nota)}</small>` : ''}</span></label>`;
  return `<details class="caja-esc caja-cont" open><summary>Continuidad del capítulo ${N}</summary>
    ${aqui.map(s => fila(s, 'Siembra:')).join('')}${vuelve.map(s => fila(s, 'Vuelve:')).join('')}
    ${revela.map(({ s, en }) => `<div class="ct-aviso"><span>💡</span><span><b>Se entera aquí ${esc(en.quien)}:</b> ${esc(s.que)}</span></div>`).join('')}
    ${(() => { const f = ({ s, en }) => `<div class="ct-aviso ojo"><span>⚠</span><span><b>${esc(en.quien)} todavía no sabe:</b> ${esc(s.que)} <small>Se entera en el ${en.cap}.${s.nota ? ' ' + esc(s.nota) : ''}</small></span></div>`;
      return noSaben.slice(0, 3).map(f).join('') + (noSaben.length > 3 ? `<details class="ct-mas"><summary>${plural(noSaben.length - 3, 'secreto más', 'secretos más')} que aún no saben</summary>${noSaben.slice(3).map(f).join('')}</details>` : ''); })()}
    <a href="#" class="tenue" style="font-size:12px" data-ir-cont>Ver en Plan › Continuidad</a></details>`;
}
// Enlazar los checkbox del panel (se llama tras pintar el panel)
function enlazarContinuidad(c) {
  $$('[data-sh]', c).forEach(ch => ch.onchange = () => { const s = M.siembras.find(x => x.id === ch.dataset.sh); if (!s) return; s.hecho = s.hecho || {}; s.hecho[ch.dataset.n] = ch.checked; guardarMeta(); });
  $$('[data-ir-cont]', c).forEach(a => a.onclick = (e) => { e.preventDefault(); planTab = 'continuidad'; mostrarVista('plan'); });
}

// =====================================================================
//  CONTROL DE NOMBRES
// =====================================================================
const NOMBRES_COMUNES = new Set(['dios', 'navidad', 'nochebuena', 'nochevieja', 'reyes', 'papa', 'noel', 'año', 'nuevo', 'señor', 'señora', 'don', 'doña', 'san', 'santa', 'sr', 'sra', 'ok', 'whatsapp', 'instagram', 'google', 'internet', 'semana', 'santos', 'inocentes', 'magos', 'lotería', 'cabalgata', 'ayuntamiento']);
function formasNombres(pid = M.actual) {
  const m = {};
  M.personajes.filter(p => p.pid === pid).forEach(p => [p.f.nombre, ...(p.f.apodos || '').split(/[,;]/)].forEach(n => String(n || '').replace(/[«»"“”()]/g, ' ').split(/\s+/).forEach(w => { const x = w.replace(/[^\p{L}'-]/gu, ''); if (x.length > 1) (m[normN(x)] = m[normN(x)] || new Set()).add(x); })));
  return m;
}
function nombresConocidos(pid = M.actual) {
  const set = new Set();
  M.personajes.filter(p => p.pid === pid).forEach(p => {
    [p.f.nombre, ...(p.f.apodos || '').split(/[,;]/)].forEach(n => String(n || '').replace(/[«»"“”()]/g, ' ').split(/\s+/).forEach(w => { const x = w.replace(/[^\p{L}.'-]/gu, ''); if (x.length > 1) set.add(normN(x.replace(/\.$/, ''))); }));
  });
  const P = M.proyectos.find(p => p.id === pid);
  (P && P.nombresOk || []).forEach(w => set.add(normN(w)));
  return set;
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// Palabras con mayúscula en mitad de frase que no son de tu biblia, y variantes de nombres conocidos.
function revisarNombres(texto, pid = M.actual) {
  const conocidos = nombresConocidos(pid), formas = formasNombres(pid);
  const T_ = self.TESAURO;
  const minus = new Set((texto.match(/(?<![\p{L}])\p{Ll}[\p{L}]+/gu) || []).map(normN));
  const raros = {}, variantes = {};
  const re = /([.!?¿¡…«“"—\n]\s*|^\s*)?(?<![\p{L}])(\p{Lu}[\p{Ll}]+(?:\.)?)(?![\p{L}])/gu;
  let m;
  while ((m = re.exec(texto))) {
    if (m[1] !== undefined) continue; // principio de frase o de diálogo
    const w = m[2].replace(/\.$/, ''), k = normN(w);
    if (formas[k] && !formas[k].has(w)) { const v = variantes[w] = variantes[w] || { w, sug: [...formas[k]][0], n: 0, exacta: true }; v.n++; continue; } // mismo nombre con otra tilde
    if (w.length < 3 || conocidos.has(k) || NOMBRES_COMUNES.has(k) || minus.has(k)) continue;
    const larga = [...conocidos].find(c => c.length >= 4 && k.length - c.length >= 2 && k.length - c.length <= 5 && k.startsWith(c));
    if (larga) { const v = variantes[w] = variantes[w] || { w, sug: larga, n: 0 }; v.n++; continue; } // Encarnación por Encarna
    if (T_ && T_.w[k]) continue;
    let mejor = null;
    for (const c of conocidos) { if (c.length < 4) continue; const d = lev(k, c); if (d === 1 || (d === 2 && c.length >= 8)) { mejor = c; break; } }
    if (mejor) { const v = variantes[w] = variantes[w] || { w, sug: mejor, n: 0 }; v.n++; }
    else raros[w] = (raros[w] || 0) + 1;
  }
  // nombres con punto escritos sin él (Mr. Darcy → Mr Darcy)
  M.personajes.filter(p => p.pid === pid).forEach(p => {
    const nom = (p.f.nombre || '').trim();
    if (!/\.\s/.test(nom)) return;
    const sin = nom.replace(/\.(\s)/g, '$1');
    const n = (texto.match(new RegExp(`(?<![\\p{L}])${sin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'gu')) || []).length;
    if (n) variantes[sin] = { w: sin, sug: nom, n, exacta: true };
  });
  const sugerencia = (v) => {
    if (v.exacta) return v.sug;
    const p = M.personajes.filter(x => x.pid === pid).map(nombrePj).flatMap(x => x.split(/\s+/)).find(x => normN(x) === v.sug);
    return p || v.sug;
  };
  return {
    raros: Object.entries(raros).sort((a, b) => b[1] - a[1]),
    variantes: Object.values(variantes).map(v => ({ ...v, sug: sugerencia(v) })),
  };
}
function marcarNombreOk(w, pid = M.actual) {
  const P = M.proyectos.find(p => p.id === pid); P.nombresOk = [...new Set([...(P.nombresOk || []), w])]; guardarMeta();
}
// Para el panel Revisión (texto del capítulo abierto)
function cajaNombres(texto) {
  const r = revisarNombres(texto);
  const sinTesauro = !self.TESAURO;
  if (sinTesauro) cargarTesauro().then(() => { if (pestanaLateral === 'revision') renderLateral(); }).catch(() => {});
  if (!r.raros.length && !r.variantes.length) return `<h2>Nombres</h2><p class="tenue" style="margin:0 0 16px">${sinTesauro ? 'Cargando diccionario…' : 'Todos los nombres están en tu biblia.'}</p>`;
  return `<h2>Nombres</h2>
    ${r.variantes.length ? `<ul class="lista-rev">${r.variantes.map(v => `<li data-buscar="${esc(v.w)}"><span>¿<b>${esc(v.w)}</b>? Quizá «${esc(v.sug)}»</span><span>${v.n}</span></li>`).join('')}</ul>` : ''}
    ${r.raros.length ? `<p class="tenue" style="font-size:12px;margin:0 0 4px">No están en tu biblia de personajes:</p><ul class="lista-rev">${r.raros.slice(0, 20).map(([w, n]) => `<li data-buscar="${esc(w)}"><span>${esc(w)}</span><span>${n} <button class="icono" data-nok="${esc(w)}" title="Es correcto: no avisar más en esta novela" style="padding:0 3px">✓</button></span></li>`).join('')}</ul>` : ''}`;
}
function enlazarNombres(c) {
  $$('[data-nok]', c).forEach(b => b.onclick = (e) => { e.stopPropagation(); marcarNombreOk(b.dataset.nok); aviso(`«${b.dataset.nok}» es correcto: no aviso más`); renderLateral(); });
  $$('li[data-buscar]', c).forEach(li => li.onclick = () => buscarEnEditor(li.dataset.buscar));
}
let buscarIdx = {};
function buscarEnEditor(w) {
  const ed = editor(); const mapa = mapaTexto(ed);
  const re = new RegExp(`(?<![\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'gu');
  const pos = []; let m; while ((m = re.exec(mapa.texto))) pos.push([m.index, m.index + m[0].length]);
  if (!pos.length) return;
  const i = (buscarIdx[w] = ((buscarIdx[w] ?? -1) + 1) % pos.length);
  const rg = rango(mapa, pos[i][0], pos[i][1]); if (!rg) return;
  const s = getSelection(); s.removeAllRanges(); s.addRange(rg);
  const r = rg.getBoundingClientRect(), hw = $('#hoja-wrap');
  hw.scrollTop += r.top - hw.getBoundingClientRect().top - hw.clientHeight / 3;
}
// Toda la novela
async function pintarNombresNovela(c) {
  c.innerHTML = '<div class="tarjeta vacio">Leyendo la novela…</div>';
  try { await cargarTesauro(); } catch (e) {}
  const caps = estructuraNovela().filter(x => !x.parte);
  const porW = {};
  caps.forEach((cp, i) => {
    const t = htmlATexto(cp.parrafos.map(x => `<p>${x}</p>`).join(''));
    const r = revisarNombres(t);
    r.variantes.forEach(v => { const k = 'v:' + v.w; const o = porW[k] = porW[k] || { w: v.w, sug: v.sug, tipo: 'v', caps: [] }; o.caps.push([cp.id, i + 1, v.n]); });
    r.raros.forEach(([w, n]) => { const k = 'r:' + w; const o = porW[k] = porW[k] || { w, tipo: 'r', caps: [] }; o.caps.push([cp.id, i + 1, n]); });
  });
  const lista = Object.values(porW).sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'v' ? -1 : 1) || b.caps.length - a.caps.length);
  const conocidos = nombresConocidos();
  if (!lista.length) { c.innerHTML = `<div class="tarjeta vacio">${caps.some(cp => cp.parrafos.length) ? 'Todo en orden: los nombres que usas están en tu biblia.' : 'Cuando escribas, aquí verás los nombres que no están en tu biblia y los que parecen mal escritos.'}</div>`; return; }
  c.innerHTML = `<p class="suave" style="margin:0 0 10px">Palabras con mayúscula en mitad de frase que no están en tu biblia (${plural(conocidos.size, 'nombre conocido', 'nombres conocidos')}), y las que se parecen a un nombre tuyo. Marca ✓ las que están bien y no volverán a salir en esta novela.</p>
    <div class="tarjeta" style="padding:6px 10px"><table class="tabla"><thead><tr><th>Palabra</th><th>Dónde</th><th></th></tr></thead><tbody>
    ${lista.map(o => `<tr><td><b>${esc(o.w)}</b>${o.tipo === 'v' ? `<div style="color:var(--rojo);font-size:12.5px">¿Querías decir «${esc(o.sug)}»?</div>` : ''}</td>
      <td>${o.caps.map(([id, n, k]) => `<span class="chip" data-ircap="${id}" data-w="${esc(o.w)}">cap. ${n}${k > 1 ? ' ×' + k : ''}</span>`).join('')}</td>
      <td>${o.tipo === 'r' ? `<button class="btn peq" data-nok="${esc(o.w)}">✓ Es correcto</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
  $$('[data-nok]', c).forEach(b => b.onclick = () => { marcarNombreOk(b.dataset.nok); pintarNombresNovela(c); });
  $$('[data-ircap]', c).forEach(b => b.onclick = () => { mostrarVista('escribir'); abrirNodo(b.dataset.ircap); setTimeout(() => { buscarIdx[b.dataset.w] = -1; buscarEnEditor(b.dataset.w); }, 100); });
}
