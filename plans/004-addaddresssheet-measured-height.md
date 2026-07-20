# 004 — Reemplazar el offset fijo de 600px de `AddAddressSheet` por la altura real medida

- **Status**: TODO
- **Commit**: 712791e
- **Severity**: LOW
- **Category**: Physicality & origin
- **Estimated scope**: 1 file (`frontend/components/common/AddAddressSheet.js`), ~10 líneas

## Corrección respecto al audit original

El hallazgo #4 original citaba dos archivos (`SuggestionSheet.js:21` y `AddAddressSheet.js:18`). Al revisar `SuggestionSheet.js` en detalle para escribir este plan, se confirmó que **no es un caso válido**: su `SHEET_H` (línea 14) se calcula como `Dimensions.get('window').height * 0.72` — ya deriva de la altura real de pantalla, no es un número mágico. Se descarta de este plan; solo queda `AddAddressSheet.js`, que sí usa un valor fijo sin relación con el dispositivo ni con el contenido real del sheet.

## Problem

`frontend/components/common/AddAddressSheet.js:18` — el valor `600` es un número de píxeles hardcodeado, sin relación con `Dimensions.get('window')` ni con la altura real del contenido del sheet:

```js
const sheetY = useRef(new Animated.Value(600)).current;
```

Se reutiliza igual en 3 lugares más del mismo archivo:

`frontend/components/common/AddAddressSheet.js:23-30` (dentro del `PanResponder`):

```js
onPanResponderRelease: (_, g) => {
    if (g.dy > 100) {
        Animated.timing(sheetY, { toValue: 600, duration: 200, useNativeDriver: true })
            .start(() => { sheetY.setValue(600); onClose(); });
    } else {
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: true }).start();
    }
},
```

`frontend/components/common/AddAddressSheet.js:33-43`:

```js
useEffect(() => {
    if (visible) {
        setLabel('');
        setDetails('');
        setCoords(null);
        setIsDefault(false);
        setSearching(false);
        sheetY.setValue(600);
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    }
}, [visible]);
```

`frontend/components/common/AddAddressSheet.js:45-48`:

```js
const closeSheet = () => {
    Animated.timing(sheetY, { toValue: 600, duration: 200, useNativeDriver: true })
        .start(() => { sheetY.setValue(600); onClose(); });
};
```

Si el contenido del sheet alguna vez supera 600px de alto (por ejemplo, con el teclado abierto sumando campos de error, o en una pantalla más chica), el sheet queda visible parcialmente al "cerrarse" en vez de salir completamente fuera de la pantalla.

## Target

Medir la altura real del sheet con `onLayout` y guardarla en un ref, con `600` como valor de fallback razonable solo hasta que se complete la primera medición (evita un salto en el primer render, ya que `Animated.Value` necesita un valor inicial antes de conocer la altura real).

```js
// target — frontend/components/common/AddAddressSheet.js
const sheetHeight = useRef(600); // fallback hasta la primera medición real
const sheetY = useRef(new Animated.Value(600)).current;

const onSheetLayout = (e) => {
    const measured = e.nativeEvent.layout.height;
    if (measured > 0) sheetHeight.current = measured;
};
```

```js
// target — PanResponder (reemplaza el bloque de las líneas 23-30)
onPanResponderRelease: (_, g) => {
    if (g.dy > 100) {
        Animated.timing(sheetY, { toValue: sheetHeight.current, duration: 200, useNativeDriver: true })
            .start(() => { sheetY.setValue(sheetHeight.current); onClose(); });
    } else {
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: true }).start();
    }
},
```

```js
// target — useEffect de apertura (reemplaza el bloque de las líneas 33-43)
useEffect(() => {
    if (visible) {
        setLabel('');
        setDetails('');
        setCoords(null);
        setIsDefault(false);
        setSearching(false);
        sheetY.setValue(sheetHeight.current);
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    }
}, [visible]);
```

```js
// target — closeSheet (reemplaza el bloque de las líneas 45-48)
const closeSheet = () => {
    Animated.timing(sheetY, { toValue: sheetHeight.current, duration: 200, useNativeDriver: true })
        .start(() => { sheetY.setValue(sheetHeight.current); onClose(); });
};
```

## Repo conventions to follow

- El patrón de medir con `onLayout` y guardar en un `ref` (no en `state`, para no re-renderizar en cada medición) ya se usa en `frontend/screens/repartidor/RepartidorMapaScreen.js` para `topBlockHeight` — ahí se guarda en `state` porque se usa para posicionar otro elemento (`top: topBlockHeight`) y necesita re-render; en este caso alcanza con un `ref` porque el valor solo se lee dentro de callbacks de gestos/animación, nunca en el JSX de render.

## Steps

1. En `frontend/components/common/AddAddressSheet.js`, después de la línea 18 (`const sheetY = useRef(new Animated.Value(600)).current;`), agregar `const sheetHeight = useRef(600);` y la función `onSheetLayout` mostrada en Target.
2. Ubicar el `Animated.View` (o `View`) raíz del sheet en el JSX (el contenedor que actualmente tiene `style={{ transform: [{ translateY: sheetY }] }}` — buscar `translateY: sheetY` en el archivo para encontrarlo) y agregarle la prop `onLayout={onSheetLayout}`.
3. Reemplazar el bloque del `PanResponder` (líneas 23-30) por la versión de Target que usa `sheetHeight.current` en vez de `600`.
4. Reemplazar el `useEffect` de apertura (líneas 33-43) por la versión de Target.
5. Reemplazar `closeSheet` (líneas 45-48) por la versión de Target.

## Boundaries

- No tocar `SuggestionSheet.js` — se confirmó que no tiene el problema (ver sección de corrección arriba).
- No cambiar el threshold de gesto `g.dy > 100` ni convertirlo a velocidad — eso es un hallazgo distinto (interruptibilidad, no physicality/origin) y queda fuera del alcance de este plan.
- No cambiar duraciones, springs ni bounciness — solo el valor numérico `600` por `sheetHeight.current`.
- Si el JSX no tiene un único elemento con `translateY: sheetY` (por ejemplo si el sheet está dividido en múltiples `Animated.View`), STOP y reportar en vez de adivinar cuál medir.

## Verification

- **Mechanical**: no hay typecheck/build automatizado — correr `cd frontend && npx expo start` y confirmar que `AddAddressSheet.js` compila sin errores.
- **Feel check**: abrir el sheet de "Agregar dirección" desde el carrito o direcciones de perfil:
  - Debe entrar deslizando desde abajo igual que antes (sin salto en el primer frame — confirmar que no aparece "flasheado" en su posición final antes de animar).
  - Cerrarlo con el botón de cerrar y arrastrando hacia abajo (swipe-to-dismiss) — en ambos casos debe salir completamente de la pantalla, sin quedar un borde visible en la parte inferior.
  - Con el teclado abierto (foco en el campo de dirección) y luego cerrado, repetir el cierre del sheet — debe seguir saliendo completo.
  - En un dispositivo/emulador con pantalla chica (por ejemplo, un emulador configurado a 5.0"), confirmar que si el contenido del sheet mide más de 600px, igual sale completamente al cerrar (este es el caso que el fix soluciona).
- **Done when**: el sheet nunca queda parcialmente visible al cerrarse, en ningún tamaño de contenido o pantalla.
