-- ============================================================
-- MIGRACIÓN 013: configuración de la ruleta de premios por restaurante
-- Ejecutar con: node database/apply_migration_013.js
-- ============================================================

ALTER TABLE restaurantes
    ADD COLUMN IF NOT EXISTS ruleta_activa BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS ruleta_premios (
    id              BIGSERIAL       PRIMARY KEY,
    restaurante_id  BIGINT          NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    posicion        SMALLINT        NOT NULL CHECK (posicion >= 0 AND posicion < 8),
    label           VARCHAR(60),
    icon            VARCHAR(60)
);

ALTER TABLE ruleta_premios
    ADD CONSTRAINT ruleta_premios_restaurante_posicion_unique UNIQUE (restaurante_id, posicion);

CREATE INDEX IF NOT EXISTS idx_ruleta_premios_restaurante ON ruleta_premios (restaurante_id);
