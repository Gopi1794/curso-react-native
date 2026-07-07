const db = require('../config/database');
const { sendPushNotification } = require('../services/notificationService');
const { transicionarPedido } = require('../utils/pedidoTransitions');

const getAdminRestauranteId = async (req) => {
    if (req.user.restauranteId) return req.user.restauranteId;
    const row = await db.query('SELECT restaurante_id FROM usuarios WHERE id = $1', [req.user.userId]);
    return row.rows[0]?.restaurante_id || null;
};

exports.getAll = async (req, res) => {
    try {
        const restauranteId = await getAdminRestauranteId(req);
        if (!restauranteId) {
            return res.status(403).json({ success: false, message: 'Admin sin restaurante asignado' });
        }

        const result = await db.query(
            `SELECT p.id, p.estado, p.total, p.direccion_entrega, p.notas, p.fecha_creacion,
                    p.metodo_pago, p.monto_recibido, p.pago_confirmado_at,
                    u.nombre AS cliente_nombre, u.apellido AS cliente_apellido, u.telefono AS cliente_telefono,
                    r.nombre AS repartidor_nombre, r.apellido AS repartidor_apellido, r.id AS repartidor_id,
                    json_agg(json_build_object(
                        'nombre', mi.nombre,
                        'cantidad', pi.cantidad,
                        'precio', pi.precio_unitario
                    ) ORDER BY mi.nombre) AS items
             FROM pedidos p
             JOIN usuarios u ON u.id = p.usuario_id
             LEFT JOIN usuarios r ON r.id = p.repartidor_id
             LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
             LEFT JOIN menu_items mi ON mi.id = pi.menu_item_id
             WHERE p.restaurante_id = $1
             GROUP BY p.id, u.nombre, u.apellido, u.telefono, r.nombre, r.apellido, r.id
             ORDER BY p.fecha_creacion DESC
             LIMIT 100`,
            [restauranteId]
        );
        res.json({ success: true, pedidos: result.rows });
    } catch (error) {
        console.error('Error en admin getAll pedidos:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.getNotificaciones = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                p.id,
                p.estado,
                p.total,
                p.fecha_creacion,
                p.fecha_actualizacion,
                u.nombre  AS cliente_nombre,
                u.apellido AS cliente_apellido,
                r.nombre  AS repartidor_nombre,
                r.apellido AS repartidor_apellido
             FROM pedidos p
             JOIN usuarios u ON u.id = p.usuario_id
             LEFT JOIN usuarios r ON r.id = p.repartidor_id
             ORDER BY p.fecha_actualizacion DESC
             LIMIT 50`,
            []
        );
        res.json({ success: true, notificaciones: result.rows });
    } catch (error) {
        console.error('Error en getNotificaciones:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.getResumenRepartidoresDia = async (req, res) => {
    try {
        const restauranteId = await getAdminRestauranteId(req);
        if (!restauranteId) {
            return res.status(403).json({ success: false, message: 'Admin sin restaurante asignado' });
        }

        const result = await db.query(
            `SELECT
                u.id,
                u.nombre,
                u.apellido,
                u.telefono,
                COUNT(p.id)                                                                         AS pedidos_entregados,
                COUNT(p.id) * 2.99                                                                  AS ganancia,
                COALESCE(SUM(CASE WHEN p.metodo_pago = 'efectivo' THEN p.monto_recibido ELSE 0 END), 0) AS efectivo_cobrado
             FROM usuarios u
             LEFT JOIN pedidos p
                ON p.repartidor_id = u.id
               AND p.estado = 'entregado'
               AND p.fecha_actualizacion::date = CURRENT_DATE
             WHERE u.rol = 'repartidor' AND u.estado = 'activo' AND u.restaurante_id = $1
             GROUP BY u.id, u.nombre, u.apellido, u.telefono
             ORDER BY pedidos_entregados DESC, u.nombre`,
            [restauranteId]
        );
        res.json({ success: true, repartidores: result.rows });
    } catch (error) {
        console.error('Error en getResumenRepartidoresDia:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.getRepartidores = async (req, res) => {
    try {
        const restauranteId = await getAdminRestauranteId(req);
        if (!restauranteId) {
            return res.status(403).json({ success: false, message: 'Admin sin restaurante asignado' });
        }

        const result = await db.query(
            `SELECT id, nombre, apellido, telefono, estado
             FROM usuarios
             WHERE rol = 'repartidor' AND estado = 'activo' AND restaurante_id = $1
             ORDER BY nombre`,
            [restauranteId]
        );
        res.json({ success: true, repartidores: result.rows });
    } catch (error) {
        console.error('Error en getRepartidores:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const NOTIF_ESTADO = {
    en_preparacion: { title: '¡Tu pedido está siendo preparado!', body: 'Ya está en cocina.' },
    en_camino:      { title: '¡Tu pedido está en camino!',        body: 'El repartidor ya salió.' },
    entregado:      { title: '¡Pedido entregado!',                body: 'Gracias por tu compra.' },
    cancelado:      { title: 'Tu pedido fue cancelado',           body: 'Contactate con nosotros si tenés dudas.' },
};

exports.updateEstado = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
        return res.status(400).json({ success: false, message: 'estado requerido' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        await transicionarPedido(client, id, estado, 'admin', req.user.userId);

        const pedido = (await client.query(
            'SELECT id, estado, usuario_id FROM pedidos WHERE id = $1',
            [id]
        )).rows[0];

        await client.query('COMMIT');

        const notif = NOTIF_ESTADO[estado];
        if (notif) {
            const cliente = await db.query('SELECT push_token FROM usuarios WHERE id = $1', [pedido.usuario_id]);
            if (cliente.rows[0]?.push_token) {
                await sendPushNotification(
                    cliente.rows[0].push_token,
                    notif.title,
                    notif.body,
                    { type: 'estado_pedido', pedido_id: id, estado }
                );
            }
        }

        res.json({ success: true, pedido });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.status === 404) return res.status(404).json({ success: false, message: error.message });
        if (error.status === 400) return res.status(400).json({ success: false, message: error.message });
        console.error('Error en updateEstado admin:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        client.release();
    }
};

exports.prepararPedido = async (req, res) => {
    const { id } = req.params;

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        await transicionarPedido(client, id, 'en_preparacion', 'admin', req.user.userId);

        const pedido = (await client.query(
            'SELECT id, estado, usuario_id FROM pedidos WHERE id = $1', [id]
        )).rows[0];

        await client.query('COMMIT');

        const cliente = await db.query('SELECT push_token FROM usuarios WHERE id = $1', [pedido.usuario_id]);
        if (cliente.rows[0]?.push_token) {
            await sendPushNotification(
                cliente.rows[0].push_token,
                '¡Tu pedido está siendo preparado!',
                `Tu pedido #${id} ya está en cocina.`,
                { type: 'estado_pedido', pedido_id: id, estado: 'en_preparacion' }
            );
        }

        res.json({ success: true, pedido });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.status === 400) return res.status(400).json({ success: false, message: error.message });
        if (error.status === 404) return res.status(404).json({ success: false, message: error.message });
        console.error('Error en prepararPedido:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        client.release();
    }
};

