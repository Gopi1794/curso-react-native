-- ============================================================
-- MIGRACIÓN 012: disponibilidad de platos solo por ingredientes esenciales
-- Ejecutar con: node database/apply_migration_012.js
-- ============================================================

-- Antes: un plato quedaba "no disponible" si CUALQUIER ingrediente (incluso
-- uno removible/opcional) se quedaba sin stock. Ahora solo cuentan los
-- ingredientes con es_removible = FALSE (la base del plato).

DROP VIEW IF EXISTS vista_disponibilidad_platos;

CREATE VIEW vista_disponibilidad_platos AS
SELECT
    mi.id AS menu_item_id,
    mi.nombre AS plato,
    mi.restaurante_id,
    r.nombre AS sucursal,
    COUNT(mii.id) FILTER (WHERE mii.es_removible = FALSE) AS total_ingredientes_esenciales,
    COUNT(CASE WHEN mii.es_removible = FALSE AND COALESCE(si.cantidad, 0) > 0 THEN 1 END) AS esenciales_con_stock,
    CASE
        WHEN COUNT(mii.id) FILTER (WHERE mii.es_removible = FALSE) = 0 THEN TRUE
        WHEN COUNT(mii.id) FILTER (WHERE mii.es_removible = FALSE)
             = COUNT(CASE WHEN mii.es_removible = FALSE AND COALESCE(si.cantidad, 0) > 0 THEN 1 END) THEN TRUE
        ELSE FALSE
    END AS disponible
FROM menu_items mi
JOIN restaurantes r ON r.id = mi.restaurante_id
LEFT JOIN menu_item_ingredientes mii ON mii.menu_item_id = mi.id
LEFT JOIN stock_ingredientes si
    ON si.ingrediente_id = mii.ingrediente_id
    AND si.restaurante_id = mi.restaurante_id
GROUP BY mi.id, mi.nombre, mi.restaurante_id, r.nombre;
