-- ============================================================
-- Migración 004: Verificación de email
-- ============================================================

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS token_verificacion VARCHAR(64),
    ADD COLUMN IF NOT EXISTS token_verificacion_expira TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_usuarios_token_verificacion
    ON usuarios (token_verificacion) WHERE token_verificacion IS NOT NULL;
