# Ruta óptima del repartidor + ETA para el cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El repartidor ve el mejor camino real (calles, no línea recta) hacia el pedido seleccionado con distancia/tiempo estimado, y el cliente ve un ETA real en `OrderTrackingScreen`, todo dentro del uso gratuito de Google Routes API gracias a un recálculo por evento (no por tiempo fijo).

**Architecture:** El repartidor reporta su GPS real al backend (nuevo). Al elegir un pedido, el backend llama a Google Routes API (Compute Routes Essentials) una vez, guarda distancia/duración en `pedidos`, y devuelve puntos decodificados para dibujar un `Polyline`. El cliente en `OrderTrackingScreen` lee esos mismos datos guardados (sin llamar a Google) para mostrar un ETA que cuenta regresivo localmente contra un timestamp real.

**Tech Stack:** Node/Express (backend), `fetch` nativo de Node 18+ (sin dependencia nueva), PostgreSQL (`pg`), React Native + `react-native-maps` (`Polyline`), `expo-location` (ya en uso).

## Global Constraints

- Este proyecto no tiene ningún test runner configurado (ni backend ni frontend) — no existe `jest`/`mocha` en ningún `package.json`. Los pasos de verificación de este plan usan `curl` para el backend y comprobación manual en la app para el frontend, no tests automatizados. No se instala un framework de testing como parte de este plan (fuera de alcance).
- `GOOGLE_MAPS_API_KEY` vive solo en `backend/.env`. Nunca se expone al cliente ni se hardcodea en ningún archivo.
- Todas las queries SQL siguen el patrón existente: `db.query(text, params)` desde `backend/src/config/database.js`, nunca concatenar strings con datos del usuario.
- `req.user.userId` es el id numérico del usuario autenticado (confirmado en `repartidorController.js`), `req.user.rol` es el rol.
- Migraciones de columnas nuevas son `ADD COLUMN IF NOT EXISTS` (no destructivas), pero **no se ejecutan automáticamente contra Supabase** — el usuario las corre manualmente, igual que la migración pendiente de cupones de una sesión anterior.

---

### Task 1: Migración de base de datos

**Files:**
- Modify: `database/schema.sql` (agregar columnas al final de las secciones de `usuarios` y `pedidos`, documentativo — no se ejecuta desde acá)
- Create: `database/migrations/2026-07-06-ruta-repartidor.sql`

**Interfaces:**
- Produces: columnas `usuarios.ubicacion_lat`, `usuarios.ubicacion_lng`, `usuarios.ubicacion_actualizada_en`; columnas `pedidos.distancia_metros`, `pedidos.duracion_segundos`, `pedidos.eta_calculado_en`. Todas las tareas siguientes leen/escriben estas columnas por nombre exacto.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- database/migrations/2026-07-06-ruta-repartidor.sql
-- Agrega soporte para ubicación en vivo del repartidor y ETA calculado por pedido.
-- No destructivo: solo ADD COLUMN IF NOT EXISTS.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ubicacion_lat            NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS ubicacion_lng             NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS ubicacion_actualizada_en   TIMESTAMP;

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS distancia_metros    INT,
  ADD COLUMN IF NOT EXISTS duracion_segundos   INT,
  ADD COLUMN IF NOT EXISTS eta_calculado_en    TIMESTAMP;
