const db = require('../config/database');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { sendPushNotification } = require('../services/notificationService');

const getMpClient = () => new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
    options: { timeout: 5000 },
});

// ── GET METHODS ───────────────────────────────────────────
// GET /api/payments/methods
exports.getMethods = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, tipo, ultimos_4_digitos, marca, es_principal, fecha_creacion
             FROM metodos_pago
             WHERE usuario_id = $1
             ORDER BY es_principal DESC, fecha_creacion DESC`,
            [req.user.userId]
        );

        res.json({
            success: true,
            methods: result.rows
        });

    } catch (error) {
        console.error('Error en getMethods:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ── ADD METHOD ────────────────────────────────────────────
// POST /api/payments/methods
exports.addMethod = async (req, res) => {
    try {
        const { tipo, ultimos_4_digitos, marca, es_principal } = req.body;

        if (!tipo) {
            return res.status(400).json({
                success: false,
                message: 'El tipo de método de pago es requerido'
            });
        }

        const tiposValidos = ['tarjeta', 'efectivo', 'transferencia'];
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: `Tipo inválido. Debe ser: ${tiposValidos.join(', ')}`
            });
        }

        if (tipo === 'tarjeta') {
            if (!ultimos_4_digitos || !/^\d{4}$/.test(ultimos_4_digitos)) {
                return res.status(400).json({
                    success: false,
                    message: 'Para tarjeta se requieren exactamente los últimos 4 dígitos'
                });
            }
            if (!marca) {
                return res.status(400).json({
                    success: false,
                    message: 'Para tarjeta se requiere la marca (visa, mastercard, etc.)'
                });
            }
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Si el nuevo método se marca como principal, desmarcar el anterior
            if (es_principal) {
                await client.query(
                    'UPDATE metodos_pago SET es_principal = FALSE WHERE usuario_id = $1',
                    [req.user.userId]
                );
            }

            const result = await client.query(
                `INSERT INTO metodos_pago (usuario_id, tipo, ultimos_4_digitos, marca, es_principal)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, tipo, ultimos_4_digitos, marca, es_principal, fecha_creacion`,
                [
                    req.user.userId,
                    tipo,
                    tipo === 'tarjeta' ? ultimos_4_digitos : null,
                    tipo === 'tarjeta' ? marca.toLowerCase() : null,
                    es_principal || false
                ]
            );

            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Método de pago agregado correctamente',
                method: result.rows[0]
            });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error en addMethod:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ── DELETE METHOD ─────────────────────────────────────────
// DELETE /api/payments/methods/:id
exports.deleteMethod = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID inválido' });
        }

        const result = await db.query(
            'DELETE FROM metodos_pago WHERE id = $1 AND usuario_id = $2 RETURNING id',
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Método de pago no encontrado'
            });
        }

        res.json({ success: true, message: 'Método de pago eliminado correctamente' });

    } catch (error) {
        console.error('Error en deleteMethod:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ── PAY ───────────────────────────────────────────────────
// POST /api/payments/pay
exports.pay = async (req, res) => {
    const { pedido_id, metodo_pago_id } = req.body;

    if (!pedido_id || !metodo_pago_id) {
        return res.status(400).json({
            success: false,
            message: 'Se requiere pedido_id y metodo_pago_id'
        });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Verificar que el pedido existe, pertenece al usuario y está pendiente
        const pedidoResult = await client.query(
            'SELECT id, total, estado FROM pedidos WHERE id = $1 AND usuario_id = $2',
            [pedido_id, req.user.userId]
        );

        if (pedidoResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        const pedido = pedidoResult.rows[0];

        if (pedido.estado !== 'pendiente') {
            await client.query('ROLLBACK');
            return res.status(409).json({
                success: false,
                message: `El pedido ya fue procesado (estado: ${pedido.estado})`
            });
        }

        // 2. Verificar que el método de pago pertenece al usuario
        const metodoResult = await client.query(
            'SELECT id, tipo FROM metodos_pago WHERE id = $1 AND usuario_id = $2',
            [metodo_pago_id, req.user.userId]
        );

        if (metodoResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Método de pago no encontrado'
            });
        }

        // 3. Procesamiento del gateway externo
        if (process.env.NODE_ENV === 'production' && !process.env.PAYMENT_GATEWAY_URL) {
            await client.query('ROLLBACK');
            return res.status(503).json({
                success: false,
                message: 'Pasarela de pagos no configurada. Contactá al administrador.'
            });
        }

        // TODO: reemplazar con integración real (MercadoPago, Stripe, etc.)
        // const pagoResult = await MercadoPago.pay({ amount: pedido.total, method: metodo.tipo });
        // const pagoExitoso = pagoResult.status === 'approved';
        const referencia = `REF-${Date.now()}-${pedido_id}`;
        const pagoExitoso = process.env.NODE_ENV !== 'production'; // simulado solo en dev

        if (!pagoExitoso) {
            await client.query('ROLLBACK');
            return res.status(402).json({
                success: false,
                message: 'El pago fue rechazado'
            });
        }

        // 4. Registrar el pago
        const pagoResult = await client.query(
            `INSERT INTO pagos (pedido_id, usuario_id, metodo_pago_id, monto, estado, referencia)
             VALUES ($1, $2, $3, $4, 'completado', $5)
             RETURNING id, monto, estado, referencia, fecha_creacion`,
            [pedido_id, req.user.userId, metodo_pago_id, pedido.total, referencia]
        );

        // 5. Actualizar el estado del pedido a confirmado
        await client.query(
            "UPDATE pedidos SET estado = 'confirmado' WHERE id = $1",
            [pedido_id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Pago procesado correctamente',
            pago: pagoResult.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en pay:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        client.release();
    }
};

// ── CREATE MP PREFERENCE ──────────────────────────────────
// POST /api/payments/mp-preference
exports.createPreference = async (req, res) => {
    const { pedido_id } = req.body;

    if (!pedido_id) {
        return res.status(400).json({ success: false, message: 'Se requiere pedido_id' });
    }

    try {
        const pedidoResult = await db.query(
            `SELECT pd.id, pd.total, pd.estado,
                    json_agg(json_build_object(
                        'id', pi.menu_item_id,
                        'nombre', pi.nombre_item,
                        'precio', pi.precio_unitario,
                        'cantidad', pi.cantidad
                    )) AS items
             FROM pedidos pd
             JOIN pedido_items pi ON pi.pedido_id = pd.id
             WHERE pd.id = $1 AND pd.usuario_id = $2
             GROUP BY pd.id`,
            [pedido_id, req.user.userId]
        );

        if (pedidoResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        const pedido = pedidoResult.rows[0];

        if (pedido.estado !== 'pendiente') {
            return res.status(409).json({ success: false, message: 'El pedido ya fue procesado' });
        }

        const preference = new Preference(getMpClient());

        const mpItems = pedido.items.map(item => ({
            id: String(item.id),
            title: item.nombre,
            unit_price: parseFloat(item.precio),
            quantity: item.cantidad,
            currency_id: 'ARS',
        }));

        const result = await preference.create({
            body: {
                items: mpItems,
                back_urls: {
                    success: 'tu-app-food://payment/success',
                    failure: 'tu-app-food://payment/failure',
                    pending: 'tu-app-food://payment/pending',
                },
                notification_url: process.env.MP_NOTIFICATION_URL,
                external_reference: String(pedido_id),
                statement_descriptor: 'Tu App Food',
            },
        });

        const useSandbox = process.env.MP_SANDBOX === 'true';
        res.json({
            success: true,
            preference_id: result.id,
            init_point: useSandbox ? result.sandbox_init_point : result.init_point,
            sandbox_init_point: result.sandbox_init_point,
        });

    } catch (error) {
        console.error('Error en createPreference:', error);
        res.status(500).json({ success: false, message: 'Error al crear preferencia de pago' });
    }
};

// ── WEBHOOK ───────────────────────────────────────────────
// POST /api/payments/webhook
exports.mpWebhook = async (req, res) => {
    const webhookRecibido = Date.now();
    const { type, data } = req.body;

    // MP envía ping de validación sin datos — respondemos 200 inmediatamente
    if (!type || !data?.id) return res.sendStatus(200);

    if (type !== 'payment') return res.sendStatus(200);

    console.log(`[webhook] ▶ Recibido type=${type} payment_id=${data.id} — ${new Date(webhookRecibido).toISOString()}`);

    try {
        const mpPayment = new Payment(getMpClient());
        const payment = await mpPayment.get({ id: data.id });
        console.log(`[webhook] MP consulta resuelta en ${Date.now() - webhookRecibido}ms — status=${payment.status}`);

        if (payment.status !== 'approved') return res.sendStatus(200);

        const pedidoId = parseInt(payment.external_reference);
        if (!pedidoId) return res.sendStatus(200);

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            await client.query(
                `INSERT INTO pagos (pedido_id, usuario_id, monto, estado, referencia)
                 SELECT $1, usuario_id, $2, 'completado', $3
                 FROM pedidos WHERE id = $1
                 ON CONFLICT DO NOTHING`,
                [pedidoId, payment.transaction_amount, String(payment.id)]
            );

            await client.query(
                "UPDATE pedidos SET estado = 'en_preparacion' WHERE id = $1 AND estado = 'pendiente'",
                [pedidoId]
            );

            await client.query('COMMIT');
            console.log(`[webhook] DB actualizada en ${Date.now() - webhookRecibido}ms`);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        // Notificar al cliente que su pago fue aprobado
        const cliente = await db.query(
            "SELECT push_token FROM usuarios WHERE id = (SELECT usuario_id FROM pedidos WHERE id = $1)",
            [pedidoId]
        );
        if (cliente.rows[0]?.push_token) {
            await sendPushNotification(
                cliente.rows[0].push_token,
                '¡Pago aprobado!',
                `Tu pedido #${pedidoId} fue confirmado y está siendo preparado`,
                { type: 'pago_aprobado', pedido_id: pedidoId }
            );
            console.log(`[webhook] Push cliente enviado en ${Date.now() - webhookRecibido}ms`);
        }

        // Notificar a todos los admins
        const admins = await db.query(
            "SELECT push_token FROM usuarios WHERE rol = 'admin' AND push_token IS NOT NULL"
        );
        await Promise.all(admins.rows.map(a =>
            sendPushNotification(
                a.push_token,
                '¡Nuevo pedido pagado!',
                `Pedido #${pedidoId} listo para preparar`,
                { type: 'nuevo_pedido', pedido_id: pedidoId }
            )
        ));
        console.log(`[webhook] Push admins enviado en ${Date.now() - webhookRecibido}ms — admins=${admins.rows.length}`);
        console.log(`[webhook] ✓ Total procesado en ${Date.now() - webhookRecibido}ms`);

        res.sendStatus(200);
    } catch (error) {
        console.error(`[webhook] ✗ Error tras ${Date.now() - webhookRecibido}ms:`, error);
        res.sendStatus(500);
    }
};

// ── GET HISTORY ───────────────────────────────────────────
// GET /api/payments/history
exports.getHistory = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT pg.id, pg.monto, pg.estado, pg.referencia, pg.fecha_creacion,
                    mp.tipo AS metodo_tipo, mp.ultimos_4_digitos, mp.marca,
                    pd.id AS pedido_id, pd.total AS pedido_total
             FROM pagos pg
             LEFT JOIN metodos_pago mp ON pg.metodo_pago_id = mp.id
             JOIN pedidos pd ON pg.pedido_id = pd.id
             WHERE pg.usuario_id = $1
             ORDER BY pg.fecha_creacion DESC`,
            [req.user.userId]
        );

        res.json({
            success: true,
            count: result.rows.length,
            history: result.rows
        });

    } catch (error) {
        console.error('Error en getHistory:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
