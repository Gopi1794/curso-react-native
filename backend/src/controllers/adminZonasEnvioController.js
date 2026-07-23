const db = require('../config/database');

// GET /api/admin/zonas-envio/:restauranteId
// Incluye inactivas — el admin las puede reactivar.
exports.getAll = async (req, res) => {
    const { restauranteId } = req.params;
    try {
        const result = await db.query(
            `SELECT id, nombre, radio_km, costo_envio, activa
             FROM zonas_envio
             WHERE restaurante_id = $1
             ORDER BY radio_km ASC`,
            [restauranteId]
        );
        res.json({ success: true, zonas: result.rows });
    } catch (error) {
        console.error('Error en admin getAll zonas de envio:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// POST /api/admin/zonas-envio/:restauranteId
exports.create = async (req, res) => {
    const { restauranteId } = req.params;
    const { nombre, radio_km, costo_envio } = req.body;

    if (!nombre?.trim() || !radio_km || costo_envio == null) {
        return res.status(400).json({ success: false, message: 'nombre, radio_km y costo_envio son requeridos' });
    }
    if (isNaN(radio_km) || parseFloat(radio_km) <= 0) {
        return res.status(400).json({ success: false, message: 'radio_km debe ser mayor a 0' });
    }
    if (isNaN(costo_envio) || parseFloat(costo_envio) < 0) {
        return res.status(400).json({ success: false, message: 'costo_envio debe ser 0 o mayor' });
    }

    try {
        const existente = await db.query(
            'SELECT id FROM zonas_envio WHERE restaurante_id = $1 AND activa = true AND radio_km = $2',
            [restauranteId, parseFloat(radio_km)]
        );
        if (existente.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Ya existe una zona activa con ese radio exacto' });
        }

        const result = await db.query(
            `INSERT INTO zonas_envio (restaurante_id, nombre, radio_km, costo_envio)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nombre, radio_km, costo_envio, activa`,
            [restauranteId, nombre.trim(), parseFloat(radio_km), parseFloat(costo_envio)]
        );
        res.status(201).json({ success: true, zona: result.rows[0] });
    } catch (error) {
        console.error('Error en create zona de envio:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// PUT /api/admin/zonas-envio/:id
// No hay DELETE — "eliminar" es activa:false, las zonas nunca se borran
// porque hay pedidos historicos que las referencian.
exports.update = async (req, res) => {
    const { id } = req.params;
    const { nombre, radio_km, costo_envio, activa } = req.body;

    if (radio_km !== undefined && (isNaN(radio_km) || parseFloat(radio_km) <= 0)) {
        return res.status(400).json({ success: false, message: 'radio_km debe ser mayor a 0' });
    }
    if (costo_envio !== undefined && (isNaN(costo_envio) || parseFloat(costo_envio) < 0)) {
        return res.status(400).json({ success: false, message: 'costo_envio debe ser 0 o mayor' });
    }

    try {
        const result = await db.query(
            `UPDATE zonas_envio
             SET nombre = COALESCE($1, nombre),
                 radio_km = COALESCE($2, radio_km),
                 costo_envio = COALESCE($3, costo_envio),
                 activa = COALESCE($4, activa)
             WHERE id = $5
             RETURNING id, nombre, radio_km, costo_envio, activa, restaurante_id`,
            [nombre?.trim() || null, radio_km != null ? parseFloat(radio_km) : null, costo_envio != null ? parseFloat(costo_envio) : null, activa ?? null, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Zona no encontrada' });
        }
        res.json({ success: true, zona: result.rows[0] });
    } catch (error) {
        console.error('Error en update zona de envio:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
