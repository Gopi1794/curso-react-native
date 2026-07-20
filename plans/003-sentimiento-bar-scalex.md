# 003 — Animar la barra de sentimiento con `transform: scaleX` en vez de `width`

- **Status**: TODO
- **Commit**: 712791e
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 file (`frontend/screens/admin/AdminReviewsInsightsScreen.js`), ~10 líneas

## Problem

`frontend/screens/admin/AdminReviewsInsightsScreen.js:45-67` — `SentimientoBar` anima `width` (propiedad de layout) con `useNativeDriver:false`, forzando el trabajo al hilo JS:

```js
function SentimientoBar({ label, value, total, color }) {
    const pct = total > 0 ? (value / total) * 100 : 0;
    const width = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(width, { toValue: pct, duration: 600, useNativeDriver: false }).start();
    }, [pct]);

    return (
        <View style={styles.barRow}>
            <Text style={styles.barLabel}>{label}</Text>
            <View style={styles.barTrack}>
                <Animated.View
                    style={[styles.barFill, {
                        width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                        backgroundColor: color,
                    }]}
                />
            </View>
            <Text style={[styles.barValue, { color }]}>{value}</Text>
        </View>
    );
}
```

Estilos relevantes (`frontend/screens/admin/AdminReviewsInsightsScreen.js:263-267`):

```js
barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
barLabel: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#666', width: 64 },
barTrack: { flex: 1, height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
barFill: { height: '100%', borderRadius: 4 },
barValue: { fontFamily: 'Poppins-Bold', fontSize: 13, width: 28, textAlign: 'right' },
```

`barTrack` ya tiene `overflow: 'hidden'`, lo que hace viable el approach de `scaleX` sin cambios de layout adicionales.

## Target

El `Animated.Value` sigue animando de 0 a `pct` igual que antes (mismo timing, misma curva), pero el `Animated.View` de la barra pasa a tener `width: '100%'` fijo (ocupa todo el track) y anima `transform: scaleX` interpolado a un rango 0-1 en vez de animar `width` en porcentaje. `transformOrigin: 'left'` asegura que crezca desde la izquierda, igual que el comportamiento visual actual.

```js
// target — frontend/screens/admin/AdminReviewsInsightsScreen.js
function SentimientoBar({ label, value, total, color }) {
    const pct = total > 0 ? (value / total) * 100 : 0;
    const scale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(scale, { toValue: pct, duration: 600, useNativeDriver: true }).start();
    }, [pct]);

    return (
        <View style={styles.barRow}>
            <Text style={styles.barLabel}>{label}</Text>
            <View style={styles.barTrack}>
                <Animated.View
                    style={[styles.barFill, {
                        width: '100%',
                        transform: [{
                            scaleX: scale.interpolate({ inputRange: [0, 100], outputRange: [0, 1] }),
                        }],
                        transformOrigin: 'left',
                        backgroundColor: color,
                    }]}
                />
            </View>
            <Text style={[styles.barValue, { color }]}>{value}</Text>
        </View>
    );
}
```

## Repo conventions to follow

- `transformOrigin` como string ya se usa en el Plan 001 de esta misma carpeta (`plans/001-header-height-to-transform.md`) — mismo criterio, RN 0.81 lo soporta directo en el objeto de estilo.
- El resto de barras/progreso animadas del proyecto (ninguna otra encontrada en el audit) no tiene un patrón previo que replicar — este plan establece el patrón de referencia para futuras barras de progreso.

## Steps

1. En `frontend/screens/admin/AdminReviewsInsightsScreen.js`, renombrar la variable `width` (línea 47) a `scale` para reflejar su nuevo propósito — actualizar también su uso en la línea 50 (`Animated.timing(width, ...)` → `Animated.timing(scale, ...)`).
2. En la misma línea 50, cambiar `useNativeDriver: false` a `useNativeDriver: true`.
3. En el bloque de estilo del `Animated.View` (líneas 57-62), reemplazar `width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })` por `width: '100%'` y agregar `transform: [{ scaleX: scale.interpolate({ inputRange: [0, 100], outputRange: [0, 1] }) }]` y `transformOrigin: 'left'`, tal como se muestra en Target.

## Boundaries

- No tocar `barRow`, `barLabel`, `barValue` ni ningún otro estilo fuera de `barFill` y el uso inline en el `Animated.View`.
- No cambiar la duración (600ms) ni la curva de easing (por defecto, sin `easing` explícito) — solo la propiedad animada y el native driver.
- No tocar el resto de `AdminReviewsInsightsScreen.js` (fetch de insights, otros componentes de la pantalla).
- Si el código de `SentimientoBar` o de `styles.barTrack`/`styles.barFill` difiere de lo citado (drift desde el commit `712791e`), STOP y reportar en vez de improvisar.

## Verification

- **Mechanical**: no hay typecheck/build automatizado — correr `cd frontend && npx expo start` y confirmar que `AdminReviewsInsightsScreen.js` compila sin errores.
- **Feel check**: entrar como admin a la pantalla de insights de reseñas (la que muestra las barras de sentimiento positivo/neutral/negativo):
  - Cada barra debe crecer de izquierda a derecha, exactamente como antes, sin saltos ni parpadeo.
  - Confirmar que el `borderRadius: 4` de `barFill` se sigue viendo correctamente en el extremo derecho de la barra cuando llega al 100% (el `overflow:hidden` del `barTrack` debe seguir recortando bien).
  - Con el profiler de React Native (Perf Monitor / Flipper), confirmar que la animación ya no aparece como trabajo del JS thread.
- **Done when**: las 3 barras (positivo/neutral/negativo, o las que existan) animan igual visualmente que antes, corriendo en el native driver.
