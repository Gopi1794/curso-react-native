const db = require('../config/database');

module.exports = async (req, res, next) => {
    const restauranteId = req.params.restauranteId;
    if (!restauranteId) return next();

    try {
        const result = await db.query(
            'SELECT id FROM restaurantes WHERE id = $1 AND admin_id = $2',
            [restauranteId, req.user.userId]
        );
        if (!result.rows[0]) {
            return res.status(403).json({ success: false, message: 'Sin acceso a este restaurante' });
        }
        next();
    } catch (err) {
        console.error('requireAdminOwnership:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
