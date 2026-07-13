# Componente SpinWheel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un componente `SpinWheel` standalone (sin backend, sin navegación) que renderiza una ruleta de 8 premios, gira con una animación con física sutil al tocar "¡Girar!", y muestra el premio ganado en un modal.

**Architecture:** Un módulo puro `wheelMath.js` con la geometría de los gajos (ángulos, path SVG, cálculo del ángulo de destino), consumido por `SpinWheel.js`, que renderiza la ruleta con `react-native-svg` y anima la rotación con `react-native-reanimated`.

**Tech Stack:** React Native/Expo (JavaScript), `react-native-svg` (`15.12.1`), `react-native-reanimated` (`~4.1.1`), `@expo/vector-icons` (Ionicons) — todas ya instaladas, sin dependencias nuevas.

## Global Constraints

- Sin dependencias nuevas — solo `react-native-svg`, `react-native-reanimated`, `@expo/vector-icons`, ya presentes en `frontend/package.json`.
- Sin conexión a backend, Redux, ni navegación — el componente es standalone y recibe todo por props.
- Sin test runner automatizado en el proyecto — verificación manual en Expo Go, según se indica en cada tarea.
- Giros ilimitados en esta iteración — el badge "N giros disponibles" es decorativo, no se decrementa.
- Modal de resultado usa `Modal` de React Native (`transparent` + fondo semi-opaco), mismo patrón que `frontend/components/WelcomePopup.js`.

---

### Task 1: Geometría de la ruleta + render estático

**Files:**
- Create: `frontend/components/rewards/wheelMath.js`
- Create: `frontend/components/rewards/SpinWheel.js`

**Interfaces:**
- Produces (`wheelMath.js`): 
  - `SEGMENT_ANGLE` (number, `45`)
  - `segmentMidAngle(index: number): number` — ángulo en grados del centro del gajo `index` (índice 0 = arriba, bajo el puntero, sin rotación)
  - `segmentPath(index: number, cx: number, cy: number, r: number): string` — el `d` del `<Path>` SVG para el gajo `index`
  - `labelPosition(index: number, cx: number, cy: number, rLabel: number): { x: number, y: number }` — posición del ícono/texto del gajo `index` en reposo (rotación 0)
- Produces (`SpinWheel.js`): `export default function SpinWheel({ premios, girosDisponibles, onPremioGanado })` — componente completo, sin lógica de giro todavía en esta tarea (el botón existe pero no hace nada).

- [ ] **Step 1: Escribir `wheelMath.js`**

```js
// frontend/components/rewards/wheelMath.js

export const SEGMENT_COUNT = 8;
export const SEGMENT_ANGLE = 360 / SEGMENT_COUNT; // 45

const toRad = (deg) => (deg * Math.PI) / 180;

// Ángulo (grados) del centro del gajo `index`, con index 0 centrado arriba (-90°).
export function segmentMidAngle(index) {
    return -90 + index * SEGMENT_ANGLE;
}

// Path SVG (pie slice) del gajo `index`, radio `r`, centro `(cx, cy)`.
export function segmentPath(index, cx, cy, r) {
    const mid = segmentMidAngle(index);
    const a0 = mid - SEGMENT_ANGLE / 2;
    const a1 = mid + SEGMENT_ANGLE / 2;
    const x0 = cx + r * Math.cos(toRad(a0));
    const y0 = cy + r * Math.sin(toRad(a0));
    const x1 = cx + r * Math.cos(toRad(a1));
    const y1 = cy + r * Math.sin(toRad(a1));
    return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`;
}

// Posición (x, y) del ícono/label del gajo `index` en reposo (sin rotación aplicada).
export function labelPosition(index, cx, cy, rLabel) {
    const mid = segmentMidAngle(index);
    return {
        x: cx + rLabel * Math.cos(toRad(mid)),
        y: cy + rLabel * Math.sin(toRad(mid)),
    };
}

