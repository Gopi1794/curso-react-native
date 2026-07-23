# Insights de consumo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El admin puede tocar "Analizar ahora" en una pantalla nueva y ver, generadas por IA, sugerencias de acción de marketing basadas en patrones reales de consumo (producto que se vende mucho más en un día específico de la semana) — sin que la app dispare ninguna llamada a IA automáticamente.

**Architecture:** Una tabla nueva `consumo_insights` (una fila por restaurante, UPSERT) guarda el último análisis. Un servicio backend detecta patrones con una query SQL + lógica en JS (umbral: pedidos_ese_dia ≥ promedio×1.5 Y ≥ 5), y solo si hay al menos un patrón llama a Claude Haiku (mismo SDK/modelo que `reviewsInsightsService.js`) para redactar sugerencias cortas. Dos endpoints: `GET` (gratis, devuelve lo último guardado) y `POST` (gasta tokens, dispara el análisis completo) — el frontend solo llama al `POST` desde un botón explícito, nunca al montar la pantalla.

**Tech Stack:** PostgreSQL (Supabase), Node.js/Express, `@anthropic-ai/sdk` (ya instalado y en uso), React Native/Expo (JavaScript).

## Global Constraints

- Sin test runner automatizado — verificación con `node --check`, compilación Babel, `curl` contra el backend real, y prueba manual en Expo.
- Trabajo en `main` sin worktree — cada tarea commitea con `git add <archivos exactos>`, nunca `git add -A` ni `git add .`.
- Umbral de patrón: `pedidos_ese_dia >= promedio_diario_producto * 1.5` **Y** `pedidos_ese_dia >= 5`. El mínimo absoluto de 5 es el que importa hoy — verificado en vivo: los 5 restaurantes reales tienen 28, 3, 0, 0 y 0 pedidos en los últimos 90 días, así que HOY esta feature va a devolver "sin datos suficientes" para todos. Es el comportamiento esperado, no un bug — no reducir el umbral para "que muestre algo".
- `dia_semana` sigue `EXTRACT(DOW ...)` de Postgres: `0`=domingo … `6`=sábado.
- `consumo_insights.restaurante_id` es `UNIQUE` — se hace `UPSERT` (`ON CONFLICT`), no se acumula historial.
- El `GET` nunca llama a Claude. El `POST` es el único que gasta tokens y **solo** se dispara desde el botón "Analizar ahora" del frontend — la pantalla, al montarse, solo hace el `GET`. Esto es un requisito explícito y no negociable del usuario (le preocupa el gasto de tokens).
- Si no hay ningún patrón que supere el umbral, no se llama a Claude — se guarda `patrones: []`, `sugerencias: []` directamente.
- Reusar exactamente el patrón de `backend/src/services/reviewsInsightsService.js` para la llamada a Claude: mismo import (`const Anthropic = require('@anthropic-ai/sdk');`), mismo cliente (`new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`), mismo modelo (`'claude-haiku-4-5-20251001'`), mismo regex de limpieza de markdown fences en la respuesta (`` .replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '') ``).
- Reusar exactamente el patrón de rutas de `backend/src/controllers/adminZonasEnvioController.js` + `backend/src/routers/admin.js`: `:restauranteId` en la URL + middleware `requireAdminOwnership` ya existente (`backend/src/middleware/requireAdminOwnership.js`, sin cambios).

---

### Task 1: Migración SQL

**Files:**
- Create: `database/migrations/017_consumo_insights.sql`
- Create: `database/apply_migration_017.js`
- Modify: `database/schema.sql`

**Interfaces:**
- Produces: tabla `consumo_insights(id, restaurante_id UNIQUE, patrones jsonb, sugerencias jsonb, generado_en timestamp)`.

- [ ] **Step 1: Escribir la migración**

`database/migrations/017_consumo_insights.sql`:

