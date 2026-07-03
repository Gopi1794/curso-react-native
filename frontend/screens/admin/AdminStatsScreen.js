import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Rect, Text as SvgText, Line, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';

// En Expo Go usamos SVG; en builds nativos usamos Victory Native XL (Skia)
const IS_EXPO_GO = Constants.appOwnership === 'expo';
let CartesianChart = null;
let VictoryBar = null;
if (!IS_EXPO_GO) {
    try {
        const vn = require('victory-native');
        CartesianChart = vn.CartesianChart;
        VictoryBar     = vn.Bar;
    } catch {}
}
import { useAppSelector } from '../../store/hooks';
import API from '../../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W  = SCREEN_W - 64;
const CHART_H  = 160;
const PAD_L    = 44;
const PAD_B    = 28;
const BAR_AREA_W = CHART_W - PAD_L;
const BAR_AREA_H = CHART_H - PAD_B;

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
const fmtK = (n) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;

const ESTADO_COLOR = {
    pendiente:      '#F59E0B',
    en_preparacion: '#3B82F6',
    en_camino:      '#8B5CF6',
    entregado:      '#10B981',
    cancelado:      '#EF4444',
    confirmado:     '#06B6D4',
};
const ESTADO_LABEL = {
    pendiente:      'Pendiente',
    en_preparacion: 'En preparación',
    en_camino:      'En camino',
    entregado:      'Entregado',
    cancelado:      'Cancelado',
    confirmado:     'Confirmado',
};

// ── Bar chart SVG ─────────────────────────────────────────

function SvgBarChart({ data, formatY = fmtK }) {
    if (!data || data.length === 0) {
        return (
            <View style={styles.emptyChart}>
                <Ionicons name="bar-chart-outline" size={40} color="#E5E7EB" />
                <Text style={styles.emptyChartText}>Sin datos aún</Text>
            </View>
        );
    }

    const maxVal   = Math.max(...data.map(d => d.revenue), 1);
    const barCount = data.length;
    const gap      = 6;
    const barW     = (BAR_AREA_W - gap * (barCount + 1)) / barCount;
    const yTicks   = [0, 0.25, 0.5, 0.75, 1].map(t => maxVal * t);

    return (
        <Svg width={CHART_W} height={CHART_H}>
            {/* Grid lines + Y labels */}
            {yTicks.map((val, i) => {
                const y = BAR_AREA_H - (val / maxVal) * BAR_AREA_H;
                return (
                    <G key={i}>
                        <Line
                            x1={PAD_L} y1={y} x2={CHART_W} y2={y}
                            stroke="#F3F4F6" strokeWidth={1}
                        />
                        {i > 0 && (
                            <SvgText
                                x={PAD_L - 4} y={y + 4}
                                fontSize={9} fill="#9CA3AF"
                                textAnchor="end"
                            >
                                {formatY(val)}
                            </SvgText>
                        )}
                    </G>
                );
            })}

            {/* Bars + X labels */}
            {data.map((d, i) => {
                const barH  = Math.max((d.revenue / maxVal) * BAR_AREA_H, 2);
                const x     = PAD_L + gap + i * (barW + gap);
                const y     = BAR_AREA_H - barH;
                const isMax = d.revenue === maxVal;
                return (
                    <G key={i}>
                        <Rect
                            x={x} y={y}
                            width={barW} height={barH}
                            rx={5} ry={5}
                            fill={isMax ? '#FF5500' : '#FF8700'}
                            opacity={isMax ? 1 : 0.75}
                        />
                        <SvgText
                            x={x + barW / 2} y={CHART_H - 6}
                            fontSize={9} fill="#9CA3AF"
                            textAnchor="middle"
                        >
                            {d.label}
                        </SvgText>
                    </G>
                );
            })}

            {/* Baseline */}
            <Line
                x1={PAD_L} y1={BAR_AREA_H} x2={CHART_W} y2={BAR_AREA_H}
                stroke="#E5E7EB" strokeWidth={1}
            />
        </Svg>
    );
}

