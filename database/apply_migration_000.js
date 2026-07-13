require(`${__dirname}/../backend/node_modules/dotenv`).config({ path: `${__dirname}/../backend/.env` });
const fs = require('fs');
const path = require('path');
const { Pool } = require(`${__dirname}/../backend/node_modules/pg`);

const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'foodapp_db',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl:      { rejectUnauthorized: false },
});

async function run() {
    const sql = fs.readFileSync(
        path.join(__dirname, 'migrations', '000_usuarios_seguridad_login.sql'),
        'utf8'
    );
    const client = await pool.connect();
    try {
        console.log('Aplicando migración 000 (retroactiva)...');
        await client.query(sql);
        console.log('Migración 000 aplicada correctamente (no-op si ya existía).');
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error('Error aplicando migración 000:', err.message);
    process.exit(1);
});
