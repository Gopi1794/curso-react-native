-- Vincula cada usuario admin a su restaurante
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS restaurante_id BIGINT REFERENCES restaurantes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_restaurante_id ON usuarios (restaurante_id);

-- Asignar automáticamente el restaurante al admin de Trevi si ya fue creado por el seed
UPDATE usuarios
SET restaurante_id = (SELECT id FROM restaurantes WHERE nombre = 'Trevi' LIMIT 1)
WHERE email = 'admin@trevi.com'
  AND restaurante_id IS NULL;
