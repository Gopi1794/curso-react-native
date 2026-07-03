import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/common/AppHeader';
import API from '../../services/api';
import { useAppSelector } from '../../store/hooks';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';

const SENTIMIENTO_COLOR = {
    positivo: '#10B981',
    negativo: '#EF4444',
    neutro:   '#F59E0B',
};

const CATEGORIA_ICON = {
    demora:      'time-outline',
    sabor:       'restaurant-outline',
    porcion:     'scale-outline',
    temperatura: 'thermometer-outline',
    packaging:   'cube-outline',
    atencion:    'people-outline',
    positivo:    'happy-outline',
};

function SkeletonBox({ width, height, style }) {
    const anim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return (
        <Animated.View
            style={[{ width, height, borderRadius: 8, backgroundColor: '#E0E0E0', opacity: anim }, style]}
        />
    );
}

function SentimientoBar({ label, value, total, color }) {
    const pct = total > 0 ? (value / total) * 100 : 0;
    const width = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(width, { toValue: pct, duration: 600, useNativeDriver: false }).start();
    }, [pct]);

    return (
        <View style={styles.barRow}>
            <Text style={styles.barLabel}>{label}</Text>
            <View style={styles.barTrack}>
                <Animated.View
                    style={[styles.barFill, {
                        width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                        backgroundColor: color,
                    }]}
                />
            </View>
            <Text style={[styles.barValue, { color }]}>{value}</Text>
        </View>
    );
}

