// ============================================================
// cartas-evento.js (versión con selección única de imágenes)
// Módulo del evento de las 5 cartas (Frontend) — Overlay OBS/Twitch
// ============================================================

const JACKPOT_PROBABILITY = 0.4; // 4%
const LETRAS = ["A", "B", "C", "D", "E"];

// ---- CACHÉ EN MEMORIA DE LA TABLA `cartas` ----
let cartasData = null;

// ---- ESTADO DE LA RONDA ACTUAL DE CARTAS ----
let roundCardsState = {
    isJackpot: false,
    cards: [],
};

// ============================================================
// 1) CARGA INICIAL
// ============================================================

async function cargarCartasData() {
    try {
        const response = await fetch('/api/cartas');
        if (!response.ok) {
            throw new Error(`Respuesta no OK: ${response.status}`);
        }

        const data = await response.json();
        cartasData = data.cartas;

        console.log('[cartas] Datos de la tabla `cartas` cargados y cacheados:', cartasData);

        precargarAssetsEspeciales();
    } catch (error) {
        console.log('[cartas] Error al cargar /api/cartas:', error.message);
    }
}

function precargarAssetsEspeciales() {
    if (!cartasData) return;

    [cartasData[3], cartasData[4]].forEach((src) => {
        if (!src) return;
        const img = new Image();
        img.src = src;
    });

    console.log('[cartas] Assets especiales (tipo 3 y 4) precargados.');
}

cargarCartasData();

// ============================================================
// 2) INICIO DEL EVENTO
// ============================================================

function iniciarEventoCartas() {
    if (!cartasData) {
        console.log('[cartas] cartasData aún no está cargado. Abortando inicio de evento.');
        return;
    }

    console.log('[cartas] Ocultando grid y ruleta, iniciando evento de cartas...');
    document.dispatchEvent(new CustomEvent('cards:hide-roulette'));

    const isJackpot = Math.random() < JACKPOT_PROBABILITY;
    console.log(`[cartas] RNG ejecutado. isJackpot = ${isJackpot}`);

    document.dispatchEvent(new CustomEvent('cards:jackpot-decided', {
        detail: { isJackpot }
    }));

    construirCincoCartas(isJackpot).then((cards) => {
        roundCardsState = { isJackpot, cards };
        console.log('[cartas] Estado de la ronda construido:', roundCardsState);

        document.dispatchEvent(new CustomEvent('cards:ready', {
            detail: { ...roundCardsState }
        }));
    });
}

// ============================================================
// 3) CONSTRUCCIÓN DE LAS 5 CARTAS (Sin repetición)
// ============================================================

async function construirCincoCartas(isJackpot) {
    const indiceGanadorJackpot = isJackpot
        ? Math.floor(Math.random() * 5)
        : -1;

    // Se obtienen arreglos de imágenes desordenadas y sin repetir para la ronda
    const portadasUnicas = getUniqueFromPool(1, 5);
    const resultadosUnicos = getUniqueFromPool(2, 5);

    const cards = LETRAS.map((letra, index) => {
        if (isJackpot) {
            const esEstaLaJackpot = index === indiceGanadorJackpot;

            return {
                letter: letra,
                coverImage: cartasData[4],   // especial oculta
                resultImage: esEstaLaJackpot
                    ? cartasData[3]              // especial revelada
                    : resultadosUnicos[index],   // resultado normal sin repetir
                isJackpot: esEstaLaJackpot,
                votes: 0,
                flipped: false,
            };
        }

        return {
            letter: letra,
            coverImage: portadasUnicas[index],    // portada sin repetir
            resultImage: resultadosUnicos[index], // resultado sin repetir
            isJackpot: false,
            votes: 0,
            flipped: false,
        };
    });

    await Promise.all(cards.map((card) => precargarImagenPromise(card.coverImage)));
    cards.forEach((card) => precargarImagen(card.resultImage));

    cards.forEach((card) => console.log(`[cartas] Carta ${card.letter} lista (portada precargada):`, card));

    return cards;
}

/**
 * Mezcla el estanque de imágenes y extrae una cantidad de elementos únicos.
 */
function getUniqueFromPool(tipo, cantidad) {
    const pool = cartasData[tipo];

    if (!pool || pool.length === 0) {
        console.log(`[cartas] Advertencia: el pool de tipo ${tipo} está vacío.`);
        return Array(cantidad).fill('');
    }

    // Copia del arreglo original para no alterarlo
    const copiaPool = [...pool];

    // Mezcla aleatoria mediante Fisher-Yates
    for (let i = copiaPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copiaPool[i], copiaPool[j]] = [copiaPool[j], copiaPool[i]];
    }

    // Retorna las primeras 'cantidad' imágenes únicas
    return copiaPool.slice(0, cantidad);
}

function precargarImagen(src) {
    if (!src) return;
    const img = new Image();
    img.src = src;
}

function precargarImagenPromise(src) {
    return new Promise((resolve) => {
        if (!src) return resolve();
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => {
            console.log(`[cartas] No se pudo precargar la imagen: ${src}`);
            resolve();
        };
        img.src = src;
    });
}

// ============================================================
// EXPORTS
// ============================================================

window.Cartas = {
    iniciarEventoCartas,
    getRoundState: () => ({ ...roundCardsState }),
    getCartasData: () => cartasData,
};