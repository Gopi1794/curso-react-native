const db = require('../config/database');
const { evaluarCupon } = require('../utils/ruletaCuponHelper');
const { matchZona } = require('../utils/zonaEnvioHelper');

// ── GET ALL CUPONES ────────────────────────────────────────
// GET /api/cupones
// Devuelve solo los cupones activos y no vencidos
exports.getAll = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, oferta, titulo, imagen_key, imagen_real_key,
                    valido_hasta, disclaimer, texto_reverso, codigo, color
             FROM cupones
             WHERE activo = TRUE AND valido_hasta >= CURRENT_DATE
             ORDER BY fecha_creacion ASC`
        );

        res.json({
            success: true,
            count: result.rows.length,
            cupones: result.rows,
        });

    } catch (error) {
        console.error('Error en getAll cupones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
};

// ── VALIDATE BY CODE ──────────────────────────────────────
// POST /api/cupones/validate
// Body: { codigo, restaurante_id, items }
exports.validateByCode = async (req, res) => {
    try {
        const { codigo, restaurante_id, items, direccion_id } = req.body;

        if (!codigo || typeof codigo !== 'string' || codigo.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Código requerido' });
        }

        // 1. Buscar primero en cupones (comportamiento original, sin cambios)
        const cuponViejo = await db.query(
            `SELECT id, titulo, oferta, codigo
             FROM cupones
             WHERE UPPER(codigo) = UPPER($1)
               AND activo = TRUE
               AND valido_hasta >= CURRENT_DATE`,
            [codigo.trim()]
        );

        if (cuponViejo.rows.length > 0) {
            const cupon = cuponViejo.rows[0];
            const match = cupon.oferta?.match(/(\d+)/);
            const discount_percent = match ? parseInt(match[1]) : 10;
            return res.json({
                success: true,
                cupon: { id: cupon.id, titulo: cupon.titulo, oferta: cupon.oferta, discount_percent },
            });
        }

        // 2. Buscar en ruleta_cupones — solo del usuario logueado, no vencido
        const cuponRuleta = await db.query(
            `SELECT id, tipo, valor, restaurante_id
             FROM ruleta_cupones
             WHERE UPPER(codigo) = UPPER($1) AND usado = FALSE
               AND usuario_id = $2 AND fecha_expiracion > NOW()`,
            [codigo.trim(), req.user.userId]
        );

        if (cuponRuleta.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cupón inválido, vencido o ya usado' });
        }

        const cupon = cuponRuleta.rows[0];

        if (!restaurante_id || parseInt(restaurante_id) !== parseInt(cupon.restaurante_id)) {
            return res.status(404).json({ success: false, message: 'Cupón inválido para este restaurante' });
        }

        // 'porcentaje' y 'envio_gratis' necesitan saber el costo de envío real
        // para calcular el descuento — sin dirección todavía no se puede.
        let costoEnvio = 0;
        if (cupon.tipo === 'porcentaje' || cupon.tipo === 'envio_gratis') {
            if (!direccion_id) {
                return res.status(400).json({ success: false, message: 'Seleccioná una dirección de entrega antes de aplicar este cupón' });
            }
            const direccionResult = await db.query(
                'SELECT latitud, longitud FROM direcciones_usuarios WHERE id = $1 AND usuario_id = $2',
                [direccion_id, req.user.userId]
            );
            const direccionRow = direccionResult.rows[0];
            if (!direccionRow || direccionRow.latitud == null || direccionRow.longitud == null) {
                return res.status(400).json({ success: false, message: 'No pudimos ubicar tu dirección. Volvé a seleccionarla.' });
            }
            const zona = await matchZona(restaurante_id, { lat: parseFloat(direccionRow.latitud), lng: parseFloat(direccionRow.longitud) });
            if (!zona) {
                return res.status(400).json({ success: false, message: 'No entregamos en tu dirección' });
            }
            costoEnvio = parseFloat(zona.costo_envio);
        }

        const cartItems = Array.isArray(items) ? items : [];
        const itemIds = cartItems.map(i => i.menu_item_id);
        let menuItemsInfo = new Map();
        let subtotal = 0;

        if (itemIds.length > 0) {
            const menuResult = await db.query(
                'SELECT id, precio, categoria FROM menu_items WHERE id = ANY($1) AND restaurante_id = $2',
                [itemIds, restaurante_id]
            );
            for (const row of menuResult.rows) {
                menuItemsInfo.set(String(row.id), { precio: parseFloat(row.precio), categoria: row.categoria });
            }
            for (const item of cartItems) {
                const info = menuItemsInfo.get(String(item.menu_item_id));
                if (info) subtotal += info.precio * item.cantidad;
            }
        }

        const evaluacion = evaluarCupon(cupon.tipo, parseFloat(cupon.valor) || 0, subtotal, cartItems, menuItemsInfo, costoEnvio);

        if (!evaluacion.valido) {
            return res.status(400).json({ success: false, message: evaluacion.mensaje });
        }

        res.json({
            success: true,
            cupon: {
                tipo: cupon.tipo,
                valor: cupon.valor,
                monto_descuento: evaluacion.montoDescuento,
                esRuleta: true,
            },
        });

    } catch (error) {
        console.error('Error en validateByCode cupon:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ── GET CUPON BY ID ───────────────────────────────────────
// GET /api/cupones/:id
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID de cupón inválido' });
        }

        const result = await db.query(
            `SELECT id, oferta, titulo, imagen_key, imagen_real_key,
                    valido_hasta, disclaimer, texto_reverso, codigo, color
             FROM cupones
             WHERE id = $1 AND activo = TRUE`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cupón no encontrado' });
        }

        res.json({ success: true, cupon: result.rows[0] });

    } catch (error) {
        console.error('Error en getById cupon:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
