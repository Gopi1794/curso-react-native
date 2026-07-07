# Aislar repartidores por restaurante — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada admin solo ve, lista y puede asignar repartidores de su propio restaurante — hoy ve los de todos los restaurantes.

**Architecture:** Reusa el patrón ya existente en `adminPedidosController.js` (`getAdminRestauranteId(req)`, ya usado por `getAll` de pedidos) para scopear por `restaurante_id` las 3 consultas/mutaciones de repartidores que hoy no lo hacen.

**Tech Stack:** Node/Express, PostgreSQL (`pg`), sin dependencias nuevas.

## Global Constraints

- No hay test runner configurado en este proyecto (ni backend ni frontend) — verificación vía `curl` contra el backend corriendo localmente o Render, no tests automatizados.
- Todas las queries SQL usan `db.query(text, params)` parametrizado, nunca concatenación de strings.
- La base real YA tiene datos de prueba backfillados: `usuarios.id=15` (Juan, rol repartidor) → `restaurante_id=5` (Trevi); `usuarios.id=16` (Gabriel, rol repartidor) → `restaurante_id=1` (Viandas Saludables). Usalos para verificar el aislamiento real: un admin de Trevi solo debe ver al id=15, un admin de Viandas Saludables solo al id=16.
- El helper `getAdminRestauranteId(req)` ya existe en `backend/src/controllers/adminPedidosController.js:5-9`:
  ```js
  const getAdminRestauranteId = async (req) => {
      if (req.user.restauranteId) return req.user.restauranteId;
      const row = await db.query('SELECT restaurante_id FROM usuarios WHERE id = $1', [req.user.userId]);
      return row.rows[0]?.restaurante_id || null;
  };
  ```
  Es una función local (no exportada) — solo se puede usar directo desde funciones del mismo archivo (`adminPedidosController.js`). `adminRestauranteController.js` es un archivo distinto y necesita su propia consulta inline equivalente (mismo patrón, no lo importes de otro controller).

---

### Task 1: `createRepartidor` asigna restaurante automáticamente

**Files:**
- Modify: `backend/src/controllers/adminRestauranteController.js:55-80`

**Interfaces:**
- Produces: `POST /api/admin/repartidores` ahora inserta `restaurante_id` (tomado del admin autenticado) en la fila nueva. La respuesta (`res.json({ success: true, data: result.rows[0] })`) sigue igual, pero `result.rows[0]` ahora también trae `restaurante_id` porque se agrega a la lista de columnas del `RETURNING`.

- [ ] **Step 1: Reemplazar la función completa**

Reemplazar el bloque completo de `exports.createRepartidor` (líneas 55-80 actuales) por:

```js
exports.createRepartidor = async (req, res) => {
    const { nombre, apellido, email, telefono, password } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ success: false, message: 'nombre, email y password son requeridos' });
    }

    try {
        const exists = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (exists.rows[0]) {
            return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese email' });
        }

        const adminRow = await db.query('SELECT restaurante_id FROM usuarios WHERE id = $1', [req.user.userId]);
        const restauranteId = adminRow.rows[0]?.restaurante_id || null;
        if (!restauranteId) {
            return res.status(403).json({ success: false, message: 'Admin sin restaurante asignado' });
        }

        const hash = await bcrypt.hash(password, 12);
        const result = await db.query(
            `INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol, email_verificado, restaurante_id)
             VALUES ($1, $2, $3, $4, $5, 'repartidor', true, $6) RETURNING id, nombre, apellido, email, telefono, rol, restaurante_id`,
            [nombre, apellido || '', email, telefono || '000000000', hash, restauranteId]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('createRepartidor:', error);
        res.status(500).json({ success: false, message: 'Error al crear repartidor' });
    }
};
```

- [ ] **Step 2: Verificar con curl**

Con el backend corriendo (local: `npm run dev` en `backend/`, o contra Render si ya está deployado) y un token de un admin que YA tenga `restaurante_id` asignado (ej. el admin de Trevi):

```bash
curl -X POST http://localhost:3000/api/admin/repartidores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN_TREVI>" \
  -d '{"nombre":"Test","apellido":"Repartidor","email":"test.repartidor.trevi@example.com","telefono":"1122334455","password":"test1234"}'
```

Expected: `{"success":true,"data":{"id":<num>,"nombre":"Test",...,"rol":"repartidor","restaurante_id":5}}` — confirmar que `restaurante_id` coincide con el del admin que lo creó (5 para Trevi), NO `null`.

