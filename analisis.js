// Análisis de estilo en español: repeticiones cercanas, adverbios en -mente,
// muletillas (lista editable) y frases largas. Devuelve posiciones sobre el texto plano.

(function () {
  const VACIAS = new Set(`a al algo alguien algún alguna algunas alguno algunos ante antes aquel aquella aquellas aquello aquellos aquí así aun aún bajo bien cada casi como cómo con contra cual cuál cuales cuando cuándo cuanto de del desde donde dónde dos durante e el él ella ellas ello ellos en entre era eran eras eres es esa esas ese eso esos esta está estaba estaban estado estamos estar este esto estos estoy fue fueron fui ha había habían han has hasta hay he hecho hizo la las le les lo los más me mi mí mis mucho muy nada ni no nos nosotros o os otra otro para pero poco por porque que qué quien quién se sé sea ser si sí sido siempre sin sobre su sus también tan tanto te tenía tengo ti tiene tienen todo todos tras tu tú tus un una uno unos unas usted vez y ya yo dijo dije soy son sus nuestra nuestro vuestra vuestro mía mío tuya tuyo suya suyo luego solo sólo tenía tuve tuvo iba ir voy va van estaba había podía quería sabía`.split(/\s+/));

  const NO_ADVERBIOS = new Set(['mente', 'demente', 'dementes', 'clemente', 'inclemente', 'vehemente', 'simiente', 'mentes']);

  // Un * al final vale para cualquier terminación (sonri* = sonrió, sonriendo…)
  const MULETILLAS_DEF = [
    'suspir*', 'sonri*', 'sonre*', 'asinti*', 'asent*', 'de repente', 'de pronto', 'entonces',
    'simplemente', 'realmente', 'literalmente', 'en realidad', 'un poco', 'algo', 'bastante', 'muy',
    'justo', 'incluso', 'de alguna manera', 'empez* a', 'comenz* a',
    'tragó saliva', 'tragué saliva', 'contuvo el aliento', 'contuve el aliento',
    'se mordió el labio', 'me mordí el labio', 'puso los ojos en blanco', 'puse los ojos en blanco',
    'se encogió de hombros', 'me encogí de hombros', 'frunció el ceño', 'fruncí el ceño',
    'mariposas', 'escalofrío', 'se le aceleró', 'se me aceleró', 'el corazón',
    'no pude evitar', 'no pudo evitar', 'sin poder evitarlo', 'soltó una carcajada', 'solté una carcajada',
    'clavó la mirada', 'clavé la mirada', 'sus ojos', 'su mirada', 'mi mirada',
    'se dio cuenta', 'me di cuenta', 'sintió que', 'sentí que', 'parecía', 'de nuevo', 'otra vez', 'como si'
  ];

  // Clave para comparar repeticiones: minúsculas y sin plural sencillo
  function clave(w) {
    let k = w.toLowerCase();
    if (k.length > 5 && k.endsWith('es') && !k.endsWith('ces')) k = k.slice(0, -2);
    else if (k.length > 4 && k.endsWith('s')) k = k.slice(0, -1);
    return k;
  }

  const RE_PALABRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[-'][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*/g;

  function palabras(texto) {
    const out = [];
    let m;
    RE_PALABRA.lastIndex = 0;
    while ((m = RE_PALABRA.exec(texto))) out.push({ w: m[0], s: m.index, e: m.index + m[0].length });
    return out;
  }

  function contar(texto) {
    const m = texto.match(/[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[-'’.,][0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*/g);
    return m ? m.length : 0;
  }

  function escaparRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function mulRegex(m) {
    const partes = m.trim().toLowerCase().split(/\s+/).map(w => w.endsWith('*') ? escaparRe(w.slice(0, -1)) + '\\p{L}*' : escaparRe(w));
    return new RegExp(`(?<![\\p{L}])${partes.join('\\s+')}(?![\\p{L}])`, 'giu');
  }

  function analizar(texto, ajustes) {
    ajustes = ajustes || {};
    const dist = ajustes.repDist || 50;
    const largo = ajustes.fraseLarga || 35;
    const muletillas = (ajustes.muletillas && ajustes.muletillas.length ? ajustes.muletillas : MULETILLAS_DEF)
      .map(s => s.trim()).filter(Boolean);
    const ignorar = new Set((ajustes.ignorar || []).map(s => clave(s)));

    const items = [];
    const ws = palabras(texto);

    // 1) Repeticiones cercanas
    const ultima = new Map(); // clave -> índice de palabra
    const marcadas = new Set();
    const conteoRep = new Map();
    const etiqueta = new Map();
    ws.forEach((p, i) => {
      const low = p.w.toLowerCase();
      if (low.length < 4 || VACIAS.has(low)) return;
      const k = clave(p.w);
      if (ignorar.has(k)) return;
      if (!etiqueta.has(k)) etiqueta.set(k, low);
      if (ultima.has(k) && i - ultima.get(k) <= dist) {
        const j = ultima.get(k);
        if (!marcadas.has(j)) { marcadas.add(j); items.push({ tipo: 'rep', s: ws[j].s, e: ws[j].e, clave: k }); conteoRep.set(k, (conteoRep.get(k) || 0) + 1); }
        if (!marcadas.has(i)) { marcadas.add(i); items.push({ tipo: 'rep', s: p.s, e: p.e, clave: k }); conteoRep.set(k, (conteoRep.get(k) || 0) + 1); }
      }
      ultima.set(k, i);
    });

    // 2) Adverbios en -mente
    const conteoMente = new Map();
    ws.forEach(p => {
      const low = p.w.toLowerCase();
      if (low.length > 6 && low.endsWith('mente') && !NO_ADVERBIOS.has(low)) {
        items.push({ tipo: 'ment', s: p.s, e: p.e, clave: low });
        conteoMente.set(low, (conteoMente.get(low) || 0) + 1);
      }
    });

    // 3) Muletillas (frases y palabras de la lista; * = cualquier terminación)
    const conteoMul = new Map();
    muletillas.forEach(mu => {
      let re;
      try { re = mulRegex(mu); } catch (e) { return; }
      let m, n = 0;
      while ((m = re.exec(texto))) {
        if (!m[0]) { re.lastIndex++; continue; }
        items.push({ tipo: 'mul', s: m.index, e: m.index + m[0].length, clave: mu });
        n++;
      }
      if (n) conteoMul.set(mu, n);
    });

    // 4) Frases largas
    let largas = 0;
    const reFrase = /[^.!?…\n]+[.!?…]*/g;
    let f;
    while ((f = reFrase.exec(texto))) {
      const n = contar(f[0]);
      if (n > largo) {
        const ini = f.index + (f[0].length - f[0].trimStart().length);
        items.push({ tipo: 'larga', s: ini, e: f.index + f[0].trimEnd().length, clave: n + ' palabras' });
        largas++;
      }
    }

    // 5) Ritmo: frases que empiezan igual seguidas (ecos de inicio)
    const conteoEco = new Map();
    const inicios = [];
    const reIni = /(^|[.!?…]\s+|\n\s*[—–-]?\s*)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)/g;
    let mi;
    while ((mi = reIni.exec(texto))) {
      const w = mi[2];
      inicios.push({ w: w.toLowerCase(), s: mi.index + mi[0].length - w.length, e: mi.index + mi[0].length });
    }
    for (let i = 2; i < inicios.length; i++) {
      const a = inicios[i - 2], b = inicios[i - 1], c = inicios[i];
      if (a.w === b.w && b.w === c.w && a.w.length > 1) {
        [a, b, c].forEach(x => { if (!x.m) { x.m = 1; items.push({ tipo: 'eco', s: x.s, e: x.e, clave: x.w }); } });
        conteoEco.set(a.w, (conteoEco.get(a.w) || 0) + 1);
      }
    }

    const top = (mapa) => [...mapa.entries()].sort((a, b) => b[1] - a[1]);
    // Estadísticas: frases, media y % de diálogo
    const nFrases = (texto.match(/[^.!?…\n]+[.!?…]*/g) || []).filter(f => /\p{L}/u.test(f)).length;
    const lineas = texto.split('\n');
    const dlg = lineas.filter(l => /^\s*[—–-]/.test(l)).join('').length;
    const conteoTop = new Map();
    ws.forEach(p => { const low = p.w.toLowerCase(); if (low.length >= 3 && !VACIAS.has(low)) conteoTop.set(low, (conteoTop.get(low) || 0) + 1); });
    return {
      items,
      resumen: {
        rep: top(conteoRep).map(([k, n]) => [k, n, etiqueta.get(k) || k]), ment: top(conteoMente), mul: top(conteoMul), eco: top(conteoEco),
        larga: largas, palabras: ws.length, frases: nFrases,
        media: nFrases ? Math.round(ws.length / nFrases) : 0,
        dialogo: texto.length ? Math.round(dlg / texto.length * 100) : 0,
        top: [...conteoTop.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 30)
      }
    };
  }

  // Palabras más usadas (para la vista de revisión de capítulo)
  function frecuencias(texto, n) {
    const m = new Map();
    palabras(texto).forEach(p => {
      const low = p.w.toLowerCase();
      if (low.length < 4 || VACIAS.has(low)) return;
      const k = clave(p.w);
      m.set(k, (m.get(k) || 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n || 20);
  }

  self.Analisis = { analizar, contar, frecuencias, MULETILLAS_DEF, clave, mulRegex };
})();
