# 001 — Reemplazar animación de `height` del heading colapsable por `transform`/`opacity`

- **Status**: REVERTED — ver nota abajo
- **Commit**: 712791e
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 2 files (`frontend/components/HeaderSection.js`, `frontend/screens/home/ScreenHome.js`), ~10 líneas

## Nota de reversión

Este plan se aplicó y se probó en dispositivo. Rompió el comportamiento: `transform: scaleY` cambia solo el renderizado visual, no el espacio que el elemento ocupa en el layout. La `SearchBar`, que es un hermano flexbox debajo del heading, dejó de subir al colapsar el heading — quedaba un hueco vacío donde antes estaba el texto. El reflow de contenido hermano requiere sí o sí animar una propiedad de layout (`height`); no hay forma de lograrlo solo con `transform`/`opacity`. Se revirtió a la versión original (`height` + `useNativeDriver:false`). Este hallazgo se descarta — el costo de performance de animar `height` acá es el precio necesario para el comportamiento real que la pantalla necesita.

## Problem

El heading colapsable de `ScreenHome` anima la propiedad `height` (layout property) interpolada directo del scroll, corriendo en el hilo JS en cada frame de scroll — la interacción más frecuente de toda la app.

`frontend/components/HeaderSection.js:24-29` — actual:

```js
const headingHeight = scrollY
    ? scrollY.interpolate({ inputRange: [0, 50], outputRange: [46, 0], extrapolate: 'clamp' })
    : 46;
const headingOpacity = scrollY
    ? scrollY.interpolate({ inputRange: [0, 40], outputRange: [1, 0], extrapolate: 'clamp' })
    : 1;
```

`frontend/components/HeaderSection.js:108` — actual:

```jsx
<Animated.View style={{ height: headingHeight, opacity: headingOpacity, overflow: 'hidden' }}>
    <Text style={styles.heading}>
        {'¿Qué te gustaría '}
        <Text style={styles.headingAccent}>comer hoy?</Text>
    </Text>
</Animated.View>
```

`frontend/screens/home/ScreenHome.js:542-553` — actual (el `scrollY` que alimenta la interpolación de arriba, ya forzado a `useNativeDriver:false` porque anima `height`, una propiedad no soportada por el native driver):

```jsx
<Animated.ScrollView
    style={styles.scrollContainer}
    showsVerticalScrollIndicator={false}
    contentContainerStyle={styles.scrollContent}
    removeClippedSubviews={true}
    keyboardDismissMode="on-drag"
    keyboardShouldPersistTaps="handled"
    onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false }
    )}
    scrollEventThrottle={16}
    refreshControl={
        <RefreshControl
```

## Target

Animar `transform: scaleY` (con `transform-origin` efectivo vía `alignItems`/posicionamiento, ya que RN no soporta `transformOrigin` nativo de forma confiable pre-New Architecture) en vez de `height`, y activar `useNativeDriver: true` en el scroll handler para que la interpolación corra en el hilo de UI, no en JS.

```js
// target — frontend/components/HeaderSection.js
const headingScale = scrollY
    ? scrollY.interpolate({ inputRange: [0, 50], outputRange: [1, 0], extrapolate: 'clamp' })
    : 1;
const headingOpacity = scrollY
    ? scrollY.interpolate({ inputRange: [0, 40], outputRange: [1, 0], extrapolate: 'clamp' })
    : 1;
```

```jsx
{/* target — frontend/components/HeaderSection.js */}
<Animated.View
    style={{
        opacity: headingOpacity,
        transform: [{ scaleY: headingScale }],
        transformOrigin: 'top',
        overflow: 'hidden',
    }}
>
    <Text style={styles.heading}>
        {'¿Qué te gustaría '}
        <Text style={styles.headingAccent}>comer hoy?</Text>
    </Text>
</Animated.View>
```

```jsx
{/* target — frontend/screens/home/ScreenHome.js */}
onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
)}
```

## Repo conventions to follow

- El patrón de spring/timing con `useNativeDriver: true` sobre `transform` ya se usa correctamente en `frontend/components/common/AddAddressSheet.js:28` (`Animated.spring(sheetY, { toValue: 0, useNativeDriver: true }).start();`) — replicar ese criterio: solo `transform`/`opacity` en el native driver.
- `transformOrigin` como string (`'top'`, `'center'`, etc.) es soportado en React Native 0.71+ vía Fabric; este proyecto usa RN 0.81 (ver `frontend/package.json`), así que es seguro usarlo directamente en el objeto de estilo.

## Steps

1. En `frontend/components/HeaderSection.js`, reemplazar la declaración de `headingHeight` (líneas 24-26) por `headingScale`, con `outputRange: [1, 0]` en vez de `[46, 0]`, tal como se muestra en Target.
2. En el mismo archivo, línea 108, reemplazar `style={{ height: headingHeight, opacity: headingOpacity, overflow: 'hidden' }}` por el bloque de estilo mostrado en Target (`opacity`, `transform: [{ scaleY: headingScale }]`, `transformOrigin: 'top'`, `overflow: 'hidden'`).
3. En `frontend/screens/home/ScreenHome.js`, línea 551, cambiar `useNativeDriver: false` a `useNativeDriver: true` dentro del `Animated.event` del `onScroll` del `Animated.ScrollView`.
4. Buscar en `frontend/screens/home/ScreenHome.js` cualquier otro uso de `scrollY` (por ejemplo si se lee `scrollY.addListener` o se usa en un `interpolate` que dependa de una propiedad no soportada por el native driver, como `color` o `height`). Si existe alguno, STOP y reportar en vez de improvisar — el cambio a `useNativeDriver:true` rompe cualquier interpolación restante hacia propiedades no soportadas (todo lo que no sea `transform`/`opacity`).

## Boundaries

- No tocar `SearchBar` ni el resto de `HeaderSection.js` fuera de las líneas indicadas.
- No cambiar el layout/estructura del JSX — solo las propiedades de animación.
- No agregar nuevas dependencias.
- Si el código encontrado en `ScreenHome.js:542-553` o `HeaderSection.js:24-29,108` difiere de lo citado arriba (drift desde el commit `712791e`), STOP y reportar en vez de improvisar.

## Verification

- **Mechanical**: no hay typecheck/build automatizado en este proyecto (confirmar corriendo `cd frontend && npx expo start` y que no tire errores de Metro al abrir `ScreenHome`).
- **Feel check**: abrir la pantalla Home, hacer scroll lento hacia abajo desde arriba del todo:
  - El heading "¿Qué te gustaría comer hoy?" debe encogerse y desvanecerse suavemente, igual que antes visualmente (el cambio es de rendimiento, no de apariencia).
  - No debe haber salto ni parpadeo al cruzar el punto donde `scrollY` pasa de 0 a 50.
  - Con el profiler de React Native (`Shake → Show Perf Monitor` en el dev menu, o Flipper), confirmar que el JS thread ya no muestra actividad asociada al scroll del heading — el trabajo debe verse en el UI thread.
- **Done when**: el scroll de la pantalla Home se siente igual o más fluido que antes, y `useNativeDriver: true` no genera ningún warning en consola sobre propiedades no soportadas.
