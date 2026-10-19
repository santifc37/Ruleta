/**
 * Actualiza el estado 'active' de un killer individual vía PATCH
 * @param {string|number} id - ID del killer
 * @param {boolean} active - Nuevo estado de activación
 */
export async function updateKillerStatus(id, active) {
  try {
    const res = await fetch('/api/killers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active })
    });

    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`Error al actualizar el killer ${id} en Supabase:`, error);
    return null;
  }
}

/**
 * Fuerza el reset de todos los killers a active = true en Supabase vía POST
 */
export async function resetAllKillersInDB() {
  try {
    const res = await fetch('/api/killers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error al resetear los killers en Supabase:', error);
    return null;
  }
}