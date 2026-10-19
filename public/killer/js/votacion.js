// ============================================================
// votacion.js
// Módulo de votación (Frontend) — Overlay OBS/Twitch
// ------------------------------------------------------------
// Responsabilidad: gestionar el ciclo de vida de una ronda de
// votación (start_voting / vote / stop_voting), el cronómetro
// de 30s, el conteo de votos, la determinación del ganador
// (con desempate aleatorio) y el disparo del Flip.
//
// Este archivo NO gestiona UI. Todos los puntos donde normalmente
// se actualizaría el DOM están marcados con console.log().
// ============================================================

const VOTING_DURATION_SECONDS = 30;
const OPTIONS = ["A", "B", "C", "D", "E"];

// ---- ESTADO CENTRALIZADO DE LA RONDA ----
const votacionState = {
    roundId: null,
    isActive: false,
    counts: { A: 0, B: 0, C: 0, D: 0, E: 0 },
    timeLeft: VOTING_DURATION_SECONDS,
    timerInterval: null,
    winner: null,
};

// ============================================================
// CONEXIÓN WEBSOCKET (Socket.io hacia Render)
// ============================================================

// NOTA: reemplazar por la URL real del servicio en Render.
const RENDER_SOCKET_URL = "https://server-render-ruleta.onrender.com";

const socket = io(RENDER_SOCKET_URL);

socket.on("connect", () => {
    console.log("[votacion] Conectado al servidor de Render (WebSocket).");
});

socket.on("disconnect", () => {
    console.log("[votacion] Desconectado del servidor de Render.");
});

// ============================================================
// EVENTOS RECIBIDOS DESDE RENDER
// ============================================================

socket.on("start_voting", (data) => {
    handleStartVoting(data);
});

socket.on("vote", (data) => {
    handleVote(data);
});

socket.on("stop_voting", (data) => {
    handleStopVotingConfirmed(data);
});

// ============================================================
// INICIO DE VOTACIÓN
// ============================================================

/**
 * Debe llamarse cuando el streamer presiona [INICIAR VOTACIÓN].
 * Envía la solicitud a Render; el roundId real llega en la
 * confirmación "start_voting" (ver handleStartVoting).
 */
function iniciarVotacion() {
    if (votacionState.isActive) {
        console.log("[votacion] Ya hay una votación en curso. Ignorado.");
        return;
    }
    console.log("[votacion] Solicitando inicio de votación a Render...");
    socket.emit("start_voting_request");
}

function handleStartVoting(data) {
    votacionState.roundId = data.roundId;
    votacionState.isActive = true;
    votacionState.counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    votacionState.timeLeft = VOTING_DURATION_SECONDS;
    votacionState.winner = null;

    console.log(`[votacion] Votación iniciada. roundId = ${data.roundId}`);
    console.log("[votacion] Contadores reiniciados:", votacionState.counts);

    document.dispatchEvent(new CustomEvent('voto:iniciado', {
        detail: { roundId: data.roundId }
    }));

    iniciarCronometro();
}

// ============================================================
// CRONÓMETRO (30 segundos, propiedad del frontend)
// ============================================================

function iniciarCronometro() {
    detenerCronometro(); // por seguridad, evita intervalos duplicados

    console.log(`[votacion] Cronómetro iniciado: ${votacionState.timeLeft}s`);

    votacionState.timerInterval = setInterval(() => {
        votacionState.timeLeft--;

        console.log(`[votacion] Tiempo restante: ${votacionState.timeLeft}s`);

        document.dispatchEvent(new CustomEvent('voto:tick', {
            detail: { timeLeft: votacionState.timeLeft }
        }));

        if (votacionState.timeLeft <= 0) {
            detenerCronometro();
            finalizarVotacion();
        }
    }, 1000);
}

function detenerCronometro() {
    if (votacionState.timerInterval) {
        clearInterval(votacionState.timerInterval);
        votacionState.timerInterval = null;
    }
}

// ============================================================
// RECEPCIÓN DE VOTOS
// ============================================================

