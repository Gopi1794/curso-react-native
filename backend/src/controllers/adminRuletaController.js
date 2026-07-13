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
            'SELECT posicion, label, icon, tipo, valor FROM ruleta_premios WHERE restaurante_id = $1',
            [restauranteId]
        );

        const premiosPorPosicion = {};
        for (const row of premiosResult.rows) {
            premiosPorPosicion[row.posicion] = { posicion: row.posicion, label: row.label, icon: row.icon, tipo: row.tipo, valor: row.valor };
        }

        const premios = [];
        for (let i = 0; i < 8; i++) {
            premios.push(premiosPorPosicion[i] || { posicion: i, label: null, icon: null, tipo: null, valor: null });
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
                `INSERT INTO ruleta_premios (restaurante_id, posicion, label, icon, tipo, valor)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (restaurante_id, posicion)
                 DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon, tipo = EXCLUDED.tipo, valor = EXCLUDED.valor`,
                [restauranteId, p.posicion, p.label || null, p.icon || null, p.tipo || null, p.valor || null]
            );
        }

        await client.query('COMMIT');

        const premiosResult = await db.query(
            'SELECT posicion, label, icon, tipo, valor FROM ruleta_premios WHERE restaurante_id = $1',
            [restauranteId]
        );
        const premiosPorPosicion = {};
        for (const row of premiosResult.rows) {
            premiosPorPosicion[row.posicion] = { posicion: row.posicion, label: row.label, icon: row.icon, tipo: row.tipo, valor: row.valor };
        }
        const premiosFinal = [];
        for (let i = 0; i < 8; i++) {
            premiosFinal.push(premiosPorPosicion[i] || { posicion: i, label: null, icon: null, tipo: null, valor: null });
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
