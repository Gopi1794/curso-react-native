# Insights de consumo (patrones producto × día de la semana) — Design

## Contexto y problema

El usuario quiere detectar patrones de consumo ("se vende más pizza los sábados") para poder lanzar promociones dirigidas en el momento apropiado. La idea original mezclaba varios subsistemas independientes: analytics de consumo propio, señales externas (clima), un motor que dispare promociones automáticamente, y "datos de prueba" de benchmarks de industria.

Se decidió decompones en sub-proyectos y arrancar solo por el primero: **detectar patrones en los datos reales que ya genera la app**, sin depender de clima ni de ningún motor automático de promociones. Señales externas y disparo automático quedan como sub-proyectos futuros, a evaluar cuando haya más volumen de datos real.

Sobre los "datos de prueba de internet" que pedía la idea original: no existe un dataset público confiable de consumo de delivery por clima/día que se pueda conectar directamente. Se descartó esa vía — este sub-proyecto trabaja únicamente con datos reales de pedidos de la propia app.

## Realidad de datos actual (verificado en vivo contra la base)

Los 5 restaurantes reales tienen, en los últimos 90 días: Viandas Saludables 28 pedidos, Trevi 3, el resto 0. Con el umbral de este diseño (ver abajo), **hoy esta feature no va a encontrar patrones en ningún restaurante real** — hace falta del orden de 150-300 pedidos en 90 días para que un producto llegue de forma confiable a 5+ pedidos en un mismo día de la semana. Esto es un límite de datos, no un defecto del diseño: la feature debe degradar con gracia ("sin datos suficientes todavía") en vez de forzar una sugerencia de IA con una muestra minúscula. Queda lista para cuando el volumen real crezca.

## Modelo de datos

Una fila por restaurante, se pisa (UPSERT) cada vez que el admin dispara un análisis nuevo — no se acumula historial de análisis viejos, no hace falta para el caso de uso.

```sql
CREATE TABLE consumo_insights (
  id              BIGSERIAL PRIMARY KEY,
  restaurante_id  BIGINT NOT NULL REFERENCES restaurantes(id),
  patrones        JSONB NOT NULL,
  sugerencias     JSONB NOT NULL,
  generado_en     TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT consumo_insights_restaurante_id_key UNIQUE (restaurante_id)
);
```

- `patrones`: array de objetos `{ producto, dia_semana, pedidos_ese_dia, promedio_diario_producto, pct_sobre_promedio }` — los datos crudos detectados, previo a la IA. `dia_semana` sigue la convención de `EXTRACT(DOW ...)` de Postgres: `0` = domingo, `1` = lunes, ..., `6` = sábado. El frontend es responsable de traducir ese número a nombre de día para mostrarlo.
- `sugerencias`: array de strings — las frases generadas por Claude a partir de `patrones`.

## Detección de patrones (SQL + JS, sin IA)

Query base (pedidos entregados de los últimos 90 días, agrupados por producto y día de la semana):

```sql
SELECT
    COALESCE(mi.nombre, pi.nombre_item)   AS producto,
    EXTRACT(DOW FROM p.fecha_creacion)::int AS dia_semana,
    COUNT(*)::int                          AS pedidos
FROM pedido_items pi
JOIN pedidos p ON p.id = pi.pedido_id
LEFT JOIN menu_items mi ON mi.id = pi.menu_item_id
WHERE p.restaurante_id = $1
  AND p.estado != 'cancelado'
  AND p.fecha_creacion >= NOW() - INTERVAL '90 days'
GROUP BY producto, dia_semana
```

En JS, sobre el resultado:
1. Para cada producto, calcular su promedio de pedidos por día (`total_pedidos_producto / 7`).
2. Marcar como "patrón" cada combinación producto+día donde `pedidos_ese_dia >= promedio_diario_producto * 1.5` **Y** `pedidos_ese_dia >= 5` (umbral mínimo anti-ruido, acordado explícitamente con el usuario tras mostrarle los números reales).
3. Si no queda ningún patrón que pase ambos filtros, no se llama a la IA — se guarda `patrones: []`, `sugerencias: []` y el frontend muestra "Sin datos suficientes todavía".

## Generación de sugerencias (Claude Haiku)

Mismo patrón que `backend/src/services/reviewsInsightsService.js` (mismo SDK `@anthropic-ai/sdk`, mismo modelo `claude-haiku-4-5-20251001`, misma variable de entorno `ANTHROPIC_API_KEY` ya configurada). Solo se le pasan los patrones ya filtrados (unas pocas líneas de texto, no los pedidos crudos) — llamada liviana, mismo orden de costo que la de reviews.

Prompt de ejemplo, dado un patrón `{ producto: "Pizza", dia_semana: 6, pedidos: 18, promedio: 5, pct_sobre_promedio: 260 }`:
> "Pizza se vende 260% más los sábados que su promedio (18 pedidos vs. 5 promedio). Sugerí una acción concreta de marketing en una frase corta."

Devuelve un array de sugerencias, una por patrón detectado, frases cortas tipo "Considerá envío gratis en pizzas los sábados."

## Backend — endpoints

Mismo patrón que `zonas-envio`: rutas con `:restauranteId` + middleware `requireAdminOwnership` ya existente.

```
GET  /api/admin/stats/consumo-insights/:restauranteId   → último resultado guardado (o null si nunca se generó). NO llama a la IA.
POST /api/admin/stats/consumo-insights/:restauranteId   → dispara el análisis completo (SQL + IA), hace UPSERT, devuelve el resultado nuevo. Este es el que gasta tokens.
```

`GET` es gratis y se puede llamar al abrir la pantalla sin problema. `POST` solo se dispara desde el botón "Analizar ahora" del frontend — nunca automático.

## Frontend

Pantalla nueva `AdminConsumoInsightsScreen.js`, mismo estilo visual que `AdminReviewsInsightsScreen.js` (`SkeletonBox`, mismo layout de card). Diferencia deliberada respecto a esa pantalla hermana: **no auto-dispara la IA al montar** — solo hace el `GET` (gratis) para mostrar el último análisis guardado con su fecha ("Generado hace 3 días"), o el estado vacío si nunca se generó uno. Un botón "Analizar ahora" dispara el `POST`, con loading state mientras corre, y actualiza la vista al terminar.

Registro en navegación: mismo patrón que `AdminReviewsInsightsScreen` — import + `Stack.Screen` en `frontend/navigation/ProfileStack.js`, tarjeta nueva en el array `CARDS` de `frontend/screens/admin/AdminDashboardScreen.js` (agregando su `key` al chequeo `isAI` existente para que tenga el mismo brillo animado que ya tiene la tarjeta de reviews).

## Error handling

- Restaurante sin ningún patrón que supere el umbral: respuesta exitosa con `patrones: []`, sin llamar a la IA, frontend muestra "Sin datos suficientes todavía" en vez de un error.
- Falla la llamada a Claude (API caída, timeout): el `POST` responde error claro, no rompe la pantalla; el admin puede reintentar tocando el botón de nuevo. No se hace `UPSERT` con datos parciales.
- Restaurante sin pedidos en absoluto: mismo camino que "sin patrones", no un caso especial.

## Testing

Sin test runner automatizado en este proyecto — verificación con `node --check`, compilación Babel, curl contra el backend real, y prueba manual en Expo, mismo patrón que toda la sesión.
