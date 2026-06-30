const db = require('../config/database');

exports.getAll = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, nombre, precio, categoria, descripcion, imagen_key, imagen_url, disponible
             FROM menu_items
             WHERE restaurante_id = $1
             ORDER BY categoria, nombre`,
            [req.params.restauranteId]
        );
        res.json({ success: true, platos: result.rows });
    } catch (error) {
        console.error('Error en admin getAll platos:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.create = async (req, res) => {
    const { nombre, precio, categoria, descripcion, imagen_url } = req.body;
    const { restauranteId } = req.params;

    if (!nombre?.trim() || !precio || !categoria?.trim()) {
        return res.status(400).json({ success: false, message: 'nombre, precio y categoria son requeridos' });
    }
    if (isNaN(precio) || parseFloat(precio) < 0) {
        return res.status(400).json({ success: false, message: 'Precio inválido' });
    }

    try {
        const result = await db.query(
            `INSERT INTO menu_items (restaurante_id, nombre, precio, categoria, descripcion, imagen_url)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, nombre, precio, categoria, descripcion, imagen_url, disponible`,
            [restauranteId, nombre.trim(), parseFloat(precio), categoria.trim(), descripcion?.trim() || null, imagen_url || null]
        );
        res.status(201).json({ success: true, plato: result.rows[0] });
    } catch (error) {
        console.error('Error en create plato:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { nombre, precio, categoria, descripcion, imagen_url } = req.body;
    try {
        const result = await db.query(
            `UPDATE menu_items
             SET nombre = COALESCE($1, nombre),
                 precio = COALESCE($2, precio),
                 categoria = COALESCE($3, categoria),
                 descripcion = COALESCE($4, descripcion),
                 imagen_url = COALESCE($5, imagen_url)
             WHERE id = $6
             RETURNING id, nombre, precio, categoria, descripcion, imagen_key, imagen_url, disponible`,
            [nombre || null, precio ? parseFloat(precio) : null, categoria || null, descripcion ?? null, imagen_url ?? null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Plato no encontrado' });
        res.json({ success: true, plato: result.rows[0] });
    } catch (error) {
        console.error('Error en update plato:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.remove = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM menu_items WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Plato no encontrado' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error en remove plato:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.toggleDisponible = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `UPDATE menu_items SET disponible = NOT disponible WHERE id = $1
             RETURNING id, nombre, disponible`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Plato no encontrado' });
        }
        res.json({ success: true, plato: result.rows[0] });
    } catch (error) {
        console.error('Error en toggleDisponible:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
