# Planes de mejora de animaciones — AppFood

Generados por el skill `improve-animations` (filosofía de Emil Kowalski) sobre `frontend/` en el commit `712791e`. Ningún plan modifica código por sí solo — cada uno está escrito para que un agente sin contexto previo (o un modelo más barato) lo ejecute paso a paso.

| # | Título | Severidad | Categoría | Estado |
|---|---|---|---|---|
| 001 | [Header height → transform](./001-header-height-to-transform.md) | HIGH | Performance | REVERTED |
| 002 | [Reduced motion en 4 loops infinitos](./002-reduced-motion-infinite-loops.md) | MEDIUM | Accessibility | TODO |
| 003 | [SentimientoBar width → scaleX](./003-sentimiento-bar-scalex.md) | MEDIUM | Performance | TODO |
| 004 | [AddAddressSheet altura medida](./004-addaddresssheet-measured-height.md) | LOW | Physicality & origin | TODO |

## Orden de ejecución recomendado

Los 4 planes son **independientes entre sí** — tocan archivos distintos, sin dependencias de código compartido. Se pueden ejecutar en cualquier orden o en paralelo. El orden sugerido abajo es solo por impacto/leverage, no por necesidad técnica:

1. **001** primero — es el de mayor severidad (afecta la interacción más frecuente de la app, el scroll de Home) y el de mayor impacto en rendimiento percibido.
2. **002** segundo — accesibilidad, afecta a usuarios reales con `prefers-reduced-motion` activado en 4 pantallas distintas.
3. **003** — mismo tipo de fix que 001 (layout-property → transform) pero en una pantalla de bajo tráfico (solo admin).
4. **004** — el de menor severidad, es un caso borde (contenido de sheet más alto que 600px) que hoy probablemente no se manifiesta con el contenido actual.

## Nota de corrección

El plan 004 originalmente iba a cubrir dos archivos (`SuggestionSheet.js` y `AddAddressSheet.js`). Al escribir el plan se revisó `SuggestionSheet.js` en detalle y se confirmó que **no tiene el problema** — su offset ya se deriva de `Dimensions.get('window')`, no es un valor hardcodeado. Se descartó de ese plan; ver la sección "Corrección respecto al audit original" dentro de `004-addaddresssheet-measured-height.md` para el detalle.

## Cómo ejecutar un plan

Cada plan es autocontenido: incluye el código actual citado con `archivo:línea`, el código objetivo exacto, los pasos ordenados, límites de alcance y una sección de verificación con feel-check. Para ejecutarlo, seguí los pasos del plan en orden y validá con la sección "Verification" antes de dar por terminado.
