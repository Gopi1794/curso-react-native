# Límite de giros, vencimiento y titularidad de los cupones de ruleta

## Contexto

El sistema de cupones reales de la ruleta (`2026-07-13-cupones-ruleta-design.md`, ya implementado) generaba códigos compartibles, sin vencimiento, y sin límite de giros por cliente — el badge "N giros disponibles" era decorativo. Esta iteración cierra esos tres puntos, que surgieron como necesidades reales al usar la feature: los cupones deben pertenecer a quien los ganó, vencer a los 7 días, y el restaurante debe poder limitar cuántas veces gira cada cliente — cortando además apenas alguien gana un premio real, para no regalar de más.

También se suma: el carrito debe manejar con gracia el caso de que un cupón de ruleta aplicado deje de cumplir su condición (en vez de cobrar de más/de menos en silencio, como se detectó en la revisión final del ciclo anterior).

## Alcance

Incluye:
1. `ruleta_cupones` gana `usuario_id` (quien ganó) y `fecha_expiracion` (7 días desde que se generó).
2. El endpoint de girar y el de validar cupón pasan a requerir login (ya lo requiere `createOrder`, y el helper `request()` del frontend ya manda el token en todos los pedidos, así que no hace falta cambiar nada del lado del cliente para esto).
3. Límite de giros configurable por restaurante (`ruleta_giros_maximos`, vacío = ilimitado), que se resetea cada vez que el restaurante reactiva la ruleta (pasa de apagada a prendida).
4. Ganar un premio con cupón real (con `tipo`) corta los giros restantes de esa tanda — caer en vacío o "solo visual" no corta nada.
5. La ruleta deja de aparecer en Home si el cliente ya agotó sus giros o ya ganó un premio real en esta tanda.
6. El modal de "¡Ganaste!" muestra que el código vence en 7 días.
7. El carrito re-valida el cupón de ruleta aplicado cada vez que cambia el contenido; si deja de cumplir condición, se deshabilita (con aviso) en vez de perderse o cobrar sin avisar.

Fuera de alcance: notificar al usuario cuando su cupón está por vencer, historial de giros visible para el cliente, límites por IP (el límite es por usuario logueado, no por dispositivo/IP).

## Base de datos

Migración nueva (`database/migrations/015_ruleta_limites_vencimiento.sql`):

```sql
ALTER TABLE ruleta_cupones
    ADD COLUMN IF NOT EXISTS usuario_id BIGINT REFERENCES usuarios(id),
    ADD COLUMN IF NOT EXISTS fecha_expiracion TIMESTAMP;

ALTER TABLE restaurantes
    ADD COLUMN IF NOT EXISTS ruleta_giros_maximos INTEGER,
    ADD COLUMN IF NOT EXISTS ruleta_activada_en TIMESTAMP;

CREATE TABLE IF NOT EXISTS ruleta_giros (
    id                BIGSERIAL   PRIMARY KEY,
    usuario_id        BIGINT      NOT NULL REFERENCES usuarios(id),
    restaurante_id    BIGINT      NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    gano_premio_real  BOOLEAN     NOT NULL DEFAULT FALSE,
    fecha_creacion    TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ruleta_giros_usuario_restaurante ON ruleta_giros (usuario_id, restaurante_id, fecha_creacion);
```

`ruleta_giros_maximos IS NULL` significa giros ilimitados (comportamiento actual, sin cambios para el restaurante que no lo configure). `ruleta_activada_en` se actualiza a `NOW()` cada vez que `ruleta_activa` pasa de `false` a `true` — es el punto de corte para contar giros de la tanda actual: todo `ruleta_giros`/`ruleta_cupones` con `fecha_creacion < ruleta_activada_en` queda fuera del conteo, así reactivar la ruleta le da giros frescos a todos sin necesitar lógica de fechas tipo "cada 3 días".

## Backend

### Autenticación de los endpoints de ruleta

`backend/src/routers/restaurants.js`: `GET /:id/ruleta` y `POST /:id/ruleta/girar` pasan a requerir `authMiddleware`. El helper `request()` de `frontend/services/api.js` ya adjunta el token JWT en todas las llamadas si existe (verificado en `frontend/services/api.js:41-46`), así que no hace falta cambiar la forma en que el frontend llama a estos endpoints — solo dejan de funcionar sin sesión iniciada (que ya es un requisito implícito para llegar a Home).

### `getRuleta` — sumar info de giros del usuario

Además de `activa`/`premios`, la respuesta suma:

```json
{
  "success": true,
  "activa": true,
  "premios": [...],
  "girosRestantes": 2,
  "puedeGirar": true
}
```

`girosRestantes` es `null` si `ruleta_giros_maximos` del restaurante es `NULL` (ilimitado). `puedeGirar` es `false` si: la ruleta está apagada, el usuario ya agotó sus giros de esta tanda, o el usuario ya ganó un premio real (con `tipo`) en esta tanda — se calcula consultando `ruleta_giros` con `fecha_creacion >= restaurantes.ruleta_activada_en` para ese usuario y restaurante.

