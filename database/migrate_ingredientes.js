/**
 * Migración: poblar tablas de ingredientes a partir de menu_items.ingredientes TEXT[]
 *
 * Uso:
 *   node database/migrate_ingredientes.js
 *
 * Requisitos:
 *   - backend/.env configurado
 *   - Schema + migración 001_ingredientes.sql ya aplicados
 *   - menu_items ya tiene datos con la columna ingredientes TEXT[]
 *
 * Qué hace:
 *   1. Lee todos los ingredientes únicos de menu_items.ingredientes
 *   2. Los categoriza automáticamente e inserta en tabla `ingredientes`
 *   3. Crea relaciones en `menu_item_ingredientes` (todos removibles por defecto)
 *   4. Crea stock inicial (100 unidades) para cada ingrediente en cada sucursal
 */

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

// ── Auto-categorización por keywords ─────────────────────────
const CATEGORIA_RULES = [
    { categoria: 'proteina', keywords: ['carne', 'pollo', 'res', 'cerdo', 'salmón', 'atún', 'camarones', 'lomo', 'filete', 'pechuga', 'bacon', 'jamón', 'pepperoni', 'salchicha', 'chorizo', 'morcilla', 'pavo', 'roast beef', 'milanesa', 'huevo', 'clara', 'yema', 'costilla', 'medallón', 'anchoa', 'calamar', 'mejillon'] },
    { categoria: 'lacteo',  keywords: ['queso', 'mozzarella', 'cheddar', 'parmesano', 'feta', 'brie', 'provolone', 'ricotta', 'mascarpone', 'crema de leche', 'crema agria', 'crema batida', 'yogurt', 'leche', 'gorgonzola', 'fontina', 'mantequilla'] },
    { categoria: 'verdura', keywords: ['lechuga', 'tomate', 'pepino', 'cebolla', 'pimiento', 'espinaca', 'rúcula', 'champiñón', 'brócoli', 'zanahoria', 'apio', 'espárrago', 'maíz', 'elote', 'jalapeño', 'aguacate', 'aceituna', 'alcaparra', 'rábano', 'pepinillo', 'pickle'] },
    { categoria: 'fruta',   keywords: ['frutilla', 'fresa', 'manzana', 'naranja', 'limón', 'piña', 'plátano', 'cereza', 'arándano', 'uva', 'frutos rojos', 'frutas', 'jamaica'] },
    { categoria: 'pan',     keywords: ['pan ', 'pan de', 'crouton', 'tostada', 'tortilla', 'masa', 'ciabatta', 'focaccia', 'galleta', 'bizcocho', 'crepe', 'levadura', 'pan rallado'] },
    { categoria: 'salsa',   keywords: ['salsa', 'aderezo', 'mayonesa', 'mostaza', 'guacamole', 'pesto', 'alioli', 'ketchup', 'bechamel', 'vinagre'] },
    { categoria: 'condimento', keywords: ['sal ', 'pimienta', 'orégano', 'albahaca', 'cilantro', 'menta', 'eneldo', 'canela', 'curry', 'ajo', 'ají', 'azafrán', 'nuez moscada', 'semilla', 'chile', 'vainilla', 'cacao', 'ralladura', 'miel', 'azúcar', 'caramelo', 'colorante'] },
    { categoria: 'grano',   keywords: ['arroz', 'quinoa', 'frijol', 'lenteja'] },
    { categoria: 'pasta',   keywords: ['spaghetti', 'fettuccine', 'penne', 'linguini', 'macarron', 'ravioli', 'tortellini', 'ñoqui', 'láminas de pasta'] },
    { categoria: 'bebida',  keywords: ['agua', 'café', 'té ', 'jugo', 'bebida', 'hielo', 'lúpulo', 'malta', 'grano de café'] },
    { categoria: 'dulce',   keywords: ['chocolate', 'helado', 'brownie', 'cheesecake', 'tiramisú', 'gelatina', 'coco rallado', 'chispa', 'postre', 'dulce'] },
];

function categorizar(nombre) {
    const lower = nombre.toLowerCase();
    for (const rule of CATEGORIA_RULES) {
        if (rule.keywords.some(kw => lower.includes(kw))) {
            return rule.categoria;
        }
    }
    return 'otro';
}

// Ingredientes que NO deberían ser removibles (son la base del plato)
const NO_REMOVIBLES = [
    'carne', 'res', 'pollo', 'cerdo', 'salmón', 'atún', 'lomo', 'filete',
    'pechuga', 'milanesa', 'costilla', 'medallón', 'arroz', 'pasta',
    'spaghetti', 'fettuccine', 'penne', 'linguini', 'ravioli', 'tortellini',
    'ñoqui', 'quinoa', 'pan ', 'masa', 'crepe', 'hamburguesa',
    'pizza', 'taco', 'burrito',
];

function esRemovible(nombre) {
    const lower = nombre.toLowerCase();
    return !NO_REMOVIBLES.some(kw => lower.includes(kw));
}