```

- [ ] **Step 2: Documentar las columnas en schema.sql**

En `database/schema.sql`, dentro del bloque `CREATE TABLE IF NOT EXISTS usuarios (...)` (línea ~11-25), agregar como comentario justo después del cierre:

```sql
-- Columnas agregadas 2026-07-06 (ver database/migrations/2026-07-06-ruta-repartidor.sql):
--   ubicacion_lat, ubicacion_lng, ubicacion_actualizada_en (última posición GPS reportada por el repartidor)
```

Y dentro del bloque de `pedidos` (línea ~234-245), agregar:

```sql
-- Columnas agregadas 2026-07-06 (ver database/migrations/2026-07-06-ruta-repartidor.sql):
--   distancia_metros, duracion_segundos, eta_calculado_en (última ruta calculada con Google Routes API)
```

Esto es solo documentación — `schema.sql` ya estaba desactualizado respecto a la DB real (`repartidor_id` y `fecha_en_camino` tampoco figuran ahí), no se corrige ese drift en este plan.

- [ ] **Step 3: Avisar al usuario que debe correr la migración**

No ejecutar `database/migrations/2026-07-06-ruta-repartidor.sql` automáticamente. Al llegar a este punto, mostrarle el contenido del archivo al usuario y pedir confirmación explícita antes de correrlo contra Supabase (mismo criterio que la migración de cupones pendiente de sesiones anteriores).

- [ ] **Step 4: Commit**

```bash
git add database/migrations/2026-07-06-ruta-repartidor.sql database/schema.sql
git commit -m "feat(db): agregar columnas de ubicacion en vivo y eta de ruta"
```

---

### Task 2: Utilidad backend para Google Routes API

**Files:**
- Create: `backend/src/utils/googleRoutes.js`

**Interfaces:**
- Produces: `async function computeRoute({ origen, destino })` → `{ points: [{lat, lng}, ...], distanceMeters: number, durationSeconds: number }`. Lanza un `Error` con `.message` legible si Google responde con error o sin rutas. Usada por `rutaController.js` (Task 4).
- Consumes: `process.env.GOOGLE_MAPS_API_KEY`.

- [ ] **Step 1: Escribir la función de decodificación de polyline**

```js
// backend/src/utils/googleRoutes.js

// Decodifica un "encoded polyline" de Google (algoritmo estándar, precision 5).
function decodePolyline(encoded) {
    const points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
        let result = 0, shift = 0, byte;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);

        result = 0;
        shift = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);

        points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }

    return points;
}

module.exports = { decodePolyline };
```

- [ ] **Step 2: Verificar la decodificación con un caso conocido**

Correr en la terminal del backend:

```bash
node -e "
const { decodePolyline } = require('./src/utils/googleRoutes');
const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq\`@');
console.log(JSON.stringify(points));
"
```

Expected (caso de ejemplo documentado por Google para este algoritmo):
```
[{"lat":38.5,"lng":-120.2},{"lat":40.7,"lng":-120.95},{"lat":43.252,"lng":-126.453}]
```

- [ ] **Step 3: Escribir `computeRoute` usando la función de decodificación**

Agregar al mismo archivo `backend/src/utils/googleRoutes.js`:

```js
const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

async function computeRoute({ origen, destino }) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        throw new Error('GOOGLE_MAPS_API_KEY no está configurada');
    }

    const response = await fetch(ROUTES_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
            origin: { location: { latLng: { latitude: origen.lat, longitude: origen.lng } } },
            destination: { location: { latLng: { latitude: destino.lat, longitude: destino.lng } } },
            travelMode: 'DRIVE',
        }),
    });

    const data = await response.json();

    if (!response.ok || !data.routes || data.routes.length === 0) {
        throw new Error(data?.error?.message || 'No se pudo calcular la ruta');
    }

    const route = data.routes[0];
    const durationSeconds = parseInt(route.duration.replace('s', ''), 10);

    return {
        points: decodePolyline(route.polyline.encodedPolyline),
        distanceMeters: route.distanceMeters,
        durationSeconds,
    };
}

module.exports = { decodePolyline, computeRoute };
```

- [ ] **Step 4: Verificar `computeRoute` contra la API real**

Requiere `GOOGLE_MAPS_API_KEY` ya configurada en `backend/.env` (paso previo del usuario, fuera de este plan). Correr:

```bash
cd backend
node -e "
require('dotenv').config();
const { computeRoute } = require('./src/utils/googleRoutes');
computeRoute({ origen: { lat: -34.6037, lng: -58.3816 }, destino: { lat: -34.6100, lng: -58.3900 } })
  .then(r => console.log('OK', r.distanceMeters, 'm,', r.durationSeconds, 's,', r.points.length, 'puntos'))
  .catch(e => console.error('FALLO', e.message));
"
```

