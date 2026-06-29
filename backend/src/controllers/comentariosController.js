const db = require('../config/database');

// ── GET COMMENTS BY MENU ITEM ────────────────────────────────
// GET /api/menu-items/:menuItemId/comentarios
exports.getByMenuItem = async (req, res) => {
    try {
        const { menuItemId } = req.params;

        if (isNaN(menuItemId)) {
            return res.status(400).json({ success: false, message: 'ID de plato inválido' });
        }

        const result = await db.query(
            `SELECT c.id, c.usuario_id, c.rating, c.comentario, c.fecha_creacion, c.fecha_actualizacion,
                    u.nombre, u.apellido
             FROM comentarios c
             JOIN usuarios u ON u.id = c.usuario_id
             WHERE c.menu_item_id = $1
             ORDER BY c.fecha_creacion DESC`,
            [menuItemId]
        );

        // Rating promedio
        const ratingResult = await db.query(
            `SELECT COALESCE(rating_promedio, 0) AS rating_promedio,
                    COALESCE(total_resenas, 0)   AS total_resenas
             FROM vista_rating_platos
             WHERE menu_item_id = $1`,
            [menuItemId]
        );

        const stats = ratingResult.rows[0] || { rating_promedio: 0, total_resenas: 0 };

        res.json({
            success: true,
            rating_promedio: parseFloat(stats.rating_promedio),
            total_resenas: parseInt(stats.total_resenas),
            comentarios: result.rows
        });

    } catch (error) {
        console.error('Error en getByMenuItem comentarios:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ── CREATE / UPDATE COMMENT ──────────────────────────────────
// POST /api/menu-items/:menuItemId/comentarios
// Body: { rating, comentario }
exports.createOrUpdate = async (req, res) => {
    try {
        const { menuItemId } = req.params;
        const { rating, comentario } = req.body;

        if (isNaN(menuItemId)) {
            return res.status(400).json({ success: false, message: 'ID de plato inválido' });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating debe ser entre 1 y 5' });
        }

        if (!comentario || !comentario.trim()) {
            return res.status(400).json({ success: false, message: 'El comentario no puede estar vacío' });
        }

        if (comentario.trim().length > 500) {
            return res.status(400).json({ success: false, message: 'El comentario no puede superar los 500 caracteres' });
        }

        // Verificar que el plato exista
        const menuCheck = await db.query('SELECT id FROM menu_items WHERE id = $1', [menuItemId]);
        if (menuCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Plato no encontrado' });
        }

        // UPSERT: si ya comentó este plato, actualizar; si no, insertar
        const result = await db.query(
            `INSERT INTO comentarios (usuario_id, menu_item_id, rating, comentario)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (usuario_id, menu_item_id)
             DO UPDATE SET rating = EXCLUDED.rating,
                           comentario = EXCLUDED.comentario
             RETURNING id, rating, comentario, fecha_creacion, fecha_actualizacion`,
            [req.user.userId, menuItemId, rating, comentario.trim()]
        );

        res.status(201).json({
            success: true,
            message: 'Comentario publicado',
            comentario: result.rows[0]
        });

    } catch (error) {
        console.error('Error en createOrUpdate comentario:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ── DELETE COMMENT ────────────────────────────────────────────
// DELETE /api/menu-items/:menuItemId/comentarios
exports.remove = async (req, res) => {
    try {
        const { menuItemId } = req.params;

        if (isNaN(menuItemId)) {
            return res.status(400).json({ success: false, message: 'ID de plato inválido' });
        }

        const result = await db.query(
            'DELETE FROM comentarios WHERE usuario_id = $1 AND menu_item_id = $2 RETURNING id',
            [req.user.userId, menuItemId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Comentario no encontrado' });
        }

        res.json({ success: true, message: 'Comentario eliminado' });

    } catch (error) {
        console.error('Error en remove comentario:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
