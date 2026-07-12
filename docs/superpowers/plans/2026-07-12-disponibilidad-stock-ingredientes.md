# Disponibilidad de platos por ingredientes esenciales + aviso de stock — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un plato solo se oculta del menú si le falta stock de un ingrediente esencial (no removible); si lo que falta es un ingrediente opcional, el plato se sigue mostrando pero el detalle avisa en rojo y bloquea ese ingrediente.

**Architecture:** Se corrige la vista SQL `vista_disponibilidad_platos` para que el cálculo de `disponible` ignore ingredientes removibles. Se suma el campo `sin_stock` a `ingredientes_detalle` en las respuestas de `getMenu`/`getMenuItem` (backend). El frontend (`FoodDetailScreen.js`) usa ese campo para excluir ingredientes agotados de la selección inicial, deshabilitar su toggle y mostrar avisos en rojo.

**Tech Stack:** PostgreSQL (Supabase), Node.js/Express (`pg`), React Native/Expo (JavaScript).

## Global Constraints

- No se agregan endpoints nuevos ni se cambia el contrato de la API existente — solo se suma el campo `sin_stock` a los objetos de `ingredientes_detalle` ya existentes.
- No se toca la lógica de "Base del plato" (ingredientes no removibles) — es un comportamiento distinto y ya funciona.
- Fuera de alcance: integración con POS externos (decisión ya tomada, ver spec).
- El proyecto no tiene test runner configurado (`package.json` de `backend/` y `frontend/` no tienen script `test`) — la verificación de cada tarea es manual, con comandos concretos (`curl`, consultas SQL, o revisión visual en Expo Go), no tests automatizados.

---

### Task 1: Migración SQL — disponibilidad basada solo en ingredientes esenciales

**Files:**
- Create: `database/migrations/012_disponibilidad_esenciales.sql`
- Create: `database/apply_migration_012.js`

**Interfaces:**
- Produces: vista `vista_disponibilidad_platos` con la misma forma de columnas que antes (`menu_item_id`, `plato`, `restaurante_id`, `sucursal`, `disponible`), más dos columnas nuevas (`total_ingredientes_esenciales`, `esenciales_con_stock`) que no rompen a nadie porque son adicionales.

- [ ] **Step 1: Escribir el archivo de migración**

`database/migrations/012_disponibilidad_esenciales.sql`:

```sql
-- ============================================================
-- MIGRACIÓN 012: disponibilidad de platos solo por ingredientes esenciales
-- Ejecutar con: node database/apply_migration_012.js
-- ============================================================

-- Antes: un plato quedaba "no disponible" si CUALQUIER ingrediente (incluso
-- uno removible/opcional) se quedaba sin stock. Ahora solo cuentan los
-- ingredientes con es_removible = FALSE (la base del plato).

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

- [ ] **Step 2: Escribir el script que aplica la migración**

`database/apply_migration_012.js` (mismo patrón que `migrate_ingredientes.js`: conecta con `backend/.env`, ejecuta el SQL, cierra el pool):

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
        path.join(__dirname, 'migrations', '012_disponibilidad_esenciales.sql'),
        'utf8'
    );
    const client = await pool.connect();
    try {
        console.log('Aplicando migración 012...');
        await client.query(sql);
        console.log('Migración 012 aplicada correctamente.');
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error('Error aplicando migración 012:', err.message);
    process.exit(1);
});
```

- [ ] **Step 3: Ejecutar el script**

Run: `node database/apply_migration_012.js` (desde la raíz de `curso-react-native/curso-react-native`)
Expected output: `Migración 012 aplicada correctamente.`

- [ ] **Step 4: Verificar manualmente con una consulta SQL**

Ejecutar (por ejemplo agregando un `console.log` temporal en el mismo script, o vía cualquier cliente psql/GUI conectado a la misma DB):

```sql
SELECT menu_item_id, plato, restaurante_id, total_ingredientes_esenciales, esenciales_con_stock, disponible
FROM vista_disponibilidad_platos
LIMIT 20;
```

Expected: la columna `disponible` sigue siendo `true`/`false` como antes, y ahora existen las columnas `total_ingredientes_esenciales` / `esenciales_con_stock`. Si un plato tiene ingredientes removibles sin stock pero sus esenciales con stock, `disponible` debe ser `true` (antes hubiera sido `false` — este es el cambio de comportamiento que buscamos).

- [ ] **Step 5: Commit**

```bash
git add database/migrations/012_disponibilidad_esenciales.sql database/apply_migration_012.js
git commit -m "feat(db): disponibilidad de platos solo por ingredientes esenciales"
```

---

### Task 2: Backend — exponer `sin_stock` por ingrediente en `getMenu` y `getMenuItem`

