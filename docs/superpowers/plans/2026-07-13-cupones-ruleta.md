# Sistema de cupones reales de la ruleta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al ganar un gajo con tipo real en la ruleta, el cliente recibe un código de cupón copiable, canjeable una sola vez en total (compartible), que se valida y aplica de verdad en el carrito según condiciones de contenido (categoría/cantidad de ítems), y el envío pasa a ser un costo real conocido por el backend.

**Architecture:** El servidor decide el gajo ganador (nunca el cliente) en un endpoint nuevo `POST /api/restaurants/:id/ruleta/girar`, que genera y persiste el código en una tabla nueva `ruleta_cupones` cuando el premio tiene `tipo`. `cuponesController.js` se extiende para buscar en esa tabla además de la vieja `cupones`, validando condiciones de carrito. `ordersController.js` repite esa validación server-side al confirmar el pedido y marca el cupón usado dentro de la misma transacción, con un `WHERE usado = FALSE` que previene doble canje concurrente.

**Tech Stack:** PostgreSQL (Supabase), Node.js/Express (`pg`, `crypto` built-in), React Native/Expo (JavaScript), `expo-clipboard` (dependencia nueva).

## Global Constraints

- `SHIPPING_FEE = 2.99` es una constante fija en el backend — no hay envío variable en este ciclo.
- `ruleta_cupones` es una tabla nueva, separada de `cupones` — no se toca el sistema de cupones existente (`AdminCuponesScreen`, QR de kiosco, etc.).
- Un gajo con `tipo = NULL` sigue comportándose exactamente como antes (solo visual, sin cupón) — no rompe la config ya cargada en Trevi/Viandas Saludables.
- El servidor es la única fuente de verdad para: qué gajo gana, si una condición de carrito se cumple, y cuánto se descuenta — el frontend nunca decide estos montos, solo los muestra.
- Sin test runner automatizado — verificación manual (curl + Expo Go), como en los planes anteriores de esta sesión.
- Antes de cada tarea de frontend, verificar compilación con Babel usando la config real del proyecto (mismo comando usado en tareas anteriores de esta sesión).

---

### Task 1: Migración SQL

**Files:**
- Create: `database/migrations/014_ruleta_cupones.sql`
- Create: `database/apply_migration_014.js`

**Interfaces:**
- Produces: `ruleta_premios.tipo` (nullable, `CHECK IN ('porcentaje','envio_gratis','plato_gratis','postre_gratis','2x1_bebidas','2x1_pizzas')`), `ruleta_premios.valor` (numeric), tabla `ruleta_cupones(id, codigo UNIQUE, restaurante_id, tipo, valor, usado, pedido_id_uso, fecha_creacion)`.

- [ ] **Step 1: Escribir la migración**

`database/migrations/014_ruleta_cupones.sql`:

```sql
-- ============================================================
-- MIGRACIÓN 014: cupones reales generados por la ruleta de premios
-- Ejecutar con: node database/apply_migration_014.js
-- ============================================================

ALTER TABLE ruleta_premios
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(20)
        CHECK (tipo IS NULL OR tipo IN ('porcentaje', 'envio_gratis', 'plato_gratis', 'postre_gratis', '2x1_bebidas', '2x1_pizzas')),
    ADD COLUMN IF NOT EXISTS valor NUMERIC;

CREATE TABLE IF NOT EXISTS ruleta_cupones (
    id              BIGSERIAL       PRIMARY KEY,
    codigo          VARCHAR(12)     NOT NULL UNIQUE,
    restaurante_id  BIGINT          NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    tipo            VARCHAR(20)     NOT NULL CHECK (tipo IN ('porcentaje', 'envio_gratis', 'plato_gratis', 'postre_gratis', '2x1_bebidas', '2x1_pizzas')),
    valor           NUMERIC,
    usado           BOOLEAN         NOT NULL DEFAULT FALSE,
    pedido_id_uso   BIGINT          REFERENCES pedidos(id),
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ruleta_cupones_codigo ON ruleta_cupones (codigo);
```

- [ ] **Step 2: Escribir el script que aplica la migración**

`database/apply_migration_014.js` (mismo patrón que `database/apply_migration_013.js`):

```js
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
        path.join(__dirname, 'migrations', '014_ruleta_cupones.sql'),
        'utf8'
    );
    const client = await pool.connect();
    try {
        console.log('Aplicando migración 014...');
        await client.query(sql);
        console.log('Migración 014 aplicada correctamente.');
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error('Error aplicando migración 014:', err.message);
    process.exit(1);
});
```

- [ ] **Step 3: Ejecutar y verificar**

Run: `node database/apply_migration_014.js`
Expected: `Migración 014 aplicada correctamente.`

Verificar con una query rápida (script throwaway con el mismo patrón de Pool, no commitear):

```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'ruleta_premios' AND column_name IN ('tipo', 'valor');
SELECT table_name FROM information_schema.tables WHERE table_name = 'ruleta_cupones';
```

