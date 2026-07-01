const db = require('../config/database');

exports.getByRestaurante = async (req, res) => {
    const { restauranteId } = req.params;
    try {
        const result = await db.query(
            `SELECT
                mi.id, mi.nombre, mi.categoria, mi.imagen_key,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id',            mii.id,
                            'ingrediente_id', i.id,
                            'nombre',        i.nombre,
                            'unidad_medida', i.unidad_medida,
                            'cantidad_usada', mii.cantidad_usada,
                            'es_removible',  mii.es_removible
                        ) ORDER BY i.nombre
                    ) FILTER (WHERE mii.id IS NOT NULL),
                    '[]'
                ) AS ingredientes
            FROM menu_items mi
            LEFT JOIN menu_item_ingredientes mii ON mii.menu_item_id = mi.id
            LEFT JOIN ingredientes i ON i.id = mii.ingrediente_id
            WHERE mi.restaurante_id = $1 AND mi.disponible = TRUE
            GROUP BY mi.id, mi.nombre, mi.categoria, mi.imagen_key
            ORDER BY mi.categoria, mi.nombre`,
            [restauranteId]
        );
        res.json({ success: true, platos: result.rows });
    } catch (error) {
        console.error('Error en getByRestaurante recetas:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.updateCantidad = async (req, res) => {
    const { id } = req.params;
    const { cantidad_usada } = req.body;

    if (cantidad_usada === undefined || isNaN(cantidad_usada) || parseFloat(cantidad_usada) <= 0) {
        return res.status(400).json({ success: false, message: 'cantidad_usada debe ser un número mayor a 0' });
    }

    try {
        const result = await db.query(
            `UPDATE menu_item_ingredientes
             SET cantidad_usada = $1
             WHERE id = $2
             RETURNING id, menu_item_id, ingrediente_id, cantidad_usada`,
            [parseFloat(cantidad_usada), id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Relación no encontrada' });
        }
        res.json({ success: true, item: result.rows[0] });
    } catch (error) {
        console.error('Error en updateCantidad receta:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
