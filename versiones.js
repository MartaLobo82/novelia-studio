'use strict';
// =====================================================================
//  Novelia Studio — Versiones de cada capítulo o escena y dictado por voz.
//  Versiones: se guardan en «mesa:v:<id>» (fuera de los metadatos).
//  Se hace una foto sola al abrir un texto si ha cambiado desde la última
//  (como mucho una cada 6 horas) y siempre antes de recuperar otra.
// =====================================================================

const MAX_VERSIONES = 30;
const versionesDe = async (id) => (await Store.get('mesa:v:' + id)) || [];
async function guardarVersion(id, nota = '', forzar = false) {
  const html = T[id] || '';
  const txt = htmlATexto(html).trim();
  if (!txt) return false;
  const vs = await versionesDe(id);
  const ult = vs[0];
  if (ult && ult.html === html) { if (forzar && nota && !ult.nota) { ult.nota = nota; await Store.set('mesa:v:' + id, vs); } return false; }
  if (!forzar && ult && Date.now() - ult.fecha < 6 * 3600000) return false;
  vs.unshift({ fecha: Date.now(), html, palabras: Analisis.contar(txt), nota });
  // se conservan siempre las que tienen nota
  const conNota = vs.filter(v => v.nota), sin = vs.filter(v => !v.nota);
  const quedan = [...conNota, ...sin].slice(0, MAX_VERSIONES).sort((a, b) => b.fecha - a.fecha);
  await Store.set('mesa:v:' + id, quedan);
  return true;
}
// Foto automática al abrir (la de cómo estaba antes de seguir escribiendo)
function fotoAlAbrir(id) { if (id && T[id]) guardarVersion(id).catch(() => {}); }

function palabrasDiff(a, b) {
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/);
  const n = A.length, m = B.length;
  if (n * m > 9e6) return null;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  const push = (t, s) => { const u = out[out.length - 1]; if (u && u.t === t) u.s += s; else out.push({ t, s }); };
  while (i < n && j < m) { if (A[i] === B[j]) { push('=', A[i]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) { push('-', A[i]); i++; } else { push('+', B[j]); j++; } }
  while (i < n) push('-', A[i++]); while (j < m) push('+', B[j++]);
  return out;
}
const textoParrafos = (html) => parrafosDe(html).map(p => { const d = document.createElement('div'); d.innerHTML = p; return d.textContent; }).join('\n\n');

