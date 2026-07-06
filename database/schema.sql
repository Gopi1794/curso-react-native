-- ============================================================
-- foodapp_db — Schema inicial
-- Motor: PostgreSQL 14+
-- Ejecutar en pgAdmin o con: psql -U postgres -d foodapp_db -f schema.sql
-- ============================================================

-- Extensión para gen_random_uuid() (disponible desde PG 13 sin extensión)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── TABLA: usuarios ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    id              BIGSERIAL       PRIMARY KEY,
    uuid            UUID            NOT NULL DEFAULT gen_random_uuid(),
    nombre          VARCHAR(100)    NOT NULL,
    apellido        VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    telefono        VARCHAR(20)     NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    rol             VARCHAR(20)     NOT NULL DEFAULT 'cliente'
                        CHECK (rol IN ('cliente', 'admin', 'repartidor')),
    estado          VARCHAR(20)     NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP   DEFAULT NOW()
);
-- Columnas agregadas 2026-07-06 (ver database/migrations/2026-07-06-ruta-repartidor.sql):
--   ubicacion_lat, ubicacion_lng, ubicacion_actualizada_en (última posición GPS reportada por el repartidor)

-- ── CONSTRAINTS ──────────────────────────────────────────
ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_email_unique UNIQUE (email);

ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_uuid_unique UNIQUE (uuid);

-- ── ÍNDICES ───────────────────────────────────────────────
-- Búsqueda frecuente por email (login)
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);

-- Filtrado por rol y estado (paneles de admin)
CREATE INDEX IF NOT EXISTS idx_usuarios_rol   ON usuarios (rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios (estado);

-- ── TRIGGER: actualizar fecha_actualizacion automáticamente ──
CREATE OR REPLACE FUNCTION actualizar_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_usuarios_fecha_actualizacion
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();

-- ── DATOS DE PRUEBA (opcional, comentar en producción) ────
-- INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol)
-- VALUES ('Admin', 'App', 'admin@foodapp.com', '12345678',
--         '$2b$10$...hash_generado_con_bcrypt...', 'admin');

-- ── VERIFICACIÓN ─────────────────────────────────────────
-- SELECT * FROM usuarios;
-- \d usuarios

-- ============================================================
-- MÓDULO: RESTAURANTS
-- ============================================================

