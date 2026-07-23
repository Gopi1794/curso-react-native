const db = require('../config/database');
const { sendPushNotification } = require('../services/notificationService');
const { transicionarPedido } = require('../utils/pedidoTransitions');

exports.getMisPedidos = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.id, p.estado, p.total, p.direccion_entrega, p.notas, p.fecha_creacion,
                    p.metodo_pago, p.monto_recibido,
                    u.nombre AS cliente_nombre, u.apellido AS cliente_apellido, u.telefono AS cliente_telefono,
                    (SELECT a.telefono FROM usuarios a WHERE a.rol = 'admin' AND a.estado = 'activo' ORDER BY a.id LIMIT 1) AS admin_telefono,
                    json_agg(json_build_object(
                        'nombre', mi.nombre,
                        'cantidad', pi.cantidad,
                        'precio', pi.precio_unitario,
                        'imagen_key', mi.imagen_key
                    ) ORDER BY mi.nombre) AS items
             FROM pedidos p
             JOIN usuarios u ON u.id = p.usuario_id
             LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
             LEFT JOIN menu_items mi ON mi.id = pi.menu_item_id
             WHERE p.repartidor_id = $1
               AND p.estado NOT IN ('entregado', 'cancelado')
             GROUP BY p.id, u.nombre, u.apellido, u.telefono
             ORDER BY p.fecha_creacion DESC`,
            [req.user.userId]
        );
        res.json({ success: true, pedidos: result.rows });
    } catch (error) {
        console.error('Error en getMisPedidos:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.cobrarEfectivo = async (req, res) => {
    const { id } = req.params;
    const { monto_recibido } = req.body;

    if (!monto_recibido || isNaN(monto_recibido) || monto_recibido <= 0) {
        return res.status(400).json({ success: false, message: 'Monto inválido' });
    }

    try {
        const result = await db.query(
            `UPDATE pedidos SET estado = 'entregado', monto_recibido = $1
             WHERE id = $2 AND repartidor_id = $3 AND metodo_pago = 'efectivo'
             RETURNING id, total, monto_recibido, usuario_id`,
            [monto_recibido, id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        const pedido = result.rows[0];
        const vuelto = parseFloat(monto_recibido) - parseFloat(pedido.total);

        const cliente = await db.query('SELECT push_token FROM usuarios WHERE id = $1', [pedido.usuario_id]);
        if (cliente.rows[0]?.push_token) {
            await sendPushNotification(
                cliente.rows[0].push_token,
                '¡Pedido entregado!',
                'Gracias por tu compra. ¡Buen provecho!',
                { type: 'estado_pedido', pedido_id: id, estado: 'entregado' }
            );
        }

        res.json({ success: true, pedido, vuelto: vuelto.toFixed(2) });
    } catch (error) {
        console.error('Error en cobrarEfectivo:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.getHistorial = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.id, p.estado, p.total, p.direccion_entrega, p.fecha_actualizacion,
                    u.nombre AS cliente_nombre, u.apellido AS cliente_apellido
             FROM pedidos p
             JOIN usuarios u ON u.id = p.usuario_id
             WHERE p.repartidor_id = $1 AND p.estado = 'entregado'
             ORDER BY p.fecha_actualizacion DESC
             LIMIT 50`,
            [req.user.userId]
        );
        res.json({ success: true, pedidos: result.rows });
    } catch (error) {
        console.error('Error en getHistorial:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.getResumenDia = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                COUNT(*)                                                                        AS pedidos_entregados,
                COALESCE(SUM(costo_envio), 0)                                                   AS ganancia,
                COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN monto_recibido ELSE 0 END), 0) AS efectivo_cobrado
             FROM pedidos
             WHERE repartidor_id = $1
               AND estado = 'entregado'
               AND fecha_actualizacion::date = CURRENT_DATE`,
            [req.user.userId]
        );
        const row = result.rows[0];
        res.json({
            success: true,
            pedidos_entregados: parseInt(row.pedidos_entregados),
            ganancia: parseFloat(row.ganancia).toFixed(2),
            efectivo_cobrado: parseFloat(row.efectivo_cobrado).toFixed(2),
        });
    } catch (error) {
        console.error('Error en getResumenDia:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.updateEstado = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosPermitidos = ['en_camino', 'entregado'];
    if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    // Verificar que el pedido está asignado a este repartidor
    const asignado = await db.query(
        'SELECT id, usuario_id FROM pedidos WHERE id = $1 AND repartidor_id = $2',
        [id, req.user.userId]
    );
    if (asignado.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Pedido no encontrado o no asignado a vos' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        await transicionarPedido(client, id, estado, 'repartidor', req.user.userId);

        await client.query('COMMIT');

        const clienteRow = await db.query(
            'SELECT push_token FROM usuarios WHERE id = $1',
            [asignado.rows[0].usuario_id]
        );

        if (clienteRow.rows[0]?.push_token) {
            const msgs = {
                en_camino: { title: '¡Tu pedido está en camino!', body: 'El repartidor ya salió con tu pedido.' },
                entregado:  { title: '¡Pedido entregado!',        body: 'Gracias por tu compra. ¡Buen provecho!' },
            };
            await sendPushNotification(
                clienteRow.rows[0].push_token,
                msgs[estado].title,
                msgs[estado].body,
                { type: 'estado_pedido', pedido_id: id, estado }
            );
        }

        res.json({ success: true, pedido: { id: Number(id), estado } });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.status === 400) return res.status(400).json({ success: false, message: error.message });
        console.error('Error en updateEstado repartidor:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        client.release();
    }
};

exports.avisarLlegada = async (req, res) => {
    const { id } = req.params;

    try {
        const pedido = await db.query(
            `SELECT usuario_id FROM pedidos WHERE id = $1 AND repartidor_id = $2 AND estado = 'en_camino'`,
            [id, req.user.userId]
        );
        if (pedido.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado o no está en camino' });
        }

        const cliente = await db.query('SELECT push_token FROM usuarios WHERE id = $1', [pedido.rows[0].usuario_id]);
        if (cliente.rows[0]?.push_token) {
            await sendPushNotification(
                cliente.rows[0].push_token,
                '¡Tu repartidor llegó!',
                'Te está esperando afuera con tu pedido.',
                { type: 'repartidor_llego', pedido_id: id }
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error en avisarLlegada:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.actualizarUbicacion = async (req, res) => {
    const { lat, lng } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ success: false, message: 'lat y lng son requeridos y deben ser números' });
    }

    try {
        await db.query(
            `UPDATE usuarios SET ubicacion_lat = $1, ubicacion_lng = $2, ubicacion_actualizada_en = NOW()
             WHERE id = $3`,
            [lat, lng, req.user.userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error en actualizarUbicacion:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
