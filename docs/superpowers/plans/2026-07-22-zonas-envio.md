# Zonas de envío — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el costo de envío fijo ($2.99 para todos) por zonas configurables por restaurante con costo según distancia, calculado con la misma integración de Google Routes que ya usa el flujo de repartidores — guardando tanto el costo cobrado como la tarifa vigente en cada pedido, para poder medir después la rentabilidad de promos de envío gratis.

**Architecture:** Una tabla nueva `zonas_envio` por restaurante (`radio_km`, `costo_envio`, `activa`). Un helper `matchZona()` llama a `computeRoute()` (ya existente en `googleRoutes.js`, sin tocar) para la distancia real desde el restaurante y elige la zona de `radio_km` más chico que la cubra. El carrito cotiza la zona al elegir la dirección de entrega (para mostrar el costo real antes de pagar); el backend la vuelve a calcular de forma independiente al crear el pedido y al validar cupones, sin confiar en la cotización previa del cliente — mismo patrón que ya usa este proyecto con los precios del menú. Como prerequisito bloqueante, `restaurantes.lat`/`lng` (hoy `NULL` en los 5 restaurantes reales) se completa automáticamente por geocoding (Nominatim) cada vez que el admin guarda su dirección.

**Tech Stack:** PostgreSQL (Supabase), Node.js/Express, React Native/Expo (JavaScript). Google Routes API (ya integrada, `backend/src/utils/googleRoutes.js`). Nominatim para geocoding (ya usado en `frontend/screens/repartidor/RepartidorMapaScreen.js`, se extrae a backend).

## Global Constraints

- Sin test runner automatizado en este proyecto — verificación con `node --check`, compilación Babel, `curl` y prueba manual en Expo (dev client, no Expo Go — el proyecto ya tiene módulos nativos custom por Sentry).
- Trabajo en `main` sin worktree — cada tarea commitea con `git add <archivos exactos>`, nunca `git add -A` ni `git add .`, por si hay trabajo sin commitear de otra sesión concurrente en el working tree.
- `restaurantes.lat`/`lng` están en `NULL` para los 5 restaurantes reales de la base ahora mismo (verificado). Task 1 es bloqueante para todo lo demás — sin esto `matchZona` no tiene desde dónde medir distancia.
- `direcciones_usuarios.latitud`/`longitud` pueden ser `NULL` (el usuario nunca dio permiso de ubicación ni tocó el mapa al guardar la dirección, en `AddAddressSheet.js`) — cualquier código que las use debe chequear null y devolver un error claro, no reventar.
- `computeRoute` (`backend/src/utils/googleRoutes.js`) no se toca — se reusa tal cual, mismo llamado que ya usa el flujo de asignación de repartidores, sin costo extra de la API.
- Nominatim (geocoding gratuito, OpenStreetMap) tiene un límite de uso de máximo 1 request por segundo — el script de backfill que geocodifica varios restaurantes de una tira debe esperar entre cada uno.
- Zonas nunca se borran (`DELETE`) — "eliminar" es `activa = false`, porque hay pedidos históricos que las referencian.
- Fuera de zona = rechazar el pedido (400). No existe "zona fallback" — si un admin quiere cubrir distancias largas, crea su propia zona con radio grande y costo alto.
- Desempate de zonas con el mismo `radio_km` exacto: gana la más vieja (`ORDER BY radio_km ASC, id ASC`).
- `evaluarCupon` (en `backend/src/utils/ruletaCuponHelper.js`) cambia de firma para recibir `costoEnvio` como parámetro en vez de importar la constante `SHIPPING_FEE`. Tiene **dos** call sites reales que hay que actualizar juntos: `backend/src/controllers/ordersController.js` (al crear el pedido) y `backend/src/controllers/cuponesController.js` (el preview de "Aplicar cupón" que dispara el carrito antes de pagar). Si se actualiza uno sin el otro, el preview del cupón queda roto silenciosamente (calcula con `costoEnvio: undefined`).

---

### Task 1: Prerequisito — geocoding de `restaurantes.lat`/`lng`

**Files:**
- Create: `backend/src/utils/geocoding.js`
- Modify: `backend/src/controllers/adminRestauranteController.js`
- Create: `database/backfill_restaurantes_geocoding.js`

**Interfaces:**
- Produces: `geocodeAddress(address)` → `Promise<{lat, lng} | null>`. `PUT /api/admin/restaurante/:restauranteId` ahora geocodifica cuando llega `direccion` en el body, y la respuesta incluye `geocoded: boolean`.

- [ ] **Step 1: Escribir el helper de geocoding**

`backend/src/utils/geocoding.js`:

```js
// Mismo patrón Nominatim que ya usa frontend/screens/repartidor/RepartidorMapaScreen.js
// (geocodeAddress), llevado a backend para poder llamarlo al guardar el restaurante.
async function geocodeAddress(address) {
    if (!address || !address.trim()) return null;

    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'TuAppFood/1.0 (contacto@tuemail.com)' } });
        const data = await res.json();
        if (data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch {
        // Nominatim caído o sin respuesta — se trata igual que "no encontrado"
    }
    return null;
}

module.exports = { geocodeAddress };
```

- [ ] **Step 2: Enganchar el geocoding en `updateInfo`**

`backend/src/controllers/adminRestauranteController.js` — ubicar el archivo completo actual:

```js
const db = require('../config/database');
const bcrypt = require('bcryptjs');

exports.updateInfo = async (req, res) => {
    const { restauranteId } = req.params;
    const { nombre, descripcion, direccion, telefono, horario, logo_url } = req.body;

    try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (nombre      !== undefined) { fields.push(`nombre = $${idx++}`);      values.push(nombre); }
        if (descripcion !== undefined) { fields.push(`descripcion = $${idx++}`); values.push(descripcion); }
        if (direccion   !== undefined) { fields.push(`direccion = $${idx++}`);   values.push(direccion); }
        if (telefono    !== undefined) { fields.push(`telefono = $${idx++}`);    values.push(telefono); }
        if (horario     !== undefined) { fields.push(`horario = $${idx++}`);     values.push(JSON.stringify(horario)); }
        if (logo_url    !== undefined) { fields.push(`logo_url = $${idx++}`);    values.push(logo_url); }

        if (!fields.length) {
            return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
        }

        values.push(restauranteId);
        const result = await db.query(
            `UPDATE restaurantes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('updateRestauranteInfo:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar restaurante' });
    }
};
```

Reemplazar por:

```js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { geocodeAddress } = require('../utils/geocoding');

