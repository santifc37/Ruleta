
import { obtenerRenderUrl } from './render-config.js';

// Actualizar la clave mediante la API de Vercel.
const btnSaveKey = document.getElementById('btn-save-key');

if (btnSaveKey) {
  btnSaveKey.addEventListener('click', async () => {
    const password = document.getElementById('admin-pass').value;
    const newKey = document.getElementById('new-streamlabs-key').value;

    try {
      const respuesta = await fetch('/api/actualizar-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password, newKey })
      });

      const resultado = await respuesta.json();

      if (respuesta.ok) {
        alert(resultado.message);
        document.getElementById('admin-pass').value = '';
        document.getElementById('new-streamlabs-key').value = '';
      } else {
        alert('Error: ' + (resultado.error || 'No se pudo actualizar la clave'));
      }
    } catch (error) {
      console.error('Error de red:', error);
      alert('Hubo un fallo al conectar con el servidor.');
    }
  });
}

// Única función para comprobar Render y actualizar el indicador visual.
export function iniciarKeepAliveRender(intervaloMs = 300000) {
  let detenido = false;
  let comprobacionEnCurso = false;

  const verificarRender = async () => {
    if (detenido || comprobacionEnCurso) return;

    comprobacionEnCurso = true;

    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');

    try {
      const urlRender = await obtenerRenderUrl();
      const response = await fetch(urlRender);

      if (!response.ok) {
        throw new Error(`Render respondió con HTTP ${response.status}`);
      }

      if (dot) dot.className = 'status-dot online';
      if (text) text.innerText = 'Online';

      console.log('🟢 Render responde correctamente.');
    } catch (error) {
      console.error('🔴 Error comprobando Render:', error);

      if (dot) dot.className = 'status-dot offline';
      if (text) text.innerText = 'Desconectado';
    } finally {
      comprobacionEnCurso = false;
    }
  };

  verificarRender();
  const intervalId = setInterval(verificarRender, intervaloMs);

  // Permite detener el intervalo si alguna vez se necesita.
  return () => {
    detenido = true;
    clearInterval(intervalId);
  };
}