Expected: la primera query devuelve 2 filas, la segunda 1 fila.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/014_ruleta_cupones.sql database/apply_migration_014.js
git commit -m "feat(db): tipo/valor en ruleta_premios y tabla ruleta_cupones"
```

---

### Task 2: Backend — endpoint de giro server-side + generación de cupón

**Files:**
- Modify: `backend/src/controllers/restaurantsController.js` (agregar `exports.girarRuleta`)
- Modify: `backend/src/routers/restaurants.js` (agregar la ruta POST)

**Interfaces:**
- Consumes: tabla `ruleta_premios` (ya existente, Task 1 le suma `tipo`/`valor`).
- Produces: `POST /api/restaurants/:id/ruleta/girar` → `{ success, posicionGanadora, premio: {label, icon, tipo} | null, codigo: string | null }`. Este `posicionGanadora` es lo que Task 5 usará para animar la ruleta.

- [ ] **Step 1: Agregar el generador de código y el endpoint**

Al final de `backend/src/controllers/restaurantsController.js`, agregar (necesita `crypto`, ya usado en `authController.js` con el mismo patrón `require('crypto')` — agregar el import al inicio del archivo si no está):

```js
const crypto = require('crypto');
```

(agregar esta línea junto a los otros `require` al principio del archivo, si `crypto` no está ya importado)

Y al final del archivo:

```js

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
```

- [ ] **Step 2: Registrar la ruta**

En `backend/src/routers/restaurants.js`, agregar después de `router.get('/:id/ruleta', restaurantsController.getRuleta);`:

```js
router.post('/:id/ruleta/girar',      restaurantsController.girarRuleta);
```

- [ ] **Step 3: Verificar con curl**

```bash
cd backend && npm start
```

En otra terminal (usando el restaurante Viandas Saludables, id=1, que ya tiene la ruleta activa con premios de la sesión anterior — pero esos premios todavía no tienen `tipo`, así que primero cargale uno con tipo vía SQL directo, o esperá a la Tarea 4 para hacerlo desde el admin; para probar el endpoint ahora alcanza con que devuelva `codigo: null` si ningún premio tiene tipo):

```bash
for i in 1 2 3 4 5; do curl -s -X POST "http://localhost:3000/api/restaurants/1/ruleta/girar"; echo; done
```

Expected: 5 respuestas, cada una con un `posicionGanadora` entre 0 y 7, y `premio`/`codigo` según lo que haya cargado en `ruleta_premios` para ese restaurante (si ningún premio tiene `tipo` todavía, `codigo` siempre `null` — es el comportamiento correcto hasta la Tarea 4).

También probá contra un restaurante con `ruleta_activa = false` (o inexistente) y confirmá el `400`/`404` correspondiente.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/restaurantsController.js backend/src/routers/restaurants.js
git commit -m "feat(backend): endpoint de giro server-side con generacion de cupon"
```

---

### Task 3: Backend — validación/aplicación real del cupón en carrito y pedido

**Files:**
- Modify: `backend/src/controllers/cuponesController.js` (extender `validateByCode`)
- Modify: `backend/src/controllers/ordersController.js` (constante de envío + validación/marcado de `ruleta_cupones`)

**Interfaces:**
- Consumes: tabla `ruleta_cupones` (Task 1), `menu_items.categoria`/`precio` (ya existentes).
- Produces: `POST /api/cupones/validate` acepta ahora `{ codigo, restaurante_id, items }` y devuelve `{ success, cupon: { tipo, valor, monto_descuento, esRuleta } }` cuando el código es de `ruleta_cupones`. `createOrder` aplica el mismo descuento real y marca `usado=true` atómicamente.

- [ ] **Step 1: Helper de cálculo de condición/descuento compartido**

Crear `backend/src/utils/ruletaCuponHelper.js` (nuevo archivo — esta lógica la necesitan tanto `cuponesController.js` como `ordersController.js`, y debe ser idéntica en ambos lugares):

```js
const CATEGORIAS_POR_TIPO = {
    plato_gratis:  ['milanesas', 'platos', 'pastas'],
    postre_gratis: ['dulces', 'helados'],
    '2x1_bebidas': ['bebidas'],
    '2x1_pizzas':  ['pizzas'],
};

const SHIPPING_FEE = 2.99;

// items: [{ menu_item_id, cantidad }]
// menuItemsInfo: Map<string, { precio, categoria }> — las claves DEBEN ser String(id),
// tanto al construir el Map como al buscar acá adentro, porque Postgres devuelve las
// columnas BIGINT como string en node-pg y el JSON del cliente puede mandar el id como
// number — comparar sin normalizar hace que Map.get() falle silenciosamente.
// Devuelve { valido, mensaje, montoDescuento }
function evaluarCupon(tipo, valorPremio, subtotal, items, menuItemsInfo) {
    if (tipo === 'porcentaje') {
        const base = subtotal + SHIPPING_FEE;
        return { valido: true, montoDescuento: parseFloat((base * (valorPremio / 100)).toFixed(2)) };
    }

    if (tipo === 'envio_gratis') {
        return { valido: true, montoDescuento: SHIPPING_FEE };
    }

    if (tipo === 'plato_gratis' || tipo === 'postre_gratis') {
        const categorias = CATEGORIAS_POR_TIPO[tipo];
        let masBarato = null;
        for (const item of items) {
            const info = menuItemsInfo.get(String(item.menu_item_id));
            if (info && categorias.includes(info.categoria)) {
                if (!masBarato || info.precio < masBarato) masBarato = info.precio;
            }
        }
        if (masBarato === null) {
            const nombre = tipo === 'plato_gratis' ? 'plato' : 'postre';
            return { valido: false, mensaje: `Este cupón requiere un ${nombre} en tu pedido` };
        }
        return { valido: true, montoDescuento: masBarato };
    }

    if (tipo === '2x1_bebidas' || tipo === '2x1_pizzas') {
        const categorias = CATEGORIAS_POR_TIPO[tipo];
        const precios = [];
        for (const item of items) {
            const info = menuItemsInfo.get(String(item.menu_item_id));
            if (info && categorias.includes(info.categoria)) {
                for (let i = 0; i < item.cantidad; i++) precios.push(info.precio);
            }
        }
        if (precios.length < 2) {
            const nombre = tipo === '2x1_bebidas' ? 'bebidas' : 'pizzas';
            return { valido: false, mensaje: `Este cupón requiere 2 o más ${nombre} en tu pedido` };
        }
        precios.sort((a, b) => a - b);
        return { valido: true, montoDescuento: precios[0] };
    }

    return { valido: false, mensaje: 'Tipo de cupón desconocido' };
}

module.exports = { evaluarCupon, SHIPPING_FEE, CATEGORIAS_POR_TIPO };
```