```sql
-- ============================================================
-- MIGRACIÓN 017: insights de consumo (patrones producto x dia de semana)
-- Ejecutar con: node database/apply_migration_017.js
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS consumo_insights_id_seq;

CREATE TABLE IF NOT EXISTS public.consumo_insights (
    id              bigint NOT NULL DEFAULT nextval('consumo_insights_id_seq'::regclass),
    restaurante_id  bigint NOT NULL,
    patrones        jsonb NOT NULL,
    sugerencias     jsonb NOT NULL,
    generado_en     timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT consumo_insights_pkey PRIMARY KEY (id),
    CONSTRAINT consumo_insights_restaurante_id_key UNIQUE (restaurante_id),
    CONSTRAINT consumo_insights_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);
```

- [ ] **Step 2: Escribir el script que aplica la migración**

`database/apply_migration_017.js` (mismo patrón que `database/apply_migration_016.js`):

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
        path.join(__dirname, 'migrations', '017_consumo_insights.sql'),
        'utf8'
    );
    const client = await pool.connect();
    try {
        console.log('Aplicando migración 017...');
        await client.query(sql);
        console.log('Migración 017 aplicada correctamente.');
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error('Error aplicando migración 017:', err.message);
    process.exit(1);
});
```

- [ ] **Step 3: Ejecutar y verificar**

```bash
node database/apply_migration_017.js
```

Expected: `Migración 017 aplicada correctamente.`

```bash
cd backend && node -e "
require('dotenv').config();
const db = require('./src/config/database');
db.query(\"SELECT column_name FROM information_schema.columns WHERE table_name = 'consumo_insights' ORDER BY ordinal_position\").then(r => {
  console.log(r.rows.map(x => x.column_name));
  process.exit(0);
});
"
```

Expected: `['id', 'restaurante_id', 'patrones', 'sugerencias', 'generado_en']`.

- [ ] **Step 4: Actualizar `database/schema.sql`**

Ubicar el final de `CREATE TABLE public.zonas_envio (...)`:

```sql
CREATE TABLE public.zonas_envio (
  id bigint NOT NULL DEFAULT nextval('zonas_envio_id_seq'::regclass),
  restaurante_id bigint NOT NULL,
  nombre character varying NOT NULL,
  radio_km numeric NOT NULL CHECK (radio_km > 0::numeric),
  costo_envio numeric NOT NULL CHECK (costo_envio >= 0::numeric),
  activa boolean NOT NULL DEFAULT true,
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT zonas_envio_pkey PRIMARY KEY (id),
  CONSTRAINT zonas_envio_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);
