const RENDER_URL_RESPALDO = 'https://server-render-ruleta.onrender.com';

export async function obtenerRenderUrl() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('config no disponible');

    const config = await response.json();
    if (typeof config.renderUrl === 'string' && /^https:\/\/[^/]+$/.test(config.renderUrl)) {
      return config.renderUrl;
    }
  } catch (error) {
    console.warn('Usando URL de Render de respaldo:', error);
  }
  return RENDER_URL_RESPALDO;
}