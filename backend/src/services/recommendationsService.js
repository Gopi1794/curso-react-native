const Anthropic = require('@anthropic-ai/sdk');
const db = require('../config/database');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getRecommendations(userId, restauranteId) {
    // Historial del usuario en este restaurante
    const historial = await db.query(
        `SELECT mi.nombre, mi.categoria, COUNT(*) AS veces
         FROM pedido_items pi
         JOIN pedidos p ON p.id = pi.pedido_id
         JOIN menu_items mi ON mi.id = pi.menu_item_id
         WHERE p.usuario_id = $1 AND p.restaurante_id = $2
         GROUP BY mi.nombre, mi.categoria
         ORDER BY veces DESC
         LIMIT 10`,
        [userId, restauranteId]
    );

    // Menú disponible del restaurante
    const menu = await db.query(
        `SELECT mi.id, mi.nombre, mi.categoria, mi.precio, mi.descripcion
         FROM menu_items mi
         WHERE mi.restaurante_id = $1 AND mi.disponible = TRUE
         ORDER BY mi.categoria, mi.nombre`,
        [restauranteId]
    );

    console.log(`[Recs] historial=${historial.rows.length} items, menu=${menu.rows.length} items`);
    if (menu.rows.length === 0) return [];

    // Sin historial: devolver los 5 más pedidos del restaurante
    if (historial.rows.length === 0) {
        const populares = await db.query(
            `SELECT pi.menu_item_id AS id, COUNT(*) AS total
             FROM pedido_items pi
             JOIN pedidos p ON p.id = pi.pedido_id
             WHERE p.restaurante_id = $1
             GROUP BY pi.menu_item_id
             ORDER BY total DESC
             LIMIT 5`,
            [restauranteId]
        );
        if (populares.rows.length > 0) {
            const ids = populares.rows.map(r => r.id);
            const items = menu.rows.filter(m => ids.includes(m.id));
            return items.map(i => ({ ...i, razon: 'Uno de los más pedidos' }));
        }
        return menu.rows.slice(0, 5).map(i => ({ ...i, razon: 'Destacado del menú' }));
    }

    // Con historial: pedir recomendaciones a Claude
    const historialStr = historial.rows.map(h => `- ${h.nombre} (${h.categoria}, pedido ${h.veces} vez/veces)`).join('\n');
    const menuStr = menu.rows.map(m => `[${m.id}] ${m.nombre} (${m.categoria}) - $${m.precio}`).join('\n');

    const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: 'Sos un sistema de recomendación de comida. Respondé SOLO con JSON válido, sin texto adicional ni code fences.',
        messages: [{
            role: 'user',
            content: `El cliente ha pedido antes:\n${historialStr}\n\nMenú disponible:\n${menuStr}\n\nRecomendá exactamente 4 platos que le gustarían basándote en su historial. No repitas lo que ya pidió. Respondé con este JSON exacto:\n{"recomendaciones":[{"id":<número>,"razon":"<frase corta de máximo 6 palabras>"}]}`
        }],
    });

    const raw = response.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(raw);

    const recsIds = parsed.recomendaciones.map(r => r.id);
    const recsMap = Object.fromEntries(parsed.recomendaciones.map(r => [r.id, r.razon]));
    console.log(`[Recs] Claude suggested IDs:`, recsIds);
    console.log(`[Recs] Menu IDs:`, menu.rows.map(m => m.id));

    const result = menu.rows
        .filter(m => recsIds.includes(parseInt(m.id)))
        .map(m => ({ ...m, razon: recsMap[m.id] || recsMap[parseInt(m.id)] }));
    console.log(`[Recs] matched=${result.length}, sample imagen_key=${result[0]?.imagen_key}`);
    return result;
}

module.exports = { getRecommendations };
