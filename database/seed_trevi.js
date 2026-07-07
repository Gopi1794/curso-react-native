/**
 * Seed script — restaurante Trevi, menú completo con precios reales.
 * Uso: node database/seed_trevi.js
 *
 * ADITIVO para restaurante/admin. REEMPLAZA items existentes (delete + insert).
 * Formato opciones: [{ label, price }] — null = sin variantes, usa precio directamente.
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
    direccion:   'Alejandro Korn, Buenos Aires',
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

const op = (arr) => JSON.stringify(arr);
const cc = (a, b) => op([{ label: '240 CC', price: a }, { label: '360 CC', price: b }]);

const MENU = [

    // ── CAFÉ & MERIENDA ────────────────────────────────────────────────────────
    // Infusiones — todas con variantes 240cc / 360cc
    { nombre: 'Café',                          precio: 4800,  categoria: 'cafe_merienda', descripcion: 'Espresso solo.',                                                     opciones: cc(4800, 5300) },
    { nombre: 'Café cortado',                  precio: 4800,  categoria: 'cafe_merienda', descripcion: 'Espresso con un toque de leche.',                                    opciones: cc(4800, 5300) },
    { nombre: 'Café lágrima',                  precio: 4800,  categoria: 'cafe_merienda', descripcion: 'Leche caliente con una lágrima de café.',                            opciones: cc(4800, 5300) },
    { nombre: 'Café con leche',                precio: 4800,  categoria: 'cafe_merienda', descripcion: 'Mitad café, mitad leche caliente.',                                  opciones: cc(4800, 5300) },
    { nombre: 'Latte',                         precio: 5000,  categoria: 'cafe_merienda', descripcion: 'Espresso con leche vaporizada y espuma suave.',                      opciones: cc(5000, 5500) },
    { nombre: 'Leche',                         precio: 3500,  categoria: 'cafe_merienda', descripcion: 'Leche caliente.',                                                    opciones: cc(3500, 4000) },
    { nombre: 'Chocolatada',                   precio: 4200,  categoria: 'cafe_merienda', descripcion: 'Leche con chocolate.',                                               opciones: cc(4200, 4700) },
    { nombre: 'Submarino',                     precio: 5200,  categoria: 'cafe_merienda', descripcion: 'Leche caliente con barra de chocolate.',                             opciones: cc(5200, 5700) },
    { nombre: 'Té',                            precio: 3200,  categoria: 'cafe_merienda', descripcion: 'Té a elección.',                                                     opciones: cc(3200, 3500) },
    { nombre: 'Té con leche',                  precio: 3800,  categoria: 'cafe_merienda', descripcion: 'Té con leche caliente.',                                             opciones: cc(3800, 4100) },
    { nombre: 'Café con chocolate, crema y canela', precio: 7000, categoria: 'cafe_merienda', descripcion: 'Café especial con chocolate, crema batida y canela.',            opciones: cc(7000, 7500) },
    { nombre: 'Capuccino',                     precio: 6000,  categoria: 'cafe_merienda', descripcion: 'Espresso con espuma de leche. Opcional: canela o chocolate.',        opciones: cc(6000, 6500) },
    { nombre: 'Latte saborizado',              precio: 5500,  categoria: 'cafe_merienda', descripcion: 'Latte con sabor a elección.',                                        opciones: cc(5500, 6000) },

    // Adicionales de infusiones
    { nombre: 'Adicional: Leche',              precio: 1000,  categoria: 'cafe_merienda', descripcion: 'Leche extra para tu infusión.',                                      opciones: null },
    { nombre: 'Adicional: Leche deslactosada', precio: 1000,  categoria: 'cafe_merienda', descripcion: 'Leche deslactosada extra.',                                          opciones: null },
    { nombre: 'Adicional: Crema',              precio: 1600,  categoria: 'cafe_merienda', descripcion: 'Crema batida extra.',                                                opciones: null },
    { nombre: 'Adicional: Café frío',          precio: 600,   categoria: 'cafe_merienda', descripcion: 'Shot de café frío.',                                                 opciones: null },

    // Acompañamientos
    { nombre: 'Medialunas',                    precio: 1900,  categoria: 'cafe_merienda', descripcion: 'Medialunas de manteca.',                                             opciones: null },
    { nombre: 'Medialunas con Jamón y Queso',  precio: 3000,  categoria: 'cafe_merienda', descripcion: 'Medialunas rellenas de jamón cocido y queso.',                       opciones: null },
    { nombre: 'Croissant',                     precio: 4200,  categoria: 'cafe_merienda', descripcion: 'Croissant crocante.',                                                opciones: op([{ label: 'Sola', price: 4200 }, { label: 'Jamón y queso', price: 6000 }]) },
    { nombre: 'Croissant dulce rellena',       precio: 6500,  categoria: 'cafe_merienda', descripcion: 'Rellena de pistacho o dulce de leche con azúcar impalpable.',        opciones: null },
    { nombre: 'Canasta de tostadas',           precio: 4500,  categoria: 'cafe_merienda', descripcion: 'Pan blanco o integral con dos untables: mermelada, manteca, queso o dulce de leche.', opciones: null },
    { nombre: 'Scon de Queso',                 precio: 5000,  categoria: 'cafe_merienda', descripcion: 'Scon salado de queso, recién horneado.',                             opciones: null },
    { nombre: 'Budín Integral de Banana y Nueces', precio: 2700, categoria: 'cafe_merienda', descripcion: 'Porción de budín integral con banana y nueces.',                  opciones: null },
    { nombre: 'Cookie',                        precio: 2500,  categoria: 'cafe_merienda', descripcion: 'Chips de chocolate, Oreo o Red Velvet.',                             opciones: null },
    { nombre: 'Cookie de Pistacho',            precio: 3000,  categoria: 'cafe_merienda', descripcion: 'Cookie artesanal de pistacho.',                                      opciones: null },

    // ── SANDWICHES ─────────────────────────────────────────────────────────────
    { nombre: 'Tostado de Miga',               precio: 4000,  categoria: 'sandwiches', descripcion: 'Jamón y queso.',                                                        opciones: op([{ label: 'Medio', price: 4000 }, { label: 'Entero', price: 7000 }]) },
    { nombre: 'Sandwich de Miga Sin TACC',     precio: 8000,  categoria: 'sandwiches', descripcion: 'Dos unidades sin gluten.',                                              opciones: null },
    { nombre: 'Jamón Cocido y Queso',          precio: 6000,  categoria: 'sandwiches', descripcion: 'Pan a elección: árabe, molde integral o focaccia.',                     opciones: op([{ label: 'Simple', price: 6000 }, { label: 'Con Lechuga y Tomate', price: 6400 }, { label: 'Con Rúcula y Tomate', price: 6600 }]) },
    { nombre: 'Jamón Crudo y Queso',           precio: 7000,  categoria: 'sandwiches', descripcion: 'Pan a elección: árabe, molde integral o focaccia.',                     opciones: op([{ label: 'Simple', price: 7000 }, { label: 'Con Lechuga y Tomate', price: 7400 }, { label: 'Con Rúcula y Tomate', price: 7600 }]) },
    { nombre: 'Lomito y Cheddar',              precio: 7500,  categoria: 'sandwiches', descripcion: 'Pan a elección: árabe, molde integral o focaccia.',                     opciones: null },
    { nombre: 'Chipa con Jamón y Queso',       precio: 7500,  categoria: 'sandwiches', descripcion: 'Chipa rellena de jamón y queso.',                                       opciones: null },
    { nombre: 'Pollo Revolution',              precio: 20000, categoria: 'sandwiches', descripcion: 'Con papas fritas. Cheddar, jamón, panceta, cebolla caramelizada y huevo.', opciones: null },
    { nombre: 'Lomo Trevi',                    precio: 23000, categoria: 'sandwiches', descripcion: 'Con papas fritas. Churrasquito de lomo vacuno, jamón cocido, huevo a la plancha, panceta, tomate, lechuga y morrón.', opciones: null },

    // ── HAMBURGUESAS ───────────────────────────────────────────────────────────
    { nombre: 'Hamburguesa Tradicional',       precio: 15200, categoria: 'hamburguesas', descripcion: 'Con papas fritas. Panceta, tomate y cheddar.',                        opciones: null },
    { nombre: 'Hamburguesa Buenos Aires',      precio: 15200, categoria: 'hamburguesas', descripcion: 'Con papas fritas. Lechuga, tomate, jamón, queso, huevo y salsa Trevi.', opciones: null },
    { nombre: 'Hamburguesa New York',          precio: 15200, categoria: 'hamburguesas', descripcion: 'Con papas fritas. Cheddar, panceta, huevo frito, jamón y salsa Trevi.', opciones: null },
    { nombre: 'Hamburguesa Cuarto',            precio: 15200, categoria: 'hamburguesas', descripcion: 'Con papas fritas. Cheddar, ketchup, mostaza y cebolla.',              opciones: null },
    { nombre: 'Hamburguesa París',             precio: 15200, categoria: 'hamburguesas', descripcion: 'Con papas fritas. Rúcula, roquefort y cebolla caramelizada.',          opciones: null },
    { nombre: 'Hamburguesa Deluxe',            precio: 17500, categoria: 'hamburguesas', descripcion: 'Con papas fritas. Doble carne, cheddar, panceta y salsa Trevi.',       opciones: null },
    { nombre: 'Hamburguesa de Lentejas',       precio: 13500, categoria: 'hamburguesas', descripcion: 'Con papas fritas. Rúcula, tomates y champiñones. Veggie.',             opciones: null },

    // ── PICADAS ────────────────────────────────────────────────────────────────
    { nombre: 'Picada Caliente',               precio: 34000, categoria: 'picadas', descripcion: 'Para 2 personas. Albóndigas, bocaditos de mozzarella, papas rústicas, nuggets de pollo, rabas, milanesitas, salchichas envueltas, tequeños y dos dips (cheddar y filetto).', opciones: null },
    { nombre: 'Picada De Mar',                 precio: 40000, categoria: 'picadas', descripcion: 'Para 2 personas. Cornalitos, rabas, mejillones a la provenzal, merluza, aletas/tentáculos de calamar, langostinos, salsa tártara y un dip con salsa alioli.', opciones: null },
    { nombre: 'Picada Mexicana',               precio: 38000, categoria: 'picadas', descripcion: 'Para 2 personas. Carne, pollo, 6 tortillas, papas bravas, seis dips (queso blanco y verdeo, criolla, salsa picante, guacamole, cheddar y jalapeños), cazuela de nachos con cheddar y gambas.', opciones: null },
    { nombre: 'Tabla de Milanesa',             precio: 29500, categoria: 'picadas', descripcion: 'Para 2 personas. Degustación de milanesas: napolitana, cheddar y panceta, fugazzeta y jamón, muzzarella y roquefort. Con papas fritas.', opciones: op([{ label: 'De pollo', price: 29500 }, { label: 'De carne', price: 33000 }]) },

    // ── FINGER FOOD ────────────────────────────────────────────────────────────
    { nombre: 'Tortilla de papa y huevo',      precio: 10000, categoria: 'finger_food', descripcion: 'Tortilla española clásica.',                                           opciones: null },
    { nombre: 'Tortilla de papa a la española',precio: 11000, categoria: 'finger_food', descripcion: 'Tradicional con longaniza, cebolla, morón y orégano.',                 opciones: null },
    { nombre: 'Nuggets X12',                   precio: 13000, categoria: 'finger_food', descripcion: 'Con dip de cheddar.',                                                  opciones: null },
    { nombre: 'Rabas',                         precio: 21000, categoria: 'finger_food', descripcion: 'Rabas fritas crocantes.',                                              opciones: null },
    { nombre: 'Cuadrados de Muzzarella X3',    precio: 10000, categoria: 'finger_food', descripcion: 'Con dip de salsa filetto.',                                            opciones: null },
    { nombre: 'Bocaditos de Verdura',          precio: 10000, categoria: 'finger_food', descripcion: '10 mini medallones de remolacha, zanahoria, espinaca, zapallo y acelga. Con dip de salsa tártara.', opciones: null },

    // ── PAPAS GOURMET ──────────────────────────────────────────────────────────
    { nombre: 'Papas fritas',                  precio: 8500,  categoria: 'papas_gourmet', descripcion: 'Papas fritas crocantes.',                                            opciones: null },
    { nombre: 'Papas a la provenzal',          precio: 9500,  categoria: 'papas_gourmet', descripcion: 'Papas fritas con provenzal.',                                        opciones: null },
    { nombre: 'Papas con cheddar y panceta',   precio: 12000, categoria: 'papas_gourmet', descripcion: 'Papas fritas bañadas en cheddar y panceta.',                         opciones: null },
    { nombre: 'Papas Bety',                    precio: 15000, categoria: 'papas_gourmet', descripcion: 'Papas fritas con salsa de queso parmesano, mozzarella y provolone, cebolla de verdeo y panceta.', opciones: null },

    // ── EMPANADAS ──────────────────────────────────────────────────────────────
    { nombre: 'Empanadas',                     precio: 3500,  categoria: 'empanadas', descripcion: 'Al horno o fritas. Rellenos: carne, pollo o jamón y queso.',             opciones: op([{ label: 'Unidad', price: 3500 }, { label: '1/2 docena', price: 18500 }, { label: 'Docena', price: 35000 }]) },

    // ── MENÚ DEL DÍA ───────────────────────────────────────────────────────────
    // Lunes
    { nombre: 'Milanesa de ternera con fideos a la parmesana', precio: 12000, categoria: 'promoDia', descripcion: 'Milanesa de ternera con fideos a la parmesana.', opciones: op([{ label: 'Sin postre', price: 12000 }, { label: 'Con postre', price: 15000 }]) },
    { nombre: 'Pata y muslo al horno',                  precio: 12000, categoria: 'promoDia', descripcion: 'Guarnición a elección: puré de papa, zapallo o mixto; papas españolas o fritas; ensalada de hasta 3 ingredientes (tomate, lechuga, rúcula, zanahoria, cebolla, huevo).', opciones: op([{ label: 'Sin postre', price: 12000 }, { label: 'Con postre', price: 15000 }]) },
    // Martes
    { nombre: 'Wok de verduras con pollo, carne o mixto', precio: 12000, categoria: 'promoDia', descripcion: 'Wok de verduras salteadas con pollo, carne o mixto a elección.', opciones: op([{ label: 'Sin postre', price: 12000 }, { label: 'Con postre', price: 15000 }]) },
    { nombre: 'Chorizo a la pomarola',                  precio: 12000, categoria: 'promoDia', descripcion: 'Guarnición a elección: puré de papa, zapallo o mixto; papas españolas o fritas; ensalada de hasta 3 ingredientes (tomate, lechuga, rúcula, zanahoria, cebolla, huevo).', opciones: op([{ label: 'Sin postre', price: 12000 }, { label: 'Con postre', price: 15000 }]) },
    // Miércoles
    { nombre: 'Filet de merluza a la romana',           precio: 12000, categoria: 'promoDia', descripcion: 'Guarnición a elección: puré de papa, zapallo o mixto; papas españolas o fritas; ensalada de hasta 3 ingredientes (tomate, lechuga, rúcula, zanahoria, cebolla, huevo).', opciones: op([{ label: 'Sin postre', price: 12000 }, { label: 'Con postre', price: 15000 }]) },
    { nombre: 'Estofado de pollo',                      precio: 12000, categoria: 'promoDia', descripcion: 'Estofado de pollo casero.', opciones: op([{ label: 'Sin postre', price: 12000 }, { label: 'Con postre', price: 15000 }]) },
    // Jueves
    { nombre: 'Medallón de pollo rebozado a la pizza',  precio: 12000, categoria: 'promoDia', descripcion: 'Guarnición a elección: puré de papa, zapallo o mixto; papas españolas o fritas; ensalada de hasta 3 ingredientes (tomate, lechuga, rúcula, zanahoria, cebolla, huevo).', opciones: op([{ label: 'Sin postre', price: 12000 }, { label: 'Con postre', price: 15000 }]) },
    { nombre: 'Albóndigas al pomodoro con puré o arroz', precio: 12000, categoria: 'promoDia', descripcion: 'Albóndigas al pomodoro, con puré o arroz a elección.', opciones: op([{ label: 'Sin postre', price: 12000 }, { label: 'Con postre', price: 15000 }]) },
    // Viernes
    { nombre: 'Bife de bondiola a la barbacoa',         precio: 12000, categoria: 'promoDia', descripcion: 'Guarnición a elección: puré de papa, zapallo o mixto; papas españolas o fritas; ensalada de hasta 3 ingredientes (tomate, lechuga, rúcula, zanahoria, cebolla, huevo).', opciones: op([{ label: 'Sin postre', price: 12000 }, { label: 'Con postre', price: 15000 }]) },
    { nombre: 'Guiso de lentejas',                      precio: 12000, categoria: 'promoDia', descripcion: 'Guiso de lentejas casero.', opciones: op([{ label: 'Sin postre', price: 12000 }, { label: 'Con postre', price: 15000 }]) },

    // ── MILANESAS ─────────────────────────────────────────────────────────────
    { nombre: 'Milanesa de nalga',                      precio: 18000, categoria: 'milanesas', descripcion: 'Con guarnición a elección.',                                    opciones: null },
    { nombre: 'Milanesa de nalga napolitana',           precio: 19500, categoria: 'milanesas', descripcion: 'Con guarnición a elección.',                                    opciones: null },
    { nombre: 'Milanesa de nalga fugazzeta',            precio: 19500, categoria: 'milanesas', descripcion: 'Con guarnición a elección.',                                    opciones: null },
    { nombre: 'Milanesa de nalga cheddar y panceta',    precio: 20500, categoria: 'milanesas', descripcion: 'Con guarnición a elección.',                                    opciones: null },
    { nombre: 'Milanesa de nalga c/ jamón, muzza y roquefort', precio: 20000, categoria: 'milanesas', descripcion: 'Con guarnición a elección.',                             opciones: null },
    { nombre: 'Milanesa de pollo',                      precio: 16000, categoria: 'milanesas', descripcion: 'Con guarnición a elección.',                                    opciones: null },
    { nombre: 'Milanesa de pollo napolitana',           precio: 17500, categoria: 'milanesas', descripcion: 'Con guarnición a elección.',                                    opciones: null },
    { nombre: 'Milanesa de pollo fugazzeta',            precio: 17500, categoria: 'milanesas', descripcion: 'Con guarnición a elección.',                                    opciones: null },
    { nombre: 'Milanesa de pollo cheddar y panceta',    precio: 18500, categoria: 'milanesas', descripcion: 'Con guarnición a elección.',                                    opciones: null },
    { nombre: 'Milanesa de pollo c/ jamón, muzza y roquefort', precio: 18000, categoria: 'milanesas', descripcion: 'Con guarnición a elección.',                             opciones: null },

    // ── PLATOS ─────────────────────────────────────────────────────────────────
    { nombre: 'Merluza gratinada',             precio: 17000, categoria: 'platos', descripcion: 'Con papas fritas, puré o ensalada mixta.',                                  opciones: null },
    { nombre: 'Churrasco de pollo',            precio: 15000, categoria: 'platos', descripcion: 'Con papas fritas, puré o ensalada mixta.',                                  opciones: null },
    { nombre: 'Churrasco de pollo a la mostaza', precio: 17500, categoria: 'platos', descripcion: 'Con papas fritas, puré o ensalada mixta.',                                opciones: null },
    { nombre: 'Churrasco de pollo al verdeo',  precio: 17500, categoria: 'platos', descripcion: 'Con papas fritas, puré o ensalada mixta.',                                  opciones: null },
    { nombre: 'Churrasco de pollo al champión',precio: 17500, categoria: 'platos', descripcion: 'Con papas fritas, puré o ensalada mixta.',                                  opciones: null },
    { nombre: 'Churrasco de lomo',             precio: 19000, categoria: 'platos', descripcion: 'Con papas fritas, puré o ensalada mixta.',                                  opciones: null },
    { nombre: 'Churrasco de lomo a la mostaza',precio: 21500, categoria: 'platos', descripcion: 'Con papas fritas, puré o ensalada mixta.',                                  opciones: null },
    { nombre: 'Churrasco de lomo al verdeo',   precio: 21500, categoria: 'platos', descripcion: 'Con papas fritas, puré o ensalada mixta.',                                  opciones: null },
    { nombre: 'Churrasco de lomo al champignon',precio: 21500, categoria: 'platos', descripcion: 'Con papas fritas, puré o ensalada mixta.',                                 opciones: null },

    // ── PASTAS ─────────────────────────────────────────────────────────────────
    { nombre: 'Agnolotis de pollo al verdeo',  precio: 9500,  categoria: 'pastas', descripcion: 'Pasta rellena artesanal.',                                                  opciones: null },
    { nombre: 'Sorrentinos de jamón y queso',  precio: 9500,  categoria: 'pastas', descripcion: 'Pasta rellena artesanal.',                                                  opciones: null },
    { nombre: 'Sorrentinos de bondiola',       precio: 12000, categoria: 'pastas', descripcion: 'Pasta rellena artesanal.',                                                  opciones: null },
    { nombre: 'Tallarines al huevo',           precio: 6000,  categoria: 'pastas', descripcion: 'Tallarines frescos artesanales.',                                           opciones: null },
    { nombre: 'Ñoquis caseros de papa',        precio: 8500,  categoria: 'pastas', descripcion: 'Ñoquis artesanales de papa.',                                               opciones: null },
    { nombre: 'Ravioles de ricota',            precio: 7000,  categoria: 'pastas', descripcion: 'Pasta rellena artesanal.',                                                  opciones: null },
    { nombre: 'Raviolones de calabaza y queso',precio: 9500,  categoria: 'pastas', descripcion: 'Pasta rellena artesanal.',                                                  opciones: null },
    { nombre: 'Raviolones de verdura, ricota y nuez', precio: 9500, categoria: 'pastas', descripcion: 'Pasta rellena artesanal.',                                            opciones: null },
    // Salsas para pastas
    { nombre: 'Salsa filetto, blanca, crema, rosa o mixta', precio: 3000, categoria: 'pastas', descripcion: 'Salsa para acompañar tus pastas.',                              opciones: null },
    { nombre: 'Salsa 4 quesos',                precio: 4000,  categoria: 'pastas', descripcion: 'Salsa para acompañar tus pastas.',                                          opciones: null },
    { nombre: 'Salsa bolognesa, estofado o parisienne', precio: 4500, categoria: 'pastas', descripcion: 'Salsa para acompañar tus pastas.',                                  opciones: null },

    // ── PIZZAS ─────────────────────────────────────────────────────────────────
    { nombre: 'Pizza Muzzarella',              precio: 16000, categoria: 'pizzas', descripcion: 'Base de tomate y muzzarella.',                                              opciones: null },
    { nombre: 'Pizza Napolitana',              precio: 20000, categoria: 'pizzas', descripcion: 'Tomate, muzzarella y rodajas de tomate.',                                   opciones: null },
    { nombre: 'Pizza Jamón y Morrón',          precio: 20000, categoria: 'pizzas', descripcion: 'Jamón cocido y morrón.',                                                    opciones: null },
    { nombre: 'Pizza Jamón y Huevo',           precio: 20000, categoria: 'pizzas', descripcion: 'Jamón cocido y huevo.',                                                     opciones: null },
    { nombre: 'Pizza Calabresa',               precio: 20000, categoria: 'pizzas', descripcion: 'Salame calabrese.',                                                         opciones: null },
    { nombre: 'Pizza Provoleta',               precio: 20000, categoria: 'pizzas', descripcion: 'Provoleta gratinada.',                                                      opciones: null },
    { nombre: 'Pizza Cebolla y Muzzarella',    precio: 16000, categoria: 'pizzas', descripcion: 'Cebolla y muzzarella.',                                                     opciones: null },
    { nombre: 'Pizza Anchoas y Muzzarella',    precio: 20000, categoria: 'pizzas', descripcion: 'Anchoas y muzzarella.',                                                     opciones: null },
    { nombre: 'Pizza Rúcula y Jamón Crudo',    precio: 23500, categoria: 'pizzas', descripcion: 'Rúcula fresca y jamón crudo.',                                              opciones: null },
    { nombre: 'Pizza Panceta y Cheddar',       precio: 23500, categoria: 'pizzas', descripcion: 'Panceta y queso cheddar.',                                                  opciones: null },
    { nombre: 'Pizza Cuatro Quesos',           precio: 23500, categoria: 'pizzas', descripcion: 'Cuatro quesos gratinados.',                                                 opciones: null },
    { nombre: 'Pizza Palmitos, Jamón y Golf',  precio: 23500, categoria: 'pizzas', descripcion: 'Palmitos, jamón y salsa golf.',                                             opciones: null },
    // Adicionales de pizza
    { nombre: 'Adicional pizza: Jamón cocido / Huevo', precio: 2300, categoria: 'pizzas', descripcion: 'Adicional para tu pizza.',                                           opciones: null },
    { nombre: 'Adicional pizza: Cheddar / Panceta',    precio: 3200, categoria: 'pizzas', descripcion: 'Adicional para tu pizza.',                                           opciones: null },
    { nombre: 'Adicional pizza: Extra muzza',          precio: 2700, categoria: 'pizzas', descripcion: 'Muzzarella extra para tu pizza.',                                    opciones: null },

    // ── TARTAS ────────────────────────────────────────────────────────────────
    { nombre: 'Tarta Jamón y Queso',           precio: 8500,  categoria: 'tartas', descripcion: 'Tarta de jamón cocido y queso.',                                            opciones: null },
    { nombre: 'Tarta Tricolor',                precio: 8500,  categoria: 'tartas', descripcion: 'Espinaca, zapallo y queso.',                                                opciones: null },
    { nombre: 'Tarta de Pollo',                precio: 8500,  categoria: 'tartas', descripcion: 'Pollo en fondo de cebolla, morrón y salsa de tomate, cubierta con muzzarella gratinada.', opciones: null },

    // ── ENSALADAS ─────────────────────────────────────────────────────────────
    { nombre: 'Ensalada Trevi',                precio: 13000, categoria: 'ensaladas', descripcion: 'Arroz yamaní, rúcula, pollo desmenuzado, tomates cherry, queso azul y nueces con vinagreta de mostaza y miel.', opciones: null },
    { nombre: 'Ensalada Caesar',               precio: 13000, categoria: 'ensaladas', descripcion: 'Pollo, crouttons, queso parmesano, lechuga y salsa caesar.',             opciones: null },
    { nombre: 'Arma tu ensalada',              precio: 9000,  categoria: 'ensaladas', descripcion: '4 ingredientes a elección: choclo, huevo, lechuga, rúcula, tomate, zanahoria, pollo, queso de máquina, jamón, arroz yamaní. Ingrediente adicional: $1.900.', opciones: null },

    // ── SIN TACC ──────────────────────────────────────────────────────────────
    { nombre: 'Pizza de Muzzarella Sin TACC',  precio: 16000, categoria: 'sin_tacc', descripcion: 'Pizza sin gluten con muzzarella.',                                        opciones: null },
    { nombre: 'Empanadas x3 Sin TACC',         precio: 16000, categoria: 'sin_tacc', descripcion: 'Tres empanadas sin gluten. Rellenos: carne, pollo o jamón y queso.',     opciones: null },
    { nombre: 'Ñoquis con filetto Sin TACC',   precio: 10000, categoria: 'sin_tacc', descripcion: 'Ñoquis sin gluten con salsa filetto.',                                    opciones: null },
    { nombre: 'Chocotorta Sin TACC',           precio: 13000, categoria: 'sin_tacc', descripcion: 'Chocotorta sin gluten.',                                                  opciones: null },
    { nombre: 'Cheesecake con frutos rojos Sin TACC', precio: 13500, categoria: 'sin_tacc', descripcion: 'Cheesecake sin gluten con frutos rojos.',                           opciones: null },
    { nombre: 'Flan casero',                   precio: 4500,  categoria: 'sin_tacc', descripcion: 'Con dulce de leche y crema.',                                             opciones: null },
    { nombre: 'Budín de pan',                  precio: 4500,  categoria: 'sin_tacc', descripcion: 'Con dulce de leche y crema.',                                             opciones: null },
    { nombre: 'Duraznos con crema',            precio: 4000,  categoria: 'sin_tacc', descripcion: 'Duraznos al natural con crema batida.',                                   opciones: null },

    // ── DULCES ────────────────────────────────────────────────────────────────
    { nombre: 'Brownie',                       precio: 5500,  categoria: 'dulces', descripcion: 'Porción de brownie.',                                                       opciones: null },
    { nombre: 'Boston Pie',                    precio: 6000,  categoria: 'dulces', descripcion: 'Torta Boston clásica.',                                                     opciones: null },
    { nombre: 'New York Cheesecake',           precio: 8000,  categoria: 'dulces', descripcion: 'Cheesecake estilo New York.',                                               opciones: null },
    { nombre: 'Chocotorta',                    precio: 8800,  categoria: 'dulces', descripcion: 'Chocotorta clásica.',                                                       opciones: null },
    { nombre: 'Lemon Pie',                     precio: 7200,  categoria: 'dulces', descripcion: 'Tarta de limón con merengue.',                                              opciones: null },
    { nombre: 'Tarta de Frutilla',             precio: 7200,  categoria: 'dulces', descripcion: 'Tarta de frutilla fresca.',                                                 opciones: null },
    { nombre: 'Red Velvet',                    precio: 9000,  categoria: 'dulces', descripcion: 'Torta red velvet con frosting de queso crema.',                             opciones: null },
    { nombre: 'Tiramisú',                      precio: 9000,  categoria: 'dulces', descripcion: 'Tiramisú clásico con mascarpone y café.',                                   opciones: null },
    { nombre: 'Torta Matilda',                 precio: 9000,  categoria: 'dulces', descripcion: 'Torta de chocolate húmeda estilo Matilda.',                                 opciones: null },

    // ── HELADOS ───────────────────────────────────────────────────────────────
    {
        nombre: 'Helado artesanal',            precio: 8500,  categoria: 'helados',
        descripcion: 'Con cucurucho sin cargo. Sabores: Americana, Ananá al agua, Banana Split, Cereza, Chocolate, Chocolate amargo, Chocolate Bariloche, Chocolate blanco, Chocolate con almendras, Chocolate Dubái, Choco Toffi, Crema de cielo, Crema rusa, Dulce de leche, Dulce de leche con almendras, Dulce de leche con nueces, Dulce de leche con Rocklets, Dulce de leche granizado, Dulce de leche Trevi, Durazno al agua, Ferrero, Flan crocante, Frutilla a la crema, Frutilla al agua, Frutos del bosque, Granizado, Kinder Bueno, Lemon pie, Limón al agua, Maracuyá, Marroc, Mascarpone, Menta granizada, Oreo, Pistacho, Sambayón, Sambayón con almendras, Tiramisú, Tramontana, Vainilla.',
        opciones: op([{ label: '1/4 KG', price: 8500 }, { label: '1/2 KG', price: 15000 }, { label: '1 KG', price: 26000 }]),
    },
    // Adicionales helado
    { nombre: 'Adicional: Cucurucho extra',    precio: 1100,  categoria: 'helados', descripcion: 'Cucurucho adicional.',                                                     opciones: null },
    { nombre: 'Adicional: Nueces / Almendras', precio: 2600,  categoria: 'helados', descripcion: 'Topping de nueces o almendras.',                                           opciones: null },
    { nombre: 'Adicional: Rocklets / Microgalletitas', precio: 2000, categoria: 'helados', descripcion: 'Topping de Rocklets o microgalletitas.',                             opciones: null },

    // ── BEBIDAS ────────────────────────────────────────────────────────────────
    { nombre: 'Agua mineral / con gas',        precio: 3500,  categoria: 'bebidas', descripcion: '500ml.',                                                                    opciones: null },
    { nombre: 'Agua saborizada',               precio: 4000,  categoria: 'bebidas', descripcion: '500ml. Aquarius.',                                                         opciones: null },
    { nombre: 'Gaseosa',                       precio: 7000,  categoria: 'bebidas', descripcion: '1,5 litros. Línea Coca-Cola.',                                             opciones: null },
    { nombre: 'Milkshake',                     precio: 8500,  categoria: 'bebidas', descripcion: 'Milkshake cremoso.',                                                       opciones: null },
    { nombre: 'Exprimido',                     precio: 3500,  categoria: 'bebidas', descripcion: 'Jugo de naranja exprimido.',                                               opciones: op([{ label: 'Pequeño', price: 3500 }, { label: 'Grande', price: 5500 }]) },
    { nombre: 'Licuado',                       precio: 5500,  categoria: 'bebidas', descripcion: 'Licuado de frutas.',                                                       opciones: op([{ label: 'Con agua', price: 5500 }, { label: 'Con leche', price: 6000 }]) },
    { nombre: 'Licuado con exprimido de naranja', precio: 6000, categoria: 'bebidas', descripcion: 'Licuado con exprimido de naranja natural.',                              opciones: null },
    { nombre: 'Limonada',                      precio: 3500,  categoria: 'bebidas', descripcion: 'Limonada natural. Vaso.',                                                  opciones: null },
    { nombre: 'Limonada con menta y jengibre', precio: 3800,  categoria: 'bebidas', descripcion: 'Limonada con menta y jengibre. Vaso.',                                     opciones: null },
    { nombre: 'Limonada con frutos rojos',     precio: 4500,  categoria: 'bebidas', descripcion: 'Limonada con frutos rojos. Vaso.',                                         opciones: null },
];

async function seed() {
    let client;
    try {
        client = await pool.connect();
        console.log('Conectado a PostgreSQL. Iniciando seed de Trevi...\n');

        await client.query('BEGIN');

        // ── Restaurante ─────────────────────────────────────────────────────
        let restauranteId;
        const existe = await client.query('SELECT id FROM restaurantes WHERE nombre = $1', [RESTAURANTE.nombre]);
        if (existe.rows.length > 0) {
            restauranteId = existe.rows[0].id;
            console.log(`  Restaurante ya existe: id=${restauranteId}`);
        } else {
            const resResult = await client.query(
                `INSERT INTO restaurantes (nombre, descripcion, direccion, telefono, horario, estado, admin_id)
                 VALUES ($1, $2, $3, $4, $5, $6, (SELECT id FROM usuarios WHERE email = $7))
                 RETURNING id`,
                [RESTAURANTE.nombre, RESTAURANTE.descripcion, RESTAURANTE.direccion,
                 RESTAURANTE.telefono, RESTAURANTE.horario, RESTAURANTE.estado, ADMIN.email]
            );
            restauranteId = resResult.rows[0].id;
            console.log(`  Restaurante creado: id=${restauranteId}`);
        }

        // ── Admin ────────────────────────────────────────────────────────────
        const adminExiste = await client.query('SELECT id FROM usuarios WHERE email = $1', [ADMIN.email]);
        if (adminExiste.rows.length > 0) {
            console.log(`  Admin ya existe: ${ADMIN.email}`);
        } else {
            const passwordHash = await bcrypt.hash(ADMIN.password, 12);
            await client.query(
                `INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol, estado, restaurante_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [ADMIN.nombre, ADMIN.apellido, ADMIN.email, ADMIN.telefono,
                 passwordHash, ADMIN.rol, ADMIN.estado, restauranteId]
            );
            console.log(`  Admin creado: ${ADMIN.email} / ${ADMIN.password}`);
        }

        // ── Menú — eliminar items anteriores e insertar los nuevos ──────────
        const deleted = await client.query('DELETE FROM menu_items WHERE restaurante_id = $1', [restauranteId]);
        console.log(`\n  Items anteriores eliminados: ${deleted.rowCount}`);

        console.log('  Insertando menú completo...');
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