exports.updateInfo = async (req, res) => {
    const { restauranteId } = req.params;
    const { nombre, descripcion, direccion, telefono, horario, logo_url } = req.body;

    try {
        const fields = [];
        const values = [];
        let idx = 1;
        let geocoded = true;

        if (nombre      !== undefined) { fields.push(`nombre = $${idx++}`);      values.push(nombre); }
        if (descripcion !== undefined) { fields.push(`descripcion = $${idx++}`); values.push(descripcion); }
        if (direccion   !== undefined) {
            fields.push(`direccion = $${idx++}`);
            values.push(direccion);

            const coords = await geocodeAddress(direccion);
            if (coords) {
                fields.push(`lat = $${idx++}`); values.push(coords.lat);
                fields.push(`lng = $${idx++}`); values.push(coords.lng);
            } else {
                geocoded = false;
            }
        }
        if (telefono    !== undefined) { fields.push(`telefono = $${idx++}`);    values.push(telefono); }
        if (horario     !== undefined) { fields.push(`horario = $${idx++}`);     values.push(JSON.stringify(horario)); }
        if (logo_url    !== undefined) { fields.push(`logo_url = $${idx++}`);    values.push(logo_url); }

        if (!fields.length) {
            return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
        }

        values.push(restauranteId);
        const result = await db.query(
            `UPDATE restaurantes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
        }

        res.json({ success: true, data: result.rows[0], geocoded });
    } catch (error) {
        console.error('updateRestauranteInfo:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar restaurante' });
    }
};
```

(No tocar `getInfo` ni `createRepartidor`, siguen igual.)

- [ ] **Step 3: Verificar con `node --check` y curl**

```bash
cd backend && node --check src/controllers/adminRestauranteController.js src/utils/geocoding.js
```

Expected: sin salida (sintaxis OK).

Con el backend corriendo (`npm run dev`) y un token de admin real:

```bash
ADMIN_TOKEN="token_de_un_admin"
curl -s -X PUT http://localhost:3000/api/admin/restaurante/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"direccion":"Av. Corrientes 1500, Buenos Aires"}'
```

Expected: `"geocoded":true` en la respuesta, y `data.lat`/`data.lng` con valores numéricos (no `null`).

- [ ] **Step 4: Commit**

```bash
git add backend/src/utils/geocoding.js backend/src/controllers/adminRestauranteController.js
git commit -m "feat(backend): geocodificar la direccion del restaurante al guardarla"
```

- [ ] **Step 5: Backfill de los 5 restaurantes existentes**

`database/backfill_restaurantes_geocoding.js`:

```js
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
```

- [ ] **Step 6: Ejecutar y revisar el resultado**

```bash
node database/backfill_restaurantes_geocoding.js
```

Expected: 5 líneas, la mayoría `OK (lat, lng)`. Si alguna queda "no se pudo geocodificar", anotarla — hay que corregir esa dirección a mano (es de ejemplo/seed, puede no ser una dirección real geocodificable) antes de que ese restaurante pueda usar zonas de envío.

Verificar contra la base:

```bash
cd backend && node -e "
require('dotenv').config();
const db = require('./src/config/database');
db.query('SELECT id, nombre, lat, lng FROM restaurantes ORDER BY id').then(r => {
  console.log(JSON.stringify(r.rows, null, 2));
  process.exit(0);
});
"
```

Expected: los 5 restaurantes con `lat`/`lng` no nulos (salvo los que hayan fallado y queden pendientes de corrección manual).

- [ ] **Step 7: Commit**

```bash
git add database/backfill_restaurantes_geocoding.js
git commit -m "feat(db): backfill de lat/lng para restaurantes existentes"
```

---

### Task 2: Migración SQL — `zonas_envio` y columnas en `pedidos`

**Files:**
- Create: `database/migrations/016_zonas_envio.sql`
- Create: `database/apply_migration_016.js`
- Modify: `database/schema.sql`

**Interfaces:**
- Consumes: nada.
- Produces: tabla `zonas_envio(id, restaurante_id, nombre, radio_km, costo_envio, activa, fecha_creacion)`. `pedidos.zona_envio_id`, `pedidos.costo_envio`, `pedidos.costo_envio_tarifa_vigente`.

- [ ] **Step 1: Escribir la migración**

`database/migrations/016_zonas_envio.sql`:

```sql
-- ============================================================
-- MIGRACIÓN 016: zonas de envío por distancia
-- Ejecutar con: node database/apply_migration_016.js
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS zonas_envio_id_seq;

CREATE TABLE IF NOT EXISTS public.zonas_envio (
    id              bigint NOT NULL DEFAULT nextval('zonas_envio_id_seq'::regclass),
    restaurante_id  bigint NOT NULL,
    nombre          character varying NOT NULL,
    radio_km        numeric NOT NULL CHECK (radio_km > 0::numeric),
    costo_envio     numeric NOT NULL CHECK (costo_envio >= 0::numeric),
    activa          boolean NOT NULL DEFAULT true,
    fecha_creacion  timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT zonas_envio_pkey PRIMARY KEY (id),
    CONSTRAINT zonas_envio_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);

ALTER TABLE public.pedidos
    ADD COLUMN IF NOT EXISTS zona_envio_id bigint REFERENCES public.zonas_envio(id),
    ADD COLUMN IF NOT EXISTS costo_envio numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS costo_envio_tarifa_vigente numeric;
```

Nota: `CREATE SEQUENCE IF NOT EXISTS` y `CREATE TABLE IF NOT EXISTS` — la tabla `zonas_envio` ya se creó manualmente durante el brainstorming de esta feature (verificado: existe, 0 filas, columnas correctas), así que la migración tiene que poder correr igual sin fallar sobre eso.

- [ ] **Step 2: Escribir el script que aplica la migración**

`database/apply_migration_016.js` (mismo patrón que `database/apply_migration_015.js`):

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
        path.join(__dirname, 'migrations', '016_zonas_envio.sql'),
        'utf8'
    );
    const client = await pool.connect();
    try {
        console.log('Aplicando migración 016...');
        await client.query(sql);
        console.log('Migración 016 aplicada correctamente.');
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error('Error aplicando migración 016:', err.message);
    process.exit(1);
});
```

- [ ] **Step 3: Ejecutar y verificar**

```bash
node database/apply_migration_016.js
```

Expected: `Migración 016 aplicada correctamente.`

```bash
cd backend && node -e "
require('dotenv').config();
const db = require('./src/config/database');
db.query(\"SELECT column_name FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name IN ('zona_envio_id','costo_envio','costo_envio_tarifa_vigente')\").then(r => {
  console.log(r.rows.map(x => x.column_name));
  process.exit(0);
});
"
```

Expected: array con las 3 columnas.

- [ ] **Step 4: Actualizar `database/schema.sql`**

Ubicar, dentro de `CREATE TABLE public.pedidos (`:

```sql
  distancia_metros integer,
  duracion_segundos integer,
  eta_calculado_en timestamp without time zone,
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
```

reemplazar por:

```sql
  distancia_metros integer,
  duracion_segundos integer,
  eta_calculado_en timestamp without time zone,
  zona_envio_id bigint,
  costo_envio numeric NOT NULL DEFAULT 0,
  costo_envio_tarifa_vigente numeric,
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
```

Y agregar el `FOREIGN KEY` correspondiente junto a los demás `CONSTRAINT pedidos_..._fkey` de esa tabla:

```sql
  CONSTRAINT pedidos_repartidor_id_fkey FOREIGN KEY (repartidor_id) REFERENCES public.usuarios(id)
);
```

reemplazar por:

```sql
  CONSTRAINT pedidos_repartidor_id_fkey FOREIGN KEY (repartidor_id) REFERENCES public.usuarios(id),
  CONSTRAINT pedidos_zona_envio_id_fkey FOREIGN KEY (zona_envio_id) REFERENCES public.zonas_envio(id)
);
```

Y agregar la tabla `zonas_envio` completa en algún punto antes de `pedidos` (respeta el orden de dependencias del archivo — las tablas referenciadas van antes). Ubicar el final de `CREATE TABLE public.restaurantes (...)`:

```sql
  ruleta_activa boolean NOT NULL DEFAULT false,
  CONSTRAINT restaurantes_pkey PRIMARY KEY (id),
  CONSTRAINT restaurantes_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.usuarios(id)
);
```

y agregar justo después:

```sql
  ruleta_activa boolean NOT NULL DEFAULT false,
  CONSTRAINT restaurantes_pkey PRIMARY KEY (id),
  CONSTRAINT restaurantes_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.zonas_envio (
  id bigint NOT NULL DEFAULT nextval('zonas_envio_id_seq'::regclass),
  restaurante_id bigint NOT NULL,
  nombre character varying NOT NULL,
  radio_km numeric NOT NULL CHECK (radio_km > 0::numeric),
  costo_envio numeric NOT NULL CHECK (costo_envio >= 0::numeric),
  activa boolean NOT NULL DEFAULT true,
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT zonas_envio_pkey PRIMARY KEY (id),
  CONSTRAINT zonas_envio_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);
```

- [ ] **Step 5: Commit**

```bash
git add database/migrations/016_zonas_envio.sql database/apply_migration_016.js database/schema.sql
git commit -m "feat(db): zonas de envio por distancia y costo congelado en pedidos"
```

---

### Task 3: Backend — `matchZona` y cotización de envío

**Files:**
- Create: `backend/src/utils/zonaEnvioHelper.js`
- Modify: `backend/src/controllers/restaurantsController.js`
- Modify: `backend/src/routers/restaurants.js`

**Interfaces:**
- Consumes: `computeRoute({origen, destino})` de `backend/src/utils/googleRoutes.js` (ya existente, sin cambios). Tabla `zonas_envio` (Task 2). `restaurantes.lat`/`lng` (Task 1).
- Produces: `matchZona(restauranteId, destino, queryable = db)` → `Promise<{id, nombre, costo_envio} | null>`. `POST /api/restaurants/:id/cotizar-envio`.

- [ ] **Step 1: Escribir `matchZona`**

`backend/src/utils/zonaEnvioHelper.js`:

```js
const db = require('../config/database');
const { computeRoute } = require('./googleRoutes');