-- ── TABLA: restaurantes ───────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurantes (
    id              BIGSERIAL       PRIMARY KEY,
    nombre          VARCHAR(150)    NOT NULL,
    descripcion     TEXT,
    direccion       VARCHAR(255),
    telefono        VARCHAR(20),
    horario         JSONB,          -- { "lunes": "09:00-22:00", "martes": "09:00-22:00", ... }
    logo_url        VARCHAR(500),
    estado          VARCHAR(20)     NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo', 'inactivo')),
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurantes_estado ON restaurantes (estado);

-- ── TABLA: menu_items ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
    id              BIGSERIAL       PRIMARY KEY,
    restaurante_id  BIGINT          NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    nombre          VARCHAR(150)    NOT NULL,
    precio          NUMERIC(10,2)   NOT NULL CHECK (precio >= 0),
    categoria       VARCHAR(50)     NOT NULL,
    descripcion     TEXT,
    ingredientes    TEXT[],         -- DEPRECADO: migrado a tabla ingredientes + menu_item_ingredientes
    imagen_key      VARCHAR(100),   -- Clave para el imageMap del frontend
    disponible      BOOLEAN         NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurante  ON menu_items (restaurante_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_categoria    ON menu_items (categoria);
CREATE INDEX IF NOT EXISTS idx_menu_items_disponible   ON menu_items (disponible);

-- ── DATOS DE PRUEBA: restaurante base ─────────────────────
-- INSERT INTO restaurantes (nombre, descripcion, direccion, telefono, horario)
-- VALUES (
--     'FoodApp Restaurant',
--     'El mejor restaurante de la ciudad',
--     'Av. Principal 123, Ciudad',
--     '555-0000',
--     '{"lunes":"09:00-22:00","martes":"09:00-22:00","miercoles":"09:00-22:00",
--       "jueves":"09:00-22:00","viernes":"09:00-23:00","sabado":"10:00-23:00","domingo":"10:00-21:00"}'
-- );

-- ── VERIFICACIÓN ─────────────────────────────────────────
-- SELECT * FROM restaurantes;
-- SELECT * FROM menu_items WHERE restaurante_id = 1;
-- SELECT * FROM menu_items WHERE categoria = 'burgers';

-- ============================================================
-- MÓDULO: INGREDIENTES Y STOCK
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

ALTER TABLE stock_ingredientes
    ADD CONSTRAINT stock_restaurante_ingrediente_unique UNIQUE (restaurante_id, ingrediente_id);

CREATE INDEX IF NOT EXISTS idx_stock_restaurante  ON stock_ingredientes (restaurante_id);
CREATE INDEX IF NOT EXISTS idx_stock_ingrediente  ON stock_ingredientes (ingrediente_id);
CREATE INDEX IF NOT EXISTS idx_stock_cantidad     ON stock_ingredientes (cantidad);

CREATE OR REPLACE TRIGGER trg_stock_fecha_actualizacion
    BEFORE UPDATE ON stock_ingredientes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();

-- ── VISTA: disponibilidad de platos por sucursal ─────────────
CREATE OR REPLACE VIEW vista_disponibilidad_platos AS
SELECT
    mi.id AS menu_item_id,
    mi.nombre AS plato,
    mi.restaurante_id,
    r.nombre AS sucursal,
    COUNT(mii.id) AS total_ingredientes,
    COUNT(CASE WHEN COALESCE(si.cantidad, 0) > 0 THEN 1 END) AS ingredientes_con_stock,
    CASE
        WHEN COUNT(mii.id) = 0 THEN TRUE
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

-- ── VERIFICACIÓN ─────────────────────────────────────────
-- SELECT * FROM ingredientes ORDER BY categoria, nombre;
-- SELECT * FROM vista_disponibilidad_platos WHERE restaurante_id = 1;

-- ============================================================
-- MÓDULO: ORDERS
-- ============================================================

-- ── TABLA: pedidos ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
    id                  BIGSERIAL       PRIMARY KEY,
    usuario_id          BIGINT          NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    restaurante_id      BIGINT          NOT NULL REFERENCES restaurantes(id) ON DELETE RESTRICT,
    estado              VARCHAR(20)     NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente','confirmado','en_preparacion','en_camino','entregado','cancelado')),
    total               NUMERIC(10,2)   NOT NULL CHECK (total >= 0),
    direccion_entrega   VARCHAR(255),
    notas               TEXT,
    fecha_creacion      TIMESTAMP       NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP       DEFAULT NOW()
);
-- Columnas agregadas 2026-07-06 (ver database/migrations/2026-07-06-ruta-repartidor.sql):
--   distancia_metros, duracion_segundos, eta_calculado_en (última ruta calculada con Google Routes API)

