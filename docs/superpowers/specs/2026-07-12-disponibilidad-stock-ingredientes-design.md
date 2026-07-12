# Disponibilidad de platos según stock de ingredientes esenciales + aviso de ingredientes opcionales agotados

## Contexto

El sistema de stock por ingrediente ya existe (`stock_ingredientes`, `menu_item_ingredientes`, `descontar_stock()`) y funciona: al confirmar un pedido, se descuenta stock por ingrediente y restaurante.

El problema es la vista `vista_disponibilidad_platos` (usada por `getMenu`/`getMenuItem` para calcular `disponible`): hoy marca un plato como no disponible si **cualquier** ingrediente —removible o no— se queda sin stock. Eso es incorrecto: si un ingrediente es opcional (`es_removible = true`, ej. una guarnición o un topping) y se agota, el plato debería seguir vendiéndose sin ese ingrediente, no desaparecer del menú.

Además, hoy el frontend no tiene forma de saber qué ingredientes específicos están sin stock — solo recibe `es_removible` por ingrediente, no el estado de stock.

## Alcance

Este cambio cubre:
1. Corregir la lógica de disponibilidad del plato para que solo dependa de ingredientes **no removibles** (esenciales).
2. Exponer al frontend qué ingredientes removibles están sin stock.
3. En el detalle del plato (`FoodDetailScreen.js`), mostrar un aviso visual y bloquear la selección de esos ingredientes.

Fuera de alcance (explícitamente descartado en esta iteración): integración con POS externos de terceros para sincronizar stock — se evaluará más adelante, cuando haya un restaurante piloto con un POS concreto identificado.

## Backend

### 1. Migración: `vista_disponibilidad_platos`

Nueva migración (`database/migrations/002_disponibilidad_por_esenciales.sql`) que reemplaza la vista para que el cálculo de `disponible` solo considere ingredientes con `es_removible = FALSE`:

```sql
CREATE OR REPLACE VIEW vista_disponibilidad_platos AS
SELECT
    mi.id AS menu_item_id,
    mi.nombre AS plato,
    mi.restaurante_id,
    r.nombre AS sucursal,
    COUNT(mii.id) FILTER (WHERE mii.es_removible = FALSE) AS total_ingredientes_esenciales,
    COUNT(CASE WHEN mii.es_removible = FALSE AND COALESCE(si.cantidad, 0) > 0 THEN 1 END) AS esenciales_con_stock,
    CASE
        WHEN COUNT(mii.id) FILTER (WHERE mii.es_removible = FALSE) = 0 THEN TRUE
        WHEN COUNT(mii.id) FILTER (WHERE mii.es_removible = FALSE)
             = COUNT(CASE WHEN mii.es_removible = FALSE AND COALESCE(si.cantidad, 0) > 0 THEN 1 END) THEN TRUE
        ELSE FALSE
    END AS disponible
FROM menu_items mi
JOIN restaurantes r ON r.id = mi.restaurante_id
LEFT JOIN menu_item_ingredientes mii ON mii.menu_item_id = mi.id
LEFT JOIN stock_ingredientes si
    ON si.ingrediente_id = mii.ingrediente_id
    AND si.restaurante_id = mi.restaurante_id
GROUP BY mi.id, mi.nombre, mi.restaurante_id, r.nombre;
```

Un plato sin ingredientes esenciales registrados (todos removibles, o ninguno registrado) siempre está disponible. Un plato con al menos un ingrediente esencial sin stock queda no disponible, igual que antes.

### 2. `restaurantsController.js` — exponer `sin_stock` por ingrediente

En `getMenu` (líneas ~149-166) y `getMenuItem` (líneas ~236-249), la query que arma `ingredientes_detalle` debe sumar un `LEFT JOIN` con `stock_ingredientes` filtrado por el restaurante en cuestión, y devolver `sin_stock: COALESCE(si.cantidad, 0) <= 0` por cada fila.

`getMenu` ya tiene el `id` del restaurante disponible como parámetro de la query externa — se pasa como segundo parámetro al join de stock.

El objeto que arma cada ítem (`ingredientes_detalle`) pasa a tener esta forma por ingrediente:

```js
{ nombre: 'Panceta', es_removible: true, sin_stock: true }
```

No se agregan endpoints nuevos ni se rompe el contrato existente — solo se suma el campo `sin_stock`.

## Frontend — `FoodDetailScreen.js`

`foodItem.ingredientesDetalle` ya llega con esta información porque `mapMenuItem` en `ScreenHome.js` pasa `ingredientes_detalle` sin transformarlo.

1. **Inicialización de `selectedIngredients` (línea ~104-106):** al armar el estado inicial, excluir los ingredientes removibles que vengan con `sin_stock: true`, para que arranquen "apagados" y se incluyan automáticamente en `removedIngredients` al agregar al carrito (no es solo un cambio visual — afecta los datos reales que se mandan en el pedido).

2. **Sheet de ingredientes (línea ~789-819):** por cada ingrediente, si es removible y está `sin_stock`:
   - El `Switch` queda `disabled` (no se puede volver a activar), mismo tratamiento que ya existe para ingredientes no removibles pero por un motivo distinto.
   - Debajo del nombre del ingrediente, un `<Text>` en rojo: *"Ahora no se cuenta con este ingrediente"* (mismo lugar donde hoy se muestra "Base del plato" para los no removibles).

3. **Debajo del nombre del plato (`titleSection`, línea ~560-567):** si hay uno o más ingredientes removibles con `sin_stock: true`, mostrar un banner: `View` con fondo rojo claro y `borderRadius: 25`, conteniendo un `Text` en rojo que liste los ingredientes afectados (ej. "Sin stock: Panceta, Cheddar extra"). No se muestra si no hay ninguno.

## Testing

- Caso 1: plato con un ingrediente esencial sin stock → no aparece en el listado del restaurante (`disponible: false`), sin cambios respecto al comportamiento actual.
- Caso 2: plato con un ingrediente removible sin stock, esenciales con stock → el plato se sigue mostrando; al abrir el detalle, aparece el banner rojo y el ingrediente queda desactivado y no togglable.
- Caso 3: plato sin ningún ingrediente sin stock → sin banner, comportamiento normal.
- Caso 4: al agregar al carrito un plato del Caso 2, el ingrediente sin stock debe aparecer en `ingredientes_removidos` del pedido, no como incluido.
