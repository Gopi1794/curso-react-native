-- ============================================================
-- Migración 006: Push Notifications
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Columna push_token en usuarios
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 2. Tabla de preferencias de notificaciones (una fila por usuario)
CREATE TABLE IF NOT EXISTS preferencias_notificaciones (
    id                  BIGSERIAL   PRIMARY KEY,
    usuario_id          BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    pedidos             BOOLEAN     NOT NULL DEFAULT TRUE,
    promociones         BOOLEAN     NOT NULL DEFAULT FALSE,
    noticias            BOOLEAN     NOT NULL DEFAULT TRUE,
    recordatorios       BOOLEAN     NOT NULL DEFAULT FALSE,
    fecha_actualizacion TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE(usuario_id)
);

-- 3. Trigger para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE TRIGGER trg_preferencias_notificaciones_fecha
    BEFORE UPDATE ON preferencias_notificaciones
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();
