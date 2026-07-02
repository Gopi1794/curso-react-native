ALTER TABLE comentarios
    ADD COLUMN IF NOT EXISTS ai_categoria   TEXT,
    ADD COLUMN IF NOT EXISTS ai_sentimiento TEXT,
    ADD COLUMN IF NOT EXISTS ai_resumen     TEXT;

CREATE INDEX IF NOT EXISTS idx_comentarios_ai_categoria
    ON comentarios (ai_categoria)
    WHERE ai_categoria IS NOT NULL;
