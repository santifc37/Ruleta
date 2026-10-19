// ============================================================
// cartas-ui.js
// UI del evento de las 5 cartas (Frontend) — Overlay OBS/Twitch
// ============================================================

const DURACION_VOTACION_SEGUNDOS = 30;

let currentRoundCards = []; 
let winnerLetter = null;
let heroShownAt = 0;
const HERO_MIN_SUSPENSE_MS = 2400; 

function getOrCreateContainer(id) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
    }
    return el;
}

const cartasContainer = getOrCreateContainer('cartas-evento-container');
const heroContainer = getOrCreateContainer('hero-card-container');

if (!cartasContainer.dataset.built) {
    cartasContainer.innerHTML = `
        <div class="cartas-columna-principal">
            <div id="titulo-votacion" class="titulo-votacion">VOTACIÓN</div>
            <div id="cronometro-votacion" class="cronometro-votacion"></div>
            <div id="cartas-row-slot" class="cartas-row"></div>
            <button id="btn-iniciar-votacion" class="btn-iniciar-votacion" type="button">
                INICIAR VOTACIÓN
            </button>
            <div id="lista-votos-vertical" class="lista-votos-vertical"></div>
        </div>
    `;
    cartasContainer.dataset.built = 'true';
}

const tituloVotacionEl = document.getElementById('titulo-votacion');
const cronometroEl = document.getElementById('cronometro-votacion');
const cartasRowSlot = document.getElementById('cartas-row-slot');
const btnIniciarVotacion = document.getElementById('btn-iniciar-votacion');
const listaVotosEl = document.getElementById('lista-votos-vertical');

const btnVolverRuleta = (() => {
    let btn = document.getElementById('btn-volver-ruleta');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btn-volver-ruleta';
        btn.textContent = 'VOLVER A LA RULETA';
        document.body.appendChild(btn);
    }
    return btn;
})();

btnVolverRuleta.addEventListener('click', () => {
    window.CartasUI.resetearUICartas();
});

btnIniciarVotacion.addEventListener('click', () => {
    if (window.Votacion) {
        window.Votacion.iniciarVotacion();
    } else {
        console.log('[cartas-ui] window.Votacion no está disponible todavía.');
    }
});

function formatearTiempo(segundos) {
    const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
    const ss = String(segundos % 60).padStart(2, '0');
    return `${mm}:${ss}`;
}

// 1) OCULTAR RULETA / GRID
document.addEventListener('cards:hide-roulette', () => {
    const selectoresAOcultar = ['#killer-grid', '#spin-button', '#cancel-button'];

    selectoresAOcultar.forEach((selector) => {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'none';
    });
});

function mostrarRuletaDeNuevo() {
    const selectoresAMostrar = ['#killer-grid', '#spin-button'];
    selectoresAMostrar.forEach((selector) => {
        const el = document.querySelector(selector);
        if (el) el.style.display = '';
    });
}

// 2) RECEPCIÓN DEL ESTADO DE LA RONDA
document.addEventListener('cards:jackpot-decided', (event) => {
    if (event.detail.isJackpot) {
        mostrarHeroCard();
    }
});

document.addEventListener('cards:ready', (event) => {
    const { isJackpot, cards } = event.detail;
    currentRoundCards = cards;
    winnerLetter = null;

    cronometroEl.textContent = formatearTiempo(DURACION_VOTACION_SEGUNDOS);

    if (tituloVotacionEl) {
        tituloVotacionEl.classList.add('visible');
    }

    if (isJackpot) {
        renderizarCincoCartas(cards, { ocultasParaEntrada: true });
        const transcurrido = Date.now() - heroShownAt;
        const esperaRestante = Math.max(0, HERO_MIN_SUSPENSE_MS - transcurrido);
        setTimeout(() => encogerHeroYRevelarCartas(), esperaRestante);
    } else {
        cronometroEl.classList.add('visible');
        renderizarCincoCartas(cards, { ocultasParaEntrada: false });
        mostrarBotonVotacion();
    }
});

// 3) HERO CARD (Jackpot)
function mostrarHeroCard() {
    const heroSrc = window.Cartas.getCartasData()[4];

    heroContainer.innerHTML = `<img id="hero-card-img" src="${heroSrc}" alt="Carta especial">`;
    heroContainer.classList.add('visible');
    heroShownAt = Date.now();
}

function encogerHeroYRevelarCartas() {
    const heroImg = document.getElementById('hero-card-img');
    if (heroImg) heroImg.classList.add('hero-shrink');

    cartasContainer.classList.add('emergiendo');

    setTimeout(() => {
        heroContainer.classList.remove('visible');
        heroContainer.innerHTML = '';
        cartasContainer.classList.remove('emergiendo', 'esperando-hero');
        
        if (tituloVotacionEl) tituloVotacionEl.classList.add('visible');
        if (cronometroEl) cronometroEl.classList.add('visible');
        mostrarBotonVotacion();
    }, 1000);
}