// Ángulo (grados) al que hay que rotar la rueda para que el gajo `index` quede
// exactamente bajo el puntero fijo de arriba, dado el ángulo actual acumulado
// `currentRotationDeg` (puede ser cualquier número, no normalizado) y una
// cantidad mínima de vueltas completas `spins`.
export function targetRotationForIndex(index, currentRotationDeg, spins = 4) {
    const targetMod = -(index * SEGMENT_ANGLE);
    const currentMod = ((currentRotationDeg % 360) + 360) % 360;
    const targetModPositive = ((targetMod % 360) + 360) % 360;
    let delta = targetModPositive - currentMod;
    delta = ((delta % 360) + 360) % 360;
    return currentRotationDeg + delta + spins * 360;
}
```

- [ ] **Step 2: Verificar la geometría manualmente**

Corré esto con `node` (no requiere el entorno de Expo, son funciones puras):

```bash
node -e "
const m = require('./frontend/components/rewards/wheelMath.js');
console.log('mid(0)=', m.segmentMidAngle(0), '(esperado -90)');
console.log('mid(2)=', m.segmentMidAngle(2), '(esperado 0)');
console.log('target(0, 0)=', m.targetRotationForIndex(0, 0), '(esperado 1440, 4 vueltas exactas)');
console.log('target(2, 0)=', m.targetRotationForIndex(2, 0), '(esperado 1710)');
console.log('target(2, 1440)=', m.targetRotationForIndex(2, 1440), '(esperado 3150, sigue girando hacia adelante desde donde quedo)');
"
```

Nota: `wheelMath.js` usa `export`/`import` (ESM), pero el proyecto es Metro/Babel — para correr el chequeo standalone con `node` puro, reescribí temporalmente los `export function` a `module.exports = {...}` en una copia del archivo (no commiteada), corré el chequeo, y descartala. Es la parte más propensa a error de todo el componente (la aritmética modular), así que si algún valor no coincide con el esperado, revisá `targetRotationForIndex` línea por línea antes de seguir — no continúes a los siguientes steps con esta fórmula rota, porque el Step 4 de la Tarea 2 depende de que esto esté bien.

- [ ] **Step 3: Escribir el render estático de `SpinWheel.js`**

```jsx
// frontend/components/rewards/SpinWheel.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import {
    SEGMENT_COUNT,
    segmentPath,
    labelPosition,
} from './wheelMath';

const { width: screenWidth } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(screenWidth - 60, 340);
const RADIUS = WHEEL_SIZE / 2;
const LABEL_RADIUS = RADIUS * 0.62;

export const PREMIOS_DEFAULT = [
    { id: 'off20', label: '20% OFF', icon: 'pricetag-outline' },
    { id: 'envio', label: 'Envío gratis', icon: 'bicycle-outline' },
    { id: 'postre', label: 'Postre gratis', icon: 'ice-cream-outline' },
    { id: 'off15', label: '15% OFF', icon: 'pricetag-outline' },
    { id: 'plato', label: 'Plato gratis', icon: 'restaurant-outline' },
    { id: 'bebidas', label: '2x1 en bebidas', icon: 'wine-outline' },
    { id: 'pizzas', label: '2x1 en pizzas', icon: 'pizza-outline' },
    { id: 'off10', label: '10% OFF', icon: 'bag-handle-outline' },
];

