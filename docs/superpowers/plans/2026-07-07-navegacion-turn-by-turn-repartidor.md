# Modo navegación turn-by-turn para el repartidor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El repartidor toca "Ir" en un pedido y entra a un modo navegación de pantalla completa con instrucciones de giro en texto y voz, cámara que rota según hacia dónde maneja, y detección automática de llegada.

**Architecture:** El backend amplía el field mask de Google Routes API para traer `steps` (instrucciones por tramo). El frontend extrae la lógica de ruta/recálculo ya existente a un hook (`useRepartidorRoute`), le agrega seguimiento de "en qué paso estoy" (client-side, sin llamadas nuevas a Google), y un componente nuevo (`NavigationOverlay`) consume ese estado para la UI de navegación real.

**Tech Stack:** React Native + `react-native-maps` (`MapView.animateCamera`), `expo-location` (`watchHeadingAsync`, ya en uso), `expo-speech` (nuevo, TTS nativo sin costo), Node/Express + Google Routes API (ya integrado).

## Global Constraints

- No hay test runner en este proyecto (ni backend ni frontend) — verificación manual/curl, no tests automatizados.
- El recálculo de ruta sigue disparándose SOLO por evento (desvío >70m del camino trazado, o ETA local por llegar a cero mientras `estado='en_camino'`) — nunca por timer. Este modo navegación NO agrega ningún disparador nuevo de llamadas a Google.
- `GOOGLE_MAPS_API_KEY` sigue solo en `backend/.env`/Render, nunca en el cliente.
- Si el heading del dispositivo no es confiable, o `expo-speech` falla, o Google no devuelve `steps`: el modo navegación debe seguir funcionando en modo degradado (sin rotar cámara / sin voz / sin banner de instrucciones respectivamente), nunca crashear.

---

### Task 1: Backend — `computeRoute` devuelve `steps`

**Files:**
- Modify: `backend/src/utils/googleRoutes.js`

**Interfaces:**
- Produces: `computeRoute({origen, destino})` ahora devuelve `{ points, distanceMeters, durationSeconds, steps }`, donde `steps` es `[{ instruccion: string, distanciaMetros: number, points: [{lat,lng}, ...] }]` (o `[]` si Google no devuelve steps).

- [ ] **Step 1: Ampliar el field mask y parsear los steps**

Reemplazar la función `computeRoute` completa en `backend/src/utils/googleRoutes.js` (líneas 30-66 actuales) por:

```js
const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

function parseSteps(rawSteps) {
    if (!Array.isArray(rawSteps)) return [];
    return rawSteps.map(step => ({
        instruccion: step.navigationInstruction?.instructions || '',
        distanciaMetros: step.distanceMeters || 0,
        points: step.polyline?.encodedPolyline ? decodePolyline(step.polyline.encodedPolyline) : [],
    }));
}

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
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.polyline.encodedPolyline',
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
    const rawSteps = route.legs?.[0]?.steps || [];

    return {
        points: decodePolyline(route.polyline.encodedPolyline),
        distanceMeters: route.distanceMeters,
        durationSeconds,
        steps: parseSteps(rawSteps),
    };
}

module.exports = { decodePolyline, computeRoute };
```

Esto reemplaza desde `const ROUTES_API_URL = ...` hasta el final del archivo (incluye el `module.exports`, que queda igual). La función `decodePolyline` de más arriba en el archivo NO se toca.

- [ ] **Step 2: Verificar con node -e**

Requiere `GOOGLE_MAPS_API_KEY` configurada en `backend/.env` (ya debería estar, de la sesión anterior). Correr:

```bash
cd backend
node -e "
require('dotenv').config();
const { computeRoute } = require('./src/utils/googleRoutes');
computeRoute({ origen: { lat: -34.6037, lng: -58.3816 }, destino: { lat: -34.6100, lng: -58.3900 } })
  .then(r => console.log('OK', r.distanceMeters, 'm,', r.durationSeconds, 's,', r.steps.length, 'steps. Primer step:', r.steps[0]?.instruccion))
  .catch(e => console.error('FALLO', e.message));
"
```

