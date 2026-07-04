/**
 * Seed script — agrega el restaurante Trevi con su admin y menú completo.
 *
 * Uso (desde la raiz del proyecto):
 *   node database/seed_trevi.js
 *
 * Este script es ADITIVO: no borra datos existentes.
 * Si el restaurante ya existe, aborta para evitar duplicados.
 */

require(`${__dirname}/../backend/node_modules/dotenv`).config({ path: `${__dirname}/../backend/.env` });

const { Pool } = require(`${__dirname}/../backend/node_modules/pg`);
const bcrypt    = require(`${__dirname}/../backend/node_modules/bcryptjs`);

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

// ── DATOS DEL RESTAURANTE ──────────────────────────────────

const RESTAURANTE = {
    nombre:      'Trevi',
    descripcion: 'Café, cocina casera y pastas artesanales en un ambiente cálido y familiar.',
    direccion:   'Av. Corrientes 1500, Buenos Aires',
    telefono:    '11-4444-5555',
    horario: JSON.stringify({
        lunes:     '08:00-22:00',
        martes:    '08:00-22:00',
        miercoles: '08:00-22:00',
        jueves:    '08:00-22:00',
        viernes:   '08:00-23:00',
        sabado:    '09:00-23:00',
        domingo:   '10:00-21:00',
    }),
    estado: 'activo',
};

// ── ADMIN DE TREVI ─────────────────────────────────────────

const ADMIN = {
    nombre:   'Trevi',
    apellido: 'Admin',
    email:    'admin@trevi.com',
    telefono: '11-4444-5555',
    password: 'trevi2026',
    rol:      'admin',
    estado:   'activo',
};

// ── MENÚ ───────────────────────────────────────────────────
// Formato: { nombre, precio, categoria, descripcion }
// imagen_key: null (sin imágenes cargadas aún para Trevi)