- [ ] **Step 2: Extender `cuponesController.js`**

Agregar `const db = require('../config/database');` ya está presente; agregar el import del helper al inicio del archivo:

```js
const { evaluarCupon } = require('../utils/ruletaCuponHelper');
```

Reemplazar `exports.validateByCode` completo (desde `// ── VALIDATE BY CODE` hasta el cierre de esa función) por:

```js
// ── VALIDATE BY CODE ──────────────────────────────────────
// POST /api/cupones/validate
// Body: { codigo, restaurante_id, items }
exports.validateByCode = async (req, res) => {
    try {
        const { codigo, restaurante_id, items } = req.body;

        if (!codigo || typeof codigo !== 'string' || codigo.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Código requerido' });
        }

        // 1. Buscar primero en cupones (comportamiento original, sin cambios)
        const cuponViejo = await db.query(
            `SELECT id, titulo, oferta, codigo
             FROM cupones
             WHERE UPPER(codigo) = UPPER($1)
               AND activo = TRUE
               AND valido_hasta >= CURRENT_DATE`,
            [codigo.trim()]
        );

        if (cuponViejo.rows.length > 0) {
            const cupon = cuponViejo.rows[0];
            const match = cupon.oferta?.match(/(\d+)/);
            const discount_percent = match ? parseInt(match[1]) : 10;
            return res.json({
                success: true,
                cupon: { id: cupon.id, titulo: cupon.titulo, oferta: cupon.oferta, discount_percent },
            });
        }

        // 2. Buscar en ruleta_cupones
        const cuponRuleta = await db.query(
            `SELECT id, tipo, valor, restaurante_id
             FROM ruleta_cupones
             WHERE UPPER(codigo) = UPPER($1) AND usado = FALSE`,
            [codigo.trim()]
        );

        if (cuponRuleta.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cupón inválido, vencido o ya usado' });
        }

        const cupon = cuponRuleta.rows[0];

        if (!restaurante_id || parseInt(restaurante_id) !== cupon.restaurante_id) {
            return res.status(404).json({ success: false, message: 'Cupón inválido para este restaurante' });
        }

        const cartItems = Array.isArray(items) ? items : [];
        const itemIds = cartItems.map(i => i.menu_item_id);
        let menuItemsInfo = new Map();
        let subtotal = 0;

        if (itemIds.length > 0) {
            const menuResult = await db.query(
                'SELECT id, precio, categoria FROM menu_items WHERE id = ANY($1) AND restaurante_id = $2',
                [itemIds, restaurante_id]
            );
            for (const row of menuResult.rows) {
                menuItemsInfo.set(String(row.id), { precio: parseFloat(row.precio), categoria: row.categoria });
            }
            for (const item of cartItems) {
                const info = menuItemsInfo.get(item.menu_item_id);
                if (info) subtotal += info.precio * item.cantidad;
            }
        }

        const evaluacion = evaluarCupon(cupon.tipo, parseFloat(cupon.valor) || 0, subtotal, cartItems, menuItemsInfo);

        if (!evaluacion.valido) {
            return res.status(400).json({ success: false, message: evaluacion.mensaje });
        }

        res.json({
            success: true,
            cupon: {
                tipo: cupon.tipo,
                valor: cupon.valor,
                monto_descuento: evaluacion.montoDescuento,
                esRuleta: true,
            },
        });

    } catch (error) {
        console.error('Error en validateByCode cupon:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
```

- [ ] **Step 3: Verificar con curl**

Con el backend corriendo, primero cargá un premio con tipo vía SQL directo (throwaway script, mismo patrón de Pool usado antes en la sesión):

```sql
UPDATE ruleta_premios SET tipo = 'porcentaje', valor = 15, label = '15% OFF' WHERE restaurante_id = 1 AND posicion = 3;
```

Después girá hasta sacar ese código (repetí el curl del Step 3 de la Tarea 2 hasta que `posicionGanadora` sea 3, o consultá directo `SELECT codigo FROM ruleta_cupones WHERE restaurante_id=1 ORDER BY fecha_creacion DESC LIMIT 1` después de un giro que haya dado ese premio), y probá:

```bash
curl -s -X POST http://localhost:3000/api/cupones/validate \
  -H "Content-Type: application/json" \
  -d '{"codigo":"EL_CODIGO_QUE_SALIO","restaurante_id":1,"items":[{"menu_item_id":101,"cantidad":1}]}'
```