export default function SpinWheel({
    premios = PREMIOS_DEFAULT,
    girosDisponibles = 3,
    onPremioGanado,
}) {
    const [girando, setGirando] = useState(false);

    const handleGirar = () => {
        // Lógica de giro llega en la Tarea 2 — por ahora no hace nada.
    };

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>¡Es tu momento de{'\n'}ganar!</Text>
            <Text style={styles.subtitulo}>
                Girá la ruleta y obtené premios increíbles en tu próxima compra.
            </Text>

            <View style={styles.badge}>
                <Ionicons name="refresh" size={14} color="#FF8800" />
                <Text style={styles.badgeText}>{girosDisponibles} giros disponibles</Text>
            </View>

            <View style={styles.wheelOuter}>
                <View style={styles.pointer} />
                <View style={styles.wheelPerspective}>
                    <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                        {premios.slice(0, SEGMENT_COUNT).map((premio, i) => (
                            <Path
                                key={premio.id}
                                d={segmentPath(i, RADIUS, RADIUS, RADIUS)}
                                fill={i % 2 === 0 ? '#FF8800' : '#1A1A2E'}
                                stroke="#FFB74D"
                                strokeWidth={1}
                            />
                        ))}
                        <Circle cx={RADIUS} cy={RADIUS} r={RADIUS * 0.16} fill="#FF8800" stroke="#fff" strokeWidth={2} />
                    </Svg>
                    {premios.slice(0, SEGMENT_COUNT).map((premio, i) => {
                        const pos = labelPosition(i, RADIUS, RADIUS, LABEL_RADIUS);
                        return (
                            <View
                                key={premio.id}
                                style={[styles.labelWrap, { left: pos.x - 34, top: pos.y - 24 }]}
                            >
                                <Ionicons name={premio.icon} size={18} color="#fff" />
                                <Text style={styles.labelText}>{premio.label}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            <TouchableOpacity
                style={[styles.girarBtn, girando && styles.girarBtnDisabled]}
                onPress={handleGirar}
                disabled={girando}
                activeOpacity={0.85}
            >
                <Text style={styles.girarBtnText}>¡Girar!</Text>
            </TouchableOpacity>
            <Text style={styles.footerText}>
                Tus premios se aplican automáticamente en el carrito.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 40 },
    titulo: { color: '#fff', fontSize: 28, fontFamily: 'Poppins-Bold', textAlign: 'center' },
    subtitulo: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginTop: 10, fontFamily: 'Poppins-Regular' },
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 8, marginTop: 18,
    },
    badgeText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins-SemiBold' },
    wheelOuter: { alignItems: 'center', marginTop: 32 },
    pointer: {
        width: 0, height: 0, zIndex: 10,
        borderLeftWidth: 14, borderRightWidth: 14, borderTopWidth: 20,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor: '#FFB74D', marginBottom: -6,
    },
    wheelPerspective: {
        transform: [{ perspective: 800 }, { rotateX: '8deg' }],
        shadowColor: '#000', shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
    },
    labelWrap: {
        position: 'absolute', width: 68, alignItems: 'center',
    },
    labelText: {
        color: '#fff', fontSize: 11, fontFamily: 'Poppins-SemiBold',
        textAlign: 'center', marginTop: 2,
    },
    girarBtn: {
        backgroundColor: '#fff', borderRadius: 30,
        paddingVertical: 16, paddingHorizontal: 60, marginTop: 32,
    },
    girarBtnDisabled: { opacity: 0.6 },
    girarBtnText: { color: '#FF8800', fontSize: 18, fontFamily: 'Poppins-Bold' },
    footerText: {
        color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center',
        marginTop: 14, marginBottom: 20,
    },
});
```

- [ ] **Step 4: Verificación manual en Expo Go**

Insertá temporalmente `<SpinWheel />` en cualquier pantalla existente (por ejemplo, al final de `ScreenHome.js`, dentro del `return`, solo para probar — revertí ese insert temporal al terminar la tarea, no se commitea) y corré `npx expo start` desde `frontend/`.

Confirmá visualmente:
- Los 8 gajos se ven completos, sin huecos ni superposiciones, alternando naranja/oscuro.
- Cada gajo tiene su ícono y texto centrados dentro de su porción.
- El puntero está arriba, centrado.
- La ruleta tiene una inclinación 3D sutil y una sombra debajo.
- El botón "¡Girar!" se ve pero no hace nada al tocarlo (esperado en esta tarea).

Sacá una captura de pantalla si podés, para comparar contra el mockup original.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/rewards/wheelMath.js frontend/components/rewards/SpinWheel.js
git commit -m "feat(rewards): geometria y render estatico de SpinWheel"
```

---

### Task 2: Animación de giro + modal de resultado

**Files:**
- Modify: `frontend/components/rewards/SpinWheel.js`

**Interfaces:**
- Consumes: `targetRotationForIndex` de `wheelMath.js` (ya escrito en Task 1).
- Produces: `SpinWheel` ahora gira de verdad al tocar "¡Girar!", elige un premio al azar, y llama a `onPremioGanado(premio)` al terminar — prop ya declarada en la firma del componente desde la Tarea 1, sin uso hasta ahora.

- [ ] **Step 1: Agregar el estado de rotación animada y el cálculo del ganador**

En `SpinWheel.js`, agregar los imports de reanimated y el shared value de rotación:

```jsx
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { targetRotationForIndex } from './wheelMath';
```

Dentro del componente, reemplazar `const [girando, setGirando] = useState(false);` por:

```jsx
    const [girando, setGirando] = useState(false);
    const [premioGanado, setPremioGanado] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const rotation = useSharedValue(0);

    const animatedWheelStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const mostrarResultado = (premio) => {
        setPremioGanado(premio);
        setModalVisible(true);
        setGirando(false);
        onPremioGanado?.(premio);
    };
```

- [ ] **Step 2: Implementar `handleGirar` con la secuencia de animación**

Reemplazar el `handleGirar` vacío de la Tarea 1 por:

```jsx
    const handleGirar = () => {
        if (girando) return;
        setGirando(true);

        const items = premios.slice(0, SEGMENT_COUNT);
        const winnerIndex = Math.floor(Math.random() * items.length);
        const winner = items[winnerIndex];
        const finalTarget = targetRotationForIndex(winnerIndex, rotation.value, 4);

        rotation.value = withSequence(
            withTiming(finalTarget - 15, {
                duration: 2800,
                easing: Easing.out(Easing.cubic),
            }),
            withTiming(finalTarget + 10, { duration: 220, easing: Easing.linear }),
            withTiming(finalTarget, { duration: 180, easing: Easing.out(Easing.quad) }, (finished) => {
                if (finished) {
                    runOnJS(mostrarResultado)(winner);
                }
            })
        );
    };
```

