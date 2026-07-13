# Configuración de la ruleta de premios desde el panel de admin

## Contexto

`SpinWheel` (componente standalone, ver spec previa `2026-07-12-spin-wheel-design.md`) hoy está forzado a mostrarse siempre en `ScreenHome.js` (`useState(true)` sin forma de apagarlo) con 8 premios hardcodeados en el propio componente (`PREMIOS_DEFAULT`). No hay backend, no hay persistencia, y es igual para todos los restaurantes.

Este cambio conecta la ruleta al backend real y multi-tenant existente (mismo patrón que `menu_items`/`stock_ingredientes`, scoped por `restaurante_id`), y le da al admin de cada restaurante control real desde su panel: prender/apagar la ruleta, y editar el texto e ícono de cada uno de los 8 premios, pudiendo dejar espacios vacíos.

## Alcance

Incluye:
1. Persistencia en base de datos, scoped por restaurante.
2. Endpoint público para que Home sepa si mostrar la ruleta y con qué datos.
3. Endpoints de admin (leer/guardar configuración) protegidos por rol admin + restaurante propio.
4. Pantalla nueva de admin (`AdminRuletaScreen.js`) con el switch on/off y el editor de los 8 premios.
5. `ScreenHome.js` deja de forzar la ruleta — la muestra solo si el restaurante activo la tiene prendida, con los premios reales.
6. `SpinWheel.js` gana soporte para gajos vacíos (sin premio cargado).

Fuera de alcance (sin cambios en este ciclo):
- Aplicar el premio ganado como cupón real al pedido (`SpinWheel` ya simula esto visualmente con el modal, pero no hay lógica de canje).
- Límite de giros por usuario/día — el badge "N giros disponibles" sigue siendo decorativo.
- Historial de premios ganados por usuario.

## Base de datos

Migración nueva (`database/migrations/013_ruleta_premios.sql`):

```sql
ALTER TABLE restaurantes
    ADD COLUMN IF NOT EXISTS ruleta_activa BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS ruleta_premios (
    id              BIGSERIAL       PRIMARY KEY,
    restaurante_id  BIGINT          NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    posicion        SMALLINT        NOT NULL CHECK (posicion >= 0 AND posicion < 8),
    label           VARCHAR(60),
    icon            VARCHAR(60)
);

ALTER TABLE ruleta_premios
    ADD CONSTRAINT ruleta_premios_restaurante_posicion_unique UNIQUE (restaurante_id, posicion);
```

`label IS NULL` (o vacío) significa "gajo vacío" — no hace falta una columna `activo` separada por premio, el label nulo ya lo representa. Las 8 filas por restaurante se crean (upsert) la primera vez que el admin guarda cambios — no hace falta un seed inicial, `GET` devuelve los 8 slots vacíos por defecto si no hay filas todavía.

## Backend

### Endpoint público — `GET /api/restaurants/:id/ruleta`

Sin autenticación (igual que `GET /api/restaurants/:id/menu`). Devuelve:

```json
{
  "success": true,
  "activa": true,
  "premios": [
    { "posicion": 0, "label": "20% OFF", "icon": "pricetag-outline" },
    { "posicion": 1, "label": null, "icon": null },
    ...
  ]
}
```

Siempre devuelve exactamente 8 posiciones (0-7), completando con `{label: null, icon: null}` las que no tengan fila en `ruleta_premios`. `activa` sale de `restaurantes.ruleta_activa`.

### Endpoints de admin — `backend/src/controllers/adminRuletaController.js`

Mismo patrón que `adminRestauranteController.js` (`getInfo`/`updateInfo`), que es el análogo real más cercano (config de un solo registro por restaurante, no una lista tipo cupones). El router de admin (`backend/src/routers/admin.js`) ya aplica `authMiddleware, requireAdmin` a nivel global y `requireAdminOwnership` por ruta — este último middleware valida que el `:restauranteId` de la URL coincida con el restaurante del admin logueado, devolviendo 403 si no. Las rutas nuevas siguen exactamente ese patrón, agregadas en `admin.js` junto a las de `restaurante`:

```js
router.get('/ruleta/:restauranteId', requireAdminOwnership, ruletaCtrl.getInfo);
router.put('/ruleta/:restauranteId', requireAdminOwnership, ruletaCtrl.updateInfo);
```

- `GET /api/admin/ruleta/:restauranteId` — misma forma de respuesta que el endpoint público, para precargar el formulario.
- `PUT /api/admin/ruleta/:restauranteId` — body `{ activa: boolean, premios: [{ posicion, label, icon }, ...] }` (hasta 8 items; posiciones no incluidas se guardan como vacías). Actualiza `restaurantes.ruleta_activa` y hace upsert de las filas de `ruleta_premios` en una transacción. Valida `posicion` entre 0-7 y `label`/`icon` como strings o `null`.

