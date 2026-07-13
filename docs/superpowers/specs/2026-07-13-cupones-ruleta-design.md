# Sistema de cupones reales de la ruleta de premios

## Contexto

`SpinWheel` (ver specs previas `2026-07-12-spin-wheel-design.md` y `2026-07-13-admin-configuracion-ruleta-design.md`) hoy es puramente visual: al ganar, muestra un modal con el nombre del premio pero no genera nada aplicable. El sistema de cupones existente (`cupones` table, `cuponesController.js`, sección de cupón en `CartScreen.js`) es global (no por restaurante), solo soporta descuento por porcentaje, y es reutilizable sin límite hasta que vence — no sirve tal cual para lo que se necesita acá.

Este cambio conecta el resultado real de un giro con un cupón canjeable de verdad: código generado automáticamente, copiable, compartible pero de un solo uso total, aplicado en el carrito con validación de condiciones según el tipo de premio.

## Alcance

Incluye:
1. Tipo explícito por gajo en la config de admin (no inferido del texto libre).
2. Generación de un código de cupón al ganar un gajo con tipo real.
3. Tabla nueva `ruleta_cupones`, separada de `cupones` (no se toca el sistema de cupones existente).
4. Botón de copiar en el modal de resultado.
5. Validación y aplicación real en el carrito, con lógica de condición por tipo.
6. Marcado de "usado" atómico al confirmar el pedido, no al aplicar el cupón en el carrito (para no quemarlo si el pedido falla).
7. Costo de envío como constante real en el backend ($2.99), para que `envio_gratis` y los porcentajes "con envío incluido" tengan una base de cálculo real.

Fuera de alcance:
- Envío variable por restaurante/zona/distancia — sigue siendo un valor fijo.
- Límite de cantidad de cupones generados por período, o expiración de los cupones de ruleta (quedan válidos indefinidamente hasta que se usan una vez).
- Historial de cupones ganados visible para el usuario (más allá del modal al momento de ganar).

## Base de datos

Migración nueva (`database/migrations/014_ruleta_cupones.sql`):

```sql
ALTER TABLE ruleta_premios
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(20)
        CHECK (tipo IS NULL OR tipo IN ('porcentaje', 'envio_gratis', 'plato_gratis', 'postre_gratis', '2x1_bebidas', '2x1_pizzas')),
    ADD COLUMN IF NOT EXISTS valor NUMERIC;

CREATE TABLE IF NOT EXISTS ruleta_cupones (
    id              BIGSERIAL       PRIMARY KEY,
    codigo          VARCHAR(12)     NOT NULL UNIQUE,
    restaurante_id  BIGINT          NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    tipo            VARCHAR(20)     NOT NULL CHECK (tipo IN ('porcentaje', 'envio_gratis', 'plato_gratis', 'postre_gratis', '2x1_bebidas', '2x1_pizzas')),
    valor           NUMERIC,
    usado           BOOLEAN         NOT NULL DEFAULT FALSE,
    pedido_id_uso   BIGINT          REFERENCES pedidos(id),
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ruleta_cupones_codigo ON ruleta_cupones (codigo);
```

- `ruleta_premios.tipo` (nullable): si es `NULL`, el gajo se comporta exactamente como hoy — solo visual, sin cupón generado al ganar. `valor` guarda el número de porcentaje cuando `tipo='porcentaje'` (ignorado para los demás tipos).
- `ruleta_cupones.valor` replica el `valor` del premio en el momento de ganar (no depende de que el admin no cambie la config después).
- `pedido_id_uso` queda `NULL` hasta que el cupón se usa de verdad en un pedido confirmado.

## Mapeo de categorías

Los tipos que dependen del contenido del carrito usan `menu_items.categoria` (mismos valores que ya usa `CATEGORY_MAP` en `ScreenHome.js` y el seed de Trevi):

| Tipo de premio | Categorías de `menu_items` consideradas |
|---|---|
| `plato_gratis` | `milanesas`, `platos`, `pastas` |
| `postre_gratis` | `dulces`, `helados` |
| `2x1_bebidas` | `bebidas` |
| `2x1_pizzas` | `pizzas` |

## Backend

### Costo de envío

`backend/src/controllers/ordersController.js` gana una constante `SHIPPING_FEE = 2.99` (mismo valor que ya muestra `CartScreen.js` como texto fijo). El cálculo de `total` pasa a incluirla explícitamente antes de aplicar cualquier descuento.

### Generar el cupón al ganar

