const { getRecommendations } = require('../services/recommendationsService');
const cache = require('../utils/cache');

const RECS_TTL = 60 * 60 * 1000; // 1 hora

// GET /api/recommendations/:restauranteId
exports.get = async (req, res) => {
    const { restauranteId } = req.params;
    const userId = req.user.userId;

    try {
        const cacheKey = `recs:${userId}:${restauranteId}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const items = await getRecommendations(userId, restauranteId);
        const response = { success: true, items };
        cache.set(cacheKey, response, RECS_TTL);
        res.json(response);
    } catch (error) {
        console.error('Error en recommendations:', error);
        res.status(500).json({ success: false, message: 'Error al generar recomendaciones' });
    }
};
