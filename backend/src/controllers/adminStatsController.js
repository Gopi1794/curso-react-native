const db = require('../config/database');

exports.getStats = async (req, res) => {
    const { restauranteId } = req.params;

    try {
        const [resumen, porDia, topPlatos, porEstado] = await Promise.all([
            // Hoy / semana / mes totales
            db.query(`
                SELECT
                    COUNT(CASE WHEN fecha_creacion::date = CURRENT_DATE THEN 1 END)::int                                    AS pedidos_hoy,
                    COALESCE(SUM(CASE WHEN fecha_creacion::date = CURRENT_DATE THEN total END), 0)::float                   AS revenue_hoy,
                    COUNT(CASE WHEN fecha_creacion >= date_trunc('week', NOW()) THEN 1 END)::int                            AS pedidos_semana,
                    COALESCE(SUM(CASE WHEN fecha_creacion >= date_trunc('week', NOW()) THEN total END), 0)::float            AS revenue_semana,
                    COUNT(CASE WHEN fecha_creacion >= date_trunc('month', NOW()) THEN 1 END)::int                           AS pedidos_mes,
                    COALESCE(SUM(CASE WHEN fecha_creacion >= date_trunc('month', NOW()) THEN total END), 0)::float           AS revenue_mes,
                    COUNT(*)::int                                                                                            AS pedidos_total,
                    COALESCE(SUM(total), 0)::float                                                                          AS revenue_total
                FROM pedidos
                WHERE restaurante_id = $1 AND estado != 'cancelado'
            `, [restauranteId]),

            // Últimos 7 días (un row por día)
            db.query(`
                SELECT
                    TO_CHAR(fecha_creacion::date, 'YYYY-MM-DD') AS fecha,
                    TO_CHAR(fecha_creacion::date, 'DD/MM')      AS label,
                    COUNT(*)::int                               AS pedidos,
                    COALESCE(SUM(total), 0)::float             AS revenue
                FROM pedidos
                WHERE restaurante_id = $1
                  AND estado != 'cancelado'
                  AND fecha_creacion >= NOW() - INTERVAL '7 days'
                GROUP BY fecha_creacion::date
                ORDER BY fecha_creacion::date ASC
            `, [restauranteId]),

            // Top 5 platos más vendidos (histórico)
            db.query(`
                SELECT
                    COALESCE(mi.nombre, pi.nombre_item) AS nombre,
                    SUM(pi.cantidad)::int               AS cantidad,
                    SUM(pi.subtotal)::float             AS revenue
                FROM pedido_items pi
                JOIN pedidos p ON p.id = pi.pedido_id
                LEFT JOIN menu_items mi ON mi.id = pi.menu_item_id
                WHERE p.restaurante_id = $1 AND p.estado != 'cancelado'
                GROUP BY COALESCE(mi.nombre, pi.nombre_item)
                ORDER BY cantidad DESC
                LIMIT 5
            `, [restauranteId]),

            // Pedidos por estado (hoy)
            db.query(`
                SELECT estado, COUNT(*)::int AS total
                FROM pedidos
                WHERE restaurante_id = $1 AND fecha_creacion::date = CURRENT_DATE
                GROUP BY estado
                ORDER BY total DESC
            `, [restauranteId]),
        ]);

        res.json({
            success: true,
            data: {
                resumen: resumen.rows[0],
                por_dia: porDia.rows,
                top_platos: topPlatos.rows,
                por_estado: porEstado.rows,
            },
        });
    } catch (error) {
        console.error('adminStatsController.getStats:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
};
