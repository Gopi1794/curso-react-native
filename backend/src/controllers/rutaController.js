const db = require('../config/database');
const { computeRoute } = require('../utils/googleRoutes');

exports.calcularRuta = async (req, res) => {
    const { pedido_id, destino } = req.body;

    if (!pedido_id || !destino || typeof destino.lat !== 'number' || typeof destino.lng !== 'number') {
        return res.status(400).json({ success: false, message: 'pedido_id y destino {lat,lng} son requeridos' });
    }

    try {
        // Validar que el pedido pertenece a este repartidor (evita usar el endpoint como proxy libre)
        const pedidoResult = await db.query(
            `SELECT id FROM pedidos WHERE id = $1 AND repartidor_id = $2`,
            [pedido_id, req.user.userId]
        );
        if (pedidoResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado o no asignado a este repartidor' });
        }

        // Origen: última ubicación reportada por este repartidor (fuente propia, no la del cliente)
        const userResult = await db.query(
            `SELECT ubicacion_lat, ubicacion_lng FROM usuarios WHERE id = $1`,
            [req.user.userId]
        );
        const origenRow = userResult.rows[0];
        if (!origenRow || origenRow.ubicacion_lat == null || origenRow.ubicacion_lng == null) {
            return res.status(400).json({ success: false, message: 'No hay ubicación reportada todavía para este repartidor' });
        }

        const origen = { lat: parseFloat(origenRow.ubicacion_lat), lng: parseFloat(origenRow.ubicacion_lng) };

        const ruta = await computeRoute({ origen, destino });

        await db.query(
            `UPDATE pedidos SET distancia_metros = $1, duracion_segundos = $2, eta_calculado_en = NOW()
             WHERE id = $3`,
            [ruta.distanceMeters, ruta.durationSeconds, pedido_id]
        );

        res.json({
            success: true,
            points: ruta.points,
            distanceMeters: ruta.distanceMeters,
            durationSeconds: ruta.durationSeconds,
        });
    } catch (error) {
        console.error('Error en calcularRuta:', error);
        res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
    }
};
