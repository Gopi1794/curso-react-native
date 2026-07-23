const db = require('../config/database');
const { computeRoute } = require('./googleRoutes');

// Matchea la zona de envío activa que cubre la distancia entre el restaurante
// y el destino. Si hay varias zonas cuyo radio alcanza, gana la de radio
// más chico (la más específica); en empate exacto de radio, gana la más vieja.
// Devuelve null si el destino queda fuera de todas las zonas activas,
// o si el restaurante no tiene lat/lng cargado (geocoding pendiente/fallido).
//
// destino: { lat, lng }
// queryable: client de una transacción abierta, o el pool db por defecto
async function matchZona(restauranteId, destino, queryable = db) {
    const restauranteResult = await queryable.query(
        'SELECT lat, lng FROM restaurantes WHERE id = $1',
        [restauranteId]
    );
    const restaurante = restauranteResult.rows[0];
    if (!restaurante || restaurante.lat == null || restaurante.lng == null) {
        return null;
    }

    const { distanceMeters } = await computeRoute({
        origen: { lat: parseFloat(restaurante.lat), lng: parseFloat(restaurante.lng) },
        destino,
    });
    const distanciaKm = distanceMeters / 1000;

    const zonaResult = await queryable.query(
        `SELECT id, nombre, costo_envio FROM zonas_envio
         WHERE restaurante_id = $1 AND activa = true AND radio_km >= $2
         ORDER BY radio_km ASC, id ASC LIMIT 1`,
        [restauranteId, distanciaKm]
    );

    return zonaResult.rows[0] || null;
}

module.exports = { matchZona };
