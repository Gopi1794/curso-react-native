# Tracking en Vivo + Reseñas Post-Entrega — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar mapa de tracking con repartidor animado y sistema de reseñas post-entrega a la app de delivery "Tu App Food".

**Architecture:** Nueva pantalla `OrderTrackingScreen` con Google Maps + polling cada 10s a un endpoint nuevo de backend que simula el movimiento del repartidor interpolando coordenadas. Al recibir el pedido, `OrderDetailScreen` muestra un `ReviewBottomSheet` que envía calificaciones al endpoint de comentarios ya existente.

**Tech Stack:** React Native 0.81 + Expo 54, react-native-maps (ya instalado), Node.js/Express 5, PostgreSQL (Supabase)

---

## Mapa de archivos

| Archivo | Acción |
|---|---|
| `backend/src/controllers/ordersController.js` | Modificar — agregar `getTracking`, `updateStatus` |
| `backend/src/routers/orders.js` | Modificar — registrar 2 rutas nuevas |
| `frontend/app.json` | Modificar — agregar Google Maps API key |
| `frontend/services/api.js` | Modificar — agregar `orders.getTracking()`, `orders.updateStatus()` |
| `frontend/navigation/OrdersStack.js` | Modificar — registrar `OrderTrackingScreen` |
| `frontend/screens/OrderTrackingScreen.js` | Crear — pantalla de mapa con polling |
| `frontend/screens/OrderDetailScreen.js` | Modificar — botón "Ver en mapa" + card de calificación |
| `frontend/components/ReviewBottomSheet.js` | Crear — modal de reseñas |

---

## Task 1: Migración SQL — columna `fecha_en_camino`

**Files:**
- Modify: `backend/src/controllers/ordersController.js` (se usa en Task 3)

- [ ] **Step 1: Ejecutar la migración en Supabase**

Ir al SQL Editor de Supabase (dashboard → SQL Editor) y ejecutar:

```sql
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_en_camino TIMESTAMP;
```

Verificar con:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'pedidos' AND column_name = 'fecha_en_camino';
```

Resultado esperado: una fila con `fecha_en_camino | timestamp without time zone`.

---

## Task 2: Backend — `getTracking` controller

**Files:**
- Modify: `backend/src/controllers/ordersController.js`

- [ ] **Step 1: Agregar la función `getTracking` al final del archivo**

En `backend/src/controllers/ordersController.js`, agregar después de `exports.cancelOrder`:

```js
// ── GET ORDER TRACKING ─────────────────────────────────────
// GET /api/orders/:id/tracking
const RESTAURANTE_COORDS = { lat: -34.6100, lng: -58.3900 };
const DESTINO_COORDS     = { lat: -34.5980, lng: -58.3750 };