Expected: `OK <número> m, <número> s, <número> puntos` — si falla con "GOOGLE_MAPS_API_KEY no está configurada", confirmar que `backend/.env` tiene la key antes de continuar.

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/googleRoutes.js
git commit -m "feat(backend): agregar utilidad de Google Routes API con decodificacion de polyline"
```

---

### Task 3: Endpoint para reportar ubicación en vivo del repartidor

**Files:**
- Modify: `backend/src/controllers/repartidorController.js`
- Modify: `backend/src/routers/repartidor.js`

**Interfaces:**
- Produces: `PUT /api/repartidor/ubicacion` — body `{ lat: number, lng: number }` → `{ success: true }`. Actualiza `usuarios.ubicacion_lat/lng/actualizada_en` para `req.user.userId`.
- Consumes: middleware `authMiddleware` + `requireRepartidor` ya existentes en `repartidor.js`.

- [ ] **Step 1: Agregar el controller**

En `backend/src/controllers/repartidorController.js`, agregar al final del archivo:

```js
exports.actualizarUbicacion = async (req, res) => {
    const { lat, lng } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ success: false, message: 'lat y lng son requeridos y deben ser números' });
    }

    try {
        await db.query(
            `UPDATE usuarios SET ubicacion_lat = $1, ubicacion_lng = $2, ubicacion_actualizada_en = NOW()
             WHERE id = $3`,
            [lat, lng, req.user.userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error en actualizarUbicacion:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
```

- [ ] **Step 2: Agregar la ruta**

En `backend/src/routers/repartidor.js`, agregar después de la línea `router.put('/pedidos/:id/cobrar', ctrl.cobrarEfectivo);`:

```js
router.put('/ubicacion',            ctrl.actualizarUbicacion);
```

- [ ] **Step 3: Verificar con curl**

Con el backend corriendo (`npm run dev` en `backend/`) y un token válido de un usuario con `rol='repartidor'`:

```bash
curl -X PUT http://localhost:3000/api/repartidor/ubicacion \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_REPARTIDOR>" \
  -d '{"lat": -34.6037, "lng": -58.3816}'
```

Expected: `{"success":true}`

Verificar en la base:
```sql
SELECT id, ubicacion_lat, ubicacion_lng, ubicacion_actualizada_en FROM usuarios WHERE id = <ID_REPARTIDOR>;
```
Expected: los valores recién enviados, `ubicacion_actualizada_en` con timestamp reciente.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/repartidorController.js backend/src/routers/repartidor.js
git commit -m "feat(backend): endpoint para que el repartidor reporte su ubicacion en vivo"
```

---

### Task 4: Endpoint para calcular la ruta de un pedido

**Files:**
- Create: `backend/src/controllers/rutaController.js`
- Modify: `backend/src/routers/repartidor.js`

**Interfaces:**
- Consumes: `computeRoute` de `backend/src/utils/googleRoutes.js` (Task 2).
- Produces: `POST /api/repartidor/ruta` — body `{ pedido_id: number, destino: { lat: number, lng: number } }` → `{ success: true, points: [{lat,lng}...], distanceMeters, durationSeconds }`.

- [ ] **Step 1: Escribir el controller**

```js
// backend/src/controllers/rutaController.js
const db = require('../config/database');
const { computeRoute } = require('../utils/googleRoutes');

exports.calcularRuta = async (req, res) => {
    const { pedido_id, destino } = req.body;

    if (!pedido_id || !destino || typeof destino.lat !== 'number' || typeof destino.lng !== 'number') {
        return res.status(400).json({ success: false, message: 'pedido_id y destino {lat,lng} son requeridos' });
    }

    try {
        // Validar que el pedido pertenece a este repartidor (evita usar el endpoint como proxy libre)
        const pedidoResult = await db.query(
            `SELECT id FROM pedidos WHERE id = $1 AND repartidor_id = $2`,
            [pedido_id, req.user.userId]
        );
        if (pedidoResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado o no asignado a este repartidor' });
        }

        // Origen: última ubicación reportada por este repartidor (fuente propia, no la del cliente)
        const userResult = await db.query(
            `SELECT ubicacion_lat, ubicacion_lng FROM usuarios WHERE id = $1`,
            [req.user.userId]
        );
        const origenRow = userResult.rows[0];
        if (!origenRow || origenRow.ubicacion_lat == null || origenRow.ubicacion_lng == null) {
            return res.status(400).json({ success: false, message: 'No hay ubicación reportada todavía para este repartidor' });
        }

        const origen = { lat: parseFloat(origenRow.ubicacion_lat), lng: parseFloat(origenRow.ubicacion_lng) };

        const ruta = await computeRoute({ origen, destino });

        await db.query(
            `UPDATE pedidos SET distancia_metros = $1, duracion_segundos = $2, eta_calculado_en = NOW()
             WHERE id = $3`,
            [ruta.distanceMeters, ruta.durationSeconds, pedido_id]
        );

        res.json({
            success: true,
            points: ruta.points,
            distanceMeters: ruta.distanceMeters,
            durationSeconds: ruta.durationSeconds,
        });
    } catch (error) {
        console.error('Error en calcularRuta:', error);
        res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
    }
};
```

- [ ] **Step 2: Agregar la ruta**

En `backend/src/routers/repartidor.js`, agregar:

```js
const rutaCtrl = require('../controllers/rutaController');
```

junto a `const ctrl = require('../controllers/repartidorController');`, y agregar la ruta:

```js
router.post('/ruta',                rutaCtrl.calcularRuta);
```

- [ ] **Step 3: Verificar con curl (flujo completo)**

Primero reportar una ubicación (reusa Task 3), luego:

```bash
curl -X POST http://localhost:3000/api/repartidor/ruta \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_REPARTIDOR>" \
  -d '{"pedido_id": <ID_PEDIDO_ASIGNADO_A_ESTE_REPARTIDOR>, "destino": {"lat": -34.6100, "lng": -58.3900}}'
```

Expected: `{"success":true,"points":[...],"distanceMeters":<num>,"durationSeconds":<num>}`

Probar también el caso de error — un `pedido_id` que no le pertenece a este repartidor:
```bash
curl -X POST http://localhost:3000/api/repartidor/ruta \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_REPARTIDOR>" \
  -d '{"pedido_id": <ID_DE_OTRO_REPARTIDOR>, "destino": {"lat": -34.6100, "lng": -58.3900}}'
```
Expected: `{"success":false,"message":"Pedido no encontrado o no asignado a este repartidor"}` con status 404.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/rutaController.js backend/src/routers/repartidor.js
git commit -m "feat(backend): endpoint para calcular ruta real de un pedido con Google Routes API"
```

---

### Task 5: Reescribir `getTracking` con datos reales

**Files:**
- Modify: `backend/src/controllers/ordersController.js:346-392`

**Interfaces:**
- Produces: `GET /api/orders/:id/tracking` → `{ success, estado, direccionEntrega, repartidor: {nombre, rating, lat, lng}, restaurante: {lat, lng}, distanciaMetros, duracionSegundos, etaCalculadoEn }`. `direccionEntrega` reemplaza al `destino: {lat,lng}` hardcodeado que devolvía antes — la Task 9 lo geocodifica en el cliente (mismo patrón que `RepartidorMapaScreen.js` ya usa con Nominatim).

- [ ] **Step 1: Reemplazar la implementación hardcodeada**

Reemplazar el bloque completo de `exports.getTracking` (líneas 346-392 actuales) por:

```js
exports.getTracking = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID de pedido inválido' });
        }

        const result = await db.query(
            `SELECT p.estado, p.direccion_entrega, p.distancia_metros, p.duracion_segundos, p.eta_calculado_en,
                    rep.nombre AS repartidor_nombre,
                    rep.ubicacion_lat, rep.ubicacion_lng,
                    rest.lat AS restaurante_lat, rest.lng AS restaurante_lng
             FROM pedidos p
             JOIN restaurantes rest ON rest.id = p.restaurante_id
             LEFT JOIN usuarios rep ON rep.id = p.repartidor_id
             WHERE p.id = $1 AND p.usuario_id = $2`,
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        const row = result.rows[0];

        res.json({
            success: true,
            estado: row.estado,
            direccionEntrega: row.direccion_entrega,
            repartidor: {
                nombre: row.repartidor_nombre || 'Repartidor',
                rating: '4.8',
                lat: row.ubicacion_lat != null ? parseFloat(row.ubicacion_lat) : null,
                lng: row.ubicacion_lng != null ? parseFloat(row.ubicacion_lng) : null,
            },
            restaurante: { lat: parseFloat(row.restaurante_lat), lng: parseFloat(row.restaurante_lng) },
            distanciaMetros: row.distancia_metros,
            duracionSegundos: row.duracion_segundos,
            etaCalculadoEn: row.eta_calculado_en,
        });

    } catch (error) {
        console.error('Error en getTracking:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
```

**Nota importante:** esta query asume que la tabla `restaurantes` tiene columnas `lat`/`lng`. Antes de este step, correr:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'restaurantes' AND column_name IN ('lat', 'lng');
```
Si no existen, agregar en la migración de Task 1 (`database/migrations/2026-07-06-ruta-repartidor.sql`):
```sql
ALTER TABLE restaurantes
  ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 7);
```
y cargar manualmente las coordenadas del restaurante Trevi una vez.

Se quita `destino: {lat,lng}` de la respuesta (antes hardcodeado) y se agrega `direccionEntrega` (texto) en su lugar — la Task 9 la geocodifica en el cliente del mismo modo que ya hace `RepartidorMapaScreen.js` con Nominatim, no hace falta duplicar esa lógica en el backend.

- [ ] **Step 2: Verificar con curl**

```bash
curl http://localhost:3000/api/orders/<ID_PEDIDO>/tracking \
  -H "Authorization: Bearer <TOKEN_CLIENTE_DUEÑO_DEL_PEDIDO>"
```

Expected: JSON con `repartidor.lat`/`lng` reales (o `null` si el repartidor todavía no reportó ubicación — no debe romper), y `distanciaMetros`/`duracionSegundos`/`etaCalculadoEn` en `null` hasta que se haya llamado a `/api/repartidor/ruta` para ese pedido al menos una vez.

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/ordersController.js
git commit -m "fix(backend): getTracking usa ubicacion y eta reales en vez de datos hardcodeados"
```

---

### Task 6: Geometría de rutas en el frontend (detección de desvío)

**Files:**
- Create: `frontend/utils/routeGeometry.js`

**Interfaces:**
- Produces: `distanceToPolylineMeters(point, polylinePoints)` → `number` (metros al segmento más cercano). Usada por `RepartidorMapaScreen.js` (Task 8).
- `point` y cada elemento de `polylinePoints`: `{ lat: number, lng: number }`.

- [ ] **Step 1: Escribir la función de distancia**

```js
// frontend/utils/routeGeometry.js

const EARTH_RADIUS_M = 6371000;

function toRad(deg) {
    return (deg * Math.PI) / 180;
}

// Distancia Haversine entre dos puntos, en metros.
function haversineMeters(a, b) {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// Distancia mínima entre `point` y cualquier vértice de `polylinePoints`.
// Aproximación por vértices (no por segmento exacto) — suficiente para
// detectar desvíos de calle a la escala de una entrega urbana.
function distanceToPolylineMeters(point, polylinePoints) {
    if (!polylinePoints || polylinePoints.length === 0) return Infinity;

    let min = Infinity;
    for (const p of polylinePoints) {
        const d = haversineMeters(point, p);
        if (d < min) min = d;
    }
    return min;
}

module.exports = { haversineMeters, distanceToPolylineMeters };
```

- [ ] **Step 2: Verificar con un caso conocido**

```bash
cd frontend
node -e "
const { haversineMeters, distanceToPolylineMeters } = require('./utils/routeGeometry');
// Buenos Aires Obelisco vs Congreso, ~2.9km reales
const obelisco = { lat: -34.6037, lng: -58.3816 };
const congreso = { lat: -34.6095, lng: -58.3924 };
console.log('haversine:', Math.round(haversineMeters(obelisco, congreso)), 'm (esperado ~1100-1300m)');

const polyline = [obelisco, { lat: -34.6060, lng: -58.3860 }, congreso];
console.log('distancia a polyline (punto sobre la ruta):', Math.round(distanceToPolylineMeters({ lat: -34.6060, lng: -58.3861 }, polyline)), 'm (esperado < 20m)');
console.log('distancia a polyline (punto lejos):', Math.round(distanceToPolylineMeters({ lat: -34.65, lng: -58.45 }, polyline)), 'm (esperado > 1000m)');
"
```

Expected: los tres números impresos dentro de los rangos indicados en cada comentario.

- [ ] **Step 3: Commit**

```bash
git add frontend/utils/routeGeometry.js
git commit -m "feat(frontend): utilidad de geometria para deteccion de desvio de ruta"
```

---

### Task 7: Cliente API — nuevas llamadas

**Files:**
- Modify: `frontend/services/api.js:261-266` (objeto `repartidor`)

**Interfaces:**
- Produces: `API.repartidor.getRuta(pedidoId, destino)` → `Promise<{success, points, distanceMeters, durationSeconds}>`; `API.repartidor.updateUbicacion(lat, lng)` → `Promise<{success}>`.
- Consumes: helper `request(endpoint, options)` ya existente en el mismo archivo.

- [ ] **Step 1: Agregar los dos métodos**

En `frontend/services/api.js`, dentro del objeto `const repartidor = { ... }` (línea 261), agregar:

```js
    getRuta: (pedidoId, destino) => request('/api/repartidor/ruta', {
        method: 'POST',
        body: JSON.stringify({ pedido_id: pedidoId, destino }),
    }),
    updateUbicacion: (lat, lng) => request('/api/repartidor/ubicacion', {
        method: 'PUT',
        body: JSON.stringify({ lat, lng }),
    }),
```

- [ ] **Step 2: Verificar manualmente**

Con la app corriendo (`npx expo start`) y logueado como repartidor, en la consola de Metro/RN debugger ejecutar (o agregar un `console.log` temporal en `RepartidorMapaScreen.js` y sacarlo después):

```js
import API from '../../services/api';
API.repartidor.updateUbicacion(-34.6037, -58.3816).then(console.log);
```

Expected: `{success: true}` impreso en consola, sin error de red.

- [ ] **Step 3: Commit**

```bash
git add frontend/services/api.js
git commit -m "feat(frontend): agregar llamadas de API para ruta y ubicacion del repartidor"
```

---

### Task 8: Integrar ruta real en `RepartidorMapaScreen.js`

**Files:**
- Modify: `frontend/screens/repartidor/RepartidorMapaScreen.js`

**Interfaces:**
- Consumes: `API.repartidor.updateUbicacion` y `API.repartidor.getRuta` (Task 7), `distanceToPolylineMeters` (Task 6).

- [ ] **Step 1: Importar las nuevas dependencias**

Al inicio de `RepartidorMapaScreen.js`, agregar:

```js
import { Polyline } from 'react-native-maps'; // agregar a la línea 6 existente: import MapView, { Marker, Circle, Polyline } from 'react-native-maps';
import { distanceToPolylineMeters } from '../../utils/routeGeometry';
```

(Ajustar la línea 6 existente para incluir `Polyline` en el mismo import en vez de duplicarlo.)

- [ ] **Step 2: Agregar estado para la ruta**

Junto a los demás `useState` (cerca de la línea 62-69), agregar:

```js
const [routePoints, setRoutePoints] = useState(null);       // [{latitude, longitude}, ...] para <Polyline>
const [routeInfo, setRouteInfo] = useState(null);           // { distanceMeters, durationSeconds }
const [etaTarget, setEtaTarget] = useState(null);           // Date — cuándo debería llegar, según la última ruta calculada
const recalculandoRef = useRef(false);
const routeRequestSeq = useRef(0);
```

- [ ] **Step 3: Enviar la ubicación al backend en cada actualización de GPS**

Modificar el `useEffect` existente que llama a `Location.watchPositionAsync` (líneas ~72-92): dentro del callback `pos => setLocation(pos.coords)`, agregar el envío al backend sin bloquear:

```js
sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, distanceInterval: 10 },
    pos => {
        setLocation(pos.coords);
        API.repartidor.updateUbicacion(pos.coords.latitude, pos.coords.longitude).catch(() => {});
    }
);
```

- [ ] **Step 4: Función para pedir la ruta**

Agregar esta función dentro del componente, antes del `return`:

```js
const fetchRoute = useCallback(async (pedido) => {
    if (!pedido || !coords[pedido.id]) return;
    const mySeq = ++routeRequestSeq.current;
    recalculandoRef.current = true;
    try {
        const res = await API.repartidor.getRuta(pedido.id, coords[pedido.id]);
        if (mySeq !== routeRequestSeq.current) return; // llegó una respuesta vieja, descartar
        if (res.success) {
            setRoutePoints(res.points.map(p => ({ latitude: p.lat, longitude: p.lng })));
            setRouteInfo({ distanceMeters: res.distanceMeters, durationSeconds: res.durationSeconds });
            setEtaTarget(new Date(Date.now() + res.durationSeconds * 1000));
        }
    } catch {
        // No romper el flujo si Google falla — se mantienen pines y botones de Waze/Google Maps
    } finally {
        if (mySeq === routeRequestSeq.current) recalculandoRef.current = false;
    }
}, [coords]);
```

- [ ] **Step 5: Pedir la ruta al seleccionar un pedido**

Agregar un nuevo `useEffect`, cerca del `useEffect` existente de "Centrar mapa en marcador seleccionado" (línea ~132-139):

```js
useEffect(() => {
    if (selected) fetchRoute(selected);
    else { setRoutePoints(null); setRouteInfo(null); setEtaTarget(null); }
}, [selected, fetchRoute]);
```

- [ ] **Step 6: Detección de desvío y recálculo por ETA próxima a cero**

Agregar otro `useEffect`, que reacciona a cambios en `location`:

```js
useEffect(() => {
    if (!location || !routePoints || !selected || recalculandoRef.current) return;

    const puntoActual = { lat: location.latitude, lng: location.longitude };
    const polylinePlano = routePoints.map(p => ({ lat: p.latitude, lng: p.longitude }));
    const desvioMetros = distanceToPolylineMeters(puntoActual, polylinePlano);

    const etaProximaACero = etaTarget && (etaTarget.getTime() - Date.now()) < 60000;

    if (desvioMetros > 70 || etaProximaACero) {
        fetchRoute(selected);
    }
}, [location, routePoints, selected, etaTarget, fetchRoute]);
```

- [ ] **Step 7: Dibujar el Polyline en el mapa**

Dentro del `<MapView>` (después del bloque de "Pins de pedidos", antes del cierre `</MapView>`, línea ~237):

```jsx
{routePoints && (
    <Polyline
        coordinates={routePoints}
        strokeColor="#FF8700"
        strokeWidth={4}
    />
)}
```

- [ ] **Step 8: Mostrar distancia y tiempo en la card del pedido seleccionado**

Dentro del bloque `{selected && (...)}` (línea ~293), después del `cardRow` que muestra el total (línea ~319-327), agregar:

```jsx
{routeInfo && (
    <View style={styles.cardRow}>
        <Ionicons name="speedometer-outline" size={15} color="#666" />
        <Text style={styles.cardTotal}>
            {(routeInfo.distanceMeters / 1000).toFixed(1)} km · {Math.round(routeInfo.durationSeconds / 60)} min
        </Text>
    </View>
)}
```

- [ ] **Step 9: Verificación manual**

Con `npx expo start`, loguearse como repartidor con al menos un pedido asignado con `direccion_entrega` real:
1. Confirmar que al tocar un pedido aparece una línea naranja siguiendo calles reales (no una línea recta) entre la posición actual y el pedido.
2. Confirmar que la card muestra "X.X km · Y min".
3. Simular movimiento (o moverse físicamente) y confirmar que la ruta no se recalcula constantemente — solo si te alejás notoriamente del camino dibujado.
4. Revisar los logs del backend (`npm run dev`) y confirmar que `/api/repartidor/ubicacion` se llama seguido pero `/api/repartidor/ruta` se llama pocas veces.

- [ ] **Step 10: Commit**

```bash
git add frontend/screens/repartidor/RepartidorMapaScreen.js
git commit -m "feat(frontend): trazar ruta real y recalculo por evento en RepartidorMapaScreen"
```

---

### Task 9: ETA real en `OrderTrackingScreen.js`

**Files:**
- Modify: `frontend/screens/orders/OrderTrackingScreen.js`

**Interfaces:**
- Consumes: `distanciaMetros`, `duracionSegundos`, `etaCalculadoEn` de la respuesta de `API.orders.getTracking` (Task 5).

- [ ] **Step 1: Calcular el ETA a mostrar en cada render**

Cerca de la línea 139 (`const { repartidor, restaurante, destino, estado } = trackingData;`), reemplazar por:

```js
const { repartidor, restaurante, estado, distanciaMetros, duracionSegundos, etaCalculadoEn } = trackingData;

const etaMinutosRestantes = (() => {
    if (!etaCalculadoEn || !duracionSegundos) return null;
    const objetivoMs = new Date(etaCalculadoEn).getTime() + duracionSegundos * 1000;
    const restanteMs = objetivoMs - Date.now();
    return Math.max(1, Math.round(restanteMs / 60000)); // nunca mostrar 0 o negativo
})();
```

Nota: como `destino` ya no viene de `getTracking` (Task 5 lo sacó, era hardcodeado), hay que revisar el resto del archivo — el `Polyline` que dibuja restaurante→repartidor→destino (línea ~202-211) y el cálculo de `midLat`/`midLng` (línea ~142-143) usaban `destino.lat/lng`. Reemplazar esos dos usos por el destino geocodificado desde `direccion_entrega`, igual que ya hace `RepartidorMapaScreen.js` con Nominatim — agregar en este mismo archivo:

```js
const [destinoCoords, setDestinoCoords] = useState(null);

useEffect(() => {
    if (!trackingData?.direccionEntrega || destinoCoords) return;
    (async () => {
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trackingData.direccionEntrega)}&format=json&limit=1`;
            const res = await fetch(url, { headers: { 'User-Agent': 'TuAppFood/1.0' } });
            const data = await res.json();
            if (data.length > 0) {
                setDestinoCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
            }
        } catch {}
    })();
}, [trackingData]);
```

`trackingData.direccionEntrega` ya viene en la respuesta de `getTracking` desde la Task 5. Reemplazar `destino.lat`/`destino.lng` en `midLat`/`midLng` y en el `Polyline` por `destinoCoords?.lat`/`destinoCoords?.lng`, con guarda para no romper mientras `destinoCoords` es `null` (usar `restaurante` como fallback de centro hasta que geocodifique).

- [ ] **Step 2: Mostrar el ETA en la UI**

Cerca de la línea 228-231 (donde se muestra `driverRating`), agregar debajo:

```jsx
{etaMinutosRestantes != null && (
    <Text style={styles.driverRating}>Llega en {etaMinutosRestantes} min</Text>
)}
```

- [ ] **Step 3: Verificación manual**

1. Como repartidor, seleccionar el pedido de un cliente y dejar que se calcule la ruta (Task 8 ya andando) — esto llena `distancia_metros`/`duracion_segundos` en `pedidos`.
2. Como cliente, abrir `OrderTrackingScreen` para ese pedido.
3. Confirmar que aparece "Llega en X min" y que ese número baja con el correr de los minutos sin necesidad de que el repartidor haga nada.
4. Confirmar que nunca muestra "0 min" ni un número negativo (si se acerca a 1, debería quedarse en "1 min" hasta el próximo recálculo real disparado desde `RepartidorMapaScreen.js`).

- [ ] **Step 4: Commit**

```bash
git add frontend/screens/orders/OrderTrackingScreen.js
git commit -m "feat(frontend): mostrar ETA real al cliente en OrderTrackingScreen"
```

---

## Resumen de archivos tocados

| Archivo | Tarea |
|---|---|
| `database/migrations/2026-07-06-ruta-repartidor.sql` | 1 |
| `database/schema.sql` | 1 |
| `backend/src/utils/googleRoutes.js` | 2 |
| `backend/src/controllers/repartidorController.js` | 3 |
| `backend/src/routers/repartidor.js` | 3, 4 |
| `backend/src/controllers/rutaController.js` | 4 |
| `backend/src/controllers/ordersController.js` | 5 |
| `frontend/utils/routeGeometry.js` | 6 |
| `frontend/services/api.js` | 7 |
| `frontend/screens/repartidor/RepartidorMapaScreen.js` | 8 |
| `frontend/screens/orders/OrderTrackingScreen.js` | 9 |
