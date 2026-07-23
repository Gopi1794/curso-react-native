-- ============================================================
-- MIGRACIÓN 016: zonas de envío por distancia
-- Ejecutar con: node database/apply_migration_016.js
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS zonas_envio_id_seq;

CREATE TABLE IF NOT EXISTS public.zonas_envio (
    id              bigint NOT NULL DEFAULT nextval('zonas_envio_id_seq'::regclass),
    restaurante_id  bigint NOT NULL,
    nombre          character varying NOT NULL,
    radio_km        numeric NOT NULL CHECK (radio_km > 0::numeric),
    costo_envio     numeric NOT NULL CHECK (costo_envio >= 0::numeric),
    activa          boolean NOT NULL DEFAULT true,
    fecha_creacion  timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT zonas_envio_pkey PRIMARY KEY (id),
    CONSTRAINT zonas_envio_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);

ALTER TABLE public.pedidos
    ADD COLUMN IF NOT EXISTS zona_envio_id bigint REFERENCES public.zonas_envio(id),
    ADD COLUMN IF NOT EXISTS costo_envio numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS costo_envio_tarifa_vigente numeric;