async function migrate() {
    let client;
    try {
        client = await pool.connect();
        console.log('Conectado a PostgreSQL. Iniciando migración de ingredientes...\n');

        // 1. Leer todos los ingredientes únicos desde menu_items
        const menuResult = await client.query(
            'SELECT id, nombre, ingredientes FROM menu_items WHERE ingredientes IS NOT NULL'
        );

        const ingredientesUnicos = new Map(); // nombre → categoria
        const itemIngredientes = [];          // { menu_item_id, ingrediente_nombre }

        for (const row of menuResult.rows) {
            if (!row.ingredientes || row.ingredientes.length === 0) continue;

            for (const ing of row.ingredientes) {
                const nombre = ing.trim();
                if (!nombre) continue;

                if (!ingredientesUnicos.has(nombre)) {
                    ingredientesUnicos.set(nombre, categorizar(nombre));
                }
                itemIngredientes.push({
                    menu_item_id: row.id,
                    ingrediente_nombre: nombre,
                });
            }
        }

        console.log(`Ingredientes únicos encontrados: ${ingredientesUnicos.size}`);
        console.log(`Relaciones plato-ingrediente: ${itemIngredientes.length}`);

        // 2. Leer restaurantes activos para crear stock
        const restResult = await client.query(
            "SELECT id, nombre FROM restaurantes WHERE estado = 'activo'"
        );
        console.log(`Sucursales activas: ${restResult.rows.length}`);

        await client.query('BEGIN');

        // Limpiar tablas de ingredientes por si se re-ejecuta
        await client.query('DELETE FROM stock_ingredientes');
        await client.query('DELETE FROM menu_item_ingredientes');
        await client.query('DELETE FROM ingredientes');
        await client.query('ALTER SEQUENCE ingredientes_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE menu_item_ingredientes_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE stock_ingredientes_id_seq RESTART WITH 1');

        // 3. Insertar ingredientes
        console.log('\nInsertando ingredientes...');
        const ingredienteIdMap = new Map(); // nombre → id

        const categoryCounts = {};
        for (const [nombre, categoria] of ingredientesUnicos) {
            const result = await client.query(
                `INSERT INTO ingredientes (nombre, categoria, unidad_medida)
                 VALUES ($1, $2, $3)
                 RETURNING id`,
                [nombre, categoria, 'unidad']
            );
            ingredienteIdMap.set(nombre, result.rows[0].id);
            categoryCounts[categoria] = (categoryCounts[categoria] || 0) + 1;
        }

        console.log('  Categorías:');
        for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
            console.log(`    ${cat}: ${count}`);
        }

        // 4. Insertar relaciones menu_item_ingredientes
        console.log('\nInsertando relaciones plato ↔ ingrediente...');
        let relaciones = 0;
        const seen = new Set();

        for (const { menu_item_id, ingrediente_nombre } of itemIngredientes) {
            const ingrediente_id = ingredienteIdMap.get(ingrediente_nombre);
            if (!ingrediente_id) continue;

            const key = `${menu_item_id}-${ingrediente_id}`;
            if (seen.has(key)) continue;
            seen.add(key);

            await client.query(
                `INSERT INTO menu_item_ingredientes (menu_item_id, ingrediente_id, es_removible, cantidad_usada)
                 VALUES ($1, $2, $3, $4)`,
                [menu_item_id, ingrediente_id, esRemovible(ingrediente_nombre), 1]
            );
            relaciones++;
        }
        console.log(`  ${relaciones} relaciones insertadas`);

        // 5. Crear stock inicial para cada sucursal (100 unidades por ingrediente)
        console.log('\nCreando stock inicial por sucursal...');
        let stockCount = 0;

        for (const rest of restResult.rows) {
            for (const [, ingredienteId] of ingredienteIdMap) {
                await client.query(
                    `INSERT INTO stock_ingredientes (restaurante_id, ingrediente_id, cantidad, umbral_minimo)
                     VALUES ($1, $2, $3, $4)`,
                    [rest.id, ingredienteId, 100, 5]
                );
                stockCount++;
            }
            console.log(`  ${rest.nombre}: ${ingredienteIdMap.size} ingredientes con stock = 100`);
        }
        console.log(`  Total registros de stock: ${stockCount}`);

        await client.query('COMMIT');

        // 6. Verificación
        console.log('\n── Verificación ──');
        const verif = await client.query('SELECT COUNT(*) FROM vista_disponibilidad_platos WHERE disponible = true');
        console.log(`  Platos disponibles (todas las sucursales): ${verif.rows[0].count}`);

        const verifNo = await client.query('SELECT COUNT(*) FROM vista_disponibilidad_platos WHERE disponible = false');
        console.log(`  Platos no disponibles: ${verifNo.rows[0].count}`);

        console.log('\nMigración completada exitosamente.');

    } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        console.error('\nError durante la migración:', err);
        throw err;
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

migrate().catch((err) => {
    console.error('Error fatal:', err.message);
    process.exit(1);
});