const MENU = [

    // ── INFUSIONES ─────────────────────────────────────────
    // Café: 2 tamaños
    { nombre: 'Café chico',             precio: 1200,  categoria: 'infusiones',       descripcion: 'Espresso solo, taza chica.' },
    { nombre: 'Café grande',            precio: 1600,  categoria: 'infusiones',       descripcion: 'Café en taza grande con más volumen.' },
    { nombre: 'Cortado chico',          precio: 1300,  categoria: 'infusiones',       descripcion: 'Espresso con un toque de leche, taza chica.' },
    { nombre: 'Cortado grande',         precio: 1700,  categoria: 'infusiones',       descripcion: 'Cortado en taza grande.' },
    { nombre: 'Café con leche chico',   precio: 1500,  categoria: 'infusiones',       descripcion: 'Mitad café, mitad leche caliente, taza chica.' },
    { nombre: 'Café con leche grande',  precio: 2000,  categoria: 'infusiones',       descripcion: 'Café con leche en taza grande.' },
    { nombre: 'Capuchino',              precio: 2200,  categoria: 'infusiones',       descripcion: 'Espresso con espuma de leche y cacao.' },
    { nombre: 'Té chico',               precio: 1100,  categoria: 'infusiones',       descripcion: 'Té a elección, taza chica.' },
    { nombre: 'Té grande',              precio: 1500,  categoria: 'infusiones',       descripcion: 'Té a elección, taza grande.' },
    { nombre: 'Submarino chico',        precio: 1800,  categoria: 'infusiones',       descripcion: 'Leche caliente con barra de chocolate, taza chica.' },
    { nombre: 'Submarino grande',       precio: 2400,  categoria: 'infusiones',       descripcion: 'Submarino en taza grande.' },

    // ── ACOMPAÑAMIENTO ─────────────────────────────────────
    { nombre: 'Medialuna de manteca',   precio:  600,  categoria: 'acompanamiento',   descripcion: 'Medialuna hojaldrada de manteca, dorada.' },
    { nombre: 'Medialuna de grasa',     precio:  500,  categoria: 'acompanamiento',   descripcion: 'Medialuna tradicional de grasa.' },
    { nombre: 'Tostadas x2',            precio:  900,  categoria: 'acompanamiento',   descripcion: 'Dos tostadas con manteca y mermelada.' },
    { nombre: 'Factura surtida x2',     precio: 1200,  categoria: 'acompanamiento',   descripcion: 'Dos facturas surtidas de panadería.' },
    { nombre: 'Muffin de arándanos',    precio: 1400,  categoria: 'acompanamiento',   descripcion: 'Muffin casero con arándanos frescos.' },
    { nombre: 'Scone de queso',         precio: 1300,  categoria: 'acompanamiento',   descripcion: 'Scone salado de queso, ideal para el desayuno.' },

    // ── SANDWICHES ─────────────────────────────────────────
    // Sandwich de miga: 3 variantes
    { nombre: 'Sandwich miga jamón y queso',        precio: 2800,  categoria: 'sandwiches', descripcion: 'Miga triple con jamón cocido y queso cremoso.' },
    { nombre: 'Sandwich miga queso y tomate',       precio: 2600,  categoria: 'sandwiches', descripcion: 'Miga triple con queso, tomate y lechuga.' },
    { nombre: 'Sandwich miga pollo y palta',        precio: 3200,  categoria: 'sandwiches', descripcion: 'Miga triple con pollo desmenuzado y palta.' },
    // Sandwich caliente: 3 variantes
    { nombre: 'Tostado jamón y queso',              precio: 3000,  categoria: 'sandwiches', descripcion: 'Pan de molde tostado con jamón y queso derretido.' },
    { nombre: 'Tostado caprese',                    precio: 3200,  categoria: 'sandwiches', descripcion: 'Pan tostado con tomate, mozzarella y albahaca.' },
    { nombre: 'Tostado pollo con mayonesa',         precio: 3500,  categoria: 'sandwiches', descripcion: 'Pan tostado con pollo grillado y mayonesa casera.' },
    // Sándwich tipo baguette: 2 variantes
    { nombre: 'Baguette de lomito',                 precio: 4500,  categoria: 'sandwiches', descripcion: 'Baguette con lomito, queso, tomate y lechuga.' },
    { nombre: 'Baguette de bondiola',               precio: 4200,  categoria: 'sandwiches', descripcion: 'Baguette con bondiola braseada, cebolla caramelizada y mostaza.' },

    // ── MENÚ DEL DÍA (promoDia) ────────────────────────────
    // Aparecen en las cards de promo de la home
    { nombre: 'Menú del día: Pasta + bebida',       precio: 6500,  categoria: 'promoDia',   descripcion: 'Pasta del día a elección con bebida sin alcohol incluida. Cambia cada día.' },
    { nombre: 'Menú del día: Plato + postre',       precio: 7200,  categoria: 'promoDia',   descripcion: 'Plato principal del día con postre de la casa incluido.' },

    // ── PICADAS ────────────────────────────────────────────
    { nombre: 'Picada chica',                       precio: 5500,  categoria: 'picadas',    descripcion: 'Quesos, fiambres, aceitunas y pan para 1-2 personas.' },
    { nombre: 'Picada grande',                      precio: 9500,  categoria: 'picadas',    descripcion: 'Tabla completa con quesos, fiambres, aceitunas, pepinillos y pan para 3-4 personas.' },
    { nombre: 'Tabla de quesos',                    precio: 7000,  categoria: 'picadas',    descripcion: 'Selección de 4 quesos artesanales con frutos secos y mermelada.' },

    // ── FINGER FOOD ────────────────────────────────────────
    { nombre: 'Papas fritas',                       precio: 2800,  categoria: 'finger_food', descripcion: 'Papas fritas crujientes con sal y ketchup.' },
    { nombre: 'Papas rústicas al horno',            precio: 3200,  categoria: 'finger_food', descripcion: 'Papas con piel al horno, ajo y romero.' },
    { nombre: 'Aros de cebolla',                    precio: 3000,  categoria: 'finger_food', descripcion: 'Aros de cebolla rebozados y fritos, con dip de mostaza.' },
    { nombre: 'Nuggets de pollo x8',                precio: 3500,  categoria: 'finger_food', descripcion: 'Nuggets caseros de pollo con salsa BBQ.' },
    { nombre: 'Empanadas de copetín x6',            precio: 3800,  categoria: 'finger_food', descripcion: 'Mini empanadas surtidas, ideales para compartir.' },

    // ── HAMBURGUESAS ───────────────────────────────────────
    { nombre: 'Hamburguesa clásica',                precio: 5500,  categoria: 'hamburguesas', descripcion: 'Pan brioche, medallón de 180g, lechuga, tomate y mayonesa.' },
    { nombre: 'Hamburguesa con queso',              precio: 5900,  categoria: 'hamburguesas', descripcion: 'Hamburguesa clásica con cheddar fundido.' },
    { nombre: 'Hamburguesa Trevi especial',         precio: 7200,  categoria: 'hamburguesas', descripcion: 'Doble medallón, cheddar, cebolla caramelizada, bacon y salsa Trevi.' },
    { nombre: 'Hamburguesa pollo grillado',         precio: 5800,  categoria: 'hamburguesas', descripcion: 'Pan brioche, pechuga grillada, palta, lechuga y mayonesa.' },

    // ── PLATOS ─────────────────────────────────────────────
    { nombre: 'Lomo al champiñón',                  precio: 9500,  categoria: 'platos',       descripcion: 'Lomo en salsa de champiñones, papas al natural y ensalada.' },
    { nombre: 'Pollo a la provenzal',               precio: 7800,  categoria: 'platos',       descripcion: 'Pechuga a la provenzal con arroz blanco y ensalada.' },
    { nombre: 'Merluza a la romana',                precio: 8200,  categoria: 'platos',       descripcion: 'Filete de merluza rebozado con papas fritas y limón.' },
    { nombre: 'Revuelto Gramajo',                   precio: 5500,  categoria: 'platos',       descripcion: 'Clásico porteño: huevo, jamón, papas paja y arvejas.' },

    // ── MILANESAS ─────────────────────────────────────────
    // Carne: 2 variantes
    { nombre: 'Milanesa de carne napolitana',       precio: 8500,  categoria: 'milanesas',    descripcion: 'Milanesa de ternera con salsa de tomate, jamón y mozzarella gratinada.' },
    { nombre: 'Milanesa de carne a caballo',        precio: 8000,  categoria: 'milanesas',    descripcion: 'Milanesa de ternera con dos huevos fritos encima.' },
    // Pollo: 2 variantes
    { nombre: 'Milanesa de pollo napolitana',       precio: 8000,  categoria: 'milanesas',    descripcion: 'Milanesa de pechuga con salsa de tomate y mozzarella gratinada.' },
    { nombre: 'Milanesa de pollo con papas',        precio: 7800,  categoria: 'milanesas',    descripcion: 'Milanesa de pechuga con papas fritas.' },

    // ── PIZZAS ─────────────────────────────────────────────
    { nombre: 'Pizza mozzarella',                   precio: 7500,  categoria: 'pizzas',       descripcion: 'Base de tomate y mozzarella fresca. Entera.' },
    { nombre: 'Pizza fugazzeta',                    precio: 8000,  categoria: 'pizzas',       descripcion: 'Doble queso con cebolla caramelizada. Entera.' },
    { nombre: 'Pizza napolitana',                   precio: 8500,  categoria: 'pizzas',       descripcion: 'Tomate, mozzarella, tomates cherry y albahaca. Entera.' },
    { nombre: 'Pizza jamón y morrones',             precio: 8500,  categoria: 'pizzas',       descripcion: 'Base de tomate, mozzarella, jamón y morrones. Entera.' },
    { nombre: 'Pizza 4 quesos',                     precio: 9000,  categoria: 'pizzas',       descripcion: 'Mozzarella, provolone, roquefort y parmesano. Entera.' },
    { nombre: 'Media pizza mozzarella',             precio: 4000,  categoria: 'pizzas',       descripcion: 'Media pizza con base de tomate y mozzarella.' },

    // ── TARTAS ────────────────────────────────────────────
    { nombre: 'Tarta de verdura (porción)',         precio: 3200,  categoria: 'tartas',       descripcion: 'Porción de tarta de espinaca, acelga y queso.' },
    { nombre: 'Tarta de jamón y queso (porción)',   precio: 3200,  categoria: 'tartas',       descripcion: 'Porción de tarta de jamón cocido y queso cremoso.' },
    { nombre: 'Tarta de choclo (porción)',          precio: 3200,  categoria: 'tartas',       descripcion: 'Porción de tarta de choclo con queso y huevo.' },
    { nombre: 'Tarta de verdura (entera)',          precio: 9500,  categoria: 'tartas',       descripcion: 'Tarta entera de espinaca, acelga y queso. 8 porciones.' },
    { nombre: 'Tarta de jamón y queso (entera)',    precio: 9500,  categoria: 'tartas',       descripcion: 'Tarta entera de jamón y queso. 8 porciones.' },

    // ── ENSALADAS ─────────────────────────────────────────
    { nombre: 'Ensalada verde',                     precio: 3500,  categoria: 'ensaladas',    descripcion: 'Lechuga, rúcula, pepino y aderezo de limón.' },
    { nombre: 'Ensalada caprese',                   precio: 4500,  categoria: 'ensaladas',    descripcion: 'Tomate, mozzarella fresca, albahaca y aceite de oliva.' },
    { nombre: 'Ensalada César',                     precio: 5000,  categoria: 'ensaladas',    descripcion: 'Lechuga romana, crutones, parmesano y aderezo César.' },
    { nombre: 'Ensalada Trevi',                     precio: 5500,  categoria: 'ensaladas',    descripcion: 'Mix de verdes, pollo grillado, palta, cherry y aderezo de mostaza miel.' },

    // ── EMPANADAS ─────────────────────────────────────────
    // Sabores por unidad, 3 tiers de cantidad
    { nombre: 'Empanada de carne (1 unidad)',        precio: 1200,  categoria: 'empanadas',   descripcion: 'Empanada de carne cortada a cuchillo, jugosa.' },
    { nombre: 'Empanadas de carne x6',               precio: 6800,  categoria: 'empanadas',   descripcion: 'Media docena de empanadas de carne.' },
    { nombre: 'Empanadas de carne x12',              precio: 12500, categoria: 'empanadas',   descripcion: 'Docena de empanadas de carne.' },
    { nombre: 'Empanada de pollo (1 unidad)',         precio: 1200,  categoria: 'empanadas',   descripcion: 'Empanada de pollo con pimentón y cebolla.' },
    { nombre: 'Empanadas de pollo x6',               precio: 6800,  categoria: 'empanadas',   descripcion: 'Media docena de empanadas de pollo.' },
    { nombre: 'Empanadas de pollo x12',              precio: 12500, categoria: 'empanadas',   descripcion: 'Docena de empanadas de pollo.' },
    { nombre: 'Empanada de jamón y queso (1 unidad)', precio: 1100, categoria: 'empanadas',   descripcion: 'Empanada de jamón cocido y queso fundido.' },
    { nombre: 'Empanadas de jamón y queso x6',       precio: 6200,  categoria: 'empanadas',   descripcion: 'Media docena de empanadas de jamón y queso.' },
    { nombre: 'Empanadas de jamón y queso x12',      precio: 11500, categoria: 'empanadas',   descripcion: 'Docena de empanadas de jamón y queso.' },
    { nombre: 'Empanada de humita (1 unidad)',        precio: 1000,  categoria: 'empanadas',   descripcion: 'Empanada de choclo cremoso, clásica del norte.' },
    { nombre: 'Empanadas de humita x6',              precio: 5500,  categoria: 'empanadas',   descripcion: 'Media docena de empanadas de humita.' },
    { nombre: 'Empanadas de humita x12',             precio: 10500, categoria: 'empanadas',   descripcion: 'Docena de empanadas de humita.' },

    // ── PASTAS ────────────────────────────────────────────
    { nombre: 'Tallarines al tuco',                 precio: 5500,  categoria: 'pastas',       descripcion: 'Tallarines frescos con salsa de tomate casera.' },
    { nombre: 'Tallarines a la boloñesa',           precio: 6500,  categoria: 'pastas',       descripcion: 'Tallarines frescos con ragú de carne.' },
    { nombre: 'Ñoquis al tuco',                     precio: 5800,  categoria: 'pastas',       descripcion: 'Ñoquis de papa artesanales con salsa de tomate.' },
    { nombre: 'Ñoquis a los cuatro quesos',         precio: 7000,  categoria: 'pastas',       descripcion: 'Ñoquis con crema y mezcla de cuatro quesos.' },
    { nombre: 'Sorrentinos de jamón y queso',       precio: 7500,  categoria: 'pastas',       descripcion: 'Sorrentinos rellenos de jamón y ricota, con salsa a elección.' },
    { nombre: 'Ravioles de verdura',                precio: 6800,  categoria: 'pastas',       descripcion: 'Ravioles de espinaca y ricota con salsa fileto.' },
    { nombre: 'Lasagna de carne',                   precio: 7200,  categoria: 'pastas',       descripcion: 'Lasagna al horno con carne, bechamel y mozzarella.' },

    // ── DULCES ────────────────────────────────────────────
    { nombre: 'Torta de chocolate',                 precio: 3000,  categoria: 'dulces',       descripcion: 'Porción de torta húmeda de chocolate con ganache.' },
    { nombre: 'Cheesecake de frutos rojos',         precio: 3200,  categoria: 'dulces',       descripcion: 'Porción de cheesecake con coulis de frutillas.' },
    { nombre: 'Brownie con helado',                 precio: 3500,  categoria: 'dulces',       descripcion: 'Brownie caliente con bocha de helado de vainilla.' },
    { nombre: 'Tiramisú',                           precio: 3800,  categoria: 'dulces',       descripcion: 'Clásico tiramisú con mascarpone y café espresso.' },
    { nombre: 'Medialunas con dulce de leche',      precio: 1800,  categoria: 'dulces',       descripcion: 'Dos medialunas de manteca con dulce de leche artesanal.' },
    { nombre: 'Flan con crema',                     precio: 2500,  categoria: 'dulces',       descripcion: 'Flan casero con crema batida y dulce de leche.' },

    // ── HELADOS ───────────────────────────────────────────
    // 3 tiers de peso (100g, 250g, 500g)
    { nombre: 'Helado 100g',                        precio: 1800,  categoria: 'helados',      descripcion: 'Pote de 100g. Sabores: chocolate, vainilla, frutilla o dulce de leche.' },
    { nombre: 'Helado 250g',                        precio: 3800,  categoria: 'helados',      descripcion: 'Pote de 250g. Sabores a elección, combinable.' },
    { nombre: 'Helado 500g',                        precio: 7000,  categoria: 'helados',      descripcion: 'Pote de 500g. Hasta 3 sabores combinados.' },

    // ── BEBIDAS ────────────────────────────────────────────
    { nombre: 'Agua mineral 500ml',                 precio: 1000,  categoria: 'bebidas',      descripcion: 'Agua mineral con o sin gas.' },
    { nombre: 'Agua mineral 1.5L',                  precio: 1800,  categoria: 'bebidas',      descripcion: 'Agua mineral familiar.' },
    { nombre: 'Coca-Cola 354ml',                    precio: 1500,  categoria: 'bebidas',      descripcion: 'Lata de Coca-Cola original.' },
    { nombre: 'Coca-Cola 1.5L',                     precio: 2800,  categoria: 'bebidas',      descripcion: 'Botella de Coca-Cola 1.5L.' },
    { nombre: 'Jugo exprimido de naranja',          precio: 2200,  categoria: 'bebidas',      descripcion: 'Jugo de naranja natural exprimido al momento.' },
    { nombre: 'Limonada',                           precio: 2000,  categoria: 'bebidas',      descripcion: 'Limonada casera con menta y azúcar.' },
    { nombre: 'Cerveza Quilmes 340ml',              precio: 2200,  categoria: 'bebidas',      descripcion: 'Botella de Quilmes clásica.' },
    { nombre: 'Cerveza Stella Artois 340ml',        precio: 2800,  categoria: 'bebidas',      descripcion: 'Botella de Stella Artois.' },
    { nombre: 'Copa de vino tinto',                 precio: 3000,  categoria: 'bebidas',      descripcion: 'Copa de vino tinto de la casa (Malbec).' },
    { nombre: 'Copa de vino blanco',                precio: 3000,  categoria: 'bebidas',      descripcion: 'Copa de vino blanco de la casa (Torrontés).' },
];

