const db = require('../config/database');
const cache = require('../utils/cache');
const crypto = require('crypto');

const MENU_TTL = 5 * 60 * 1000; // 5 minutos

// ── GET ALL RESTAURANTS ───────────────────────────────────
// GET /api/restaurants
exports.getAll = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, nombre, descripcion, direccion, telefono, horario, logo_url, estado, fecha_creacion
             FROM restaurantes
             WHERE estado = 'activo'
             ORDER BY nombre ASC`
        );

        res.json({
            success: true,
            count: result.rows.length,
            restaurants: result.rows
        });

    } catch (error) {
        console.error('Error en getAll restaurants:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── GET RESTAURANT BY ID ──────────────────────────────────
// GET /api/restaurants/:id
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de restaurante inválido'
            });
        }

        const result = await db.query(
            `SELECT id, nombre, descripcion, direccion, telefono, horario, logo_url, estado, fecha_creacion
             FROM restaurantes
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado'
            });
        }

        res.json({
            success: true,
            restaurant: result.rows[0]
        });

    } catch (error) {
        console.error('Error en getById restaurant:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── GET MENU ──────────────────────────────────────────────
// GET /api/restaurants/:id/menu
// Query params opcionales: ?category=burgers
exports.getMenu = async (req, res) => {
    try {
        const { id } = req.params;
        const { category } = req.query;

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de restaurante inválido'
            });
        }

        const cacheKey = `menu:${id}:${category || 'all'}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        // Verificar que el restaurante exista
        const restaurantCheck = await db.query(
            'SELECT id FROM restaurantes WHERE id = $1',
            [id]
        );

        if (restaurantCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado'
            });
        }

        // Construir query: usar vista de disponibilidad + ingredientes desde tablas nuevas
        let query = `
            SELECT mi.id, mi.nombre, mi.precio, mi.categoria, mi.descripcion, mi.imagen_key,
                   mi.calorias, mi.peso, mi.ingredientes AS ingredientes_raw, mi.opciones,
                   COALESCE(vd.disponible, TRUE) AS disponible
            FROM menu_items mi
            LEFT JOIN vista_disponibilidad_platos vd
                ON vd.menu_item_id = mi.id AND vd.restaurante_id = mi.restaurante_id
            WHERE mi.restaurante_id = $1
              AND mi.disponible = TRUE
              AND COALESCE(vd.disponible, TRUE) = TRUE
        `;
        const values = [id];

        if (category) {
            values.push(category.toLowerCase());
            query += ` AND mi.categoria = $${values.length}`;
        }

        query += `
            ORDER BY
                CASE mi.categoria
                    WHEN 'ensaladas'   THEN 1
                    WHEN 'promos'      THEN 2
                    WHEN 'promoDia'    THEN 3
                    WHEN 'burgers'     THEN 4
                    WHEN 'pizzas'      THEN 5
                    WHEN 'pastas'      THEN 6
                    WHEN 'emplatados'  THEN 7
                    WHEN 'sandwichs'   THEN 8
                    WHEN 'postres'     THEN 9
                    WHEN 'helados'     THEN 10
                    WHEN 'bebidas'     THEN 11
                    ELSE 99
                END ASC,
                mi.nombre ASC`;

        const result = await db.query(query, values);

        // Traer ingredientes de todos los items en una sola query
        const itemIds = result.rows.map(r => r.id);
        let ingredientesMap = {};

        if (itemIds.length > 0) {
            const ingResult = await db.query(
                `SELECT mii.menu_item_id, i.nombre, mii.es_removible,
                        COALESCE(si.cantidad, 0) <= 0 AS sin_stock
                 FROM menu_item_ingredientes mii
                 JOIN ingredientes i ON i.id = mii.ingrediente_id
                 LEFT JOIN stock_ingredientes si
                    ON si.ingrediente_id = mii.ingrediente_id
                   AND si.restaurante_id = $2
                 WHERE mii.menu_item_id = ANY($1)
                 ORDER BY i.nombre ASC`,
                [itemIds, id]
            );

            for (const row of ingResult.rows) {
                if (!ingredientesMap[row.menu_item_id]) {
                    ingredientesMap[row.menu_item_id] = [];
                }
                ingredientesMap[row.menu_item_id].push({
                    nombre: row.nombre,
                    es_removible: row.es_removible,
                    sin_stock: row.sin_stock
                });
            }
        }

        // Armar respuesta con ingredientes embebidos
        const items = result.rows.map(item => {
            const normalized = ingredientesMap[item.id];
            const fallbackRaw = Array.isArray(item.ingredientes_raw) ? item.ingredientes_raw : [];

            const ingredientes = normalized
                ? normalized.map(i => i.nombre)
                : fallbackRaw;

            const ingredientes_detalle = normalized
                ? normalized
                : fallbackRaw.map(nombre => ({ nombre, es_removible: true }));

            return { ...item, ingredientes, ingredientes_detalle };
        });

        const response = {
            success: true,
            restaurante_id: parseInt(id),
            category: category || 'all',
            count: items.length,
            items
        };
        cache.set(cacheKey, response, MENU_TTL);
        res.json(response);

    } catch (error) {
        console.error('Error en getMenu:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── GET MENU ITEM ─────────────────────────────────────────
// GET /api/restaurants/:id/menu/:itemId
exports.getMenuItem = async (req, res) => {
    try {
        const { id, itemId } = req.params;

        if (isNaN(id) || isNaN(itemId)) {
            return res.status(400).json({
                success: false,
                message: 'ID inválido'
            });
        }

        const result = await db.query(
            `SELECT mi.id, mi.nombre, mi.precio, mi.categoria, mi.descripcion, mi.imagen_key,
                    mi.calorias, mi.peso,
                    COALESCE(vd.disponible, TRUE) AS disponible, mi.fecha_creacion
             FROM menu_items mi
             LEFT JOIN vista_disponibilidad_platos vd
                ON vd.menu_item_id = mi.id AND vd.restaurante_id = mi.restaurante_id
             WHERE mi.id = $1 AND mi.restaurante_id = $2`,
            [itemId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ítem del menú no encontrado'
            });
        }

        // Traer ingredientes con detalle
        const ingResult = await db.query(
            `SELECT i.nombre, mii.es_removible,
                    COALESCE(si.cantidad, 0) <= 0 AS sin_stock
             FROM menu_item_ingredientes mii
             JOIN ingredientes i ON i.id = mii.ingrediente_id
             LEFT JOIN stock_ingredientes si
                ON si.ingrediente_id = mii.ingrediente_id
               AND si.restaurante_id = $2
             WHERE mii.menu_item_id = $1
             ORDER BY i.nombre ASC`,
            [itemId, id]
        );

        const item = {
            ...result.rows[0],
            ingredientes: ingResult.rows.map(i => i.nombre),
            ingredientes_detalle: ingResult.rows
        };

        res.json({
            success: true,
            item
        });

    } catch (error) {
        console.error('Error en getMenuItem:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── GET RULETA (público) ──────────────────────────────────
// GET /api/restaurants/:id/ruleta
exports.getRuleta = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de restaurante inválido'
            });
        }

        const restResult = await db.query(
            'SELECT ruleta_activa FROM restaurantes WHERE id = $1',
            [id]
        );

        if (restResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado'
            });
        }

        const premiosResult = await db.query(
            'SELECT posicion, label, icon FROM ruleta_premios WHERE restaurante_id = $1',
            [id]
        );

        const premiosPorPosicion = {};
        for (const row of premiosResult.rows) {
            premiosPorPosicion[row.posicion] = { posicion: row.posicion, label: row.label, icon: row.icon };
        }

        const premios = [];
        for (let i = 0; i < 8; i++) {
            premios.push(premiosPorPosicion[i] || { posicion: i, label: null, icon: null });
        }

        res.json({
            success: true,
            activa: restResult.rows[0].ruleta_activa,
            premios
        });

    } catch (error) {
        console.error('Error en getRuleta:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// ── GIRAR RULETA (público, el servidor decide el ganador) ────
// POST /api/restaurants/:id/ruleta/girar
const CODIGO_ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I, evita ambiguedad visual

function generarCodigoCupon() {
    const bytes = crypto.randomBytes(8);
    let codigo = '';
    for (let i = 0; i < 8; i++) {
        codigo += CODIGO_ALFABETO[bytes[i] % CODIGO_ALFABETO.length];
    }
    return codigo;
}

exports.girarRuleta = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de restaurante inválido'
            });
        }

        const restResult = await db.query(
            'SELECT ruleta_activa FROM restaurantes WHERE id = $1',
            [id]
        );

        if (restResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado'
            });
        }

        if (!restResult.rows[0].ruleta_activa) {
            return res.status(400).json({
                success: false,
                message: 'La ruleta no está activa para este restaurante'
            });
        }

        const premiosResult = await db.query(
            'SELECT posicion, label, icon, tipo, valor FROM ruleta_premios WHERE restaurante_id = $1',
            [id]
        );

        const premiosPorPosicion = {};
        for (const row of premiosResult.rows) {
            premiosPorPosicion[row.posicion] = row;
        }

        const posicionGanadora = Math.floor(Math.random() * 8);
        const premioRaw = premiosPorPosicion[posicionGanadora] || null;

        if (!premioRaw || !premioRaw.label) {
            return res.json({
                success: true,
                posicionGanadora,
                premio: null,
                codigo: null
            });
        }

        if (!premioRaw.tipo) {
            return res.json({
                success: true,
                posicionGanadora,
                premio: { label: premioRaw.label, icon: premioRaw.icon, tipo: null },
                codigo: null
            });
        }

        let codigo;
        let intentos = 0;
        while (true) {
            codigo = generarCodigoCupon();
            const existe = await db.query('SELECT id FROM ruleta_cupones WHERE codigo = $1', [codigo]);
            if (existe.rows.length === 0) break;
            intentos++;
            if (intentos > 10) {
                throw new Error('No se pudo generar un código de cupón único');
            }
        }

        await db.query(
            `INSERT INTO ruleta_cupones (codigo, restaurante_id, tipo, valor)
             VALUES ($1, $2, $3, $4)`,
            [codigo, id, premioRaw.tipo, premioRaw.valor]
        );

        res.json({
            success: true,
            posicionGanadora,
            premio: { label: premioRaw.label, icon: premioRaw.icon, tipo: premioRaw.tipo },
            codigo
        });

    } catch (error) {
        console.error('Error en girarRuleta:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
