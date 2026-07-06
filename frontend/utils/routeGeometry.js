// frontend/utils/routeGeometry.js

const EARTH_RADIUS_M = 6371000;

function toRad(deg) {
    return (deg * Math.PI) / 180;
}

// Distancia Haversine entre dos puntos, en metros.
function haversineMeters(a, b) {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// Distancia mínima entre `point` y cualquier vértice de `polylinePoints`.
// Aproximación por vértices (no por segmento exacto) — suficiente para
// detectar desvíos de calle a la escala de una entrega urbana.
function distanceToPolylineMeters(point, polylinePoints) {
    if (!polylinePoints || polylinePoints.length === 0) return Infinity;

    let min = Infinity;
    for (const p of polylinePoints) {
        const d = haversineMeters(point, p);
        if (d < min) min = d;
    }
    return min;
}

module.exports = { haversineMeters, distanceToPolylineMeters };