**Files:**
- Modify: `backend/src/controllers/restaurantsController.js:148-167` (dentro de `getMenu`)
- Modify: `backend/src/controllers/restaurantsController.js:236-249` (dentro de `getMenuItem`)

**Interfaces:**
- Consumes: tabla `stock_ingredientes` (columnas `ingrediente_id`, `restaurante_id`, `cantidad`), ya existente.
- Produces: cada objeto dentro de `ingredientes_detalle` (en las respuestas JSON de `GET /api/restaurants/:id/menu` y `GET /api/restaurants/:id/menu/:itemId`) pasa a tener la forma `{ nombre: string, es_removible: boolean, sin_stock: boolean }` — antes no tenía `sin_stock`.

- [ ] **Step 1: Modificar la query de ingredientes en `getMenu`**

En `backend/src/controllers/restaurantsController.js`, reemplazar el bloque (líneas 148-166):

```js
        if (itemIds.length > 0) {
            const ingResult = await db.query(
                `SELECT mii.menu_item_id, i.nombre, mii.es_removible
                 FROM menu_item_ingredientes mii
                 JOIN ingredientes i ON i.id = mii.ingrediente_id
                 WHERE mii.menu_item_id = ANY($1)
                 ORDER BY i.nombre ASC`,
                [itemIds]
            );

            for (const row of ingResult.rows) {
                if (!ingredientesMap[row.menu_item_id]) {
                    ingredientesMap[row.menu_item_id] = [];
                }
                ingredientesMap[row.menu_item_id].push({
                    nombre: row.nombre,
                    es_removible: row.es_removible
                });
            }
        }
```

por:

```js
        if (itemIds.length > 0) {
            const ingResult = await db.query(
                `SELECT mii.menu_item_id, i.nombre, mii.es_removible,
                        COALESCE(si.cantidad, 0) <= 0 AS sin_stock
                 FROM menu_item_ingredientes mii
                 JOIN ingredientes i ON i.id = mii.ingrediente_id
                 LEFT JOIN stock_ingredientes si
                    ON si.ingrediente_id = mii.ingrediente_id
                   AND si.restaurante_id = $2
                 WHERE mii.menu_item_id = ANY($1)
                 ORDER BY i.nombre ASC`,
                [itemIds, id]
            );

            for (const row of ingResult.rows) {
                if (!ingredientesMap[row.menu_item_id]) {
                    ingredientesMap[row.menu_item_id] = [];
                }
                ingredientesMap[row.menu_item_id].push({
                    nombre: row.nombre,
                    es_removible: row.es_removible,
                    sin_stock: row.sin_stock
                });
            }
        }
```

(`id` es el parámetro de restaurante que ya existe en el scope de `getMenu`, usado más arriba en la query principal.)

- [ ] **Step 2: Modificar la query de ingredientes en `getMenuItem`**

En el mismo archivo, reemplazar el bloque (líneas 236-249):

```js
        // Traer ingredientes con detalle
        const ingResult = await db.query(
            `SELECT i.nombre, mii.es_removible
             FROM menu_item_ingredientes mii
             JOIN ingredientes i ON i.id = mii.ingrediente_id
             WHERE mii.menu_item_id = $1
             ORDER BY i.nombre ASC`,
            [itemId]
        );

        const item = {
            ...result.rows[0],
            ingredientes: ingResult.rows.map(i => i.nombre),
            ingredientes_detalle: ingResult.rows
        };
```

por:

```js
        // Traer ingredientes con detalle
        const ingResult = await db.query(
            `SELECT i.nombre, mii.es_removible,
                    COALESCE(si.cantidad, 0) <= 0 AS sin_stock
             FROM menu_item_ingredientes mii
             JOIN ingredientes i ON i.id = mii.ingrediente_id
             LEFT JOIN stock_ingredientes si
                ON si.ingrediente_id = mii.ingrediente_id
               AND si.restaurante_id = $2
             WHERE mii.menu_item_id = $1
             ORDER BY i.nombre ASC`,
            [itemId, id]
        );

        const item = {
            ...result.rows[0],
            ingredientes: ingResult.rows.map(i => i.nombre),
            ingredientes_detalle: ingResult.rows
        };
```

- [ ] **Step 3: Reiniciar el backend local y verificar con curl**

Run: `cd backend && npm start` (dejar corriendo)

En otra terminal, buscar un `menu_item_id` que tenga ingredientes con `menu_item_ingredientes` y forzar stock en 0 para uno removible (ejemplo, ajustar IDs reales de tu DB):

```bash
curl -s "http://localhost:3000/api/restaurants/1/menu/101"
```