exports.getTracking = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID de pedido inválido' });
        }

        const result = await db.query(
            `SELECT p.estado, p.fecha_en_camino
             FROM pedidos p
             WHERE p.id = $1 AND p.usuario_id = $2`,
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        const { estado, fecha_en_camino } = result.rows[0];

        const minutosTranscurridos = fecha_en_camino
            ? (Date.now() - new Date(fecha_en_camino)) / 60000
            : 0;
        const progress = Math.min(minutosTranscurridos / 20, 0.95);

        const repartidorLat = RESTAURANTE_COORDS.lat + (DESTINO_COORDS.lat - RESTAURANTE_COORDS.lat) * progress;
        const repartidorLng = RESTAURANTE_COORDS.lng + (DESTINO_COORDS.lng - RESTAURANTE_COORDS.lng) * progress;

        res.json({
            success: true,
            estado,
            repartidor: {
                nombre: 'Carlos Méndez',
                rating: '4.8',
                lat: repartidorLat,
                lng: repartidorLng,
            },
            restaurante: RESTAURANTE_COORDS,
            destino: DESTINO_COORDS,
        });

    } catch (error) {
        console.error('Error en getTracking:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
```

- [ ] **Step 2: Verificar manualmente**

Con el backend corriendo (`npm run dev` en `backend/`), tener un pedido en DB con cualquier estado y ejecutar:

```bash
curl -H "Authorization: Bearer TU_TOKEN" http://localhost:3000/api/orders/1/tracking
```

Resultado esperado:
```json
{
  "success": true,
  "estado": "pendiente",
  "repartidor": { "nombre": "Carlos Méndez", "rating": "4.8", "lat": -34.61, "lng": -58.39 },
  "restaurante": { "lat": -34.61, "lng": -58.39 },
  "destino": { "lat": -34.598, "lng": -58.375 }
}
```

---

## Task 3: Backend — `updateStatus` controller

**Files:**
- Modify: `backend/src/controllers/ordersController.js`

- [ ] **Step 1: Agregar la función `updateStatus` al final del archivo**

En `backend/src/controllers/ordersController.js`, agregar después de `exports.getTracking`:

```js
// ── UPDATE ORDER STATUS (demo/dev only) ────────────────────
// PUT /api/orders/:id/status
// Body: { "estado": "en_camino" }
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const VALID_STATES = ['pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado'];
        if (!estado || !VALID_STATES.includes(estado)) {
            return res.status(400).json({ success: false, message: `Estado inválido. Válidos: ${VALID_STATES.join(', ')}` });
        }

        const query = estado === 'en_camino'
            ? `UPDATE pedidos SET estado = $1, fecha_en_camino = NOW() WHERE id = $2 RETURNING id, estado, fecha_en_camino`
            : `UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING id, estado`;

        const result = await db.query(query, [estado, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        res.json({ success: true, order: result.rows[0] });

    } catch (error) {
        console.error('Error en updateStatus:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
```

- [ ] **Step 2: Verificar manualmente**

```bash
curl -X PUT http://localhost:3000/api/orders/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{"estado":"en_camino"}'
```

Resultado esperado:
```json
{ "success": true, "order": { "id": 1, "estado": "en_camino", "fecha_en_camino": "2026-04-27T..." } }
```

---

## Task 4: Backend — registrar las 2 rutas nuevas

**Files:**
- Modify: `backend/src/routers/orders.js`

- [ ] **Step 1: Agregar las rutas al router**

Reemplazar el contenido de `backend/src/routers/orders.js`:

```js
const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/',              ordersController.createOrder);
router.get('/',               ordersController.getMyOrders);
router.get('/:id',            ordersController.getOrderById);
router.get('/:id/tracking',   ordersController.getTracking);
router.put('/:id/cancel',     ordersController.cancelOrder);
router.put('/:id/status',     ordersController.updateStatus);

module.exports = router;
```

- [ ] **Step 2: Reiniciar el backend y verificar que no hay errores en consola**

```bash
# En la carpeta backend/
npm run dev
```

Resultado esperado: `Server running on port 3000` sin errores de sintaxis.

- [ ] **Step 3: Commit backend**

```bash
git add backend/src/controllers/ordersController.js backend/src/routers/orders.js
git commit -m "feat: add getTracking and updateStatus endpoints for order tracking"
```

---

## Task 5: Configurar Google Maps API Key

**Files:**
- Modify: `frontend/app.json`

- [ ] **Step 1: Obtener la API key**

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto o usar uno existente
3. Habilitar **Maps SDK for Android** (APIs & Services → Library → buscar "Maps SDK for Android" → Enable)
4. Ir a APIs & Services → Credentials → Create Credentials → API Key
5. Copiar la key generada (formato: `AIzaSy...`)

- [ ] **Step 2: Agregar la key a `frontend/app.json`**

Buscar el bloque `"android"` dentro de `"expo"` en `frontend/app.json` y agregar `config.googleMaps`:

```json
{
  "expo": {
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "config": {
        "googleMaps": {
          "apiKey": "TU_API_KEY_AQUI"
        }
      }
    }
  }
}
```

> **Nota:** En iOS, `react-native-maps` usa Apple Maps por defecto (no necesita key). Si querés Google Maps en iOS también, agregar el equivalente bajo el bloque `"ios"`.

- [ ] **Step 3: Rebuildar la app**

Con Expo en modo desarrollo necesitás un build nativo para que Maps funcione:

```bash
# En frontend/
npx expo run:android
```

> **Alternativa rápida:** Si usás Expo Go, Maps **no funciona** — necesitás un development build o el emulador con `npx expo run:android`.

---

## Task 6: API client — métodos de tracking

**Files:**
- Modify: `frontend/services/api.js`

- [ ] **Step 1: Agregar `getTracking` y `updateStatus` al objeto `orders`**

En `frontend/services/api.js`, en el bloque `const orders = { ... }`, agregar después de `cancel`:

```js
    getTracking: (id) => request(`/api/orders/${id}/tracking`),

    updateStatus: (id, estado) => request(`/api/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ estado }),
    }),
```

El bloque `orders` completo queda:

```js
const orders = {
    create: (restauranteId, items, direccionEntrega, notas) => request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
            restaurante_id: restauranteId,
            items,
            direccion_entrega: direccionEntrega,
            notas,
        }),
    }),

    getAll: () => request('/api/orders'),

    getById: (id) => request(`/api/orders/${id}`),

    cancel: (id) => request(`/api/orders/${id}/cancel`, { method: 'PUT' }),

    getTracking: (id) => request(`/api/orders/${id}/tracking`),

    updateStatus: (id, estado) => request(`/api/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ estado }),
    }),
};
```

---

## Task 7: Navegación — registrar `OrderTrackingScreen`

**Files:**
- Modify: `frontend/navigation/OrdersStack.js`

- [ ] **Step 1: Agregar la pantalla al stack**

Reemplazar el contenido de `frontend/navigation/OrdersStack.js`:

```js
import { createStackNavigator } from '@react-navigation/stack';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import FoodDetailScreen from '../screens/FoodDetailScreen';

