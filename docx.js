// Leer y escribir .docx sin librerías (zip a mano).
(function () {
  // ---------- ZIP: lectura ----------
  async function unzip(buf) {
    const dv = new DataView(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('No es un archivo .docx válido');
    const n = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = {};
    const dec = new TextDecoder();
    for (let k = 0; k < n; k++) {
      const method = dv.getUint16(p + 10, true);
      const csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true);
      const xlen = dv.getUint16(p + 30, true);
      const clen = dv.getUint16(p + 32, true);
      const off = dv.getUint32(p + 42, true);
      const name = dec.decode(new Uint8Array(buf, p + 46, nlen));
      files[name] = { method, csize, off };
      p += 46 + nlen + xlen + clen;
    }
    return {
      names: Object.keys(files),
      async get(name) {
        const f = files[name];
        if (!f) return null;
        const lnlen = dv.getUint16(f.off + 26, true);
        const lxlen = dv.getUint16(f.off + 28, true);
        const start = f.off + 30 + lnlen + lxlen;
        const raw = new Uint8Array(buf, start, f.csize);
        if (f.method === 0) return raw;
        const ds = new DecompressionStream('deflate-raw');
        const out = await new Response(new Blob([raw]).stream().pipeThrough(ds)).arrayBuffer();
        return new Uint8Array(out);
      }
    };
  }

  // ---------- ZIP: escritura (sin comprimir) ----------
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(d) { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

  function zip(entries) {
    const enc = new TextEncoder();
    const parts = []; const central = []; let offset = 0;
    entries.forEach(({ name, data }) => {
      const nb = enc.encode(name);
      const d = typeof data === 'string' ? enc.encode(data) : data;
      const crc = crc32(d);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true); lh.setUint32(14, crc, true); lh.setUint32(18, d.length, true); lh.setUint32(22, d.length, true);
      lh.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(lh.buffer), nb, d);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true);
      ch.setUint16(28, nb.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nb);
      offset += 30 + nb.length + d.length;
    });
    const csize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  // ---------- DOCX → párrafos ----------
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  async function leerDocx(file) {
    const z = await unzip(await file.arrayBuffer());
    const xml = await z.get('word/document.xml');
    if (!xml) throw new Error('No encuentro el texto dentro del .docx');
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(xml), 'application/xml');
    const ps = doc.getElementsByTagNameNS(W, 'p');
    const out = [];
    for (const p of ps) {
      const st = p.getElementsByTagNameNS(W, 'pStyle')[0];
      const style = st ? st.getAttributeNS(W, 'val') || st.getAttribute('w:val') || '' : '';
      let html = '', text = '';
      for (const r of p.getElementsByTagNameNS(W, 'r')) {
        const rp = r.getElementsByTagNameNS(W, 'rPr')[0];
        const on = (tag) => { if (!rp) return false; const e = rp.getElementsByTagNameNS(W, tag)[0]; if (!e) return false; const v = e.getAttributeNS(W, 'val') || e.getAttribute('w:val'); return v !== '0' && v !== 'false'; };
        let t = '';
        for (const c of r.childNodes) {
          if (c.localName === 't') t += c.textContent;
          else if (c.localName === 'tab') t += '\t';
          else if (c.localName === 'br') t += '\n';
        }
        if (!t) continue;
        text += t;
        let h = esc(t);
        if (on('i')) h = `<i>${h}</i>`;
        if (on('b')) h = `<b>${h}</b>`;
        html += h;
      }
      out.push({ style, text, html });
    }
    return out;
  }

  // ---------- Novela → DOCX ----------
  // capitulos: [{titulo, parrafos:[html de párrafo con <i>/<b>]}]
  function htmlARuns(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const runs = [];
    (function walk(node, i, b) {
      for (const c of node.childNodes) {
        if (c.nodeType === 3) { if (c.textContent) runs.push({ t: c.textContent, i, b }); }
        else if (c.nodeType === 1) {
          const tg = c.tagName;
          if (tg === 'BR') runs.push({ br: true });
          else walk(c, i || tg === 'I' || tg === 'EM', b || tg === 'B' || tg === 'STRONG');
        }
      }
    })(tmp, false, false);
    return runs.map(r => r.br ? '<w:r><w:br/></w:r>' :
      `<w:r>${r.i || r.b ? `<w:rPr>${r.b ? '<w:b/>' : ''}${r.i ? '<w:i/>' : ''}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(r.t)}</w:t></w:r>`).join('');
  }

  function escribirDocx({ titulo, autora, capitulos }) {
    let body = '';
    body += `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${esc(titulo || 'Sin título')}</w:t></w:r></w:p>`;
    if (autora) body += `<w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr><w:r><w:t>${esc(autora)}</w:t></w:r></w:p>`;
    capitulos.forEach(c => {
      if (c.parte) { body += `<w:p><w:pPr><w:pStyle w:val="Parte"/></w:pPr><w:r><w:t>${esc(c.titulo)}</w:t></w:r></w:p>`; return; }
      body += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${esc(c.titulo)}</w:t></w:r></w:p>`;
      let primero = true;
      c.parrafos.forEach(ph => {
        if (ph === '***') { body += `<w:p><w:pPr><w:pStyle w:val="Separador"/></w:pPr><w:r><w:t>* * *</w:t></w:r></w:p>`; primero = true; return; }
        body += `<w:p>${primero ? '<w:pPr><w:pStyle w:val="Primero"/></w:pPr>' : ''}${htmlARuns(ph)}</w:p>`;
        primero = false;
      });
    });
    const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W}"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${W}">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:ind w:firstLine="425"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Primero"><w:name w:val="Primer párrafo"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:firstLine="0"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="2400" w:after="240"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="48"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Parte"><w:name w:val="Parte"/><w:basedOn w:val="Normal"/><w:pPr><w:pageBreakBefore/><w:spacing w:before="3000" w:after="600"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:caps/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Primero"/><w:pPr><w:keepNext/><w:pageBreakBefore/><w:spacing w:before="1200" w:after="480"/><w:ind w:firstLine="0"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Separador"><w:name w:val="Separador"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="240"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr></w:style>
</w:styles>`;
    return zip([
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
      { name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: 'word/document.xml', data: document },
      { name: 'word/styles.xml', data: styles }
    ]);
  }

  self.Docx = { leerDocx, escribirDocx, unzip };
})();
