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