Expected: la respuesta JSON incluye, para cada ingrediente en `item.ingredientes_detalle`, el campo `sin_stock` (`true` o `false`) además de `nombre` y `es_removible`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/restaurantsController.js
git commit -m "feat(backend): exponer sin_stock por ingrediente en getMenu/getMenuItem"
```

---

### Task 3: Frontend — `FoodDetailScreen.js`: excluir ingredientes agotados, bloquear toggle y avisos en rojo

**Files:**
- Modify: `frontend/screens/food/FoodDetailScreen.js:104-106` (estado inicial `selectedIngredients`)
- Modify: `frontend/screens/food/FoodDetailScreen.js:559-567` (`titleSection`, agregar banner)
- Modify: `frontend/screens/food/FoodDetailScreen.js:789-819` (sheet de ingredientes)
- Modify: `frontend/screens/food/FoodDetailScreen.js:847+` (`StyleSheet.create`, agregar estilos nuevos)

**Interfaces:**
- Consumes: `foodItem.ingredientesDetalle` — array de `{ nombre, es_removible, sin_stock }` (ya viaja desde `ScreenHome.js` → `mapMenuItem`, sin transformar, gracias a Task 2).
- Produces: nada consumido por otras tareas — es la última.

- [ ] **Step 1: Calcular ingredientes removibles sin stock y excluirlos de la selección inicial**

Reemplazar (líneas 104-116):

```js
    const [selectedIngredients, setSelectedIngredients] = useState(
        () => new Set(foodItem.ingredientText || [])
    );

    // Mapa de ingredientes removibles (desde ingredientes_detalle del backend)
    const removibleMap = React.useMemo(() => {
        const map = {};
        (foodItem.ingredientesDetalle || []).forEach(ing => {
            map[ing.nombre] = ing.es_removible;
        });
        return map;
    }, [foodItem.ingredientesDetalle]);
```

por:

```js
    // Mapa de ingredientes removibles (desde ingredientes_detalle del backend)
    const removibleMap = React.useMemo(() => {
        const map = {};
        (foodItem.ingredientesDetalle || []).forEach(ing => {
            map[ing.nombre] = ing.es_removible;
        });
        return map;
    }, [foodItem.ingredientesDetalle]);

    // Mapa de ingredientes sin stock (desde ingredientes_detalle del backend)
    const stockMap = React.useMemo(() => {
        const map = {};
        (foodItem.ingredientesDetalle || []).forEach(ing => {
            map[ing.nombre] = ing.sin_stock === true;
        });
        return map;
    }, [foodItem.ingredientesDetalle]);

    // Ingredientes removibles que están sin stock (para el aviso y el bloqueo)
    const ingredientesSinStock = React.useMemo(() => {
        return (foodItem.ingredientesDetalle || [])
            .filter(ing => ing.es_removible && ing.sin_stock === true)
            .map(ing => ing.nombre);
    }, [foodItem.ingredientesDetalle]);

    const [selectedIngredients, setSelectedIngredients] = useState(() => {
        const sinStockSet = new Set(ingredientesSinStock);
        return new Set((foodItem.ingredientText || []).filter(i => !sinStockSet.has(i)));
    });
```

(Nota: `ingredientesSinStock` se define antes del `useState` de `selectedIngredients` porque el inicializador lo usa — en JS esto es válido porque son `const` separadas evaluadas en orden de declaración dentro del cuerpo del componente.)

- [ ] **Step 2: Agregar el banner rojo debajo del nombre del plato**

Ubicar el bloque (líneas 559-567):

```jsx
                    {/* Título y Precio */}
                    <View style={styles.titleSection}>
                        <Text style={styles.foodTitle}>{foodItem.name}</Text>
                        <Text style={styles.foodPrice}>
                            ${selectedOption
                                ? selectedOption.price.toFixed(2)
                                : parseFloat(foodItem.price.replace('$', '')).toFixed(2)}
                        </Text>
                    </View>
```

y agregar el banner inmediatamente después (antes de `{/* Rating y Estadísticas */}`):

```jsx
                    {/* Título y Precio */}
                    <View style={styles.titleSection}>
                        <Text style={styles.foodTitle}>{foodItem.name}</Text>
                        <Text style={styles.foodPrice}>
                            ${selectedOption
                                ? selectedOption.price.toFixed(2)
                                : parseFloat(foodItem.price.replace('$', '')).toFixed(2)}
                        </Text>
                    </View>

                    {ingredientesSinStock.length > 0 && (
                        <View style={styles.stockWarningBanner}>
                            <Text style={styles.stockWarningText}>
                                Sin stock: {ingredientesSinStock.join(', ')}
                            </Text>
                        </View>
                    )}