Expected: `OK <número> m, <número> s, <número mayor a 0> steps. Primer step: <alguna instrucción en texto, ej "Head north on..." o similar>` — si `steps.length` es 0 pero el resto funciona, no es necesariamente un error (Google puede no devolver steps en rutas muy cortas), pero confirmar que no rompe nada.

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/googleRoutes.js
git commit -m "feat(backend): computeRoute devuelve steps de navegacion turn-by-turn"
```

---

### Task 2: Backend — `rutaController` pasa `steps` en la respuesta

**Files:**
- Modify: `backend/src/controllers/rutaController.js`

**Interfaces:**
- Consumes: `computeRoute` (Task 1), ahora con `steps` en el resultado.
- Produces: `POST /api/repartidor/ruta` ahora responde `{ success, points, distanceMeters, durationSeconds, steps }`.

- [ ] **Step 1: Agregar `steps` a la respuesta**

En `backend/src/controllers/rutaController.js`, reemplazar el bloque de respuesta (líneas 41-46 actuales):

```js
        res.json({
            success: true,
            points: ruta.points,
            distanceMeters: ruta.distanceMeters,
            durationSeconds: ruta.durationSeconds,
        });
```

por:

```js
        res.json({
            success: true,
            points: ruta.points,
            distanceMeters: ruta.distanceMeters,
            durationSeconds: ruta.durationSeconds,
            steps: ruta.steps,
        });
```

No tocar nada más de la función (la validación de ownership, el UPDATE de `pedidos`, el manejo de errores quedan exactamente igual).

- [ ] **Step 2: Verificar con curl**

Con el backend corriendo y un token de repartidor válido con ubicación ya reportada (`PUT /api/repartidor/ubicacion` primero si hace falta):

```bash
curl -X POST http://localhost:3000/api/repartidor/ruta \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_REPARTIDOR>" \
  -d '{"pedido_id": <ID_PEDIDO_ASIGNADO>, "destino": {"lat": -34.6100, "lng": -58.3900}}'
```

Expected: la respuesta JSON incluye un array `"steps"` (puede estar vacío `[]` en rutas muy cortas, pero el campo debe existir).

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/rutaController.js
git commit -m "feat(backend): exponer steps de navegacion en la respuesta de calcularRuta"
```

---

### Task 3: Frontend — hook `useRepartidorRoute` (extrae lógica existente + agrega seguimiento de paso)

**Files:**
- Create: `frontend/hooks/useRepartidorRoute.js`

**Interfaces:**
- Consumes: `API.repartidor.getRuta(pedidoId, destino)` (ya existe en `frontend/services/api.js`), `distanceToPolylineMeters`, `haversineMeters` (ya existen en `frontend/utils/routeGeometry.js`).
- Produces: `useRepartidorRoute({ location, coords, selected })` → `{ routePoints, routeInfo, etaTarget, steps, stepActualIndex }`. `routePoints` es `[{latitude, longitude}, ...]` (formato `react-native-maps`). `steps` es `[{instruccion, distanciaMetros, points: [{lat,lng},...]}, ...]` o `null`. `stepActualIndex` es el índice del `step` actual dentro de `steps` (0 si no hay steps).

Este hook reemplaza, sin cambiar el comportamiento, la lógica que hoy vive inline en `frontend/screens/repartidor/RepartidorMapaScreen.js` (los estados `routePoints`/`routeInfo`/`etaTarget`, la función `fetchRoute`, y los dos `useEffect` de "pedir ruta al seleccionar" y "detección de desvío/recálculo"). Task 4 lo conecta a la pantalla.

- [ ] **Step 1: Crear el hook**