Expected: `success:true`, `cupon.tipo:"porcentaje"`, `monto_descuento` calculado. Probá también con un código inventado (`success:false`, 404) y con el mismo código dos veces seguidas después de marcarlo usado manualmente (`UPDATE ruleta_cupones SET usado=true WHERE codigo=...`) para confirmar el rechazo.

- [ ] **Step 4: Integrar en `createOrder`**

En `backend/src/controllers/ordersController.js`, agregar el import del helper al inicio:

```js
const { evaluarCupon, SHIPPING_FEE } = require('../utils/ruletaCuponHelper');
```

Reemplazar el bloque `// 5. Aplicar cupón si viene (validación server-side)` completo:

```js
        // 5. Aplicar cupón si viene (validación server-side)
        let descuento = 0;
        if (cupon_codigo?.trim()) {
            const cuponResult = await client.query(
                `SELECT discount_percent FROM cupones
                 WHERE UPPER(codigo) = UPPER($1) AND activo = TRUE AND valido_hasta >= CURRENT_DATE`,
                [cupon_codigo.trim()]
            );
            if (cuponResult.rows[0]) {
                const pct = cuponResult.rows[0].discount_percent;
                descuento  = parseFloat((total * pct / 100).toFixed(2));
                total      = parseFloat((total - descuento).toFixed(2));
            }
        }
```

por:

```js
        // 5. Agregar costo de envío al total antes de aplicar descuentos
        total = parseFloat((total + SHIPPING_FEE).toFixed(2));

        // 6. Aplicar cupón si viene (validación server-side)
        let descuento = 0;
        let ruletaCuponId = null;
        if (cupon_codigo?.trim()) {
            const cuponViejo = await client.query(
                `SELECT discount_percent FROM cupones
                 WHERE UPPER(codigo) = UPPER($1) AND activo = TRUE AND valido_hasta >= CURRENT_DATE`,
                [cupon_codigo.trim()]
            );
            if (cuponViejo.rows[0]) {
                const pct = cuponViejo.rows[0].discount_percent;
                descuento = parseFloat((total * pct / 100).toFixed(2));
                total     = parseFloat((total - descuento).toFixed(2));
            } else {
                const cuponRuleta = await client.query(
                    `SELECT id, tipo, valor FROM ruleta_cupones
                     WHERE UPPER(codigo) = UPPER($1) AND restaurante_id = $2 AND usado = FALSE`,
                    [cupon_codigo.trim(), restaurante_id]
                );
                if (cuponRuleta.rows[0]) {
                    const cupon = cuponRuleta.rows[0];
                    const subtotalSinEnvio = parseFloat((total - SHIPPING_FEE).toFixed(2));
                    const menuItemsInfo = new Map();
                    for (const [menuId, m] of Object.entries(priceMap)) {
                        menuItemsInfo.set(String(menuId), { precio: parseFloat(m.precio), categoria: m.categoria });
                    }
                    const cartItemsParaEval = items.map(i => ({ menu_item_id: i.menu_item_id, cantidad: i.cantidad }));
                    const evaluacion = evaluarCupon(cupon.tipo, parseFloat(cupon.valor) || 0, subtotalSinEnvio, cartItemsParaEval, menuItemsInfo);
                    if (evaluacion.valido) {
                        descuento = evaluacion.montoDescuento;
                        total     = parseFloat((total - descuento).toFixed(2));
                        ruletaCuponId = cupon.id;
                    }
                }
            }
        }
```

Nota: `priceMap` (armado en el paso 4 de `createOrder`, ya existente) solo tiene `id, nombre, precio, disponible` — no incluye `categoria`. Ubicar el `SELECT` del paso 3 de `createOrder`:

```js
        const menuResult = await client.query(
            `SELECT id, nombre, precio, disponible
             FROM menu_items
             WHERE id = ANY($1) AND restaurante_id = $2`,
            [menuItemIds, restaurante_id]
        );
```

y agregarle `categoria`:

```js
        const menuResult = await client.query(
            `SELECT id, nombre, precio, categoria, disponible
             FROM menu_items
             WHERE id = ANY($1) AND restaurante_id = $2`,
            [menuItemIds, restaurante_id]
        );
```

- [ ] **Step 5: Marcar el cupón usado dentro de la transacción**

Ubicar, dentro de `createOrder`, justo después del bloque `await client.query('COMMIT');` — en realidad el marcado debe ir **antes** del commit, no después. Ubicar:

```js
        // 7. Insertar los ítems del pedido y descontar stock
        for (const item of orderItems) {
            await client.query(
                `INSERT INTO pedido_items (pedido_id, menu_item_id, nombre_item, precio_unitario, cantidad, ingredientes_removidos)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [pedido.id, item.menu_item_id, item.nombre_item, item.precio_unitario, item.cantidad, item.ingredientes_removidos]
            );

            // Descontar stock de ingredientes
            await client.query(
                'SELECT descontar_stock($1, $2, $3)',
                [restaurante_id, item.menu_item_id, item.cantidad]
            );
        }

        await client.query('COMMIT');
