# Configuración de la ruleta desde el panel de admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El admin de cada restaurante puede prender/apagar la ruleta de premios y editar el texto/ícono de sus 8 gajos (dejando espacios vacíos) desde su panel; Home consulta esa configuración real en vez de usar datos hardcodeados.

**Architecture:** Migración SQL agrega `restaurantes.ruleta_activa` y la tabla `ruleta_premios` (una fila por posición 0-7, `label`/`icon` nulos = vacío). Un endpoint público (`GET /api/restaurants/:id/ruleta`) alimenta a `ScreenHome.js`; dos endpoints de admin (mismo patrón que `adminRestauranteController.js`, protegidos por `requireAdminOwnership`) permiten leer/guardar. Una pantalla nueva de admin (`AdminRuletaScreen.js`) edita la config. `SpinWheel.js` gana soporte visual para gajos vacíos.

**Tech Stack:** PostgreSQL (Supabase), Node.js/Express (`pg`), React Native/Expo (JavaScript), Redux (`useAppSelector` para el restaurante del admin logueado).

## Global Constraints

- Sin test runner automatizado en el proyecto — verificación manual (curl para backend, Expo Go para frontend), como en los planes anteriores de esta sesión.
- Los endpoints de admin siguen el patrón existente: `authMiddleware, requireAdmin` a nivel de router (ya aplicado globalmente en `backend/src/routers/admin.js`) + `requireAdminOwnership` por ruta, que valida `:restauranteId` de la URL contra `restaurantes.admin_id = req.user.userId`.
- No se agregan dependencias nuevas.
- Fuera de alcance (confirmado con el usuario): aplicar el premio ganado como cupón real — eso es un subsistema aparte, se diseña en un ciclo separado.

---

### Task 1: Migración SQL

**Files:**
- Create: `database/migrations/013_ruleta_premios.sql`
- Create: `database/apply_migration_013.js`

**Interfaces:**
- Produces: columna `restaurantes.ruleta_activa` (boolean, default false) y tabla `ruleta_premios(id, restaurante_id, posicion, label, icon)` con `UNIQUE(restaurante_id, posicion)`.

- [ ] **Step 1: Escribir la migración**

`database/migrations/013_ruleta_premios.sql`:

```sql
-- ============================================================
-- MIGRACIÓN 013: configuración de la ruleta de premios por restaurante
-- Ejecutar con: node database/apply_migration_013.js
-- ============================================================

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

CREATE INDEX IF NOT EXISTS idx_ruleta_premios_restaurante ON ruleta_premios (restaurante_id);
```

- [ ] **Step 2: Escribir el script que aplica la migración**

`database/apply_migration_013.js` (mismo patrón que `database/apply_migration_012.js` de esta misma sesión):

```js
require(`${__dirname}/../backend/node_modules/dotenv`).config({ path: `${__dirname}/../backend/.env` });
const fs = require('fs');
const path = require('path');
const { Pool } = require(`${__dirname}/../backend/node_modules/pg`);

const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'foodapp_db',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl:      { rejectUnauthorized: false },
});

async function run() {
    const sql = fs.readFileSync(
        path.join(__dirname, 'migrations', '013_ruleta_premios.sql'),
        'utf8'
    );
    const client = await pool.connect();
    try {
        console.log('Aplicando migración 013...');
        await client.query(sql);
        console.log('Migración 013 aplicada correctamente.');
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error('Error aplicando migración 013:', err.message);
    process.exit(1);
});
```

- [ ] **Step 3: Ejecutar y verificar**

Run: `node database/apply_migration_013.js` (desde `curso-react-native/curso-react-native`)
Expected: `Migración 013 aplicada correctamente.`

Verificar con una query rápida (mismo patrón de script throwaway que se usó para verificar la migración 012 en esta sesión — conectate con `pg` Pool y `backend/.env`, corré, borrá el script):

```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'restaurantes' AND column_name = 'ruleta_activa';
SELECT table_name FROM information_schema.tables WHERE table_name = 'ruleta_premios';
```

