export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const renderUrl = process.env.RENDER_URL || process.env.URL_RENDER;

  if (!renderUrl) {
    return res.status(500).json({
      error: 'Falta configurar RENDER_URL en las variables de entorno de Vercel'
    });
  }

  return res.status(200).json({
    renderUrl: renderUrl.replace(/\/+$/, '')
  });
}