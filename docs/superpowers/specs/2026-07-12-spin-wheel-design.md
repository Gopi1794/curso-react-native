# Componente `SpinWheel` — ruleta de premios (solo visual)

## Contexto

Se quiere un componente de "ruleta de premios" tipo gamificación para la app, inspirado en un mockup ya generado (fondo oscuro `#1A1A2E`, gajos alternados `#FF8800`/negro, 8 premios, botón "¡Girar!"). Esta iteración cubre **solo el componente visual**: la ruleta gira, elige un premio al azar y lo muestra. No incluye backend, persistencia, límite real de giros ni conexión con cupones — eso se define en una iteración futura, igual que dónde se va a insertar en la navegación de la app.

## Alcance

Incluye:
- Componente standalone `SpinWheel`, sin dependencias de navegación ni Redux.
- Renderizado de la ruleta con 8 gajos (premios fijos, configurables por prop).
- Animación de giro con resultado aleatorio.
- Modal de resultado al terminar de girar.
- Toques de profundidad ("3D sutil") en la animación.

Fuera de alcance (explícitamente pospuesto):
- Persistencia de giros disponibles, límite diario, o cualquier lógica de backend.
- Conexión de premios con el sistema de cupones (`cupones` table).
- Dónde y cómo se navega hasta este componente dentro de la app.

## Librerías

Ninguna dependencia nueva. Se usan las ya presentes en `frontend/package.json`:
- `react-native-svg` (`15.12.1`) — ya usado en `CartScreen.js` vía `SvgXml` — para dibujar los gajos como `Path` de arco.
- `react-native-reanimated` (`~4.1.1`) — para la animación de rotación con física (aceleración + rebote al frenar).
- `@expo/vector-icons` (Ionicons) — para los íconos de cada gajo, mismo set que usa el resto de la app.

## Componente: `frontend/components/rewards/SpinWheel.js`

### Props

```js
SpinWheel.propTypes conceptual (proyecto es JS puro, sin TypeScript — se documenta aquí, no se declara con PropTypes):

{
  premios: Array<{
    id: string,
    label: string,        // ej. "20% OFF"
    icon: string,          // nombre de ícono Ionicons, ej. "pricetag-outline"
  }>,
  // default: los 8 premios del mockup (ver "Premios por defecto" abajo)

  girosDisponibles: number,
  // default: 3 — puramente decorativo, no se decrementa (giros ilimitados en esta iteración)

  onPremioGanado: (premio) => void,
  // opcional, se llama cuando termina el giro y se muestra el modal — permite que el padre reaccione más adelante sin acoplar lógica ahora
}
```

### Premios por defecto (8, en el orden del mockup, sentido horario desde arriba)

```js
const PREMIOS_DEFAULT = [
    { id: 'off20',    label: '20% OFF',        icon: 'pricetag-outline' },
    { id: 'envio',    label: 'Envío gratis',   icon: 'bicycle-outline' },
    { id: 'postre',   label: 'Postre gratis',  icon: 'ice-cream-outline' },
    { id: 'off15',    label: '15% OFF',        icon: 'pricetag-outline' },
    { id: 'plato',    label: 'Plato gratis',   icon: 'restaurant-outline' },
    { id: 'bebidas',  label: '2x1 en bebidas', icon: 'wine-outline' },
    { id: 'pizzas',   label: '2x1 en pizzas',  icon: 'pizza-outline' },
    { id: 'off10',    label: '10% OFF',        icon: 'bag-handle-outline' },
];
```

### Estructura visual (de afuera hacia adentro)

