/**
 * Seed script — pobla la base de datos con datos de prueba.
 *
 * Uso (desde la raiz del proyecto):
 *   node database/seed.js
 *
 * Requisitos:
 *   - backend/.env configurado con las credenciales de PG
 *   - Schema ya aplicado: psql -U postgres -d foodapp_db -f database/schema.sql
 */

require(`${__dirname}/../backend/node_modules/dotenv`).config({ path: `${__dirname}/../backend/.env` });

const { Pool } = require(`${__dirname}/../backend/node_modules/pg`);
const bcrypt = require(`${__dirname}/../backend/node_modules/bcryptjs`);
const fs   = require('fs');
const path = require('path');

if (!process.env.DB_PASSWORD) {
    console.error('ERROR: DB_PASSWORD no esta definida. Revisa backend/.env');
    process.exit(1);
}

const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'foodapp_db',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const parsePrice = (priceStr) => parseFloat(String(priceStr).replace('$', '').trim());

const firstImageKey = (imageKey) => Array.isArray(imageKey) ? imageKey[0] || null : imageKey || null;

const RESTAURANTE = {
    nombre:      'FoodApp Restaurant',
    descripcion: 'El mejor restaurante de la ciudad con variedad de opciones.',
    direccion:   'Av. Principal 123, Ciudad',
    telefono:    '555-0000',
    horario: JSON.stringify({
        lunes:     '09:00-22:00',
        martes:    '09:00-22:00',
        miercoles: '09:00-22:00',
        jueves:    '09:00-22:00',
        viernes:   '09:00-23:00',
        sabado:    '10:00-23:00',
        domingo:   '10:00-21:00',
    }),
    estado: 'activo',
};