const Stack = createStackNavigator();

export default function OrdersStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="OrdersMain"      component={OrdersScreen} />
            <Stack.Screen name="OrderDetail"     component={OrderDetailScreen} />
            <Stack.Screen name="OrderTracking"   component={OrderTrackingScreen} />
            <Stack.Screen name="FoodDetail"      component={FoodDetailScreen} />
        </Stack.Navigator>
    );
}
```

---

## Task 8: Crear `OrderTrackingScreen`

**Files:**
- Create: `frontend/screens/OrderTrackingScreen.js`

- [ ] **Step 1: Crear el archivo con el componente completo**

Crear `frontend/screens/OrderTrackingScreen.js`:

```js
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, AnimatedRegion, MarkerAnimated } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import API from '../services/api';

const ORANGE = '#ff8700';

const STEP_KEYS   = ['pendiente', 'preparando', 'en_camino', 'entregado'];
const STEP_LABELS = ['Aceptado', 'Preparando', 'Recogido', 'Entregado'];
const STEP_ICONS  = ['cube-outline', 'restaurant-outline', 'bicycle-outline', 'bag-check-outline'];

function Stepper({ estado }) {
    const activeIndex = STEP_KEYS.indexOf(estado);
    return (
        <View style={{ paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {STEP_LABELS.map((_, i) => {
                    const done   = i < activeIndex;
                    const active = i === activeIndex;
                    const bg     = done || active ? ORANGE : '#e8e8e8';
                    return (
                        <React.Fragment key={i}>
                            <View style={{
                                width: 36, height: 36, borderRadius: 18,
                                backgroundColor: bg,
                                justifyContent: 'center', alignItems: 'center',
                            }}>
                                {done   && <Ionicons name="checkmark"    size={18} color="#fff" />}
                                {active && <Ionicons name={STEP_ICONS[i]} size={16} color="#fff" />}
                                {!done && !active && <Ionicons name={STEP_ICONS[i]} size={16} color="#bbb" />}
                            </View>
                            {i < STEP_LABELS.length - 1 && (
                                <View style={{ flex: 1, height: 3, backgroundColor: i < activeIndex ? ORANGE : '#e8e8e8' }} />
                            )}
                        </React.Fragment>
                    );
                })}
            </View>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
                {STEP_LABELS.map((label, i) => (
                    <React.Fragment key={i}>
                        <Text style={{
                            width: 36, textAlign: 'center', fontSize: 9,
                            fontFamily: 'Poppins-Regular',
                            color: i <= activeIndex ? '#333' : '#bbb',
                        }}>{label}</Text>
                        {i < STEP_LABELS.length - 1 && <View style={{ flex: 1 }} />}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );
}

const STATUS_TEXT = {
    pendiente:  { title: 'Pedido recibido',       subtitle: 'El restaurante está confirmando tu pedido' },
    preparando: { title: 'Preparando tu pedido',  subtitle: 'El repartidor espera en el restaurante' },
    en_camino:  { title: 'En camino',             subtitle: 'Tu pedido está llegando' },
    entregado:  { title: '¡Pedido entregado!',    subtitle: '¡Buen provecho!' },
};

function initials(name) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function OrderTrackingScreen({ route, navigation }) {
    const { orderId } = route.params;

    const [trackingData, setTrackingData] = useState(null);
    const [error, setError]               = useState(null);

    const markerCoord = useRef(null);
    const intervalRef = useRef(null);

    const fetchTracking = async () => {
        try {
            const res = await API.orders.getTracking(orderId);
            if (!res.success) { setError('No se pudo cargar el tracking'); return; }

            if (!markerCoord.current) {
                markerCoord.current = new AnimatedRegion({
                    latitude:        res.repartidor.lat,
                    longitude:       res.repartidor.lng,
                    latitudeDelta:   0,
                    longitudeDelta:  0,
                });
            } else {
                markerCoord.current.timing({
                    latitude:       res.repartidor.lat,
                    longitude:      res.repartidor.lng,
                    duration:       800,
                    useNativeDriver: false,
                }).start();
            }

            setTrackingData(res);

            if (res.estado === 'entregado' || res.estado === 'cancelado') {
                clearInterval(intervalRef.current);
                navigation.goBack();
            }
        } catch {
            setError('Error de conexión');
        }
    };

    useEffect(() => {
        fetchTracking();
        intervalRef.current = setInterval(fetchTracking, 10000);
        return () => clearInterval(intervalRef.current);
    }, [orderId]);

    if (error) {
        return (
            <View style={[styles.container, styles.center]}>
                <Ionicons name="cloud-offline-outline" size={48} color="#999" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchTracking}>
                    <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!trackingData) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={ORANGE} />
                <Text style={styles.loadingText}>Cargando mapa...</Text>
            </View>
        );
    }

    const { repartidor, restaurante, destino, estado } = trackingData;
    const statusInfo = STATUS_TEXT[estado] || STATUS_TEXT.pendiente;

    const midLat = (restaurante.lat + destino.lat) / 2;
    const midLng = (restaurante.lng + destino.lng) / 2;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Botón volver flotante */}
            <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="arrow-back" size={20} color="#333" />
            </TouchableOpacity>

            {/* Mapa */}
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                    latitude:      midLat,
                    longitude:     midLng,
                    latitudeDelta:  0.04,
                    longitudeDelta: 0.04,
                }}
            >
                {/* Pin restaurante */}
                <Marker
                    coordinate={{ latitude: restaurante.lat, longitude: restaurante.lng }}
                    title="Restaurante"
                >
                    <View style={styles.pinRestaurante}>
                        <Ionicons name="storefront" size={16} color="#fff" />
                    </View>
                </Marker>

                {/* Pin destino */}
                <Marker
                    coordinate={{ latitude: destino.lat, longitude: destino.lng }}
                    title="Tu dirección"
                >
                    <View style={styles.pinDestino}>
                        <Ionicons name="home" size={16} color="#fff" />
                    </View>
                </Marker>

                {/* Pin repartidor animado */}
                {markerCoord.current && (
                    <MarkerAnimated
                        coordinate={markerCoord.current}
                        title={repartidor.nombre}
                    >
                        <View style={styles.pinRepartidor}>
                            <Text style={styles.pinInitials}>{initials(repartidor.nombre)}</Text>
                        </View>
                    </MarkerAnimated>
                )}

                {/* Ruta */}
                <Polyline
                    coordinates={[
                        { latitude: restaurante.lat, longitude: restaurante.lng },
                        { latitude: repartidor.lat,  longitude: repartidor.lng },
                        { latitude: destino.lat,     longitude: destino.lng },
                    ]}
                    strokeColor={ORANGE}
                    strokeWidth={3}
                    lineDashPattern={[6, 4]}
                />
            </MapView>

            {/* Panel inferior */}
            <View style={styles.panel}>
                <Text style={styles.panelTitle}>{statusInfo.title}</Text>
                <Text style={styles.panelSubtitle}>{statusInfo.subtitle}</Text>

                <View style={styles.stepperWrap}>
                    <Stepper estado={estado} />
                </View>

                {/* Card repartidor */}
                <View style={styles.driverCard}>
                    <View style={styles.driverAvatar}>
                        <Text style={styles.driverInitials}>{initials(repartidor.nombre)}</Text>
                    </View>
                    <View style={styles.driverInfo}>
                        <Text style={styles.driverName}>{repartidor.nombre}</Text>
                        <View style={styles.driverRatingRow}>
                            <Ionicons name="star" size={12} color={ORANGE} />
                            <Text style={styles.driverRating}>{repartidor.rating} · {statusInfo.subtitle}</Text>
                        </View>
                    </View>
                    <View style={styles.driverActions}>
                        <TouchableOpacity style={styles.driverBtn}>
                            <Ionicons name="call-outline" size={20} color={ORANGE} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.driverBtn}>
                            <Ionicons name="chatbubble-ellipses-outline" size={20} color={ORANGE} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center:    { justifyContent: 'center', alignItems: 'center', gap: 12 },

    backBtn: {
        position: 'absolute',
        top: (StatusBar.currentHeight || 40) + 8,
        left: 16,
        zIndex: 100,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
    },

    map: { flex: 1 },

    // Pins
    pinRestaurante: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#444',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    pinDestino: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#34C759',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    pinRepartidor: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: ORANGE,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#fff',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
    },
    pinInitials: { fontFamily: 'Poppins-Bold', color: '#fff', fontSize: 14 },

    // Panel
    panel: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: 32,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 10,
    },
    panelTitle:    { fontFamily: 'Poppins-Bold', fontSize: 18, color: '#111', marginBottom: 4 },
    panelSubtitle: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#888', marginBottom: 16 },
    stepperWrap:   { marginBottom: 16 },

    // Driver card
    driverCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f8f8f8', borderRadius: 16, padding: 12,
    },
    driverAvatar: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: ORANGE,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    driverInitials: { fontFamily: 'Poppins-Bold', color: '#fff', fontSize: 16 },
    driverInfo:  { flex: 1 },
    driverName:  { fontFamily: 'Poppins-SemiBold', color: '#111', fontSize: 15 },
    driverRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    driverRating: { fontFamily: 'Poppins-Regular', color: '#888', fontSize: 12 },
    driverActions: { flexDirection: 'row', gap: 8 },
    driverBtn: {
        width: 40, height: 40, borderRadius: 20,
        borderWidth: 1.5, borderColor: ORANGE,
        justifyContent: 'center', alignItems: 'center',
    },

    // Error / loading
    errorText:   { fontFamily: 'Poppins-Regular', color: '#666', fontSize: 14, textAlign: 'center' },
    loadingText: { fontFamily: 'Poppins-Regular', color: '#888', fontSize: 13, marginTop: 8 },
    retryBtn:    { backgroundColor: ORANGE, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
    retryText:   { fontFamily: 'Poppins-Bold', color: '#fff', fontSize: 14 },
});
```

- [ ] **Step 2: Verificar que el archivo se creó sin errores de sintaxis**

```bash
# En frontend/
npx expo start
```

Si hay errores de sintaxis aparecen en la terminal de Metro. Resultado esperado: Metro bundler corre sin errores en rojo.

---

## Task 9: Modificar `OrderDetailScreen` — botón "Ver en mapa"

**Files:**
- Modify: `frontend/screens/OrderDetailScreen.js`

- [ ] **Step 1: Agregar prop `onViewMap` a `DeliveryCard` y el botón**

En `OrderDetailScreen.js`, buscar la función `DeliveryCard` y reemplazarla completa:

```js
function DeliveryCard({ estado, onViewMap }) {
  const showActions = ['preparando', 'en_camino'].includes(estado);
  const showMapBtn  = ['preparando', 'en_camino'].includes(estado);
  const repartidor  = { nombre: 'Carlos Méndez', rating: '4.8' };
  const subtitle    = {
    preparando: 'Pronto saldrá a entregar',
    en_camino:  'En camino hacia vos',
    entregado:  'Pedido entregado',
  }[estado] ?? '';

  return (
    <View style={styles.card}>
      <View style={styles.deliveryRow}>
        <AvatarInitials name={repartidor.nombre} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.deliveryName}>{repartidor.nombre}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={styles.deliverySub}>{subtitle}</Text>
            <Ionicons name="star" size={12} color={ORANGE} />
            <Text style={[styles.deliverySub, { color: '#555' }]}>{repartidor.rating}</Text>
          </View>
        </View>
        {showActions && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={ORANGE} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="call-outline" size={20} color={ORANGE} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {showMapBtn && (
        <TouchableOpacity style={styles.mapBtn} onPress={onViewMap}>
          <Ionicons name="map-outline" size={15} color="#fff" />
          <Text style={styles.mapBtnText}>Ver en mapa</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Agregar los estilos del botón mapa al `StyleSheet`**

En el `StyleSheet.create({...})` del archivo, agregar dentro del objeto:

```js
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: ORANGE,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  mapBtnText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    fontSize: 13,
  },
```

- [ ] **Step 3: Pasar `onViewMap` donde se usa `DeliveryCard`**

En la función principal `OrderDetailScreen`, buscar la línea:

```js
{showDelivery && <DeliveryCard estado={order.estado} />}
```

Reemplazarla por:

```js
{showDelivery && (
  <DeliveryCard
    estado={order.estado}
    onViewMap={() => navigation.navigate('OrderTracking', { orderId: order.id })}
  />
)}
```

- [ ] **Step 4: Verificar**

En la app, navegar a un pedido en estado `preparando` o `en_camino`. Debe aparecer el botón naranja "Ver en mapa" bajo la card del repartidor. Al tocar, debe navegar a `OrderTrackingScreen` (que mostrará el mapa con las coordenadas de Buenos Aires).

Para probar el flow completo, cambiar el estado de un pedido en DB con:

```bash
curl -X PUT http://localhost:3000/api/orders/TU_PEDIDO_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{"estado":"en_camino"}'
```

---

## Task 10: Crear `ReviewBottomSheet`

**Files:**
- Create: `frontend/components/ReviewBottomSheet.js`

- [ ] **Step 1: Crear el componente**

Crear `frontend/components/ReviewBottomSheet.js`:

```js
import React, { useState } from 'react';
import {
    View, Text, Modal, TouchableOpacity, StyleSheet,
    ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../services/api';
import { showSuccessMessage, showErrorMessage } from './FlashMessageWrapper';

const ORANGE = '#ff8700';

function StarRow({ rating, onRate }) {
    return (
        <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => onRate(star)}>
                    <Ionicons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={28}
                        color={ORANGE}
                        style={{ marginHorizontal: 3 }}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
}

export default function ReviewBottomSheet({ visible, onClose, onSubmit, items }) {
    const reviewableItems = (items || []).filter(item => item.menu_item_id);

    const [ratings,    setRatings]    = useState({});
    const [comments,   setComments]   = useState({});
    const [submitting, setSubmitting] = useState(false);

    const setRating  = (id, val) => setRatings(prev  => ({ ...prev, [id]: val }));
    const setComment = (id, val) => setComments(prev => ({ ...prev, [id]: val }));

    const allRated = reviewableItems.length > 0 &&
        reviewableItems.every(item => (ratings[item.menu_item_id] || 0) >= 1);

    const handleSubmit = async () => {
        if (!allRated) {
            showErrorMessage('Faltan calificaciones', 'Dale al menos 1 estrella a cada plato');
            return;
        }
        setSubmitting(true);
        try {
            await Promise.all(
                reviewableItems.map(item =>
                    API.comentarios.create(
                        item.menu_item_id,
                        ratings[item.menu_item_id],
                        (comments[item.menu_item_id] || '').trim() || '¡Muy bueno!'
                    )
                )
            );
            showSuccessMessage('¡Gracias!', 'Tu reseña fue publicada');
            onSubmit();
        } catch {
            showErrorMessage('Error', 'No se pudieron enviar algunas reseñas');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <Text style={styles.title}>Calificá tu pedido</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {reviewableItems.map((item, idx) => (
                            <View
                                key={item.menu_item_id}
                                style={[styles.itemBlock, idx > 0 && styles.itemBorder]}
                            >
                                <Text style={styles.itemName} numberOfLines={1}>
                                    {item.nombre_item}
                                </Text>
                                <StarRow
                                    rating={ratings[item.menu_item_id] || 0}
                                    onRate={val => setRating(item.menu_item_id, val)}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Escribe tu opinión... (opcional)"
                                    placeholderTextColor="#bbb"
                                    value={comments[item.menu_item_id] || ''}
                                    onChangeText={val => setComment(item.menu_item_id, val)}
                                    multiline
                                    numberOfLines={2}
                                />
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitBtn, (!allRated || submitting) && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={!allRated || submitting}
                        >
                            {submitting
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.submitText}>Enviar reseñas</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        maxHeight: '80%',
        paddingBottom: 32,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#ddd',
        alignSelf: 'center', marginTop: 12, marginBottom: 4,
    },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    title:    { fontFamily: 'Poppins-Bold', fontSize: 18, color: '#1a1a1a' },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center', alignItems: 'center',
    },
    list:      { paddingHorizontal: 24, paddingTop: 8 },
    itemBlock: { paddingVertical: 16 },
    itemBorder: { borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    itemName:  { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#111', marginBottom: 8 },
    starRow:   { flexDirection: 'row', marginBottom: 10 },
    input: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12, padding: 12,
        fontFamily: 'Poppins-Regular', fontSize: 13, color: '#333',
        textAlignVertical: 'top',
        borderWidth: 1, borderColor: '#eee',
        minHeight: 60,
    },
    footer: { paddingHorizontal: 24, paddingTop: 16 },
    submitBtn: {
        backgroundColor: ORANGE,
        borderRadius: 20, paddingVertical: 16, alignItems: 'center',
        shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
    },
    submitBtnDisabled: { backgroundColor: '#e0e0e0', shadowOpacity: 0 },
    submitText: { fontFamily: 'Poppins-Bold', color: '#fff', fontSize: 16 },
});
```

---

## Task 11: Modificar `OrderDetailScreen` — card de calificación + `ReviewBottomSheet`

**Files:**
- Modify: `frontend/screens/OrderDetailScreen.js`

- [ ] **Step 1: Importar `ReviewBottomSheet`**

En `OrderDetailScreen.js`, agregar al principio del archivo junto a los otros imports:

```js
import ReviewBottomSheet from '../components/ReviewBottomSheet';
```

- [ ] **Step 2: Agregar estados para la reseña**

Dentro del componente `OrderDetailScreen`, junto a los estados existentes (`order`, `loading`, `error`, etc.), agregar:

```js
const [showReview, setShowReview] = useState(false);
const [reviewDone, setReviewDone] = useState(false);
```

- [ ] **Step 3: Agregar la card de calificación y el `ReviewBottomSheet` al JSX**

En el `ScrollView` del componente, buscar el cierre del bloque `{showTip && <TipSection />}` y agregar inmediatamente después:

```js
          {/* Card de calificación — solo cuando el pedido fue entregado */}
          {order.estado === 'entregado' && (
            <View style={styles.card}>
              {reviewDone ? (
                <View style={styles.reviewDoneRow}>
                  <Ionicons name="checkmark-circle" size={22} color="#34C759" />
                  <Text style={styles.reviewDoneText}>Ya calificaste este pedido</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>¿Cómo estuvo tu pedido?</Text>
                  <Text style={styles.reviewSubtitle}>Contanos tu experiencia con cada plato</Text>
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => setShowReview(true)}
                  >
                    <Ionicons name="star-outline" size={15} color="#fff" />
                    <Text style={styles.reviewBtnText}>Calificar pedido</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
```

- [ ] **Step 4: Agregar `ReviewBottomSheet` fuera del `ScrollView`, antes del `</View>` final**

Buscar el cierre del `ScrollView` (`</ScrollView>`) dentro del bloque del `else` (contenido normal) y agregar antes del `</View>` que cierra el componente:

```js
        <ReviewBottomSheet
          visible={showReview}
          onClose={() => setShowReview(false)}
          onSubmit={() => { setShowReview(false); setReviewDone(true); }}
          items={order?.items || []}
        />
```

- [ ] **Step 5: Agregar los estilos nuevos al `StyleSheet`**

En el `StyleSheet.create({...})`, agregar:

```js
  reviewSubtitle: {
    fontFamily: 'Poppins-Regular',
    color: '#888',
    fontSize: 12,
    marginTop: -6,
    marginBottom: 14,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ORANGE,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignSelf: 'flex-start',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  reviewBtnText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    fontSize: 14,
  },
  reviewDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  reviewDoneText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#34C759',
    fontSize: 14,
  },
```

- [ ] **Step 6: Verificar el flujo completo**

1. Cambiar el estado de un pedido a `entregado`:
```bash
curl -X PUT http://localhost:3000/api/orders/TU_PEDIDO_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{"estado":"entregado"}'
```

2. En la app, abrir `OrderDetailScreen` para ese pedido. Debe aparecer la card "¿Cómo estuvo tu pedido?" con el botón naranja.

3. Tocar "Calificar pedido" → se abre el `ReviewBottomSheet` con los ítems del pedido.

4. Poner estrellas a cada plato → tocar "Enviar reseñas" → flash message "¡Gracias!".

5. El botón se reemplaza por "✓ Ya calificaste este pedido".

6. Abrir `FoodDetailScreen` de uno de los platos pedidos → el comentario debe aparecer en la sección de comentarios.

- [ ] **Step 7: Commit final**

```bash
git add frontend/screens/OrderTrackingScreen.js \
        frontend/screens/OrderDetailScreen.js \
        frontend/components/ReviewBottomSheet.js \
        frontend/navigation/OrdersStack.js \
        frontend/services/api.js \
        frontend/app.json
git commit -m "feat: add live order tracking with animated map and post-delivery review flow"
```

---

## Resumen del flujo completo para probar

```
1. Hacer un pedido nuevo desde la app
2. curl PUT /api/orders/:id/status → "preparando"
   → OrderDetailScreen muestra "Ver en mapa"
3. Tocar "Ver en mapa"
   → OrderTrackingScreen: mapa con pin del repartidor en el restaurante
4. curl PUT /api/orders/:id/status → "en_camino"
   → El pin empieza a moverse cada 10s (interpolación progresiva)
5. curl PUT /api/orders/:id/status → "entregado"
   → OrderTrackingScreen navega de vuelta automáticamente
   → OrderDetailScreen muestra "¿Cómo estuvo tu pedido?"
6. Calificar platos → comentarios aparecen en FoodDetailScreen
```
