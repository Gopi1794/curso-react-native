const TRANSICIONES = {
    pendiente:      ['en_preparacion', 'cancelado'],
    confirmado:     ['en_preparacion', 'cancelado'],
    en_preparacion: ['en_camino', 'cancelado'],
    en_camino:      ['entregado', 'cancelado'],
    entregado:      [],
    cancelado:      [],
};

/**
 * Valida y ejecuta una transición de estado para un pedido.
 * DEBE llamarse dentro de una transacción activa.
 *
 * @param {object} client  - Cliente pg con transacción abierta
 * @param {number} pedidoId
 * @param {string} nuevoEstado
 * @param {string} triggeredBy  - 'admin' | 'repartidor' | 'sistema' | 'cliente'
 * @param {number|null} triggeredById - ID del usuario que dispara el cambio
 * @returns {string} estado anterior
 * @throws Error con .status 404 o 400 según el caso
 */
async function transicionarPedido(client, pedidoId, nuevoEstado, triggeredBy, triggeredById = null) {
    const current = await client.query(
        'SELECT estado FROM pedidos WHERE id = $1 FOR UPDATE',
        [pedidoId]
    );

    if (current.rows.length === 0) {
        const err = new Error('Pedido no encontrado');
        err.status = 404;
        throw err;
    }

    const estadoActual = current.rows[0].estado;
    const permitidos = TRANSICIONES[estadoActual] ?? [];

    if (!permitidos.includes(nuevoEstado)) {
        const err = new Error(`Transición inválida: "${estadoActual}" → "${nuevoEstado}"`);
        err.status = 400;
        throw err;
    }

    await client.query(
        'UPDATE pedidos SET estado = $1 WHERE id = $2',
        [nuevoEstado, pedidoId]
    );

    await client.query(
        `INSERT INTO pedido_estados_historial
            (pedido_id, estado_anterior, estado_nuevo, triggered_by, triggered_by_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedidoId, estadoActual, nuevoEstado, triggeredBy, triggeredById]
    );

    return estadoActual;
}

module.exports = { TRANSICIONES, transicionarPedido };
