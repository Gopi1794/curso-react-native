const db = require('../config/database');

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

        // 3. Simular procesamiento del gateway externo
        // En producción: await MercadoPago.pay({ amount: pedido.total, ... })
        const referencia = `REF-${Date.now()}-${pedido_id}`;
        const pagoExitoso = true; // simulado

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
