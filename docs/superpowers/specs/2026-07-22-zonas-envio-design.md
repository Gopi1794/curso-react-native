# Zonas de envío — Design

## Contexto y problema

Hoy el costo de envío es una constante fija (`SHIPPING_FEE = 2.99` en `backend/src/utils/ruletaCuponHelper.js`), igual para cualquier distancia entre el restaurante y el cliente. El frontend también la tiene hardcodeada dos veces en `CartScreen.js` (línea 119 y 628).

Se reemplaza por zonas de envío configurables por restaurante, con costo por distancia (radio en km desde el local). El objetivo de negocio, además de cobrar envío justo por distancia, es poder medir después si las promos de envío gratis/bonificado son rentables — para eso hay que guardar tanto lo que se cobró como lo que la tarifa vigente decía en ese momento.

## Modelo de datos

### Tabla nueva `zonas_envio`

```sql
CREATE SEQUENCE zonas_envio_id_seq;

CREATE TABLE public.zonas_envio (
  id              bigint NOT NULL DEFAULT nextval('zonas_envio_id_seq'::regclass),
  restaurante_id  bigint NOT NULL,
  nombre          character varying NOT NULL,
  radio_km        numeric NOT NULL CHECK (radio_km > 0::numeric),
  costo_envio     numeric NOT NULL CHECK (costo_envio >= 0::numeric),
  activa          boolean NOT NULL DEFAULT true,
  fecha_creacion  timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT zonas_envio_pkey PRIMARY KEY (id),
  CONSTRAINT zonas_envio_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);
```

Las zonas nunca se borran (hay pedidos históricos que las referencian) — "eliminar" en la UI es `activa = false`.

### `pedidos` — 3 columnas nuevas

- `zona_envio_id bigint NULL REFERENCES zonas_envio(id)` — nullable porque los pedidos previos a esta feature no tienen zona.
- `costo_envio numeric NOT NULL DEFAULT 0` — lo que se cobró de verdad (puede ser 0 con envío gratis). Reemplaza el uso de `SHIPPING_FEE` fijo. El `DEFAULT 0` es necesario para que el `ALTER TABLE` no falle sobre los pedidos ya existentes, pero es informativo, no histórico: esos pedidos viejos sí pagaron el `SHIPPING_FEE` fijo de $2.99, solo que no quedó registrado como columna separada. Cualquier reporte de analytics que sume `costo_envio` tiene que filtrar por fecha (desde que se aplique esta migración) para no interpretar los pedidos viejos como envío gratis.
- `costo_envio_tarifa_vigente numeric` — lo que la zona cobraba en ese momento, sin importar bonificaciones. Se completa siempre, no solo cuando hay promo, para que el analytics pueda hacer `SUM(costo_envio_tarifa_vigente - costo_envio)` sin casos especiales.

### Matching con zonas superpuestas

Si el punto de entrega cae dentro del radio de más de una zona activa, gana la de `radio_km` más chico (la más específica).

### Fuera de zona

Si la distancia no entra en el radio de ninguna zona activa del restaurante: **se rechaza el pedido** (400, "No entregamos en tu dirección"). No hay concepto especial de "zona fallback" — si un admin quiere cubrir distancias largas, crea su propia zona con radio grande y tarifa alta, el sistema normal de zonas ya lo resuelve. Los repartidores acá son del restaurante (no una red de couriers), así que prometer una entrega que después nadie puede cumplir genera devoluciones y quejas — más seguro rechazar en el checkout que fallar después de confirmado.

## Prerequisito: geocoding de `restaurantes.lat`/`lng`

Verificado contra la base real: **los 5 restaurantes existentes tienen `lat`/`lng` en `NULL`**, incluido Trevi (que ya usa la navegación GPS del repartidor). No hay ningún flujo actual que los complete — el campo "Dirección" del onboarding (`AdminOnboardingScreen.js`) es texto libre, nunca geocodifica.

Sin esto, `matchZona` no tiene desde dónde medir distancia — es bloqueante para toda la feature.

### Solución

