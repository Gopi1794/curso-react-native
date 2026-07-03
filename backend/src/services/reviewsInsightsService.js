const Anthropic = require('@anthropic-ai/sdk');
const db = require('../config/database');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORIAS = ['demora', 'sabor', 'porcion', 'temperatura', 'packaging', 'atencion', 'positivo'];

const PROMPT_SISTEMA = `Sos un analizador de reseñas para un restaurante de delivery.
Analizás comentarios de clientes y devolvés JSON estructurado.
Respondé SOLO con JSON válido, sin texto adicional.`;

const PROMPT_USUARIO = (comentarios) => `Analizá estos comentarios de clientes y clasificá cada uno.

Comentarios:
${comentarios.map((c, i) => `${i + 1}. [Rating: ${c.rating}/5] "${c.comentario}"`).join('\n')}

Para cada comentario devolvé:
- categoria: una de [${CATEGORIAS.join(', ')}] (la categoría principal del feedback)
- sentimiento: "positivo", "negativo" o "neutro"
- resumen: frase de máximo 8 palabras que resume el punto clave

Respondé con este JSON exacto:
{
  "resultados": [
    { "id": <número>, "categoria": "<categoria>", "sentimiento": "<sentimiento>", "resumen": "<frase>" }
  ]
}`;

async function analizarComentarios(comentarios) {
    if (comentarios.length === 0) return [];

    const response = await client.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
            { role: 'user', content: PROMPT_USUARIO(comentarios) }
        ],
        system: PROMPT_SISTEMA,
    });

    const raw = response.content[0].text.trim();
    const parsed = JSON.parse(raw);
    return parsed.resultados;
}

async function procesarNuevosComentarios() {
    // Trae solo los comentarios sin análisis previo
    const result = await db.query(
        `SELECT id, rating, comentario
         FROM comentarios
         WHERE ai_categoria IS NULL
         ORDER BY fecha_creacion DESC
         LIMIT 50`
    );

    if (result.rows.length === 0) return { procesados: 0 };

    const resultados = await analizarComentarios(result.rows);

    // Guarda los resultados en la DB
    for (const r of resultados) {
        const comentario = result.rows[r.id - 1];
        if (!comentario) continue;
        await db.query(
            `UPDATE comentarios
             SET ai_categoria = $1, ai_sentimiento = $2, ai_resumen = $3
             WHERE id = $4`,
            [r.categoria, r.sentimiento, r.resumen, comentario.id]
        );
    }

    return { procesados: resultados.length };
}

async function getInsights(restauranteIds) {
    // Primero procesa los que no tienen análisis
    await procesarNuevosComentarios();

    const ids = Array.isArray(restauranteIds) ? restauranteIds : [restauranteIds];

    // Agrega por categoría (últimos 30 días)
    const porCategoria = await db.query(
        `SELECT ai_categoria AS categoria,
                ai_sentimiento AS sentimiento,
                COUNT(*) AS total
         FROM comentarios c
         JOIN menu_items m ON m.id = c.menu_item_id
         WHERE m.restaurante_id = ANY($1)
           AND ai_categoria IS NOT NULL
           AND c.fecha_creacion >= NOW() - INTERVAL '30 days'
         GROUP BY ai_categoria, ai_sentimiento
         ORDER BY total DESC`,
        [ids]
    );

    // Últimas 5 reseñas negativas con su resumen
    const negativas = await db.query(
        `SELECT c.rating, c.ai_categoria AS categoria,
                c.ai_resumen AS resumen, c.ai_sentimiento AS sentimiento,
                m.nombre AS plato, c.fecha_creacion
         FROM comentarios c
         JOIN menu_items m ON m.id = c.menu_item_id
         WHERE m.restaurante_id = ANY($1)
           AND c.ai_sentimiento = 'negativo'
           AND c.ai_categoria IS NOT NULL
           AND c.fecha_creacion >= NOW() - INTERVAL '30 days'
         ORDER BY c.fecha_creacion DESC
         LIMIT 5`,
        [ids]
    );

    // Resumen general
    const resumen = await db.query(
        `SELECT
            COUNT(*) FILTER (WHERE ai_sentimiento = 'positivo') AS positivos,
            COUNT(*) FILTER (WHERE ai_sentimiento = 'negativo') AS negativos,
            COUNT(*) FILTER (WHERE ai_sentimiento = 'neutro')   AS neutros,
            COUNT(*) AS total
         FROM comentarios c
         JOIN menu_items m ON m.id = c.menu_item_id
         WHERE m.restaurante_id = ANY($1)
           AND ai_categoria IS NOT NULL
           AND c.fecha_creacion >= NOW() - INTERVAL '30 days'`,
        [ids]
    );

    return {
        resumen:      resumen.rows[0],
        porCategoria: porCategoria.rows,
        negativas:    negativas.rows,
    };
}

module.exports = { getInsights };