- [ ] **Step 3: Aplicar la animación al `Svg` y agregar el modal**

Envolver el `<Svg>` (dentro de `wheelPerspective`) con `Animated.View` usando `animatedWheelStyle`:

```jsx
                <View style={styles.wheelPerspective}>
                    <Animated.View style={animatedWheelStyle}>
                        <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                            {/* ...paths y circle sin cambios... */}
                        </Svg>
                    </Animated.View>
                    {/* ...labels sin cambios, quedan fuera del Animated.View a proposito:
                         en esta tarea giran junto con la rueda solo visualmente porque
                         están superpuestos en la misma posición — no se resuelve su
                         contra-rotación en esta tarea, ver nota abajo. */}
                </View>
```

Nota de alcance: la spec pide que las etiquetas queden "siempre legibles" — en esta tarea los labels NO se mueven junto con la rotación (quedan fijos en su posición de reposo mientras el `Svg` de abajo gira), lo cual ya cumple visualmente el efecto pedido (el texto nunca se invierte ni gira) sin necesitar animar su posición. Si al verificar visualmente en el Step 4 se ve raro que las etiquetas queden "flotando" desalineadas del gajo mientras gira (es esperable un desfasaje visual breve solo durante el giro, no en reposo), documentalo como concern en el reporte pero no lo resuelvas en esta tarea — el spec prioriza que en reposo (antes y después de girar) cada etiqueta esté sobre su gajo correcto, lo cual sí se cumple porque ambos (Svg y labels) usan la misma `labelPosition`/`segmentPath` en su ángulo de reposo, y el chequeo del Step 5 de la Tarea 1 ya lo validó.

Agregar el modal al final del JSX, antes del cierre de `</View>` del `container`:

```jsx
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        {premioGanado && (
                            <>
                                <Ionicons name={premioGanado.icon} size={48} color="#FF8800" />
                                <Text style={styles.modalTitle}>¡Ganaste {premioGanado.label}!</Text>
                            </>
                        )}
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.modalCloseBtnText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
```

Agregar `Modal` al import de `react-native` (`import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal } from 'react-native';`).

Agregar los estilos nuevos al `StyleSheet.create`:

```js
    modalBackdrop: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center', alignItems: 'center',
    },
    modalCard: {
        backgroundColor: '#1A1A2E', borderRadius: 24,
        paddingVertical: 32, paddingHorizontal: 28,
        alignItems: 'center', width: '80%',
    },
    modalTitle: {
        color: '#fff', fontSize: 20, fontFamily: 'Poppins-Bold',
        textAlign: 'center', marginTop: 12, marginBottom: 20,
    },
    modalCloseBtn: {
        backgroundColor: '#FF8800', borderRadius: 20,
        paddingVertical: 10, paddingHorizontal: 32,
    },
    modalCloseBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins-Bold' },
```

- [ ] **Step 4: Verificación manual en Expo Go**

Con el `<SpinWheel />` temporal seguí insertado (de la Tarea 1):

- Tocar "¡Girar!" gira la ruleta varias vueltas y frena con un pequeño rebote.
- El botón queda deshabilitado (atenuado) mientras gira.
- Al frenar, aparece el modal con el ícono y el nombre del premio.
- El gajo que quedó bajo el puntero visualmente coincide con el premio que muestra el modal (repetí el giro 5-6 veces variando el resultado para confirmar que no hay desfasaje sistemático).
- Cerrar el modal funciona y se puede volver a girar.
- Girar varias veces seguidas no traba ni resetea la rotación de forma brusca (cada giro sigue sumando vueltas desde donde quedó el anterior).

- [ ] **Step 5: Commit**

```bash
git add frontend/components/rewards/SpinWheel.js
git commit -m "feat(rewards): animacion de giro con fisica y modal de resultado"
```

---

### Task 3: Animaciones ambientales (pulso del centro + confetti) y limpieza del insert temporal

**Files:**
- Modify: `frontend/components/rewards/SpinWheel.js`

**Interfaces:**
- Consumes: nada nuevo de otras tareas.
- Produces: nada consumido por otras tareas — es la última.

- [ ] **Step 1: Agregar el pulso continuo al círculo central**

En `SpinWheel.js`, agregar un segundo shared value y un loop infinito:

```jsx
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    withRepeat,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { useEffect } from 'react';
```

(`useEffect` se suma al import existente de `React, { useState }` — cambiar a `import React, { useState, useEffect } from 'react';`)

