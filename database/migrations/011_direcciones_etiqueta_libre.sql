-- Permite etiquetas de dirección de texto libre (ej: "Casa 3", "Depto de mamá")
-- en vez de restringir a los 3 valores fijos Casa/Trabajo/Otro.
-- El formulario del frontend siempre fue texto libre; esta restricción
-- de la base no reflejaba eso y bloqueaba direcciones legítimas.

ALTER TABLE direcciones_usuarios
    DROP CONSTRAINT IF EXISTS direcciones_usuarios_etiqueta_check;
