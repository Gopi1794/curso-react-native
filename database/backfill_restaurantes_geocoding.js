require(`${__dirname}/../backend/node_modules/dotenv`).config({ path: `${__dirname}/../backend/.env` });
const { Pool } = require(`${__dirname}/../backend/node_modules/pg`);

const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'foodapp_db',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl:      { rejectUnauthorized: false },
});

async function geocodeAddress(address) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TuAppFood/1.0 (contacto@tuemail.com)' } });
    const data = await res.json();
    return data.length > 0 ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
}

async function run() {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(
            'SELECT id, nombre, direccion FROM restaurantes WHERE lat IS NULL OR lng IS NULL'
        );
        console.log(`Restaurantes sin lat/lng: ${rows.length}`);

        for (const r of rows) {
            if (!r.direccion) {
                console.log(`- [${r.id}] ${r.nombre}: sin direccion, salteado`);
                continue;
            }
            const coords = await geocodeAddress(r.direccion);
            if (!coords) {
                console.log(`- [${r.id}] ${r.nombre}: "${r.direccion}" no se pudo geocodificar — corregir a mano`);
                continue;
            }
            await client.query('UPDATE restaurantes SET lat = $1, lng = $2 WHERE id = $3', [coords.lat, coords.lng, r.id]);
            console.log(`- [${r.id}] ${r.nombre}: OK (${coords.lat}, ${coords.lng})`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Nominatim: max 1 req/seg
        }
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error('Error en backfill:', err.message);
    process.exit(1);
});