Dentro del componente, después de declarar `rotation`:

```jsx
    const pulse = useSharedValue(1);

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

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));
```

El círculo central hoy es un `<Circle>` de SVG (no animable directamente con estilos de RN) — para animarlo con `pulseStyle`, envolverlo en un `Animated.View` posicionado absoluto sobre el `Svg`, en vez de dibujarlo como parte del `<Svg>`. Reemplazar:

```jsx
                        <Circle cx={RADIUS} cy={RADIUS} r={RADIUS * 0.16} fill="#FF8800" stroke="#fff" strokeWidth={2} />
```

(sacarlo del `<Svg>`) por, inmediatamente después del `</Svg>` de cierre pero todavía dentro de `wheelPerspective`:

```jsx
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.centerHub,
                            { left: RADIUS - RADIUS * 0.16, top: RADIUS - RADIUS * 0.16, width: RADIUS * 0.32, height: RADIUS * 0.32, borderRadius: RADIUS * 0.16 },
                            pulseStyle,
                        ]}
                    >
                        <Ionicons name="star" size={RADIUS * 0.16} color="#fff" />
                    </Animated.View>
```

Agregar el estilo base:

```js
    centerHub: {
        position: 'absolute', backgroundColor: '#FF8800',
        borderWidth: 2, borderColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
    },
```

- [ ] **Step 2: Agregar el confetti de fondo (componente `SpinWheelBackground`)**

Al final de `SpinWheel.js` (fuera del componente principal, mismo archivo), agregar un wrapper opcional exportado:

```jsx
const CONFETTI_PIECES = [
    { top: '8%', left: '10%', rotate: '20deg', color: '#FF8800' },
    { top: '15%', left: '85%', rotate: '-15deg', color: '#FFB74D' },
    { top: '35%', left: '5%', rotate: '40deg', color: '#FF5500' },
    { top: '55%', left: '90%', rotate: '-30deg', color: '#FF8800' },
    { top: '75%', left: '8%', rotate: '10deg', color: '#FFB74D' },
    { top: '85%', left: '88%', rotate: '-20deg', color: '#FF5500' },
];

function ConfettiPiece({ top, left, rotate, color }) {
    const drift = useSharedValue(0);

    useEffect(() => {
        drift.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 4000 + Math.random() * 1500, easing: Easing.inOut(Easing.sin) }),
                withTiming(0, { duration: 4000 + Math.random() * 1500, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            false
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateY: drift.value * -10 },
            { rotate },
        ],
    }));

    return (
        <Animated.View
            pointerEvents="none"
            style={[styles.confettiPiece, { top, left, backgroundColor: color }, style]}
        />
    );
}

export function SpinWheelBackground({ children }) {
    return (
        <View style={styles.background}>
            {CONFETTI_PIECES.map((p, i) => (
                <ConfettiPiece key={i} {...p} />
            ))}
            {children}
        </View>
    );
}
```

Agregar los estilos nuevos:

```js
    background: { flex: 1, backgroundColor: '#1A1A2E' },
    confettiPiece: {
        position: 'absolute', width: 10, height: 16, borderRadius: 3,
    },
```

- [ ] **Step 3: Sacar el insert temporal de prueba**

Si en la Tarea 1/2 quedó un `<SpinWheel />` insertado temporalmente en `ScreenHome.js` (u otra pantalla) para probar, revertilo ahora — `SpinWheel` y `SpinWheelBackground` quedan sin usar en ningún lado del árbol de navegación, listos para que se decida después dónde van (fuera de alcance de este plan, ver spec). Confirmá con `git diff frontend/screens/home/ScreenHome.js` (o la pantalla que hayas usado) que no queda ningún rastro del insert de prueba.

- [ ] **Step 4: Verificación manual final en Expo Go**

Insertá temporalmente `<SpinWheelBackground><SpinWheel /></SpinWheelBackground>` una vez más para esta verificación final (y volvé a sacarlo después):

- El círculo central "respira" (pulso de escala) de forma continua y lenta, sin trabarse, tanto en reposo como mientras la ruleta gira.
- Los confetti de fondo se mueven con una deriva lenta y sutil, no parpadean ni saltan.
- Nada de esto interfiere con la animación de giro de la Tarea 2 (podés girar la ruleta varias veces con el pulso/confetti corriendo de fondo sin que se trabe el frame rate de forma perceptible).
- Sacá el insert temporal de nuevo al terminar.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/rewards/SpinWheel.js
git commit -m "feat(rewards): pulso del centro y confetti de fondo para SpinWheel"
```
