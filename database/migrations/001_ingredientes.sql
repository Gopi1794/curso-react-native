-- ============================================================
-- MIGRACIÓN 001: Sistema de ingredientes con stock por sucursal
-- Ejecutar con: psql -U postgres -d foodapp_db -f database/migrations/001_ingredientes.sql
-- ============================================================

-- ── TABLA: ingredientes (catálogo maestro) ───────────────────
CREATE TABLE IF NOT EXISTS ingredientes (
    id              BIGSERIAL       PRIMARY KEY,
    nombre          VARCHAR(150)    NOT NULL,
    categoria       VARCHAR(50)     NOT NULL DEFAULT 'otro'
                        CHECK (categoria IN (
                            'proteina', 'lacteo', 'verdura', 'fruta',
                            'pan', 'salsa', 'condimento', 'grano',
                            'pasta', 'bebida', 'dulce', 'otro'
                        )),
    unidad_medida   VARCHAR(20)     NOT NULL DEFAULT 'unidad'
                        CHECK (unidad_medida IN ('gr', 'ml', 'unidad')),
    imagen_url      VARCHAR(500),
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW()
);

ALTER TABLE ingredientes
    ADD CONSTRAINT ingredientes_nombre_unique UNIQUE (nombre);

CREATE INDEX IF NOT EXISTS idx_ingredientes_categoria ON ingredientes (categoria);
CREATE INDEX IF NOT EXISTS idx_ingredientes_activo    ON ingredientes (activo);

-- ── TABLA: menu_item_ingredientes (relación plato ↔ ingrediente) ──
CREATE TABLE IF NOT EXISTS menu_item_ingredientes (
    id              BIGSERIAL       PRIMARY KEY,
    menu_item_id    BIGINT          NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    ingrediente_id  BIGINT          NOT NULL REFERENCES ingredientes(id) ON DELETE CASCADE,
    es_removible    BOOLEAN         NOT NULL DEFAULT TRUE,
    cantidad_usada  NUMERIC(10,2)   NOT NULL DEFAULT 1
                        CHECK (cantidad_usada > 0)
);

-- Un ingrediente solo puede aparecer una vez por plato
ALTER TABLE menu_item_ingredientes
    ADD CONSTRAINT menu_item_ingrediente_unique UNIQUE (menu_item_id, ingrediente_id);

CREATE INDEX IF NOT EXISTS idx_mii_menu_item    ON menu_item_ingredientes (menu_item_id);
CREATE INDEX IF NOT EXISTS idx_mii_ingrediente  ON menu_item_ingredientes (ingrediente_id);

-- ── TABLA: stock_ingredientes (stock por sucursal) ───────────
CREATE TABLE IF NOT EXISTS stock_ingredientes (
    id                      BIGSERIAL       PRIMARY KEY,
    restaurante_id          BIGINT          NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    ingrediente_id          BIGINT          NOT NULL REFERENCES ingredientes(id) ON DELETE CASCADE,
    cantidad                NUMERIC(12,2)   NOT NULL DEFAULT 0
                                CHECK (cantidad >= 0),
    umbral_minimo           NUMERIC(12,2)   NOT NULL DEFAULT 5
                                CHECK (umbral_minimo >= 0),
    ultima_actualizacion    TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Stock es único por sucursal + ingrediente
ALTER TABLE stock_ingredientes
    ADD CONSTRAINT stock_restaurante_ingrediente_unique UNIQUE (restaurante_id, ingrediente_id);

CREATE INDEX IF NOT EXISTS idx_stock_restaurante  ON stock_ingredientes (restaurante_id);
CREATE INDEX IF NOT EXISTS idx_stock_ingrediente  ON stock_ingredientes (ingrediente_id);
CREATE INDEX IF NOT EXISTS idx_stock_cantidad     ON stock_ingredientes (cantidad);

-- Trigger: actualizar ultima_actualizacion al modificar stock
CREATE OR REPLACE TRIGGER trg_stock_fecha_actualizacion
    BEFORE UPDATE ON stock_ingredientes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();

-- ── MODIFICAR pedido_items: guardar ingredientes removidos ───
ALTER TABLE pedido_items
    ADD COLUMN IF NOT EXISTS ingredientes_removidos TEXT[] DEFAULT '{}';

-- ── VISTA: disponibilidad de platos por sucursal ─────────────
-- Un plato está disponible si TODOS sus ingredientes tienen stock > 0
CREATE OR REPLACE VIEW vista_disponibilidad_platos AS
SELECT
    mi.id AS menu_item_id,
    mi.nombre AS plato,
    mi.restaurante_id,
    r.nombre AS sucursal,
    COUNT(mii.id) AS total_ingredientes,
    COUNT(CASE WHEN COALESCE(si.cantidad, 0) > 0 THEN 1 END) AS ingredientes_con_stock,
    CASE
        WHEN COUNT(mii.id) = 0 THEN TRUE  -- sin ingredientes registrados = disponible
        WHEN COUNT(mii.id) = COUNT(CASE WHEN COALESCE(si.cantidad, 0) > 0 THEN 1 END) THEN TRUE
        ELSE FALSE
    END AS disponible
FROM menu_items mi
JOIN restaurantes r ON r.id = mi.restaurante_id
LEFT JOIN menu_item_ingredientes mii ON mii.menu_item_id = mi.id
LEFT JOIN stock_ingredientes si
    ON si.ingrediente_id = mii.ingrediente_id
    AND si.restaurante_id = mi.restaurante_id
GROUP BY mi.id, mi.nombre, mi.restaurante_id, r.nombre;

-- ── FUNCIÓN: descontar stock al confirmar pedido ─────────────
CREATE OR REPLACE FUNCTION descontar_stock(
    p_restaurante_id BIGINT,
    p_menu_item_id BIGINT,
    p_cantidad INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE stock_ingredientes si
    SET cantidad = cantidad - (mii.cantidad_usada * p_cantidad)
    FROM menu_item_ingredientes mii
    WHERE mii.menu_item_id = p_menu_item_id
      AND si.ingrediente_id = mii.ingrediente_id
      AND si.restaurante_id = p_restaurante_id;
END;
$$ LANGUAGE plpgsql;

-- ── VERIFICACIÓN ─────────────────────────────────────────────
-- SELECT * FROM ingredientes ORDER BY categoria, nombre;
-- SELECT * FROM menu_item_ingredientes WHERE menu_item_id = 1;
-- SELECT * FROM stock_ingredientes WHERE restaurante_id = 1;
-- SELECT * FROM vista_disponibilidad_platos WHERE restaurante_id = 1;
