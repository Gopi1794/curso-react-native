# 002 — Respetar `prefers-reduced-motion` en los 4 loops infinitos de la app

- **Status**: TODO
- **Commit**: 712791e
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 4 files (`frontend/components/rewards/SpinWheel.js`, `frontend/components/PromoCard.js`, `frontend/components/AnimatedAuthBackground.js`, `frontend/screens/repartidor/RepartidorMapaScreen.js`), ~10-15 líneas por archivo

## Problem

Ningún `Animated.loop`/`withRepeat` infinito de la app chequea el ajuste de accesibilidad "reducir movimiento" del sistema operativo. Estos 4 loops corren para siempre mientras el componente esté montado, sin importar la preferencia del usuario:

`frontend/components/rewards/SpinWheel.js:79-87` — actual (usa Reanimated, no `Animated` de React Native):

```js
useEffect(() => {
    pulse.value = withRepeat(
        withSequence(
            withTiming(1.03, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
    );
}, []);
```

`frontend/components/PromoCard.js:33-48`:

```js
useEffect(() => {
    Animated.timing(fadeAnim, {
        toValue: 1, duration: 250, useNativeDriver: true,
    }).start();

    const drift = (val, to, dur) =>
        Animated.timing(val, { toValue: to, duration: dur, useNativeDriver: true });

    Animated.loop(
        Animated.sequence([
            Animated.parallel([drift(floatCal, -5, 1800), drift(floatWeight, 4, 2200)]),
            Animated.parallel([drift(floatCal, 3, 1600), drift(floatWeight, -5, 2000)]),
            Animated.parallel([drift(floatCal, 0, 1700), drift(floatWeight, 0, 1900)]),
        ])
    ).start();
}, []);
```

`frontend/components/AnimatedAuthBackground.js:35-53` (bloque completo del `useEffect`, ver archivo — arranca en la línea 35 con `Animated.loop(Animated.sequence([...4 Animated.parallel...]))`).

`frontend/screens/repartidor/RepartidorMapaScreen.js:76-87`:

```js
const pulseAnim = useRef(new Animated.Value(1)).current;

useEffect(() => {
    const loop = Animated.loop(
        Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
    );
    loop.start();
    return () => loop.stop();
}, []);
```

De los 28 archivos de la app que usan animaciones, solo 5 (`FavoritesScreen.js`, `FoodDetailScreen.js`, `PromoFoodDetailScreen.js`, `TicketDetailScreen.js`, `TicketScreen.js`) manejan `reduceMotion` en algún grado. Este plan cubre específicamente los 4 loops infinitos — los de mayor severidad, porque corren sin parar y no se detienen solos.

## Target

Cada archivo debe: (1) leer el estado de reduced-motion al montar y suscribirse a cambios, (2) no arrancar el loop si está activo (dejando el valor animado en su estado de reposo).

### SpinWheel.js (Reanimated — usa `useReducedMotion` del propio paquete, no `AccessibilityInfo`)

```js
// target — frontend/components/rewards/SpinWheel.js
import { useReducedMotion } from 'react-native-reanimated';
// ... (mantener el resto de imports de reanimated ya existentes)

// dentro del componente, junto a los demás hooks:
const reduceMotion = useReducedMotion();

useEffect(() => {
    if (reduceMotion) return; // se queda en pulse.value = 1, sin loop
    pulse.value = withRepeat(
        withSequence(
            withTiming(1.03, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
    );
}, [reduceMotion]);
```

### PromoCard.js, AnimatedAuthBackground.js, RepartidorMapaScreen.js (React Native `Animated` — usan `AccessibilityInfo`, patrón ya existente en `FoodDetailScreen.js`)

```js
// target — patrón común para los 3 archivos
import { AccessibilityInfo } from 'react-native'; // agregar al import existente de 'react-native' si no está

// dentro del componente:
const [reduceMotion, setReduceMotion] = useState(false);

useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
}, []);
```

Y en cada `useEffect` que arranca el loop, agregar el guard `if (reduceMotion) return;` antes de `Animated.loop(...).start()`, y `reduceMotion` a su dependency array.

## Repo conventions to follow

