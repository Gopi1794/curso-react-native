const db = require('../config/database');
const { sendPushNotification } = require('../services/notificationService');

exports.getAll = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.id, p.estado, p.total, p.direccion_entrega, p.notas, p.fecha_creacion,
                    p.metodo_pago, p.monto_recibido,
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
             GROUP BY p.id, u.nombre, u.apellido, u.telefono, r.nombre, r.apellido, r.id
             ORDER BY p.fecha_creacion DESC
             LIMIT 100`,
            []
        );
        res.json({ success: true, pedidos: result.rows });
    } catch (error) {
        console.error('Error en admin getAll pedidos:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.getRepartidores = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, nombre, apellido, telefono, estado
             FROM usuarios
             WHERE rol = 'repartidor' AND estado = 'activo'
             ORDER BY nombre`,
            []
        );
        res.json({ success: true, repartidores: result.rows });
    } catch (error) {
        console.error('Error en getRepartidores:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const TRANSICIONES_ADMIN = {
    pendiente:      ['en_preparacion', 'cancelado'],
    confirmado:     ['en_preparacion', 'cancelado'],
    en_preparacion: ['en_camino', 'cancelado'],
    en_camino:      ['entregado'],
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

    try {
        const current = await db.query('SELECT estado, usuario_id FROM pedidos WHERE id = $1', [id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        const estadoActual = current.rows[0].estado;
        const permitidos = TRANSICIONES_ADMIN[estadoActual] || [];

        if (!permitidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: `No se puede pasar de "${estadoActual}" a "${estado}"`,
            });
        }

        const result = await db.query(
            `UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING id, estado, usuario_id`,
            [estado, id]
        );

        const pedido = result.rows[0];
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
        console.error('Error en updateEstado admin:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.prepararPedido = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            `UPDATE pedidos SET estado = 'en_preparacion'
             WHERE id = $1 AND estado NOT IN ('entregado', 'cancelado')
             RETURNING id, estado, usuario_id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado o no se puede cambiar su estado' });
        }

        const pedido = result.rows[0];

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
        console.error('Error en prepararPedido:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.asignarRepartidor = async (req, res) => {
    const { id } = req.params;
    const { repartidor_id } = req.body;

    if (!repartidor_id) {
        return res.status(400).json({ success: false, message: 'repartidor_id requerido' });
    }

    try {
        const result = await db.query(
            `UPDATE pedidos SET repartidor_id = $1, estado = 'en_camino'
             WHERE id = $2
             RETURNING id, estado, repartidor_id, direccion_entrega, total`,
            [repartidor_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        const repartidor = await db.query(
            'SELECT push_token, nombre FROM usuarios WHERE id = $1',
            [repartidor_id]
        );

        if (repartidor.rows[0]?.push_token) {
            await sendPushNotification(
                repartidor.rows[0].push_token,
                '¡Nuevo reparto asignado!',
                `Pedido #${id} — ${result.rows[0].direccion_entrega || 'Ver dirección en la app'}`,
                { type: 'nuevo_reparto', pedido_id: id }
            );
        }

        res.json({ success: true, pedido: result.rows[0] });
    } catch (error) {
        console.error('Error en asignarRepartidor:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