Probar también el caso de error — un admin sin `restaurante_id` (si existe alguno de prueba) debería recibir `403` con `"Admin sin restaurante asignado"` en vez de crear el repartidor con `restaurante_id` null.

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/adminRestauranteController.js
git commit -m "fix(backend): asignar restaurante_id automaticamente al crear un repartidor"
```

---

### Task 2: Repartidores y su asignación quedan scopeados por restaurante

**Files:**
- Modify: `backend/src/controllers/adminPedidosController.js:73-114` (`getResumenRepartidoresDia`, `getRepartidores`)
- Modify: `backend/src/controllers/adminPedidosController.js:206-222` (`asignarRepartidor`)

**Interfaces:**
- Consumes: `getAdminRestauranteId(req)` (ya existe en el mismo archivo, línea 5-9).
- Produces: `GET /api/admin/repartidores/resumen-dia`, `GET /api/admin/repartidores`, `PUT /api/admin/pedidos/:id/asignar` — mismas respuestas de antes, ahora filtradas/validadas por restaurante.

- [ ] **Step 1: Filtrar `getResumenRepartidoresDia` por restaurante**

Reemplazar el bloque completo de `exports.getResumenRepartidoresDia` (líneas 73-98 actuales) por:

```js
exports.getResumenRepartidoresDia = async (req, res) => {
    try {
        const restauranteId = await getAdminRestauranteId(req);
        if (!restauranteId) {
            return res.status(403).json({ success: false, message: 'Admin sin restaurante asignado' });
        }

        const result = await db.query(
            `SELECT
                u.id,
                u.nombre,
                u.apellido,
                u.telefono,
                COUNT(p.id)                                                                         AS pedidos_entregados,
                COUNT(p.id) * 2.99                                                                  AS ganancia,
                COALESCE(SUM(CASE WHEN p.metodo_pago = 'efectivo' THEN p.monto_recibido ELSE 0 END), 0) AS efectivo_cobrado
             FROM usuarios u
             LEFT JOIN pedidos p
                ON p.repartidor_id = u.id
               AND p.estado = 'entregado'
               AND p.fecha_actualizacion::date = CURRENT_DATE
             WHERE u.rol = 'repartidor' AND u.estado = 'activo' AND u.restaurante_id = $1
             GROUP BY u.id, u.nombre, u.apellido, u.telefono
             ORDER BY pedidos_entregados DESC, u.nombre`,
            [restauranteId]
        );
        res.json({ success: true, repartidores: result.rows });
    } catch (error) {
        console.error('Error en getResumenRepartidoresDia:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
```

- [ ] **Step 2: Filtrar `getRepartidores` por restaurante**

Reemplazar el bloque completo de `exports.getRepartidores` (líneas 100-114 actuales) por:

```js
exports.getRepartidores = async (req, res) => {
    try {
        const restauranteId = await getAdminRestauranteId(req);
        if (!restauranteId) {
            return res.status(403).json({ success: false, message: 'Admin sin restaurante asignado' });
        }

        const result = await db.query(
            `SELECT id, nombre, apellido, telefono, estado
             FROM usuarios
             WHERE rol = 'repartidor' AND estado = 'activo' AND restaurante_id = $1
             ORDER BY nombre`,
            [restauranteId]
        );
        res.json({ success: true, repartidores: result.rows });
    } catch (error) {
        console.error('Error en getRepartidores:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
```

- [ ] **Step 3: Validar ownership en `asignarRepartidor`**

En `exports.asignarRepartidor`, agregar la validación ANTES del `client.query('BEGIN')` actual (línea ~214). El inicio de la función pasa de:

```js
exports.asignarRepartidor = async (req, res) => {
    const { id } = req.params;
    const { repartidor_id } = req.body;

    if (!repartidor_id) {
        return res.status(400).json({ success: false, message: 'repartidor_id requerido' });
    }

    const client = await db.getClient();
```

a:

```js
exports.asignarRepartidor = async (req, res) => {
    const { id } = req.params;
    const { repartidor_id } = req.body;

    if (!repartidor_id) {
        return res.status(400).json({ success: false, message: 'repartidor_id requerido' });
    }

    const restauranteId = await getAdminRestauranteId(req);
    if (!restauranteId) {
        return res.status(403).json({ success: false, message: 'Admin sin restaurante asignado' });
    }

    const repartidorCheck = await db.query(
        `SELECT id FROM usuarios WHERE id = $1 AND rol = 'repartidor' AND restaurante_id = $2`,
        [repartidor_id, restauranteId]
    );
    if (repartidorCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Repartidor no encontrado o no pertenece a este restaurante' });
    }

    const client = await db.getClient();
```

El resto de la función (el `BEGIN`/`UPDATE`/`transicionarPedido`/`COMMIT`/push notifications) queda exactamente igual — no tocar nada después de esta inserción.

- [ ] **Step 4: Verificar con curl usando los datos reales ya backfillados**

La base ya tiene `usuarios.id=15` (repartidor, restaurante_id=5 → Trevi) y `usuarios.id=16` (repartidor, restaurante_id=1 → Viandas Saludables).

Con un token de un admin de Trevi (`restaurante_id=5`):

```bash
curl http://localhost:3000/api/admin/repartidores \
  -H "Authorization: Bearer <TOKEN_ADMIN_TREVI>"
```
Expected: la lista incluye al `id=15` (Juan) y NO incluye al `id=16` (Gabriel).

```bash
curl -X PUT http://localhost:3000/api/admin/pedidos/<ID_PEDIDO_DE_TREVI>/asignar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN_TREVI>" \
  -d '{"repartidor_id": 16}'
```
Expected: `404` con `{"success":false,"message":"Repartidor no encontrado o no pertenece a este restaurante"}` — porque el `id=16` es de Viandas Saludables, no de Trevi.

```bash
curl -X PUT http://localhost:3000/api/admin/pedidos/<ID_PEDIDO_DE_TREVI>/asignar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN_TREVI>" \
  -d '{"repartidor_id": 15}'
```
Expected: `200` con el pedido asignado — porque el `id=15` sí es de Trevi.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/adminPedidosController.js
git commit -m "fix(backend): scopear listado y asignacion de repartidores por restaurante"
```

---

## Resumen de archivos tocados

| Archivo | Tarea |
|---|---|
| `backend/src/controllers/adminRestauranteController.js` | 1 |
| `backend/src/controllers/adminPedidosController.js` | 2 |
