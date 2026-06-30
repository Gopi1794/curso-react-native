const db = require('../config/database');

exports.getAll = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, oferta, titulo, imagen_key, imagen_url, valido_desde, valido_hasta,
                    disclaimer, texto_reverso, codigo, color, activo, discount_percent, fecha_creacion
             FROM cupones
             ORDER BY fecha_creacion DESC`
        );
        res.json({ success: true, cupones: result.rows });
    } catch (error) {
        console.error('Error en admin getAll cupones:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.create = async (req, res) => {
    const { titulo, oferta, discount_percent, codigo, color, valido_desde, valido_hasta, disclaimer, imagen_url } = req.body;

    if (!titulo?.trim() || !codigo?.trim() || !valido_hasta) {
        return res.status(400).json({ success: false, message: 'titulo, codigo y valido_hasta son requeridos' });
    }

    try {
        const result = await db.query(
            `INSERT INTO cupones (titulo, oferta, discount_percent, codigo, color, valido_desde, valido_hasta, disclaimer, imagen_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                titulo.trim(),
                oferta?.trim() || `${discount_percent || 10}% OFF`,
                discount_percent || 10,
                codigo.trim().toUpperCase(),
                color || '#FF6B6B',
                valido_desde || null,
                valido_hasta,
                disclaimer?.trim() || null,
                imagen_url || null,
            ]
        );
        res.status(201).json({ success: true, cupon: result.rows[0] });
    } catch (error) {
        if (error.constraint?.includes('unique')) {
            return res.status(409).json({ success: false, message: 'Ya existe un cupón con ese código' });
        }
        console.error('Error en create cupon:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { titulo, oferta, discount_percent, codigo, color, valido_desde, valido_hasta, disclaimer, imagen_url, activo } = req.body;

    try {
        const result = await db.query(
            `UPDATE cupones SET
                titulo           = COALESCE($1, titulo),
                oferta           = COALESCE($2, oferta),
                discount_percent = COALESCE($3, discount_percent),
                codigo           = COALESCE($4, codigo),
                color            = COALESCE($5, color),
                valido_desde     = COALESCE($6, valido_desde),
                valido_hasta     = COALESCE($7, valido_hasta),
                disclaimer       = COALESCE($8, disclaimer),
                imagen_url       = COALESCE($9, imagen_url),
                activo           = COALESCE($10, activo)
             WHERE id = $11
             RETURNING *`,
            [
                titulo?.trim() || null,
                oferta?.trim() || null,
                discount_percent ?? null,
                codigo?.trim().toUpperCase() || null,
                color || null,
                valido_desde || null,
                valido_hasta || null,
                disclaimer?.trim() || null,
                imagen_url || null,
                activo ?? null,
                id,
            ]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cupón no encontrado' });
        }
        res.json({ success: true, cupon: result.rows[0] });
    } catch (error) {
        console.error('Error en update cupon:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.remove = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM cupones WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cupón no encontrado' });
        }
        res.json({ success: true, message: 'Cupón eliminado' });
    } catch (error) {
        console.error('Error en remove cupon:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
