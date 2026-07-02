import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../../services/api';

const formatCurrency = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;

function StatRow({ icon, label, value, color = '#374151' }) {
    return (
        <View style={styles.statRow}>
            <View style={[styles.statRowIcon, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={16} color={color} />
            </View>
            <Text style={styles.statRowLabel}>{label}</Text>
            <Text style={[styles.statRowValue, { color }]}>{value}</Text>
        </View>
    );
}

export default function SuperAdminTenantDetailScreen({ route, navigation }) {
    const { tenantId, tenantName } = route.params;
    const insets = useSafeAreaInsets();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [toggling, setToggling] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await API.superadmin.getTenantStats(tenantId);
            if (res.success) setData(res.data);
        } catch {
            Alert.alert('Error', 'No se pudo cargar el tenant.');
        }
    }, [tenantId]);

    useEffect(() => {
        load().finally(() => setLoading(false));
    }, [load]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const handleToggle = async () => {
        const isActivo = data.estado === 'activo';
        Alert.alert(
            isActivo ? 'Desactivar tenant' : 'Activar tenant',
            isActivo
                ? `¿Desactivar "${data.nombre}"? Los clientes no podrán ver ni pedir.`
                : `¿Activar "${data.nombre}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: isActivo ? 'Desactivar' : 'Activar',
                    style: isActivo ? 'destructive' : 'default',
                    onPress: async () => {
                        setToggling(true);
                        try {
                            const res = await API.superadmin.toggleTenant(tenantId);
                            if (res.success) {
                                setData(d => ({ ...d, estado: res.data.estado }));
                            }
                        } catch {
                            Alert.alert('Error', 'No se pudo cambiar el estado.');
                        } finally {
                            setToggling(false);
                        }
                    }
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#FF8700" />
            </View>
        );
    }

    if (!data) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>No se pudo cargar el tenant</Text>
            </View>
        );
    }

    const isActivo = data.estado === 'activo';
    const s = data.stats || {};

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{tenantName}</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8700" />}
            >
                {/* Status card */}
                <View style={[styles.statusCard, { borderColor: isActivo ? '#10B981' : '#EF4444' }]}>
                    <View style={styles.statusLeft}>
                        <View style={[styles.statusDot, { backgroundColor: isActivo ? '#10B981' : '#EF4444' }]} />
                        <View>
                            <Text style={styles.statusLabel}>Estado del tenant</Text>
                            <Text style={[styles.statusValue, { color: isActivo ? '#065F46' : '#991B1B' }]}>
                                {isActivo ? 'Activo' : 'Inactivo'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.toggleBtn, { backgroundColor: isActivo ? '#FEF2F2' : '#F0FDF4' }, toggling && { opacity: 0.5 }]}
                        onPress={handleToggle}
                        disabled={toggling}
                    >
                        {toggling
                            ? <ActivityIndicator size="small" color={isActivo ? '#EF4444' : '#10B981'} />
                            : <Text style={[styles.toggleBtnText, { color: isActivo ? '#EF4444' : '#10B981' }]}>
                                {isActivo ? 'Desactivar' : 'Activar'}
                              </Text>
                        }
                    </TouchableOpacity>
                </View>

                {/* Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Información</Text>
                    {data.descripcion ? <Text style={styles.infoText}>{data.descripcion}</Text> : null}
                    {data.direccion ? (
                        <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={14} color="#6B7280" />
                            <Text style={styles.infoRowText}>{data.direccion}</Text>
                        </View>
                    ) : null}
                    {data.telefono ? (
                        <View style={styles.infoRow}>
                            <Ionicons name="call-outline" size={14} color="#6B7280" />
                            <Text style={styles.infoRowText}>{data.telefono}</Text>
                        </View>
                    ) : null}
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                        <Text style={styles.infoRowText}>
                            Creado el {new Date(data.fecha_creacion).toLocaleDateString('es-AR')}
                        </Text>
                    </View>
                </View>

                {/* Métricas del mes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Este mes</Text>
                    <StatRow icon="receipt-outline"  label="Pedidos"  value={s.pedidos_mes}             color="#3B82F6" />
                    <StatRow icon="cash-outline"     label="Revenue"  value={formatCurrency(s.revenue_mes)} color="#10B981" />
                    <StatRow icon="trending-up-outline" label="Semana" value={`${s.pedidos_semana} pedidos`} color="#8B5CF6" />
                </View>

                {/* Métricas totales */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Histórico</Text>
                    <StatRow icon="stats-chart-outline" label="Total pedidos"    value={s.total_pedidos}           color="#374151" />
                    <StatRow icon="wallet-outline"       label="Revenue total"    value={formatCurrency(s.revenue_total)} color="#374151" />
                    <StatRow icon="people-outline"       label="Clientes únicos"  value={s.clientes_unicos}         color="#374151" />
                    <StatRow icon="fast-food-outline"    label="Platos activos"   value={`${s.platos_activos} / ${s.total_platos}`} color="#374151" />
                </View>

                {/* Admin asignado */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Administrador</Text>
                    {data.admin_nombre ? (
                        <View style={styles.adminCard}>
                            <View style={styles.adminAvatar}>
                                <Ionicons name="person" size={20} color="#FF8700" />
                            </View>
                            <View>
                                <Text style={styles.adminName}>{data.admin_nombre} {data.admin_apellido}</Text>
                                <Text style={styles.adminEmail}>{data.admin_email}</Text>
                                {data.admin_telefono ? <Text style={styles.adminEmail}>{data.admin_telefono}</Text> : null}
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.noAdmin}>Sin administrador asignado</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: '#6B7280', fontSize: 15 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111827' },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    statusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5 },
    statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    statusLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
    statusValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
    toggleBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    toggleBtnText: { fontWeight: '700', fontSize: 13 },
    section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 4 },
    infoText: { fontSize: 14, color: '#374151', lineHeight: 20 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoRowText: { fontSize: 13, color: '#6B7280' },
    statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statRowIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    statRowLabel: { flex: 1, fontSize: 14, color: '#374151' },
    statRowValue: { fontSize: 15, fontWeight: '700' },
    adminCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12 },
    adminAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center' },
    adminName: { fontSize: 15, fontWeight: '700', color: '#111827' },
    adminEmail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    noAdmin: { fontSize: 14, color: '#9CA3AF' },
});