Expected: ambas queries devuelven una fila cada una.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/013_ruleta_premios.sql database/apply_migration_013.js
git commit -m "feat(db): tabla y columna para configuracion de ruleta por restaurante"
```

---

### Task 2: Backend — endpoint público + endpoints de admin

**Files:**
- Modify: `backend/src/controllers/restaurantsController.js` (agregar `exports.getRuleta` al final del archivo)
- Modify: `backend/src/routers/restaurants.js` (agregar la ruta pública)
- Create: `backend/src/controllers/adminRuletaController.js`
- Modify: `backend/src/routers/admin.js` (agregar import + 2 rutas)

**Interfaces:**
- Produces: `GET /api/restaurants/:id/ruleta` → `{ success, activa, premios: [{posicion, label, icon}, ...8 items] }` (público).
- Produces: `GET /api/admin/ruleta/:restauranteId` → misma forma que el público, protegido.
- Produces: `PUT /api/admin/ruleta/:restauranteId` con body `{ activa, premios: [{posicion, label, icon}, ...] }` → `{ success, data: { activa, premios } }`.

- [ ] **Step 1: Agregar el endpoint público en `restaurantsController.js`**

Al final de `backend/src/controllers/restaurantsController.js` (después del cierre de `exports.getMenuItem`), agregar:

```js

