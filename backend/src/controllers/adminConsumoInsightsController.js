const { generarInsights, getUltimoInsight } = require('../services/consumoInsightsService');

// GET /api/admin/stats/consumo-insights/:restauranteId
// No llama a la IA — solo devuelve el ultimo analisis guardado (o insight:null).
exports.getUltimo = async (req, res) => {
    const { restauranteId } = req.params;
    try {
        const insight = await getUltimoInsight(restauranteId);
        res.json({ success: true, insight });
    } catch (error) {
        console.error('Error en getUltimo consumo insights:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// POST /api/admin/stats/consumo-insights/:restauranteId
// Dispara el analisis completo (SQL + IA si hay patrones). Gasta tokens.
// Solo debe llamarse desde una accion explicita del admin, nunca automatico.
exports.generar = async (req, res) => {
    const { restauranteId } = req.params;
    try {
        const insight = await generarInsights(restauranteId);
        res.json({ success: true, insight });
    } catch (error) {
        if (error.status === 429) return res.status(429).json({ success: false, message: error.message });
        console.error('Error en generar consumo insights:', error);
        res.status(500).json({ success: false, message: 'No se pudo generar el análisis' });
    }
};