exports.asignarRepartidor = async (req, res) => {
    const { id } = req.params;
    const { repartidor_id } = req.body;

    if (!repartidor_id) {
        return res.status(400).json({ success: false, message: 'repartidor_id requerido' });
    }

    const restauranteId = await getAdminRestauranteId(req);
    if (!restauranteId) {
        return res.status(403).json({ success: false, message: 'Admin sin restaurante asignado' });
    }

    const repartidorCheck = await db.query(
        `SELECT id FROM usuarios WHERE id = $1 AND rol = 'repartidor' AND restaurante_id = $2`,
        [repartidor_id, restauranteId]
    );
    if (repartidorCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Repartidor no encontrado o no pertenece a este restaurante' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Asignar repartidor
        await client.query(
            'UPDATE pedidos SET repartidor_id = $1 WHERE id = $2',
            [repartidor_id, id]
        );

        // Transición validada: en_preparacion → en_camino
        await transicionarPedido(client, id, 'en_camino', 'admin', req.user.userId);

        const pedido = (await client.query(
            'SELECT id, estado, repartidor_id, direccion_entrega, total, usuario_id FROM pedidos WHERE id = $1',
            [id]
        )).rows[0];

        await client.query('COMMIT');

        // Push al repartidor
        const repartidor = await db.query(
            'SELECT push_token, nombre FROM usuarios WHERE id = $1',
            [repartidor_id]
        );
        if (repartidor.rows[0]?.push_token) {
            await sendPushNotification(
                repartidor.rows[0].push_token,
                '¡Nuevo reparto asignado!',
                `Pedido #${id} — ${pedido.direccion_entrega || 'Ver dirección en la app'}`,
                { type: 'nuevo_reparto', pedido_id: id }
            );
        }

        // Push al cliente
        const cliente = await db.query(
            'SELECT push_token FROM usuarios WHERE id = $1',
            [pedido.usuario_id]
        );
        if (cliente.rows[0]?.push_token) {
            await sendPushNotification(
                cliente.rows[0].push_token,
                '¡Tu pedido está en camino!',
                'El repartidor ya salió con tu pedido.',
                { type: 'estado_pedido', pedido_id: id, estado: 'en_camino' }
            );
        }

        res.json({ success: true, pedido });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.status === 400) return res.status(400).json({ success: false, message: error.message });
        if (error.status === 404) return res.status(404).json({ success: false, message: error.message });
        console.error('Error en asignarRepartidor:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        client.release();
    }
};