1. Fondo `#1A1A2E` con confetti decorativo (`View`s absolutos, pequeños rectángulos rotados en naranja/dorado, animados con deriva lenta tipo parallax — no son parte del `SpinWheel` en sí, sino un wrapper `SpinWheelBackground` opcional dentro del mismo archivo, para que el componente principal se pueda usar también sobre otro fondo si hace falta).
2. Título "¡Es tu momento de ganar!" + subtítulo — estático, vía props `titulo`/`subtitulo` con esos defaults.
3. Badge "N giros disponibles" (decorativo, usa la prop `girosDisponibles`).
4. La ruleta:
   - Contenedor con `transform: [{ perspective: 800 }, { rotateX: '8deg' }]` fijo (no animado) para la inclinación 3D sutil.
   - Sombra difusa debajo (`shadowColor`, `shadowOpacity`, `shadowRadius` grande, o `elevation` en Android).
   - SVG circular: 8 `Path` de arco (45° cada uno), colores alternados `#FF8800`/`#1A1A2E`, borde exterior dorado con puntitos de "luces" (pequeños círculos claros distribuidos en el borde).
   - Ícono + texto de cada premio, centrado radialmente en su gajo, contra-rotado para quedar siempre legible (horizontal) sin importar en qué posición quedó el gajo.
   - Centro: círculo naranja con ícono de estrella, con un pulso de escala lentísimo y continuo (`1 → 1.03 → 1`, `withRepeat` + `withTiming`, varios segundos por ciclo).
   - Puntero/flecha fija arriba del círculo, apuntando hacia abajo.
5. Texto "¡Premios todos los días!" — estático, decorativo.
6. Botón "¡Girar!" — grande, píldora, blanco con texto naranja. Deshabilitado (opacity reducida) mientras la ruleta está girando, para evitar doble-tap.
7. Texto pequeño "Tus premios se aplican automáticamente en el carrito" — estático, decorativo (no implica lógica real todavía).

### Lógica de giro

1. Al tocar "¡Girar!": elegir un índice aleatorio `0-7` con `Math.floor(Math.random() * premios.length)`.
2. Calcular el ángulo final: cada gajo ocupa 45°; el ángulo para que el gajo elegido quede exactamente bajo el puntero (arriba, 0°) es `-(indiceElegido * 45)` grados, ajustado al offset de dibujo del primer gajo.
3. Sumarle **N vueltas completas** (`360 * 4`, fijo) al ángulo objetivo, para que siempre gire varias veces sin importar dónde haya quedado la vez anterior — el valor de rotación acumula, no se resetea a 0 entre giros.
4. Animar con `react-native-reanimated`:
   - `withSequence`:
     a. `withTiming` hasta un poco antes del ángulo final (ej. el ángulo final menos 15°), con `duration` ~2800ms y `Easing.out(Easing.cubic)` (arranca rápido, va frenando).
     b. `withTiming` desde ahí hasta el ángulo final + un pequeño overshoot (ej. +10°), `duration` ~220ms.
     c. `withTiming` de vuelta al ángulo final exacto, `duration` ~180ms — este es el "rebote" al frenar.
5. Al terminar la secuencia (callback `onFinish` del último `withTiming`, corrido a JS thread con `runOnJS`): abrir el modal de resultado con el premio elegido, y llamar a `onPremioGanado(premio)` si vino la prop.
6. Mientras gira, el botón "¡Girar!" queda deshabilitado (bandera de estado local `girando`).

### Modal de resultado

Modal simple con `Modal` de React Native (`transparent` + fondo semi-opaco), mismo patrón que ya usan `WelcomePopup.js` y otros modales del proyecto, con:
- Texto "¡Ganaste [label del premio]!" en naranja/blanco sobre el fondo oscuro.
- Ícono del premio ganado, grande.
- Botón "Cerrar" que cierra el modal (sin ninguna acción adicional — no aplica el premio a nada real todavía).

## Testing

No hay test runner automatizado en el proyecto. Verificación manual en Expo Go:
1. El componente renderiza sin errores con las props default.
2. Tocar "¡Girar!" dispara la animación, el botón se deshabilita durante el giro.
3. La ruleta siempre para con un gajo exactamente bajo el puntero (no un punto intermedio entre dos gajos).
4. Al parar, aparece el modal con el premio correcto (el que quedó bajo el puntero visualmente coincide con el que muestra el modal).
5. Girar varias veces seguidas funciona sin que la rotación "salte" o se resetee de forma brusca.
6. El pulso del centro y el confetti de fondo se ven continuos y suaves, sin trabarse, mientras la ruleta no está girando.
