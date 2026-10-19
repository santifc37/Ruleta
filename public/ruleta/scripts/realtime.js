
import { io } from 'https://cdn.socket.io/4.8.3/socket.io.esm.min.js';
import { obtenerRenderUrl } from './render-config.js';

export async function iniciarEscuchaPerks(onRecargarLista) {
  const urlRender = await obtenerRenderUrl();

  const socket = io(urlRender, {
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('🟢 Conectado a Render para recibir perks en tiempo real.');
  });

  socket.on('perk-guardado', (data) => {
    console.log('📥 Perk nuevo guardado en el backend:', data);

    if (typeof onRecargarLista === 'function') {
      onRecargarLista(data);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 Desconectado de Render (tiempo real).');
  });

  socket.on('connect_error', (error) => {
    console.error('Error de conexión Socket.IO:', error);
  });

  return socket;
}
