
let renderUrlPromise;

export function obtenerRenderUrl() {
  if (!renderUrlPromise) {
    renderUrlPromise = fetch('/api/config')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('No se pudo obtener la configuración de Render');
        }

        const config = await response.json();

        if (
          typeof config.renderUrl !== 'string' ||
          !/^https:\/\/[^/]+$/.test(config.renderUrl)
        ) {
          throw new Error('La URL de Render no es válida');
        }

        return config.renderUrl;
      })
      .catch((error) => {
        // Permite volver a intentarlo si falla la primera petición.
        renderUrlPromise = null;
        throw error;
      });
  }

  return renderUrlPromise;
}
