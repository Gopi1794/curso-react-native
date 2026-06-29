const db = require('../config/database');

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
// Body: { codigo }
exports.validateByCode = async (req, res) => {
    try {
        const { codigo } = req.body;

        if (!codigo || typeof codigo !== 'string' || codigo.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Código requerido' });
        }

        const result = await db.query(
            `SELECT id, titulo, oferta, codigo
             FROM cupones
             WHERE UPPER(codigo) = UPPER($1)
               AND activo = TRUE
               AND valido_hasta >= CURRENT_DATE`,
            [codigo.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cupón inválido o vencido' });
        }

        const cupon = result.rows[0];

        // El campo "oferta" contiene el texto del descuento, ej: "10%"
        // Extraemos el número para que el frontend pueda calcular
        const match = cupon.oferta?.match(/(\d+)/);
        const discount_percent = match ? parseInt(match[1]) : 10;

        res.json({
            success: true,
            cupon: {
                id: cupon.id,
                titulo: cupon.titulo,
                oferta: cupon.oferta,
                discount_percent,
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
