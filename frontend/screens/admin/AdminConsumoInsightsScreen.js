import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/common/AppHeader';
import { showErrorMessage } from '../../components/FlashMessageWrapper';
import API from '../../services/api';
import { useAppSelector } from '../../store/hooks';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';

const DIA_NOMBRE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function AdminConsumoInsightsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const restaurante = useAppSelector(s => s.restaurant.selected);
    const [insight, setInsight] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analizando, setAnalizando] = useState(false);

    // Solo hace el GET (gratis) al montar — la IA nunca se dispara sola.
    const load = useCallback(async () => {
        if (!restaurante) return;
        setLoading(true);
        try {
            const res = await API.admin.stats.getConsumoInsights(restaurante.id);
            if (res.success) setInsight(res.insight);
        } catch {
            showErrorMessage('Error', 'No se pudo cargar el análisis');
        } finally {
            setLoading(false);
        }
    }, [restaurante]);

    useEffect(() => { load(); }, [load]);

    const handleAnalizar = async () => {
        setAnalizando(true);
        try {
            const res = await API.admin.stats.generarConsumoInsights(restaurante.id);
            if (res.success) {
                setInsight(res.insight);
            } else {
                showErrorMessage('Error', res.message || 'No se pudo generar el análisis');
            }
        } catch {
            showErrorMessage('Error', 'No se pudo generar el análisis');
        } finally {
            setAnalizando(false);
        }
    };

    const patrones = insight?.patrones || [];
    const sugerencias = insight?.sugerencias || [];

    return (
        <View style={styles.container}>
            <AppHeader title="Insights de consumo" subtitle="Patrones de venta por producto y día" onBack={() => navigation.goBack()} />

            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + FLOATING_TAB_BAR_HEIGHT + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#FF8700" style={{ marginTop: 60 }} />
                ) : !insight ? (
                    <View style={styles.empty}>
                        <Ionicons name="analytics-outline" size={52} color="#ddd" />
                        <Text style={styles.emptyText}>Todavía no hiciste ningún análisis</Text>
                        <Text style={styles.emptySubtext}>Tocá "Analizar ahora" para detectar patrones de consumo con tus pedidos reales.</Text>
                    </View>
                ) : patrones.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="hourglass-outline" size={52} color="#ddd" />
                        <Text style={styles.emptyText}>Sin datos suficientes todavía</Text>
                        <Text style={styles.emptySubtext}>Hace falta más volumen de pedidos para detectar un patrón confiable.</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="bulb-outline" size={20} color="#FF8700" />
                                <Text style={styles.cardTitle}>Sugerencias</Text>
                            </View>
                            <View style={{ gap: 10, marginTop: 12 }}>
                                {sugerencias.map((s, i) => (
                                    <View key={i} style={styles.sugerenciaRow}>
                                        <Ionicons name="sparkles-outline" size={16} color="#FF8700" />
                                        <Text style={styles.sugerenciaText}>{s}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="list-outline" size={20} color="#FF8700" />
                                <Text style={styles.cardTitle}>Patrones detectados</Text>
                            </View>
                            <View style={{ gap: 10, marginTop: 12 }}>
                                {patrones.map((p, i) => (
                                    <View key={i} style={styles.patronRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.patronProducto}>{p.producto}</Text>
                                            <Text style={styles.patronDetalle}>
                                                {DIA_NOMBRE[p.dia_semana]} · {p.pedidos_ese_dia} pedidos (promedio: {p.promedio_diario_producto})
                                            </Text>
                                        </View>
                                        <View style={styles.patronBadge}>
                                            <Text style={styles.patronBadgeText}>+{p.pct_sobre_promedio}%</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </>
                )}

                {insight && (
                    <Text style={styles.generadoEn}>
                        Generado el {new Date(insight.generado_en).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                )}

                <TouchableOpacity
                    style={[styles.analizarBtn, analizando && styles.analizarBtnDisabled]}
                    onPress={handleAnalizar}
                    disabled={analizando}
                >
                    {analizando ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="refresh" size={18} color="#fff" />
                            <Text style={styles.analizarBtnText}>Analizar ahora</Text>
                        </>
                    )}
                </TouchableOpacity>
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
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#1a1a1a' },

    sugerenciaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    sugerenciaText: { flex: 1, fontFamily: 'Poppins-Regular', fontSize: 13, color: '#444', lineHeight: 19 },

    patronRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    patronProducto: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#1a1a1a' },
    patronDetalle: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#888', marginTop: 2 },
    patronBadge: { backgroundColor: '#FFF3E0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    patronBadgeText: { fontFamily: 'Poppins-Bold', fontSize: 13, color: '#FF8700' },

    empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyText: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#bbb', textAlign: 'center', paddingHorizontal: 32 },
    emptySubtext: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#ccc', textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },

    generadoEn: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#bbb', textAlign: 'center', marginBottom: 16 },

    analizarBtn: {
        flexDirection: 'row', gap: 8, backgroundColor: '#FF8700', borderRadius: 16,
        paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    analizarBtnDisabled: { opacity: 0.6 },
    analizarBtnText: { fontFamily: 'Poppins-Bold', fontSize: 15, color: '#fff' },
});
