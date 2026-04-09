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
