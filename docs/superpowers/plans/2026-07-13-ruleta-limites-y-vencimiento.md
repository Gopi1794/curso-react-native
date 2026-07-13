# Límite de giros, vencimiento y titularidad de cupones de ruleta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Los cupones de ruleta quedan atados a quien los ganó, vencen a los 7 días, y el restaurante puede limitar cuántas veces gira cada cliente — cortándose apenas gana un premio real — con la ruleta desapareciendo de Home cuando el cliente ya agotó sus giros; el carrito re-valida un cupón de ruleta aplicado si el contenido cambia, deshabilitándolo con aviso en vez de perderlo o cobrar sin avisar.

**Architecture:** Los endpoints de ruleta y de validar cupón pasan a requerir login (`authMiddleware`) para conocer al usuario — el helper `request()` del frontend ya manda el token en todos los pedidos, no hace falta tocar nada del lado del cliente para eso. Una tabla nueva `ruleta_giros` registra cada tirada; una función helper en `restaurantsController.js` calcula giros usados/restantes y si el usuario ya ganó, contando solo desde `restaurantes.ruleta_activada_en` (que se actualiza cada vez que el restaurante reactiva la ruleta). `ruleta_cupones` suma `usuario_id`/`fecha_expiracion`, chequeados en los mismos dos lugares que ya validan cupones (`cuponesController.js`, `ordersController.js`).

**Tech Stack:** PostgreSQL (Supabase), Node.js/Express, React Native/Expo (JavaScript).

## Global Constraints

- Sin test runner automatizado — verificación manual (curl + Expo Go), como en los planes anteriores de esta sesión.
- El helper `request()` de `frontend/services/api.js` ya adjunta `Authorization: Bearer <token>` en todas las llamadas si hay sesión — verificado en `frontend/services/api.js:41-46`. Ningún cambio de frontend hace falta solo para agregar auth a un endpoint que ya se llama con `API.x.y(...)`.
- `ruleta_giros_maximos IS NULL` en `restaurantes` significa giros ilimitados (comportamiento actual sin cambios para quien no lo configure).
- Ganar un premio con `tipo` no nulo corta los giros restantes de la tanda; caer en vacío o "solo visual" (`tipo` nulo) no corta nada.
- El corte y el conteo de giros se calculan solo sobre `ruleta_giros`/`ruleta_cupones` con `fecha_creacion >= restaurantes.ruleta_activada_en` — reactivar la ruleta (pasar de apagada a prendida) resetea a todos los clientes.
- No se toca el sistema de cupones legacy (`cupones`, `AdminCuponesScreen.js`) más allá de exigirle login al endpoint `/validate` — sus reglas de negocio no cambian.
- Trabajo en `main` sin worktree — mismo patrón que toda la sesión. **Atención**: hay trabajo sin commitear de otra sesión concurrente en el working tree (`App.js`, `LoginForm.js`, `FoodDetailScreen.js`, un feature de confetti/Lottie/BlurView en `SpinWheel.js`, entre otros) — cada tarea debe commitear con `git add <archivos exactos>`, nunca `git add -A` ni `git add .`, para no arrastrar ese trabajo ajeno.

---

### Task 1: Migración SQL

**Files:**
- Create: `database/migrations/015_ruleta_limites_vencimiento.sql`
- Create: `database/apply_migration_015.js`

**Interfaces:**
- Produces: `ruleta_cupones.usuario_id` (FK a `usuarios`), `ruleta_cupones.fecha_expiracion`, `restaurantes.ruleta_giros_maximos`, `restaurantes.ruleta_activada_en`, tabla `ruleta_giros(id, usuario_id, restaurante_id, gano_premio_real, fecha_creacion)`.

- [ ] **Step 1: Escribir la migración**

`database/migrations/015_ruleta_limites_vencimiento.sql`:

```sql
-- ============================================================
-- MIGRACIÓN 015: limite de giros, vencimiento y titularidad de cupones de ruleta
-- Ejecutar con: node database/apply_migration_015.js
-- ============================================================

ALTER TABLE ruleta_cupones
    ADD COLUMN IF NOT EXISTS usuario_id BIGINT REFERENCES usuarios(id),
    ADD COLUMN IF NOT EXISTS fecha_expiracion TIMESTAMP;

ALTER TABLE restaurantes
    ADD COLUMN IF NOT EXISTS ruleta_giros_maximos INTEGER,
    ADD COLUMN IF NOT EXISTS ruleta_activada_en TIMESTAMP;

CREATE TABLE IF NOT EXISTS ruleta_giros (
    id                BIGSERIAL   PRIMARY KEY,
    usuario_id        BIGINT      NOT NULL REFERENCES usuarios(id),
    restaurante_id    BIGINT      NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    gano_premio_real  BOOLEAN     NOT NULL DEFAULT FALSE,
    fecha_creacion    TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ruleta_giros_usuario_restaurante ON ruleta_giros (usuario_id, restaurante_id, fecha_creacion);
```

