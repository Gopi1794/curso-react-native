// Mismo patrón Nominatim que ya usa frontend/screens/repartidor/RepartidorMapaScreen.js
// (geocodeAddress), llevado a backend para poder llamarlo al guardar el restaurante.
async function geocodeAddress(address) {
    if (!address || !address.trim()) return null;

    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'TuAppFood/1.0 (contacto@tuemail.com)' } });
        const data = await res.json();
        if (data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch {
        // Nominatim caído o sin respuesta — se trata igual que "no encontrado"
    }
    return null;
}

module.exports = { geocodeAddress };