**`backend/src/utils/geocoding.js`** (nuevo) — extrae a backend el mismo patrón Nominatim que ya usa `RepartidorMapaScreen.js` en el frontend:

```js
async function geocodeAddress(address) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TuAppFood/1.0 (contacto@tuemail.com)' } });
    const data = await res.json();
    return data.length > 0 ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
}
module.exports = { geocodeAddress };
```

**`adminRestauranteController.updateInfo`** (único punto de entrada que persiste `direccion` — se llama solo desde el onboarding, no hay pantalla de edición posterior): cuando llega `direccion`, geocodifica antes del `UPDATE` y guarda `lat`/`lng` junto con el resto de los campos.

Si Nominatim no encuentra la dirección, no se bloquea el guardado — el negocio se crea igual, pero la respuesta incluye `geocoded: false` para que el frontend muestre un aviso ("no pudimos ubicar tu dirección en el mapa; las zonas de envío no van a funcionar hasta que la corrijas"). No tiene sentido trabar el onboarding completo por un geocoder gratuito que a veces falla con direcciones informales.

### Backfill de restaurantes existentes

Script de una sola corrida (mismo estilo que `database/apply_migration_000.js`) que geocodifica la `direccion` actual de los 5 restaurantes y completa `lat`/`lng`. Se revisa el resultado antes de aplicarlo — Nominatim puede fallar con alguna de las direcciones actuales (son de ejemplo/seed, no todas 100% reales).

## Backend — matching y endpoints

### `backend/src/utils/zonaEnvioHelper.js` (nuevo)

```js
async function matchZona(restauranteId, destino, queryable = db) {
    const restaurante = await queryable.query(
        'SELECT lat, lng FROM restaurantes WHERE id = $1', [restauranteId]
    );
    const { lat, lng } = restaurante.rows[0];
    const { distanceMeters } = await computeRoute({ origen: { lat, lng }, destino });
    const distanciaKm = distanceMeters / 1000;

    const zona = await queryable.query(
        `SELECT id, nombre, costo_envio FROM zonas_envio
         WHERE restaurante_id = $1 AND activa = true AND radio_km >= $2
         ORDER BY radio_km ASC, id ASC LIMIT 1`,
        [restauranteId, distanciaKm]
    );
    return zona.rows[0] || null; // null = fuera de zona
}
```

Reusa `computeRoute` de `googleRoutes.js` tal cual está, sin tocarlo — mismo llamado que ya usa el flujo de asignación de repartidores, sin costo extra de API.

El `ORDER BY ... id ASC` es el desempate para el caso borde de dos zonas activas con el mismo `radio_km` exacto: gana la que se creó primero, en vez de un orden indefinido. La validación del formulario de alta (ver sección de Admin) evita que esto pase en el uso normal, pero la query queda determinística igual.

### `POST /api/restaurantes/:id/cotizar-envio` (nuevo)

Auth requerida (cliente logueado). Body `{ direccion_id }` — busca lat/lng en `direcciones_usuarios`, llama `matchZona`. Responde `{success:true, zona:{id,nombre,costo_envio}}` o `{success:false, message:'Fuera de zona de cobertura'}`.

Se llama desde el carrito cuando el usuario cambia la dirección seleccionada — no en cada render, para no gastar cuota de la API de más.

### `POST /api/orders` (modificado)

- El body pasa a requerir `direccion_id` (antes solo mandaba `direccion_entrega` como texto libre — ese texto se sigue guardando para mostrar en el pedido, pero ahora también viaja el id para poder calcular la zona).
- Dentro de la transacción: `matchZona(restaurante_id, destino, client)`. Si devuelve `null` → `ROLLBACK` + 400. Si matchea → `costo_envio = zona.costo_envio`, `costo_envio_tarifa_vigente = zona.costo_envio` (salvo cupón de envío gratis, ver abajo).
- El backend vuelve a matchear la zona en este paso — nunca confía en la cotización previa que vio el cliente (mismo principio que ya usa este archivo con los precios del menú).
- Todos los usos de `SHIPPING_FEE` fijo en este archivo se reemplazan por el valor dinámico.