- [ ] **Step 2: Escribir el script que aplica la migración**

`database/apply_migration_015.js` (mismo patrón que `database/apply_migration_014.js`):

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
        path.join(__dirname, 'migrations', '015_ruleta_limites_vencimiento.sql'),
        'utf8'
    );
    const client = await pool.connect();
    try {
        console.log('Aplicando migración 015...');
        await client.query(sql);
        console.log('Migración 015 aplicada correctamente.');
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error('Error aplicando migración 015:', err.message);
    process.exit(1);
});
```

- [ ] **Step 3: Ejecutar y verificar**

Run: `node database/apply_migration_015.js`
Expected: `Migración 015 aplicada correctamente.`

Verificar con una query rápida (script throwaway, mismo patrón de Pool, no commitear):

```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'ruleta_cupones' AND column_name IN ('usuario_id', 'fecha_expiracion');
SELECT column_name FROM information_schema.columns WHERE table_name = 'restaurantes' AND column_name IN ('ruleta_giros_maximos', 'ruleta_activada_en');
SELECT table_name FROM information_schema.tables WHERE table_name = 'ruleta_giros';
```

Expected: 2 filas, 2 filas, 1 fila respectivamente.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/015_ruleta_limites_vencimiento.sql database/apply_migration_015.js
git commit -m "feat(db): limite de giros, vencimiento y titularidad de cupones de ruleta"
```

---

### Task 2: Backend — límite de giros server-side

**Files:**
- Modify: `backend/src/controllers/restaurantsController.js`
- Modify: `backend/src/routers/restaurants.js`
- Modify: `backend/src/controllers/adminRuletaController.js`

**Interfaces:**
- Consumes: tabla `ruleta_giros` (Task 1).
- Produces: `GET /api/restaurants/:id/ruleta` ahora requiere login y devuelve además `girosRestantes`/`puedeGirar`. `POST /api/restaurants/:id/ruleta/girar` ahora requiere login, rechaza con `403` si el usuario ya ganó un premio real o agotó sus giros de la tanda actual. `PUT /api/admin/ruleta/:restauranteId` acepta `girosMaximos` y resetea `ruleta_activada_en` al reactivar.

- [ ] **Step 1: Agregar el helper de estado de giros**

En `backend/src/controllers/restaurantsController.js`, agregar justo antes de `exports.getRuleta` (después de la constante `MENU_TTL`, o en cualquier punto antes de su primer uso):

```js
// ── Estado de giros de un usuario para un restaurante ─────
// Cuenta solo lo que pasó desde la ultima vez que el restaurante
// reactivo la ruleta (ruleta_activada_en) — reactivarla resetea a todos.
async function getEstadoGiros(usuarioId, restauranteId) {
    const result = await db.query(
        `SELECT
            r.ruleta_giros_maximos,
            r.ruleta_activada_en,
            COUNT(g.id) AS giros_usados,
            COUNT(g.id) FILTER (WHERE g.gano_premio_real = TRUE) AS gano_real
         FROM restaurantes r
         LEFT JOIN ruleta_giros g
            ON g.usuario_id = $1 AND g.restaurante_id = r.id
            AND g.fecha_creacion >= COALESCE(r.ruleta_activada_en, '-infinity'::timestamp)
         WHERE r.id = $2
         GROUP BY r.id, r.ruleta_giros_maximos, r.ruleta_activada_en`,
        [usuarioId, restauranteId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const girosMaximos = row.ruleta_giros_maximos;
    const girosUsados = parseInt(row.giros_usados, 10);
    const yaGanoReal = parseInt(row.gano_real, 10) > 0;
    const girosRestantes = girosMaximos == null ? null : Math.max(0, girosMaximos - girosUsados);
    const puedeGirar = !yaGanoReal && (girosMaximos == null || girosUsados < girosMaximos);

    return { girosMaximos, girosUsados, yaGanoReal, girosRestantes, puedeGirar };
}
```

