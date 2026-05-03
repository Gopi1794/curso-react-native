-- Migration 005: Tabla de direcciones de usuarios
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS direcciones_usuarios (
    id              BIGSERIAL       PRIMARY KEY,
    usuario_id      BIGINT          NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    etiqueta        VARCHAR(100)    NOT NULL,           -- "Casa", "Trabajo", etc.
    direccion       TEXT            NOT NULL,
    ciudad          VARCHAR(100)    NOT NULL DEFAULT '',
    provincia       VARCHAR(100)    NOT NULL DEFAULT '',
    referencia      TEXT            NOT NULL DEFAULT '', -- piso, depto, referencia
    latitud         NUMERIC(10,7),
    longitud        NUMERIC(10,7),
    es_principal    BOOLEAN         NOT NULL DEFAULT FALSE,
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dir_usuario ON direcciones_usuarios (usuario_id);
CREATE INDEX IF NOT EXISTS idx_dir_principal ON direcciones_usuarios (usuario_id, es_principal);
