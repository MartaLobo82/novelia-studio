// Momentos clave de una novela romántica. "de" y "a" son el tramo ideal en % de la novela.
// Es una guía, no una ley: muévelos, sáltatelos o añade los tuyos.
const FASES = [
  { id: 'f1', nombre: 'Antes de ellos', sub: 'Quiénes son y por qué no deberían enamorarse' },
  { id: 'f2', nombre: 'El acercamiento', sub: 'Se resisten… y pierden' },
  { id: 'f3', nombre: 'Todo y nada', sub: 'Lo tienen todo y lo pierden' },
  { id: 'f4', nombre: 'El final feliz', sub: 'Lo que hace falta para merecerlo' },
];
const MOMENTOS = [
  { id: 'vida', f: 'f1', n: 'Su vida antes', d: 'Cómo está cada uno al empezar: qué le falta, qué herida arrastra, qué cree que quiere.', de: 0, a: 6 },
  { id: 'encuentro', f: 'f1', n: 'El encuentro', d: 'Se conocen (o se reencuentran). Chispa, choque o las dos cosas.', de: 3, a: 12 },
  { id: 'porque-no', f: 'f1', n: 'Por qué no', d: 'El obstáculo queda claro: lo que hace imposible (o muy mala idea) que acaben juntos.', de: 8, a: 18 },
  { id: 'obligados', f: 'f1', n: 'Obligados a estar juntos', d: 'Algo los ata: un trabajo, un viaje, un trato, una boda falsa… ya no pueden evitarse.', de: 15, a: 25 },
  { id: 'chispas', f: 'f2', n: 'Primeras chispas', d: 'Se ven de verdad por primera vez. Bajan un poco la guardia y les da miedo.', de: 22, a: 35 },
  { id: 'beso', f: 'f2', n: 'El primer roce o el primer beso', d: 'Cruzan una línea física o emocional que ya no se puede descruzar.', de: 30, a: 45 },
  { id: 'medio', f: 'f2', n: 'Punto medio: esto es real', d: 'Admiten (al menos para sí) lo que sienten. Cambia la pregunta: ya no es si, es cómo.', de: 45, a: 55 },
  { id: 'dudas', f: 'f3', n: 'Dudas y paso atrás', d: 'La herida vuelve a hablar. Uno de los dos frena, o el mundo de fuera aprieta.', de: 55, a: 65 },
  { id: 'falsa-felicidad', f: 'f3', n: 'Lo tienen todo', d: 'Intimidad máxima, felicidad que da vértigo… y el lector sabe que algo se va a romper.', de: 62, a: 75 },
  { id: 'ruptura', f: 'f3', n: 'La ruptura', d: 'El golpe. Sale a la luz el secreto, gana el miedo, se separan. Parece imposible arreglarlo.', de: 72, a: 82 },
  { id: 'separados', f: 'f4', n: 'Separados', d: 'Cada uno se enfrenta solo a su herida y entiende qué tiene que cambiar.', de: 78, a: 90 },
  { id: 'gesto', f: 'f4', n: 'El gran gesto', d: 'Alguien demuestra con hechos que ha cambiado. Arriesga, se expone, lo da todo.', de: 87, a: 96 },
  { id: 'final', f: 'f4', n: 'Felices (para siempre o por ahora)', d: 'Juntos de verdad, y el lector se lo cree porque se lo han ganado.', de: 93, a: 100 },
  { id: 'epilogo', f: 'f4', n: 'Epílogo (opcional)', d: 'Un vistazo al futuro: la promesa cumplida.', de: 97, a: 100 },
];
const POVS = ['', 'Ella', 'Él', 'Los dos', 'Otro'];