- [ ] **Step 2: Actualizar `getRuleta`**

Ubicar (dentro de `exports.getRuleta`):

```js
        res.json({
            success: true,
            activa: restResult.rows[0].ruleta_activa,
            premios
        });
```

y reemplazar por:

```js
        const estado = await getEstadoGiros(req.user.userId, id);

        res.json({
            success: true,
            activa: restResult.rows[0].ruleta_activa,
            premios,
            girosRestantes: estado.girosRestantes,
            puedeGirar: restResult.rows[0].ruleta_activa && estado.puedeGirar
        });
```

- [ ] **Step 3: Actualizar `girarRuleta`**

Ubicar, dentro de `exports.girarRuleta`, justo después del chequeo de `ruleta_activa`:

```js
        if (!restResult.rows[0].ruleta_activa) {
            return res.status(400).json({
                success: false,
                message: 'La ruleta no está activa para este restaurante'
            });
        }

        const premiosResult = await db.query(
```

y agregar el chequeo de límite entre ambos bloques:

```js
        if (!restResult.rows[0].ruleta_activa) {
            return res.status(400).json({
                success: false,
                message: 'La ruleta no está activa para este restaurante'
            });
        }

        const estado = await getEstadoGiros(req.user.userId, id);

        if (estado.yaGanoReal) {
            return res.status(403).json({
                success: false,
                message: 'Ya ganaste un premio, no podés seguir girando'
            });
        }

        if (estado.girosMaximos != null && estado.girosUsados >= estado.girosMaximos) {
            return res.status(403).json({
                success: false,
                message: 'Ya usaste tus giros disponibles'
            });
        }

        const premiosResult = await db.query(
```

Ahora ubicar el bloque que decide el índice ganador y las tres ramas de respuesta:

```js
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
```

y reemplazar por (se agrega el registro en `ruleta_giros` antes de cada retorno, sabiendo de antemano si el premio tiene `tipo`):

```js
        const posicionGanadora = Math.floor(Math.random() * 8);
        const premioRaw = premiosPorPosicion[posicionGanadora] || null;

        if (!premioRaw || !premioRaw.label) {
            await db.query(
                'INSERT INTO ruleta_giros (usuario_id, restaurante_id, gano_premio_real) VALUES ($1, $2, FALSE)',
                [req.user.userId, id]
            );
            return res.json({
                success: true,
                posicionGanadora,
                premio: null,
                codigo: null
            });
        }

        if (!premioRaw.tipo) {
            await db.query(
                'INSERT INTO ruleta_giros (usuario_id, restaurante_id, gano_premio_real) VALUES ($1, $2, FALSE)',
                [req.user.userId, id]
            );
            return res.json({
                success: true,
                posicionGanadora,
                premio: { label: premioRaw.label, icon: premioRaw.icon, tipo: null },
                codigo: null
            });
        }
```

Y ubicar el final de la función, donde se inserta el cupón y se responde:

```js
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
```

y reemplazar por:

```js
        await db.query(
            `INSERT INTO ruleta_cupones (codigo, restaurante_id, tipo, valor, usuario_id, fecha_expiracion)
             VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')`,
            [codigo, id, premioRaw.tipo, premioRaw.valor, req.user.userId]
        );

        await db.query(
            'INSERT INTO ruleta_giros (usuario_id, restaurante_id, gano_premio_real) VALUES ($1, $2, TRUE)',
            [req.user.userId, id]
        );

        res.json({
            success: true,
            posicionGanadora,
            premio: { label: premioRaw.label, icon: premioRaw.icon, tipo: premioRaw.tipo },
            codigo
        });
```


- [ ] **Step 4: Requerir login en las rutas**

En `backend/src/routers/restaurants.js`, agregar el import al inicio:

```js
const authMiddleware = require('../middleware/authMiddleware');
```

Y ubicar:

```js
router.get('/:id/ruleta',            restaurantsController.getRuleta);
router.post('/:id/ruleta/girar',      restaurantsController.girarRuleta);
```

reemplazar por:

```js
router.get('/:id/ruleta',            authMiddleware, restaurantsController.getRuleta);
router.post('/:id/ruleta/girar',      authMiddleware, restaurantsController.girarRuleta);
```

(El resto de las rutas del archivo — `getAll`, `getById`, `getMenu`, `getMenuItem` — quedan sin auth, sin cambios.)

- [ ] **Step 5: `adminRuletaController.js` — giros máximos y reset al reactivar**

Ubicar `exports.getInfo`, el primer `SELECT`:

```js
        const restResult = await db.query(
            'SELECT ruleta_activa FROM restaurantes WHERE id = $1',
            [restauranteId]
        );
