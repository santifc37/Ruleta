export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Faltan las variables de entorno en Vercel.' });
  }

  // Mapea solo los 4 campos requeridos
  function formatKiller(k) {
    return {
      id: k.id,
      nombre: k.nombre || k.title || '',
      image: k.image || k.imagen || k.image_url || '',
      active: Boolean(k.active)
    };
  }

  // Trae los 44 killers ordenados por id (reutilizado por GET y PATCH)
  async function fetchAllKillers() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/killers?select=*&order=id.asc`, {
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
    return rawData.map(formatKiller);
  }

  // Vuelve a poner todos los killers en active = true
  async function resetAllKillers() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/killers?active=eq.false`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ active: true })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('Error al resetear en Supabase: ' + errorText);
    }

    return fetchAllKillers();
  }

  // 1. PETICIÓN GET (Obtener killers y formatear la respuesta para el init)
  if (req.method === 'GET') {
    try {
      const killers = await fetchAllKillers();
      return res.status(200).json({ killers });
    } catch (error) {
      return res.status(500).json({ error: 'Error al conectar con la base de datos: ' + error.message });
    }
  }

  // 2. PETICIÓN PATCH (Actualizar el estado active de un killer)
  if (req.method === 'PATCH') {
    try {
      const id = req.query.id || req.body?.id;
      const { active } = req.body || {};

      if (id === undefined) {
        return res.status(400).json({ error: 'Falta el ID del killer a actualizar.' });
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/killers?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ active })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(500).json({ error: 'Error al actualizar en Supabase: ' + errorText });
      }

      const updatedData = await response.json();
      const formattedKiller = updatedData[0] ? formatKiller(updatedData[0]) : null;

      // Regla 12: si tras desactivar este killer ya no queda NINGUNO activo,
      // resetear automáticamente los 44 a active = true.
      let resetList = null;
      if (active === false) {
        const all = await fetchAllKillers();
        const activeCount = all.filter((k) => k.active).length;
        if (activeCount === 0) {
          resetList = await resetAllKillers();
        }
      }

      return res.status(200).json(
        resetList ? { killer: formattedKiller, killers: resetList } : { killer: formattedKiller }
      );
    } catch (error) {
      return res.status(500).json({ error: 'Error al conectar con la base de datos: ' + error.message });
    }
  }

  // 3. PETICIÓN POST (Reset manual ligero: actualiza en DB y responde solo la confirmación)
  if (req.method === 'POST') {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/killers?active=eq.false`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: true })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Error al resetear en Supabase: ' + errorText);
      }

      return res.status(200).json({ success: true, message: 'Killers reseteados correctamente.' });
    } catch (error) {
      return res.status(500).json({ error: 'Error al conectar con la base de datos: ' + error.message });
    }
  }

  // Si envían cualquier otro método no soportado
  res.setHeader('Allow', ['GET', 'PATCH', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
