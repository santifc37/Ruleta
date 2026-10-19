const spinButton = document.getElementById('spin-button');
const cancelButton = document.getElementById('cancel-button'); 
const winnerBox = document.getElementById('roulette-winner');
const winnerImg = document.getElementById('winner-image');
const winnerName = document.getElementById('winner-name');

let isSpinning = false;
let spinTimeoutId = null; 
let lastWinnerTile = null; 

function getGridEl() {
  return document.getElementById('killer-grid');
}

// Activa el botón de girar sin dobles clics
function enableSpinButton() {
  if (spinButton && !isSpinning) {
    spinButton.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', enableSpinButton);
document.addEventListener('grid:loaded', enableSpinButton);
document.addEventListener('grid:updated', enableSpinButton);

if (spinButton) {
  spinButton.onclick = startSpin;
}

if (cancelButton) {
  cancelButton.onclick = stopSpin;
}

// Delegación global directa para el botón Continuar
document.addEventListener('click', (e) => {
  if (e.target && (e.target.id === 'continue-button' || e.target.classList.contains('continue-button'))) {
    handleContinue();
  }
});

function startSpin() {
  if (isSpinning) return;

  const gridEl = getGridEl();
  if (!gridEl) return;

  const activeTiles = Array.from(gridEl.querySelectorAll('.killer-tile.active'));
  
  if (activeTiles.length === 0) {
    resetAllTilesLocal();
    resetAllKillersInDB();
    return;
  }

  hideWinner();

  // Si solo queda 1, muestra el ganador de inmediato
  if (activeTiles.length === 1) {
    isSpinning = true;
    if (spinButton) spinButton.disabled = true;

    setTimeout(() => {
      finishSpin(activeTiles[0]);
    }, 50);
    return;
  }

  isSpinning = true;
  if (spinButton) spinButton.disabled = true;
  if (cancelButton) cancelButton.hidden = false;

  gridEl.classList.add('spinning'); 
  gridEl.querySelectorAll('.killer-tile.winner').forEach((t) => t.classList.remove('winner'));

  const winnerIndex = Math.floor(Math.random() * activeTiles.length);
  const sequence = buildSpinSequence(activeTiles.length, winnerIndex);
  const delays = buildDelays(sequence.length);

  runStep(activeTiles, sequence, delays, 0);
}

const SPIN_STEPS = 73;

function buildSpinSequence(count, winnerIndex) {
  const totalSteps = SPIN_STEPS;
  const indices = Array.from({ length: count }, (_, i) => i);
  const sequence = [];
  let lastIndex = null;

  for (let i = 0; i < totalSteps - 1; i++) {
    let next;
    do {
      next = indices[Math.floor(Math.random() * indices.length)];
    } while (next === lastIndex && indices.length > 1);

    sequence.push(next);
    lastIndex = next;
  }

  sequence.push(winnerIndex);
  return sequence;
}

function buildDelays(totalSteps) {
  const MIN_DELAY = 45;          
  const MAX_DELAY = 1500;        
  const ACCEL_START = 260;       
  const ACCEL_FRACTION = 0.10;   
  const PLATEAU_FRACTION = 0.35; 
  const DECEL_POWER = 4;         

  const delays = [];

  for (let i = 0; i < totalSteps; i++) {
    const progress = i / (totalSteps - 1);
    let delay;

    if (progress < ACCEL_FRACTION) {
      const t = progress / ACCEL_FRACTION;
      delay = ACCEL_START - (ACCEL_START - MIN_DELAY) * t; 
    } else if (progress < ACCEL_FRACTION + PLATEAU_FRACTION) {
      delay = MIN_DELAY; 
    } else {
      const t = (progress - (ACCEL_FRACTION + PLATEAU_FRACTION)) / (1 - ACCEL_FRACTION - PLATEAU_FRACTION);
      delay = MIN_DELAY + (MAX_DELAY - MIN_DELAY) * Math.pow(t, DECEL_POWER); 
    }

    delays.push(delay);
  }

  return delays;
}

function runStep(tiles, sequence, delays, step) {
  tiles.forEach((t) => {
    t.classList.remove('roulette-highlight', 'winner', 'killer-highlight');
  });

  const index = sequence[step];
  const tile = tiles[index];
  if (tile) {
    tile.classList.add('roulette-highlight');
  }

  const isLastStep = step === sequence.length - 1;
  if (isLastStep) {
    if (cancelButton) cancelButton.hidden = true;
    finishSpin(tile);
    return;
  }

  spinTimeoutId = setTimeout(() => runStep(tiles, sequence, delays, step + 1), delays[step]);
}

function stopSpin() {
  if (spinTimeoutId) {
    clearTimeout(spinTimeoutId);
    spinTimeoutId = null;
  }

  const gridEl = getGridEl();
  if (gridEl) {
    const tiles = gridEl.querySelectorAll('.killer-tile');
    tiles.forEach((t) => t.classList.remove('roulette-highlight', 'winner'));
    gridEl.classList.remove('spinning');
    gridEl.style.pointerEvents = 'auto'; 
  }

  isSpinning = false;
  enableSpinButton();
  if (cancelButton) cancelButton.hidden = true;
}

function finishSpin(winnerTile) {
  if (winnerTile) {
    winnerTile.classList.remove('roulette-highlight');
    winnerTile.classList.add('winner');
  }

  lastWinnerTile = winnerTile;

  const gridEl = getGridEl();
  if (gridEl) {
    gridEl.style.pointerEvents = 'none';
    gridEl.classList.remove('spinning');
  }

  announceWinner(winnerTile);
  isSpinning = false;
  enableSpinButton();
}

// ============================================================
// INTEGRACIÓN EN handleContinue() (roulette.js)
// ------------------------------------------------------------
// Único cambio: reemplazar la última línea de la función
// (el dispatchEvent de 'grid:updated') agregando la llamada
// a Cartas.iniciarEventoCartas() justo después.
// No se toca nada más de la lógica existente del ganador.
// ============================================================

async function handleContinue() {
  const gridEl = getGridEl();

  if (lastWinnerTile) {
    const killerId = lastWinnerTile.dataset.id || lastWinnerTile.id;

    lastWinnerTile.classList.remove('active', 'winner');
    lastWinnerTile.classList.add('inactive');
    lastWinnerTile = null;

    hideWinner();

    if (gridEl) {
      const remainingActive = gridEl.querySelectorAll('.killer-tile.active');

      if (remainingActive.length === 0) {
        resetAllTilesLocal();
        await resetAllKillersInDB();
      } else if (killerId) {
        await updateKillerStatus(killerId, false);
      }
    }
  } else {
    hideWinner();
  }

  document.dispatchEvent(new CustomEvent('grid:updated'));

  // NUEVO: dispara el evento de las 5 cartas justo después
  // de resolver el estado del grid (regla 16 del proyecto).
  window.Cartas.iniciarEventoCartas();
}

function resetAllTilesLocal() {
  const gridEl = getGridEl();
  if (!gridEl) return;
  const allTiles = gridEl.querySelectorAll('.killer-tile');
  allTiles.forEach((tile) => {
    tile.classList.remove('inactive', 'winner', 'roulette-highlight');
    tile.classList.add('active');
  });
}

function announceWinner(tile) {
  if (!tile) return;
  const img = tile.querySelector('img');
  winnerImg.src = img ? img.src : '';
  winnerImg.alt = tile.title || '';
  winnerName.textContent = tile.title || '';

  winnerBox.hidden = false;
  winnerBox.style.display = 'flex';
  winnerBox.style.pointerEvents = 'auto';

  requestAnimationFrame(() => winnerBox.classList.add('visible'));
}

function hideWinner() {
  if (winnerBox) {
    winnerBox.classList.remove('visible');
    winnerBox.hidden = true;
    winnerBox.style.display = 'none';
  }

  const gridEl = getGridEl();
  if (gridEl) {
    gridEl.style.pointerEvents = 'auto';
  }

  enableSpinButton();
}

// Métodos API hacia Vercel
async function updateKillerStatus(id, active) {
  try {
    await fetch('/api/killers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Number(id), active: Boolean(active) })
    });
  } catch (err) {
    console.error('Error enviando PATCH a la API:', err);
  }
}

async function resetAllKillersInDB() {
  try {
    await fetch('/api/killers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error enviando POST a la API:', err);
  }
}