const db = require('../config/database');
const { sendPushNotification } = require('../services/notificationService');

// ── CREATE ORDER ──────────────────────────────────────────
// POST /api/orders
exports.createOrder = async (req, res) => {
    const { restaurante_id, items, direccion_entrega, notas, metodo_pago, cupon_codigo } = req.body;

    // 1. Validar estructura del body
    if (!restaurante_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Se requiere restaurante_id y al menos un ítem en el pedido'
        });
    }

    for (const item of items) {
        if (!item.menu_item_id || !item.cantidad || item.cantidad < 1) {
            return res.status(400).json({
                success: false,
                message: 'Cada ítem debe tener menu_item_id y cantidad (mínimo 1)'
            });
        }
        // ingredientes_removidos es opcional, debe ser array de strings si viene
        if (item.ingredientes_removidos && !Array.isArray(item.ingredientes_removidos)) {
            return res.status(400).json({
                success: false,
                message: 'ingredientes_removidos debe ser un array'
            });
        }
    }

    // Usamos una transacción: si algo falla en el medio, nada queda guardado
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // 2. Verificar que el restaurante exista y esté activo
        const restaurantResult = await client.query(
            'SELECT id FROM restaurantes WHERE id = $1 AND estado = $2',
            [restaurante_id, 'activo']
        );

        if (restaurantResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado o inactivo'
            });
        }

        // 3. Consultar precios reales desde la DB (nunca confiar en el cliente)
        const menuItemIds = items.map(i => i.menu_item_id);
        const menuResult = await client.query(
            `SELECT id, nombre, precio, disponible
             FROM menu_items
             WHERE id = ANY($1) AND restaurante_id = $2`,
            [menuItemIds, restaurante_id]
        );

        // Verificar que todos los ítems existen y pertenecen al restaurante
        if (menuResult.rows.length !== menuItemIds.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Uno o más ítems no pertenecen a este restaurante'
            });
        }

        // Verificar disponibilidad
        const unavailable = menuResult.rows.filter(m => !m.disponible);
        if (unavailable.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Los siguientes ítems no están disponibles: ${unavailable.map(i => i.nombre).join(', ')}`
            });
        }

        // 4. Construir mapa de precios y calcular total
        const priceMap = {};
        menuResult.rows.forEach(m => { priceMap[m.id] = m; });

        let total = 0;
        const orderItems = items.map(item => {
            const menuItem = priceMap[item.menu_item_id];
            const precio = parseFloat(menuItem.precio);

            if (isNaN(precio) || precio < 0) {
                throw new Error(`Precio inválido para el ítem "${menuItem.nombre}"`);
            }

            const subtotal = precio * item.cantidad;
            total += subtotal;
            return {
                menu_item_id: item.menu_item_id,
                nombre_item: menuItem.nombre,
                precio_unitario: precio,
                cantidad: item.cantidad,
                ingredientes_removidos: item.ingredientes_removidos || []
            };
        });

        // 5. Aplicar cupón si viene (validación server-side)
        let descuento = 0;
        if (cupon_codigo?.trim()) {
            const cuponResult = await client.query(
                `SELECT discount_percent FROM cupones
                 WHERE UPPER(codigo) = UPPER($1) AND activo = TRUE AND valido_hasta >= CURRENT_DATE`,
                [cupon_codigo.trim()]
            );
            if (cuponResult.rows[0]) {
                const pct = cuponResult.rows[0].discount_percent;
                descuento  = parseFloat((total * pct / 100).toFixed(2));
                total      = parseFloat((total - descuento).toFixed(2));
            }
        }

        // 6. Insertar el pedido
        const esEfectivo = metodo_pago === 'efectivo';
        const pedidoResult = await client.query(
            `INSERT INTO pedidos (usuario_id, restaurante_id, estado, total, descuento, direccion_entrega, notas, metodo_pago)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, usuario_id, restaurante_id, estado, total, descuento, direccion_entrega, notas, metodo_pago, fecha_creacion`,
            [req.user.userId, restaurante_id, esEfectivo ? 'en_preparacion' : 'pendiente', total.toFixed(2), descuento.toFixed(2), direccion_entrega || null, notas || null, metodo_pago || 'mercadopago']
        );

        const pedido = pedidoResult.rows[0];

        // 7. Insertar los ítems del pedido y descontar stock
        for (const item of orderItems) {
            await client.query(
                `INSERT INTO pedido_items (pedido_id, menu_item_id, nombre_item, precio_unitario, cantidad, ingredientes_removidos)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [pedido.id, item.menu_item_id, item.nombre_item, item.precio_unitario, item.cantidad, item.ingredientes_removidos]
            );

            // Descontar stock de ingredientes
            await client.query(
                'SELECT descontar_stock($1, $2, $3)',
                [restaurante_id, item.menu_item_id, item.cantidad]
            );
        }

        await client.query('COMMIT');

        // 7. Devolver el pedido completo con sus ítems
        const itemsResult = await client.query(
            `SELECT id, menu_item_id, nombre_item, precio_unitario, cantidad, subtotal
             FROM pedido_items WHERE pedido_id = $1`,
            [pedido.id]
        );

        if (esEfectivo) {
            const admins = await db.query(
                "SELECT id, push_token FROM usuarios WHERE rol = 'admin' AND push_token IS NOT NULL"
            );
            console.log(`[push] Admins con token para notificar: ${admins.rows.length}`, admins.rows.map(a => `id=${a.id} token=${a.push_token?.slice(0, 30)}...`));
            await Promise.all(admins.rows.map(a =>
                sendPushNotification(
                    a.push_token,
                    '💵 Nuevo pedido en efectivo',
                    `Pedido #${pedido.id} — $${parseFloat(pedido.total).toFixed(2)} — listo para preparar`,
                    { orderId: pedido.id, type: 'new_order' },
                    'new_order_admin'
                )
            ));
        }

        res.status(201).json({
            success: true,
            message: 'Pedido creado exitosamente',
            order: {
                ...pedido,
                items: itemsResult.rows
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        if (error.message?.startsWith('Precio inválido')) {
            return res.status(422).json({ success: false, message: error.message });
        }
        console.error('Error en createOrder:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    } finally {
        client.release();
    }
};

// ── GET MY ORDERS ─────────────────────────────────────────
// GET /api/orders
exports.getMyOrders = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.id, p.estado, p.total, p.direccion_entrega, p.fecha_creacion,
                    r.nombre AS restaurante_nombre,
                    COUNT(pi.id) AS cantidad_items
             FROM pedidos p
             JOIN restaurantes r ON p.restaurante_id = r.id
             JOIN pedido_items pi ON p.id = pi.pedido_id
             WHERE p.usuario_id = $1
             GROUP BY p.id, r.nombre
             ORDER BY p.fecha_creacion DESC`,
            [req.user.userId]
        );

        res.json({
            success: true,
            count: result.rows.length,
            orders: result.rows
        });

    } catch (error) {
        console.error('Error en getMyOrders:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── GET ORDER BY ID ───────────────────────────────────────
// GET /api/orders/:id
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de pedido inválido'
            });
        }

        // Verificar que el pedido existe y pertenece al usuario
        const pedidoResult = await db.query(
            `SELECT p.id, p.restaurante_id, p.estado, p.total, p.direccion_entrega, p.notas,
                    p.fecha_creacion, p.fecha_actualizacion,
                    r.nombre AS restaurante_nombre, r.direccion AS restaurante_direccion
             FROM pedidos p
             JOIN restaurantes r ON p.restaurante_id = r.id
             WHERE p.id = $1 AND p.usuario_id = $2`,
            [id, req.user.userId]
        );

        if (pedidoResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }

        const itemsResult = await db.query(
            `SELECT id, menu_item_id, nombre_item, precio_unitario, cantidad, subtotal
             FROM pedido_items WHERE pedido_id = $1`,
            [id]
        );

        res.json({
            success: true,
            order: {
                ...pedidoResult.rows[0],
                items: itemsResult.rows
            }
        });

    } catch (error) {
        console.error('Error en getOrderById:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── CANCEL ORDER ──────────────────────────────────────────
// PUT /api/orders/:id/cancel
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de pedido inválido'
            });
        }

        // Solo se puede cancelar si el pedido es del usuario y está en estado 'pendiente'
        const result = await db.query(
            `UPDATE pedidos
             SET estado = 'cancelado'
             WHERE id = $1 AND usuario_id = $2 AND estado = 'pendiente'
             RETURNING id, estado, fecha_actualizacion`,
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            // Verificar si el pedido existe para dar un mensaje más preciso
            const check = await db.query(
                'SELECT estado FROM pedidos WHERE id = $1 AND usuario_id = $2',
                [id, req.user.userId]
            );

            if (check.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Pedido no encontrado'
                });
            }

            return res.status(409).json({
                success: false,
                message: `No se puede cancelar un pedido en estado "${check.rows[0].estado}"`
            });
        }

        res.json({
            success: true,
            message: 'Pedido cancelado correctamente',
            order: result.rows[0]
        });

    } catch (error) {
        console.error('Error en cancelOrder:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── GET ORDER TRACKING ─────────────────────────────────────
// GET /api/orders/:id/tracking
const RESTAURANTE_COORDS = { lat: -34.6100, lng: -58.3900 };
const DESTINO_COORDS     = { lat: -34.5980, lng: -58.3750 };

exports.getTracking = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID de pedido inválido' });
        }

        const result = await db.query(
            `SELECT p.estado, p.fecha_en_camino
             FROM pedidos p
             WHERE p.id = $1 AND p.usuario_id = $2`,
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        const { estado, fecha_en_camino } = result.rows[0];

        const minutosTranscurridos = fecha_en_camino
            ? (Date.now() - new Date(fecha_en_camino)) / 60000
            : 0;
        const progress = Math.min(minutosTranscurridos / 20, 0.95);

        const repartidorLat = RESTAURANTE_COORDS.lat + (DESTINO_COORDS.lat - RESTAURANTE_COORDS.lat) * progress;
        const repartidorLng = RESTAURANTE_COORDS.lng + (DESTINO_COORDS.lng - RESTAURANTE_COORDS.lng) * progress;

        res.json({
            success: true,
            estado,
            repartidor: {
                nombre: 'Carlos Méndez',
                rating: '4.8',
                lat: repartidorLat,
                lng: repartidorLng,
            },
            restaurante: RESTAURANTE_COORDS,
            destino: DESTINO_COORDS,
        });

    } catch (error) {
        console.error('Error en getTracking:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ── UPDATE ORDER STATUS (demo/dev only) ────────────────────
// PUT /api/orders/:id/status
// Body: { "estado": "en_camino" }
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const VALID_STATES = ['pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado'];
        if (!estado || !VALID_STATES.includes(estado)) {
            return res.status(400).json({ success: false, message: `Estado inválido. Válidos: ${VALID_STATES.join(', ')}` });
        }

        const query = estado === 'en_camino'
            ? `UPDATE pedidos SET estado = $1, fecha_en_camino = NOW() WHERE id = $2 AND usuario_id = $3 RETURNING id, estado, fecha_en_camino`
            : `UPDATE pedidos SET estado = $1 WHERE id = $2 AND usuario_id = $3 RETURNING id, estado`;

        const result = await db.query(query, [estado, id, req.user.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        res.json({ success: true, order: result.rows[0] });

    } catch (error) {
        console.error('Error en updateStatus:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