async function pintarVersiones(c, n) {
  if (!n) { c.innerHTML = '<div class="vacio">Elige un capítulo o una escena</div>'; return; }
  guardarTexto.ya();
  const vs = await versionesDe(n.id);
  c.innerHTML = `<p class="suave" style="margin-top:0;font-size:13px">Fotos de este texto. Se hace una sola cada vez que vuelves a él tras unas horas, y puedes hacerla tú antes de reescribir.</p>
    <div class="fila" style="margin-bottom:12px"><input class="txt" id="vr-nota" placeholder="Nota (p. ej. Antes de quitar a Rubén)"><button class="btn prim peq" id="vr-ok">Guardar</button></div>
    ${vs.length ? vs.map((v, i) => `<div class="vr" data-i="${i}"><div><b>${new Date(v.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</b> <span class="tenue num">· ${fmt(v.palabras)} palabras</span>${v.nota ? `<div class="vr-nota">${esc(v.nota)}</div>` : ''}</div>
      <div class="fila" style="gap:4px;margin-top:4px"><button class="btn peq" data-ver="${i}">Comparar</button><button class="btn peq" data-rec="${i}">Recuperar</button><button class="icono" data-borra="${i}" title="Borrar">✕</button></div></div>`).join('') : '<div class="vacio">Todavía no hay versiones de este texto.</div>'}`;
  $('#vr-ok', c).onclick = async () => {
    const ok = await guardarVersion(n.id, $('#vr-nota', c).value.trim() || 'Guardada a mano', true);
    aviso(ok ? 'Versión guardada' : (T[n.id] ? 'Ya estaba guardada tal cual' : 'No hay texto que guardar'));
    pintarVersiones(c, n);
  };
  $$('[data-borra]', c).forEach(b => b.onclick = async () => { vs.splice(+b.dataset.borra, 1); await Store.set('mesa:v:' + n.id, vs); pintarVersiones(c, n); });
  $$('[data-rec]', c).forEach(b => b.onclick = async () => {
    const v = vs[+b.dataset.rec];
    if (!(await preguntar('¿Recuperar esta versión?', `Vuelve el texto del ${new Date(v.fecha).toLocaleString('es-ES')}. Lo que tienes ahora se guarda antes como versión, así que no pierdes nada.`, 'Recuperar'))) return;
    await guardarVersion(n.id, 'Antes de recuperar otra versión', true);
    T[n.id] = v.html; await Store.set('mesa:t:' + n.id, v.html);
    n.palabras = v.palabras; guardarMeta();
    nodoAbierto = null; abrirNodo(n.id); cambiarPestana('versiones');
    aviso('Versión recuperada');
  });
  $$('[data-ver]', c).forEach(b => b.onclick = () => {
    const v = vs[+b.dataset.ver];
    const d = palabrasDiff(textoParrafos(v.html), textoParrafos(T[n.id] || ''));
    const cuerpo = d ? d.map(x => x.t === '=' ? esc(x.s) : x.t === '+' ? `<ins>${esc(x.s)}</ins>` : `<del>${esc(x.s)}</del>`).join('').replace(/\n/g, '<br>') : 'El texto es demasiado largo para compararlo.';
    const quit = d ? d.filter(x => x.t === '-').reduce((a, x) => a + Analisis.contar(x.s), 0) : 0, pus = d ? d.filter(x => x.t === '+').reduce((a, x) => a + Analisis.contar(x.s), 0) : 0;
    modal(`<h3>Qué ha cambiado</h3><p class="suave" style="margin-top:-8px;font-size:13px">De la versión del ${new Date(v.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })} a lo que tienes ahora: <ins>+${fmt(pus)}</ins> <del>−${fmt(quit)}</del> palabras.</p><div class="vr-diff">${cuerpo}</div><div class="pie"><button class="btn" data-cerrar>Cerrar</button></div>`, { ancho: 760 });
  });
}

// =====================================================================
//  DICTADO
// =====================================================================
const RECO = window.SpeechRecognition || window.webkitSpeechRecognition;
let dictando = null;
const SIGNOS = [
  [/\s*\bpunto y aparte\b\s*/gi, '.¶'], [/\s*\b(nuevo párrafo|nueva línea)\b\s*/gi, '¶'], [/\s*\bpuntos suspensivos\b/gi, '…'], [/\s*\bpunto y coma\b/gi, ';'], [/\s*\bpunto y seguido\b/gi, '.'],
  [/\s*\bdos puntos\b/gi, ':'], [/\s*\bpunto\b/gi, '.'], [/\s*\bcoma\b/gi, ','],
  [/\b(abre|abrir) (interrogación|pregunta)\s*/gi, '¿'], [/\s*\b(cierra|cerrar) (interrogación|pregunta)\b/gi, '?'],
  [/\b(abre|abrir) exclamación\s*/gi, '¡'], [/\s*\b(cierra|cerrar) exclamación\b/gi, '!'],
  [/\b(abre|abrir) comillas\s*/gi, '«'], [/\s*\b(cierra|cerrar) comillas\b/gi, '»'], [/\s*\braya\b\s*/gi, ' —'],
];
function puntuar(t, antes) {
  SIGNOS.forEach(([re, s]) => { t = t.replace(re, s); });
  t = t.replace(/\s+([.,;:…?!»])/g, '$1').replace(/([¿¡«])\s+/g, '$1').trim();
  // mayúscula tras fin de frase, al empezar párrafo o tras raya inicial
  const cierre = !antes || /[.?!…¶]\s*$/.test(antes) || /^\s*—?\s*$/.test(antes);
  if (cierre) t = t.replace(/^([¿¡«—\s]*)(\p{Ll})/u, (m, a, b) => a + b.toUpperCase());
  t = t.replace(/([.?!…¶]\s*[¿¡«—]?\s*)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
  return t;
}
function textoAntesDelCursor() {
  const s = getSelection(); if (!s.rangeCount) return '';
  const r = s.getRangeAt(0).cloneRange(); const p = r.startContainer.nodeType === 3 ? r.startContainer.parentElement.closest('p') : r.startContainer.closest && r.startContainer.closest('p');
  if (!p) return '';
  r.setStart(p, 0); return r.toString();
}
function insertarDictado(t) {
  const ed = editor(); ed.focus();
  const antes = textoAntesDelCursor();
  let txt = puntuar(t, antes);
  const partes = txt.split('¶');
  partes.forEach((p, i) => {
    if (i > 0) document.execCommand('insertParagraph');
    let x = p.trim(); if (!x) return;
    const prev = i === 0 ? antes : '';
    if (prev && !/[\s—«¿¡(]$/.test(prev) && !/^[.,;:…?!»]/.test(x)) x = ' ' + x;
    document.execCommand('insertText', false, x);
  });
}
function alternarDictado() {
  if (!RECO) { aviso('Este navegador no deja dictar. En el iPhone usa el micrófono del teclado.'); return; }
  if (dictando) { dictando.parar = true; dictando.r.stop(); return; }
  if (!nodoAbierto) { aviso('Abre un capítulo para dictar'); return; }
  const r = new RECO(); r.lang = 'es-ES'; r.continuous = true; r.interimResults = true;
  dictando = { r, parar: false };
  const b = $('#btn-dictar'); b.classList.add('on', 'grabando');
  const prov = $('#dictado-prov'); prov.textContent = 'Te escucho… di «coma», «punto», «punto y aparte», «raya», «abre interrogación»…'; prov.classList.add('on');
  const ed = editor(); if (document.activeElement !== ed) { ed.focus(); const s = getSelection(); s.selectAllChildren(ed); s.collapseToEnd(); }
  r.onresult = (e) => {
    let provisional = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) insertarDictado(res[0].transcript); else provisional += res[0].transcript;
    }
    prov.textContent = provisional || '…';
  };
  r.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { aviso('Necesito permiso para usar el micrófono'); dictando.parar = true; } };
  r.onend = () => {
    if (dictando && !dictando.parar) { try { r.start(); return; } catch (err) {} }
    dictando = null; b.classList.remove('on', 'grabando'); prov.classList.remove('on');
  };
  try { r.start(); } catch (err) { dictando = null; b.classList.remove('on', 'grabando'); prov.classList.remove('on'); aviso('No he podido abrir el micrófono'); }
}