Nuevo endpoint `POST /api/restaurants/:id/ruleta/girar` — reemplaza la lógica de "elegir premio al azar" que hoy vive solo en el frontend (`SpinWheel.js`'s `handleGirar`). El servidor es quien decide el índice ganador (nunca confiar en el cliente para esto, ya que ahora hay un cupón real de por medio):

1. Trae los 8 premios del restaurante (mismo query que `getRuleta`).
2. Elige un índice al azar entre los 8 (incluye los vacíos — "perder" sigue siendo un resultado posible).
3. Si el premio elegido tiene `label` (no vacío) y `tipo` no nulo: genera un código de 8 caracteres alfanuméricos en mayúsculas (ej. usando `crypto.randomBytes` + mapeo a un alfabeto sin caracteres ambiguos como `0/O`, `1/I`), inserta en `ruleta_cupones`, y lo devuelve.
4. Si el premio elegido tiene `label` pero `tipo` nulo (gajo configurado solo visualmente, sin lógica real): devuelve el premio sin `codigo`.
5. Si es un gajo vacío: devuelve `premio: null`.

Respuesta: `{ success: true, posicionGanadora, premio: {label, icon, tipo} | null, codigo: string | null }`.

`SpinWheel.js`/`ScreenHome.js` dejan de elegir el índice en el cliente — `handleGirar` llama a este endpoint primero, y usa `posicionGanadora` para calcular el ángulo de destino de la animación (la lógica de `targetRotationForIndex` no cambia, solo cambia quién elige el índice).

### Validar y aplicar en el carrito

`cuponesController.js` gana un nuevo método, o se extiende `validateByCode` para que además de buscar en `cupones`, busque en `ruleta_cupones` cuando no encuentra nada en la tabla vieja. Body de la request pasa a incluir los ítems del carrito (para poder validar condición):

`POST /api/cupones/validate` — body `{ codigo, restaurante_id, items: [{menu_item_id, cantidad}] }`.

Lógica:
1. Buscar en `cupones` (comportamiento actual, sin cambios) — si existe y es válido, responder igual que hoy.
2. Si no, buscar en `ruleta_cupones` por `codigo`, con `restaurante_id` coincidente y `usado = FALSE`. Si no existe o no coincide el restaurante: `404`.
3. Según `tipo`, validar la condición contra `items` (resolviendo `menu_item_id` → `categoria` y `precio` reales desde `menu_items`, nunca confiar en lo que mande el cliente):
   - `porcentaje`: siempre válido, no depende del carrito.
   - `envio_gratis`: siempre válido.
   - `plato_gratis`/`postre_gratis`: al menos 1 ítem de las categorías del tipo → válido; si no, `400` con mensaje ("Este cupón requiere un plato/postre en tu pedido").
   - `2x1_bebidas`/`2x1_pizzas`: cantidad total de ítems de esa categoría ≥ 2 → válido; si no, `400` ("Este cupón requiere 2 o más [bebidas/pizzas] en tu pedido").
4. Responder con la forma que el frontend necesita para calcular el descuento en pantalla: `{ success, cupon: { tipo, valor, monto_descuento } }`, donde `monto_descuento` ya viene calculado en el backend (el frontend no reinventa la lógica de "cuál es el ítem más barato").

### Aplicar de verdad al confirmar el pedido

`ordersController.js`'s `createOrder` repite la misma validación de condición (nunca confiar en el descuento que mandó el cliente) dentro de la transacción existente, y si el cupón es de `ruleta_cupones`, hace `UPDATE ruleta_cupones SET usado = TRUE, pedido_id_uso = $1 WHERE codigo = $2 AND usado = FALSE` — el `AND usado = FALSE` en el `WHERE` es lo que previene la carrera de dos pedidos usando el mismo código al mismo tiempo (si el `UPDATE` afecta 0 filas, el cupón ya se usó entre la validación y la confirmación, y el pedido se rechaza con ese motivo).

## Frontend

### Admin (`AdminRuletaScreen.js`)

Cada slot suma un selector de tipo (los 6 valores de la tabla de arriba + "Solo visual" para `tipo=NULL`), y si se elige `porcentaje`, un campo numérico para el valor.

### Modal de resultado (`SpinWheel.js`)

Cuando el premio ganado tiene `codigo` (vino del endpoint `/girar`), se muestra debajo del nombre del premio, en una caja con el código y un botón de copiar (`expo-clipboard`, `Clipboard.setStringAsync`). **`expo-clipboard` no está instalado todavía** — verifiqué `frontend/package.json` y no aparece; es una dependencia nueva, chica y oficial de Expo, que hay que agregar con `npx expo install expo-clipboard`. Si el premio es solo visual (sin `tipo`) o vacío, se comporta como hoy (sin código, sin botón).

### Carrito (`CartScreen.js`)

La sección de cupón existente pasa a mandar también `restaurante_id` e `items` en la llamada a `API.cupones.validate`. El cálculo de descuento en pantalla dejar de recalcularse en el frontend (`calculateDiscount`) — usa directamente `monto_descuento` que devuelve el backend, para no duplicar la lógica de "cuál ítem es el más barato" en dos lugares.

## Testing

Sin test runner automatizado — verificación manual:

1. Configurar en admin un gajo `porcentaje=15`, uno `envio_gratis`, uno `plato_gratis`, uno `2x1_bebidas`, uno "solo visual" con texto, y uno vacío.
2. Girar hasta ganar el de `plato_gratis` sin tener ningún plato en el carrito — al intentar aplicar el código en el carrito, debe rechazarse con el mensaje de condición.
3. Agregar un plato, aplicar el mismo código — debe descontarse el precio del plato más barato del carrito.
4. Ganar `2x1_bebidas` con una sola bebida en el carrito — debe rechazarse; agregar una segunda bebida — debe aplicarse sobre la más barata de las dos.
5. Aplicar un cupón válido, completar el pedido — el cupón debe quedar `usado=true`, y un segundo intento de aplicarlo (aunque sea otro usuario, ya que es compartible) debe fallar con "cupón ya usado".
6. Ganar el gajo "solo visual" — el modal debe mostrar el nombre sin código ni botón de copiar, igual que el comportamiento actual.
7. Verificar que el botón de copiar realmente copia el código (pegar en otra app o en el campo de cupón del carrito).
