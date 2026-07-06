# Ruta óptima del repartidor + ETA para el cliente

**Fecha**: 2026-07-06
**Estado**: Aprobado, pendiente de implementación

## Contexto y objetivo

Hoy `RepartidorMapaScreen.js` solo muestra pines de los pedidos y deep-links a Waze/Google Maps para que el repartidor navegue afuera de la app. Se quiere:

1. Trazar dentro de la app el mejor camino (calles reales, no línea recta) desde la posición del repartidor hasta el pedido seleccionado.
2. Mostrarle al repartidor distancia y tiempo estimado a ese pedido.
3. Mostrarle al cliente, en `OrderTrackingScreen.js`, un ETA ("llega en 12 min") — reusando el mismo dato, sin costo adicional.

## Decisión de proveedor: Google Routes API

Se evaluaron costos reales con la calculadora oficial de Google Cloud contra el volumen estimado de este restaurante (3 repartidores, ~20 entregas/día c/u):

| Tier | Uso | Costo mensual |
|---|---|---|
| Compute Routes **Essentials** (sin tráfico en vivo), ruta calculada 1 vez por pedido + recálculos poco frecuentes | ~1.800-3.000/mes | **$0** (dentro del uso gratuito, cubre hasta 10.000/mes) |
| Compute Routes **Pro** (con tráfico en vivo) o recalculando cada 60s mientras viaja | ~27.000-30.000/mes | ~$100/mes |

**Se descartó** el recálculo periódico por tiempo (cada 60s) por su costo. Se adoptó en cambio una estrategia de **recálculo por evento** (ver abajo) que da una sensación de "tiempo real" prácticamente sin costo.

No se necesita traffic-aware routing (tier Pro) para esta primera etapa.

## Arquitectura

```
RepartidorMapaScreen (toca un pedido)
        │
        ▼
API.repartidor.getRuta(pedidoId)
        │
        ▼
POST /api/repartidor/ruta   { pedido_id }
        │
        ▼
rutaController.calcularRuta
        │  1. valida que pedido_id esté asignado al repartidor autenticado (req.user.id)
        │  2. arma origen (posición actual del repartidor) y destino (dirección del pedido)
        │  3. llama a Google Routes API — Compute Routes (Essentials), travelMode DRIVE
        │  4. decodifica el encoded polyline devuelto
        │  5. guarda distancia/duración/timestamp en la tabla pedidos
        ▼
{ success, points: [{lat,lng}...], distanceMeters, durationSeconds }
        │
        ▼
RepartidorMapaScreen: guarda en estado, dibuja <Polyline>, muestra "3.2 km · 9 min" en la card
```

### Recálculo por evento (no por tiempo)

`watchPositionAsync` (ya existente) sigue emitiendo posiciones. En cada una:

1. Se calcula la distancia entre la posición actual y el punto más cercano del polyline guardado (geometría simple en el cliente, sin librería nueva).
2. Si esa distancia es **> 70 metros** → se dispara un nuevo `getRuta` (el repartidor se desvió/dobló mal).
3. Si el ETA local (ver más abajo) está por llegar a cero y el pedido sigue `en_camino` → también se dispara un nuevo `getRuta` (evita que el contador del cliente se quede pegado en 0 si hay demora real).

Ambos disparadores comparten un flag `recalculando` para que no se disparen llamadas superpuestas, y cada respuesta lleva un número de secuencia — si llega una respuesta vieja después de una más nueva, se descarta.

## ETA para el cliente

- Se agregan 3 columnas a `pedidos`: `distancia_metros`, `duracion_segundos`, `eta_calculado_en` (timestamp), rellenadas cada vez que `rutaController.calcularRuta` corre.
- `OrderTrackingScreen.js` sigue haciendo polling cada 10s a `getTracking(orderId)` como hoy — ese endpoint ahora también devuelve esas 3 columnas. **No llama a Google**, solo lee lo que el backend ya calculó.
- El cliente calcula el ETA a mostrar como `eta_calculado_en + duracion_segundos - ahora` en cada render (timestamp real, no un contador que resta con `setInterval`) — así no se desincroniza si la app pasa a segundo plano.

## Endpoints / cambios de API

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/api/repartidor/ruta` | `{ pedido_id }` | `{ success, points, distanceMeters, durationSeconds }` |
| GET | `/api/orders/:id/tracking` (existente, `getTracking`) | — | agrega `distancia_metros`, `duracion_segundos`, `eta_calculado_en` a la respuesta actual |

## Cambios de base de datos

```sql
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS distancia_metros   INT,
  ADD COLUMN IF NOT EXISTS duracion_segundos  INT,
  ADD COLUMN IF NOT EXISTS eta_calculado_en   TIMESTAMP;
```
(Pendiente de ejecutar contra Supabase — no destructivo, solo agrega columnas nullable.)

## Seguridad

- El endpoint `/api/repartidor/ruta` recibe **`pedido_id`, no coordenadas libres**. El controller valida `pedido.repartidor_id === req.user.id` antes de llamar a Google — evita que el endpoint se use como proxy gratuito para gastar el presupuesto de la API.
- `GOOGLE_MAPS_API_KEY` vive solo en `backend/.env`, nunca se envía al cliente.
- La API key en Google Cloud se restringe solo a Routes API (ya configurado por el usuario).

## Componentes a crear/modificar

| Archivo | Cambio |
|---|---|
| `backend/src/controllers/rutaController.js` | **Nuevo.** `calcularRuta(req, res)` |
| `backend/src/routers/repartidor.js` | Agrega `router.post('/ruta', ctrl.calcularRuta)` (usa `ctrl` de `rutaController`, o se agrega a `repartidorController.js` existente — a decidir en el plan) |
| `backend/src/controllers/ordersController.js` (o donde viva `getTracking`) | Agrega las 3 columnas nuevas a la respuesta |
| `database/schema.sql` | Agrega las 3 columnas |
| `frontend/services/api.js` | `repartidor.getRuta(pedidoId)` |
| `frontend/screens/repartidor/RepartidorMapaScreen.js` | Estado `routePolyline`, lógica de desvío/recálculo, `<Polyline>`, card con distancia/tiempo |
| `frontend/screens/orders/OrderTrackingScreen.js` | Mostrar ETA calculado localmente a partir de `eta_calculado_en + duracion_segundos` |
| `frontend/utils/` | Función de decodificación de encoded polyline (algoritmo estándar, sin dependencia nueva) + función de distancia punto-a-polilínea |

## Manejo de errores

Si falla la llamada a Google (sin internet, key inválida, respuesta vacía): no se rompe el flujo — no se dibuja `Polyline`, no se actualiza el ETA, se mantienen pines y los botones de Waze/Google Maps externos que ya funcionan hoy sin cambios.

## Fuera de alcance (para más adelante)

- Traffic-aware routing (tier Pro) — no se necesita todavía.
- Route Optimization API (asignación automática de pedidos a repartidores) — es la "segunda etapa" que se acordó hacer después de probar esta primera.
- Multi-stop (un solo recorrido por todos los pedidos activos del repartidor) — se eligió explícitamente "un pedido a la vez" para esta etapa.

## Pendientes de decisión operativa (no técnica)

- Correr `node database/seed_trevi.js` contra la DB real (pendiente de sesión anterior, no relacionado a este feature pero sigue pendiente).
- Confirmar con el usuario si la API key de Google ya está creada/restringida en su proyecto de Cloud antes de empezar la implementación.