```

y reemplazar por:

```js
        // 7. Insertar los ítems del pedido y descontar stock
        for (const item of orderItems) {
            await client.query(
                `INSERT INTO pedido_items (pedido_id, menu_item_id, nombre_item, precio_unitario, cantidad, ingredientes_removidos)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [pedido.id, item.menu_item_id, item.nombre_item, item.precio_unitario, item.cantidad, item.ingredientes_removidos]
            );

            // Descontar stock de ingredientes
            await client.query(
                'SELECT descontar_stock($1, $2, $3)',
                [restaurante_id, item.menu_item_id, item.cantidad]
            );
        }

        // 8. Marcar el cupón de ruleta como usado — el WHERE usado = FALSE
        // previene que dos pedidos concurrentes usen el mismo código.
        if (ruletaCuponId) {
            const marcado = await client.query(
                'UPDATE ruleta_cupones SET usado = TRUE, pedido_id_uso = $1 WHERE id = $2 AND usado = FALSE',
                [pedido.id, ruletaCuponId]
            );
            if (marcado.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    success: false,
                    message: 'Este cupón ya fue usado por otro pedido'
                });
            }
        }

        await client.query('COMMIT');
```

- [ ] **Step 6: Verificar con curl**

Con el backend corriendo, generá un código válido de tipo `porcentaje` (Step 3 de esta tarea) y creá un pedido real vía `POST /api/orders` (necesita un token de usuario logueado — usá login de un cliente existente o registrá uno) incluyendo `cupon_codigo`. Confirmá:
- El pedido se crea con `total`/`descuento` reflejando el cálculo correcto (incluyendo el envío en la base).
- `SELECT usado, pedido_id_uso FROM ruleta_cupones WHERE codigo = '...'` muestra `usado=true` y el `pedido_id_uso` correcto.
- Repetir el mismo `POST /api/orders` con el mismo `cupon_codigo` — debe fallar (el cupón ya no es válido porque `validateByCode`/la re-verificación en `createOrder` no lo van a encontrar como `usado=FALSE`).

- [ ] **Step 7: Commit**

```bash
git add backend/src/utils/ruletaCuponHelper.js backend/src/controllers/cuponesController.js backend/src/controllers/ordersController.js
git commit -m "feat(backend): validacion y aplicacion real de cupones de ruleta en carrito y pedido"
```

---

### Task 4: Frontend — selector de tipo en el admin

**Files:**
- Modify: `frontend/screens/admin/AdminRuletaScreen.js`

**Interfaces:**
- Consumes: `API.admin.ruleta.getInfo`/`updateInfo` (ya existentes, Task 3 de la sesión anterior) — el body de `updateInfo` ahora también manda `tipo`/`valor` por slot; el backend de esta tarea (Task 1-3 de este plan) ya sabe leer/guardar esos campos porque `adminRuletaController.js` hace `INSERT ... ON CONFLICT DO UPDATE` genérico — **importante**: ese `INSERT`/`UPDATE` en `backend/src/controllers/adminRuletaController.js` todavía no incluye las columnas `tipo`/`valor`, hay que sumarlas ahí también como parte de esta tarea (ver Step 1).

- [ ] **Step 1: Sumar `tipo`/`valor` al backend de admin (ya existente)**

En `backend/src/controllers/adminRuletaController.js`, ubicar dentro de `updateInfo`:

```js
        for (const p of premios) {
            await client.query(
                `INSERT INTO ruleta_premios (restaurante_id, posicion, label, icon)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (restaurante_id, posicion)
                 DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon`,
                [restauranteId, p.posicion, p.label || null, p.icon || null]
            );
        }
```

y reemplazar por:

```js
        for (const p of premios) {
            await client.query(
                `INSERT INTO ruleta_premios (restaurante_id, posicion, label, icon, tipo, valor)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (restaurante_id, posicion)
                 DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon, tipo = EXCLUDED.tipo, valor = EXCLUDED.valor`,
                [restauranteId, p.posicion, p.label || null, p.icon || null, p.tipo || null, p.valor || null]
            );
        }
```

También ubicar, en `getInfo` y en el re-fetch final de `updateInfo`, las dos ocurrencias de:

```js
            premiosPorPosicion[row.posicion] = { posicion: row.posicion, label: row.label, icon: row.icon };
```

y en ambas agregar `tipo`/`valor`:

```js
            premiosPorPosicion[row.posicion] = { posicion: row.posicion, label: row.label, icon: row.icon, tipo: row.tipo, valor: row.valor };
```

y las dos queries `SELECT posicion, label, icon FROM ruleta_premios ...` (una en `getInfo`, otra en el re-fetch de `updateInfo`) pasan a:

```js
            'SELECT posicion, label, icon, tipo, valor FROM ruleta_premios WHERE restaurante_id = $1',
```

Y las dos ocurrencias del fallback `{ posicion: i, label: null, icon: null }` (relleno de slots sin fila) pasan a `{ posicion: i, label: null, icon: null, tipo: null, valor: null }`.

- [ ] **Step 2: Sumar el selector de tipo en `AdminRuletaScreen.js`**

Agregar la lista de tipos después de `ICONOS_DISPONIBLES`:

```js
const TIPOS_PREMIO = [
    { value: null,            label: 'Solo visual' },
    { value: 'porcentaje',    label: '% de descuento' },
    { value: 'envio_gratis',  label: 'Envío gratis' },
    { value: 'plato_gratis',  label: 'Plato gratis' },
    { value: 'postre_gratis', label: 'Postre gratis' },
    { value: '2x1_bebidas',   label: '2x1 bebidas' },
    { value: '2x1_pizzas',    label: '2x1 pizzas' },
];
```

Ubicar `emptySlots`:

```js
const emptySlots = () => Array.from({ length: 8 }, (_, i) => ({ posicion: i, label: '', icon: null }));
```

y reemplazar por:

```js
const emptySlots = () => Array.from({ length: 8 }, (_, i) => ({ posicion: i, label: '', icon: null, tipo: null, valor: '' }));
```

Ubicar `load` (dentro del `.map` que arma `premios` desde la respuesta):

```js
                setPremios(res.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null })));
```

y reemplazar por:

```js
                setPremios(res.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null, tipo: p.tipo || null, valor: p.valor != null ? String(p.valor) : '' })));
```

Ubicar `clearSlot`:

```js
    const clearSlot = (posicion) => {
        updateSlot(posicion, { label: '', icon: null });
    };
```

y reemplazar por:

```js
    const clearSlot = (posicion) => {
        updateSlot(posicion, { label: '', icon: null, tipo: null, valor: '' });
    };
```

Ubicar `handleGuardar` (el `.map` dentro del `body` de `updateInfo`):

```js
                premios: premios.map(p => ({
                    posicion: p.posicion,
                    label: p.label.trim() || null,
                    icon: p.label.trim() ? p.icon : null,
                })),
```

y reemplazar por:

```js
                premios: premios.map(p => ({
                    posicion: p.posicion,
                    label: p.label.trim() || null,
                    icon: p.label.trim() ? p.icon : null,
                    tipo: p.label.trim() ? p.tipo : null,
                    valor: p.tipo === 'porcentaje' ? (parseFloat(p.valor) || 0) : null,
                })),
```

y en el `.then` de éxito (el `.map` que re-popula `premios` desde `res.data.premios`):

```js
                setPremios(res.data.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null })));
```

por:

```js
                setPremios(res.data.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null, tipo: p.tipo || null, valor: p.valor != null ? String(p.valor) : '' })));
```

Ubicar el JSX del `iconGrid` dentro del `.map` de `premios`, y agregar el selector de tipo justo después (antes del `TouchableOpacity` de "Vaciar"):

```jsx
                        <View style={styles.iconGrid}>
                            {ICONOS_DISPONIBLES.map((icon) => (
                                <TouchableOpacity
                                    key={icon}
                                    style={[styles.iconOption, premio.icon === icon && styles.iconOptionSelected]}
                                    onPress={() => updateSlot(premio.posicion, { icon })}
                                >
                                    <Ionicons name={icon} size={20} color={premio.icon === icon ? '#fff' : '#666'} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.clearBtn} onPress={() => clearSlot(premio.posicion)}>
                            <Text style={styles.clearBtnText}>Vaciar</Text>
                        </TouchableOpacity>
```

por:

```jsx
                        <View style={styles.iconGrid}>
                            {ICONOS_DISPONIBLES.map((icon) => (
                                <TouchableOpacity
                                    key={icon}
                                    style={[styles.iconOption, premio.icon === icon && styles.iconOptionSelected]}
                                    onPress={() => updateSlot(premio.posicion, { icon })}
                                >
                                    <Ionicons name={icon} size={20} color={premio.icon === icon ? '#fff' : '#666'} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.tipoLabel}>Tipo de premio</Text>
                        <View style={styles.tipoGrid}>
                            {TIPOS_PREMIO.map((t) => (
                                <TouchableOpacity
                                    key={t.label}
                                    style={[styles.tipoChip, premio.tipo === t.value && styles.tipoChipSelected]}
                                    onPress={() => updateSlot(premio.posicion, { tipo: t.value })}
                                >
                                    <Text style={[styles.tipoChipText, premio.tipo === t.value && styles.tipoChipTextSelected]}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {premio.tipo === 'porcentaje' && (
                            <TextInput
                                style={styles.input}
                                placeholder="Porcentaje (ej. 15)"
                                value={premio.valor}
                                onChangeText={(text) => updateSlot(premio.posicion, { valor: text.replace(/[^0-9]/g, '') })}
                                keyboardType="numeric"
                                maxLength={3}
                            />
                        )}
                        <TouchableOpacity style={styles.clearBtn} onPress={() => clearSlot(premio.posicion)}>
                            <Text style={styles.clearBtnText}>Vaciar</Text>
                        </TouchableOpacity>
```

Agregar los estilos nuevos, después de `iconOptionSelected`:

```js
    tipoLabel: { fontSize: 12, color: '#888', marginBottom: 6, fontWeight: '600' },
    tipoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    tipoChip: {
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
        backgroundColor: '#F0F0F0',
    },
    tipoChipSelected: { backgroundColor: '#FF8700' },
    tipoChipText: { fontSize: 12, color: '#666', fontWeight: '600' },
    tipoChipTextSelected: { color: '#fff' },
```

- [ ] **Step 3: Verificar compilación**

```bash
cd frontend && node -e "
const babel = require('@babel/core');
const fs = require('fs');
const code = fs.readFileSync('screens/admin/AdminRuletaScreen.js', 'utf8');
babel.transform(code, { filename: 'screens/admin/AdminRuletaScreen.js', presets: ['babel-preset-expo'] });
console.log('OK');
"
```

- [ ] **Step 4: Verificación manual en Expo Go**

1. Entrar a la pantalla de admin de la ruleta, elegir tipo "% de descuento" en un gajo, escribir "20" en el campo que aparece, guardar.
2. Volver a entrar a la pantalla — el tipo y el valor deben recargarse tal cual quedaron.
3. Elegir "Solo visual" en ese mismo gajo, guardar — el campo de porcentaje debe desaparecer y el `valor` guardarse como `null` (confirmable con una query directa si hace falta).

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/adminRuletaController.js frontend/screens/admin/AdminRuletaScreen.js
git commit -m "feat(admin): selector de tipo y valor por premio de la ruleta"
```

---

### Task 5: Frontend — SpinWheel gira contra el servidor y muestra código copiable; carrito usa el descuento real

**Files:**
- Modify: `frontend/components/rewards/SpinWheel.js`
- Modify: `frontend/services/api.js`
- Modify: `frontend/screens/cart/CartScreen.js`
- Run: `npx expo install expo-clipboard` (dependencia nueva) desde `frontend/`

**Interfaces:**
- Consumes: `POST /api/restaurants/:id/ruleta/girar` (Task 2), `POST /api/cupones/validate` con `restaurante_id`/`items` (Task 3).
- Produces: nada consumido por otras tareas — es la última.

- [ ] **Step 1: Instalar `expo-clipboard`**

```bash
cd frontend && npx expo install expo-clipboard
```

Expected: se agrega `expo-clipboard` a `frontend/package.json`.

- [ ] **Step 2: Agregar los métodos a `api.js`**

En `frontend/services/api.js`, dentro del objeto `restaurants` (después de `getRuleta`), agregar:

```js
    girarRuleta: (id) => request(`/api/restaurants/${id}/ruleta/girar`, { method: 'POST' }),
```

Modificar `cupones.validate` para que acepte los nuevos parámetros:

```js
    validate: (codigo) => request('/api/cupones/validate', {
        method: 'POST',
        body: JSON.stringify({ codigo }),
    }),
```

por:

```js
    validate: (codigo, restauranteId, items) => request('/api/cupones/validate', {
        method: 'POST',
        body: JSON.stringify({ codigo, restaurante_id: restauranteId, items }),
    }),
```

- [ ] **Step 3: `SpinWheel.js` gira contra el servidor**

Agregar el import de clipboard y `restauranteId` como nueva prop, y `API`:

```js
import * as Clipboard from 'expo-clipboard';
import API from '../../services/api';
```

Ubicar la firma del componente:

```js
export default function SpinWheel({
    premios = PREMIOS_DEFAULT,
    girosDisponibles = 3,
    onPremioGanado,
}) {
```

y reemplazar por:

```js
export default function SpinWheel({
    premios = PREMIOS_DEFAULT,
    girosDisponibles = 3,
    restauranteId,
    onPremioGanado,
}) {
```

Agregar estado para el código ganado, junto a los demás `useState`:

```js
    const [codigoGanado, setCodigoGanado] = useState(null);
    const [copiado, setCopiado] = useState(false);
```

Reemplazar `handleGirar` completo (la elección local del índice ganador pasa al servidor):

```js
    const handleGirar = () => {
        if (girandoRef.current) return;
        girandoRef.current = true;
        setGirando(true);
        setCodigoGanado(null);
        setCopiado(false);

        API.restaurants.girarRuleta(restauranteId)
            .then((res) => {
                if (!res.success) {
                    girandoRef.current = false;
                    setGirando(false);
                    return;
                }

                const finalTarget = targetRotationForIndex(res.posicionGanadora, rotation.value, 4);
                const winner = res.premio
                    ? { ...res.premio, posicion: res.posicionGanadora }
                    : { label: null, icon: null, posicion: res.posicionGanadora };
                const codigo = res.codigo;

                rotation.value = withSequence(
                    withTiming(finalTarget - 15, {
                        duration: 2800,
                        easing: Easing.out(Easing.cubic),
                    }),
                    withTiming(finalTarget + 10, { duration: 220, easing: Easing.linear }),
                    withTiming(finalTarget, { duration: 180, easing: Easing.out(Easing.quad) }, (finished) => {
                        if (finished) {
                            runOnJS(setCodigoGanado)(codigo);
                            runOnJS(mostrarResultado)(winner);
                        } else {
                            runOnJS(resetGirando)();
                        }
                    })
                );
            })
            .catch(() => {
                girandoRef.current = false;
                setGirando(false);
            });
    };
```

Nota: `winner` ya no necesariamente coincide índice-a-índice con `premios[res.posicionGanadora]` en términos de identidad de objeto (viene del servidor, no del array local) — pero como `esGajoVacio`/el modal solo miran `label`/`icon`, funciona igual. El `premios` array local sigue usándose para *dibujar* la ruleta (colores, posiciones) — el servidor solo decide *cuál* índice ganó.

Agregar el botón de copiar al modal de resultado. Ubicar:

```jsx
                        {premioGanado && !esGajoVacio(premioGanado) && (
                            <>
                                <Ionicons name={premioGanado.icon || 'gift-outline'} size={48} color="#FF8800" />
                                <Text style={styles.modalTitle}>¡Ganaste {premioGanado.label}!</Text>
                            </>
                        )}
```

y reemplazar por:

```jsx
                        {premioGanado && !esGajoVacio(premioGanado) && (
                            <>
                                <Ionicons name={premioGanado.icon || 'gift-outline'} size={48} color="#FF8800" />
                                <Text style={styles.modalTitle}>¡Ganaste {premioGanado.label}!</Text>
                                {codigoGanado && (
                                    <TouchableOpacity
                                        style={styles.codigoBox}
                                        onPress={async () => {
                                            await Clipboard.setStringAsync(codigoGanado);
                                            setCopiado(true);
                                        }}
                                    >
                                        <Text style={styles.codigoText}>{codigoGanado}</Text>
                                        <Ionicons name={copiado ? 'checkmark' : 'copy-outline'} size={18} color="#FF8800" />
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
```

Agregar los estilos nuevos, después de `modalTitle`:

```js
    codigoBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFF3E0', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20,
    },
    codigoText: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#1A1A2E', letterSpacing: 1 },
```

- [ ] **Step 4: Pasar `restauranteId` desde `ScreenHome.js`**

Ubicar en `frontend/screens/home/ScreenHome.js`:

```jsx
                    <SpinWheel premios={ruletaPremios} />
```

y reemplazar por:

```jsx
                    <SpinWheel premios={ruletaPremios} restauranteId={selectedRestaurant?.id} />
```

- [ ] **Step 5: Verificar compilación**

```bash
cd frontend && node -e "
const babel = require('@babel/core');
const fs = require('fs');
['components/rewards/SpinWheel.js','screens/home/ScreenHome.js'].forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  babel.transform(code, { filename: f, presets: ['babel-preset-expo'], plugins: ['react-native-reanimated/plugin'] });
  console.log('OK:', f);
});
"
```

- [ ] **Step 6: `CartScreen.js` usa el descuento real del backend**

Ubicar el estado de cupón (cerca de `couponDiscount`/`couponApplied` — buscar sus declaraciones `useState` para ubicar el bloque correcto) y agregar un estado para el monto ya calculado por el servidor:

```js
    const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
```

Reemplazar `calculateDiscount`:

```js
    const calculateDiscount = () => {
        return couponApplied ? calculateSubtotal() * (couponDiscount / 100) : 0;
    };
```

por:

```js
    const calculateDiscount = () => {
        return couponApplied ? couponDiscountAmount : 0;
    };
```

Reemplazar `handleApplyCoupon` completo:

```js
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setValidatingCoupon(true);
        try {
            const res = await API.cupones.validate(couponCode.trim());
            if (res.success) {
                setCouponDiscount(res.cupon.discount_percent);
                setCouponApplied(true);
                showSuccessMessage('Cupon aplicado', `${res.cupon.discount_percent}% de descuento en tu pedido`);
            } else {
                showErrorMessage('Cupon invalido', res.message || 'Verifica el codigo e intenta de nuevo');
            }
        } catch {
            showErrorMessage('Error', 'No se pudo validar el cupón. Revisá tu conexión.');
        } finally {
            setValidatingCoupon(false);
        }
    };
```

por:

```js
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setValidatingCoupon(true);
        try {
            const items = cartItems.map(item => ({ menu_item_id: item.id, cantidad: item.quantity }));
            const res = await API.cupones.validate(couponCode.trim(), selectedRestaurant?.id, items);
            if (res.success) {
                if (res.cupon.esRuleta) {
                    setCouponDiscountAmount(res.cupon.monto_descuento);
                    setCouponDiscount(0);
                } else {
                    setCouponDiscountAmount(calculateSubtotal() * (res.cupon.discount_percent / 100));
                    setCouponDiscount(res.cupon.discount_percent);
                }
                setCouponApplied(true);
                showSuccessMessage('Cupon aplicado', res.cupon.esRuleta ? `$${res.cupon.monto_descuento.toFixed(2)} de descuento en tu pedido` : `${res.cupon.discount_percent}% de descuento en tu pedido`);
            } else {
                showErrorMessage('Cupon invalido', res.message || 'Verifica el codigo e intenta de nuevo');
            }
        } catch {
            showErrorMessage('Error', 'No se pudo validar el cupón. Revisá tu conexión.');
        } finally {
            setValidatingCoupon(false);
        }
    };
```

(`couponDiscount`, el porcentaje viejo, se sigue usando solo para el texto `Descuento ({couponDiscount}%)` que ya existe en el JSX cuando el cupón NO es de ruleta — para los cupones de ruleta ese texto seguiría mostrando "0%" al lado del monto real, lo cual es confuso pero está fuera del alcance mecánico de esta tarea; si se quiere pulir la UI de esa línea específica, es un ajuste de texto aislado, no de lógica.)

- [ ] **Step 7: Verificar compilación**

```bash
cd frontend && node -e "
const babel = require('@babel/core');
const fs = require('fs');
const code = fs.readFileSync('screens/cart/CartScreen.js', 'utf8');
babel.transform(code, { filename: 'screens/cart/CartScreen.js', presets: ['babel-preset-expo'] });
console.log('OK');
"
```

- [ ] **Step 8: Verificación manual en Expo Go**

1. Con un gajo `porcentaje=15` configurado (Task 4), girar hasta ganarlo — el modal debe mostrar el código con el botón de copiar, y tocarlo debe cambiar el ícono a un check.
2. Ir al carrito, pegar/escribir ese código en el campo de cupón, aplicar — debe mostrar el descuento real.
3. Confirmar el pedido — el cupón debe quedar usado; intentar aplicarlo de nuevo (en el mismo carrito o en otro) debe fallar.
4. Ganar el gajo "solo visual" (sin tipo) — el modal debe verse igual que antes de este plan, sin caja de código.
5. Ganar un gajo vacío — debe seguir mostrando "¡Sin premio esta vez!" sin código.

- [ ] **Step 9: Commit**

```bash
git add frontend/components/rewards/SpinWheel.js frontend/services/api.js frontend/screens/cart/CartScreen.js frontend/package.json frontend/package-lock.json
git commit -m "feat(rewards): SpinWheel gira contra el servidor con codigo copiable, carrito usa el descuento real"
```
