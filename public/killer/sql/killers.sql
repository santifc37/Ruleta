-- Tabla principal de killers, según sección 6 del proyecto.
-- Ejecutar una sola vez en el SQL editor de Supabase.

CREATE TABLE IF NOT EXISTS killers (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

    nombre VARCHAR NOT NULL,
    image VARCHAR NOT NULL,

    active BOOLEAN DEFAULT TRUE,

    posicion INT UNIQUE
);

-- Índice útil ya que siempre se ordena por posicion.
CREATE INDEX IF NOT EXISTS idx_killers_posicion ON killers (posicion);
