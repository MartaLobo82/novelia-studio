'use strict';
// =====================================================================
//  Novelia Studio — en el móvil: menú abajo (con «Más»), capítulos y
//  panel de la escena como hojas que se abren encima del texto.
// =====================================================================
(() => {
  const esMovil = () => matchMedia('(max-width: 760px)').matches;
  const rail = document.getElementById('rail');
  const vEsc = document.getElementById('v-escribir');
  const PRINCIPALES = ['inicio', 'escribir', 'plan', 'calendario'];

  // --- menú de abajo: 4 principales + «Más» ---
  [...rail.querySelectorAll('button[data-vista]')].forEach(b => { if (!PRINCIPALES.includes(b.dataset.vista)) b.classList.add('secundario'); });
  // No es <button>: el arranque pone su propio onclick a todos los botones del menú
  const mas = document.createElement('div');
  mas.className = 'btn-mas'; mas.setAttribute('role', 'button'); mas.tabIndex = 0;
  mas.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>Más';
  rail.appendChild(mas);
  const fondo = document.createElement('div');
  fondo.className = 'velo-movil';
  document.body.appendChild(fondo);
  const cerrarTodo = () => { rail.classList.remove('mas-abierto'); vEsc.classList.remove('ver-arbol', 'ver-lateral'); fondo.classList.remove('on'); };
  mas.onclick = (e) => { e.stopPropagation(); const on = !rail.classList.contains('mas-abierto'); cerrarTodo(); rail.classList.toggle('mas-abierto', on); fondo.classList.toggle('on', on); };
  fondo.onclick = cerrarTodo;
  rail.addEventListener('click', (e) => { if (e.target.closest('button[data-vista]')) cerrarTodo(); });
  // «Más» se marca cuando estás en una sección secundaria
  const marcar = () => { const on = rail.querySelector('button.secundario.on'); mas.classList.toggle('on', !!on); };
  new MutationObserver(marcar).observe(rail, { subtree: true, attributes: true, attributeFilter: ['class'] });

  // --- Escribir: botón «Capítulos» y panel como hoja ---
  const barra = vEsc.querySelector('.barra-sup');
  const bCaps = document.createElement('button');
  bCaps.className = 'icono solo-movil'; bCaps.id = 'btn-caps'; bCaps.title = 'Capítulos';
  bCaps.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>';
  barra.insertBefore(bCaps, barra.firstChild);
  const abrir = (cual) => { cerrarTodo(); vEsc.classList.add(cual); fondo.classList.add('on'); };
  bCaps.onclick = () => abrir('ver-arbol');
  const bPanel = document.getElementById('btn-panel');
  bPanel.addEventListener('click', (e) => {
    if (!esMovil()) return;
    e.stopImmediatePropagation();
    vEsc.classList.remove('sin-panel');
    abrir('ver-lateral');
  }, true);
  // Al elegir un capítulo o escena, se cierra la lista
  document.getElementById('lista-nodos').addEventListener('click', (e) => {
    if (!esMovil() || e.target.closest('[data-toggle],[data-menu],input')) return;
    if (e.target.closest('.nodo.cap, .nodo.esc')) setTimeout(cerrarTodo, 120);
  });
  document.querySelectorAll('#add-cap, #add-esc').forEach(b => b.addEventListener('click', () => { if (esMovil()) setTimeout(cerrarTodo, 120); }));
  // Asas para cerrar las hojas
  [vEsc.querySelector('.arbol'), vEsc.querySelector('.lateral')].forEach(h => {
    const x = document.createElement('button');
    x.className = 'cerrar-hoja solo-movil'; x.textContent = 'Cerrar'; x.onclick = cerrarTodo;
    h.insertBefore(x, h.firstChild);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarTodo(); });
  matchMedia('(max-width: 760px)').addEventListener('change', cerrarTodo);
})();