// 4) RENDER DE LAS 5 CARTAS
function renderizarCincoCartas(cards, { ocultasParaEntrada = false } = {}) {
    cartasRowSlot.innerHTML = '';
    listaVotosEl.innerHTML = '';

    cards.forEach((card) => {
        cartasRowSlot.appendChild(construirElementoCarta(card));

        const fila = document.createElement('div');
        fila.className = 'voto-fila-dibujo';
        fila.innerHTML = `
            <span class="letra-dibujo">${card.letter}</span>
            <div class="linea-vertical-separador"></div>
            <div class="bar-wrapper-dibujo">
                <div id="bar-${card.letter}" class="bar-fill-dibujo"></div>
            </div>
            <div class="linea-vertical-separador"></div>
            <span id="contador-${card.letter}" class="info-votos-dibujo">0 (0%)</span>
        `;
        listaVotosEl.appendChild(fila);
    });

    cartasContainer.classList.add('visible');

    if (ocultasParaEntrada) {
        cartasContainer.classList.add('esperando-hero');
    } else {
        cartasContainer.classList.remove('esperando-hero');
    }
}

function construirElementoCarta(card) {
    const columna = document.createElement('div');
    columna.className = 'carta-columna';

    const cardEl = document.createElement('div');
    cardEl.className = 'event-card';
    cardEl.dataset.letter = card.letter;

    cardEl.innerHTML = `
        <div class="event-card-inner">
            <div class="event-card-front revelable">
                <img src="${card.coverImage}" alt="Carta ${card.letter} oculta">
                <span class="carta-letra-overlay">${card.letter}</span>
            </div>
            <div class="event-card-back">
                <img src="${card.resultImage}" alt="Resultado carta ${card.letter}">
            </div>
        </div>
    `;

    cardEl.querySelector('.event-card-front').addEventListener('click', () => {
        if (!winnerLetter) return;
        if (card.letter === winnerLetter) return;
        if (cardEl.classList.contains('flipped')) return;

        cardEl.classList.add('flipped');
    });

    columna.appendChild(cardEl);
    return columna;
}

// 5) BOTÓN DE INICIAR VOTACIÓN
function mostrarBotonVotacion() {
    btnIniciarVotacion.classList.add('visible');
    listaVotosEl.classList.remove('visible');
}

// 6) EVENTOS DE VOTACIÓN
document.addEventListener('voto:iniciado', () => {
    btnIniciarVotacion.classList.remove('visible');
    cronometroEl.classList.add('visible');
    listaVotosEl.classList.add('visible');
});

document.addEventListener('voto:tick', (event) => {
    cronometroEl.textContent = formatearTiempo(event.detail.timeLeft);
});

document.addEventListener('voto:actualizado', (event) => {
    const { counts } = event.detail;
    const totalVotos = Object.values(counts).reduce((acc, curr) => acc + curr, 0);

    Object.keys(counts).forEach((letra) => {
        const cantidad = counts[letra];
        const porcentaje = totalVotos > 0 ? Math.round((cantidad / totalVotos) * 100) : 0;

        const txtEl = document.getElementById(`contador-${letra}`);
        const barEl = document.getElementById(`bar-${letra}`);

        if (txtEl) txtEl.textContent = `${cantidad} (${porcentaje}%)`;
        if (barEl) barEl.style.width = `${porcentaje}%`;
    });
});

document.addEventListener('voto:ganador', (event) => {
    const { letter } = event.detail;
    winnerLetter = letter;

    cronometroEl.classList.remove('visible');

    const cardEl = document.querySelector(`.event-card[data-letter="${letter}"]`);
    if (!cardEl) return;

    const esJackpot = currentRoundCards.find((c) => c.letter === letter)?.isJackpot;

    cardEl.classList.add('flipped', 'es-ganadora');
    if (esJackpot) cardEl.classList.add('es-jackpot');

    btnVolverRuleta.classList.add('visible');
});

// 7) LIMPIEZA AL VOLVER A LA RULETA
function resetearUICartas() {
    cartasContainer.classList.remove('visible', 'esperando-hero', 'emergiendo');
    cartasRowSlot.innerHTML = '';
    listaVotosEl.innerHTML = '';
    listaVotosEl.classList.remove('visible');
    tituloVotacionEl.classList.remove('visible');
    btnIniciarVotacion.classList.remove('visible');
    btnVolverRuleta.classList.remove('visible');
    cronometroEl.classList.remove('visible');
    cronometroEl.textContent = '';
    winnerLetter = null;
    currentRoundCards = [];
    mostrarRuletaDeNuevo();
}

window.CartasUI = {
    resetearUICartas,
};