### `ruletaCuponHelper.js` — `evaluarCupon`

Hoy importa `SHIPPING_FEE` como constante global. Pasa a recibir el costo de envío real como parámetro: `evaluarCupon(tipo, valorPremio, subtotal, items, menuItemsInfo, costoEnvio)`.

Para `tipo === 'envio_gratis'`: `montoDescuento = costoEnvio` (el de la zona matcheada, no el fijo). En `ordersController.js`, el pedido final queda con `costo_envio = 0` pero `costo_envio_tarifa_vigente = costoEnvio` — ahí es donde se guarda el dato para medir después si la promo fue rentable.

## Admin — CRUD de zonas

### Backend — `adminZonasEnvioController.js` (nuevo)

Mismo patrón que `adminRuletaController`/`adminPlatosController`: rutas con `:restauranteId` + middleware `requireAdminOwnership`.

```
GET  /api/admin/zonas-envio/:restauranteId   → getAll (incluye inactivas, para poder reactivarlas)
POST /api/admin/zonas-envio/:restauranteId   → create { nombre, radio_km, costo_envio }
PUT  /api/admin/zonas-envio/:id              → update { nombre, radio_km, costo_envio, activa }
```

Sin `DELETE` — "eliminar" en la UI es `PUT` con `activa:false`.

### Frontend — `AdminZonasEnvioScreen.js` (nuevo)

Mismo layout que `AdminRuletaScreen.js`: lista de zonas con nombre/radio/costo, switch de activa/inactiva, botón "+" para agregar. Al crear, valida que `radio_km` no repita exactamente el de otra zona activa (evita ambigüedad de matching).

## Frontend — carrito

### `CartScreen.js`

- Nuevo `useEffect` sobre `selectedAddress`: al cambiar, llama `API.restaurants.cotizarEnvio(selectedRestaurant.id, selectedAddress.id)`. Guarda `{costoEnvio, zonaNombre}` o `{fueraDeZona: true}` en un state nuevo `envioInfo`.
- Reemplaza los dos hardcodeos de `2.99` (línea 119 y 628) por `envioInfo?.costoEnvio`.
- Si `fueraDeZona`: deshabilita los botones de pago (mismo mecanismo que ya usa `!selectedAddress`), muestra "No entregamos en esta dirección" en vez del monto de envío.
- Al confirmar (`orders.create`), agrega `direccion_id: selectedAddress.id` al body.

### `services/api.js`

Nuevo `restaurants.cotizarEnvio(restauranteId, direccionId)` → `POST /api/restaurantes/:id/cotizar-envio`.

## Error handling

- Restaurante sin `lat`/`lng` (geocoding falló y nadie lo corrigió): `matchZona` no puede calcular distancia → tratar igual que "fuera de zona" (rechazar), con mensaje distinto en logs para que el admin lo note.
- Dirección del cliente sin `latitud`/`longitud` (direcciones viejas creadas antes del geocoding en `AddAddressSheet.js`, si las hubiera): `cotizar-envio` responde error claro pidiendo reingresar la dirección.
- Google Routes API caída o sin cuota: `cotizar-envio` devuelve error, el carrito lo muestra sin romper la app; en `POST /api/orders` el mismo error hace `ROLLBACK` (no se crea un pedido con costo de envío indefinido).
- Restaurante sin ninguna zona configurada todavía (recién migró, no cargó zonas): se comporta igual que "fuera de zona" — rechaza. Es intencional: obliga al admin a configurar al menos una zona antes de recibir pedidos con este sistema nuevo.

## Testing

No hay suite de tests automatizada en este proyecto. Verificación: `node --check` en los archivos backend tocados, compilación Babel en los de frontend, y prueba manual en Expo del flujo completo (crear zona en admin → seleccionar dirección en carrito → ver costo dinámico → confirmar pedido → verificar `zona_envio_id`/`costo_envio`/`costo_envio_tarifa_vigente` en la fila creada).