```

- [ ] **Step 3: Bloquear el toggle y mostrar aviso por ingrediente en el sheet**

Ubicar el bloque del sheet de ingredientes (líneas 789-819):

```jsx
                    {/* Lista de ingredientes */}
                    <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
                        {(foodItem.ingredientText || []).map((ingredient, index) => {
                            const isOn = selectedIngredients.has(ingredient);
                            const canRemove = removibleMap[ingredient] !== false;
                            return (
                                <View key={index} style={[styles.sheetRow, !canRemove && { opacity: 0.5 }]}>
                                    <View style={styles.sheetRowLeft}>
                                        <View style={[styles.sheetDot, !isOn && styles.sheetDotOff]} />
                                        <View>
                                            <Text style={[styles.sheetRowText, !isOn && styles.sheetRowTextOff]}>
                                                {ingredient}
                                            </Text>
                                            {!canRemove && (
                                                <Text style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
                                                    Base del plato
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    <Switch
                                        value={isOn}
                                        onValueChange={() => handleToggleIngredient(ingredient)}
                                        disabled={!canRemove}
                                        trackColor={{ false: '#e0e0e0', true: '#FFD0A0' }}
                                        thumbColor={isOn ? '#FF8000' : '#bbb'}
                                        ios_backgroundColor="#e0e0e0"
                                    />
                                </View>
                            );
                        })}
```

Reemplazar por:

```jsx
                    {/* Lista de ingredientes */}
                    <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
                        {(foodItem.ingredientText || []).map((ingredient, index) => {
                            const isOn = selectedIngredients.has(ingredient);
                            const canRemove = removibleMap[ingredient] !== false;
                            const sinStock = stockMap[ingredient] === true;
                            return (
                                <View key={index} style={[styles.sheetRow, (!canRemove || sinStock) && { opacity: 0.5 }]}>
                                    <View style={styles.sheetRowLeft}>
                                        <View style={[styles.sheetDot, !isOn && styles.sheetDotOff]} />
                                        <View>
                                            <Text style={[styles.sheetRowText, !isOn && styles.sheetRowTextOff]}>
                                                {ingredient}
                                            </Text>
                                            {!canRemove && (
                                                <Text style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
                                                    Base del plato
                                                </Text>
                                            )}
                                            {canRemove && sinStock && (
                                                <Text style={styles.sinStockSubtext}>
                                                    Ahora no se cuenta con este ingrediente
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    <Switch
                                        value={isOn}
                                        onValueChange={() => handleToggleIngredient(ingredient)}
                                        disabled={!canRemove || sinStock}
                                        trackColor={{ false: '#e0e0e0', true: '#FFD0A0' }}
                                        thumbColor={isOn ? '#FF8000' : '#bbb'}
                                        ios_backgroundColor="#e0e0e0"
                                    />
                                </View>
                            );
                        })}
```

- [ ] **Step 4: Agregar los estilos nuevos**

En el bloque `const styles = StyleSheet.create({...})` (empieza en la línea 847), agregar estas entradas (por ejemplo, justo después de `foodPrice`, línea ~981):

```js
    stockWarningBanner: {
        backgroundColor: '#FFEBEE',
        borderRadius: 25,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    stockWarningText: {
        color: '#D32F2F',
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
    },
    sinStockSubtext: {
        fontSize: 11,
        color: '#D32F2F',
        marginTop: 1,
        fontFamily: 'Poppins-Regular',
    },
```

- [ ] **Step 5: Verificación manual en Expo Go**

Con el backend corriendo (Task 2 ya lo deja arriba) y el frontend en Expo Go (`npx expo start --lan` desde `frontend/`):

1. En la DB, poné en 0 el stock de un ingrediente removible de un plato (`UPDATE stock_ingredientes SET cantidad = 0 WHERE ingrediente_id = X AND restaurante_id = Y`).
2. Abrí ese plato en el detalle: debe aparecer el banner rojo debajo del nombre listando ese ingrediente, y en el sheet de ingredientes ese ítem debe estar apagado, con el switch bloqueado y el texto rojo debajo.
3. Agregalo al carrito y confirmá que el ingrediente sin stock aparece como removido (revisando el payload que arma `handleAddToCart`, o el pedido creado).
4. Poné en 0 el stock de un ingrediente NO removible del mismo plato: el plato debe dejar de aparecer en el listado de `ScreenHome` (ya no "disponible").

Expected: comportamiento descrito en los 4 puntos, sin errores en consola de Metro ni del backend.

- [ ] **Step 6: Commit**

```bash
git add frontend/screens/food/FoodDetailScreen.js
git commit -m "feat(frontend): avisar y bloquear ingredientes removibles sin stock en el detalle del plato"
```
