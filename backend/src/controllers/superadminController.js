const db = require('../config/database');
const bcrypt = require('bcryptjs');

const getGlobalStats = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                (SELECT COUNT(*)::int FROM restaurantes WHERE estado = 'activo') AS tenants_activos,
                (SELECT COUNT(*)::int FROM restaurantes) AS tenants_total,
                (SELECT COUNT(*)::int FROM usuarios WHERE rol = 'cliente') AS clientes_total,
                (SELECT COUNT(*)::int FROM pedidos WHERE fecha_creacion >= date_trunc('month', NOW())) AS pedidos_mes,
                (SELECT COALESCE(SUM(total), 0) FROM pedidos WHERE fecha_creacion >= date_trunc('month', NOW())) AS revenue_mes,
                (SELECT COUNT(*)::int FROM pedidos WHERE estado = 'pendiente') AS pedidos_pendientes
        `);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('getGlobalStats:', error);
        res.status(500).json({ success: false, message: 'Error al obtener stats globales' });
    }
};

const getTenants = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                r.id,
                r.nombre,
                r.descripcion,
                r.direccion,
                r.telefono,
                r.logo_url,
                r.estado,
                r.admin_id,
                r.fecha_creacion,
                u.nombre  AS admin_nombre,
                u.apellido AS admin_apellido,
                u.email    AS admin_email,
                COUNT(DISTINCT p.id)::int                                                                          AS total_pedidos,
                COALESCE(SUM(p.total), 0)::float                                                                   AS revenue_total,
                COUNT(DISTINCT CASE WHEN p.fecha_creacion >= date_trunc('month', NOW()) THEN p.id END)::int        AS pedidos_mes,
                COALESCE(SUM(CASE WHEN p.fecha_creacion >= date_trunc('month', NOW()) THEN p.total END), 0)::float AS revenue_mes,
                COUNT(DISTINCT p.usuario_id)::int                                                                  AS clientes_activos
            FROM restaurantes r
            LEFT JOIN usuarios u ON u.id = r.admin_id
            LEFT JOIN pedidos p  ON p.restaurante_id = r.id
            GROUP BY r.id, u.nombre, u.apellido, u.email
            ORDER BY r.fecha_creacion DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('getTenants:', error);
        res.status(500).json({ success: false, message: 'Error al obtener tenants' });
    }
};

const getTenantStats = async (req, res) => {
    const { id } = req.params;
    try {
        const tenantRes = await db.query(`
            SELECT r.*, u.nombre AS admin_nombre, u.apellido AS admin_apellido,
                   u.email AS admin_email, u.telefono AS admin_telefono
            FROM restaurantes r
            LEFT JOIN usuarios u ON u.id = r.admin_id
            WHERE r.id = $1
        `, [id]);

        if (!tenantRes.rows[0]) {
            return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
        }

        const statsRes = await db.query(`
            SELECT
                COUNT(DISTINCT p.id)::int                                                                               AS total_pedidos,
                COALESCE(SUM(p.total), 0)::float                                                                        AS revenue_total,
                COUNT(DISTINCT CASE WHEN p.fecha_creacion >= date_trunc('month', NOW()) THEN p.id END)::int             AS pedidos_mes,
                COALESCE(SUM(CASE WHEN p.fecha_creacion >= date_trunc('month', NOW()) THEN p.total END), 0)::float      AS revenue_mes,
                COUNT(DISTINCT CASE WHEN p.fecha_creacion >= NOW() - INTERVAL '7 days' THEN p.id END)::int             AS pedidos_semana,
                COUNT(DISTINCT p.usuario_id)::int                                                                       AS clientes_unicos,
                COUNT(DISTINCT mi.id)::int                                                                              AS total_platos,
                COUNT(DISTINCT CASE WHEN mi.disponible = true THEN mi.id END)::int                                     AS platos_activos
            FROM restaurantes r
            LEFT JOIN pedidos    p  ON p.restaurante_id  = r.id
            LEFT JOIN menu_items mi ON mi.restaurante_id = r.id
            WHERE r.id = $1
        `, [id]);

        res.json({ success: true, data: { ...tenantRes.rows[0], stats: statsRes.rows[0] } });
    } catch (error) {
        console.error('getTenantStats:', error);
        res.status(500).json({ success: false, message: 'Error al obtener stats del tenant' });
    }
};

const createTenant = async (req, res) => {
    const { nombre, descripcion, direccion, telefono, admin_email, admin_nombre, admin_apellido, admin_password } = req.body;

    if (!nombre || !admin_email || !admin_password) {
        return res.status(400).json({ success: false, message: 'nombre, admin_email y admin_password son requeridos' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const restaurantRes = await client.query(
            `INSERT INTO restaurantes (nombre, descripcion, direccion, telefono, estado)
             VALUES ($1, $2, $3, $4, 'activo') RETURNING id`,
            [nombre, descripcion || null, direccion || null, telefono || null]
        );
        const restauranteId = restaurantRes.rows[0].id;

        const existingUser = await client.query('SELECT id FROM usuarios WHERE email = $1', [admin_email]);
        let adminUserId;

        if (existingUser.rows[0]) {
            adminUserId = existingUser.rows[0].id;
            await client.query('UPDATE usuarios SET rol = $1 WHERE id = $2', ['admin', adminUserId]);
        } else {
            const hash = await bcrypt.hash(admin_password, 12);
            const newUser = await client.query(
                `INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol, email_verificado)
                 VALUES ($1, $2, $3, $4, $5, 'admin', true) RETURNING id`,
                [admin_nombre || 'Admin', admin_apellido || nombre, admin_email, telefono || '000000000', hash]
            );
            adminUserId = newUser.rows[0].id;
        }

        await client.query('UPDATE restaurantes SET admin_id = $1 WHERE id = $2', [adminUserId, restauranteId]);

        await client.query('COMMIT');
        res.json({
            success: true,
            message: 'Tenant creado exitosamente',
            data: { restaurante_id: restauranteId, admin_id: adminUserId }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('createTenant:', error);
        res.status(500).json({ success: false, message: 'Error al crear tenant' });
    } finally {
        client.release();
    }
};

const toggleTenantEstado = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `UPDATE restaurantes
             SET estado = CASE WHEN estado = 'activo' THEN 'inactivo' ELSE 'activo' END
             WHERE id = $1
             RETURNING id, nombre, estado`,
            [id]
        );
        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('toggleTenantEstado:', error);
        res.status(500).json({ success: false, message: 'Error al cambiar estado del tenant' });
    }
};

module.exports = { getGlobalStats, getTenants, getTenantStats, createTenant, toggleTenantEstado };
