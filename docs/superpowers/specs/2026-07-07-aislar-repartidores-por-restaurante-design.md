# Aislar repartidores por restaurante

**Fecha**: 2026-07-07
**Estado**: Aprobado, pendiente de implementación

## Contexto y objetivo

Hoy los repartidores no están aislados por restaurante: cualquier admin puede ver y asignar pedidos a repartidores creados por otro restaurante. Se detectó al revisar el flujo de alta y asignación de repartidores.

## Root cause

1. `backend/src/controllers/adminRestauranteController.js:69-73` (`createRepartidor`) inserta el nuevo usuario con `rol='repartidor'` pero **nunca setea `restaurante_id`** — queda `NULL`.
2. `backend/src/controllers/adminPedidosController.js` — `getRepartidores` (línea ~100-114) y `getResumenRepartidoresDia` (línea ~89) listan repartidores con `WHERE rol = 'repartidor' AND estado = 'activo'`, **sin filtrar por `restaurante_id`** — todo admin ve repartidores de todos los restaurantes.
3. `asignarRepartidor` no valida que el repartidor elegido pertenezca al restaurante del admin que hace la asignación.

Ya existe el patrón para resolver esto: `adminPedidosController.js` tiene una función `obtenerRestauranteIdDelAdmin(req)` (línea ~7-8) que ya se usa para scopear pedidos por restaurante — el fix reusa exactamente ese mismo patrón para repartidores.

## Cambios

### 1. `createRepartidor` — asignar restaurante automáticamente

El `INSERT` en `adminRestauranteController.js` toma el `restaurante_id` del admin autenticado (mismo patrón que `obtenerRestauranteIdDelAdmin`) y lo guarda en la nueva fila. No hay forma de crear un repartidor sin restaurante asignado — no hace falta ningún campo nuevo en el formulario del frontend, es automático server-side.

### 2. `getRepartidores` y `getResumenRepartidoresDia` — filtrar por restaurante

Ambas queries agregan `AND restaurante_id = $1` (el restaurante del admin logueado), usando `obtenerRestauranteIdDelAdmin(req)`.

### 3. `asignarRepartidor` — validar ownership

Antes de hacer `UPDATE pedidos SET repartidor_id = ...`, valida que el `repartidor_id` recibido pertenezca (`usuarios.restaurante_id`) al mismo restaurante que el pedido que se está asignando. Si no coincide, responde 403/404 en vez de asignar — mismo criterio de seguridad que ya se usó en el endpoint de rutas (`rutaController.js`) de la sesión anterior.

## Datos existentes (fuera del código, ya resuelto manualmente)

Los 2 repartidores de prueba existentes (`id=15` → Trevi, `id=16` → Viandas Saludables) ya se backfillearon a mano vía `UPDATE` directo en Supabase, confirmado por el usuario. No hace falta migración de datos en este cambio — solo el fix de código para que no vuelva a pasar con repartidores nuevos.

## Verificado, sin cambios necesarios

El repartidor ya NO puede ver pedidos de otros repartidores: `repartidorController.js` (`getMisPedidos`, `getHistorial`, `getResumenDia`, `updateEstado`, `cobrarEfectivo`) y `rutaController.calcularRuta` ya filtran todo por `repartidor_id = req.user.userId`. Esto se revisó específicamente a pedido del usuario y ya estaba correctamente aislado — no es parte del trabajo de este cambio.

## Fuera de alcance

- Pantalla de "reclamar repartidores sin asignar" (el usuario eligió backfill manual en vez de esta feature).
- Repartidores multi-restaurante (un repartidor trabajando para 2+ restaurantes) — el modelo actual es 1 repartidor → 1 restaurante vía FK simple, no se cambia.

## Componentes a modificar

| Archivo | Cambio |
|---|---|
| `backend/src/controllers/adminRestauranteController.js` | `createRepartidor` setea `restaurante_id` del admin |
| `backend/src/controllers/adminPedidosController.js` | `getRepartidores`, `getResumenRepartidoresDia` filtran por restaurante; `asignarRepartidor` valida ownership |

## Manejo de errores

Si `asignarRepartidor` recibe un `repartidor_id` de otro restaurante: responder `404` con mensaje claro ("Repartidor no encontrado o no pertenece a este restaurante"), mismo estilo que los demás endpoints de este controller.
