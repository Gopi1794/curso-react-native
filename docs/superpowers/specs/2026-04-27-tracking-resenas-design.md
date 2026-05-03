# Diseño: Tracking en Vivo + Reseñas Post-Entrega

**Fecha:** 2026-04-27  
**Proyecto:** Tu App Food  
**Estado:** Aprobado

---

## Contexto

La app ya tiene `OrderDetailScreen` con un stepper visual de estados y `FoodDetailScreen` con sección de comentarios completamente funcional (fetch, submit, delete, rating). El backend de comentarios está 100% implementado (`comentariosController`, `vista_rating_platos`). Lo que falta es:

1. Tracking en vivo con mapa real (el stepper existe pero no hace polling ni tiene mapa).
2. Trigger post-entrega para que el usuario pueda calificar su pedido (los comentarios quedan huérfanos sin un punto de entrada natural).

---

## Arquitectura General

```
OrdersScreen
    └─ OrderDetailScreen          (modificación mínima)
            ├─ Botón "Ver en mapa" ──► OrderTrackingScreen  (NUEVA pantalla)
            │                              └─ Google Maps + pin repartidor animado
            │                              └─ Polling cada 10s al backend
            │
            └─ Cuando estado === 'entregado'
                    └─ Card "¿Cómo estuvo tu pedido?"
                            └─ ReviewBottomSheet  (NUEVO componente Modal)
                                    └─ Rating + comentario por ítem
                                    └─ api.comentarios.create()
                                    └─ Resultado visible en FoodDetailScreen ✓
```

---

## Parte 1: Tracking en Vivo

### Nueva pantalla: `OrderTrackingScreen`

**Archivo:** `frontend/screens/OrderTrackingScreen.js`  
**Params de navegación:** `{ orderId }`  
**Registrar en:** `frontend/navigation/OrdersStack.js`

#### Layout

- **~55% superior:** `MapView` de `react-native-maps` con provider Google
  - `Marker` pin del restaurante (ícono casa/storefront)
  - `Marker` del repartidor: avatar circular naranja con iniciales, animado con `Animated.ValueXY` entre posición anterior y nueva
  - `Marker` del destino (ícono ubicación)
  - `Polyline` trazando la ruta entre los tres puntos
- **~45% inferior:** panel blanco con `borderTopRadius: 24`
  - ETA estimado ("Llega en ~18 min")
  - Subtítulo de estado ("Tu pedido está en camino")
  - Stepper horizontal reutilizando la lógica de `OrderDetailScreen`
  - Card del repartidor: avatar, nombre, rating, botones call/chat (UI únicamente)

#### Polling

```js
useEffect(() => {
  if (['entregado', 'cancelado'].includes(estado)) return;
  const interval = setInterval(fetchTracking, 10000);
  return () => clearInterval(interval);
}, [estado]);
```

- Llama `GET /api/orders/:id/tracking`
- Al recibir nuevas coords, anima el pin del repartidor con `Animated.timing` (duración 800ms)
- Al recibir `estado === 'entregado'`: detiene polling, navega de vuelta (`navigation.goBack()`)

#### Botón de acceso desde OrderDetailScreen

En `OrderDetailScreen`, dentro de la card del repartidor (`DeliveryCard`), agregar:

```
Condición: estado === 'preparando' || estado === 'en_camino'
Componente: TouchableOpacity "Ver en mapa" → navigation.navigate('OrderTracking', { orderId })
```

---

### Backend: Endpoint de tracking

**Archivo:** `backend/src/controllers/ordersController.js`  
**Router:** `backend/src/routers/orders.js`

#### `GET /api/orders/:id/tracking`

Respuesta:
```json
{
  "success": true,
  "estado": "en_camino",
  "repartidor": {
    "nombre": "Carlos Méndez",
    "rating": "4.8",
    "lat": -34.6037,
    "lng": -58.3816
  },
  "restaurante": { "lat": -34.6100, "lng": -58.3900 },
  "destino":     { "lat": -34.5980, "lng": -58.3750 }
}
```

#### Lógica de simulación de coordenadas

```js
// Coords fijas del restaurante (Buenos Aires ejemplo)
const RESTAURANTE_COORDS = { lat: -34.6100, lng: -58.3900 };
const DESTINO_COORDS     = { lat: -34.5980, lng: -58.3750 };

// Si estado === 'preparando', fecha_en_camino es null → progress = 0
// El repartidor aparece en el restaurante esperando el pedido.
// Si estado === 'en_camino', calcular progreso según tiempo transcurrido.
const minutosTranscurridos = fechaEnCamino ? (Date.now() - new Date(fechaEnCamino)) / 60000 : 0;
const progress = Math.min(minutosTranscurridos / 20, 0.95); // nunca llega al 100% solo

const repartidorLat = RESTAURANTE_COORDS.lat + (DESTINO_COORDS.lat - RESTAURANTE_COORDS.lat) * progress;
const repartidorLng = RESTAURANTE_COORDS.lng + (DESTINO_COORDS.lng - RESTAURANTE_COORDS.lng) * progress;
```

