// Decodifica un "encoded polyline" de Google (algoritmo estándar, precision 5).
function decodePolyline(encoded) {
    const points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
        let result = 0, shift = 0, byte;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);

        result = 0;
        shift = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);

        points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }

    return points;
}

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

async function computeRoute({ origen, destino }) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        throw new Error('GOOGLE_MAPS_API_KEY no está configurada');
    }

    const response = await fetch(ROUTES_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
            origin: { location: { latLng: { latitude: origen.lat, longitude: origen.lng } } },
            destination: { location: { latLng: { latitude: destino.lat, longitude: destino.lng } } },
            travelMode: 'DRIVE',
        }),
    });

    const data = await response.json();

    if (!response.ok || !data.routes || data.routes.length === 0) {
        throw new Error(data?.error?.message || 'No se pudo calcular la ruta');
    }

    const route = data.routes[0];
    const durationSeconds = parseInt(route.duration.replace('s', ''), 10);

    return {
        points: decodePolyline(route.polyline.encodedPolyline),
        distanceMeters: route.distanceMeters,
        durationSeconds,
    };
}

module.exports = { decodePolyline, computeRoute };