CREATE INDEX IF NOT EXISTS idx_pedidos_usuario    ON pedidos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado     ON pedidos (estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha      ON pedidos (fecha_creacion DESC);

CREATE OR REPLACE TRIGGER trg_pedidos_fecha_actualizacion
    BEFORE UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();

-- ── TABLA: pedido_items ───────────────────────────────────
-- Guarda nombre y precio al momento del pedido para preservar
-- el historial aunque el menú cambie en el futuro.
CREATE TABLE IF NOT EXISTS pedido_items (
    id              BIGSERIAL       PRIMARY KEY,
    pedido_id       BIGINT          NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    menu_item_id    BIGINT          REFERENCES menu_items(id) ON DELETE SET NULL,
    nombre_item     VARCHAR(150)    NOT NULL,
    precio_unitario NUMERIC(10,2)   NOT NULL CHECK (precio_unitario >= 0),
    cantidad        INTEGER         NOT NULL CHECK (cantidad > 0),
    subtotal        NUMERIC(10,2)   GENERATED ALWAYS AS (precio_unitario * cantidad) STORED,
    ingredientes_removidos TEXT[]   DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items (pedido_id);

-- ── VERIFICACIÓN ─────────────────────────────────────────
-- SELECT p.*, u.nombre FROM pedidos p JOIN usuarios u ON p.usuario_id = u.id;
-- SELECT * FROM pedido_items WHERE pedido_id = 1;

-- ============================================================
-- MÓDULO: PAYMENTS
-- ============================================================

-- ── TABLA: metodos_pago ───────────────────────────────────
-- Nunca se guarda el número completo de tarjeta (PCI-DSS).
-- Solo los últimos 4 dígitos y la marca para mostrar al usuario.
CREATE TABLE IF NOT EXISTS metodos_pago (
    id                  BIGSERIAL       PRIMARY KEY,
    usuario_id          BIGINT          NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo                VARCHAR(20)     NOT NULL
                            CHECK (tipo IN ('tarjeta', 'efectivo', 'transferencia')),
    ultimos_4_digitos   CHAR(4),        -- solo para tarjetas
    marca               VARCHAR(20),    -- visa, mastercard, amex, etc.
    es_principal        BOOLEAN         NOT NULL DEFAULT FALSE,
    fecha_creacion      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metodos_pago_usuario ON metodos_pago (usuario_id);

-- ── TABLA: pagos ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos (
    id                  BIGSERIAL       PRIMARY KEY,
    pedido_id           BIGINT          NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
    usuario_id          BIGINT          NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    metodo_pago_id      BIGINT          REFERENCES metodos_pago(id) ON DELETE SET NULL,
    monto               NUMERIC(10,2)   NOT NULL CHECK (monto > 0),
    estado              VARCHAR(20)     NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente', 'completado', 'fallido', 'reembolsado')),
    referencia          VARCHAR(100),   -- ID de transacción del gateway externo
    fecha_creacion      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_usuario  ON pagos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_pagos_pedido   ON pagos (pedido_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado   ON pagos (estado);

-- ── VERIFICACIÓN ─────────────────────────────────────────
-- SELECT * FROM metodos_pago WHERE usuario_id = 1;
-- SELECT pg.*, pd.estado AS estado_pedido FROM pagos pg JOIN pedidos pd ON pg.pedido_id = pd.id;

-- ============================================================
-- MÓDULO: CUPONES
-- ============================================================

CREATE TABLE IF NOT EXISTS cupones (
    id              BIGSERIAL       PRIMARY KEY,
    oferta          VARCHAR(20)     NOT NULL,           -- "30% OFF", "2X1"
    titulo          VARCHAR(150)    NOT NULL,
    imagen_key      VARCHAR(100),                       -- key para imageMap del frontend
    imagen_real_key VARCHAR(100),                       -- key para imagen de detalle
    valido_hasta    DATE            NOT NULL,
    disclaimer      TEXT,                               -- condición corta visible
    texto_reverso   TEXT,                               -- letra chica (reverso de la tarjeta)
    codigo          VARCHAR(100)    NOT NULL UNIQUE,
    color           VARCHAR(20)     NOT NULL DEFAULT '#FF6B6B',
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cupones_activo ON cupones (activo);
CREATE INDEX IF NOT EXISTS idx_cupones_valido_hasta ON cupones (valido_hasta);

-- ============================================================
-- MÓDULO: COMENTARIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS comentarios (
    id              BIGSERIAL       PRIMARY KEY,
    usuario_id      BIGINT          NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    menu_item_id    BIGINT          NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    rating          SMALLINT        NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comentario      TEXT            NOT NULL,
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP   DEFAULT NOW()
);

ALTER TABLE comentarios
    ADD CONSTRAINT comentarios_usuario_menu_item_unique UNIQUE (usuario_id, menu_item_id);

CREATE INDEX IF NOT EXISTS idx_comentarios_menu_item ON comentarios (menu_item_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_usuario   ON comentarios (usuario_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_rating    ON comentarios (rating);
CREATE INDEX IF NOT EXISTS idx_comentarios_fecha     ON comentarios (fecha_creacion DESC);

CREATE OR REPLACE TRIGGER trg_comentarios_fecha_actualizacion
    BEFORE UPDATE ON comentarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();

-- ── VISTA: rating promedio por plato ─────────────────────────
CREATE OR REPLACE VIEW vista_rating_platos AS
SELECT
    menu_item_id,
    COUNT(*)            AS total_resenas,
    ROUND(AVG(rating), 1) AS rating_promedio
FROM comentarios
GROUP BY menu_item_id;