```js
// frontend/hooks/useRepartidorRoute.js
import { useState, useRef, useCallback, useEffect } from 'react';
import API from '../services/api';
import { distanceToPolylineMeters, haversineMeters } from '../utils/routeGeometry';

const DESVIO_MAX_METROS = 70;
const ETA_CERCA_DE_CERO_MS = 60000;
const DISTANCIA_FIN_STEP_METROS = 25;

export function useRepartidorRoute({ location, coords, selected }) {
    const [routePoints, setRoutePoints] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [etaTarget, setEtaTarget] = useState(null);
    const [steps, setSteps] = useState(null);
    const [stepActualIndex, setStepActualIndex] = useState(0);
    const recalculandoRef = useRef(false);
    const routeRequestSeq = useRef(0);

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
                setSteps(res.steps && res.steps.length > 0 ? res.steps : null);
                setStepActualIndex(0);
            }
        } catch {
            // No romper el flujo si Google falla — se mantienen pines y botones de Waze/Google Maps
        } finally {
            if (mySeq === routeRequestSeq.current) recalculandoRef.current = false;
        }
    }, [coords]);

    // ── Pedir la ruta al seleccionar un pedido ────────────
    useEffect(() => {
        if (selected) fetchRoute(selected);
        else {
            setRoutePoints(null);
            setRouteInfo(null);
            setEtaTarget(null);
            setSteps(null);
            setStepActualIndex(0);
        }
    }, [selected, fetchRoute]);

    // ── Detección de desvío y recálculo por ETA próxima a cero ──
    useEffect(() => {
        if (!location || !routePoints || !selected || recalculandoRef.current) return;

        const puntoActual = { lat: location.latitude, lng: location.longitude };
        const polylinePlano = routePoints.map(p => ({ lat: p.latitude, lng: p.longitude }));
        const desvioMetros = distanceToPolylineMeters(puntoActual, polylinePlano);

        const etaProximaACero = etaTarget && (etaTarget.getTime() - Date.now()) < ETA_CERCA_DE_CERO_MS && selected.estado === 'en_camino';

        if (desvioMetros > DESVIO_MAX_METROS || etaProximaACero) {
            fetchRoute(selected);
        }
    }, [location, routePoints, selected, etaTarget, fetchRoute]);

    // ── Avance del paso actual (client-side, sin llamar a Google) ──
    useEffect(() => {
        if (!location || !steps || steps.length === 0) return;
        if (stepActualIndex >= steps.length - 1) return;

        const step = steps[stepActualIndex];
        if (!step.points || step.points.length === 0) return;

        const puntoActual = { lat: location.latitude, lng: location.longitude };
        const finStep = step.points[step.points.length - 1];
        const distanciaAlFinDelStep = haversineMeters(puntoActual, finStep);

        if (distanciaAlFinDelStep < DISTANCIA_FIN_STEP_METROS) {
            setStepActualIndex(i => i + 1);
        }
    }, [location, steps, stepActualIndex]);

    return { routePoints, routeInfo, etaTarget, steps, stepActualIndex };
}
```

- [ ] **Step 2: Verificar sintaxis**

```bash
cd frontend
node --check hooks/useRepartidorRoute.js
```

Expected: sin salida (exit code 0). Este chequeo solo valida sintaxis JS/JSX, no ejecuta el hook (usa imports de React/RN que no corren fuera de la app) — la verificación de comportamiento real es la Task 4, cuando se conecta a la pantalla.

- [ ] **Step 3: Commit**

```bash
git add frontend/hooks/useRepartidorRoute.js
git commit -m "feat(frontend): hook useRepartidorRoute con seguimiento de paso actual"
```

---

### Task 4: Frontend — `RepartidorMapaScreen.js` usa el hook (refactor sin cambio de comportamiento)

**Files:**
- Modify: `frontend/screens/repartidor/RepartidorMapaScreen.js`

**Interfaces:**
- Consumes: `useRepartidorRoute` (Task 3).

Este task es un refactor puro: saca del componente los estados `routePoints`/`routeInfo`/`etaTarget`, la función `fetchRoute`, los refs `recalculandoRef`/`routeRequestSeq`, y los dos `useEffect` de ruta/recálculo (todo lo que ahora vive en el hook), y los reemplaza por una sola llamada al hook. El resto de la pantalla (mapa, pines, card, botones de Waze/Google Maps) NO cambia en este task — la Task 6 agrega el botón "Ir" y el overlay.

- [ ] **Step 1: Reemplazar el import de `distanceToPolylineMeters` y agregar el del hook**

Cambiar (línea 13 actual):

```js
import { distanceToPolylineMeters } from '../../utils/routeGeometry';
```

por:

```js
import { useRepartidorRoute } from '../../hooks/useRepartidorRoute';
```

(`distanceToPolylineMeters` ya no se usa directamente en este archivo — ahora vive dentro del hook.)

- [ ] **Step 2: Sacar los estados y refs que pasan al hook**

Eliminar del bloque de `useState`/`useRef` (líneas 71-75 actuales) estas líneas:

```js
    const [routePoints, setRoutePoints] = useState(null);       // [{latitude, longitude}, ...] para <Polyline>
    const [routeInfo, setRouteInfo] = useState(null);           // { distanceMeters, durationSeconds }
    const [etaTarget, setEtaTarget] = useState(null);           // Date — cuándo debería llegar, según la última ruta calculada
    const recalculandoRef = useRef(false);
    const routeRequestSeq = useRef(0);
```

