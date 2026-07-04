-- Historial de transiciones de estado para cada pedido
CREATE TABLE IF NOT EXISTS pedido_estados_historial (
    id             SERIAL PRIMARY KEY,
    pedido_id      INTEGER      NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(30),
    estado_nuevo   VARCHAR(30)  NOT NULL,
    triggered_by   VARCHAR(20)  NOT NULL CHECK (triggered_by IN ('admin', 'repartidor', 'sistema', 'cliente')),
    triggered_by_id INTEGER     REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedido_estados_historial_pedido_id
    ON pedido_estados_historial (pedido_id);

CREATE INDEX IF NOT EXISTS idx_pedido_estados_historial_created_at
    ON pedido_estados_historial (created_at DESC);
