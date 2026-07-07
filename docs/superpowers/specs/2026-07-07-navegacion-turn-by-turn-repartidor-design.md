# Modo navegación turn-by-turn para el repartidor

**Fecha**: 2026-07-07
**Estado**: Aprobado, pendiente de implementación

## Contexto y objetivo

Hoy `RepartidorMapaScreen.js` traza una ruta estática (polyline naranja) y ofrece botones "Waze"/"Google Maps" para navegar afuera de la app. Se quiere un modo navegación real, dentro de la app, tipo Waze/Google Maps: al tocar "Ir" en la card del pedido seleccionado, la pantalla entra en un modo de navegación de punta a punta con instrucciones de giro en texto y voz, cámara que rota según hacia dónde maneja, y detección automática de llegada.

## Decisión de costo (verificada)

- **Cantidad de requests a Google**: no cambia respecto al feature de ruta ya construido. Sigue usando los mismos dos disparadores por evento (desvío >70m del camino trazado, o ETA local por llegar a cero mientras el pedido sigue `en_camino`) — nunca por timer. El seguimiento de "en qué paso de la instrucción estoy" es enteramente client-side, comparando el GPS contra los `steps` ya bajados en la misma respuesta, sin llamadas nuevas a Google.
- **Tier de precio por request**: según la documentación de Google Routes API, el tier (Essentials/Pro/Enterprise) lo determina qué *features* de ruteo pedís (modo de tráfico en vivo, dos ruedas, etc.), no qué *campos* pedís en la respuesta. Pedir `steps`/`navigationInstruction` es más datos devueltos, no una feature avanzada — debería seguir cayendo en el mismo tier Essentials (gratis al volumen actual del restaurante). Confirmar con un chequeo real en Cloud Console → Facturación después de implementar, ya que la doc no lo garantiza explícitamente para este campo puntual.

## Arquitectura

```
Backend: rutaController.calcularRuta
    │ field mask ampliado: routes.legs.steps.navigationInstruction,
    │   routes.legs.steps.distanceMeters, routes.legs.steps.polyline.encodedPolyline
    ▼
googleRoutes.js: computeRoute devuelve además
    steps: [{ instruccion: string, distanciaMetros: number, points: [{lat,lng}...] }]
    ▼
Frontend: useRepartidorRoute (hook nuevo, extrae la lógica de ruta/recálculo
    que hoy vive inline en RepartidorMapaScreen.js — mismo comportamiento,
    ahora también expone `steps` y `stepActualIndex`)
    ▼
RepartidorMapaScreen.js (usa el hook; botón "Ir" en la card → setNavegando(true))
    ▼
NavigationOverlay.js (nuevo componente, pantalla completa cuando navegando=true)
    - cámara rotando con heading (expo-location watchHeadingAsync + MapView.animateCamera)
    - banner arriba: instrucción actual (texto) + distancia al próximo giro
    - voz: expo-speech anuncia cada instrucción nueva, una sola vez
    - detecta llegada (< ~30m del destino) → sale sola del modo navegación
    - botón "X" manual como salida de emergencia
```

## Componentes a crear/modificar

| Archivo | Cambio |
|---|---|
| `backend/src/utils/googleRoutes.js` | `computeRoute` agrega `steps` al resultado, ampliando el field mask y el parseo de la respuesta |
| `backend/src/controllers/rutaController.js` | Pasa `steps` en la respuesta JSON |
| `frontend/hooks/useRepartidorRoute.js` | **Nuevo.** Extrae de `RepartidorMapaScreen.js` toda la lógica de: `fetchRoute`, guardas de secuencia/in-flight, detección de desvío, recálculo por ETA-cerca-de-cero. Ahora también calcula `stepActualIndex` (comparando GPS contra el punto final de cada step) y expone qué step recién se anunció por voz. |
| `frontend/components/repartidor/NavigationOverlay.js` | **Nuevo.** UI de pantalla completa: banner de instrucción, cámara con heading, botón salir, detección de llegada. |
| `frontend/screens/repartidor/RepartidorMapaScreen.js` | Usa `useRepartidorRoute`, agrega botón "Ir" en la card existente, renderiza `NavigationOverlay` cuando corresponde |
| `frontend/package.json` | Agrega `expo-speech` (nueva dependencia, sin costo, TTS nativo de Expo) |

## Detección del paso actual (client-side)

En cada posición GPS nueva (ya viene de `watchPositionAsync`, existente), se compara la distancia al punto final del `step` actual: si está a menos de ~25m, avanza `stepActualIndex` al siguiente y dispara la voz una única vez por índice (se trackea qué índice ya se anunció para no repetir). Reusa el mismo tipo de cálculo de distancia (`haversineMeters`) que ya existe en `frontend/utils/routeGeometry.js`.

## Recálculo dentro del modo navegación

Mismas dos condiciones de siempre (desvío >70m, ETA por llegar a cero + `estado='en_camino'`). Al recalcular, además de lo que ya hacía (nuevo `routePoints`/`routeInfo`/`etaTarget`), resetea `stepActualIndex` a 0 y limpia qué se había anunciado por voz, porque los `steps` nuevos no se corresponden con los viejos.

## Manejo de errores

- **Sin heading confiable** (común en emuladores o interiores): la cámara no rota, queda centrada sin más — no bloquea el modo navegación.
- **`expo-speech` falla o no hay TTS en el dispositivo**: se ignora en silencio, la instrucción en texto se sigue mostrando igual.
- **Google no devuelve `steps`** (respuesta atípica): el modo navegación funciona igual mostrando solo distancia/ETA, sin banner de instrucciones — no crashea.

## Detección de llegada

Distancia (haversine) entre la posición actual y el destino final < ~30m → sale automáticamente del modo navegación, vuelve a la vista de mapa normal con la card del pedido (para que el repartidor lo marque como entregado con el flujo que ya existe). Además hay un botón "X" visible todo el tiempo para salir manualmente.

## Testing

Sin test runner en el proyecto (constante en todo este proyecto) — verificación manual: como repartidor, tocar "Ir" en un pedido, moverse (real o simulado) y confirmar que la cámara sigue/rota, la voz anuncia cada instrucción una sola vez, y al acercarse al destino sale sola del modo navegación.

## Fuera de alcance

- Multi-parada en una sola sesión de navegación (sigue siendo un pedido a la vez, como hoy).
- Reemplazar los botones de Waze/Google Maps externos — quedan como alternativa, no se sacan.
- Verificación automática del tier de Google Cloud — queda como paso manual post-implementación (ver sección de costo).
