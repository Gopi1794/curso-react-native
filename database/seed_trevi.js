/**
 * Seed script — agrega el restaurante Trevi con su admin y menú completo.
 *
 * Uso (desde la raiz del proyecto):
 *   node database/seed_trevi.js
 *
 * Este script es ADITIVO: no borra datos existentes.
 * Si el restaurante ya existe, aborta para evitar duplicados.
 *
 * Formato opciones: [{ label, price }]
 * Si un item no tiene opciones, precio se usa directamente.
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

const ADMIN = {
    nombre:   'Trevi',
    apellido: 'Admin',
    email:    'admin@trevi.com',
    telefono: '11-4444-5555',
    password: 'trevi2026',
    rol:      'admin',
    estado:   'activo',
};

// opciones(arr) — helper para construir el array de variantes
const op = (arr) => JSON.stringify(arr);

const MENU = [

    // ── INFUSIONES ─────────────────────────────────────────
    {
        nombre: 'Café', precio: 1200, categoria: 'infusiones',
        descripcion: 'Espresso solo.',
        opciones: op([{ label: 'Chico', price: 1200 }, { label: 'Grande', price: 1600 }]),
    },
    {
        nombre: 'Cortado', precio: 1300, categoria: 'infusiones',
        descripcion: 'Espresso con un toque de leche.',
        opciones: op([{ label: 'Chico', price: 1300 }, { label: 'Grande', price: 1700 }]),
    },
    {
        nombre: 'Café con leche', precio: 1500, categoria: 'infusiones',
        descripcion: 'Mitad café, mitad leche caliente.',
        opciones: op([{ label: 'Chico', price: 1500 }, { label: 'Grande', price: 2000 }]),
    },
    {
        nombre: 'Capuchino', precio: 2200, categoria: 'infusiones',
        descripcion: 'Espresso con espuma de leche y cacao.',
        opciones: null,
    },
    {
        nombre: 'Té', precio: 1100, categoria: 'infusiones',
        descripcion: 'Té a elección.',
        opciones: op([{ label: 'Chico', price: 1100 }, { label: 'Grande', price: 1500 }]),
    },
    {
        nombre: 'Submarino', precio: 1800, categoria: 'infusiones',
        descripcion: 'Leche caliente con barra de chocolate.',
        opciones: op([{ label: 'Chico', price: 1800 }, { label: 'Grande', price: 2400 }]),
    },

    // ── ACOMPAÑAMIENTO ─────────────────────────────────────
    { nombre: 'Medialuna',          precio: 550,  categoria: 'acompanamiento', descripcion: 'Medialuna de manteca o grasa.', opciones: op([{ label: 'Manteca', price: 600 }, { label: 'Grasa', price: 500 }]) },
    { nombre: 'Tostadas x2',        precio: 900,  categoria: 'acompanamiento', descripcion: 'Dos tostadas con manteca y mermelada.', opciones: null },
    { nombre: 'Factura surtida x2', precio: 1200, categoria: 'acompanamiento', descripcion: 'Dos facturas surtidas de panadería.', opciones: null },
    { nombre: 'Muffin de arándanos',precio: 1400, categoria: 'acompanamiento', descripcion: 'Muffin casero con arándanos frescos.', opciones: null },
    { nombre: 'Scone de queso',     precio: 1300, categoria: 'acompanamiento', descripcion: 'Scone salado de queso.', opciones: null },

    // ── SANDWICHES ─────────────────────────────────────────
    { nombre: 'Sandwich de miga jamón y queso',  precio: 2800, categoria: 'sandwiches', descripcion: 'Miga triple con jamón cocido y queso cremoso.', opciones: null },
    { nombre: 'Sandwich de miga queso y tomate', precio: 2600, categoria: 'sandwiches', descripcion: 'Miga triple con queso, tomate y lechuga.', opciones: null },
    { nombre: 'Sandwich de miga pollo y palta',  precio: 3200, categoria: 'sandwiches', descripcion: 'Miga triple con pollo desmenuzado y palta.', opciones: null },
    { nombre: 'Tostado jamón y queso',           precio: 3000, categoria: 'sandwiches', descripcion: 'Pan de molde tostado con jamón y queso derretido.', opciones: null },
    { nombre: 'Tostado caprese',                 precio: 3200, categoria: 'sandwiches', descripcion: 'Pan tostado con tomate, mozzarella y albahaca.', opciones: null },
    { nombre: 'Tostado pollo con mayonesa',      precio: 3500, categoria: 'sandwiches', descripcion: 'Pan tostado con pollo grillado y mayonesa casera.', opciones: null },
    { nombre: 'Baguette de lomito',              precio: 4500, categoria: 'sandwiches', descripcion: 'Baguette con lomito, queso, tomate y lechuga.', opciones: null },
    { nombre: 'Baguette de bondiola',            precio: 4200, categoria: 'sandwiches', descripcion: 'Baguette con bondiola braseada, cebolla caramelizada y mostaza.', opciones: null },

    // ── MENÚ DEL DÍA ───────────────────────────────────���───
    { nombre: 'Menú del día: Pasta + bebida', precio: 6500, categoria: 'promoDia', descripcion: 'Pasta del día a elección con bebida sin alcohol incluida.', opciones: null },
    { nombre: 'Menú del día: Plato + postre', precio: 7200, categoria: 'promoDia', descripcion: 'Plato principal del día con postre de la casa incluido.', opciones: null },

    // ── PICADAS ────────────────────────────────────────────
    { nombre: 'Picada', precio: 5500, categoria: 'picadas', descripcion: 'Quesos, fiambres, aceitunas y pan.', opciones: op([{ label: 'Chica (1-2 personas)', price: 5500 }, { label: 'Grande (3-4 personas)', price: 9500 }]) },
    { nombre: 'Tabla de quesos', precio: 7000, categoria: 'picadas', descripcion: 'Selección de 4 quesos artesanales con frutos secos y mermelada.', opciones: null },

    // ── FINGER FOOD ────────────────────────────────────────
    { nombre: 'Papas fritas',           precio: 2800, categoria: 'finger_food', descripcion: 'Papas fritas crujientes con ketchup.', opciones: op([{ label: 'Clásicas', price: 2800 }, { label: 'Rústicas al horno', price: 3200 }]) },
    { nombre: 'Aros de cebolla',        precio: 3000, categoria: 'finger_food', descripcion: 'Aros de cebolla rebozados con dip de mostaza.', opciones: null },
    { nombre: 'Nuggets de pollo x8',    precio: 3500, categoria: 'finger_food', descripcion: 'Nuggets caseros de pollo con salsa BBQ.', opciones: null },
    { nombre: 'Empanadas de copetín x6',precio: 3800, categoria: 'finger_food', descripcion: 'Mini empanadas surtidas para compartir.', opciones: null },

    // ── HAMBURGUESAS ───────────────────────────────────────
    { nombre: 'Hamburguesa clásica',        precio: 5500, categoria: 'hamburguesas', descripcion: 'Pan brioche, medallón 180g, lechuga, tomate y mayonesa.', opciones: null },
    { nombre: 'Hamburguesa con queso',      precio: 5900, categoria: 'hamburguesas', descripcion: 'Hamburguesa clásica con cheddar fundido.', opciones: null },
    { nombre: 'Hamburguesa Trevi especial', precio: 7200, categoria: 'hamburguesas', descripcion: 'Doble medallón, cheddar, cebolla caramelizada, bacon y salsa Trevi.', opciones: null },
    { nombre: 'Hamburguesa de pollo',       precio: 5800, categoria: 'hamburguesas', descripcion: 'Pan brioche, pechuga grillada, palta, lechuga y mayonesa.', opciones: null },

    // ── PLATOS ─────────────────────────────────────────────
    { nombre: 'Lomo al champiñón',      precio: 9500, categoria: 'platos', descripcion: 'Lomo en salsa de champiñones, papas al natural y ensalada.', opciones: null },
    { nombre: 'Pollo a la provenzal',   precio: 7800, categoria: 'platos', descripcion: 'Pechuga a la provenzal con arroz blanco y ensalada.', opciones: null },
    { nombre: 'Merluza a la romana',    precio: 8200, categoria: 'platos', descripcion: 'Filete de merluza rebozado con papas fritas y limón.', opciones: null },
    { nombre: 'Revuelto Gramajo',       precio: 5500, categoria: 'platos', descripcion: 'Clásico porte��o: huevo, jamón, papas paja y arvejas.', opciones: null },

    // ── MILANESAS ─────────────────────────────────────────
    {
        nombre: 'Milanesa napolitana', precio: 8000, categoria: 'milanesas',
        descripcion: 'Milanesa con salsa de tomate, jamón y mozzarella gratinada.',
        opciones: op([{ label: 'De carne', price: 8500 }, { label: 'De pollo', price: 8000 }]),
    },
    {
        nombre: 'Milanesa con papas', precio: 7800, categoria: 'milanesas',
        descripcion: 'Milanesa con papas fritas.',
        opciones: op([{ label: 'De carne a caballo', price: 8000 }, { label: 'De pollo', price: 7800 }]),
    },

    // ── PIZZAS ─────────────────────────────────────────────
    { nombre: 'Pizza mozzarella',     precio: 7500, categoria: 'pizzas', descripcion: 'Base de tomate y mozzarella fresca.', opciones: op([{ label: 'Entera', price: 7500 }, { label: 'Media', price: 4000 }]) },
    { nombre: 'Pizza fugazzeta',      precio: 8000, categoria: 'pizzas', descripcion: 'Doble queso con cebolla caramelizada.', opciones: op([{ label: 'Entera', price: 8000 }, { label: 'Media', price: 4300 }]) },
    { nombre: 'Pizza napolitana',     precio: 8500, categoria: 'pizzas', descripcion: 'Tomate, mozzarella, tomates cherry y albahaca.', opciones: op([{ label: 'Entera', price: 8500 }, { label: 'Media', price: 4500 }]) },
    { nombre: 'Pizza jamón y morrones',precio: 8500, categoria: 'pizzas', descripcion: 'Base de tomate, mozzarella, jamón y morrones.', opciones: op([{ label: 'Entera', price: 8500 }, { label: 'Media', price: 4500 }]) },
    { nombre: 'Pizza 4 quesos',       precio: 9000, categoria: 'pizzas', descripcion: 'Mozzarella, provolone, roquefort y parmesano.', opciones: op([{ label: 'Entera', price: 9000 }, { label: 'Media', price: 4800 }]) },

    // ── TARTAS ────────────────────────────────────────────
    { nombre: 'Tarta de verdura',      precio: 3200, categoria: 'tartas', descripcion: 'Espinaca, acelga y queso.', opciones: op([{ label: 'Porción', price: 3200 }, { label: 'Entera (8 porciones)', price: 9500 }]) },
    { nombre: 'Tarta de jamón y queso',precio: 3200, categoria: 'tartas', descripcion: 'Jamón cocido y queso cremoso.', opciones: op([{ label: 'Porción', price: 3200 }, { label: 'Entera (8 porciones)', price: 9500 }]) },
    { nombre: 'Tarta de choclo',       precio: 3200, categoria: 'tartas', descripcion: 'Choclo con queso y huevo.', opciones: null },

    // ── ENSALADAS ─────────────────────────────────────────
    { nombre: 'Ensalada verde',   precio: 3500, categoria: 'ensaladas', descripcion: 'Lechuga, rúcula, pepino y aderezo de limón.', opciones: null },
    { nombre: 'Ensalada caprese', precio: 4500, categoria: 'ensaladas', descripcion: 'Tomate, mozzarella fresca, albahaca y aceite de oliva.', opciones: null },
    { nombre: 'Ensalada César',   precio: 5000, categoria: 'ensaladas', descripcion: 'Lechuga romana, crutones, parmesano y aderezo César.', opciones: null },
    { nombre: 'Ensalada Trevi',   precio: 5500, categoria: 'ensaladas', descripcion: 'Mix de verdes, pollo grillado, palta, cherry y mostaza miel.', opciones: null },

    // ── EMPANADAS ─────────────────────────────────────────
    {
        nombre: 'Empanada de carne', precio: 1200, categoria: 'empanadas',
        descripcion: 'Carne cortada a cuchillo, jugosa.',
        opciones: op([{ label: '1 unidad', price: 1200 }, { label: 'Media docena (x6)', price: 6800 }, { label: 'Docena (x12)', price: 12500 }]),
    },
    {
        nombre: 'Empanada de pollo', precio: 1200, categoria: 'empanadas',
        descripcion: 'Pollo con pimentón y cebolla.',
        opciones: op([{ label: '1 unidad', price: 1200 }, { label: 'Media docena (x6)', price: 6800 }, { label: 'Docena (x12)', price: 12500 }]),
    },
    {
        nombre: 'Empanada de jamón y queso', precio: 1100, categoria: 'empanadas',
        descripcion: 'Jamón cocido y queso fundido.',
        opciones: op([{ label: '1 unidad', price: 1100 }, { label: 'Media docena (x6)', price: 6200 }, { label: 'Docena (x12)', price: 11500 }]),
    },
    {
        nombre: 'Empanada de humita', precio: 1000, categoria: 'empanadas',
        descripcion: 'Choclo cremoso, clásica del norte.',
        opciones: op([{ label: '1 unidad', price: 1000 }, { label: 'Media docena (x6)', price: 5500 }, { label: 'Docena (x12)', price: 10500 }]),
    },

    // ── PASTAS ────────────────────────────────────────────
    { nombre: 'Tallarines',        precio: 5500, categoria: 'pastas', descripcion: 'Tallarines frescos artesanales.', opciones: op([{ label: 'Al tuco', price: 5500 }, { label: 'A la boloñesa', price: 6500 }]) },
    { nombre: 'Ñoquis',            precio: 5800, categoria: 'pastas', descripcion: 'Ñoquis de papa artesanales.', opciones: op([{ label: 'Al tuco', price: 5800 }, { label: 'A los cuatro quesos', price: 7000 }]) },
    { nombre: 'Sorrentinos',       precio: 7500, categoria: 'pastas', descripcion: 'Sorrentinos rellenos con salsa a elección.', opciones: op([{ label: 'Jamón y queso', price: 7500 }, { label: 'Verdura y ricota', price: 7000 }]) },
    { nombre: 'Ravioles de verdura',precio: 6800, categoria: 'pastas', descripcion: 'Ravioles de espinaca y ricota con salsa fileto.', opciones: null },
    { nombre: 'Lasagna de carne',  precio: 7200, categoria: 'pastas', descripcion: 'Lasagna al horno con carne, bechamel y mozzarella.', opciones: null },

    // ── DULCES ────────────────────────────────────────────
    { nombre: 'Torta de chocolate',         precio: 3000, categoria: 'dulces', descripcion: 'Porción de torta húmeda con ganache.', opciones: null },
    { nombre: 'Cheesecake de frutos rojos', precio: 3200, categoria: 'dulces', descripcion: 'Porción con coulis de frutillas.', opciones: null },
    { nombre: 'Brownie con helado',         precio: 3500, categoria: 'dulces', descripcion: 'Brownie caliente con bocha de helado de vainilla.', opciones: null },
    { nombre: 'Tiramisú',                   precio: 3800, categoria: 'dulces', descripcion: 'Clásico con mascarpone y café espresso.', opciones: null },
    { nombre: 'Medialunas con dulce de leche', precio: 1800, categoria: 'dulces', descripcion: 'Dos medialunas de manteca con dulce de leche artesanal.', opciones: null },
    { nombre: 'Flan con crema',             precio: 2500, categoria: 'dulces', descripcion: 'Flan casero con crema batida y dulce de leche.', opciones: null },

    // ── HELADOS ───────────────────────────────────────────
    {
        nombre: 'Helado', precio: 1800, categoria: 'helados',
        descripcion: 'Helado artesanal. Sabores: chocolate, vainilla, frutilla o dulce de leche.',
        opciones: op([{ label: '100g', price: 1800 }, { label: '250g', price: 3800 }, { label: '500g', price: 7000 }]),
    },

    // ── BEBIDAS ────────────────────────────────────────────
    { nombre: 'Agua mineral',      precio: 1000, categoria: 'bebidas', descripcion: 'Con o sin gas.', opciones: op([{ label: '500ml', price: 1000 }, { label: '1.5L', price: 1800 }]) },
    { nombre: 'Coca-Cola',         precio: 1500, categoria: 'bebidas', descripcion: 'Coca-Cola original.', opciones: op([{ label: '354ml (lata)', price: 1500 }, { label: '1.5L', price: 2800 }]) },
    { nombre: 'Jugo de naranja',   precio: 2200, categoria: 'bebidas', descripcion: 'Natural exprimido al momento.', opciones: null },
    { nombre: 'Limonada',          precio: 2000, categoria: 'bebidas', descripcion: 'Limonada casera con menta y azúcar.', opciones: null },
    { nombre: 'Cerveza Quilmes',   precio: 2200, categoria: 'bebidas', descripcion: 'Botella 340ml.', opciones: null },
    { nombre: 'Cerveza Stella Artois', precio: 2800, categoria: 'bebidas', descripcion: 'Botella 340ml.', opciones: null },
    { nombre: 'Copa de vino',      precio: 3000, categoria: 'bebidas', descripcion: 'Copa de vino de la casa.', opciones: op([{ label: 'Tinto (Malbec)', price: 3000 }, { label: 'Blanco (Torrontés)', price: 3000 }]) },
];

async function seed() {
    let client;
    try {
        client = await pool.connect();
        console.log('Conectado a PostgreSQL. Iniciando seed de Trevi...\n');

        await client.query('BEGIN');

        let restauranteId;
        const existe = await client.query(
            'SELECT id FROM restaurantes WHERE nombre = $1',
            [RESTAURANTE.nombre]
        );
        if (existe.rows.length > 0) {
            restauranteId = existe.rows[0].id;
            console.log(`  Restaurante ya existe: id=${restauranteId} — solo se insertarán los items.`);
        } else {
            // 1. Insertar restaurante
            console.log('Insertando restaurante Trevi...');
            const resResult = await client.query(
                `INSERT INTO restaurantes (nombre, descripcion, direccion, telefono, horario, estado, admin_id)
                 VALUES ($1, $2, $3, $4, $5, $6, (SELECT id FROM usuarios WHERE email = $7))
                 RETURNING id`,
                [RESTAURANTE.nombre, RESTAURANTE.descripcion, RESTAURANTE.direccion, RESTAURANTE.telefono, RESTAURANTE.horario, RESTAURANTE.estado, ADMIN.email]
            );
            restauranteId = resResult.rows[0].id;
            console.log(`  Restaurante creado: id=${restauranteId}`);
        }

        // 2. Insertar admin
        console.log('\nInsertando admin de Trevi...');
        const adminExiste = await client.query('SELECT id FROM usuarios WHERE email = $1', [ADMIN.email]);
        if (adminExiste.rows.length > 0) {
            console.warn(`  AVISO: Ya existe un usuario con email ${ADMIN.email}. Saltando.`);
        } else {
            const passwordHash = await bcrypt.hash(ADMIN.password, 12);
            await client.query(
                `INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol, estado, restaurante_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [ADMIN.nombre, ADMIN.apellido, ADMIN.email, ADMIN.telefono, passwordHash, ADMIN.rol, ADMIN.estado, restauranteId]
            );
            console.log(`  Admin creado: ${ADMIN.email} / ${ADMIN.password}`);
        }

        // 3. Insertar menú
        console.log('\nInsertando menú...');
        const categorias = {};
        let totalItems = 0;

        for (const item of MENU) {
            await client.query(
                `INSERT INTO menu_items (restaurante_id, nombre, precio, categoria, descripcion, opciones, disponible)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [restauranteId, item.nombre, item.precio, item.categoria, item.descripcion, item.opciones, true]
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
