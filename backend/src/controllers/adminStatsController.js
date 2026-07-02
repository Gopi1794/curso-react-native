const db = require('../config/database');

exports.getStats = async (req, res) => {
    const { restauranteId } = req.params;

    try {
        const [resumen, porDia, topPlatos, porEstado, clientes, horaPico] = await Promise.all([
            db.query(`
                SELECT
                    -- Hoy
                    COUNT(CASE WHEN fecha_creacion::date = CURRENT_DATE AND estado != 'cancelado' THEN 1 END)::int          AS pedidos_hoy,
                    COALESCE(SUM(CASE WHEN fecha_creacion::date = CURRENT_DATE AND estado != 'cancelado' THEN total END), 0)::float
                                                                                                                            AS revenue_hoy,
                    COUNT(CASE WHEN fecha_creacion::date = CURRENT_DATE THEN 1 END)::int                                    AS total_con_cancelados_hoy,
                    COUNT(CASE WHEN fecha_creacion::date = CURRENT_DATE AND estado = 'cancelado' THEN 1 END)::int            AS cancelados_hoy,

                    -- Semana actual
                    COUNT(CASE WHEN fecha_creacion >= date_trunc('week', NOW()) AND estado != 'cancelado' THEN 1 END)::int   AS pedidos_semana,
                    COALESCE(SUM(CASE WHEN fecha_creacion >= date_trunc('week', NOW()) AND estado != 'cancelado' THEN total END), 0)::float
                                                                                                                            AS revenue_semana,
                    -- Semana anterior
                    COUNT(CASE WHEN fecha_creacion >= date_trunc('week', NOW()) - INTERVAL '7 days'
                                AND fecha_creacion <  date_trunc('week', NOW())
                                AND estado != 'cancelado' THEN 1 END)::int                                                  AS pedidos_semana_anterior,
                    COALESCE(SUM(CASE WHEN fecha_creacion >= date_trunc('week', NOW()) - INTERVAL '7 days'
                                     AND fecha_creacion <  date_trunc('week', NOW())
                                     AND estado != 'cancelado' THEN total END), 0)::float                                   AS revenue_semana_anterior,

                    -- Mes actual
                    COUNT(CASE WHEN fecha_creacion >= date_trunc('month', NOW()) AND estado != 'cancelado' THEN 1 END)::int  AS pedidos_mes,
                    COALESCE(SUM(CASE WHEN fecha_creacion >= date_trunc('month', NOW()) AND estado != 'cancelado' THEN total END), 0)::float
                                                                                                                            AS revenue_mes,
                    -- Mes anterior
                    COUNT(CASE WHEN fecha_creacion >= date_trunc('month', NOW()) - INTERVAL '1 month'
                                AND fecha_creacion <  date_trunc('month', NOW())
                                AND estado != 'cancelado' THEN 1 END)::int                                                  AS pedidos_mes_anterior,
                    COALESCE(SUM(CASE WHEN fecha_creacion >= date_trunc('month', NOW()) - INTERVAL '1 month'
                                     AND fecha_creacion <  date_trunc('month', NOW())
                                     AND estado != 'cancelado' THEN total END), 0)::float                                   AS revenue_mes_anterior,

                    -- Cancelaciones del mes (para tasa)
                    COUNT(CASE WHEN fecha_creacion >= date_trunc('month', NOW()) AND estado = 'cancelado' THEN 1 END)::int   AS cancelados_mes,
                    COUNT(CASE WHEN fecha_creacion >= date_trunc('month', NOW()) THEN 1 END)::int                            AS total_con_cancelados_mes,

                    -- Descuentos del mes (cupones aplicados)
                    COALESCE(SUM(CASE WHEN fecha_creacion >= date_trunc('month', NOW()) AND estado != 'cancelado' THEN descuento END), 0)::float AS descuentos_mes,

                    -- Histórico total
                    COUNT(CASE WHEN estado != 'cancelado' THEN 1 END)::int                                                  AS pedidos_total,
                    COALESCE(SUM(CASE WHEN estado != 'cancelado' THEN total END), 0)::float                                 AS revenue_total
                FROM pedidos
                WHERE restaurante_id = $1
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

            // Clientes nuevos vs recurrentes (este mes)
            db.query(`
                WITH primera_compra AS (
                    SELECT usuario_id, MIN(fecha_creacion) AS primera_fecha
                    FROM pedidos
                    WHERE restaurante_id = $1 AND estado != 'cancelado'
                    GROUP BY usuario_id
                )
                SELECT
                    COUNT(DISTINCT p.usuario_id)::int AS total_clientes,
                    COUNT(DISTINCT CASE WHEN pc.primera_fecha >= date_trunc('month', NOW()) THEN p.usuario_id END)::int AS clientes_nuevos,
                    COUNT(DISTINCT CASE WHEN pc.primera_fecha <  date_trunc('month', NOW()) THEN p.usuario_id END)::int AS clientes_recurrentes
                FROM pedidos p
                JOIN primera_compra pc ON pc.usuario_id = p.usuario_id
                WHERE p.restaurante_id = $1
                  AND p.estado != 'cancelado'
                  AND p.fecha_creacion >= date_trunc('month', NOW())
            `, [restauranteId]),

            // Hora pico: pedidos por hora del día (últimos 30 días)
            db.query(`
                SELECT
                    EXTRACT(HOUR FROM fecha_creacion)::int  AS hora,
                    COUNT(*)::int                           AS pedidos,
                    COALESCE(SUM(total), 0)::float          AS revenue
                FROM pedidos
                WHERE restaurante_id = $1
                  AND estado != 'cancelado'
                  AND fecha_creacion >= NOW() - INTERVAL '30 days'
                GROUP BY EXTRACT(HOUR FROM fecha_creacion)
                ORDER BY hora ASC
            `, [restauranteId]),
        ]);

        res.json({
            success: true,
            data: {
                resumen:    resumen.rows[0],
                por_dia:    porDia.rows,
                top_platos: topPlatos.rows,
                por_estado: porEstado.rows,
                clientes:   clientes.rows[0],
                hora_pico:  horaPico.rows,
            },
        });
    } catch (error) {
        console.error('adminStatsController.getStats:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
};
