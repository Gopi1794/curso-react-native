const db = require('../config/database');

// Crear tabla si no existe al arrancar
db.query(`
    CREATE TABLE IF NOT EXISTS favoritos (
        usuario_id      BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        menu_item_id    BIGINT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (usuario_id, menu_item_id)
    )
`).catch(err => console.error('Error creando tabla favoritos:', err.message));

const getAll = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT mi.id, mi.nombre, mi.precio, mi.imagen_key, mi.descripcion, mi.categoria,
                    f.fecha_creacion AS added_date
             FROM favoritos f
             JOIN menu_items mi ON mi.id = f.menu_item_id
             WHERE f.usuario_id = $1
             ORDER BY f.fecha_creacion DESC`,
            [req.user.userId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error en getAll favoritos:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const add = async (req, res) => {
    const { menu_item_id } = req.body;
    if (!menu_item_id || isNaN(menu_item_id)) {
        return res.status(400).json({ success: false, message: 'menu_item_id inválido' });
    }
    try {
        await db.query(
            `INSERT INTO favoritos (usuario_id, menu_item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [req.user.userId, menu_item_id]
        );
        res.json({ success: true });
    } catch (err) {
        // error 23503 = FK violation (menu_item_id no existe)
        if (err.code === '23503') {
            return res.status(404).json({ success: false, message: 'El ítem no existe' });
        }
        console.error('Error en add favorito:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const remove = async (req, res) => {
    if (isNaN(req.params.menuItemId)) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    try {
        await db.query(
            `DELETE FROM favoritos WHERE usuario_id = $1 AND menu_item_id = $2`,
            [req.user.userId, req.params.menuItemId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error en remove favorito:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = { getAll, add, remove };
