export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Faltan las variables de entorno en Vercel.' });
  }

  // Mapea solo los campos requeridos
  function formatCarta(c) {
    return {
      id: c.id,
      tipo: Number(c.tipo),
      image: c.image || c.imagen || c.image_url || ''
    };
  }

  // Trae todas las cartas ordenadas por tipo (reutilizable si en el futuro se agrega otro método)
  async function fetchAllCartas() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/cartas?select=*&order=tipo.asc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('Supabase rechazó la petición: ' + errorText);
    }

    const rawData = await response.json();
    return rawData.map(formatCarta);
  }

  // Agrupa las cartas por tipo en la forma que el frontend consume directamente:
  // { 1: [imagenes...], 2: [imagenes...], 3: "imagenUnica", 4: "imagenUnica" }
  // Tipos 1 y 2 tienen variedad -> arrays de imágenes.
  // Tipos 3 y 4 son fijos -> se guarda una sola imagen (la primera encontrada).
  function agruparPorTipo(cartas) {
    const grupos = { 1: [], 2: [], 3: null, 4: null };

    for (const carta of cartas) {
      if (carta.tipo === 1 || carta.tipo === 2) {
        grupos[carta.tipo].push(carta.image);
      } else if (carta.tipo === 3 || carta.tipo === 4) {
        if (!grupos[carta.tipo]) {
          grupos[carta.tipo] = carta.image;
        }
      }
    }

    return grupos;
  }

  // 1. PETICIÓN GET (Obtener las cartas agrupadas por tipo)
  if (req.method === 'GET') {
    try {
      const cartas = await fetchAllCartas();
      const cartasPorTipo = agruparPorTipo(cartas);

      return res.status(200).json({ cartas: cartasPorTipo });
    } catch (error) {
      return res.status(500).json({ error: 'Error al conectar con la base de datos: ' + error.message });
    }
  }

  // Si envían cualquier otro método no soportado
  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}