```

reemplazar por:

```js
        const restResult = await db.query(
            'SELECT ruleta_activa, ruleta_giros_maximos FROM restaurantes WHERE id = $1',
            [restauranteId]
        );
```

y el `res.json` de esa función:

```js
        res.json({ success: true, activa: restResult.rows[0].ruleta_activa, premios });
```

por:

```js
        res.json({ success: true, activa: restResult.rows[0].ruleta_activa, girosMaximos: restResult.rows[0].ruleta_giros_maximos, premios });
```

Ubicar `exports.updateInfo`:

```js
exports.updateInfo = async (req, res) => {
    const { restauranteId } = req.params;
    const { activa, premios } = req.body;

    if (typeof activa !== 'boolean') {
        return res.status(400).json({ success: false, message: 'activa debe ser boolean' });
    }
    if (!Array.isArray(premios)) {
        return res.status(400).json({ success: false, message: 'premios debe ser un array' });
    }
```

reemplazar por:

```js
exports.updateInfo = async (req, res) => {
    const { restauranteId } = req.params;
    const { activa, premios, girosMaximos } = req.body;

    if (typeof activa !== 'boolean') {
        return res.status(400).json({ success: false, message: 'activa debe ser boolean' });
    }
    if (!Array.isArray(premios)) {
        return res.status(400).json({ success: false, message: 'premios debe ser un array' });
    }
    if (girosMaximos !== undefined && girosMaximos !== null && (typeof girosMaximos !== 'number' || girosMaximos < 1)) {
        return res.status(400).json({ success: false, message: 'girosMaximos debe ser un número mayor a 0, o null' });
    }
```

Ubicar el `UPDATE` dentro de la transacción:

```js
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        await client.query(
            'UPDATE restaurantes SET ruleta_activa = $1 WHERE id = $2',
            [activa, restauranteId]
        );
```

reemplazar por:

```js
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const actualResult = await client.query('SELECT ruleta_activa FROM restaurantes WHERE id = $1', [restauranteId]);
        const reactivando = actualResult.rows[0] && actualResult.rows[0].ruleta_activa === false && activa === true;

        if (reactivando) {
            await client.query(
                'UPDATE restaurantes SET ruleta_activa = $1, ruleta_giros_maximos = $2, ruleta_activada_en = NOW() WHERE id = $3',
                [activa, girosMaximos ?? null, restauranteId]
            );
        } else {
            await client.query(
                'UPDATE restaurantes SET ruleta_activa = $1, ruleta_giros_maximos = $2 WHERE id = $3',
                [activa, girosMaximos ?? null, restauranteId]
            );
        }
```

Y por último, ubicar el `res.json` final de `updateInfo`:

```js
        res.json({ success: true, data: { activa, premios: premiosFinal } });
```

por:

```js
        res.json({ success: true, data: { activa, premios: premiosFinal, girosMaximos: girosMaximos ?? null } });
```

- [ ] **Step 6: Verificar con curl**

```bash
cd backend && npm start
```

Con un token de usuario **cliente** (no admin — registrá o logueá un cliente normal) y el restaurante Viandas Saludables (id=1, ya tiene `ruleta_activa=true` de antes en esta sesión):

```bash
TOKEN="token_de_cliente"
curl -s http://localhost:3000/api/restaurants/1/ruleta -H "Authorization: Bearer $TOKEN"
```

Expected: incluye `girosRestantes` (probablemente `null` si nunca se configuró un límite para ese restaurante) y `puedeGirar:true`.

Con un token de **admin** de ese restaurante, configurá un límite bajo para probar el corte:

```bash
ADMIN_TOKEN="token_del_admin_de_viandas"
curl -s -X PUT http://localhost:3000/api/admin/ruleta/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"activa":true,"girosMaximos":2,"premios":[{"posicion":0,"label":"20% OFF","icon":"pricetag-outline","tipo":"porcentaje","valor":20}]}'
```

Después, con el token de cliente, girá 3 veces seguidas:

```bash
for i in 1 2 3; do curl -s -X POST "http://localhost:3000/api/restaurants/1/ruleta/girar" -H "Authorization: Bearer $TOKEN"; echo; done
```

Expected: si el primer giro cae en la posición 0 (premio real), el segundo giro debe devolver `403` "Ya ganaste un premio...". Si ninguno de los 2 primeros cae ahí, el 3er giro debe devolver `403` "Ya usaste tus giros disponibles" (por el límite de 2). Repetí `GET /ruleta` después y confirmá `puedeGirar:false`.

Reactivá la ruleta (mismo `PUT` con `activa:true` — como ya estaba activa, esto no dispara el reset; para probar el reset real, primero mandá `activa:false` y después de nuevo `activa:true`) y confirmá que el mismo cliente vuelve a tener `puedeGirar:true`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/restaurantsController.js backend/src/routers/restaurants.js backend/src/controllers/adminRuletaController.js
git commit -m "feat(backend): limite de giros por restaurante, corte al ganar premio real"
```

---

### Task 3: Backend — titularidad y vencimiento de cupones

**Files:**
- Modify: `backend/src/controllers/cuponesController.js`
- Modify: `backend/src/routers/cupones.js`
- Modify: `backend/src/controllers/ordersController.js`

**Interfaces:**
- Consumes: `ruleta_cupones.usuario_id`/`fecha_expiracion` (Task 1), `req.user.userId` (requiere que `POST /api/cupones/validate` pase a estar autenticado).
- Produces: un cupón de ruleta que no pertenece al usuario logueado, o que ya venció, se trata igual que "no encontrado" en ambos lugares que lo validan.

- [ ] **Step 1: Requerir login en `/api/cupones/validate`**

En `backend/src/routers/cupones.js`, agregar el import:

```js
const authMiddleware = require('../middleware/authMiddleware');
```

Ubicar:

```js
router.post('/validate',    cuponesController.validateByCode);
```

reemplazar por:

```js
router.post('/validate',    authMiddleware, cuponesController.validateByCode);
```

(`GET /` y `GET /:id` quedan públicos, sin cambios — son para listar/ver cupones legacy, no necesitan saber quién los pide.)

- [ ] **Step 2: `cuponesController.js` — chequear titularidad y vencimiento**

Ubicar, dentro de `exports.validateByCode`:

```js
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
```

reemplazar por:

```js
        // 2. Buscar en ruleta_cupones — solo del usuario logueado, no vencido
        const cuponRuleta = await db.query(
            `SELECT id, tipo, valor, restaurante_id
             FROM ruleta_cupones
             WHERE UPPER(codigo) = UPPER($1) AND usado = FALSE
               AND usuario_id = $2 AND fecha_expiracion > NOW()`,
            [codigo.trim(), req.user.userId]
        );

        if (cuponRuleta.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cupón inválido, vencido o ya usado' });
        }
```

- [ ] **Step 3: `ordersController.js` — mismo chequeo al confirmar el pedido**

Ubicar:

```js
                const cuponRuleta = await client.query(
                    `SELECT id, tipo, valor FROM ruleta_cupones
                     WHERE UPPER(codigo) = UPPER($1) AND restaurante_id = $2 AND usado = FALSE`,
                    [cupon_codigo.trim(), restaurante_id]
                );
```

reemplazar por:

```js
                const cuponRuleta = await client.query(
                    `SELECT id, tipo, valor FROM ruleta_cupones
                     WHERE UPPER(codigo) = UPPER($1) AND restaurante_id = $2 AND usado = FALSE
                       AND usuario_id = $3 AND fecha_expiracion > NOW()`,
                    [cupon_codigo.trim(), restaurante_id, req.user.userId]
                );
```

(`createOrder` ya requiere login — `req.user.userId` ya se usa más abajo en la misma función para el `INSERT INTO pedidos` — no hace falta ningún cambio de router acá.)

- [ ] **Step 4: Verificar con curl**

Con el backend corriendo, ganá un cupón (Task 2, Step 6) con el cliente A, y probá:

```bash
# Cliente A (el que gano) - debe funcionar
curl -s -X POST http://localhost:3000/api/cupones/validate \
  -H "Authorization: Bearer $TOKEN_CLIENTE_A" -H "Content-Type: application/json" \
  -d '{"codigo":"EL_CODIGO","restaurante_id":1,"items":[]}'

# Cliente B (otro usuario, logueate con otra cuenta) - debe fallar (404)
curl -s -X POST http://localhost:3000/api/cupones/validate \
  -H "Authorization: Bearer $TOKEN_CLIENTE_B" -H "Content-Type: application/json" \
  -d '{"codigo":"EL_CODIGO","restaurante_id":1,"items":[]}'
```

Para el vencimiento, forzalo manualmente (script throwaway, no commitear):

```sql
UPDATE ruleta_cupones SET fecha_expiracion = NOW() - INTERVAL '1 day' WHERE codigo = 'EL_CODIGO';
```

y repetí el primer curl (cliente A) — debe fallar ahora también (404, "vencido").

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/cuponesController.js backend/src/routers/cupones.js backend/src/controllers/ordersController.js
git commit -m "feat(backend): cupones de ruleta atados al usuario que los gano, vencen a los 7 dias"
```

---

### Task 4: Frontend — admin, Home y modal de resultado

**Files:**
- Modify: `frontend/screens/admin/AdminRuletaScreen.js`
- Modify: `frontend/screens/home/ScreenHome.js`
- Modify: `frontend/components/rewards/SpinWheel.js`

**Interfaces:**
- Consumes: `girosMaximos` en `API.admin.ruleta.getInfo`/`updateInfo` (Task 2), `puedeGirar` en `API.restaurants.getRuleta` (Task 2).
- Produces: nada consumido por Task 5.

- [ ] **Step 1: `AdminRuletaScreen.js` — campo de giros máximos**

Agregar el estado, junto a los demás `useState` (después de `const [activa, setActiva] = useState(false);`):

```js
    const [girosMaximos, setGirosMaximos] = useState('');
```

Ubicar `load`, dentro del bloque `if (res.success)`:

```js
            if (res.success) {
                setActiva(res.activa);
                setPremios(res.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null, tipo: p.tipo || null, valor: p.valor != null ? String(p.valor) : '' })));
            }