No eliminar ningún otro `useState`/`useRef` de ese bloque (`location`, `locationError`, `pedidos`, `coords`, `selected`, `loading`, `geocoding`, `topBlockHeight` quedan igual).

- [ ] **Step 3: Eliminar `fetchRoute` y los dos `useEffect` que ahora vive en el hook**

Eliminar completo el bloque (líneas 150-189 actuales, desde el comentario `// ── Pedir la ruta al backend (Google Directions) ──────` hasta el cierre del segundo `useEffect` de detección de desvío):

```js
    // ── Pedir la ruta al backend (Google Directions) ──────
    const fetchRoute = useCallback(async (pedido) => {
        ...
    }, [coords]);

    // ── Pedir la ruta al seleccionar un pedido ────────────
    useEffect(() => {
        ...
    }, [selected, fetchRoute]);

    // ── Detección de desvío y recálculo por ETA próxima a cero ──
    useEffect(() => {
        ...
    }, [location, routePoints, selected, etaTarget, fetchRoute]);
```

- [ ] **Step 4: Llamar al hook en el mismo lugar donde estaba ese bloque**

En el lugar donde estaba el bloque eliminado en el Step 3, agregar:

```js
    const { routePoints, routeInfo } = useRepartidorRoute({ location, coords, selected });
```

Solo se desestructuran `routePoints`/`routeInfo` porque son los únicos que usa el archivo hasta este task — la Task 6 va a ampliar esta misma línea para agregar `etaTarget`, `steps` y `stepActualIndex` cuando los necesite.

- [ ] **Step 5: Verificar que el resto del archivo no rompió**

El resto del archivo (el `<MapView>`, los pines, el `<Polyline coordinates={routePoints} .../>`, la card con `{routeInfo && (...)}`, los botones de Waze/Google Maps) sigue leyendo `routePoints`/`routeInfo` exactamente igual que antes — como son las mismas variables (ahora vienen del hook en vez de `useState` local), no hace falta tocar nada más en el JSX.

```bash
cd frontend
node --check screens/repartidor/RepartidorMapaScreen.js
```

Expected: sin salida (exit code 0).

Si tenés acceso a correr la app (Expo + dispositivo/emulador con ubicación), verificá manualmente que el comportamiento es IDÉNTICO al de antes de este refactor: tocar un pedido sigue dibujando la ruta naranja y mostrando "X.X km · Y min" en la card, igual que antes. Si no tenés forma de correr la app en este entorno, dejalo documentado como no verificado en vivo (no es un fallo del task, es una limitación del entorno).

- [ ] **Step 6: Commit**

```bash
git add frontend/screens/repartidor/RepartidorMapaScreen.js
git commit -m "refactor(frontend): RepartidorMapaScreen usa useRepartidorRoute"
```

---

### Task 5: Frontend — componente `NavigationOverlay`

**Files:**
- Create: `frontend/components/repartidor/NavigationOverlay.js`

**Interfaces:**
- Consumes: `haversineMeters` de `frontend/utils/routeGeometry.js`.
- Produces: `<NavigationOverlay visible pedido location steps stepActualIndex routeInfo etaTarget destino onExit />` — componente que, cuando `visible` es `true`, renderiza un `MapView` de pantalla completa con cámara rotando, banner de instrucción actual, y llama a `onExit()` solo (sin argumentos) al detectar llegada o al tocar el botón de salir. `destino` es `{lat, lng}`.

- [ ] **Step 1: Instalar `expo-speech`**

```bash
cd frontend
npx expo install expo-speech
```

Expected: agrega `expo-speech` a `package.json` con la versión compatible con el SDK de Expo de este proyecto (54), y actualiza `package-lock.json`.

- [ ] **Step 2: Crear el componente**

