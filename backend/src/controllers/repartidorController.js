const db = require('../config/database');
const { sendPushNotification } = require('../services/notificationService');

exports.getMisPedidos = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.id, p.estado, p.total, p.direccion_entrega, p.notas, p.fecha_creacion,
                    u.nombre AS cliente_nombre, u.apellido AS cliente_apellido, u.telefono AS cliente_telefono,
                    (SELECT a.telefono FROM usuarios a WHERE a.rol = 'admin' AND a.estado = 'activo' ORDER BY a.id LIMIT 1) AS admin_telefono,
                    json_agg(json_build_object(
                        'nombre', mi.nombre,
                        'cantidad', pi.cantidad,
                        'precio', pi.precio_unitario
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

exports.updateEstado = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosPermitidos = ['en_camino', 'entregado'];
    if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    try {
        const result = await db.query(
            `UPDATE pedidos SET estado = $1
             WHERE id = $2 AND repartidor_id = $3
             RETURNING id, estado, usuario_id`,
            [estado, id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado o no asignado a vos' });
        }

        const cliente = await db.query(
            'SELECT push_token FROM usuarios WHERE id = $1',
            [result.rows[0].usuario_id]
        );

        if (cliente.rows[0]?.push_token) {
            const msgs = {
                en_camino: { title: '¡Tu pedido está en camino!', body: 'El repartidor ya salió con tu pedido.' },
                entregado:  { title: '¡Pedido entregado!',        body: 'Gracias por tu compra. ¡Buen provecho!' },
            };
            await sendPushNotification(
                cliente.rows[0].push_token,
                msgs[estado].title,
                msgs[estado].body,
                { type: 'estado_pedido', pedido_id: id, estado }
            );
        }

        res.json({ success: true, pedido: result.rows[0] });
    } catch (error) {
        console.error('Error en updateEstado repartidor:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
