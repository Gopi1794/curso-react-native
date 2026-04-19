-- ============================================================
-- Migración 003: Agregar avatar_url a usuarios
-- ============================================================

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;
