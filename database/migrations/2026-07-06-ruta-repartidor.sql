-- database/migrations/2026-07-06-ruta-repartidor.sql
-- Agrega soporte para ubicación en vivo del repartidor y ETA calculado por pedido.
-- No destructivo: solo ADD COLUMN IF NOT EXISTS.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ubicacion_lat            NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS ubicacion_lng             NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS ubicacion_actualizada_en   TIMESTAMP;

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS distancia_metros    INT,
  ADD COLUMN IF NOT EXISTS duracion_segundos   INT,
  ADD COLUMN IF NOT EXISTS eta_calculado_en    TIMESTAMP;
