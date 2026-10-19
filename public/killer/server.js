// server.js
//
// Servidor SOLO para desarrollo local. Sirve public/ como estático y monta
// los mismos handlers de api/killers.js sobre Express, para poder abrir el
// overlay en el navegador (o como Browser Source de OBS apuntando a
// http://localhost:3000) sin necesidad de desplegar todavía.
//
// En producción (Vercel), api/killers.js y api/killers/reset.js se sirven
// solos como funciones serverless — este archivo no se usa ahí.

require('dotenv').config();
const express = require('express');
const path = require('path');

const killersHandler = require('./api/killers');
const killersResetHandler = require('./api/killers/reset');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.all('/api/killers', killersHandler);
app.all('/api/killers/reset', killersResetHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const usingSupabase = Boolean(process.env.SUPABASE_URL);
  console.log(`Overlay corriendo en http://localhost:${PORT}`);
  console.log(
    usingSupabase
      ? 'Modo: Supabase conectado'
      : 'Modo: mock local (data/mock-killers.json) — configura .env para usar Supabase real'
  );
});
