// Léxico por temas para escribir con detalle. Cada tema: qué hay, cómo es, qué pasa.
// Las emociones van con lo que se nota en el cuerpo, gestos y cómo se siente por dentro.
self.LEXICO = {
  temas: {
    'Mar': {
      hay: ['oleaje', 'espuma', 'rompiente', 'acantilado', 'muelle', 'boya', 'gaviotas', 'red de pesca', 'salitre', 'faro', 'barca', 'casco', 'proa', 'ancla', 'algas', 'resaca', 'horizonte'],
      es: ['salado', 'embravecido', 'en calma', 'plomizo', 'turquesa', 'espumoso', 'inmenso', 'traicionero', 'cristalino', 'oscuro', 'picado'],
      pasa: ['romper', 'batir', 'mecerse', 'zarpar', 'atracar', 'naufragar', 'encallar', 'lamer la orilla', 'subir la marea', 'bajar la marea', 'salpicar', 'arrastrar']
    },
    'Playa': {
      hay: ['arena', 'toalla', 'sombrilla', 'chiringuito', 'conchas', 'dunas', 'paseo marítimo', 'socorrista', 'crema solar', 'orilla', 'castillo de arena', 'chanclas'],
      es: ['abrasadora', 'dorada', 'fina', 'desierta', 'abarrotada', 'húmeda', 'cegadora', 'tibia'],
      pasa: ['tumbarse', 'broncearse', 'quemarse', 'zambullirse', 'chapotear', 'pasear por la orilla', 'hundir los pies', 'sacudirse la arena', 'atardecer']
    },
    'Bosque': {
      hay: ['hojarasca', 'musgo', 'helechos', 'raíces', 'tronco', 'copa', 'sendero', 'claro', 'setas', 'piñas', 'corteza', 'maleza', 'arroyo', 'niebla'],
      es: ['espeso', 'umbrío', 'frondoso', 'húmedo', 'silencioso', 'tupido', 'enmarañado', 'centenario', 'resinoso'],
      pasa: ['crujir', 'susurrar', 'filtrarse la luz', 'perderse', 'internarse', 'apartar ramas', 'tropezar', 'gotear', 'aullar']
    },
    'Montaña': {
      hay: ['cumbre', 'ladera', 'risco', 'collado', 'refugio', 'nieve', 'glaciar', 'pedregal', 'cresta', 'valle', 'hito', 'precipicio'],
      es: ['escarpada', 'abrupta', 'nevada', 'vertiginosa', 'imponente', 'pelada', 'helada', 'inaccesible'],
      pasa: ['ascender', 'coronar', 'resbalar', 'despeñarse', 'jadear', 'otear', 'descender', 'encordarse']
    },
    'Campo': {
      hay: ['trigal', 'era', 'pajar', 'establo', 'cerca', 'tractor', 'surco', 'huerto', 'olivos', 'viñedo', 'gallinero', 'camino de tierra', 'pozo'],
      es: ['dorado', 'polvoriento', 'agreste', 'fértil', 'yermo', 'apacible', 'reseco', 'verdeante'],
      pasa: ['arar', 'sembrar', 'segar', 'vendimiar', 'ordeñar', 'cacarear', 'mugir', 'trillar', 'recoger']
    },
    'Ciudad': {
      hay: ['tráfico', 'semáforo', 'acera', 'escaparate', 'portal', 'metro', 'farola', 'claxon', 'rascacielos', 'plaza', 'terraza', 'callejón', 'atasco'],
      es: ['bulliciosa', 'gris', 'caótica', 'anónima', 'iluminada', 'ruidosa', 'cosmopolita', 'desierta de madrugada'],
      pasa: ['pitar', 'callejear', 'cruzar', 'esquivar', 'colarse', 'perderse entre la gente', 'parar un taxi', 'llegar tarde']
    },
    'Casa vieja': {
      hay: ['desván', 'telarañas', 'polvo', 'baúl', 'retratos', 'papel pintado', 'chimenea', 'contraventanas', 'escalera de madera', 'goteras', 'sábanas sobre los muebles', 'cerrojo'],
      es: ['ruinosa', 'destartalada', 'húmeda', 'señorial', 'abandonada', 'sombría', 'polvorienta', 'desconchada'],
      pasa: ['crujir', 'chirriar', 'oler a cerrado', 'desprenderse', 'resonar', 'colarse el viento', 'golpear una contraventana']
    },
    'Cocina': {
      hay: ['fogón', 'horno', 'cazuela', 'sartén', 'tabla de cortar', 'delantal', 'especias', 'harina', 'encimera', 'grifo', 'trapos', 'olla'],
      es: ['humeante', 'aromática', 'caldeada', 'desordenada', 'reluciente', 'pegajosa'],
      pasa: ['picar', 'sofreír', 'remover', 'hornear', 'hervir', 'chisporrotear', 'probar', 'amasar', 'quemarse', 'oler a canela']
    },
    'Cafetería': {
      hay: ['barra', 'cafetera', 'taza', 'platillo', 'servilletas', 'pizarra', 'camarero', 'bollería', 'leche espumada', 'ventanal', 'mesa del fondo'],
      es: ['acogedora', 'abarrotada', 'tranquila', 'aromática', 'cálida', 'ruidosa'],
      pasa: ['pedir', 'remover el azúcar', 'soplar', 'esperar', 'quedar', 'charlar', 'mirar por el ventanal', 'enfriarse el café']
    },
    'Hospital': {
      hay: ['pasillo', 'sala de espera', 'quirófano', 'camilla', 'gotero', 'suero', 'vendaje', 'jeringuilla', 'bata', 'fonendo', 'monitor', 'pitido', 'urgencias', 'parte médico', 'diagnóstico', 'cicatriz', 'puntos', 'escayola', 'anestesia', 'desinfectante'],
      es: ['aséptico', 'blanco', 'fluorescente', 'frío', 'impersonal', 'interminable', 'silencioso', 'pálido', 'convaleciente'],
      pasa: ['ingresar', 'operar', 'auscultar', 'vendar', 'sedar', 'despertar de la anestesia', 'dar el alta', 'esperar noticias', 'velar', 'recuperarse', 'reanimar']
    },
    'Oficina': {
      hay: ['mesa', 'pantalla', 'reunión', 'jefe', 'correo', 'café de máquina', 'impresora', 'sala de juntas', 'ascensor', 'informe', 'plazo', 'fichaje'],
      es: ['impersonal', 'diáfana', 'tensa', 'silenciosa', 'climatizada', 'gris'],
      pasa: ['convocar', 'fichar', 'teclear', 'presentar', 'ascender', 'despedir', 'quedarse hasta tarde', 'cotillear junto a la máquina']
    },
    'Fiesta': {
      hay: ['música', 'copas', 'pista de baile', 'luces', 'confeti', 'brindis', 'invitados', 'barra libre', 'tacones', 'guirnaldas', 'altavoces'],
      es: ['animada', 'ruidosa', 'desmadrada', 'elegante', 'abarrotada', 'interminable'],
      pasa: ['brindar', 'bailar', 'gritar por encima de la música', 'colarse', 'emborracharse', 'escabullirse', 'chocar las copas', 'amanecer']
    },
    'Boda': {
      hay: ['altar', 'velo', 'cola del vestido', 'anillos', 'ramo', 'padrino', 'madrina', 'banquete', 'tarta', 'votos', 'arroz', 'primer baile', 'damas de honor'],
      es: ['emotiva', 'solemne', 'íntima', 'por todo lo alto', 'perfecta', 'interminable'],
      pasa: ['dar el sí', 'intercambiar anillos', 'emocionarse', 'lanzar el ramo', 'brindar', 'besar a la novia', 'llegar tarde', 'abrir el baile']
    },
    'Noche': {
      hay: ['luna', 'estrellas', 'farolas', 'sombras', 'grillos', 'insomnio', 'madrugada', 'silencio', 'oscuridad', 'luz de la mesilla'],
      es: ['cerrada', 'estrellada', 'tibia', 'helada', 'eterna', 'en vela', 'sin luna', 'clara'],
      pasa: ['anochecer', 'desvelarse', 'dar vueltas en la cama', 'acechar', 'titilar', 'apagarse las luces', 'clarear']
    },
    'Tormenta': {
      hay: ['relámpago', 'trueno', 'aguacero', 'granizo', 'ráfagas', 'nubarrones', 'charcos', 'cortes de luz', 'pararrayos'],
      es: ['eléctrica', 'violenta', 'repentina', 'cerrada', 'amenazante', 'ensordecedora'],
      pasa: ['tronar', 'diluviar', 'azotar', 'retumbar', 'descargar', 'iluminar el cielo', 'empaparse', 'amainar']
    },
    'Lluvia': {
      hay: ['gotas', 'paraguas', 'charcos', 'cristales empañados', 'canalones', 'chubasquero', 'olor a tierra mojada', 'calabobos'],
      es: ['fina', 'persistente', 'torrencial', 'helada', 'tibia', 'mansa', 'gris'],
      pasa: ['lloviznar', 'chispear', 'repiquetear', 'calar', 'empapar', 'resbalar por el cristal', 'escampar', 'refugiarse en un portal']
    },
    'Invierno': {
      hay: ['escarcha', 'bufanda', 'abrigo', 'vaho', 'nieve', 'estufa', 'chimenea', 'guantes', 'charcos helados', 'mantas'],
      es: ['gélido', 'crudo', 'blanco', 'desapacible', 'cortante', 'interminable'],
      pasa: ['tiritar', 'helarse', 'nevar', 'acurrucarse', 'frotarse las manos', 'arrebujarse', 'oscurecer pronto']
    },
    'Verano': {
      hay: ['chicharras', 'ventilador', 'helado', 'sandía', 'piscina', 'siesta', 'persianas bajadas', 'verbena', 'mosquitos', 'noches al fresco'],
      es: ['sofocante', 'pegajoso', 'luminoso', 'perezoso', 'eterno', 'bochornoso'],
      pasa: ['sudar', 'abanicarse', 'trasnochar', 'refrescarse', 'achicharrarse', 'quedarse al fresco', 'derretirse']
    },
    'Otoño': {
      hay: ['hojas secas', 'castañas', 'bufanda fina', 'lluvia', 'setas', 'niebla', 'cielo bajo', 'vuelta al cole'],
      es: ['ocre', 'melancólico', 'dorado', 'húmedo', 'templado', 'gris'],
      pasa: ['caer las hojas', 'refrescar', 'oscurecer antes', 'crujir bajo los pies', 'arrebolarse el cielo']
    },
    'Dormitorio': {
      hay: ['sábanas', 'almohada', 'mesilla', 'lamparita', 'edredón', 'cabecero', 'armario', 'persiana', 'despertador', 'ropa tirada'],
      es: ['revuelto', 'en penumbra', 'cálido', 'desordenado', 'íntimo', 'silencioso'],
      pasa: ['desperezarse', 'arroparse', 'entreabrir los ojos', 'quedarse dormida', 'remolonear', 'dar la luz']
    },
    'Carretera': {
      hay: ['volante', 'arcén', 'gasolinera', 'curvas', 'faros', 'retrovisor', 'peaje', 'radio', 'mapa', 'áreas de descanso'],
      es: ['interminable', 'serpenteante', 'desierta', 'recta', 'mojada', 'nocturna'],
      pasa: ['arrancar', 'acelerar', 'frenar en seco', 'adelantar', 'derrapar', 'repostar', 'tomar una salida', 'perderse']
    }
  },

  emociones: {
    'Deseo': {
      cuerpo: ['pulso acelerado', 'calor en la nuca', 'boca seca', 'piel erizada', 'respiración entrecortada', 'pupilas dilatadas', 'rubor en el cuello'],
      gestos: ['morderse el labio', 'sostener la mirada', 'acortar la distancia', 'rozar como sin querer', 'apartar la vista un segundo tarde', 'humedecerse los labios'],
      dentro: ['no poder pensar en otra cosa', 'un tirón en el estómago', 'olvidarse de dónde está', 'saber que es mala idea y no importarle']
    },
    'Ternura': {
      cuerpo: ['un nudo cálido en el pecho', 'la garganta apretada', 'los ojos húmedos'],
      gestos: ['apartarle un mechón', 'arroparle', 'acariciar con el pulgar', 'besar la frente', 'entrelazar los dedos', 'sonreír sin darse cuenta'],
      dentro: ['ganas de protegerle', 'sentirse en casa', 'querer parar el tiempo']
    },
    'Nervios': {
      cuerpo: ['manos sudorosas', 'estómago revuelto', 'boca seca', 'temblor en la voz', 'piernas flojas', 'corazón desbocado'],
      gestos: ['tamborilear con los dedos', 'retorcerse las manos', 'mirar el móvil sin motivo', 'colocarse el pelo una y otra vez', 'carraspear', 'pasear de un lado a otro'],
      dentro: ['ensayar la frase cien veces', 'imaginar lo peor', 'no recordar ni su nombre']
    },
    'Miedo': {
      cuerpo: ['sudor frío', 'vello de punta', 'sangre helada', 'nudo en la garganta', 'rodillas temblorosas', 'respiración contenida'],
      gestos: ['retroceder', 'quedarse inmóvil', 'aferrarse a algo', 'mirar por encima del hombro', 'taparse la boca'],
      dentro: ['la mente en blanco', 'el tiempo se ralentiza', 'una vocecita que grita que corra']
    },
    'Ira': {
      cuerpo: ['mandíbula apretada', 'sangre en las sienes', 'cara encendida', 'puños cerrados', 'respiración por la nariz', 'venas marcadas'],
      gestos: ['dar un portazo', 'golpear la mesa', 'señalar con el dedo', 'alzar la voz', 'darse la vuelta', 'reír sin ganas'],
      dentro: ['ver rojo', 'decir lo que se lamentará', 'contar hasta diez sin éxito']
    },
    'Celos': {
      cuerpo: ['un pinchazo en el estómago', 'calor subiendo al cuello', 'sabor amargo'],
      gestos: ['fingir indiferencia', 'mirar de reojo', 'contestar con monosílabos', 'apretar el vaso', 'sonrisa tensa'],
      dentro: ['compararse', 'imaginar conversaciones', 'odiarse por sentirlo']
    },
    'Tristeza': {
      cuerpo: ['pecho pesado', 'ojos escocidos', 'garganta cerrada', 'cansancio en los huesos', 'hombros caídos'],
      gestos: ['mirar a la nada', 'abrazarse las rodillas', 'tragarse las lágrimas', 'hablar en voz baja', 'no tocar la comida'],
      dentro: ['todo parece lejano', 'el silencio pesa', 'no saber por dónde empezar']
    },
    'Alegría': {
      cuerpo: ['ligereza', 'mejillas doloridas de sonreír', 'cosquilleo', 'energía de sobra'],
      gestos: ['reír a carcajadas', 'dar saltitos', 'abrazar sin avisar', 'canturrear', 'girar sobre sí misma'],
      dentro: ['ganas de contárselo a todo el mundo', 'el mundo brilla más', 'no caber en sí']
    },
    'Vergüenza': {
      cuerpo: ['rubor hasta las orejas', 'calor en la cara', 'sudor en la nuca'],
      gestos: ['bajar la mirada', 'taparse la cara', 'reír nerviosa', 'balbucear', 'querer que la trague la tierra'],
      dentro: ['repetir la escena en bucle', 'desear desaparecer', 'rezar para que nadie lo haya visto']
    },
    'Alivio': {
      cuerpo: ['soltar el aire', 'músculos que se aflojan', 'piernas de gelatina'],
      gestos: ['dejarse caer en una silla', 'cerrar los ojos', 'llevarse la mano al pecho', 'reír de puro alivio'],
      dentro: ['quitarse un peso de encima', 'volver a respirar', 'darse cuenta de lo asustada que estaba']
    },
    'Sorpresa': {
      cuerpo: ['un vuelco en el corazón', 'contener el aliento', 'quedarse helada'],
      gestos: ['abrir mucho los ojos', 'llevarse la mano a la boca', 'dar un respingo', 'quedarse con la palabra en la boca'],
      dentro: ['no dar crédito', 'el cerebro tarda en entenderlo', 'tener que mirarlo dos veces']
    },
    'Culpa': {
      cuerpo: ['peso en el estómago', 'insomnio', 'no poder tragar'],
      gestos: ['evitar su mirada', 'pedir perdón demasiadas veces', 'compensar con detalles', 'morderse las uñas'],
      dentro: ['repasar lo que hizo', 'justificarse en silencio', 'no merecer lo bueno']
    },
    'Frustración': {
      cuerpo: ['tensión en los hombros', 'dolor de cabeza', 'suspiro largo'],
      gestos: ['pasarse las manos por la cara', 'resoplar', 'tirar el bolígrafo', 'mirar al techo'],
      dentro: ['sentir que no avanza', 'querer gritar', 'darse por vencida y volver a intentarlo']
    }
  },

  sentidos: {
    'Vista': ['destello', 'resplandor', 'penumbra', 'contraluz', 'reflejo', 'centelleo', 'neblina', 'tornasolado', 'mortecino', 'cegador', 'difuso', 'nítido', 'velado', 'ambarino', 'cobrizo', 'plomizo', 'nacarado'],
    'Oído': ['susurro', 'murmullo', 'crujido', 'chasquido', 'zumbido', 'estruendo', 'tintineo', 'repiqueteo', 'chirrido', 'eco', 'silbido', 'rumor', 'golpeteo', 'carraspeo', 'gemido', 'retumbar'],
    'Olfato': ['aroma', 'fragancia', 'tufo', 'hedor', 'a tierra mojada', 'a café recién hecho', 'a ropa limpia', 'a humo', 'a salitre', 'a lejía', 'a canela', 'a colonia cara', 'a cerrado', 'a pan caliente', 'a jazmín'],
    'Tacto': ['áspero', 'sedoso', 'rugoso', 'terso', 'pegajoso', 'gélido', 'tibio', 'abrasador', 'húmedo', 'aterciopelado', 'calloso', 'escurridizo', 'erizado', 'cosquilleo', 'roce'],
    'Gusto': ['amargo', 'dulzón', 'ácido', 'salado', 'picante', 'empalagoso', 'metálico', 'afrutado', 'avinagrado', 'insípido', 'tostado', 'sabor a sangre', 'a menta']
  },

  acciones: {
    'Mirar': ['observar', 'contemplar', 'escrutar', 'otear', 'atisbar', 'vislumbrar', 'echar un vistazo', 'clavar la mirada', 'mirar de reojo', 'fulminar con la mirada', 'repasar de arriba abajo', 'no apartar los ojos', 'buscar con la mirada'],
    'Andar': ['caminar', 'pasear', 'deambular', 'merodear', 'avanzar', 'arrastrar los pies', 'zancadas', 'pasitos', 'irrumpir', 'escabullirse', 'tambalearse', 'renquear', 'marchar', 'cruzar', 'acercarse despacio'],
    'Sonreír': ['esbozar una sonrisa', 'sonrisa torcida', 'medio sonreír', 'sonreír de lado', 'contener una sonrisa', 'sonrisa forzada', 'sonreír con los ojos', 'iluminarse la cara', 'mueca'],
    'Tocar': ['rozar', 'acariciar', 'apretar', 'sujetar', 'recorrer con los dedos', 'posar la mano', 'tantear', 'palpar', 'aferrar', 'estrechar', 'enredar los dedos'],
    'Coger': ['tomar', 'agarrar', 'asir', 'atrapar', 'arrebatar', 'recoger', 'sostener', 'alcanzar', 'hacerse con'],
    'Llorar': ['sollozar', 'gimotear', 'romper a llorar', 'humedecerse los ojos', 'escaparse una lágrima', 'llorar en silencio', 'deshacerse en lágrimas', 'contener el llanto', 'hipar'],
    'Reír': ['carcajada', 'risita', 'reír por lo bajo', 'soltar una risa', 'reír a mandíbula batiente', 'contener la risa', 'reír sin ganas', 'resoplar divertida'],
    'Suspirar': ['exhalar', 'soltar el aire', 'resoplar', 'tomar aire', 'contener el aliento', 'respirar hondo'],
    'Besar': ['rozar los labios', 'besar despacio', 'beso robado', 'besar la comisura', 'beso hambriento', 'besar la frente', 'buscar su boca', 'beso que sabe a despedida'],
    'Pensar': ['cavilar', 'reflexionar', 'darle vueltas', 'rumiar', 'sopesar', 'caer en la cuenta', 'recordar', 'imaginar', 'divagar']
  },

  // Verbos de diálogo (en pasado), por tono
  dialogo: {
    'Bajito': ['susurró', 'murmuró', 'musitó', 'masculló', 'farfulló', 'bisbiseó'],
    'Con fuerza': ['gritó', 'exclamó', 'chilló', 'bramó', 'rugió', 'vociferó'],
    'Con mala leche': ['espetó', 'soltó', 'gruñó', 'bufó', 'refunfuñó', 'rezongó', 'protestó', 'se quejó', 'escupió'],
    'Respondiendo': ['respondió', 'contestó', 'replicó', 'repuso', 'objetó', 'atajó', 'cortó', 'zanjó', 'sentenció', 'rebatió'],
    'Jugando / coqueteo': ['bromeó', 'se burló', 'provocó', 'ronroneó', 'ironizó', 'tanteó', 'se rio', 'canturreó', 'picó'],
    'Con emoción': ['sollozó', 'balbuceó', 'tartamudeó', 'titubeó', 'jadeó', 'suspiró', 'suplicó', 'rogó', 'se lamentó', 'gimió'],
    'Contando': ['explicó', 'aclaró', 'añadió', 'comentó', 'apuntó', 'señaló', 'observó', 'continuó', 'prosiguió', 'insistió'],
    'Admitiendo': ['admitió', 'reconoció', 'confesó', 'concedió', 'aceptó', 'cedió'],
    'Imponiendo': ['ordenó', 'advirtió', 'amenazó', 'exigió', 'aseguró', 'prometió', 'juró'],
    'Preguntando': ['preguntó', 'inquirió', 'quiso saber', 'indagó', 'tanteó', 'sondeó'],
  },

  conectores: {
    'Añadir': ['además', 'asimismo', 'también', 'incluso', 'encima', 'por si fuera poco', 'es más', 'de igual modo', 'igualmente', 'por otra parte', 'aparte de eso', 'y para colmo'],
    'Contraste': ['pero', 'sin embargo', 'no obstante', 'aun así', 'en cambio', 'por el contrario', 'a pesar de ello', 'con todo', 'ahora bien', 'aunque', 'si bien', 'mientras que', 'eso sí'],
    'Causa': ['porque', 'ya que', 'puesto que', 'dado que', 'como', 'debido a que', 'a causa de', 'pues', 'gracias a que', 'visto que'],
    'Consecuencia': ['así que', 'por eso', 'por lo tanto', 'por consiguiente', 'de modo que', 'de manera que', 'en consecuencia', 'así pues', 'total, que', 'con lo que', 'de ahí que'],
    'Tiempo': ['entonces', 'luego', 'después', 'más tarde', 'al rato', 'poco después', 'mientras', 'mientras tanto', 'en cuanto', 'nada más', 'apenas', 'de repente', 'de pronto', 'en ese momento', 'al instante', 'a la mañana siguiente', 'días después', 'antes de que', 'hasta que', 'desde que', 'por fin', 'al final'],
    'Orden': ['primero', 'para empezar', 'en primer lugar', 'a continuación', 'por un lado', 'por otro lado', 'por último', 'para terminar'],
    'Explicar': ['por ejemplo', 'es decir', 'o sea', 'en otras palabras', 'mejor dicho', 'dicho de otro modo', 'esto es'],
    'Resumir': ['en resumen', 'en definitiva', 'en fin', 'total', 'al fin y al cabo', 'en conclusión', 'a fin de cuentas', 'en el fondo'],
    'Condición': ['si', 'siempre que', 'con tal de que', 'a no ser que', 'salvo que', 'en caso de que', 'a menos que'],
    'Énfasis': ['de hecho', 'en realidad', 'sobre todo', 'precisamente', 'desde luego', 'claro que', 'por supuesto', 'lo cierto es que', 'la verdad es que'],
    'Finalidad': ['para que', 'a fin de que', 'con el fin de', 'con tal de', 'con la idea de'],
  },

  // Verbos irregulares frecuentes → infinitivo (para buscar sinónimos de «dijo», «hizo»…)
  irregulares: {
    dijo: 'decir', dije: 'decir', dijeron: 'decir', dice: 'decir', dicho: 'decir', diciendo: 'decir',
    hizo: 'hacer', hice: 'hacer', hecho: 'hacer', haciendo: 'hacer', fue: 'ir', fui: 'ir', tuvo: 'tener', tuve: 'tener',
    puso: 'poner', puse: 'poner', puesto: 'poner', vino: 'venir', vine: 'venir', quiso: 'querer', quise: 'querer',
    pudo: 'poder', pude: 'poder', supo: 'saber', supe: 'saber', vio: 'ver', vi: 'ver', visto: 'ver', dio: 'dar', di: 'dar',
    trajo: 'traer', anduvo: 'andar', cayó: 'caer', oyó: 'oír', leyó: 'leer', sintió: 'sentir', pidió: 'pedir',
    durmió: 'dormir', murió: 'morir', muerto: 'morir', sonrió: 'sonreír', rio: 'reír', rió: 'reír', siguió: 'seguir', mintió: 'mentir',
    eligió: 'elegir', volvió: 'volver', vuelto: 'volver', escrito: 'escribir', abierto: 'abrir', roto: 'romper', cubierto: 'cubrir',
  }
};