export default function AdminReviewsInsightsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const restauranteId = useAppSelector(state => state.user.userInfo?.restaurante_id);
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setError(false);
        try {
            const res = await API.admin.stats.getReviewsInsights(restauranteId);
            if (res.success) {
                setInsights(res.insights);
                setError(false);
            } else {
                setError(true);
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [restauranteId]);

    useEffect(() => { load(); }, [load]);
    const onRefresh = () => { setRefreshing(true); load(true); };

    const resumen = insights?.resumen;
    const total = parseInt(resumen?.total || 0);

    return (
        <View style={styles.container}>
            <AppHeader title="Insights de reseñas" subtitle="Análisis IA de comentarios" onBack={() => navigation.goBack()} />

            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 80, paddingBottom: FLOATING_TAB_BAR_HEIGHT }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#FF8700"
                        colors={['#FF8700']}
                        progressViewOffset={insets.top + 80}
                    />
                }
            >
                {loading ? (
                    <View style={{ gap: 16 }}>
                        <SkeletonBox width="100%" height={120} />
                        <SkeletonBox width="100%" height={180} />
                        <SkeletonBox width="100%" height={240} />
                    </View>
                ) : error ? (
                    <View style={styles.empty}>
                        <Ionicons name="cloud-offline-outline" size={52} color="#ddd" />
                        <Text style={styles.emptyText}>No se pudo cargar el análisis</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
                            <Ionicons name="refresh" size={16} color="#fff" />
                            <Text style={styles.retryText}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : total === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="chatbubbles-outline" size={52} color="#ddd" />
                        <Text style={styles.emptyText}>Todavía no hay reseñas para analizar</Text>
                        <Text style={styles.emptySubtext}>Cuando los clientes dejen comentarios, la IA los va a clasificar automáticamente.</Text>
                    </View>
                ) : (
                    <>
                        {/* Resumen sentimientos */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="analytics-outline" size={20} color="#FF8700" />
                                <Text style={styles.cardTitle}>Resumen últimos 30 días</Text>
                            </View>
                            <Text style={styles.totalLabel}>{total} reseñas analizadas</Text>
                            <View style={{ marginTop: 16, gap: 10 }}>
                                <SentimientoBar
                                    label="Positivas"
                                    value={parseInt(resumen?.positivos || 0)}
                                    total={total}
                                    color="#10B981"
                                />
                                <SentimientoBar
                                    label="Negativas"
                                    value={parseInt(resumen?.negativos || 0)}
                                    total={total}
                                    color="#EF4444"
                                />
                                <SentimientoBar
                                    label="Neutras"
                                    value={parseInt(resumen?.neutros || 0)}
                                    total={total}
                                    color="#F59E0B"
                                />
                            </View>
                        </View>

                        {/* Por categoría */}
                        {insights?.porCategoria?.length > 0 && (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="list-outline" size={20} color="#FF8700" />
                                    <Text style={styles.cardTitle}>Por categoría</Text>
                                </View>
                                <View style={{ gap: 10, marginTop: 12 }}>
                                    {insights.porCategoria.map((item, i) => (
                                        <View key={i} style={styles.catRow}>
                                            <View style={[styles.catIcon, { backgroundColor: SENTIMIENTO_COLOR[item.sentimiento] + '20' }]}>
                                                <Ionicons
                                                    name={CATEGORIA_ICON[item.categoria] || 'ellipse-outline'}
                                                    size={18}
                                                    color={SENTIMIENTO_COLOR[item.sentimiento]}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.catNombre}>{item.categoria}</Text>
                                                <Text style={[styles.catSentimiento, { color: SENTIMIENTO_COLOR[item.sentimiento] }]}>
                                                    {item.sentimiento}
                                                </Text>
                                            </View>
                                            <View style={[styles.catBadge, { backgroundColor: SENTIMIENTO_COLOR[item.sentimiento] + '15' }]}>
                                                <Text style={[styles.catTotal, { color: SENTIMIENTO_COLOR[item.sentimiento] }]}>
                                                    {item.total}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Reseñas negativas recientes */}
                        {insights?.negativas?.length > 0 && (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="warning-outline" size={20} color="#EF4444" />
                                    <Text style={styles.cardTitle}>Últimas reseñas negativas</Text>
                                </View>
                                <View style={{ gap: 12, marginTop: 12 }}>
                                    {insights.negativas.map((item, i) => (
                                        <View key={i} style={styles.negativaRow}>
                                            <View style={styles.negativaStars}>
                                                {[1,2,3,4,5].map(s => (
                                                    <Ionicons
                                                        key={s}
                                                        name={s <= item.rating ? 'star' : 'star-outline'}
                                                        size={12}
                                                        color={s <= item.rating ? '#F59E0B' : '#ddd'}
                                                    />
                                                ))}
                                            </View>
                                            <Text style={styles.negativaPlato}>{item.plato}</Text>
                                            <Text style={styles.negativaResumen}>"{item.resumen}"</Text>
                                            <View style={styles.negativaMeta}>
                                                <View style={[styles.catBadge, { backgroundColor: '#FEE2E2' }]}>
                                                    <Text style={[styles.catTotal, { color: '#EF4444' }]}>{item.categoria}</Text>
                                                </View>
                                                <Text style={styles.negativaFecha}>
                                                    {new Date(item.fecha_creacion).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        <View style={styles.footer}>
                            <Ionicons name="sparkles-outline" size={14} color="#bbb" />
                            <Text style={styles.footerText}>Análisis generado por IA · Se actualiza con cada nueva reseña</Text>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },
    scroll: { paddingHorizontal: 16 },

    card: {
        backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    cardTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#1a1a1a' },
    totalLabel: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#888', marginTop: 2 },

    barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    barLabel: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#666', width: 64 },
    barTrack: { flex: 1, height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    barValue: { fontFamily: 'Poppins-Bold', fontSize: 13, width: 28, textAlign: 'right' },

    catRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    catIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    catNombre: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#1a1a1a', textTransform: 'capitalize' },
    catSentimiento: { fontFamily: 'Poppins-Regular', fontSize: 11, textTransform: 'capitalize', marginTop: 1 },
    catBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    catTotal: { fontFamily: 'Poppins-Bold', fontSize: 13 },

    negativaRow: {
        backgroundColor: '#FFF5F5', borderRadius: 14, padding: 14,
        borderLeftWidth: 3, borderLeftColor: '#EF4444', gap: 4,
    },
    negativaStars: { flexDirection: 'row', gap: 2 },
    negativaPlato: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#1a1a1a', marginTop: 2 },
    negativaResumen: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#444', fontStyle: 'italic', lineHeight: 18 },
    negativaMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
    negativaFecha: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#999' },

    empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyText: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#bbb', textAlign: 'center', paddingHorizontal: 32 },
    emptySubtext: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#ccc', textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF8700', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    retryText: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#fff' },

    footer: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 8 },
    footerText: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#bbb' },
});
