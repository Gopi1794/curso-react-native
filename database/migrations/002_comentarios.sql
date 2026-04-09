-- ============================================================
-- MIGRACIÓN 002: Sistema de comentarios y calificaciones
-- Ejecutar con: psql -U postgres -d foodapp_db -f database/migrations/002_comentarios.sql
-- ============================================================

-- ── TABLA: comentarios ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS comentarios (
    id              BIGSERIAL       PRIMARY KEY,
    usuario_id      BIGINT          NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    menu_item_id    BIGINT          NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    rating          SMALLINT        NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comentario      TEXT            NOT NULL,
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP   DEFAULT NOW()
);

-- Un usuario solo puede comentar una vez por plato
ALTER TABLE comentarios
    ADD CONSTRAINT comentarios_usuario_menu_item_unique UNIQUE (usuario_id, menu_item_id);

CREATE INDEX IF NOT EXISTS idx_comentarios_menu_item ON comentarios (menu_item_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_usuario   ON comentarios (usuario_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_rating    ON comentarios (rating);
CREATE INDEX IF NOT EXISTS idx_comentarios_fecha     ON comentarios (fecha_creacion DESC);

-- Trigger: actualizar fecha_actualizacion al editar comentario
CREATE OR REPLACE TRIGGER trg_comentarios_fecha_actualizacion
    BEFORE UPDATE ON comentarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();

-- ── VISTA: rating promedio por plato ─────────────────────────
CREATE OR REPLACE VIEW vista_rating_platos AS
SELECT
    menu_item_id,
    COUNT(*)            AS total_resenas,
    ROUND(AVG(rating), 1) AS rating_promedio
FROM comentarios
GROUP BY menu_item_id;

-- ── VERIFICACIÓN ─────────────────────────────────────────────
-- SELECT * FROM comentarios WHERE menu_item_id = 1;
-- SELECT * FROM vista_rating_platos;
