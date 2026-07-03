const { getInsights } = require('../services/reviewsInsightsService');
const db = require('../config/database');

// GET /api/admin/reviews/insights?restauranteId=X
exports.getInsights = async (req, res) => {
    let restauranteId = req.query.restauranteId;

    if (!restauranteId) {
        const r = await db.query(
            'SELECT id FROM restaurantes WHERE admin_id = $1 LIMIT 1',
            [req.user.userId]
        );
        restauranteId = r.rows[0]?.id;
    }

    if (!restauranteId) {
        return res.status(400).json({ success: false, message: 'No se encontró restaurante para este admin' });
    }

    try {
        const insights = await getInsights(restauranteId);
        res.json({ success: true, insights });
    } catch (error) {
        console.error('Error en getInsights reviews:', error);
        res.status(500).json({ success: false, message: 'Error al generar insights' });
    }
};