function handleVote(data) {
    if (!votacionState.isActive) {
        console.log("[votacion] Voto recibido fuera de ronda activa. Ignorado.");
        return;
    }

    if (data.roundId !== votacionState.roundId) {
        console.log("[votacion] Voto de una ronda distinta. Ignorado.");
        return;
    }

    if (!OPTIONS.includes(data.option)) {
        console.log(`[votacion] Opción inválida recibida: ${data.option}`);
        return;
    }

    votacionState.counts[data.option]++;
    console.log(
        `[votacion] Voto recibido -> ${data.option} (+1). Total actual:`,
        { ...votacionState.counts }
    );

    document.dispatchEvent(new CustomEvent('voto:actualizado', {
        detail: { option: data.option, counts: { ...votacionState.counts } }
    }));
}

// ============================================================
// FIN DE VOTACIÓN
// ============================================================

/**
 * Se ejecuta cuando el cronómetro del frontend llega a 0.
 * 1) Bloquea votos localmente.
 * 2) Informa a Render (stop_voting_request).
 * 3) Determina ganador y ejecuta el flip.
 */
function finalizarVotacion() {
    votacionState.isActive = false;
    console.log("[votacion] Tiempo agotado. Votos bloqueados.");

    console.log("[votacion] Notificando a Render el fin de la ronda...");
    socket.emit("stop_voting_request", { roundId: votacionState.roundId });

    const ganadora = determinarGanador(votacionState.counts);
    votacionState.winner = ganadora;

    console.log(`[votacion] Carta ganadora: ${ganadora}`);

    document.dispatchEvent(new CustomEvent('voto:ganador', {
        detail: { letter: ganadora, counts: { ...votacionState.counts } }
    }));

    ejecutarFlipGanadora(ganadora);
}

/**
 * Confirmación desde Render de que la ronda quedó cerrada
 * del lado del servidor (ya no acepta más votos entrantes).
 */
function handleStopVotingConfirmed(data) {
    console.log(
        `[votacion] Render confirmó cierre de ronda. roundId = ${data.roundId}`
    );
}

// ============================================================
// DETERMINACIÓN DEL GANADOR (con desempate aleatorio)
// ============================================================

function determinarGanador(counts) {
    const maxVotos = Math.max(...Object.values(counts));

    const empatadas = Object.keys(counts).filter(
        (opcion) => counts[opcion] === maxVotos
    );

    if (empatadas.length === 1) {
        console.log(
            `[votacion] Ganador claro: ${empatadas[0]} con ${maxVotos} votos.`
        );
        return empatadas[0];
    }

    // Empate (incluye el caso de que todas tengan 0 votos)
    const indiceAleatorio = Math.floor(Math.random() * empatadas.length);
    const ganadorPorDesempate = empatadas[indiceAleatorio];

    console.log(
        `[votacion] Empate entre [${empatadas.join(", ")}] con ${maxVotos} votos. ` +
        `Desempate aleatorio -> ${ganadorPorDesempate}`
    );

    return ganadorPorDesempate;
}

// ============================================================
// FLIP DE LA CARTA GANADORA (placeholder sin UI)
// ============================================================

function ejecutarFlipGanadora(letra) {
    console.log(`[votacion] Ejecutando FLIP automático de la carta ${letra}.`);
    // Aquí, en la integración final, se llamará a la función
    // encargada del Flip 3D real de la carta correspondiente,
    // por ejemplo: cartas.flip(letra);
}

/**
 * Revelación manual de una carta perdedora.
 * Debe conectarse al click del streamer sobre una carta boca abajo.
 */
function revelarCartaManual(letra) {
    if (letra === votacionState.winner) {
        console.log(
            `[votacion] La carta ${letra} ya fue revelada automáticamente (ganadora).`
        );
        return;
    }

    console.log(`[votacion] Revelación manual solicitada -> carta ${letra}.`);
    // Aquí se llamaría al Flip individual de esa carta.
}

// ============================================================
// EXPORTS (para uso desde otros módulos del frontend)
// ============================================================

window.Votacion = {
    iniciarVotacion,
    revelarCartaManual,
    getState: () => ({ ...votacionState }),
};