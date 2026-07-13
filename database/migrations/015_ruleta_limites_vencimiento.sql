-- ============================================================
-- MIGRACIÓN 015: limite de giros, vencimiento y titularidad de cupones de ruleta
-- Ejecutar con: node database/apply_migration_015.js
-- ============================================================

ALTER TABLE ruleta_cupones
    ADD COLUMN IF NOT EXISTS usuario_id BIGINT REFERENCES usuarios(id),
    ADD COLUMN IF NOT EXISTS fecha_expiracion TIMESTAMP;

ALTER TABLE restaurantes
    ADD COLUMN IF NOT EXISTS ruleta_giros_maximos INTEGER,
    ADD COLUMN IF NOT EXISTS ruleta_activada_en TIMESTAMP;

CREATE TABLE IF NOT EXISTS ruleta_giros (
    id                BIGSERIAL   PRIMARY KEY,
    usuario_id        BIGINT      NOT NULL REFERENCES usuarios(id),
    restaurante_id    BIGINT      NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    gano_premio_real  BOOLEAN     NOT NULL DEFAULT FALSE,
    fecha_creacion    TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ruleta_giros_usuario_restaurante ON ruleta_giros (usuario_id, restaurante_id, fecha_creacion);