CREATE TABLE public.menu_items (
```

reemplazar por (se agrega la tabla nueva entre ambas):

```sql
CREATE TABLE public.zonas_envio (
  id bigint NOT NULL DEFAULT nextval('zonas_envio_id_seq'::regclass),
  restaurante_id bigint NOT NULL,
  nombre character varying NOT NULL,
  radio_km numeric NOT NULL CHECK (radio_km > 0::numeric),
  costo_envio numeric NOT NULL CHECK (costo_envio >= 0::numeric),
  activa boolean NOT NULL DEFAULT true,
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT zonas_envio_pkey PRIMARY KEY (id),
  CONSTRAINT zonas_envio_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);
CREATE TABLE public.consumo_insights (
  id bigint NOT NULL DEFAULT nextval('consumo_insights_id_seq'::regclass),
  restaurante_id bigint NOT NULL,
  patrones jsonb NOT NULL,
  sugerencias jsonb NOT NULL,
  generado_en timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT consumo_insights_pkey PRIMARY KEY (id),
  CONSTRAINT consumo_insights_restaurante_id_key UNIQUE (restaurante_id),
  CONSTRAINT consumo_insights_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);
CREATE TABLE public.menu_items (
```

- [ ] **Step 5: Commit**

```bash
git add database/migrations/017_consumo_insights.sql database/apply_migration_017.js database/schema.sql
git commit -m "feat(db): tabla consumo_insights para patrones de venta por producto y dia"
```

---

### Task 2: Backend — detección de patrones, sugerencias IA y endpoints

**Files:**
- Create: `backend/src/services/consumoInsightsService.js`
- Create: `backend/src/controllers/adminConsumoInsightsController.js`
- Modify: `backend/src/routers/admin.js`

**Interfaces:**
- Consumes: tabla `consumo_insights` (Task 1). Tablas existentes `pedidos`/`pedido_items`/`menu_items`. `@anthropic-ai/sdk` (ya instalado). Middleware `requireAdminOwnership` (ya existente, sin cambios).
- Produces: `generarInsights(restauranteId)` → `Promise<{patrones, sugerencias, generado_en}>` (hace `UPSERT`). `getUltimoInsight(restauranteId)` → `Promise<{patrones, sugerencias, generado_en} | null>`. `GET /api/admin/stats/consumo-insights/:restauranteId` y `POST /api/admin/stats/consumo-insights/:restauranteId`.

- [ ] **Step 1: Escribir el servicio**

`backend/src/services/consumoInsightsService.js`:

```js
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../config/database');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const UMBRAL_MULTIPLICADOR = 1.5;
const UMBRAL_MINIMO_PEDIDOS = 5;

const DIA_NOMBRE = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const PROMPT_SISTEMA = `Sos un analista de ventas para un restaurante de delivery.
Recibís patrones de consumo detectados (un producto que se vende mucho más en un día
específico de la semana) y sugerís una acción de marketing concreta y corta para
cada uno. Respondé SOLO con JSON válido, sin texto adicional.`;

const PROMPT_USUARIO = (patrones) => `Estos son los patrones de consumo detectados:

${patrones.map((p, i) =>
    `${i + 1}. ${p.producto}: ${p.pct_sobre_promedio}% más pedidos los ${DIA_NOMBRE[p.dia_semana]} (${p.pedidos_ese_dia} pedidos vs. ${p.promedio_diario_producto} promedio diario)`
).join('\n')}

Para cada patrón, sugerí una acción de marketing concreta en una frase corta (máximo 15 palabras),
tipo "Considerá envío gratis en pizzas los sábados".

Respondé con este JSON exacto:
{
  "sugerencias": ["<frase 1>", "<frase 2>", ...]
}`;

// Query cruda: pedidos por producto y dia de la semana, ultimos 90 dias.
async function detectarPatrones(restauranteId) {
    const result = await db.query(
        `SELECT
            COALESCE(mi.nombre, pi.nombre_item)     AS producto,
            EXTRACT(DOW FROM p.fecha_creacion)::int AS dia_semana,
            COUNT(*)::int                            AS pedidos
         FROM pedido_items pi
         JOIN pedidos p ON p.id = pi.pedido_id
         LEFT JOIN menu_items mi ON mi.id = pi.menu_item_id
         WHERE p.restaurante_id = $1
           AND p.estado != 'cancelado'
           AND p.fecha_creacion >= NOW() - INTERVAL '90 days'
         GROUP BY producto, dia_semana`,
        [restauranteId]
    );

    // Agrupar por producto para poder calcular el promedio diario de cada uno.
    const porProducto = new Map();
    for (const row of result.rows) {
        if (!porProducto.has(row.producto)) porProducto.set(row.producto, []);
        porProducto.get(row.producto).push(row);
    }

    const patrones = [];
    for (const [producto, dias] of porProducto.entries()) {
        const totalPedidos = dias.reduce((acc, d) => acc + d.pedidos, 0);
        const promedioDiario = totalPedidos / 7;

        for (const dia of dias) {
            if (dia.pedidos >= promedioDiario * UMBRAL_MULTIPLICADOR && dia.pedidos >= UMBRAL_MINIMO_PEDIDOS) {
                patrones.push({
                    producto,
                    dia_semana: dia.dia_semana,
                    pedidos_ese_dia: dia.pedidos,
                    promedio_diario_producto: parseFloat(promedioDiario.toFixed(2)),
                    pct_sobre_promedio: Math.round((dia.pedidos / promedioDiario) * 100 - 100),
                });
            }
        }
    }

    return patrones;
}

// Llama a Claude solo si hay patrones — nunca se llama con un array vacio.
async function generarSugerencias(patrones) {
    if (patrones.length === 0) return [];

    const response = await client.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [
            { role: 'user', content: PROMPT_USUARIO(patrones) }
        ],
        system: PROMPT_SISTEMA,
    });

    const raw = response.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(raw);
    return parsed.sugerencias;
}