// ── Bar chart Victory Native XL (builds nativos) ─────────

function VictoryBarChart({ data, formatY = fmtK }) {
    if (!CartesianChart || !VictoryBar) return <SvgBarChart data={data} formatY={formatY} />;
    return (
        <View style={{ height: CHART_H + PAD_B }}>
            <CartesianChart
                data={data}
                xKey="label"
                yKeys={['revenue']}
                domainPadding={{ left: 12, right: 12, top: 16 }}
                axisOptions={{
                    tickCount: { x: data.length, y: 4 },
                    formatXLabel: (v) => v,
                    formatYLabel: formatY,
                    lineColor: '#F3F4F6',
                    labelColor: { x: '#9CA3AF', y: '#9CA3AF' },
                    labelOffset: { x: 4, y: 4 },
                }}
            >
                {({ points, chartBounds }) => (
                    <VictoryBar
                        points={points.revenue}
                        chartBounds={chartBounds}
                        color="#FF8700"
                        roundedCorners={{ topLeft: 6, topRight: 6 }}
                    />
                )}
            </CartesianChart>
        </View>
    );
}

// Selector de implementación
function BarChart({ data, formatY }) {
    return IS_EXPO_GO
        ? <SvgBarChart data={data} formatY={formatY} />
        : <VictoryBarChart data={data} formatY={formatY} />;
}

// ── KPI Card ──────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, subPositive, highlight, wide }) {
    return (
        <View style={[styles.kpiCard, wide && styles.kpiCardWide, highlight && styles.kpiCardHighlight]}>
            <View style={[styles.kpiIcon, highlight && styles.kpiIconHighlight]}>
                <Ionicons name={icon} size={15} color={highlight ? '#fff' : '#FF8700'} />
            </View>
            <Text style={[styles.kpiValue, highlight && styles.kpiValueHighlight]} numberOfLines={1}>
                {value}
            </Text>
            <Text style={[styles.kpiLabel, highlight && styles.kpiLabelHighlight]}>{label}</Text>
            {sub != null && (
                <View style={styles.kpiSub}>
                    <Ionicons
                        name={subPositive ? 'trending-up' : 'trending-down'}
                        size={10}
                        color={subPositive ? '#10B981' : '#EF4444'}
                    />
                    <Text style={[styles.kpiSubText, { color: subPositive ? '#10B981' : '#EF4444' }]}>
                        {Math.abs(sub)}%
                    </Text>
                </View>
            )}
        </View>
    );
}

function SectionTitle({ children }) {
    return <Text style={styles.sectionTitle}>{children}</Text>;
}

// ── Main ──────────────────────────────────────────────────