// ── SEED ───────────────────────────────────────────────────

async function seed() {
    let client;
    try {
        client = await pool.connect();
        console.log('Conectado a PostgreSQL. Iniciando seed de Trevi...\n');

        await client.query('BEGIN');

        // Verificar si el restaurante ya existe
        const existe = await client.query(
            'SELECT id FROM restaurantes WHERE nombre = $1',
            [RESTAURANTE.nombre]
        );
        if (existe.rows.length > 0) {
            await client.query('ROLLBACK');
            console.error(`ERROR: El restaurante "${RESTAURANTE.nombre}" ya existe (id=${existe.rows[0].id}). Abortando para evitar duplicados.`);
            process.exit(1);
        }

        // 1. Insertar restaurante
        console.log('Insertando restaurante Trevi...');
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
        console.log(`  Restaurante creado: id=${restauranteId}`);

        // 2. Insertar admin de Trevi
        console.log('\nInsertando admin de Trevi...');

        const adminExiste = await client.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [ADMIN.email]
        );
        if (adminExiste.rows.length > 0) {
            console.warn(`  AVISO: Ya existe un usuario con email ${ADMIN.email}. Saltando creación.`);
        } else {
            const passwordHash = await bcrypt.hash(ADMIN.password, 12);
            await client.query(
                `INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol, estado, restaurante_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [ADMIN.nombre, ADMIN.apellido, ADMIN.email, ADMIN.telefono, passwordHash, ADMIN.rol, ADMIN.estado, restauranteId]
            );
            console.log(`  Admin creado: ${ADMIN.email} / ${ADMIN.password}`);
        }

        // 3. Insertar menu_items
        console.log('\nInsertando menú...');
        const categorias = {};
        let totalItems = 0;

        for (const item of MENU) {
            await client.query(
                `INSERT INTO menu_items (restaurante_id, nombre, precio, categoria, descripcion, disponible)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [restauranteId, item.nombre, item.precio, item.categoria, item.descripcion, true]
            );
            totalItems++;
            categorias[item.categoria] = (categorias[item.categoria] || 0) + 1;
        }

        await client.query('COMMIT');

        console.log(`\n  ${totalItems} items insertados:`);
        for (const [cat, count] of Object.entries(categorias)) {
            console.log(`    ${cat}: ${count}`);
        }
        console.log('\nSeed de Trevi completado exitosamente.');
        console.log(`\nResumen:\n  Restaurante id: ${restauranteId}\n  Admin: ${ADMIN.email} / ${ADMIN.password}`);

    } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        console.error('\nError durante el seed:', err.message);
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
