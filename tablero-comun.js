// Tablero de inspiración: compartido por el fondo y la página.
const TABLEROS_INICIALES = [{ id: 'novela', nombre: 'Mi novela' }, { id: 'etsy', nombre: 'Diseños Etsy' }];
const MAX_LADO = 1100;

async function getBoards() {
  const { tabBoards } = await chrome.storage.local.get('tabBoards');
  return tabBoards && tabBoards.length ? tabBoards : TABLEROS_INICIALES;
}

// Descarga una imagen y guarda una copia reducida (para que no desaparezca si la borran de la web)
async function copiaImagen(src) {
  try {
    let blob;
    if (src.startsWith('data:')) blob = await (await fetch(src)).blob();
    else {
      const r = await fetch(src, { credentials: 'omit' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      blob = await r.blob();
    }
    if (blob.type === 'image/gif' && blob.size < 1.5e6) return { data: await aDataURL(blob), w: 0, h: 0 };
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const cv = new OffscreenCanvas(w, h);
    cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const out = await cv.convertToBlob({ type: 'image/webp', quality: 0.82 });
    return { data: await aDataURL(out), w, h };
  } catch (e) {
    return null;
  }
}
async function aDataURL(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return `data:${blob.type};base64,` + btoa(s);
}

async function guardarItem(item) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const full = { id, created: Date.now(), note: '', ...item };
  await chrome.storage.local.set({ ['item:' + id]: full, tabLast: item.board });
  return full;
}