```

reemplazar por:

```js
            if (res.success) {
                setActiva(res.activa);
                setGirosMaximos(res.girosMaximos != null ? String(res.girosMaximos) : '');
                setPremios(res.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null, tipo: p.tipo || null, valor: p.valor != null ? String(p.valor) : '' })));
            }
```

Ubicar `handleGuardar`:

```js
            const res = await API.admin.ruleta.updateInfo(restaurante.id, {
                activa,
                premios: premios.map(p => ({
```

reemplazar por:

```js
            const res = await API.admin.ruleta.updateInfo(restaurante.id, {
                activa,
                girosMaximos: girosMaximos.trim() ? parseInt(girosMaximos, 10) : null,
                premios: premios.map(p => ({
```

y su bloque de éxito:

```js
            if (res.success) {
                showSuccessMessage('Guardado', 'La configuración de la ruleta se actualizó');
                setPremios(res.data.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null, tipo: p.tipo || null, valor: p.valor != null ? String(p.valor) : '' })));
            } else {
```

por:

```js
            if (res.success) {
                showSuccessMessage('Guardado', 'La configuración de la ruleta se actualizó');
                setGirosMaximos(res.data.girosMaximos != null ? String(res.data.girosMaximos) : '');
                setPremios(res.data.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null, tipo: p.tipo || null, valor: p.valor != null ? String(p.valor) : '' })));
            } else {
```

En el JSX, ubicar el cierre del `switchRow` y el inicio del `.map` de premios:

```jsx
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Mostrar ruleta a los clientes</Text>
                    <Switch value={activa} onValueChange={setActiva} trackColor={{ false: '#ccc', true: '#FFD0A0' }} thumbColor={activa ? '#FF8700' : '#888'} />
                </View>

                {premios.map((premio) => (
```

y agregar el campo nuevo entre ambos:

```jsx
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Mostrar ruleta a los clientes</Text>
                    <Switch value={activa} onValueChange={setActiva} trackColor={{ false: '#ccc', true: '#FFD0A0' }} thumbColor={activa ? '#FF8700' : '#888'} />
                </View>

                <View style={styles.slotCard}>
                    <Text style={styles.slotTitle}>Giros máximos por cliente (vacío = ilimitado)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej. 3"
                        value={girosMaximos}
                        onChangeText={(text) => setGirosMaximos(text.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        maxLength={3}
                    />
                </View>

                {premios.map((premio) => (
```

- [ ] **Step 2: `ScreenHome.js` — la ruleta desaparece si `puedeGirar` es `false`**

Ubicar `fetchRuleta`:

```js
            const response = await API.restaurants.getRuleta(selectedRestaurant.id);
            if (response.success && response.activa) {
                setRuletaPremios(response.premios);
                setShowSpinWheel(true);
            } else {
                setShowSpinWheel(false);
            }
```

reemplazar por:

```js
            const response = await API.restaurants.getRuleta(selectedRestaurant.id);
            if (response.success && response.activa && response.puedeGirar) {
                setRuletaPremios(response.premios);
                setShowSpinWheel(true);
            } else {
                setShowSpinWheel(false);
            }
```

- [ ] **Step 3: `SpinWheel.js` — "Vence en 7 días"**

Ubicar el bloque del código copiable dentro del modal de resultado:

```jsx
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
```

reemplazar por:

```jsx
                                {codigoGanado && (
                                    <>
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
                                        <Text style={styles.codigoVence}>Vence en 7 días</Text>
                                    </>
                                )}
```

Agregar el estilo nuevo, después de `codigoText` en el `StyleSheet.create`:

```js
    codigoVence: {
        fontSize: 11, color: '#9A9AA5', marginTop: -12, marginBottom: 16,
        fontFamily: 'Poppins-Regular',
    },
```

(Buscar el bloque `codigoBox`/`codigoText` existente en los estilos de `SpinWheel.js` para ubicar el punto exacto de inserción — van justo después de `codigoText`.)

- [ ] **Step 4: Verificar compilación**

```bash
cd frontend && node -e "
const babel = require('@babel/core');
const fs = require('fs');
['screens/admin/AdminRuletaScreen.js','screens/home/ScreenHome.js','components/rewards/SpinWheel.js'].forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  babel.transform(code, { filename: f, presets: ['babel-preset-expo'], plugins: ['react-native-reanimated/plugin'] });
  console.log('OK:', f);
});
"
```

- [ ] **Step 5: Verificación manual en Expo Go**

1. Como admin, configurar "Giros máximos por cliente" en 2, guardar, recargar la pantalla — el valor debe persistir.
2. Como cliente, agotar los 2 giros (o ganar un premio real en el primero) — la ruleta debe dejar de aparecer en Home al recargar.
3. El modal de "¡Ganaste!" debe mostrar "Vence en 7 días" debajo del código.

- [ ] **Step 6: Commit**

```bash
git add frontend/screens/admin/AdminRuletaScreen.js frontend/screens/home/ScreenHome.js frontend/components/rewards/SpinWheel.js
git commit -m "feat(rewards): giros maximos configurables, ruleta se oculta al agotarlos, aviso de vencimiento"
```

---

### Task 5: Frontend — carrito re-valida el cupón de ruleta aplicado

**Files:**
- Modify: `frontend/screens/cart/CartScreen.js`

**Interfaces:**
- Consumes: `API.cupones.validate` (ya existente) — sin cambios de firma, solo se lo vuelve a llamar cuando cambia el carrito.
- Produces: nada consumido por otras tareas — es la última.

- [ ] **Step 1: Estado nuevo**

Ubicar:

```js
    const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
```

y agregar justo después:

```js
    const [couponEsRuleta, setCouponEsRuleta] = useState(false);
    const [couponHabilitado, setCouponHabilitado] = useState(true);
    const [couponDisabledReason, setCouponDisabledReason] = useState(null);
```

- [ ] **Step 2: `handleApplyCoupon` guarda si es de ruleta y resetea el estado de habilitado**

Ubicar:

```js
            if (res.success) {
                if (res.cupon.esRuleta) {
                    setCouponDiscountAmount(res.cupon.monto_descuento);
                    setCouponDiscount(0);
                } else {
                    setCouponDiscountAmount(calculateSubtotal() * (res.cupon.discount_percent / 100));
                    setCouponDiscount(res.cupon.discount_percent);
                }
                setCouponApplied(true);
```

reemplazar por:

```js
            if (res.success) {
                if (res.cupon.esRuleta) {
                    setCouponDiscountAmount(res.cupon.monto_descuento);
                    setCouponDiscount(0);
                } else {
                    setCouponDiscountAmount(calculateSubtotal() * (res.cupon.discount_percent / 100));
                    setCouponDiscount(res.cupon.discount_percent);
                }
                setCouponEsRuleta(!!res.cupon.esRuleta);
                setCouponHabilitado(true);
                setCouponDisabledReason(null);
                setCouponApplied(true);
```

- [ ] **Step 3: Re-validar cuando cambia el carrito**

Agregar, después de la definición de `handleApplyCoupon` (antes de `handleViewProductDetail`):

```js
    useEffect(() => {
        if (!couponApplied || !couponEsRuleta) return;

        const revalidar = async () => {
            try {
                const items = cartItems.map(item => ({ menu_item_id: item.id, cantidad: item.quantity }));
                const res = await API.cupones.validate(couponCode.trim(), selectedRestaurant?.id, items);
                if (res.success) {
                    setCouponDiscountAmount(res.cupon.monto_descuento);
                    setCouponHabilitado(true);
                    setCouponDisabledReason(null);
                } else {
                    setCouponHabilitado(false);
                    setCouponDisabledReason(res.message || 'Este cupón ya no se puede aplicar');
                    setCouponDiscountAmount(0);
                }
            } catch {
                // Sin conexión: no tocamos el estado actual del cupón, se reintenta en el próximo cambio del carrito.
            }
        };

        revalidar();
    }, [cartItems, couponApplied, couponEsRuleta]);
```

- [ ] **Step 4: JSX — mostrar el estado deshabilitado**

Ubicar:

```jsx
                            {couponApplied ? (
                                <View style={styles.couponApplied}>
                                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                                    <Text style={styles.couponAppliedText}>-{couponDiscount}%</Text>
                                </View>
                            ) : (
```

reemplazar por:

```jsx
                            {couponApplied ? (
                                <View style={styles.couponApplied}>
                                    <Ionicons name={couponHabilitado ? 'checkmark-circle' : 'alert-circle'} size={18} color={couponHabilitado ? '#4CAF50' : '#E53935'} />
                                    <Text style={styles.couponAppliedText}>
                                        {couponHabilitado ? `-$${couponDiscountAmount.toFixed(2)}` : 'Pausado'}
                                    </Text>
                                </View>
                            ) : (
```

Ubicar el cierre de `couponContainer`:

```jsx
                            )}
                        </View>

                        {/* --- Resumen del pedido --- */}
```

y agregar el texto de motivo entre ambos:

```jsx
                            )}
                        </View>
                        {couponApplied && !couponHabilitado && couponDisabledReason && (
                            <Text style={styles.couponDisabledText}>{couponDisabledReason}</Text>
                        )}

                        {/* --- Resumen del pedido --- */}
```

Ubicar el resumen del descuento:

```jsx
                            {couponApplied && (
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, styles.discountLabel]}>Descuento ({couponDiscount}%)</Text>
                                    <Text style={styles.discountValue}>-${calculateDiscount().toFixed(2)}</Text>
                                </View>
                            )}
```

reemplazar por:

```jsx
                            {couponApplied && couponHabilitado && (
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, styles.discountLabel]}>Descuento</Text>
                                    <Text style={styles.discountValue}>-${calculateDiscount().toFixed(2)}</Text>
                                </View>
                            )}
```

Agregar el estilo nuevo, después de `couponAppliedText`:

```js
    couponDisabledText: {
        color: '#E53935', fontSize: 12, marginTop: -12, marginBottom: 16,
        paddingHorizontal: 4,
    },
```

- [ ] **Step 5: No mandar el código si está deshabilitado**

Ubicar (aparece 2 veces en el archivo, una en `handleMercadoPagoPayment` y otra en `handleEfectivoPayment` — reemplazar las DOS ocurrencias):

```js
                couponApplied ? couponCode : null
```

por:

```js
                couponApplied && couponHabilitado ? couponCode : null
```

- [ ] **Step 6: Verificar compilación**

```bash
cd frontend && node -e "
const babel = require('@babel/core');
const fs = require('fs');
const code = fs.readFileSync('screens/cart/CartScreen.js', 'utf8');
babel.transform(code, { filename: 'screens/cart/CartScreen.js', presets: ['babel-preset-expo'] });
console.log('OK');
"
```

- [ ] **Step 7: Verificación manual en Expo Go**

1. Ganar un cupón `plato_gratis`, agregar un plato al carrito, aplicarlo — debe mostrar el descuento en dólares.
2. Sacar el plato del carrito — el cupón debe quedar en rojo con "Pausado" y el texto explicando por qué, sin restar del total.
3. Confirmar el pedido en ese estado — el cupón NO debe consumirse (verificar `SELECT usado FROM ruleta_cupones WHERE codigo=...` sigue en `false`).
4. Volver a agregar un plato — el cupón se debe re-habilitar solo, sin tener que re-escribir el código.

- [ ] **Step 8: Commit**

```bash
git add frontend/screens/cart/CartScreen.js
git commit -m "feat(cart): re-validar cupon de ruleta al cambiar el carrito, deshabilitar con aviso en vez de perderlo"
```