```js
// frontend/components/repartidor/NavigationOverlay.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haversineMeters } from '../../utils/routeGeometry';

const DISTANCIA_LLEGADA_METROS = 30;

export default function NavigationOverlay({
    visible,
    pedido,
    location,
    steps,
    stepActualIndex,
    routeInfo,
    etaTarget,
    destino,
    onExit,
}) {
    const insets = useSafeAreaInsets();
    const mapRef = useRef(null);
    const lastAnnouncedIndexRef = useRef(-1);
    const [heading, setHeading] = useState(0);

    // ── Seguir el heading del dispositivo (si está disponible) ──
    useEffect(() => {
        if (!visible) return;
        let sub;
        (async () => {
            try {
                sub = await Location.watchHeadingAsync(h => {
                    const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
                    if (value >= 0) setHeading(value);
                });
            } catch {
                // Sin heading confiable (emulador, sin sensor, etc.) — la cámara no rota, no rompe nada
            }
        })();
        return () => sub?.remove();
    }, [visible]);

    // ── Mover la cámara con la posición y el heading ──
    useEffect(() => {
        if (!visible || !location || !mapRef.current) return;
        mapRef.current.animateCamera({
            center: { latitude: location.latitude, longitude: location.longitude },
            heading,
            pitch: 45,
            zoom: 18,
        }, { duration: 500 });
    }, [visible, location, heading]);

    // ── Anunciar por voz cada instrucción nueva, una sola vez ──
    useEffect(() => {
        if (!visible || !steps || steps.length === 0) return;
        if (stepActualIndex === lastAnnouncedIndexRef.current) return;

        const instruccion = steps[stepActualIndex]?.instruccion;
        if (instruccion) {
            try {
                Speech.speak(instruccion, { language: 'es-AR' });
            } catch {
                // Sin TTS disponible en el dispositivo — la instrucción se sigue mostrando en texto
            }
        }
        lastAnnouncedIndexRef.current = stepActualIndex;
    }, [visible, steps, stepActualIndex]);

    // ── Detectar llegada ──
    useEffect(() => {
        if (!visible || !location || !destino) return;
        const distancia = haversineMeters({ lat: location.latitude, lng: location.longitude }, destino);
        if (distancia < DISTANCIA_LLEGADA_METROS) {
            Speech.stop();
            onExit();
        }
    }, [visible, location, destino, onExit]);

    if (!visible) return null;

    const instruccionActual = steps && steps.length > 0 ? steps[stepActualIndex]?.instruccion : null;
    const minutosRestantes = etaTarget ? Math.max(1, Math.round((etaTarget.getTime() - Date.now()) / 60000)) : null;

    return (
        <View style={styles.root}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={location ? {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                } : undefined}
                showsUserLocation
            >
                {destino && (
                    <Marker coordinate={{ latitude: destino.lat, longitude: destino.lng }} />
                )}
            </MapView>

            <View style={[styles.instructionBanner, { paddingTop: insets.top + 12 }]}>
                <Ionicons name="navigate" size={22} color="#fff" />
                <Text style={styles.instructionText} numberOfLines={2}>
                    {instruccionActual || 'Continuá por la ruta trazada'}
                </Text>
            </View>

            <TouchableOpacity style={[styles.exitBtn, { top: insets.top + 12 }]} onPress={() => { Speech.stop(); onExit(); }}>
                <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
                <Text style={styles.bottomText}>
                    {routeInfo ? `${(routeInfo.distanceMeters / 1000).toFixed(1)} km` : ''}
                    {minutosRestantes != null ? ` · ${minutosRestantes} min` : ''}
                </Text>
                <Text style={styles.bottomSubtext} numberOfLines={1}>
                    Pedido #{pedido?.id} — {pedido?.cliente_nombre} {pedido?.cliente_apellido}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: '#000' },
    map: { ...StyleSheet.absoluteFillObject },
    instructionBanner: {
        position: 'absolute', top: 0, left: 0, right: 0,
        backgroundColor: 'rgba(26,26,26,0.92)',
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingBottom: 16,
    },
    instructionText: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
    exitBtn: {
        position: 'absolute', right: 16,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center', justifyContent: 'center',
    },
    bottomBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(26,26,26,0.92)',
        paddingHorizontal: 20, paddingTop: 14,
    },
    bottomText: { color: '#fff', fontSize: 22, fontWeight: '800' },
    bottomSubtext: { color: '#ccc', fontSize: 13, marginTop: 2 },
});
```

- [ ] **Step 3: Verificar sintaxis**

```bash
cd frontend
node --check components/repartidor/NavigationOverlay.js
```

Expected: sin salida (exit code 0).

- [ ] **Step 4: Commit**

```bash
git add frontend/components/repartidor/NavigationOverlay.js frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): componente NavigationOverlay con voz, camara rotando y deteccion de llegada"
```

---

### Task 6: Frontend — botón "Ir" + integrar `NavigationOverlay` en `RepartidorMapaScreen.js`

**Files:**
- Modify: `frontend/screens/repartidor/RepartidorMapaScreen.js`

