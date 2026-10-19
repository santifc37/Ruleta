const ROW_SIZES = [5, 6, 7, 8, 7, 6, 5]; // suma 44

let killers = []; 
let isSyncing = new Set(); 

// Obtención dinámica del contenedor sin declarar variables globales conflictivas
function getGridContainer() {
  return document.getElementById('killer-grid');
}

init();

document.getElementById('btnIrRuleta').addEventListener('click', () => {

  window.location.replace('/ruleta/ruleta.html'); 

});

async function init() {
  try {
    const res = await fetch('/api/killers');
    if (!res.ok) throw new Error(`GET /api/killers -> ${res.status}`);
    const data = await res.json();
    killers = data.killers;
    console.log('Killers cargados:', killers);
    renderGrid();
    document.dispatchEvent(new CustomEvent('grid:loaded'));
  } catch (err) {
    console.error('No se pudo cargar el grid de killers:', err);
  }
}

function renderGrid() {
  const gridEl = getGridContainer();
  if (!gridEl) {
    console.error('No se encontró el elemento #killer-grid en el DOM');
    return;
  }

  gridEl.innerHTML = '';

  const sorted = [...killers].sort((a, b) => a.posicion - b.posicion);
  let cursor = 0;

  for (const rowSize of ROW_SIZES) {
    const row = document.createElement('div');
    row.className = 'grid-row';

    const rowKillers = sorted.slice(cursor, cursor + rowSize);
    cursor += rowSize;

    for (const killer of rowKillers) {
      row.appendChild(renderTile(killer));
    }

    gridEl.appendChild(row);
  }
}

function renderTile(killer) {
  const tile = document.createElement('div');
  tile.className = `killer-tile ${killer.active ? 'active' : 'inactive'}`;
  tile.dataset.id = killer.id;
  tile.tabIndex = 0;
  tile.setAttribute('role', 'button');
  tile.setAttribute('aria-pressed', String(killer.active));
  tile.title = killer.nombre;

  const img = document.createElement('img');
  img.src = killer.image;
  img.alt = killer.nombre;
  img.draggable = false;

  tile.appendChild(img);

  tile.addEventListener('click', () => toggleKiller(killer.id));
  tile.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleKiller(killer.id);
    }
  });

  return tile;
}

async function toggleKiller(id) {
  if (isSyncing.has(id)) return;

  const killer = killers.find((k) => k.id === id);
  if (!killer) return;

  const nextActive = !killer.active;
  killer.active = nextActive;
  updateTileVisual(id, nextActive);

  isSyncing.add(id);
  try {
    const res = await fetch('/api/killers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: nextActive }),
    });

    if (!res.ok) throw new Error(`PATCH /api/killers -> ${res.status}`);

    const data = await res.json();

    if (data.killers) {
      killers = data.killers;
      renderGrid();
      document.dispatchEvent(new CustomEvent('grid:updated'));
    }
  } catch (err) {
    console.error(`No se pudo sincronizar el killer ${id}:`, err);
    killer.active = !nextActive;
    updateTileVisual(id, !nextActive);
  } finally {
    isSyncing.delete(id);
  }
}

function updateTileVisual(id, active) {
  const gridEl = getGridContainer();
  if (!gridEl) return;
  const tile = gridEl.querySelector(`.killer-tile[data-id="${id}"]`);
  if (!tile) return;
  tile.classList.toggle('active', active);
  tile.classList.toggle('inactive', !active);
  tile.setAttribute('aria-pressed', String(active));
}