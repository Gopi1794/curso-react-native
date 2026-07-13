-- ============================================================
-- MIGRACIÓN 000 (retroactiva): columnas de seguridad de login en usuarios
-- Estas columnas ya existen en la base real (se agregaron antes de que
-- este directorio de migraciones empezara a llevar registro) y ya las
-- usa authController.js/authMiddleware.js en producción. Este archivo
-- solo documenta el cambio para el historial — es un no-op si ya existen.
-- Ejecutar con: node database/apply_migration_000.js
-- ============================================================

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS login_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until    TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_logout_at  TIMESTAMP;