async function seed() {
    let client;
    try {
        client = await pool.connect();
        console.log('Conectado a PostgreSQL. Iniciando seed...\n');

        const jsonPath = path.join(__dirname, '../frontend/assets/data/menuItems.json.bak');
        if (!fs.existsSync(jsonPath)) {
            throw new Error(`No se encontro el archivo: ${jsonPath}`);
        }
        const menuItems = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log(`Items encontrados en el JSON: ${menuItems.length}`);

        await client.query('BEGIN');

        // Limpiar datos previos respetando foreign keys
        console.log('\nLimpiando datos anteriores...');
        await client.query('DELETE FROM pagos');
        await client.query('DELETE FROM pedido_items');
        await client.query('DELETE FROM pedidos');
        await client.query('DELETE FROM metodos_pago');
        await client.query('DELETE FROM menu_items');
        await client.query('DELETE FROM restaurantes');
        await client.query('DELETE FROM cupones');
        await client.query('DELETE FROM usuarios');
        await client.query('ALTER SEQUENCE restaurantes_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE menu_items_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE cupones_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE usuarios_id_seq RESTART WITH 1');

        // Insertar restaurante
        console.log('\nInsertando restaurante...');
        const resResult = await client.query(
            `INSERT INTO restaurantes (nombre, descripcion, direccion, telefono, horario, estado)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
                RESTAURANTE.nombre,
                RESTAURANTE.descripcion,
                RESTAURANTE.direccion,
                RESTAURANTE.telefono,
                RESTAURANTE.horario,
                RESTAURANTE.estado,
            ]
        );
        const restauranteId = resResult.rows[0].id;
        console.log(`  Restaurante creado con id=${restauranteId}`);

        // Insertar menu_items
        console.log('\nInsertando menu_items...');
        let inserted = 0;
        const categories = {};

        for (const item of menuItems) {
            const precio = parsePrice(item.price);
            if (isNaN(precio)) {
                console.warn(`  Precio invalido en item id=${item.id}, saltando`);
                continue;
            }

            await client.query(
                `INSERT INTO menu_items
                    (restaurante_id, nombre, precio, categoria, descripcion, ingredientes, imagen_key, disponible)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    restauranteId,
                    item.name,
                    precio,
                    item.category,
                    item.descriptionText || null,
                    item.ingredientText  || [],
                    firstImageKey(item.imageKey),
                    true,
                ]
            );
            inserted++;
            categories[item.category] = (categories[item.category] || 0) + 1;
        }

        await client.query('COMMIT');

        console.log(`\n  ${inserted} items insertados:`);
        for (const [cat, count] of Object.entries(categories)) {
            console.log(`    ${cat}: ${count}`);
        }
        // Insertar cupones
        console.log('\nInsertando cupones...');
        const cuponesData = [
            { oferta: '30% OFF', titulo: 'Aros de cebolla',           imagen_key: 'ticket-1.webp',   imagen_real_key: 'ticket-1-1.png',  valido_hasta: '2026-09-30', disclaimer: 'Válido los martes.',                            texto_reverso: 'Presentar este ticket al personal. No transferible. No acumulable con otras promociones.', codigo: 'APP2X1-2026-CEBOLLA', color: '#FF6B6B' },
            { oferta: '35% OFF', titulo: 'Hamburguesas con papas',     imagen_key: 'ticket-2.webp',   imagen_real_key: 'ticket-2-2.png',  valido_hasta: '2026-10-31', disclaimer: 'Válido solo los fines de semana.',               texto_reverso: 'Válido de viernes a domingo.',                                                             codigo: '35%OFF-2026-BURGER',  color: '#4ECDC4' },
            { oferta: '2X1',     titulo: 'Mojitos',                    imagen_key: 'ticket-3.webp',   imagen_real_key: 'ticket-3-3.png',  valido_hasta: '2026-12-31', disclaimer: 'Aplicable en pedidos mayores a $20.',           texto_reverso: 'Descuento aplicable para mayores de 18 años.',                                             codigo: '2X1-2026-MOJITO',     color: '#45B7D1' },
            { oferta: '40% OFF', titulo: 'Cafés con Rebelvet',         imagen_key: 'ticket-4.webp',   imagen_real_key: 'ticket-4-4.png',  valido_hasta: '2026-12-31', disclaimer: 'Dos cafés con una porción de Rebelvet.',         texto_reverso: 'El cupón solo sirve para antes de las 12:00 p.m.',                                         codigo: '40%OFF-2026-CAFE',    color: '#96CEB4' },
            { oferta: '50% OFF', titulo: 'Cafés con dos medialunas',   imagen_key: 'ticket-5.webp',   imagen_real_key: 'ticket-5-5.png',  valido_hasta: '2026-12-31', disclaimer: 'Café (solo) con dos medialunas.',               texto_reverso: 'El cupón solo sirve para antes de las 12:00 p.m.',                                         codigo: '50%OFF-2026-CAFE',    color: '#f3b01fff' },
            { oferta: '2X1',     titulo: 'Helados combinados',         imagen_key: 'ticket-6.webp',   imagen_real_key: 'ticket-6-6.png',  valido_hasta: '2026-12-31', disclaimer: 'Aplicable solo los lunes.',                     texto_reverso: '2x1 en helados combinados.',                                                               codigo: '2X1-2026-HELADO',     color: '#FF9FF3' },
        ];

        for (const c of cuponesData) {
            await client.query(
                `INSERT INTO cupones (oferta, titulo, imagen_key, imagen_real_key, valido_hasta, disclaimer, texto_reverso, codigo, color)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [c.oferta, c.titulo, c.imagen_key, c.imagen_real_key, c.valido_hasta, c.disclaimer, c.texto_reverso, c.codigo, c.color]
            );
        }
        console.log(`  ${cuponesData.length} cupones insertados`);

        // Insertar usuario de prueba
        console.log('\nInsertando usuario de prueba...');
        const passwordHash = await bcrypt.hash('123456', 10);
        await client.query(
            `INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            ['Demo', 'User', 'demo@foodapp.com', '555-1234', passwordHash, 'cliente', 'activo']
        );
        console.log('  Usuario creado: demo@foodapp.com / 123456');

        console.log('\nSeed completado exitosamente.');

    } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        console.error('\nError durante el seed:', err);
        throw err;
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

seed().catch((err) => {
    console.error('Error fatal:', err.message);
    process.exit(1);
});