// Dispara todo el analisis (SQL + IA si corresponde) y persiste el resultado.
// Es la unica funcion de este archivo que gasta tokens de IA.
async function generarInsights(restauranteId) {
    const patrones = await detectarPatrones(restauranteId);
    const sugerencias = await generarSugerencias(patrones);

    await db.query(
        `INSERT INTO consumo_insights (restaurante_id, patrones, sugerencias)
         VALUES ($1, $2, $3)
         ON CONFLICT (restaurante_id) DO UPDATE
         SET patrones = $2, sugerencias = $3, generado_en = NOW()
         RETURNING patrones, sugerencias, generado_en`,
        [restauranteId, JSON.stringify(patrones), JSON.stringify(sugerencias)]
    );

    const result = await db.query(
        'SELECT patrones, sugerencias, generado_en FROM consumo_insights WHERE restaurante_id = $1',
        [restauranteId]
    );
    return result.rows[0];
}

// Solo lee lo ya guardado — nunca llama a la IA.
async function getUltimoInsight(restauranteId) {
    const result = await db.query(
        'SELECT patrones, sugerencias, generado_en FROM consumo_insights WHERE restaurante_id = $1',
        [restauranteId]
    );
    return result.rows[0] || null;
}

module.exports = { generarInsights, getUltimoInsight, detectarPatrones };
```

- [ ] **Step 2: Escribir el controller**

`backend/src/controllers/adminConsumoInsightsController.js`:

```js
const { generarInsights, getUltimoInsight } = require('../services/consumoInsightsService');