### `girarRuleta` — enforce del límite y corte tras ganar

Antes de elegir el gajo ganador, la función chequea (usando el mismo criterio de `ruleta_activada_en` de arriba):
1. Si el usuario ya ganó un premio real en esta tanda → `403` `{message: "Ya ganaste un premio, no podés seguir girando"}`.
2. Si `ruleta_giros_maximos` no es `NULL` y el usuario ya alcanzó ese número de giros en esta tanda → `403` `{message: "Ya usaste tus giros disponibles"}`.

Si pasa ambos chequeos, procede como hoy (elige índice al azar, arma la respuesta), y al final — sin importar el resultado — inserta una fila en `ruleta_giros` con `gano_premio_real = true` solo si el premio elegido tenía `tipo` no nulo (es decir, se generó un código real). El insert de `ruleta_giros` va **después** de que el cupón (si corresponde) ya se insertó exitosamente, para no contar un giro que falló por otra razón.

Al insertar en `ruleta_cupones`, sumar `usuario_id = req.user.userId` y `fecha_expiracion = NOW() + INTERVAL '7 days'` a los valores ya existentes.

### `adminRuletaController.updateInfo` — reset al reactivar + nuevo campo

Antes del `UPDATE restaurantes SET ruleta_activa = $1`, leer el valor actual de `ruleta_activa` para ese restaurante; si estaba en `false` y el nuevo valor es `true`, el `UPDATE` también debe setear `ruleta_activada_en = NOW()`. El body de `updateInfo` suma `girosMaximos` (número o `null`), que se guarda en `restaurantes.ruleta_giros_maximos`.

### `validateByCode` y `createOrder` — titularidad y vencimiento

`backend/src/routers/cupones.js`: `POST /validate` pasa a requerir `authMiddleware`.

En ambos lugares (el `SELECT` que busca en `ruleta_cupones`), sumar a la condición `WHERE`:

```sql
AND usuario_id = $N AND fecha_expiracion > NOW()
```

(`$N` = el `req.user.userId` de la sesión actual). Si el cupón existe pero pertenece a otro usuario o está vencido, se trata igual que "no encontrado" — mismo mensaje genérico de cupón inválido (no revelar que el código existe pero es de otro usuario, para no filtrar información).

## Frontend

### Admin (`AdminRuletaScreen.js`)

Suma un campo numérico "Giros máximos por cliente (vacío = ilimitado)" junto al switch de activar, mandado como `girosMaximos` en el `PUT`.

### Home (`ScreenHome.js`)

`fetchRuleta` ahora también lee `girosRestantes`/`puedeGirar` de la respuesta. `showSpinWheel` pasa a ser `activa && puedeGirar` (antes solo `activa`).

### `SpinWheel.js`

El modal de resultado, cuando hay `codigoGanado`, suma un texto: "Vence en 7 días" debajo del código.

### Carrito (`CartScreen.js`)

Se agrega un `useEffect` que re-corre la validación del cupón aplicado cada vez que cambia `cartItems` (solo si `couponApplied` y el cupón es de ruleta — los cupones legacy no tienen condición, no necesitan re-validarse). Si la re-validación falla por condición (400 con mensaje), el cupón queda en estado "deshabilitado": se muestra el código con un texto en rojo debajo explicando el motivo, `calculateDiscount()` devuelve `0` mientras esté deshabilitado, y al confirmar el pedido **no se manda `cupon_codigo`** si está deshabilitado en ese momento (así el backend nunca lo ve, nunca lo marca usado, y el cliente lo puede usar después si vuelve a cumplir la condición). Si la re-validación vuelve a pasar, se re-habilita automáticamente.

## Testing

Sin test runner automatizado — verificación manual:

1. Configurar `ruleta_giros_maximos = 3` en un restaurante, ganar un premio real en el primer giro — `puedeGirar` debe pasar a `false` inmediatamente, la ruleta no debe volver a aparecer en Home aunque quedaran 2 giros.
2. Con el mismo límite, si en los primeros 2 giros el cliente cae en vacío/solo-visual (sin premio real), debe poder seguir girando hasta el 3ro; al 4to intento, `403`.
3. Restaurante apaga y vuelve a prender la ruleta — el mismo cliente que ya había agotado sus giros debe poder girar de nuevo.
4. Ganar un cupón, intentar aplicarlo logueado con OTRO usuario — debe rechazarse como inválido.
5. Ganar un cupón, esperar (o forzar via `UPDATE ruleta_cupones SET fecha_expiracion = NOW() - INTERVAL '1 day'`) y aplicarlo — debe rechazarse por vencido.
6. Aplicar un cupón `plato_gratis` válido, sacar el plato del carrito — el cupón debe quedar visualmente deshabilitado con el mensaje, el total debe recalcularse sin el descuento, y al confirmar el pedido el cupón NO debe quedar `usado=true` (sigue disponible). Volver a agregar el plato — el cupón se debe re-habilitar solo.
