const { getInsights } = require('../services/reviewsInsightsService');

// GET /api/admin/reviews/insights?restauranteId=X
exports.getInsights = async (req, res) => {
    const restauranteId = req.query.restauranteId || req.user.restauranteId;

    if (!restauranteId) {
        return res.status(400).json({ success: false, message: 'Se requiere restauranteId' });
    }

    try {
        const insights = await getInsights(restauranteId);
        res.json({ success: true, insights });
    } catch (error) {
        console.error('Error en getInsights reviews:', error);
        res.status(500).json({ success: false, message: 'Error al generar insights' });
    }
};