export default function AdminStatsScreen({ navigation }) {
    const insets     = useSafeAreaInsets();
    const restaurant = useAppSelector(s => s.restaurant.selected);

    const [data,       setData]       = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [insights,   setInsights]   = useState(null);
    const [loadingAI,  setLoadingAI]  = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await API.admin.stats.get(restaurant?.id);
            if (res.success) setData(res.data);
        } catch (e) {
            console.warn('AdminStatsScreen:', e);
        }
    }, [restaurant?.id]);

    const loadInsights = useCallback(async () => {
        if (!restaurant?.id) return;
        setLoadingAI(true);
        try {
            const res = await API.admin.stats.getReviewsInsights(restaurant.id);
            if (res.success) setInsights(res.insights);
        } catch (e) {
            console.warn('ReviewsInsights:', e);
        } finally {
            setLoadingAI(false);
        }
    }, [restaurant?.id]);

    useEffect(() => {
        load().finally(() => setLoading(false));
        loadInsights();
    }, [load, loadInsights]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([load(), loadInsights()]);
        setRefreshing(false);
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#FF8700" /></View>;
    }

    const r          = data?.resumen  || {};
    const porDia     = data?.por_dia  || [];
    const topPlatos  = data?.top_platos || [];
    const porEstado  = data?.por_estado || [];
    const clientes   = data?.clientes || {};
    const horaPico   = data?.hora_pico || [];

    const pendientesHoy  = porEstado.find(e => e.estado === 'pendiente')?.total || 0;
    const ticketPromMes  = r.pedidos_mes  > 0 ? r.revenue_mes  / r.pedidos_mes  : 0;

    // Comparación hoy vs promedio diario de la semana (WoW proxy)
    const avgDia    = r.pedidos_semana > 0 ? r.revenue_semana / 7 : 0;
    const pctRev    = avgDia > 0 ? (((r.revenue_hoy - avgDia) / avgDia) * 100).toFixed(0) : null;

    // MoM: este mes vs mes anterior
    const pctRevMes = r.revenue_mes_anterior > 0
        ? (((r.revenue_mes - r.revenue_mes_anterior) / r.revenue_mes_anterior) * 100).toFixed(0)
        : null;
    const pctPedidosMes = r.pedidos_mes_anterior > 0
        ? (((r.pedidos_mes - r.pedidos_mes_anterior) / r.pedidos_mes_anterior) * 100).toFixed(0)
        : null;

    // Tasa de cancelación del mes
    const tasaCancelMes = r.total_con_cancelados_mes > 0
        ? Math.round((r.cancelados_mes / r.total_con_cancelados_mes) * 100)
        : 0;

    // Retención de clientes
    const pctRecurrentes = clientes.total_clientes > 0
        ? Math.round((clientes.clientes_recurrentes / clientes.total_clientes) * 100)
        : 0;

    // Hora pico chart (repurpose revenue field for pedidos count)
    const horaPicoChart = horaPico.map(h => ({
        label:   `${String(h.hora).padStart(2, '0')}h`,
        revenue: h.pedidos,
    }));
    const peakHora = horaPico.length > 0
        ? horaPico.reduce((max, h) => h.pedidos > max.pedidos ? h : max, horaPico[0])
        : null;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={['#FF8700', '#FF5500']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Estadísticas</Text>
                        <Text style={styles.headerSub}>{restaurant?.nombre}</Text>
                    </View>
                    <View style={{ width: 36 }} />
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8700" progressViewOffset={insets.top + 60} />}
            >
                {/* Hoy */}
                <SectionTitle>Hoy</SectionTitle>
                <View style={styles.kpiRow}>
                    <KpiCard
                        icon="cash-outline" label="Revenue"
                        value={fmt(r.revenue_hoy)}
                        sub={pctRev} subPositive={pctRev > 0}
                        highlight
                    />
                    <KpiCard icon="receipt-outline"      label="Pedidos"    value={r.pedidos_hoy ?? 0} />
                    <KpiCard
                        icon={pendientesHoy > 0 ? 'alert-circle' : 'checkmark-circle-outline'}
                        label="Pendientes"
                        value={pendientesHoy}
                        highlight={pendientesHoy > 0}
                    />
                </View>

                {/* Este mes */}
                <SectionTitle>Este mes</SectionTitle>
                <View style={styles.kpiRow}>
                    <KpiCard
                        icon="trending-up-outline" label="Revenue" value={fmt(r.revenue_mes)}
                        sub={pctRevMes} subPositive={Number(pctRevMes) > 0}
                        wide
                    />
                    <KpiCard
                        icon="layers-outline" label="Pedidos" value={r.pedidos_mes ?? 0}
                        sub={pctPedidosMes} subPositive={Number(pctPedidosMes) > 0}
                    />
                    <KpiCard icon="calculator-outline" label="Ticket ∅" value={fmt(ticketPromMes)} />
                </View>

                {/* Tasa de cancelación del mes */}
                {r.total_con_cancelados_mes > 0 && (
                    <View style={styles.kpiRow}>
                        <KpiCard
                            icon="close-circle-outline"
                            label="Cancelados"
                            value={r.cancelados_mes ?? 0}
                            highlight={tasaCancelMes > 8}
                        />
                        <KpiCard
                            icon="stats-chart-outline"
                            label="Tasa cancel."
                            value={`${tasaCancelMes}%`}
                            highlight={tasaCancelMes > 8}
                            wide
                        />
                    </View>
                )}

                {/* Clientes nuevos vs recurrentes */}
                {clientes.total_clientes > 0 && (
                    <>
                        <SectionTitle>Clientes (este mes)</SectionTitle>
                        <View style={styles.kpiRow}>
                            <KpiCard
                                icon="person-add-outline"
                                label="Nuevos"
                                value={clientes.clientes_nuevos ?? 0}
                            />
                            <KpiCard
                                icon="repeat-outline"
                                label="Recurrentes"
                                value={clientes.clientes_recurrentes ?? 0}
                                highlight={pctRecurrentes >= 50}
                            />
                            <KpiCard
                                icon="heart-outline"
                                label="Retención"
                                value={`${pctRecurrentes}%`}
                                highlight={pctRecurrentes >= 50}
                            />
                        </View>
                    </>
                )}

                {/* Revenue bruto vs neto */}
                {r.descuentos_mes > 0 && (
                    <>
                        <SectionTitle>Descuentos aplicados (este mes)</SectionTitle>
                        <View style={styles.kpiRow}>
                            <KpiCard
                                icon="pricetag-outline"
                                label="Descuentos"
                                value={fmt(r.descuentos_mes)}
                                highlight
                            />
                            <KpiCard
                                icon="cash-outline"
                                label="Bruto"
                                value={fmt((r.revenue_mes || 0) + (r.descuentos_mes || 0))}
                                wide
                            />
                        </View>
                    </>
                )}

                {/* Gráfico 7 días */}
                <SectionTitle>Revenue últimos 7 días</SectionTitle>
                <View style={styles.chartCard}>
                    <BarChart data={porDia} />
                </View>

                {/* Hora pico */}
                {horaPicoChart.length > 0 && (
                    <>
                        <SectionTitle>
                            {`Pedidos por hora (últ. 30 días)${peakHora ? `  ·  pico ${String(peakHora.hora).padStart(2, '0')}h` : ''}`}
                        </SectionTitle>
                        <View style={styles.chartCard}>
                            <BarChart
                                data={horaPicoChart}
                                formatY={(n) => String(Math.round(n))}
                            />
                        </View>
                    </>
                )}

                {/* Top platos */}
                {topPlatos.length > 0 && (
                    <>
                        <SectionTitle>Top platos</SectionTitle>
                        <View style={styles.card}>
                            {topPlatos.map((p, i) => {
                                const barPct = (p.cantidad / (topPlatos[0]?.cantidad || 1)) * 100;
                                return (
                                    <View key={i} style={styles.platoRow}>
                                        <View style={styles.platoRank}>
                                            <Text style={styles.platoRankText}>{i + 1}</Text>
                                        </View>
                                        <View style={styles.platoInfo}>
                                            <View style={styles.platoNameRow}>
                                                <Text style={styles.platoName} numberOfLines={1}>{p.nombre}</Text>
                                                <Text style={styles.platoRevenue}>{fmt(p.revenue)}</Text>
                                            </View>
                                            <View style={styles.platoBarBg}>
                                                <View style={[styles.platoBar, { width: `${barPct}%` }]} />
                                            </View>
                                            <Text style={styles.platoCantidad}>{p.cantidad} vendidos</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}

                {/* Por estado */}
                {porEstado.length > 0 && (
                    <>
                        <SectionTitle>Pedidos de hoy por estado</SectionTitle>
                        <View style={styles.card}>
                            {porEstado.map((e, i) => {
                                const color    = ESTADO_COLOR[e.estado] || '#6B7280';
                                const total    = porEstado.reduce((s, x) => s + x.total, 0);
                                const pctE     = ((e.total / total) * 100).toFixed(0);
                                return (
                                    <View key={i} style={styles.estadoRow}>
                                        <View style={[styles.estadoDot, { backgroundColor: color }]} />
                                        <Text style={styles.estadoLabel}>{ESTADO_LABEL[e.estado] || e.estado}</Text>
                                        <View style={styles.estadoBarBg}>
                                            <View style={[styles.estadoBar, { width: `${pctE}%`, backgroundColor: color + '50' }]} />
                                        </View>
                                        <Text style={[styles.estadoCount, { color }]}>{e.total}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}

                {/* Histórico */}
                <SectionTitle>Histórico total</SectionTitle>
                <View style={styles.kpiRow}>
                    <KpiCard icon="trophy-outline"  label="Pedidos"       value={r.pedidos_total ?? 0} wide />
                    <KpiCard icon="wallet-outline"  label="Revenue total" value={fmt(r.revenue_total)} wide />
                </View>

                {/* ── Reviews AI Insights ── */}
                <SectionTitle>Análisis de reseñas (IA)</SectionTitle>
                {loadingAI ? (
                    <View style={styles.insightsLoading}>
                        <ActivityIndicator size="small" color="#FF8700" />
                        <Text style={styles.insightsLoadingText}>Analizando reseñas...</Text>
                    </View>
                ) : insights ? (
                    <View style={styles.insightsContainer}>
                        {/* Resumen de sentimiento */}
                        <View style={styles.sentimientoRow}>
                            <View style={[styles.sentimientoChip, { backgroundColor: '#D1FAE5' }]}>
                                <Ionicons name="happy-outline" size={14} color="#10B981" />
                                <Text style={[styles.sentimientoNum, { color: '#10B981' }]}>{insights.resumen?.positivos ?? 0}</Text>
                                <Text style={styles.sentimientoLabel}>Positivas</Text>
                            </View>
                            <View style={[styles.sentimientoChip, { backgroundColor: '#FEE2E2' }]}>
                                <Ionicons name="sad-outline" size={14} color="#EF4444" />
                                <Text style={[styles.sentimientoNum, { color: '#EF4444' }]}>{insights.resumen?.negativos ?? 0}</Text>
                                <Text style={styles.sentimientoLabel}>Negativas</Text>
                            </View>
                            <View style={[styles.sentimientoChip, { backgroundColor: '#F3F4F6' }]}>
                                <Ionicons name="remove-circle-outline" size={14} color="#6B7280" />
                                <Text style={[styles.sentimientoNum, { color: '#6B7280' }]}>{insights.resumen?.neutros ?? 0}</Text>
                                <Text style={styles.sentimientoLabel}>Neutras</Text>
                            </View>
                        </View>

                        {/* Top categorías con problemas */}
                        {insights.porCategoria?.filter(c => c.sentimiento === 'negativo').slice(0, 3).map((cat, i) => (
                            <View key={i} style={styles.categoriaRow}>
                                <View style={styles.categoriaBullet} />
                                <Text style={styles.categoriaText}>
                                    <Text style={styles.categoriaNum}>{cat.total} menciones</Text>
                                    {' de '}<Text style={styles.categoriaNombre}>{cat.categoria}</Text>
                                </Text>
                            </View>
                        ))}

                        {/* Últimas negativas */}
                        {insights.negativas?.length > 0 && (
                            <>
                                <Text style={styles.negativasTitle}>Últimas críticas</Text>
                                {insights.negativas.map((n, i) => (
                                    <View key={i} style={styles.negativaItem}>
                                        <View style={styles.negativaHeader}>
                                            <Text style={styles.negativaPlato}>{n.plato}</Text>
                                            <View style={styles.ratingBadge}>
                                                <Ionicons name="star" size={10} color="#F59E0B" />
                                                <Text style={styles.ratingText}>{n.rating}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.negativaResumen}>"{n.resumen}"</Text>
                                    </View>
                                ))}
                            </>
                        )}

                        {(!insights.resumen || insights.resumen.total === '0') && (
                            <Text style={styles.insightsEmpty}>Sin reseñas en los últimos 30 días</Text>
                        )}
                    </View>
                ) : null}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Reviews AI Insights
    insightsLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 12 },
    insightsLoadingText: { fontSize: 13, color: '#9CA3AF', fontFamily: 'Poppins-Regular' },
    insightsContainer: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    sentimientoRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    sentimientoChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
    sentimientoNum: { fontSize: 16, fontFamily: 'Poppins-Bold', fontWeight: 'bold' },
    sentimientoLabel: { fontSize: 11, color: '#6B7280', fontFamily: 'Poppins-Regular' },
    categoriaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    categoriaBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
    categoriaText: { fontSize: 13, color: '#374151', fontFamily: 'Poppins-Regular' },
    categoriaNum: { fontFamily: 'Poppins-SemiBold', color: '#EF4444' },
    categoriaNombre: { fontFamily: 'Poppins-SemiBold', color: '#111827', textTransform: 'capitalize' },
    negativasTitle: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#374151', marginTop: 12, marginBottom: 8 },
    negativaItem: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 6 },
    negativaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    negativaPlato: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#111827' },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    ratingText: { fontSize: 11, fontFamily: 'Poppins-Bold', color: '#92400E' },
    negativaResumen: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#6B7280', fontStyle: 'italic' },
    insightsEmpty: { fontSize: 13, color: '#9CA3AF', fontFamily: 'Poppins-Regular', textAlign: 'center', paddingVertical: 8 },
    header:    { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
    headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
    content: { padding: 16, gap: 8, paddingBottom: FLOATING_TAB_BAR_HEIGHT },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginTop: 8, marginBottom: 4 },
    // KPI
    kpiRow:            { flexDirection: 'row', gap: 8 },
    kpiCard:           { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
    kpiCardWide:       { flex: 1.4 },
    kpiCardHighlight:  { backgroundColor: '#FF8700' },
    kpiIcon:           { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    kpiIconHighlight:  { backgroundColor: 'rgba(255,255,255,0.25)' },
    kpiValue:          { fontSize: 15, fontWeight: '800', color: '#111827' },
    kpiValueHighlight: { color: '#fff' },
    kpiLabel:          { fontSize: 10, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },
    kpiLabelHighlight: { color: 'rgba(255,255,255,0.85)' },
    kpiSub:            { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 },
    kpiSubText:        { fontSize: 10, fontWeight: '600' },
    // Chart
    chartCard:      { backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
    emptyChart:     { height: CHART_H, justifyContent: 'center', alignItems: 'center', gap: 8 },
    emptyChartText: { fontSize: 13, color: '#9CA3AF' },
    // Card genérica
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
    // Top platos
    platoRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
    platoRank:     { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
    platoRankText: { fontSize: 12, fontWeight: '700', color: '#FF8700' },
    platoInfo:     { flex: 1 },
    platoNameRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    platoName:     { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },
    platoRevenue:  { fontSize: 13, fontWeight: '700', color: '#FF8700', marginLeft: 8 },
    platoBarBg:    { height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, marginBottom: 2 },
    platoBar:      { height: 4, backgroundColor: '#FF8700', borderRadius: 2 },
    platoCantidad: { fontSize: 11, color: '#9CA3AF' },
    // Estado
    estadoRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
    estadoDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    estadoLabel: { fontSize: 12, color: '#374151', width: 110 },
    estadoBarBg: { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
    estadoBar:   { height: 8, borderRadius: 4 },
    estadoCount: { fontSize: 13, fontWeight: '700', width: 24, textAlign: 'right' },
});