- El patrón exacto de `AccessibilityInfo.isReduceMotionEnabled()` + `addEventListener('reduceMotionChanged', ...)` + cleanup con `sub.remove()` ya existe en `frontend/screens/food/FoodDetailScreen.js:141-145` — copiarlo tal cual, no inventar una variante.
- Para `SpinWheel.js`, que usa `react-native-reanimated` (no el `Animated` de RN), usar el hook `useReducedMotion` que expone esa misma librería — es la forma idiomática ahí, no mezclar con `AccessibilityInfo`.

## Steps

1. **`frontend/components/rewards/SpinWheel.js`**: agregar `useReducedMotion` al import de `react-native-reanimated` (línea ~11, donde ya se importan `useSharedValue`, `useAnimatedStyle`, etc.). Declarar `const reduceMotion = useReducedMotion();` junto a los demás hooks del componente. En el `useEffect` de las líneas 79-87, agregar `if (reduceMotion) return;` como primera línea del efecto, y agregar `reduceMotion` al array de dependencias (actualmente `[]`).
2. **`frontend/components/PromoCard.js`**: agregar `AccessibilityInfo` al import de `'react-native'` en la línea 1-10 (ver imports actuales del archivo). Agregar el `useState`+`useEffect` de reduced-motion (patrón de Target) junto a los demás hooks del componente. En el `useEffect` de las líneas 33-48, agregar `if (reduceMotion) return;` justo después de la línea `Animated.timing(fadeAnim, {...}).start();` (esa animación de entrada sí debe correr siempre — es la fade-in de la card, no decorativa infinita; solo el `Animated.loop` de después debe saltearse). Agregar `reduceMotion` al array de dependencias del efecto.
3. **`frontend/components/AnimatedAuthBackground.js`**: agregar `AccessibilityInfo` al import de `'react-native'` en la línea 2. Agregar el `useState`+`useEffect` de reduced-motion. En el `useEffect` que empieza en la línea 35, agregar `if (reduceMotion) return;` como primera línea, y `reduceMotion` a las dependencias.
4. **`frontend/screens/repartidor/RepartidorMapaScreen.js`**: agregar `AccessibilityInfo` al import de `'react-native'` (línea 2-5, junto a `Animated` que ya se agregó ahí). Agregar el `useState`+`useEffect` de reduced-motion. En el `useEffect` de las líneas 78-87, agregar `if (reduceMotion) return;` como primera línea (antes de declarar `const loop = ...`), y `reduceMotion` a las dependencias del efecto (actualmente `[]`).

## Boundaries

- No tocar las animaciones de entrada/salida no infinitas (fade-in de `PromoCard`, springs de sheets, etc.) — este plan es exclusivamente sobre los 4 loops infinitos citados.
- No agregar nuevas dependencias — `AccessibilityInfo` es parte de `react-native`, `useReducedMotion` es parte de `react-native-reanimated`, ambos ya están instalados.
- No cambiar duraciones, easings ni valores de los loops — solo agregar el guard de reduced-motion.
- Si algún `useEffect` citado ya no tiene el array de dependencias `[]` mostrado arriba (drift desde el commit `712791e`), STOP y reportar en vez de improvisar.

## Verification

- **Mechanical**: no hay typecheck/build automatizado — correr `cd frontend && npx expo start` y confirmar que Metro compila sin errores los 4 archivos.
- **Feel check** (requiere activar "Reducir movimiento" en el dispositivo/emulador — Android: Ajustes → Accesibilidad → Movimiento reducido; iOS Simulator: Ajustes → Accesibilidad → Movimiento; también se puede simular desde el Simulator de iOS vía `Settings.app`):
  - Con reduced-motion **activado**: la ruleta de premios (`SpinWheel`) no debe pulsar el centro; los badges de calorías/peso en las promo cards (`PromoCard`) deben quedarse quietos; los blobs del fondo naranja en Login/Register (`AnimatedAuthBackground`) no deben moverse; el punto verde de "en camino" en la lista de pedidos del repartidor no debe titilar.
  - Con reduced-motion **desactivado**: las 4 animaciones deben verse exactamente igual que antes de este plan — mismo timing, mismos valores.
  - Confirmar que ninguna de las 4 pantallas se rompe o queda en un estado visual incorrecto (por ejemplo, un elemento que se queda invisible) cuando el loop no arranca — todos deben quedar en su valor de reposo (`pulse.value = 1`, `floatCal`/`floatWeight` en 0, blobs en su posición inicial, `pulseAnim = 1`).
- **Done when**: los 4 loops respetan el ajuste del sistema, y con el ajuste desactivado el comportamiento es idéntico al actual.
