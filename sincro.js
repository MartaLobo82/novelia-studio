'use strict';
// =====================================================================
//  Novelia Studio — Sincronización con Google Drive.
//  Todo se guarda en un archivo «novelia.json» dentro de la carpeta
//  privada de la app en tu Drive (appDataFolder): no se ve entre tus
//  archivos y ninguna otra app puede leerlo.
//  Las versiones de los capítulos se quedan en cada aparato.
// =====================================================================

const SINCRO_CLIENT_ID = ''; // se puede dejar fijo aquí; si no, se pega en Ajustes
const SCOPE_DRIVE = 'https://www.googleapis.com/auth/drive.appdata';
const NO_SINCRO = (k) => k === 'mesa:inbox' || k === 'mesa:ultimaCopia' || k.startsWith('mesa:v:') || k === 'mesa:vista';
const Sincro = {
  e: (() => { try { return JSON.parse(localStorage.getItem('novelia:sincro')) || {}; } catch (e) { return {}; } })(),
  guardar() { try { localStorage.setItem('novelia:sincro', JSON.stringify(this.e)); } catch (e) {} },
  get clientId() { return SINCRO_CLIENT_ID || this.e.clientId || ''; },
  token: null, caduca: 0, ocupado: false, aplicando: false, estado: '',
};
if (!Sincro.e.disp) { Sincro.e.disp = uid(); Sincro.guardar(); }
try { const t = JSON.parse(localStorage.getItem('novelia:token')); if (t && t.caduca > Date.now() + 60000) { Sincro.token = t.token; Sincro.caduca = t.caduca; } } catch (e) {}

// Marca cambios locales: solo si lo guardado es distinto de lo último sincronizado
const huella = (v) => { const s = JSON.stringify(v === undefined ? null : v); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + s.length.toString(36); };
Sincro.H = (() => { try { return JSON.parse(localStorage.getItem('novelia:sincroH')) || {}; } catch (e) { return {}; } })();
const guardarHuellas = (datos) => { Sincro.H = {}; Object.entries(datos).forEach(([k, v]) => { Sincro.H[k] = huella(v); }); try { localStorage.setItem('novelia:sincroH', JSON.stringify(Sincro.H)); } catch (e) {} };
['set', 'remove'].forEach(f => {
  const orig = Store[f].bind(Store);
  Store[f] = async (k, v, ...r) => {
    const x = await orig(k, v, ...r);
    if (!Sincro.aplicando && !NO_SINCRO(k) && Sincro.e.conectado) {
      const h = f === 'remove' ? undefined : huella(v);
      if (Sincro.H[k] !== h) { if (!Sincro.e.sucio) { Sincro.e.sucio = Date.now(); Sincro.guardar(); } subirPronto(); }
    }
    return x;
  };
});