// Matchea la zona de envío activa que cubre la distancia entre el restaurante
// y el destino. Si hay varias zonas cuyo radio alcanza, gana la de radio
// más chico (la más específica); en empate exacto de radio, gana la más vieja.
// Devuelve null si el destino queda fuera de todas las zonas activas,
// o si el restaurante no tiene lat/lng cargado (geocoding pendiente/fallido).
//
// destino: { lat, lng }
// queryable: client de una transacción abierta, o el pool db por defecto
async function matchZona(restauranteId, destino, queryable = db) {
    const restauranteResult = await queryable.query(
        'SELECT lat, lng FROM restaurantes WHERE id = $1',
        [restauranteId]
    );
    const restaurante = restauranteResult.rows[0];
    if (!restaurante || restaurante.lat == null || restaurante.lng == null) {
        return null;
    }

    const { distanceMeters } = await computeRoute({
        origen: { lat: parseFloat(restaurante.lat), lng: parseFloat(restaurante.lng) },
        destino,
    });
    const distanciaKm = distanceMeters / 1000;

    const zonaResult = await queryable.query(
        `SELECT id, nombre, costo_envio FROM zonas_envio
         WHERE restaurante_id = $1 AND activa = true AND radio_km >= $2
         ORDER BY radio_km ASC, id ASC LIMIT 1`,
        [restauranteId, distanciaKm]
    );

    return zonaResult.rows[0] || null;
}