// GET /api/admin/stats/consumo-insights/:restauranteId
// No llama a la IA — solo devuelve el ultimo analisis guardado (o insight:null).
exports.getUltimo = async (req, res) => {
    const { restauranteId } = req.params;
    try {
        const insight = await getUltimoInsight(restauranteId);
        res.json({ success: true, insight });
    } catch (error) {
        console.error('Error en getUltimo consumo insights:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// POST /api/admin/stats/consumo-insights/:restauranteId
// Dispara el analisis completo (SQL + IA si hay patrones). Gasta tokens.
// Solo debe llamarse desde una accion explicita del admin, nunca automatico.
exports.generar = async (req, res) => {
    const { restauranteId } = req.params;
    try {
        const insight = await generarInsights(restauranteId);
        res.json({ success: true, insight });
    } catch (error) {
        console.error('Error en generar consumo insights:', error);
        res.status(500).json({ success: false, message: 'No se pudo generar el análisis' });
    }
};
```

- [ ] **Step 3: Agregar las rutas**

`backend/src/routers/admin.js` — ubicar el import de `zonasEnvioCtrl`:

```js
const zonasEnvioCtrl = require('../controllers/adminZonasEnvioController');
const statsCtrl    = require('../controllers/adminStatsController');
```

reemplazar por:

```js
const zonasEnvioCtrl = require('../controllers/adminZonasEnvioController');
const consumoInsightsCtrl = require('../controllers/adminConsumoInsightsController');
const statsCtrl    = require('../controllers/adminStatsController');
```

Ubicar el bloque de rutas de Stats:

```js
// ── Stats ─────────────────────────────────────────────────
router.get('/stats/:restauranteId', requireAdminOwnership, statsCtrl.getStats);
```

reemplazar por (agrega el bloque nuevo justo después):

```js
// ── Stats ─────────────────────────────────────────────────
router.get('/stats/:restauranteId', requireAdminOwnership, statsCtrl.getStats);

// ── Consumo Insights ──────────────────────────────────────
router.get('/stats/consumo-insights/:restauranteId',  requireAdminOwnership, consumoInsightsCtrl.getUltimo);
router.post('/stats/consumo-insights/:restauranteId', requireAdminOwnership, consumoInsightsCtrl.generar);
```

- [ ] **Step 4: Verificar con `node --check`**

```bash
cd backend && node --check src/services/consumoInsightsService.js src/controllers/adminConsumoInsightsController.js src/routers/admin.js
```

Expected: sin salida.

- [ ] **Step 5: Verificar con curl**

Con el backend corriendo (`cd backend && npm run dev`) y un token de admin real del restaurante 1 (Viandas Saludables, el único con volumen real hoy — 28 pedidos en 90 días, pero por debajo del umbral de 5 por combinación producto+día, así que se espera `patrones: []`):

```bash
ADMIN_TOKEN="token_de_admin_de_viandas"

# GET antes de analizar nunca — debe devolver insight: null
curl -s http://localhost:3000/api/admin/stats/consumo-insights/1 -H "Authorization: Bearer $ADMIN_TOKEN"

# POST dispara el analisis
curl -s -X POST http://localhost:3000/api/admin/stats/consumo-insights/1 -H "Authorization: Bearer $ADMIN_TOKEN"

# GET despues de analizar — debe devolver el mismo resultado que el POST, sin volver a llamar a la IA
curl -s http://localhost:3000/api/admin/stats/consumo-insights/1 -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected: el primer `GET` devuelve `{"success":true,"insight":null}`. El `POST` devuelve `{"success":true,"insight":{"patrones":[],"sugerencias":[],"generado_en":"..."}}`  (array vacío es el resultado esperado con los datos reales actuales — confirma que el umbral funciona y que NO se llamó a Claude, ya que `generarSugerencias` retorna `[]` sin hacer la request cuando `patrones.length === 0`). El segundo `GET` devuelve exactamente el mismo `insight` que el `POST`, confirmando que quedó persistido.

Para confirmar en vivo que el camino CON llamada a la IA también funciona, insertar una zona de datos de prueba temporal (pedidos ficticios) directamente en la base, correr el `POST`, y confirmar que `sugerencias` viene poblado con frases generadas — luego borrar esos pedidos de prueba. Documentar en el reporte los ids de los pedidos insertados/borrados para dejar rastro claro de la limpieza.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/consumoInsightsService.js backend/src/controllers/adminConsumoInsightsController.js backend/src/routers/admin.js
git commit -m "feat(backend): deteccion de patrones de consumo y sugerencias via IA"
```

---

### Task 3: Frontend — pantalla de insights de consumo

**Files:**
- Create: `frontend/screens/admin/AdminConsumoInsightsScreen.js`
- Modify: `frontend/navigation/ProfileStack.js`
- Modify: `frontend/screens/admin/AdminDashboardScreen.js`
- Modify: `frontend/services/api.js`

**Interfaces:**
- Consumes: `GET/POST /api/admin/stats/consumo-insights/:restauranteId` (Task 2).
- Produces: nada consumido por otras tareas — es la última.

- [ ] **Step 1: Agregar los métodos al cliente de API**

`frontend/services/api.js` — ubicar el bloque `stats`:

```js
    stats: {
        get: (restauranteId) => request(`/api/admin/stats/${restauranteId}`),
        getReviewsInsights: (restauranteId) => request(restauranteId ? `/api/admin/reviews/insights?restauranteId=${restauranteId}` : '/api/admin/reviews/insights'),
    },
```

reemplazar por:

```js
    stats: {
        get: (restauranteId) => request(`/api/admin/stats/${restauranteId}`),
        getReviewsInsights: (restauranteId) => request(restauranteId ? `/api/admin/reviews/insights?restauranteId=${restauranteId}` : '/api/admin/reviews/insights'),
        getConsumoInsights: (restauranteId) => request(`/api/admin/stats/consumo-insights/${restauranteId}`),
        generarConsumoInsights: (restauranteId) => request(`/api/admin/stats/consumo-insights/${restauranteId}`, { method: 'POST' }),
    },
```

- [ ] **Step 2: Escribir la pantalla**

`frontend/screens/admin/AdminConsumoInsightsScreen.js`:

```js
import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/common/AppHeader';
import { showErrorMessage } from '../../components/FlashMessageWrapper';
import API from '../../services/api';
import { useAppSelector } from '../../store/hooks';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';

const DIA_NOMBRE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function AdminConsumoInsightsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const restaurante = useAppSelector(s => s.restaurant.selected);
    const [insight, setInsight] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analizando, setAnalizando] = useState(false);

    // Solo hace el GET (gratis) al montar — la IA nunca se dispara sola.
    const load = useCallback(async () => {
        if (!restaurante) return;
        setLoading(true);
        try {
            const res = await API.admin.stats.getConsumoInsights(restaurante.id);
            if (res.success) setInsight(res.insight);
        } catch {
            showErrorMessage('Error', 'No se pudo cargar el análisis');
        } finally {
            setLoading(false);
        }
    }, [restaurante]);

    useEffect(() => { load(); }, [load]);

    const handleAnalizar = async () => {
        setAnalizando(true);
        try {
            const res = await API.admin.stats.generarConsumoInsights(restaurante.id);
            if (res.success) {
                setInsight(res.insight);
            } else {
                showErrorMessage('Error', res.message || 'No se pudo generar el análisis');
            }
        } catch {
            showErrorMessage('Error', 'No se pudo generar el análisis');
        } finally {
            setAnalizando(false);
        }
    };

    const patrones = insight?.patrones || [];
    const sugerencias = insight?.sugerencias || [];

    return (
        <View style={styles.container}>
            <AppHeader title="Insights de consumo" subtitle="Patrones de venta por producto y día" onBack={() => navigation.goBack()} />

            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + FLOATING_TAB_BAR_HEIGHT + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#FF8700" style={{ marginTop: 60 }} />
                ) : !insight ? (
                    <View style={styles.empty}>
                        <Ionicons name="analytics-outline" size={52} color="#ddd" />
                        <Text style={styles.emptyText}>Todavía no hiciste ningún análisis</Text>
                        <Text style={styles.emptySubtext}>Tocá "Analizar ahora" para detectar patrones de consumo con tus pedidos reales.</Text>
                    </View>
                ) : patrones.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="hourglass-outline" size={52} color="#ddd" />
                        <Text style={styles.emptyText}>Sin datos suficientes todavía</Text>
                        <Text style={styles.emptySubtext}>Hace falta más volumen de pedidos para detectar un patrón confiable.</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="bulb-outline" size={20} color="#FF8700" />
                                <Text style={styles.cardTitle}>Sugerencias</Text>
                            </View>
                            <View style={{ gap: 10, marginTop: 12 }}>
                                {sugerencias.map((s, i) => (
                                    <View key={i} style={styles.sugerenciaRow}>
                                        <Ionicons name="sparkles-outline" size={16} color="#FF8700" />
                                        <Text style={styles.sugerenciaText}>{s}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="list-outline" size={20} color="#FF8700" />
                                <Text style={styles.cardTitle}>Patrones detectados</Text>
                            </View>
                            <View style={{ gap: 10, marginTop: 12 }}>
                                {patrones.map((p, i) => (
                                    <View key={i} style={styles.patronRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.patronProducto}>{p.producto}</Text>
                                            <Text style={styles.patronDetalle}>
                                                {DIA_NOMBRE[p.dia_semana]} · {p.pedidos_ese_dia} pedidos (promedio: {p.promedio_diario_producto})
                                            </Text>
                                        </View>
                                        <View style={styles.patronBadge}>
                                            <Text style={styles.patronBadgeText}>+{p.pct_sobre_promedio}%</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </>
                )}

                {insight && (
                    <Text style={styles.generadoEn}>
                        Generado el {new Date(insight.generado_en).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                )}

                <TouchableOpacity
                    style={[styles.analizarBtn, analizando && styles.analizarBtnDisabled]}
                    onPress={handleAnalizar}
                    disabled={analizando}
                >
                    {analizando ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="refresh" size={18} color="#fff" />
                            <Text style={styles.analizarBtnText}>Analizar ahora</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },
    scroll: { paddingHorizontal: 16 },

    card: {
        backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#1a1a1a' },

    sugerenciaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    sugerenciaText: { flex: 1, fontFamily: 'Poppins-Regular', fontSize: 13, color: '#444', lineHeight: 19 },

    patronRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    patronProducto: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#1a1a1a' },
    patronDetalle: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#888', marginTop: 2 },
    patronBadge: { backgroundColor: '#FFF3E0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    patronBadgeText: { fontFamily: 'Poppins-Bold', fontSize: 13, color: '#FF8700' },

    empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyText: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#bbb', textAlign: 'center', paddingHorizontal: 32 },
    emptySubtext: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#ccc', textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },

    generadoEn: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#bbb', textAlign: 'center', marginBottom: 16 },

    analizarBtn: {
        flexDirection: 'row', gap: 8, backgroundColor: '#FF8700', borderRadius: 16,
        paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    analizarBtnDisabled: { opacity: 0.6 },
    analizarBtnText: { fontFamily: 'Poppins-Bold', fontSize: 15, color: '#fff' },
});
```

- [ ] **Step 3: Registrar la pantalla en la navegación**

`frontend/navigation/ProfileStack.js` — ubicar el import de `AdminZonasEnvioScreen`:

```js
import AdminZonasEnvioScreen from '../screens/admin/AdminZonasEnvioScreen';
```

reemplazar por:

```js
import AdminZonasEnvioScreen from '../screens/admin/AdminZonasEnvioScreen';
import AdminConsumoInsightsScreen from '../screens/admin/AdminConsumoInsightsScreen';
```

Ubicar el `Stack.Screen` de `AdminZonasEnvio`:

```js
            <Stack.Screen name="AdminZonasEnvio" component={AdminZonasEnvioScreen} />
```

reemplazar por:

```js
            <Stack.Screen name="AdminZonasEnvio" component={AdminZonasEnvioScreen} />
            <Stack.Screen name="AdminConsumoInsights" component={AdminConsumoInsightsScreen} />
```

- [ ] **Step 4: Agregar la tarjeta en el dashboard de admin**

`frontend/screens/admin/AdminDashboardScreen.js` — ubicar la tarjeta de `zonas-envio` dentro del array `CARDS`:

```js
    {
        key: 'zonas-envio',
        screen: 'AdminZonasEnvio',
        title: 'Zonas de envío',
        subtitle: 'Costo de envío según distancia',
        icon: 'map-outline',
        colors: ['#00838F', '#00ACC1'],
    },
```

reemplazar por (agrega la tarjeta nueva justo después):

```js
    {
        key: 'zonas-envio',
        screen: 'AdminZonasEnvio',
        title: 'Zonas de envío',
        subtitle: 'Costo de envío según distancia',
        icon: 'map-outline',
        colors: ['#00838F', '#00ACC1'],
    },
    {
        key: 'consumo-insights',
        screen: 'AdminConsumoInsights',
        title: 'Insights de consumo',
        subtitle: 'Patrones de venta por producto y día',
        icon: 'trending-up-outline',
        colors: ['#7B2FF7', '#FF8700'],
    },
```

Ubicar el chequeo de tarjetas con animación de brillo (IA):

```js
    const isAI = card.key === 'reviews';
```

reemplazar por:

```js
    const isAI = card.key === 'reviews' || card.key === 'consumo-insights';
```

- [ ] **Step 5: Verificar compilación**

```bash
cd frontend && node -e "
const babel = require('@babel/core');
['screens/admin/AdminConsumoInsightsScreen.js','navigation/ProfileStack.js','screens/admin/AdminDashboardScreen.js','services/api.js'].forEach(f => {
  babel.transformFileSync(f, { presets: ['babel-preset-expo'], plugins: ['react-native-reanimated/plugin'] });
  console.log('OK:', f);
});
"
```

Expected: `OK:` para los 4 archivos.

- [ ] **Step 6: Verificación manual en Expo**

1. Como admin, entrar a "Insights de consumo" desde el dashboard (debe tener el brillo animado, igual que "Insights de reseñas").
2. Al abrir la pantalla, **no debe dispararse ninguna llamada a la IA** — solo debe verse el estado vacío o el último análisis guardado, sin delay perceptible de una llamada a Claude.
3. Tocar "Analizar ahora" — debe mostrar loading en el botón, y al terminar mostrar "Sin datos suficientes todavía" (comportamiento esperado con los datos reales actuales) o las sugerencias si hay patrones.
4. Cerrar y volver a entrar a la pantalla — el resultado del análisis anterior debe seguir ahí (persistido), sin volver a llamar a la IA automáticamente.

- [ ] **Step 7: Commit**

```bash
git add frontend/screens/admin/AdminConsumoInsightsScreen.js frontend/navigation/ProfileStack.js frontend/screens/admin/AdminDashboardScreen.js frontend/services/api.js
git commit -m "feat(admin): pantalla de insights de consumo con analisis disparado a mano"
```