No hace falta un router nuevo — se agregan estas dos rutas y su import de controller directo en `backend/src/routers/admin.js`, mismo archivo que ya centraliza todas las rutas de admin.

## Frontend — Admin

### `frontend/screens/admin/AdminRuletaScreen.js`

Pantalla nueva, mismo look & feel que `AdminCuponesScreen.js` (header, `AppHeader`/`BackButton` si aplica, loading state, guardado con feedback de éxito/error vía `FlashMessageWrapper`, ya usados en el resto del panel de admin).

Estructura:
1. **Switch** arriba: "Mostrar ruleta a los clientes" — controla `activa`.
2. **8 filas**, una por posición (0-7), cada una con:
   - Campo de texto para `label` (placeholder "Vacío" cuando no tiene nada cargado).
   - Selector visual de ícono: grilla de ~12 opciones fijas (ver lista abajo), tocás uno y queda seleccionado (highlight), no hay campo de texto libre.
   - Botón "Vaciar" que limpia `label` e `icon` de esa fila a `null`.
3. Botón "Guardar cambios" al final, dispara el `PUT`.

**Lista de íconos preestablecidos** (nombres de Ionicons, ya usados en el resto de la app vía `@expo/vector-icons`):
`pricetag-outline` (descuento), `bicycle-outline` (envío gratis), `restaurant-outline` (plato), `ice-cream-outline` (postre), `wine-outline` (bebida), `pizza-outline` (pizza), `bag-handle-outline` (bolsa), `gift-outline` (regalo), `star-outline` (genérico), `fast-food-outline` (comida rápida), `cafe-outline` (café), `heart-outline` (favorito).

### Enlace desde `AdminDashboardScreen.js`

Se agrega una entrada más a la lista de accesos del dashboard (mismo componente/patrón que ya usan Cupones, Recetas, Stock, etc.), navegando a `AdminRuletaScreen`.

## Frontend — Home / SpinWheel

### `ScreenHome.js`

- Se agrega un fetch a `GET /api/restaurants/:id/ruleta` (mismo `useEffect`/patrón que `fetchMenu`, disparado cuando cambia `selectedRestaurant`), guardado en estado `ruletaConfig` (`{ activa, premios }`).
- `showSpinWheel` deja de ser `useState(true)` fijo — pasa a derivarse de `ruletaConfig.activa` (el usuario todavía puede cerrar el modal con la X aunque esté activa, pero no se fuerza a `true` si el admin la apagó).
- `<SpinWheel premios={ruletaConfig.premios} />` — se le pasan los premios reales en vez de dejar que use `PREMIOS_DEFAULT`.
- Si `ruletaConfig` todavía no cargó (fetch en curso) o `activa` es `false`, el `Modal` de la ruleta ni se monta.

### `SpinWheel.js` — soporte de gajos vacíos

- Un premio con `label` nulo/vacío se dibuja con el `Path` en un color gris apagado (`#4A4A55` en vez de alternar `#FF8800`/`#1A1A2E`) y sin `Label` (ícono/texto) en esa posición.
- `handleGirar` sigue eligiendo cualquiera de los 8 índices al azar (los vacíos también pueden salir — es "mala suerte", parte de la mecánica).
- `mostrarResultado`: si el premio elegido tiene `label` nulo, el modal muestra "¡Sin premio esta vez!" (sin ícono, o con un ícono neutro tipo `sad-outline`) en vez de "¡Ganaste...!", y no se llama a `onPremioGanado` (no hay nada que aplicar al carrito).
- Si los 8 premios vienen vacíos (nunca configurados), el componente sigue funcionando igual — simplemente siempre "pierde", no es un caso que haya que bloquear.

## Testing

Sin test runner automatizado en el proyecto — verificación manual:

1. Admin activa la ruleta y carga 5 premios con label+ícono, deja 3 vacíos, guarda. Recarga la pantalla de admin — los datos guardados se recargan correctamente (upsert funcionó).
2. Como cliente, en Home del mismo restaurante, la ruleta aparece con esos 5 premios reales y 3 gajos grises sin texto.
3. Admin apaga el switch, guarda. Como cliente, recargar Home — la ruleta ya no aparece (el modal no se monta).
4. Girar la ruleta varias veces hasta que caiga en un gajo vacío — el modal debe decir "¡Sin premio esta vez!", no un premio inventado.
5. Un admin de otro restaurante no puede ver ni modificar la configuración de este restaurante (probar `GET`/`PUT /api/admin/ruleta` con el token de un admin distinto y confirmar que devuelve/afecta solo su propio `restaurante_id`).
