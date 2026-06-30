const db = require('../config/database');

exports.getStock = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                si.id,
                si.cantidad,
                si.umbral_minimo,
                si.ultima_actualizacion,
                i.id   AS ingrediente_id,
                i.nombre,
                i.categoria,
                i.unidad_medida,
                COALESCE(
                    json_agg(
                        json_build_object('plato', mi.nombre, 'cantidad_usada', mii.cantidad_usada)
                        ORDER BY mi.nombre
                    ) FILTER (WHERE mi.id IS NOT NULL),
                    '[]'
                ) AS platos
            FROM stock_ingredientes si
            JOIN ingredientes i ON i.id = si.ingrediente_id
            LEFT JOIN menu_item_ingredientes mii ON mii.ingrediente_id = i.id
            LEFT JOIN menu_items mi ON mi.id = mii.menu_item_id
            WHERE si.restaurante_id = $1
            GROUP BY si.id, si.cantidad, si.umbral_minimo, si.ultima_actualizacion,
                     i.id, i.nombre, i.categoria, i.unidad_medida
            ORDER BY i.categoria, i.nombre
        `, [req.params.restauranteId]);

        res.json({ success: true, stock: result.rows });
    } catch (error) {
        console.error('Error en getStock:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.updateStock = async (req, res) => {
    const { id } = req.params;
    const { cantidad, umbral_minimo } = req.body;

    if (cantidad === undefined && umbral_minimo === undefined) {
        return res.status(400).json({ success: false, message: 'Se requiere cantidad o umbral_minimo' });
    }
    if (cantidad !== undefined && (isNaN(cantidad) || cantidad < 0)) {
        return res.status(400).json({ success: false, message: 'Cantidad inválida' });
    }

    try {
        const result = await db.query(`
            UPDATE stock_ingredientes
            SET cantidad      = COALESCE($1, cantidad),
                umbral_minimo = COALESCE($2, umbral_minimo)
            WHERE id = $3
            RETURNING id, cantidad, umbral_minimo, ultima_actualizacion
        `, [cantidad ?? null, umbral_minimo ?? null, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Stock no encontrado' });
        }
        res.json({ success: true, stock: result.rows[0] });
    } catch (error) {
        console.error('Error en updateStock:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

exports.getIngredientesMenuItems = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                mi.id,
                mi.nombre AS plato,
                mi.imagen_key,
                mi.disponible,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'stock_id',       si.id,
                            'ingrediente_id', i.id,
                            'nombre',         i.nombre,
                            'categoria',      i.categoria,
                            'unidad_medida',  i.unidad_medida,
                            'cantidad_usada', mii.cantidad_usada,
                            'stock_actual',   COALESCE(si.cantidad, 0),
                            'umbral_minimo',  COALESCE(si.umbral_minimo, 0)
                        ) ORDER BY i.nombre
                    ) FILTER (WHERE i.id IS NOT NULL),
                    '[]'
                ) AS ingredientes
            FROM menu_items mi
            LEFT JOIN menu_item_ingredientes mii ON mii.menu_item_id = mi.id
            LEFT JOIN ingredientes i ON i.id = mii.ingrediente_id
            LEFT JOIN stock_ingredientes si
                ON si.ingrediente_id = i.id AND si.restaurante_id = $1
            WHERE mi.restaurante_id = $1
            GROUP BY mi.id, mi.nombre, mi.imagen_key, mi.disponible
            ORDER BY mi.nombre
        `, [req.params.restauranteId]);

        res.json({ success: true, platos: result.rows });
    } catch (error) {
        console.error('Error en getIngredientesMenuItems:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
