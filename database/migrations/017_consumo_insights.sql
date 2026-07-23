-- ============================================================
-- MIGRACIÓN 017: insights de consumo (patrones producto x dia de semana)
-- Ejecutar con: node database/apply_migration_017.js
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS consumo_insights_id_seq;

CREATE TABLE IF NOT EXISTS public.consumo_insights (
    id              bigint NOT NULL DEFAULT nextval('consumo_insights_id_seq'::regclass),
    restaurante_id  bigint NOT NULL,
    patrones        jsonb NOT NULL,
    sugerencias     jsonb NOT NULL,
    generado_en     timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT consumo_insights_pkey PRIMARY KEY (id),
    CONSTRAINT consumo_insights_restaurante_id_key UNIQUE (restaurante_id),
    CONSTRAINT consumo_insights_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);