function cargarGIS() {
  if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = res; s.onerror = () => rej(new Error('sin conexión')); document.head.appendChild(s); });
}
let tokenClient = null, esperandoToken = null;
async function pedirToken(interactivo) {
  if (Sincro.token && Sincro.caduca > Date.now() + 60000) return Sincro.token;
  if (!Sincro.clientId) throw new Error('falta-id');
  await cargarGIS();
  if (!tokenClient) tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: Sincro.clientId, scope: SCOPE_DRIVE,
    callback: (r) => { const w = esperandoToken; esperandoToken = null; if (!w) return; if (r.error) w.rej(new Error(r.error)); else { Sincro.token = r.access_token; Sincro.caduca = Date.now() + (r.expires_in || 3600) * 1000; try { localStorage.setItem('novelia:token', JSON.stringify({ token: Sincro.token, caduca: Sincro.caduca })); } catch (e) {} w.res(Sincro.token); } },
    error_callback: (e) => { const w = esperandoToken; esperandoToken = null; if (w) w.rej(new Error(e && e.type || 'cancelado')); },
  });
  return new Promise((res, rej) => { esperandoToken = { res, rej }; tokenClient.requestAccessToken({ prompt: interactivo ? 'consent' : '' }); });
}
async function drive(url, opts = {}) {
  const t = await pedirToken(false);
  const r = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + t, ...(opts.headers || {}) } });
  if (r.status === 401) { Sincro.token = null; localStorage.removeItem('novelia:token'); throw new Error('token'); }
  if (!r.ok) throw new Error('drive ' + r.status);
  return r;
}
async function archivoRemoto() {
  const r = await drive("https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'novelia.json'&fields=files(id,modifiedTime,appProperties)&orderBy=modifiedTime%20desc");
  const j = await r.json(); return (j.files || [])[0] || null;
}
async function datosLocales() {
  guardarTexto.ya(); await chrome.storage.local.set({ 'mesa:meta': M });
  const todo = await chrome.storage.local.get(null);
  Object.keys(todo).forEach(k => { if (NO_SINCRO(k)) delete todo[k]; });
  return todo;
}
async function subir(remoto) {
  const fecha = new Date().toISOString();
  const datos = await datosLocales();
  const cuerpo = JSON.stringify({ app: 'novelia-studio', version: 3, fecha, disp: Sincro.e.disp, datos });
  const meta = { name: 'novelia.json', appProperties: { fecha, disp: Sincro.e.disp } };
  const limite = 'novelia' + uid();
  const multi = `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(remoto ? { appProperties: meta.appProperties } : { ...meta, parents: ['appDataFolder'] })}\r\n--${limite}\r\nContent-Type: application/json\r\n\r\n${cuerpo}\r\n--${limite}--`;
  const url = remoto ? `https://www.googleapis.com/upload/drive/v3/files/${remoto.id}?uploadType=multipart` : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  await drive(url, { method: remoto ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${limite}` }, body: multi });
  Sincro.e.base = fecha; Sincro.e.sucio = 0; Sincro.e.ultima = Date.now(); Sincro.guardar(); guardarHuellas(datos);
}
async function aplicarRemoto(remoto) {
  const r = await drive(`https://www.googleapis.com/drive/v3/files/${remoto.id}?alt=media`);
  const j = await r.json();
  if (!j || !j.datos || !j.datos['mesa:meta']) throw new Error('archivo');
  Sincro.aplicando = true;
  // que al recargar no se vuelva a guardar lo de antes encima
  nodoAbierto = null; M = j.datos['mesa:meta'];
  Object.keys(T).forEach(k => delete T[k]);
  const ahora = await chrome.storage.local.get(null);
  const quitar = Object.keys(ahora).filter(k => !NO_SINCRO(k) && !(k in j.datos));
  if (quitar.length) await chrome.storage.local.remove(quitar);
  await chrome.storage.local.set(j.datos);
  Sincro.e.base = j.fecha; Sincro.e.sucio = 0; Sincro.e.ultima = Date.now(); Sincro.guardar(); guardarHuellas(j.datos);
  sessionStorage.setItem('novelia:traido', '1');
  location.reload();
}
async function copiaDeSeguridad(nombre) {
  const datos = await datosLocales();
  descargar(new Blob([JSON.stringify({ app: 'novelia-studio', version: 3, fecha: new Date().toISOString(), datos })], { type: 'application/json' }), nombre);
}
async function sincronizar(manual) {
  if (!Sincro.e.conectado || Sincro.ocupado || !navigator.onLine || document.getElementById('sc-este')) return;
  Sincro.ocupado = true; pintarEstadoSincro('Sincronizando…');
  try {
    const remoto = await archivoRemoto();
    const fechaR = remoto && remoto.appProperties && remoto.appProperties.fecha;
    const otroCambio = remoto && fechaR !== Sincro.e.base;
    if (!remoto) await subir(null);
    else if (otroCambio && !Sincro.e.sucio) { pintarEstadoSincro('Trayendo cambios…'); await aplicarRemoto(remoto); return; }
    else if (otroCambio && Sincro.e.sucio) { Sincro.ocupado = false; return conflicto(remoto); }
    else if (Sincro.e.sucio) await subir(remoto);
    pintarEstadoSincro('');
    if (manual) aviso('Sincronizado con Google Drive');
  } catch (e) {
    const m = e.message;
    pintarEstadoSincro(m === 'falta-id' ? 'Falta configurar' : m === 'token' || /popup|cancel|access_denied|interaction/.test(m) ? 'Toca para conectar' : !navigator.onLine ? 'Sin conexión' : 'No se ha podido');
    if (manual) aviso(m === 'falta-id' ? 'Falta el ID de cliente de Google (Ajustes)' : 'No he podido sincronizar. Vuelve a intentarlo.');
  } finally { Sincro.ocupado = false; }
}
function conflicto(remoto) {
  if (document.getElementById('sc-este')) return;
  const f = new Date(remoto.appProperties.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  modal(`<h3>Hay cambios en los dos sitios</h3><p class="suave">Has cambiado cosas aquí y en otro aparato (el ${esc(f)}). No puedo juntarlas, así que dime con cuál me quedo. La otra te la descargo como copia, para que no pierdas nada.</p>
    <div class="pie" style="flex-wrap:wrap"><button class="btn" data-cerrar>Ahora no</button><button class="btn" id="sc-otro">Lo del otro aparato</button><button class="btn prim" id="sc-este">Lo de este aparato</button></div>`, {
    alAbrir: (m, cerrar) => {
      $('#sc-este', m).onclick = async () => { cerrar(); try { Sincro.ocupado = true; const r = await drive(`https://www.googleapis.com/drive/v3/files/${remoto.id}?alt=media`); descargar(await r.blob(), `Novelia · lo del otro aparato ${diaStr()}.json`); await subir(remoto); aviso('Guardado lo de este aparato'); } catch (e) { aviso('No he podido subirlo'); } finally { Sincro.ocupado = false; pintarEstadoSincro(''); } };
      $('#sc-otro', m).onclick = async () => { cerrar(); try { await copiaDeSeguridad(`Novelia · lo de este aparato ${diaStr()}.json`); await new Promise(r => setTimeout(r, 600)); await aplicarRemoto(remoto); } catch (e) { aviso('No he podido traerlo'); } };
    }
  });
}
const subirPronto = debounce(() => { if (Sincro.e.conectado && Sincro.token && Sincro.caduca > Date.now()) sincronizar(); }, 20000);

// ---------- estado visible ----------
function pintarEstadoSincro(t) {
  Sincro.estado = t;
  let b = $('#sincro-pill');
  if (!Sincro.e.conectado) { if (b) b.remove(); return; }
  if (!b) { b = el('button', { id: 'sincro-pill', class: 'sincro-pill', title: 'Sincronizar con Google Drive', onclick: () => conectarYsincronizar() }); document.body.append(b); }
  const hace = Sincro.e.ultima ? Math.round((Date.now() - Sincro.e.ultima) / 60000) : null;
  b.textContent = t || (Sincro.e.sucio ? '☁ Cambios sin subir' : hace === null ? '☁ Drive' : `☁ Al día${hace < 1 ? '' : hace < 60 ? ` · hace ${hace} min` : ''}`);
  b.classList.toggle('alerta', /conectar|configurar|podido/.test(t));
  b.classList.toggle('girando', /…$/.test(t));
}
async function conectarYsincronizar() {
  try { await pedirToken(!Sincro.e.conectado); Sincro.e.conectado = true; Sincro.guardar(); await sincronizar(true); }
  catch (e) { aviso(e.message === 'falta-id' ? 'Falta el ID de cliente de Google: míralo en Ajustes' : 'No se ha conectado con Google'); pintarEstadoSincro(e.message === 'falta-id' ? 'Falta configurar' : 'Toca para conectar'); }
}

// ---------- tarjeta en Ajustes ----------
function tarjetaSincro() {
  const E = Sincro.e;
  return `<div class="tarjeta" id="aj-sincro"><h2>Sincronizar móvil y ordenador</h2>
    ${E.conectado ? `<p style="margin:0 0 10px">Conectada a Google Drive.${E.ultima ? ` Última vez: ${new Date(E.ultima).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}.` : ''}${E.sucio ? ' <b>Hay cambios sin subir.</b>' : ''}</p>
      <div class="fila" style="flex-wrap:wrap"><button class="btn prim" id="sc-ya">Sincronizar ahora</button><button class="btn" id="sc-off">Desconectar este aparato</button></div>`
    : `<p style="margin:0 0 10px">Guarda tus novelas en tu Google Drive y las tienes iguales en el móvil y en el ordenador. Se suben solas mientras escribes y se traen al abrir la app.</p>
      <button class="btn prim" id="sc-on"${Sincro.clientId ? '' : ' disabled'}>Conectar con Google Drive</button>`}
    <details style="margin-top:12px"${Sincro.clientId ? '' : ' open'}><summary class="suave" style="cursor:pointer">${Sincro.clientId ? 'Configuración de Google' : 'Antes de conectar: configurar Google (una sola vez)'}</summary>
      <ol class="suave" style="padding-left:18px;font-size:13px;line-height:1.55">
        <li>Entra en <b>console.cloud.google.com</b> con tu cuenta de Google y crea un proyecto llamado <b>Novelia</b>.</li>
        <li>En «APIs y servicios» › «Biblioteca», busca <b>Google Drive API</b> y pulsa <b>Habilitar</b>.</li>
        <li>En «Pantalla de consentimiento de OAuth»: tipo <b>Externo</b>, nombre Novelia, tu correo. En «Usuarios de prueba» añade tu cuenta de Google.</li>
        <li>En «Credenciales» › «Crear credenciales» › <b>ID de cliente de OAuth</b> › tipo <b>Aplicación web</b>. En «Orígenes de JavaScript autorizados» pon <b>${esc(location.origin)}</b>.</li>
        <li>Copia el <b>ID de cliente</b> (acaba en .apps.googleusercontent.com) y pégalo aquí. Haz lo mismo en el móvil, o pásame el ID y lo dejo puesto en la app.</li></ol>
      <label class="campo"><span>ID de cliente de Google</span><input id="sc-id" value="${esc(E.clientId || SINCRO_CLIENT_ID)}" placeholder="123456-abc.apps.googleusercontent.com"${SINCRO_CLIENT_ID ? ' disabled' : ''}></label>
      <p class="tenue" style="font-size:12px;margin:0">Google te avisará de que la app «no está verificada»: es normal, es tu propia app. Pulsa «Continuar».</p></details></div>`;
}
function enlazarSincro(cont, rehacer) {
  const c = $('#aj-sincro', cont); if (!c) return;
  if ($('#sc-id', c)) $('#sc-id', c).oninput = debounce((e) => { Sincro.e.clientId = e.target.value.trim(); tokenClient = null; Sincro.guardar(); rehacer(); }, 600);
  if ($('#sc-on', c)) $('#sc-on', c).onclick = async () => {
    if (!(await preguntar('¿Conectar con Google Drive?', 'Si en Drive ya hay novelas de otro aparato, me las traigo y sustituyen a lo que hay aquí (antes te descargo una copia de esto). Si Drive está vacío, subo lo de este aparato.', 'Conectar'))) return;
    try {
      await pedirToken(true);
      const remoto = await archivoRemoto();
      if (remoto) await copiaDeSeguridad(`Novelia · antes de sincronizar ${diaStr()}.json`);
      Sincro.e.conectado = true; Sincro.e.base = remoto ? null : Sincro.e.base; Sincro.e.sucio = remoto ? 0 : Date.now(); Sincro.guardar();
      if (remoto) { await new Promise(r => setTimeout(r, 600)); await aplicarRemoto(remoto); }
      else { await sincronizar(true); rehacer(); }
    } catch (e) { aviso('No se ha conectado con Google'); }
  };
  if ($('#sc-ya', c)) $('#sc-ya', c).onclick = async () => { await conectarYsincronizar(); rehacer(); };
  if ($('#sc-off', c)) $('#sc-off', c).onclick = () => { Sincro.e.conectado = false; Sincro.token = null; localStorage.removeItem('novelia:token'); Sincro.guardar(); pintarEstadoSincro(''); rehacer(); aviso('Desconectado. Tus novelas siguen aquí y en Drive.'); };
}
(() => {
  const original = VISTAS.ajustes;
  VISTAS.ajustes = async (cont) => {
    await original(cont);
    const ref = $('#aj-rest', cont) && $('#aj-rest', cont).closest('.tarjeta');
    if (!ref) return;
    const d = document.createElement('div'); d.innerHTML = tarjetaSincro();
    ref.after(d.firstElementChild);
    enlazarSincro(cont, () => VISTAS.ajustes(cont));
  };
})();

// ---------- arranque ----------
(function esperar() {
  if (!(typeof M !== 'undefined' && M && M.proyectos && document.querySelector('.vista.on'))) return setTimeout(esperar, 300);
  if (sessionStorage.getItem('novelia:traido')) { sessionStorage.removeItem('novelia:traido'); setTimeout(() => aviso('Traído de Google Drive: ya tienes lo último'), 800); }
  if (!Sincro.e.conectado) return;
  pintarEstadoSincro('');
  if (Sincro.token && Sincro.caduca > Date.now() + 60000) sincronizar();
  else {
    pintarEstadoSincro('Toca para conectar');
    // Google necesita un toque para renovar el permiso: el primero que des en la app
    document.addEventListener('click', function uno() { document.removeEventListener('click', uno, true); conectarYsincronizar(); }, true);
  }
  setInterval(() => { if (!document.hidden && Sincro.token && Sincro.caduca > Date.now()) sincronizar(); }, 120000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Sincro.token && Sincro.caduca > Date.now()) sincronizar(); else if (document.hidden && Sincro.e.sucio && Sincro.token) sincronizar(); });
})();