Para esto, la tabla `pedidos` necesita una columna `fecha_en_camino TIMESTAMP` que se setea cuando el estado cambia a `en_camino`. Cuando `estado === 'preparando'` el pin del repartidor aparece sobre el restaurante.

#### `PUT /api/orders/:id/status` (solo desarrollo/demo)

Permite cambiar el estado de un pedido para simular el flujo sin un admin real.

```json
// Body: { "estado": "en_camino" }
// Setea fecha_en_camino si el nuevo estado es 'en_camino'
```

---

### Migración SQL requerida

```sql
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_en_camino TIMESTAMP;
```

---

## Parte 2: Reseñas Post-Entrega

### Modificación: `OrderDetailScreen`

Cuando `estado === 'entregado'`, agregar al final del scroll una nueva card:

**Estado inicial:** Botón "⭐ Calificar pedido"  
**Estado post-envío:** Texto "✓ Ya calificaste este pedido" (estado local en React, no persiste en DB)

### Nuevo componente: `ReviewBottomSheet`

**Archivo:** `frontend/components/ReviewBottomSheet.js`  
**Props:** `{ visible, onClose, onSubmit, items }` donde `items` son los `order.items` con `menu_item_id`

#### Layout (Modal igual al sheet de ingredientes existente)

```
Handle ──────────────────
Calificá tu pedido    [✕]
─────────────────────────
🍔 Hamburguesa Clásica
   ★ ★ ★ ★ ☆  (interactivo)
   [ Escribe tu opinión... ] (opcional)
─────────────────────────
🍟 Papas fritas
   ★ ★ ★ ☆ ☆
   [ Escribe tu opinión... ]
─────────────────────────
        [  Enviar reseñas  ]
```

#### Comportamiento

- Solo muestra ítems con `menu_item_id` válido
- Rating mínimo 1 estrella por ítem para habilitar el botón Enviar
- Al presionar Enviar: llama `api.comentarios.create(item.menu_item_id, rating, comentario)` para cada ítem en paralelo con `Promise.all`
- Si alguna falla, muestra error pero no bloquea las demás
- Al terminar: llama `onSubmit()` → `OrderDetailScreen` reemplaza el botón por "✓ Ya calificaste"
- Los comentarios quedan disponibles de inmediato en `FoodDetailScreen` (mismo endpoint)

---

## Archivos a crear

| Archivo | Tipo |
|---|---|
| `frontend/screens/OrderTrackingScreen.js` | Nuevo |
| `frontend/components/ReviewBottomSheet.js` | Nuevo |

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `frontend/navigation/OrdersStack.js` | Registrar `OrderTrackingScreen` |
| `frontend/screens/OrderDetailScreen.js` | Botón "Ver en mapa" + card de calificación |
| `frontend/services/api.js` | Agregar `orders.getTracking()` y `orders.updateStatus()` |
| `backend/src/controllers/ordersController.js` | Agregar `getTracking` y `updateStatus` |
| `backend/src/routers/orders.js` | Registrar nuevas rutas |

## Migración SQL

```sql
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_en_camino TIMESTAMP;
```

---

## Flujo completo de usuario

1. Usuario hace pedido → `OrderDetailScreen` muestra stepper en `pendiente`
2. Estado cambia a `preparando` → aparece botón "Ver en mapa"
3. Usuario toca "Ver en mapa" → `OrderTrackingScreen` con pin del repartidor
4. Estado cambia a `en_camino` → pin empieza a moverse cada 10s
5. Estado llega a `entregado` → tracking navega de vuelta, `OrderDetailScreen` muestra card de calificación
6. Usuario toca "Calificar pedido" → `ReviewBottomSheet` con sus ítems
7. Envía rating/comentario → aparece en `FoodDetailScreen` de cada plato

---

## Lo que NO se construye en este sprint

- GPS real de repartidor (requeriría app de repartidor separada)
- Chat con el repartidor (UI existe, backend no)
- Llamada real (deeplink a teléfono es trivial, se puede agregar después)
- Reseña del restaurante completo (solo por plato, que es lo que soporta el backend actual)
