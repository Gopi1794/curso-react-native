const { getInsights } = require('../services/reviewsInsightsService');
const db = require('../config/database');

// GET /api/admin/reviews/insights
exports.getInsights = async (req, res) => {
    try {
        const r = await db.query(
            'SELECT id FROM restaurantes WHERE admin_id = $1',
            [req.user.userId]
        );
        const restauranteIds = r.rows.map(row => row.id);

        if (restauranteIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No se encontró restaurante para este admin' });
        }

        const insights = await getInsights(restauranteIds);
        res.json({ success: true, insights });
    } catch (error) {
        console.error('Error en getInsights reviews:', error);
        res.status(500).json({ success: false, message: 'Error al generar insights' });
    }
};
