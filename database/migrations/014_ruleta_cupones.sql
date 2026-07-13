-- ============================================================
-- MIGRACIÓN 014: cupones reales generados por la ruleta de premios
-- Ejecutar con: node database/apply_migration_014.js
-- ============================================================

ALTER TABLE ruleta_premios
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(20)
        CHECK (tipo IS NULL OR tipo IN ('porcentaje', 'envio_gratis', 'plato_gratis', 'postre_gratis', '2x1_bebidas', '2x1_pizzas')),
    ADD COLUMN IF NOT EXISTS valor NUMERIC;

CREATE TABLE IF NOT EXISTS ruleta_cupones (
    id              BIGSERIAL       PRIMARY KEY,
    codigo          VARCHAR(12)     NOT NULL UNIQUE,
    restaurante_id  BIGINT          NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    tipo            VARCHAR(20)     NOT NULL CHECK (tipo IN ('porcentaje', 'envio_gratis', 'plato_gratis', 'postre_gratis', '2x1_bebidas', '2x1_pizzas')),
    valor           NUMERIC,
    usado           BOOLEAN         NOT NULL DEFAULT FALSE,
    pedido_id_uso   BIGINT          REFERENCES pedidos(id),
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ruleta_cupones_codigo ON ruleta_cupones (codigo);