**Interfaces:**
- Consumes: `NavigationOverlay` (Task 5), `steps`/`stepActualIndex`/`etaTarget` del hook (ya desestructurados en la Task 4).

- [ ] **Step 1: Importar el componente**

Agregar al inicio del archivo, junto a los demás imports:

```js
import NavigationOverlay from '../../components/repartidor/NavigationOverlay';
```

- [ ] **Step 2: Ampliar la desestructuración del hook y agregar estado para el modo navegación**

Cambiar la línea que dejó la Task 4:

```js
    const { routePoints, routeInfo } = useRepartidorRoute({ location, coords, selected });
```

por:

```js
    const { routePoints, routeInfo, etaTarget, steps, stepActualIndex } = useRepartidorRoute({ location, coords, selected });
```

Y junto a los demás `useState` del componente (después de la línea `const [topBlockHeight, setTopBlockHeight] = useState(0);`), agregar:

```js
    const [navegando, setNavegando] = useState(false);
```

- [ ] **Step 3: Agregar el botón "Ir" en la card del pedido seleccionado**

Dentro del bloque `{selected && (...)}` (la card), justo antes de `{coords[selected.id] && (` donde están los botones de Waze/Google Maps, agregar:

```jsx
                    {routePoints && (
                        <TouchableOpacity
                            style={styles.irBtn}
                            onPress={() => setNavegando(true)}
                        >
                            <Ionicons name="navigate-circle" size={20} color="#fff" />
                            <Text style={styles.irBtnText}>Ir</Text>
                        </TouchableOpacity>
                    )}
```

- [ ] **Step 4: Renderizar el overlay al final del JSX del componente**

Justo antes del cierre final `</View>` que cierra el `<View style={styles.root}>` (el último `</View>` del `return`, después del bloque `{selected && (...)}`), agregar:

```jsx
            <NavigationOverlay
                visible={navegando}
                pedido={selected}
                location={location}
                steps={steps}
                stepActualIndex={stepActualIndex}
                routeInfo={routeInfo}
                etaTarget={etaTarget}
                destino={selected && coords[selected.id] ? { lat: coords[selected.id].latitude, lng: coords[selected.id].longitude } : null}
                onExit={() => setNavegando(false)}
            />
```

- [ ] **Step 5: Agregar el estilo `irBtn`/`irBtnText`**

En el `StyleSheet.create({...})` del archivo, junto a los estilos `navButtons`/`navBtn` existentes, agregar:

```js
    irBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 13, borderRadius: 14,
        backgroundColor: '#FF8700', marginTop: 10,
    },
    irBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
```

- [ ] **Step 6: Verificar sintaxis**

```bash
cd frontend
node --check screens/repartidor/RepartidorMapaScreen.js
```

Expected: sin salida (exit code 0).

- [ ] **Step 7: Verificación manual (si hay acceso a la app corriendo)**

1. Como repartidor, seleccionar un pedido con ruta ya calculada (aparece "X.X km · Y min" en la card).
2. Confirmar que aparece el botón naranja "Ir" debajo de esa info.
3. Tocarlo → debería aparecer el overlay de pantalla completa con el banner de instrucción arriba y la barra de distancia/ETA abajo.
4. Moverse (real o ubicación simulada) → confirmar que el mapa sigue la posición, y si el dispositivo da heading, que la cámara rota.
5. Confirmar que al menos la primera instrucción se escucha por voz (si el dispositivo tiene TTS).
6. Tocar la "X" → vuelve a la vista de mapa normal, con la card del pedido intacta.

Si no hay forma de correr la app en este entorno, documentar como no verificado en vivo — no es un fallo del task.

- [ ] **Step 8: Commit**

```bash
git add frontend/screens/repartidor/RepartidorMapaScreen.js
git commit -m "feat(frontend): boton Ir y modo navegacion turn-by-turn en RepartidorMapaScreen"
```

---

## Resumen de archivos tocados

| Archivo | Tarea |
|---|---|
| `backend/src/utils/googleRoutes.js` | 1 |
| `backend/src/controllers/rutaController.js` | 2 |
| `frontend/hooks/useRepartidorRoute.js` | 3 |
| `frontend/screens/repartidor/RepartidorMapaScreen.js` | 4, 6 |
| `frontend/components/repartidor/NavigationOverlay.js` | 5 |
| `frontend/package.json` / `package-lock.json` | 5 (instala `expo-speech`) |
