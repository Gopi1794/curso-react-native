const db = require('../config/database');

// PUT /api/users/push-token
exports.savePushToken = async (req, res) => {
    const { pushToken } = req.body;

    if (!pushToken) {
        return res.status(400).json({ success: false, message: 'pushToken requerido' });
    }

    try {
        await db.query(
            'UPDATE usuarios SET push_token = $1 WHERE id = $2',
            [pushToken, req.user.userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error guardando push token:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// GET /api/users/notification-preferences
exports.getPreferences = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT pedidos, promociones, noticias, recordatorios FROM preferencias_notificaciones WHERE usuario_id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            // Crear prefs por defecto si no existen
            const insert = await db.query(
                `INSERT INTO preferencias_notificaciones (usuario_id) VALUES ($1)
                 RETURNING pedidos, promociones, noticias, recordatorios`,
                [req.user.userId]
            );
            return res.json({ success: true, preferences: insert.rows[0] });
        }

        res.json({ success: true, preferences: result.rows[0] });
    } catch (error) {
        console.error('Error obteniendo preferencias:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// PUT /api/users/notification-preferences
exports.updatePreferences = async (req, res) => {
    const { pedidos, promociones, noticias, recordatorios } = req.body;

    try {
        const result = await db.query(
            `INSERT INTO preferencias_notificaciones (usuario_id, pedidos, promociones, noticias, recordatorios)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (usuario_id) DO UPDATE
             SET pedidos = EXCLUDED.pedidos,
                 promociones = EXCLUDED.promociones,
                 noticias = EXCLUDED.noticias,
                 recordatorios = EXCLUDED.recordatorios
             RETURNING pedidos, promociones, noticias, recordatorios`,
            [
                req.user.userId,
                pedidos ?? true,
                promociones ?? false,
                noticias ?? true,
                recordatorios ?? false,
            ]
        );

        res.json({ success: true, preferences: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando preferencias:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