module.exports = { matchZona };
```

- [ ] **Step 2: Agregar el endpoint de cotización**

`backend/src/controllers/restaurantsController.js` — agregar al final del archivo (después de `exports.girarRuleta`, o de la última función existente):

```js
// ── COTIZAR ENVÍO ─────────────────────────────────────────
// POST /api/restaurants/:id/cotizar-envio
// Body: { direccion_id }
exports.cotizarEnvio = async (req, res) => {
    const { id } = req.params;
    const { direccion_id } = req.body;

    if (!direccion_id) {
        return res.status(400).json({ success: false, message: 'direccion_id es requerido' });
    }

    try {
        const direccionResult = await db.query(
            'SELECT latitud, longitud FROM direcciones_usuarios WHERE id = $1 AND usuario_id = $2',
            [direccion_id, req.user.userId]
        );
        const direccion = direccionResult.rows[0];
        if (!direccion) {
            return res.status(404).json({ success: false, message: 'Dirección no encontrada' });
        }
        if (direccion.latitud == null || direccion.longitud == null) {
            return res.status(400).json({ success: false, message: 'Esa dirección no tiene ubicación en el mapa. Volvé a cargarla desde el mapa.' });
        }

        const zona = await matchZona(id, { lat: parseFloat(direccion.latitud), lng: parseFloat(direccion.longitud) });
        if (!zona) {
            return res.status(200).json({ success: false, message: 'No entregamos en tu dirección' });
        }

        res.json({ success: true, zona: { id: zona.id, nombre: zona.nombre, costo_envio: parseFloat(zona.costo_envio) } });
    } catch (error) {
        console.error('Error en cotizarEnvio:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
```

Y agregar el `require` al inicio del archivo. Ubicar:

```js
const db = require('../config/database');
const cache = require('../utils/cache');
const crypto = require('crypto');
```

reemplazar por:

```js
const db = require('../config/database');
const cache = require('../utils/cache');
const crypto = require('crypto');
const { matchZona } = require('../utils/zonaEnvioHelper');
```

- [ ] **Step 3: Agregar la ruta**

`backend/src/routers/restaurants.js` — ubicar:

```js
router.get('/:id/ruleta',            authMiddleware, restaurantsController.getRuleta);
router.post('/:id/ruleta/girar',      authMiddleware, restaurantsController.girarRuleta);

module.exports = router;
```

reemplazar por:

```js
router.get('/:id/ruleta',            authMiddleware, restaurantsController.getRuleta);
router.post('/:id/ruleta/girar',      authMiddleware, restaurantsController.girarRuleta);
router.post('/:id/cotizar-envio',     authMiddleware, restaurantsController.cotizarEnvio);

module.exports = router;
```

- [ ] **Step 4: Verificar con `node --check` y curl**

```bash
cd backend && node --check src/utils/zonaEnvioHelper.js src/controllers/restaurantsController.js src/routers/restaurants.js
```

Expected: sin salida.

Para probar el endpoint hace falta al menos una zona — todavía no existe el CRUD de admin (Task 5), así que se inserta una a mano (throwaway, no rompe nada — la tabla está vacía):

```bash
cd backend && node -e "
require('dotenv').config();
const db = require('./src/config/database');
db.query(\"INSERT INTO zonas_envio (restaurante_id, nombre, radio_km, costo_envio) VALUES (1, 'Zona de prueba', 10, 500)\").then(() => { console.log('OK'); process.exit(0); });
"
```

Con el backend corriendo y un token de cliente con al menos una dirección guardada (con `latitud`/`longitud` no nulos — si no tiene, cargar una desde la app con el mapa):

```bash
TOKEN="token_de_cliente"
curl -s -X POST http://localhost:3000/api/restaurants/1/cotizar-envio \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"direccion_id": 1}'
```

Expected: si la dirección cae dentro de 10km del restaurante 1, `{"success":true,"zona":{"id":...,"nombre":"Zona de prueba","costo_envio":500}}`. Si cae afuera, `{"success":false,"message":"No entregamos en tu dirección"}`.

Borrar la zona de prueba antes de seguir (Task 5 la va a manejar desde el admin):

```bash
cd backend && node -e "
require('dotenv').config();
const db = require('./src/config/database');
db.query(\"DELETE FROM zonas_envio WHERE nombre = 'Zona de prueba'\").then(() => { console.log('OK'); process.exit(0); });
"
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/zonaEnvioHelper.js backend/src/controllers/restaurantsController.js backend/src/routers/restaurants.js
git commit -m "feat(backend): matchear zona de envio por distancia y endpoint de cotizacion"
```

---

### Task 4: Backend — integrar zonas en pedidos y validación de cupones

**Files:**
- Modify: `backend/src/utils/ruletaCuponHelper.js`
- Modify: `backend/src/controllers/ordersController.js`
- Modify: `backend/src/controllers/cuponesController.js`

**Interfaces:**
- Consumes: `matchZona` (Task 3).
- Produces: `evaluarCupon(tipo, valorPremio, subtotal, items, menuItemsInfo, costoEnvio)` — firma nueva, el 6to parámetro es obligatorio para `tipo` `'porcentaje'`/`'envio_gratis'`. `POST /api/orders` ahora requiere `direccion_id` en vez de `direccion_entrega`. `POST /api/cupones/validate` ahora acepta `direccion_id` opcional (requerido si el cupón matcheado es `porcentaje` o `envio_gratis`).

- [ ] **Step 1: `ruletaCuponHelper.js` — recibir `costoEnvio` como parámetro**

Ubicar el archivo completo actual:

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
```

reemplazar el inicio del archivo (hasta ahí) por:

```js
const CATEGORIAS_POR_TIPO = {
    plato_gratis:  ['milanesas', 'platos', 'pastas'],
    postre_gratis: ['dulces', 'helados'],
    '2x1_bebidas': ['bebidas'],
    '2x1_pizzas':  ['pizzas'],
};

// items: [{ menu_item_id, cantidad }]
// menuItemsInfo: Map<string, { precio, categoria }> — las claves DEBEN ser String(id),
// tanto al construir el Map como al buscar acá adentro, porque Postgres devuelve las
// columnas BIGINT como string en node-pg y el JSON del cliente puede mandar el id como
// number — comparar sin normalizar hace que Map.get() falle silenciosamente.
// costoEnvio: el costo de envío de la zona ya matcheada — SOLO se usa (y es
// obligatorio) para tipo 'porcentaje' y 'envio_gratis'; el resto de los tipos
// lo ignoran, pasar 0 ahí es inofensivo.
// Devuelve { valido, mensaje, montoDescuento }
function evaluarCupon(tipo, valorPremio, subtotal, items, menuItemsInfo, costoEnvio) {
    if (tipo === 'porcentaje') {
        const base = subtotal + costoEnvio;
        return { valido: true, montoDescuento: parseFloat((base * (valorPremio / 100)).toFixed(2)) };
    }

    if (tipo === 'envio_gratis') {
        return { valido: true, montoDescuento: costoEnvio };
    }
```

(El resto del archivo — `plato_gratis`/`postre_gratis`/`2x1_*` y el cierre de la función — no cambia.)

Ubicar el `module.exports` final:

```js
module.exports = { evaluarCupon, SHIPPING_FEE, CATEGORIAS_POR_TIPO };
```

reemplazar por:

```js
module.exports = { evaluarCupon, CATEGORIAS_POR_TIPO };
```

- [ ] **Step 2: `ordersController.js` — requerir `direccion_id` y matchear la zona**

Ubicar los imports del archivo:

```js
const db = require('../config/database');
const { sendPushNotification } = require('../services/notificationService');
const { evaluarCupon, SHIPPING_FEE } = require('../utils/ruletaCuponHelper');
```

reemplazar por:

```js
const db = require('../config/database');
const { sendPushNotification } = require('../services/notificationService');
const { evaluarCupon } = require('../utils/ruletaCuponHelper');
const { matchZona } = require('../utils/zonaEnvioHelper');
```

Ubicar la firma de `createOrder`:

```js
exports.createOrder = async (req, res) => {
    const { restaurante_id, items, direccion_entrega, notas, metodo_pago, cupon_codigo } = req.body;
```

reemplazar por:

```js
exports.createOrder = async (req, res) => {
    const { restaurante_id, items, direccion_id, notas, metodo_pago, cupon_codigo } = req.body;
```

Ubicar el bloque de disponibilidad, justo antes de "4. Construir mapa de precios":

```js
        // Verificar disponibilidad
        const unavailable = menuResult.rows.filter(m => !m.disponible);
        if (unavailable.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Los siguientes ítems no están disponibles: ${unavailable.map(i => i.nombre).join(', ')}`
            });
        }

        // 4. Construir mapa de precios y calcular total
```

reemplazar por (se agrega la resolución de dirección y zona entre ambos bloques):

```js
        // Verificar disponibilidad
        const unavailable = menuResult.rows.filter(m => !m.disponible);
        if (unavailable.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Los siguientes ítems no están disponibles: ${unavailable.map(i => i.nombre).join(', ')}`
            });
        }

        // Resolver la dirección de entrega y matchear la zona de envío
        if (!direccion_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Se requiere direccion_id'
            });
        }

        const direccionResult = await client.query(
            'SELECT direccion, ciudad, latitud, longitud FROM direcciones_usuarios WHERE id = $1 AND usuario_id = $2',
            [direccion_id, req.user.userId]
        );
        const direccionRow = direccionResult.rows[0];
        if (!direccionRow) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Dirección no encontrada'
            });
        }
        if (direccionRow.latitud == null || direccionRow.longitud == null) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Esa dirección no tiene ubicación en el mapa. Volvé a cargarla desde el mapa.'
            });
        }

        const zona = await matchZona(
            restaurante_id,
            { lat: parseFloat(direccionRow.latitud), lng: parseFloat(direccionRow.longitud) },
            client
        );
        if (!zona) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'No entregamos en tu dirección'
            });
        }
        const costoEnvio = parseFloat(zona.costo_envio);
        let costoEnvioFinal = costoEnvio;

        // 4. Construir mapa de precios y calcular total
```

Ubicar el cálculo del total con envío:

```js
        // 5. Agregar costo de envío al total antes de aplicar descuentos
        const subtotalSinEnvioOriginal = total;
        total = parseFloat((total + SHIPPING_FEE).toFixed(2));
```

reemplazar por:

```js
        // 5. Agregar costo de envío al total antes de aplicar descuentos
        const subtotalSinEnvioOriginal = total;
        total = parseFloat((total + costoEnvio).toFixed(2));
```

Ubicar el bloque del cupón de ruleta:

```js
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
```

reemplazar por:

```js
                if (cuponRuleta.rows[0]) {
                    const cupon = cuponRuleta.rows[0];
                    const subtotalSinEnvio = parseFloat((total - costoEnvio).toFixed(2));
                    const menuItemsInfo = new Map();
                    for (const [menuId, m] of Object.entries(priceMap)) {
                        menuItemsInfo.set(String(menuId), { precio: parseFloat(m.precio), categoria: m.categoria });
                    }
                    const cartItemsParaEval = items.map(i => ({ menu_item_id: i.menu_item_id, cantidad: i.cantidad }));
                    const evaluacion = evaluarCupon(cupon.tipo, parseFloat(cupon.valor) || 0, subtotalSinEnvio, cartItemsParaEval, menuItemsInfo, costoEnvio);
                    if (evaluacion.valido) {
                        descuento = evaluacion.montoDescuento;
                        total     = parseFloat((total - descuento).toFixed(2));
                        ruletaCuponId = cupon.id;
                        if (cupon.tipo === 'envio_gratis') costoEnvioFinal = 0;
                    }
                }
```

Ubicar el `INSERT` del pedido:

```js
        // 6. Insertar el pedido
        const esEfectivo = metodo_pago === 'efectivo';
        const pedidoResult = await client.query(
            `INSERT INTO pedidos (usuario_id, restaurante_id, estado, total, descuento, direccion_entrega, notas, metodo_pago)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, usuario_id, restaurante_id, estado, total, descuento, direccion_entrega, notas, metodo_pago, fecha_creacion`,
            [req.user.userId, restaurante_id, esEfectivo ? 'en_preparacion' : 'pendiente', total.toFixed(2), descuento.toFixed(2), direccion_entrega || null, notas || null, metodo_pago || 'mercadopago']
        );
```

reemplazar por:

```js
        // 6. Insertar el pedido
        const esEfectivo = metodo_pago === 'efectivo';
        const direccionEntregaTexto = `${direccionRow.direccion}, ${direccionRow.ciudad}`;
        const pedidoResult = await client.query(
            `INSERT INTO pedidos (usuario_id, restaurante_id, estado, total, descuento, direccion_entrega, notas, metodo_pago, zona_envio_id, costo_envio, costo_envio_tarifa_vigente)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id, usuario_id, restaurante_id, estado, total, descuento, direccion_entrega, notas, metodo_pago, zona_envio_id, costo_envio, costo_envio_tarifa_vigente, fecha_creacion`,
            [req.user.userId, restaurante_id, esEfectivo ? 'en_preparacion' : 'pendiente', total.toFixed(2), descuento.toFixed(2), direccionEntregaTexto, notas || null, metodo_pago || 'mercadopago', zona.id, costoEnvioFinal.toFixed(2), costoEnvio.toFixed(2)]
        );
```

- [ ] **Step 3: `cuponesController.js` — el preview de "Aplicar cupón" también necesita `costoEnvio`**

Ubicar los imports:

```js
const db = require('../config/database');
const { evaluarCupon } = require('../utils/ruletaCuponHelper');
```

reemplazar por:

```js
const db = require('../config/database');
const { evaluarCupon } = require('../utils/ruletaCuponHelper');
const { matchZona } = require('../utils/zonaEnvioHelper');
```

Ubicar el bloque entre encontrar el cupón de ruleta y armar el subtotal:

```js
        const cupon = cuponRuleta.rows[0];

        if (!restaurante_id || parseInt(restaurante_id) !== parseInt(cupon.restaurante_id)) {
            return res.status(404).json({ success: false, message: 'Cupón inválido para este restaurante' });
        }

        const cartItems = Array.isArray(items) ? items : [];
```

reemplazar por:

```js
        const cupon = cuponRuleta.rows[0];

        if (!restaurante_id || parseInt(restaurante_id) !== parseInt(cupon.restaurante_id)) {
            return res.status(404).json({ success: false, message: 'Cupón inválido para este restaurante' });
        }

        // 'porcentaje' y 'envio_gratis' necesitan saber el costo de envío real
        // para calcular el descuento — sin dirección todavía no se puede.
        let costoEnvio = 0;
        if (cupon.tipo === 'porcentaje' || cupon.tipo === 'envio_gratis') {
            if (!direccion_id) {
                return res.status(400).json({ success: false, message: 'Seleccioná una dirección de entrega antes de aplicar este cupón' });
            }
            const direccionResult = await db.query(
                'SELECT latitud, longitud FROM direcciones_usuarios WHERE id = $1 AND usuario_id = $2',
                [direccion_id, req.user.userId]
            );
            const direccionRow = direccionResult.rows[0];
            if (!direccionRow || direccionRow.latitud == null || direccionRow.longitud == null) {
                return res.status(400).json({ success: false, message: 'No pudimos ubicar tu dirección. Volvé a seleccionarla.' });
            }
            const zona = await matchZona(restaurante_id, { lat: parseFloat(direccionRow.latitud), lng: parseFloat(direccionRow.longitud) });
            if (!zona) {
                return res.status(400).json({ success: false, message: 'No entregamos en tu dirección' });
            }
            costoEnvio = parseFloat(zona.costo_envio);
        }

        const cartItems = Array.isArray(items) ? items : [];
```

Ubicar la firma de la función y el destructure del body:

```js
exports.validateByCode = async (req, res) => {
    try {
        const { codigo, restaurante_id, items } = req.body;
```

reemplazar por:

```js
exports.validateByCode = async (req, res) => {
    try {
        const { codigo, restaurante_id, items, direccion_id } = req.body;
```

Ubicar la llamada a `evaluarCupon`:

```js
        const evaluacion = evaluarCupon(cupon.tipo, parseFloat(cupon.valor) || 0, subtotal, cartItems, menuItemsInfo);
```

reemplazar por:

```js
        const evaluacion = evaluarCupon(cupon.tipo, parseFloat(cupon.valor) || 0, subtotal, cartItems, menuItemsInfo, costoEnvio);
```

- [ ] **Step 4: Verificar con `node --check`**

```bash
cd backend && node --check src/utils/ruletaCuponHelper.js src/controllers/ordersController.js src/controllers/cuponesController.js
```

Expected: sin salida.

- [ ] **Step 5: Verificar con curl**

Insertar de nuevo una zona de prueba (igual que en Task 3) y confirmar el flujo completo:

```bash
cd backend && node -e "
require('dotenv').config();
const db = require('./src/config/database');
db.query(\"INSERT INTO zonas_envio (restaurante_id, nombre, radio_km, costo_envio) VALUES (1, 'Zona de prueba', 10, 500)\").then(() => { console.log('OK'); process.exit(0); });
"
```

Crear un pedido con `direccion_id` (usar una dirección real de un cliente de prueba, restaurante 1, algún `menu_item_id` real):

```bash
TOKEN="token_de_cliente"
curl -s -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"restaurante_id":1,"items":[{"menu_item_id":1,"cantidad":1}],"direccion_id":1,"metodo_pago":"efectivo"}'
```

Expected: `201`, el pedido devuelto incluye `costo_envio: "500.00"` y `zona_envio_id` con el id de la zona de prueba.

Verificar en la base:

```bash
cd backend && node -e "
require('dotenv').config();
const db = require('./src/config/database');
db.query('SELECT id, zona_envio_id, costo_envio, costo_envio_tarifa_vigente FROM pedidos ORDER BY id DESC LIMIT 1').then(r => {
  console.log(r.rows[0]);
  process.exit(0);
});
"
```

Expected: `costo_envio` y `costo_envio_tarifa_vigente` ambos en `500`.

Probar el rechazo por fuera de zona: bajar el radio de la zona de prueba a algo imposible y repetir el pedido:

```bash
cd backend && node -e "
require('dotenv').config();
const db = require('./src/config/database');
db.query(\"UPDATE zonas_envio SET radio_km = 0.001 WHERE nombre = 'Zona de prueba'\").then(() => { console.log('OK'); process.exit(0); });
"
```

Repetir el `curl` de crear pedido — expected: `400`, `"No entregamos en tu dirección"`, y confirmar que NO se creó un pedido nuevo (mismo `SELECT ... ORDER BY id DESC LIMIT 1` de antes, mismo id que la vez anterior).

Borrar la zona de prueba:

```bash
cd backend && node -e "
require('dotenv').config();
const db = require('./src/config/database');
db.query(\"DELETE FROM zonas_envio WHERE nombre = 'Zona de prueba'\").then(() => { console.log('OK'); process.exit(0); });
"
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/utils/ruletaCuponHelper.js backend/src/controllers/ordersController.js backend/src/controllers/cuponesController.js
git commit -m "feat(backend): usar zona de envio real al crear pedidos y validar cupones"
```

---

### Task 5: Backend admin — CRUD de zonas de envío

**Files:**
- Create: `backend/src/controllers/adminZonasEnvioController.js`
- Modify: `backend/src/routers/admin.js`

**Interfaces:**
- Consumes: tabla `zonas_envio` (Task 2), middleware `requireAdminOwnership` (ya existente).
- Produces: `GET /api/admin/zonas-envio/:restauranteId`, `POST /api/admin/zonas-envio/:restauranteId`, `PUT /api/admin/zonas-envio/:id`.

- [ ] **Step 1: Escribir el controller**

`backend/src/controllers/adminZonasEnvioController.js`:

```js
const db = require('../config/database');

// GET /api/admin/zonas-envio/:restauranteId
// Incluye inactivas — el admin las puede reactivar.
exports.getAll = async (req, res) => {
    const { restauranteId } = req.params;
    try {
        const result = await db.query(
            `SELECT id, nombre, radio_km, costo_envio, activa
             FROM zonas_envio
             WHERE restaurante_id = $1
             ORDER BY radio_km ASC`,
            [restauranteId]
        );
        res.json({ success: true, zonas: result.rows });
    } catch (error) {
        console.error('Error en admin getAll zonas de envio:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// POST /api/admin/zonas-envio/:restauranteId
exports.create = async (req, res) => {
    const { restauranteId } = req.params;
    const { nombre, radio_km, costo_envio } = req.body;

    if (!nombre?.trim() || !radio_km || costo_envio == null) {
        return res.status(400).json({ success: false, message: 'nombre, radio_km y costo_envio son requeridos' });
    }
    if (isNaN(radio_km) || parseFloat(radio_km) <= 0) {
        return res.status(400).json({ success: false, message: 'radio_km debe ser mayor a 0' });
    }
    if (isNaN(costo_envio) || parseFloat(costo_envio) < 0) {
        return res.status(400).json({ success: false, message: 'costo_envio debe ser 0 o mayor' });
    }

    try {
        const existente = await db.query(
            'SELECT id FROM zonas_envio WHERE restaurante_id = $1 AND activa = true AND radio_km = $2',
            [restauranteId, parseFloat(radio_km)]
        );
        if (existente.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Ya existe una zona activa con ese radio exacto' });
        }

        const result = await db.query(
            `INSERT INTO zonas_envio (restaurante_id, nombre, radio_km, costo_envio)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nombre, radio_km, costo_envio, activa`,
            [restauranteId, nombre.trim(), parseFloat(radio_km), parseFloat(costo_envio)]
        );
        res.status(201).json({ success: true, zona: result.rows[0] });
    } catch (error) {
        console.error('Error en create zona de envio:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// PUT /api/admin/zonas-envio/:id
// No hay DELETE — "eliminar" es activa:false, las zonas nunca se borran
// porque hay pedidos historicos que las referencian.
exports.update = async (req, res) => {
    const { id } = req.params;
    const { nombre, radio_km, costo_envio, activa } = req.body;

    if (radio_km !== undefined && (isNaN(radio_km) || parseFloat(radio_km) <= 0)) {
        return res.status(400).json({ success: false, message: 'radio_km debe ser mayor a 0' });
    }
    if (costo_envio !== undefined && (isNaN(costo_envio) || parseFloat(costo_envio) < 0)) {
        return res.status(400).json({ success: false, message: 'costo_envio debe ser 0 o mayor' });
    }

    try {
        const result = await db.query(
            `UPDATE zonas_envio
             SET nombre = COALESCE($1, nombre),
                 radio_km = COALESCE($2, radio_km),
                 costo_envio = COALESCE($3, costo_envio),
                 activa = COALESCE($4, activa)
             WHERE id = $5
             RETURNING id, nombre, radio_km, costo_envio, activa, restaurante_id`,
            [nombre?.trim() || null, radio_km != null ? parseFloat(radio_km) : null, costo_envio != null ? parseFloat(costo_envio) : null, activa ?? null, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Zona no encontrada' });
        }
        res.json({ success: true, zona: result.rows[0] });
    } catch (error) {
        console.error('Error en update zona de envio:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
```

Nota: `requireAdminOwnership` (el middleware de la ruta) solo valida `:restauranteId` en la URL — `PUT /:id` no lo tiene disponible en sus params. Es el mismo patrón exacto que ya usa `platosCtrl.update`/`toggleDisponible` (`router.put('/platos/:id', ...)` sin `requireAdminOwnership` tampoco) — la ruta de creación sí queda protegida por restaurante, y el `id` de una zona ajena simplemente no existe en el resultado del `UPDATE ... WHERE id = $5` si no pertenece al restaurante correcto en la práctica de uso normal del admin panel (no se linkea desde otro restaurante). Coherente con el nivel de protección ya existente en el resto del admin panel para operaciones por `:id`.

- [ ] **Step 2: Agregar las rutas**

`backend/src/routers/admin.js` — ubicar el import de controllers:

```js
const restCtrl     = require('../controllers/adminRestauranteController');
const ruletaCtrl   = require('../controllers/adminRuletaController');
```

reemplazar por:

```js
const restCtrl     = require('../controllers/adminRestauranteController');
const ruletaCtrl   = require('../controllers/adminRuletaController');
const zonasEnvioCtrl = require('../controllers/adminZonasEnvioController');
```

Ubicar el bloque de rutas de Ruleta:

```js
// ── Ruleta ────────────────────────────────────────────────
router.get('/ruleta/:restauranteId', requireAdminOwnership, ruletaCtrl.getInfo);
router.put('/ruleta/:restauranteId', requireAdminOwnership, ruletaCtrl.updateInfo);
```

reemplazar por (agrega el bloque nuevo justo después):

```js
// ── Ruleta ────────────────────────────────────────────────
router.get('/ruleta/:restauranteId', requireAdminOwnership, ruletaCtrl.getInfo);
router.put('/ruleta/:restauranteId', requireAdminOwnership, ruletaCtrl.updateInfo);

// ── Zonas de envío ────────────────────────────────────────
router.get('/zonas-envio/:restauranteId',  requireAdminOwnership, zonasEnvioCtrl.getAll);
router.post('/zonas-envio/:restauranteId', requireAdminOwnership, zonasEnvioCtrl.create);
router.put('/zonas-envio/:id',             zonasEnvioCtrl.update);
```

- [ ] **Step 3: Verificar con `node --check` y curl**

```bash
cd backend && node --check src/controllers/adminZonasEnvioController.js src/routers/admin.js
```

Expected: sin salida.

```bash
ADMIN_TOKEN="token_de_admin_del_restaurante_1"
curl -s -X POST http://localhost:3000/api/admin/zonas-envio/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"nombre":"Zona centro","radio_km":3,"costo_envio":500}'

curl -s http://localhost:3000/api/admin/zonas-envio/1 -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected: el `POST` devuelve `201` con la zona creada; el `GET` devuelve un array con esa zona incluida.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/adminZonasEnvioController.js backend/src/routers/admin.js
git commit -m "feat(backend): CRUD de zonas de envio para el admin"
```

---

### Task 6: Frontend admin — pantalla de zonas de envío

**Files:**
- Create: `frontend/screens/admin/AdminZonasEnvioScreen.js`
- Modify: `frontend/navigation/ProfileStack.js`
- Modify: `frontend/screens/admin/AdminDashboardScreen.js`
- Modify: `frontend/services/api.js`

**Interfaces:**
- Consumes: `GET/POST /api/admin/zonas-envio/:restauranteId`, `PUT /api/admin/zonas-envio/:id` (Task 5).
- Produces: nada consumido por Task 7.

- [ ] **Step 1: Agregar los métodos al cliente de API**

`frontend/services/api.js` — ubicar el bloque de `ruleta` dentro de `admin`:

```js
    ruleta: {
        getInfo: (restauranteId) => request(`/api/admin/ruleta/${restauranteId}`),
        updateInfo: (restauranteId, data) => request(`/api/admin/ruleta/${restauranteId}`, { method: 'PUT', body: JSON.stringify(data) }),
    },
```

reemplazar por:

```js
    ruleta: {
        getInfo: (restauranteId) => request(`/api/admin/ruleta/${restauranteId}`),
        updateInfo: (restauranteId, data) => request(`/api/admin/ruleta/${restauranteId}`, { method: 'PUT', body: JSON.stringify(data) }),
    },
    zonasEnvio: {
        getAll: (restauranteId) => request(`/api/admin/zonas-envio/${restauranteId}`),
        create: (restauranteId, data) => request(`/api/admin/zonas-envio/${restauranteId}`, { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => request(`/api/admin/zonas-envio/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    },
```

- [ ] **Step 2: Escribir la pantalla**

`frontend/screens/admin/AdminZonasEnvioScreen.js`:

```js
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Switch, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/common/AppHeader';
import { showSuccessMessage, showErrorMessage } from '../../components/FlashMessageWrapper';
import API from '../../services/api';
import { useAppSelector } from '../../store/hooks';

export default function AdminZonasEnvioScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const restaurante = useAppSelector(s => s.restaurant.selected);
    const [zonas, setZonas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [nombre, setNombre] = useState('');
    const [radioKm, setRadioKm] = useState('');
    const [costoEnvio, setCostoEnvio] = useState('');

    const load = useCallback(async () => {
        if (!restaurante) return;
        setLoading(true);
        try {
            const res = await API.admin.zonasEnvio.getAll(restaurante.id);
            if (res.success) setZonas(res.zonas);
        } catch {
            showErrorMessage('Error', 'No se pudieron cargar las zonas de envío');
        } finally {
            setLoading(false);
        }
    }, [restaurante]);

    useEffect(() => { load(); }, [load]);

    const handleCrear = async () => {
        if (!nombre.trim() || !radioKm.trim() || !costoEnvio.trim()) {
            showErrorMessage('Faltan datos', 'Completá nombre, radio y costo');
            return;
        }
        setSaving(true);
        try {
            const res = await API.admin.zonasEnvio.create(restaurante.id, {
                nombre: nombre.trim(),
                radio_km: parseFloat(radioKm),
                costo_envio: parseFloat(costoEnvio),
            });
            if (res.success) {
                showSuccessMessage('Zona creada', `${res.zona.nombre} — hasta ${res.zona.radio_km}km`);
                setNombre('');
                setRadioKm('');
                setCostoEnvio('');
                load();
            } else {
                showErrorMessage('Error', res.message || 'No se pudo crear la zona');
            }
        } catch {
            showErrorMessage('Error', 'No se pudo crear la zona');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActiva = async (zona) => {
        try {
            const res = await API.admin.zonasEnvio.update(zona.id, { activa: !zona.activa });
            if (res.success) {
                setZonas(prev => prev.map(z => z.id === zona.id ? { ...z, activa: res.zona.activa } : z));
            } else {
                showErrorMessage('Error', res.message || 'No se pudo actualizar la zona');
            }
        } catch {
            showErrorMessage('Error', 'No se pudo actualizar la zona');
        }
    };

    if (loading) {
        return (
            <View style={[styles.root, styles.centered]}>
                <ActivityIndicator size="large" color="#FF8700" />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <AppHeader title="Zonas de envío" subtitle="Costo de envío según distancia" onBack={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}>
                {zonas.length === 0 && (
                    <Text style={styles.emptyText}>Todavía no configuraste ninguna zona. Sin zonas activas, los pedidos se rechazan en el checkout.</Text>
                )}

                {zonas.map(zona => (
                    <View key={zona.id} style={[styles.zonaCard, !zona.activa && styles.zonaCardInactiva]}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.zonaNombre}>{zona.nombre}</Text>
                            <Text style={styles.zonaDetalle}>Hasta {zona.radio_km}km — ${parseFloat(zona.costo_envio).toFixed(2)}</Text>
                        </View>
                        <Switch
                            value={zona.activa}
                            onValueChange={() => handleToggleActiva(zona)}
                            trackColor={{ false: '#ccc', true: '#FFD0A0' }}
                            thumbColor={zona.activa ? '#FF8700' : '#888'}
                        />
                    </View>
                ))}

                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Nueva zona</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre (ej. Zona centro)"
                        value={nombre}
                        onChangeText={setNombre}
                        maxLength={40}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Radio en km (ej. 3)"
                        value={radioKm}
                        onChangeText={(text) => setRadioKm(text.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Costo de envío (ej. 500)"
                        value={costoEnvio}
                        onChangeText={(text) => setCostoEnvio(text.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={handleCrear} disabled={saving}>
                        {saving ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                                <Text style={styles.addBtnText}>Agregar zona</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F5' },
    centered: { alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 18 },
    zonaCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    },
    zonaCardInactiva: { opacity: 0.5 },
    zonaNombre: { fontSize: 15, fontWeight: '600', color: '#222' },
    zonaDetalle: { fontSize: 13, color: '#888', marginTop: 2 },
    formCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 8,
    },
    formTitle: { fontSize: 13, color: '#888', marginBottom: 8, fontWeight: '600' },
    input: {
        borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 12,
    },
    addBtn: {
        flexDirection: 'row', gap: 6, backgroundColor: '#FF8700', borderRadius: 16,
        paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    },
    addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
```

- [ ] **Step 3: Registrar la pantalla en la navegación**

`frontend/navigation/ProfileStack.js` — ubicar los imports de screens admin:

```js
import AdminRuletaScreen from '../screens/admin/AdminRuletaScreen';
import AdminPlatosScreen from '../screens/admin/AdminPlatosScreen';
```

reemplazar por:

```js
import AdminRuletaScreen from '../screens/admin/AdminRuletaScreen';
import AdminPlatosScreen from '../screens/admin/AdminPlatosScreen';
import AdminZonasEnvioScreen from '../screens/admin/AdminZonasEnvioScreen';
```

Ubicar los `Stack.Screen` correspondientes:

```js
            <Stack.Screen name="AdminRuleta" component={AdminRuletaScreen} />
            <Stack.Screen name="AdminPlatos" component={AdminPlatosScreen} />
```

reemplazar por:

```js
            <Stack.Screen name="AdminRuleta" component={AdminRuletaScreen} />
            <Stack.Screen name="AdminPlatos" component={AdminPlatosScreen} />
            <Stack.Screen name="AdminZonasEnvio" component={AdminZonasEnvioScreen} />
```

- [ ] **Step 4: Agregar la tarjeta en el dashboard de admin**

`frontend/screens/admin/AdminDashboardScreen.js` — ubicar la tarjeta de ruleta dentro del array `CARDS`:

```js
    {
        key: 'ruleta',
        screen: 'AdminRuleta',
        title: 'Ruleta de premios',
        subtitle: 'Activala y configurá los premios',
        icon: 'sync-outline',
        colors: ['#D84315', '#FF7043'],
    },
```

reemplazar por (agrega la tarjeta nueva justo después):

```js
    {
        key: 'ruleta',
        screen: 'AdminRuleta',
        title: 'Ruleta de premios',
        subtitle: 'Activala y configurá los premios',
        icon: 'sync-outline',
        colors: ['#D84315', '#FF7043'],
    },
    {
        key: 'zonas-envio',
        screen: 'AdminZonasEnvio',
        title: 'Zonas de envío',
        subtitle: 'Costo de envío según distancia',
        icon: 'map-outline',
        colors: ['#00838F', '#00ACC1'],
    },
```

- [ ] **Step 5: Verificar compilación**

```bash
cd frontend && node -e "
const babel = require('@babel/core');
['screens/admin/AdminZonasEnvioScreen.js','navigation/ProfileStack.js','screens/admin/AdminDashboardScreen.js','services/api.js'].forEach(f => {
  babel.transformFileSync(f, { presets: ['babel-preset-expo'], plugins: ['react-native-reanimated/plugin'] });
  console.log('OK:', f);
});
"
```

Expected: `OK:` para los 4 archivos.

- [ ] **Step 6: Verificación manual en Expo**

1. Como admin, entrar a "Zonas de envío" desde el dashboard.
2. Crear una zona ("Centro", 3km, $500) — debe aparecer en la lista.
3. Crear una segunda zona ("Extendida", 8km, $800).
4. Apagar el switch de "Centro" — debe quedar atenuada visualmente, y seguir apareciendo (no desaparece de la lista).
5. Recargar la pantalla (salir y volver a entrar) — el estado de los switches debe persistir.

- [ ] **Step 7: Commit**

```bash
git add frontend/screens/admin/AdminZonasEnvioScreen.js frontend/navigation/ProfileStack.js frontend/screens/admin/AdminDashboardScreen.js frontend/services/api.js
git commit -m "feat(admin): pantalla de zonas de envio"
```

---

### Task 7: Frontend carrito — cotización dinámica de envío

**Files:**
- Modify: `frontend/services/api.js`
- Modify: `frontend/screens/cart/CartScreen.js`

**Interfaces:**
- Consumes: `POST /api/restaurants/:id/cotizar-envio` (Task 3), `POST /api/orders` con `direccion_id` (Task 4), `POST /api/cupones/validate` con `direccion_id` (Task 4).
- Produces: nada consumido por otras tareas — es la última.

- [ ] **Step 1: Agregar `cotizarEnvio` y actualizar `orders.create`/`cupones.validate` en `api.js`**

Ubicar el objeto `restaurants`:

```js
    getRuleta: (id) => request(`/api/restaurants/${id}/ruleta`),

    girarRuleta: (id) => request(`/api/restaurants/${id}/ruleta/girar`, { method: 'POST' }),
};
```

reemplazar por:

```js
    getRuleta: (id) => request(`/api/restaurants/${id}/ruleta`),

    girarRuleta: (id) => request(`/api/restaurants/${id}/ruleta/girar`, { method: 'POST' }),

    cotizarEnvio: (id, direccionId) => request(`/api/restaurants/${id}/cotizar-envio`, {
        method: 'POST',
        body: JSON.stringify({ direccion_id: direccionId }),
    }),
};
```

Ubicar `orders.create`:

```js
const orders = {
    create: (restauranteId, items, direccionEntrega, notas, metodoPago, cuponCodigo) => request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
            restaurante_id: restauranteId,
            items,
            direccion_entrega: direccionEntrega,
            notas,
            metodo_pago: metodoPago || 'mercadopago',
            ...(cuponCodigo ? { cupon_codigo: cuponCodigo } : {}),
        }),
    }),
```

reemplazar por:

```js
const orders = {
    create: (restauranteId, items, direccionId, notas, metodoPago, cuponCodigo) => request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
            restaurante_id: restauranteId,
            items,
            direccion_id: direccionId,
            notas,
            metodo_pago: metodoPago || 'mercadopago',
            ...(cuponCodigo ? { cupon_codigo: cuponCodigo } : {}),
        }),
    }),
```

Ubicar `cupones.validate`:

```js
    validate: (codigo, restauranteId, items) => request('/api/cupones/validate', {
        method: 'POST',
        body: JSON.stringify({ codigo, restaurante_id: restauranteId, items }),
    }),
```

reemplazar por:

```js
    validate: (codigo, restauranteId, items, direccionId) => request('/api/cupones/validate', {
        method: 'POST',
        body: JSON.stringify({ codigo, restaurante_id: restauranteId, items, direccion_id: direccionId }),
    }),
```

- [ ] **Step 2: `CartScreen.js` — cotizar al cambiar de dirección**

Ubicar los estados de dirección:

```js
    const [addresses, setAddresses] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
```

reemplazar por:

```js
    const [addresses, setAddresses] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [envioInfo, setEnvioInfo] = useState(null); // { costoEnvio, zonaNombre } | { fueraDeZona: true } | null (cotizando)
```

Ubicar `calculateTotal`:

```js
    const calculateTotal = () => {
        return calculateSubtotal() - calculateDiscount() + 2.99;
    };
```

reemplazar por:

```js
    const calculateTotal = () => {
        return calculateSubtotal() - calculateDiscount() + (envioInfo?.costoEnvio ?? 0);
    };
```

Agregar el `useEffect` de cotización, justo después del `useEffect` que carga direcciones (`useEffect(() => { loadAddresses(); checkPendingOrder(); }, []);`):

```js
    useEffect(() => {
        loadAddresses();
        checkPendingOrder();
    }, []);

    useEffect(() => {
        if (!selectedAddress || !selectedRestaurant) {
            setEnvioInfo(null);
            return;
        }
        let cancelado = false;
        (async () => {
            try {
                const res = await API.restaurants.cotizarEnvio(selectedRestaurant.id, selectedAddress.id);
                if (cancelado) return;
                if (res.success) {
                    setEnvioInfo({ costoEnvio: res.zona.costo_envio, zonaNombre: res.zona.nombre });
                } else {
                    setEnvioInfo({ fueraDeZona: true });
                }
            } catch {
                if (!cancelado) setEnvioInfo({ fueraDeZona: true });
            }
        })();
        return () => { cancelado = true; };
    }, [selectedAddress, selectedRestaurant]);
```

- [ ] **Step 3: Mandar `direccion_id` en vez de `direccion_entrega`**

Ubicar (aparece en `handleMercadoPagoPayment`):

```js
            const orderRes = await API.orders.create(
                selectedRestaurant.id,
                orderItems,
                selectedAddress ? `${selectedAddress.direccion}, ${selectedAddress.ciudad}` : 'Dirección registrada',
                '',
                undefined,
                couponApplied && couponHabilitado ? couponCode : null
            );
```

reemplazar por:

```js
            const orderRes = await API.orders.create(
                selectedRestaurant.id,
                orderItems,
                selectedAddress?.id,
                '',
                undefined,
                couponApplied && couponHabilitado ? couponCode : null
            );
```

Ubicar (la misma llamada, en `handleEfectivoPayment`):

```js
            const orderRes = await API.orders.create(
                selectedRestaurant.id,
                orderItems,
                selectedAddress ? `${selectedAddress.direccion}, ${selectedAddress.ciudad}` : 'Dirección registrada',
                '',
                'efectivo',
                couponApplied && couponHabilitado ? couponCode : null
            );
```

reemplazar por:

```js
            const orderRes = await API.orders.create(
                selectedRestaurant.id,
                orderItems,
                selectedAddress?.id,
                '',
                'efectivo',
                couponApplied && couponHabilitado ? couponCode : null
            );
```

- [ ] **Step 4: Pasar `direccion_id` a `cupones.validate` (los dos call sites)**

Ubicar (en `handleApplyCoupon`):

```js
            const items = cartItems.map(item => ({ menu_item_id: item.id, cantidad: item.quantity }));
            const res = await API.cupones.validate(couponCode.trim(), selectedRestaurant?.id, items);
            if (res.success) {
```

reemplazar por:

```js
            const items = cartItems.map(item => ({ menu_item_id: item.id, cantidad: item.quantity }));
            const res = await API.cupones.validate(couponCode.trim(), selectedRestaurant?.id, items, selectedAddress?.id);
            if (res.success) {
```

Ubicar (en el `useEffect` de re-validación):

```js
        const revalidar = async () => {
            try {
                const items = cartItems.map(item => ({ menu_item_id: item.id, cantidad: item.quantity }));
                const res = await API.cupones.validate(couponCode.trim(), selectedRestaurant?.id, items);
```

reemplazar por:

```js
        const revalidar = async () => {
            try {
                const items = cartItems.map(item => ({ menu_item_id: item.id, cantidad: item.quantity }));
                const res = await API.cupones.validate(couponCode.trim(), selectedRestaurant?.id, items, selectedAddress?.id);
```

Y su dependencia — ubicar el cierre del mismo `useEffect`:

```js
        revalidar();
    }, [cartItems, couponApplied, couponEsRuleta]);
```

reemplazar por (agrega `selectedAddress?.id` — si el cliente cambia de dirección y sale de la zona, un cupón `envio_gratis` aplicado tiene que re-evaluarse):

```js
        revalidar();
    }, [cartItems, couponApplied, couponEsRuleta, selectedAddress?.id]);
```

- [ ] **Step 5: JSX — mostrar el costo real y bloquear si está fuera de zona**

Ubicar el resumen de envío:

```jsx
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Envio</Text>
                                <Text style={styles.summaryValue}>$2.99</Text>
                            </View>
```

reemplazar por:

```jsx
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Envio</Text>
                                {envioInfo?.fueraDeZona ? (
                                    <Text style={[styles.summaryValue, { color: '#E53935' }]}>No disponible</Text>
                                ) : (
                                    <Text style={styles.summaryValue}>
                                        {envioInfo ? `$${envioInfo.costoEnvio.toFixed(2)}` : '—'}
                                    </Text>
                                )}
                            </View>
                            {envioInfo?.fueraDeZona && (
                                <Text style={styles.couponDisabledText}>No entregamos en esta dirección</Text>
                            )}
```

(Reusa el estilo `couponDisabledText` — ya existente en el archivo, texto rojo chico, mismo que usa el aviso de cupón pausado.)

Ubicar los dos botones de pago:

```jsx
                        <TouchableOpacity
                            style={[styles.efectivoButton, (loadingEfectivo || loadingMP || !selectedAddress || !!pendingOrderId) && styles.buttonDisabled]}
                            onPress={handleEfectivoPayment}
                            disabled={loadingEfectivo || loadingMP || !selectedAddress || !!pendingOrderId}
                        >
```

reemplazar por:

```jsx
                        <TouchableOpacity
                            style={[styles.efectivoButton, (loadingEfectivo || loadingMP || !selectedAddress || !!pendingOrderId || !envioInfo || envioInfo.fueraDeZona) && styles.buttonDisabled]}
                            onPress={handleEfectivoPayment}
                            disabled={loadingEfectivo || loadingMP || !selectedAddress || !!pendingOrderId || !envioInfo || envioInfo.fueraDeZona}
                        >
```

Y:

```jsx
                        <TouchableOpacity
                            style={[styles.payButton, (loadingMP || loadingEfectivo || !selectedAddress || !!pendingOrderId) && styles.buttonDisabled]}
                            onPress={handleMercadoPagoPayment}
                            disabled={loadingMP || loadingEfectivo || !selectedAddress || !!pendingOrderId}
                            accessibilityLabel={`Pagar $${calculateTotal().toFixed(2)}`}
                            accessibilityRole="button"
                        >
```

reemplazar por:

```jsx
                        <TouchableOpacity
                            style={[styles.payButton, (loadingMP || loadingEfectivo || !selectedAddress || !!pendingOrderId || !envioInfo || envioInfo.fueraDeZona) && styles.buttonDisabled]}
                            onPress={handleMercadoPagoPayment}
                            disabled={loadingMP || loadingEfectivo || !selectedAddress || !!pendingOrderId || !envioInfo || envioInfo.fueraDeZona}
                            accessibilityLabel={`Pagar $${calculateTotal().toFixed(2)}`}
                            accessibilityRole="button"
                        >
```

- [ ] **Step 6: Verificar compilación**

```bash
cd frontend && node -e "
const babel = require('@babel/core');
babel.transformFileSync('screens/cart/CartScreen.js', { presets: ['babel-preset-expo'], plugins: ['react-native-reanimated/plugin'] });
babel.transformFileSync('services/api.js', { presets: ['babel-preset-expo'] });
console.log('OK');
"
```

Expected: `OK`.

- [ ] **Step 7: Verificación manual en Expo**

Requiere al menos una zona real creada desde Task 6 en el restaurante que se prueba.

1. Entrar al carrito con una dirección dentro del radio de una zona — el envío debe mostrar el costo de esa zona (no $2.99), y los botones de pago deben estar habilitados.
2. Cambiar a una dirección fuera de todas las zonas (o sin zonas configuradas para ese restaurante) — el envío debe decir "No disponible" / "No entregamos en esta dirección", y los botones de pago deben quedar deshabilitados.
3. Confirmar un pedido con dirección dentro de zona — verificar en la base que `pedidos.zona_envio_id`/`costo_envio`/`costo_envio_tarifa_vigente` quedaron completos.
4. Aplicar un cupón de envío gratis (si hay uno de prueba disponible) — el resumen debe mostrar `Envio: $0.00` en el total pero la fila de "Envio" en el resumen debe seguir mostrando el costo real de la zona tachado o el descuento aplicado (comportamiento visual ya existente del cupón, sin cambios de diseño acá — solo confirmar que el número final es correcto).

- [ ] **Step 8: Commit**

```bash
git add frontend/services/api.js frontend/screens/cart/CartScreen.js
git commit -m "feat(cart): cotizar envio real por zona y bloquear pago fuera de cobertura"
```