// ── GET RULETA (público) ──────────────────────────────────
// GET /api/restaurants/:id/ruleta
exports.getRuleta = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de restaurante inválido'
            });
        }

        const restResult = await db.query(
            'SELECT ruleta_activa FROM restaurantes WHERE id = $1',
            [id]
        );

        if (restResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado'
            });
        }

        const premiosResult = await db.query(
            'SELECT posicion, label, icon FROM ruleta_premios WHERE restaurante_id = $1',
            [id]
        );

        const premiosPorPosicion = {};
        for (const row of premiosResult.rows) {
            premiosPorPosicion[row.posicion] = { posicion: row.posicion, label: row.label, icon: row.icon };
        }

        const premios = [];
        for (let i = 0; i < 8; i++) {
            premios.push(premiosPorPosicion[i] || { posicion: i, label: null, icon: null });
        }

        res.json({
            success: true,
            activa: restResult.rows[0].ruleta_activa,
            premios
        });

    } catch (error) {
        console.error('Error en getRuleta:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
```

- [ ] **Step 2: Registrar la ruta pública**

En `backend/src/routers/restaurants.js`, agregar después de `router.get('/:id/menu/:itemId', ...)`:

```js
router.get('/:id/ruleta',            restaurantsController.getRuleta);
```

- [ ] **Step 3: Verificar el endpoint público con curl**

```bash
cd backend && npm start
```

En otra terminal (reemplazá `1` por un `restaurante_id` real de tu DB):

```bash
curl -s "http://localhost:3000/api/restaurants/1/ruleta"
```

Expected: JSON con `success:true`, `activa:false` (default), y `premios` con exactamente 8 elementos, todos `{posicion, label:null, icon:null}` (todavía no hay filas en `ruleta_premios`).

- [ ] **Step 4: Escribir `adminRuletaController.js`**

`backend/src/controllers/adminRuletaController.js`:

```js
const db = require('../config/database');

// ── GET /api/admin/ruleta/:restauranteId ──────────────────
exports.getInfo = async (req, res) => {
    const { restauranteId } = req.params;
    try {
        const restResult = await db.query(
            'SELECT ruleta_activa FROM restaurantes WHERE id = $1',
            [restauranteId]
        );

        if (restResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
        }

        const premiosResult = await db.query(
            'SELECT posicion, label, icon FROM ruleta_premios WHERE restaurante_id = $1',
            [restauranteId]
        );

        const premiosPorPosicion = {};
        for (const row of premiosResult.rows) {
            premiosPorPosicion[row.posicion] = { posicion: row.posicion, label: row.label, icon: row.icon };
        }

        const premios = [];
        for (let i = 0; i < 8; i++) {
            premios.push(premiosPorPosicion[i] || { posicion: i, label: null, icon: null });
        }

        res.json({ success: true, activa: restResult.rows[0].ruleta_activa, premios });
    } catch (error) {
        console.error('getInfo ruleta:', error);
        res.status(500).json({ success: false, message: 'Error al obtener configuración de la ruleta' });
    }
};

// ── PUT /api/admin/ruleta/:restauranteId ──────────────────
exports.updateInfo = async (req, res) => {
    const { restauranteId } = req.params;
    const { activa, premios } = req.body;

    if (typeof activa !== 'boolean') {
        return res.status(400).json({ success: false, message: 'activa debe ser boolean' });
    }
    if (!Array.isArray(premios)) {
        return res.status(400).json({ success: false, message: 'premios debe ser un array' });
    }
    for (const p of premios) {
        if (typeof p.posicion !== 'number' || p.posicion < 0 || p.posicion > 7) {
            return res.status(400).json({ success: false, message: `posicion inválida: ${p.posicion}` });
        }
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        await client.query(
            'UPDATE restaurantes SET ruleta_activa = $1 WHERE id = $2',
            [activa, restauranteId]
        );

        for (const p of premios) {
            await client.query(
                `INSERT INTO ruleta_premios (restaurante_id, posicion, label, icon)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (restaurante_id, posicion)
                 DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon`,
                [restauranteId, p.posicion, p.label || null, p.icon || null]
            );
        }

        await client.query('COMMIT');

        const premiosResult = await db.query(
            'SELECT posicion, label, icon FROM ruleta_premios WHERE restaurante_id = $1',
            [restauranteId]
        );
        const premiosPorPosicion = {};
        for (const row of premiosResult.rows) {
            premiosPorPosicion[row.posicion] = { posicion: row.posicion, label: row.label, icon: row.icon };
        }
        const premiosFinal = [];
        for (let i = 0; i < 8; i++) {
            premiosFinal.push(premiosPorPosicion[i] || { posicion: i, label: null, icon: null });
        }

        res.json({ success: true, data: { activa, premios: premiosFinal } });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('updateInfo ruleta:', error);
        res.status(500).json({ success: false, message: 'Error al guardar configuración de la ruleta' });
    } finally {
        client.release();
    }
};
```

- [ ] **Step 5: Registrar las rutas de admin**

En `backend/src/routers/admin.js`, agregar el import junto a los demás controllers (después de `const restCtrl = require('../controllers/adminRestauranteController');`):

```js
const ruletaCtrl   = require('../controllers/adminRuletaController');
```

Y agregar las rutas junto a las de `restaurante` (después de `router.put('/restaurante/:restauranteId', requireAdminOwnership, restCtrl.updateInfo);`):

```js
router.get('/ruleta/:restauranteId', requireAdminOwnership, ruletaCtrl.getInfo);
router.put('/ruleta/:restauranteId', requireAdminOwnership, ruletaCtrl.updateInfo);
```

- [ ] **Step 6: Verificar los endpoints de admin con curl**

Con el backend corriendo (Step 3), conseguí un token de admin real (login con las credenciales de un admin de restaurante existente, por ejemplo las de Trevi de `seed_trevi.js`):

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trevi.com","password":"trevi2026"}'
```

Copiá el `token` de la respuesta y el `restaurante_id` correspondiente (ej. 5 para Trevi), y probá:

```bash
TOKEN="pegar_aca_el_token"
curl -s http://localhost:3000/api/admin/ruleta/5 -H "Authorization: Bearer $TOKEN"

curl -s -X PUT http://localhost:3000/api/admin/ruleta/5 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"activa":true,"premios":[{"posicion":0,"label":"20% OFF","icon":"pricetag-outline"},{"posicion":1,"label":null,"icon":null}]}'
```

Expected: el `GET` inicial devuelve `activa:false` y 8 premios vacíos; el `PUT` devuelve `success:true` con `activa:true` y la posición 0 con el label/icon nuevos, el resto vacíos. Un segundo `GET` después del `PUT` debe reflejar el cambio guardado.

También probá que un token de OTRO admin (o sin token) recibe `403` al pegarle al `restaurante_id` de Trevi.

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/restaurantsController.js backend/src/routers/restaurants.js backend/src/controllers/adminRuletaController.js backend/src/routers/admin.js
git commit -m "feat(backend): endpoints publico y de admin para configuracion de ruleta"
```

---

### Task 3: Frontend — pantalla de admin

**Files:**
- Modify: `frontend/services/api.js` (agregar `restaurants.getRuleta` y `admin.ruleta`)
- Create: `frontend/screens/admin/AdminRuletaScreen.js`
- Modify: `frontend/navigation/ProfileStack.js` (registrar la pantalla)
- Modify: `frontend/screens/admin/AdminDashboardScreen.js` (agregar la card de acceso)

**Interfaces:**
- Consumes: `GET /api/restaurants/:id/ruleta`, `GET/PUT /api/admin/ruleta/:restauranteId` (Task 2).
- Produces: `API.restaurants.getRuleta(id)`, `API.admin.ruleta.getInfo(restauranteId)`, `API.admin.ruleta.updateInfo(restauranteId, data)` — usados por Task 4.

- [ ] **Step 1: Agregar los métodos a `api.js`**

En `frontend/services/api.js`, dentro del objeto `restaurants` (después de `getMenuItem`), agregar:

```js
    getRuleta: (id) => request(`/api/restaurants/${id}/ruleta`),
```

Dentro del objeto `admin` (después del bloque `restaurante: {...}`, antes de `platos: {...}`), agregar:

```js
    ruleta: {
        getInfo: (restauranteId) => request(`/api/admin/ruleta/${restauranteId}`),
        updateInfo: (restauranteId, data) => request(`/api/admin/ruleta/${restauranteId}`, { method: 'PUT', body: JSON.stringify(data) }),
    },
```

- [ ] **Step 2: Escribir `AdminRuletaScreen.js`**

`frontend/screens/admin/AdminRuletaScreen.js`:

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Switch, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/common/AppHeader';
import { showSuccessMessage, showErrorMessage } from '../../components/FlashMessageWrapper';
import API from '../../services/api';
import { useAppSelector } from '../../store/hooks';

const ICONOS_DISPONIBLES = [
    'pricetag-outline', 'bicycle-outline', 'restaurant-outline', 'ice-cream-outline',
    'wine-outline', 'pizza-outline', 'bag-handle-outline', 'gift-outline',
    'star-outline', 'fast-food-outline', 'cafe-outline', 'heart-outline',
];

const emptySlots = () => Array.from({ length: 8 }, (_, i) => ({ posicion: i, label: '', icon: null }));

export default function AdminRuletaScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const restaurante = useAppSelector(s => s.restaurant.selected);
    const [activa, setActiva] = useState(false);
    const [premios, setPremios] = useState(emptySlots());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!restaurante) return;
        setLoading(true);
        try {
            const res = await API.admin.ruleta.getInfo(restaurante.id);
            if (res.success) {
                setActiva(res.activa);
                setPremios(res.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null })));
            }
        } catch {
            showErrorMessage('Error', 'No se pudo cargar la configuración de la ruleta');
        } finally {
            setLoading(false);
        }
    }, [restaurante]);

    useEffect(() => { load(); }, [load]);

    const updateSlot = (posicion, changes) => {
        setPremios(prev => prev.map(p => p.posicion === posicion ? { ...p, ...changes } : p));
    };

    const clearSlot = (posicion) => {
        updateSlot(posicion, { label: '', icon: null });
    };

    const handleGuardar = async () => {
        setSaving(true);
        try {
            const res = await API.admin.ruleta.updateInfo(restaurante.id, {
                activa,
                premios: premios.map(p => ({
                    posicion: p.posicion,
                    label: p.label.trim() || null,
                    icon: p.label.trim() ? p.icon : null,
                })),
            });
            if (res.success) {
                showSuccessMessage('Guardado', 'La configuración de la ruleta se actualizó');
                setPremios(res.data.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null })));
            } else {
                showErrorMessage('Error', res.message || 'No se pudo guardar');
            }
        } catch {
            showErrorMessage('Error', 'No se pudo guardar la configuración de la ruleta');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.root, styles.centered]}>
                <ActivityIndicator size="large" color="#FF8700" />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <AppHeader title="Ruleta de premios" subtitle="Configurá los premios y activala" onBack={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}>
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Mostrar ruleta a los clientes</Text>
                    <Switch value={activa} onValueChange={setActiva} trackColor={{ false: '#ccc', true: '#FFD0A0' }} thumbColor={activa ? '#FF8700' : '#888'} />
                </View>

                {premios.map((premio) => (
                    <View key={premio.posicion} style={styles.slotCard}>
                        <Text style={styles.slotTitle}>Gajo {premio.posicion + 1}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Vacío"
                            value={premio.label}
                            onChangeText={(text) => updateSlot(premio.posicion, { label: text })}
                            maxLength={40}
                        />
                        <View style={styles.iconGrid}>
                            {ICONOS_DISPONIBLES.map((icon) => (
                                <TouchableOpacity
                                    key={icon}
                                    style={[styles.iconOption, premio.icon === icon && styles.iconOptionSelected]}
                                    onPress={() => updateSlot(premio.posicion, { icon })}
                                >
                                    <Ionicons name={icon} size={20} color={premio.icon === icon ? '#fff' : '#666'} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.clearBtn} onPress={() => clearSlot(premio.posicion)}>
                            <Text style={styles.clearBtnText}>Vaciar</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity style={styles.saveBtn} onPress={handleGuardar} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar cambios</Text>}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F5' },
    centered: { alignItems: 'center', justifyContent: 'center' },
    switchRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20,
    },
    switchLabel: { fontSize: 15, fontWeight: '600', color: '#222' },
    slotCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    },
    slotTitle: { fontSize: 13, color: '#888', marginBottom: 8, fontWeight: '600' },
    input: {
        borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 12,
    },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    iconOption: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0',
        alignItems: 'center', justifyContent: 'center',
    },
    iconOptionSelected: { backgroundColor: '#FF8700' },
    clearBtn: { alignSelf: 'flex-start' },
    clearBtnText: { color: '#E53935', fontSize: 13, fontWeight: '600' },
    saveBtn: {
        backgroundColor: '#FF8700', borderRadius: 16, paddingVertical: 16,
        alignItems: 'center', marginTop: 8,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 3: Registrar la pantalla en la navegación**

En `frontend/navigation/ProfileStack.js`, agregar el import junto a `AdminCuponesScreen` (después de `import AdminCuponesScreen from '../screens/admin/AdminCuponesScreen';`):

```js
import AdminRuletaScreen from '../screens/admin/AdminRuletaScreen';
```

Y la ruta junto a la de `AdminCupones` (después de `<Stack.Screen name="AdminCupones" component={AdminCuponesScreen} />`):

```js
            <Stack.Screen name="AdminRuleta" component={AdminRuletaScreen} />
```

- [ ] **Step 4: Agregar la card en el dashboard de admin**

En `frontend/screens/admin/AdminDashboardScreen.js`, agregar una entrada al array `CARDS` (después del bloque `cupones`):

```js
    {
        key: 'ruleta',
        screen: 'AdminRuleta',
        title: 'Ruleta de premios',
        subtitle: 'Activala y configurá los premios',
        icon: 'sync-outline',
        colors: ['#D84315', '#FF7043'],
    },
```

- [ ] **Step 5: Verificación manual en Expo Go**

Con el backend corriendo (Task 2) y el frontend en Expo Go:

1. Loguearte como admin de un restaurante, ir al dashboard de admin, tocar "Ruleta de premios".
2. Confirmar que carga con el switch apagado y los 8 slots vacíos (si nunca se configuró antes).
3. Prender el switch, escribir texto en 5 slots y elegir un ícono para cada uno, dejar 3 sin tocar, tocar "Guardar cambios".
4. Confirmar el mensaje de éxito y que, si volvés a entrar a la pantalla, los datos guardados se recargan tal cual quedaron.
5. Tocar "Vaciar" en un slot que tenía datos, guardar, confirmar que quedó vacío.

- [ ] **Step 6: Commit**

```bash
git add frontend/services/api.js frontend/screens/admin/AdminRuletaScreen.js frontend/navigation/ProfileStack.js frontend/screens/admin/AdminDashboardScreen.js
git commit -m "feat(admin): pantalla para configurar la ruleta de premios"
```

---

### Task 4: Frontend — Home consume la config real, SpinWheel soporta gajos vacíos

**Files:**
- Modify: `frontend/screens/home/ScreenHome.js`
- Modify: `frontend/components/rewards/SpinWheel.js`

**Interfaces:**
- Consumes: `API.restaurants.getRuleta(id)` (Task 3).
- Produces: nada consumido por otras tareas — es la última de este plan.

- [ ] **Step 1: Traer la configuración real en `ScreenHome.js`**

Ubicar el estado `const [showSpinWheel, setShowSpinWheel] = useState(true);` (agregado en una sesión anterior) y reemplazarlo por:

```js
    const [showSpinWheel, setShowSpinWheel] = useState(false);
    const [ruletaPremios, setRuletaPremios] = useState([]);
```

Ubicar el `fetchMenu` (función `useCallback` que llama a `API.restaurants.getMenu`) y agregar, inmediatamente después de su definición (antes del `useEffect(() => { fetchMenu(); }, [fetchMenu]);` que ya existe), una función y efecto equivalentes para la ruleta:

```js
    const fetchRuleta = useCallback(async () => {
        if (!selectedRestaurant) return;
        try {
            const response = await API.restaurants.getRuleta(selectedRestaurant.id);
            if (response.success && response.activa) {
                setRuletaPremios(response.premios);
                setShowSpinWheel(true);
            } else {
                setShowSpinWheel(false);
            }
        } catch (err) {
            setShowSpinWheel(false);
        }
    }, [selectedRestaurant]);

    useEffect(() => { fetchRuleta(); }, [fetchRuleta]);
```

- [ ] **Step 2: Pasar los premios reales al `Modal`/`SpinWheel` y no forzar el cierre manual a reabrirse**

Ubicar el bloque:

```jsx
            <Modal
                visible={showSpinWheel}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSpinWheel(false)}
            >
                <View style={styles.spinWheelBackdrop}>
                    <TouchableOpacity
                        style={styles.spinWheelCloseBtn}
                        onPress={() => setShowSpinWheel(false)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="close" size={22} color="#fff" />
                    </TouchableOpacity>
                    <SpinWheel />
                </View>
            </Modal>
```

y reemplazar `<SpinWheel />` por `<SpinWheel premios={ruletaPremios} />` — el resto del bloque queda igual.

(Nota: `SpinWheel` internamente usa `premios = PREMIOS_DEFAULT` como default solo cuando la prop no llega — al pasar `ruletaPremios` explícitamente, incluso vacío `[]` mientras carga, no se usará el default hardcodeado. Esto es intencional: si `ruletaPremios` está vacío, `showSpinWheel` también es `false` en ese momento por la lógica del Step 1, así que el `Modal` ni se monta — no hay estado intermedio visible con datos vacíos.)

- [ ] **Step 3: Soporte de gajos vacíos en `SpinWheel.js` — helper y color de gajo vacío**

En `frontend/components/rewards/SpinWheel.js`, agregar después de la declaración de `toRad`:

```js
const esGajoVacio = (premio) => !premio?.label;
```

Ubicar el `<Path>` dentro del `<Svg>` que dibuja los gajos:

```jsx
                            {premios.slice(0, SEGMENT_COUNT).map((premio, i) => (
                                <Path
                                    key={premio.id}
                                    d={segmentPath(i, RADIUS, RADIUS, RADIUS)}
                                    fill={i % 2 === 0 ? '#FF8800' : '#1A1A2E'}
                                    stroke="#FFB74D"
                                    strokeWidth={1}
                                />
                            ))}
```

y reemplazar por:

```jsx
                            {premios.slice(0, SEGMENT_COUNT).map((premio, i) => (
                                <Path
                                    key={premio.id ?? premio.posicion ?? i}
                                    d={segmentPath(i, RADIUS, RADIUS, RADIUS)}
                                    fill={esGajoVacio(premio) ? '#4A4A55' : (i % 2 === 0 ? '#FF8800' : '#1A1A2E')}
                                    stroke="#FFB74D"
                                    strokeWidth={1}
                                />
                            ))}
```

(Nota: los premios que vienen del backend vía `ruletaPremios` no tienen `id`, tienen `posicion` — de ahí el fallback en la `key`. `PREMIOS_DEFAULT`, usado como default de la prop, sigue teniendo `id`.)

- [ ] **Step 4: No renderizar `Label` (ícono/texto) para gajos vacíos**

Ubicar:

```jsx
                    {premios.slice(0, SEGMENT_COUNT).map((premio, i) => (
                        <Label key={premio.id} index={i} premio={premio} rotation={rotation} />
                    ))}
```

y reemplazar por:

```jsx
                    {premios.slice(0, SEGMENT_COUNT).map((premio, i) => (
                        !esGajoVacio(premio) && (
                            <Label key={premio.id ?? premio.posicion ?? i} index={i} premio={premio} rotation={rotation} />
                        )
                    ))}
```

- [ ] **Step 5: Resultado "sin premio" cuando cae en un gajo vacío**

Ubicar `mostrarResultado`:

```js
    const mostrarResultado = (premio) => {
        setPremioGanado(premio);
        setModalVisible(true);
        setGirando(false);
        girandoRef.current = false;
        onPremioGanado?.(premio);
    };
```

Reemplazar por:

```js
    const mostrarResultado = (premio) => {
        setPremioGanado(premio);
        setModalVisible(true);
        setGirando(false);
        girandoRef.current = false;
        if (!esGajoVacio(premio)) {
            onPremioGanado?.(premio);
        }
    };
```

Ubicar el JSX del modal de resultado:

```jsx
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        {premioGanado && (
                            <>
                                <Ionicons name={premioGanado.icon} size={48} color="#FF8800" />
                                <Text style={styles.modalTitle}>¡Ganaste {premioGanado.label}!</Text>
                            </>
                        )}
```

Reemplazar el bloque `{premioGanado && (...)}` por:

```jsx
                        {premioGanado && !esGajoVacio(premioGanado) && (
                            <>
                                <Ionicons name={premioGanado.icon} size={48} color="#FF8800" />
                                <Text style={styles.modalTitle}>¡Ganaste {premioGanado.label}!</Text>
                            </>
                        )}
                        {premioGanado && esGajoVacio(premioGanado) && (
                            <>
                                <Ionicons name="sad-outline" size={48} color="#9A9AA5" />
                                <Text style={styles.modalTitle}>¡Sin premio esta vez!</Text>
                            </>
                        )}
```

- [ ] **Step 6: Verificar compilación**

```bash
cd frontend && node -e "
const babel = require('@babel/core');
const fs = require('fs');
['components/rewards/SpinWheel.js','screens/home/ScreenHome.js'].forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  babel.transform(code, { filename: f, presets: ['babel-preset-expo'], plugins: ['react-native-reanimated/plugin'] });
  console.log('OK:', f);
});
"
```

Expected: `OK: components/rewards/SpinWheel.js` y `OK: screens/home/ScreenHome.js`, sin errores.

- [ ] **Step 7: Verificación manual en Expo Go**

1. Con la ruleta apagada (switch de admin en `false`, o nunca configurada), entrar a Home como cliente — el modal de la ruleta no debe aparecer en absoluto.
2. Prender la ruleta desde admin con algunos gajos vacíos (repitiendo el escenario del Step 5 de la Tarea 3), entrar a Home — la ruleta aparece con los gajos configurados en color/ícono normal y los vacíos en gris, sin ícono ni texto.
3. Girar varias veces hasta que caiga en un gajo vacío — el modal debe decir "¡Sin premio esta vez!" con el ícono gris, no un premio inventado.
4. Girar hasta que caiga en un gajo con premio real — el modal debe decir "¡Ganaste [label]!" como antes.

- [ ] **Step 8: Commit**

```bash
git add frontend/screens/home/ScreenHome.js frontend/components/rewards/SpinWheel.js
git commit -m "feat(rewards): Home consume configuracion real de la ruleta, soporte de gajos vacios"
```
