const { getRecommendations } = require('../services/recommendationsService');

// GET /api/recommendations/:restauranteId
exports.get = async (req, res) => {
    const { restauranteId } = req.params;
    const userId = req.user.userId;
    console.log(`[Recs] userId=${userId} restauranteId=${restauranteId}`);

    try {
        const items = await getRecommendations(userId, restauranteId);
        res.json({ success: true, items });
    } catch (error) {
        console.error('Error en recommendations:', error);
        res.status(500).json({ success: false, message: 'Error al generar recomendaciones' });
    }
};
