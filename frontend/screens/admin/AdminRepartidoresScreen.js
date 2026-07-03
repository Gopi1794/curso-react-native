import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, RefreshControl,
    TouchableOpacity, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import AppHeader from '../../components/common/AppHeader';
import API from '../../services/api';

export default function AdminRepartidoresScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [repartidores, setRepartidores] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (isRefresh = false) => {
        try {
            const res = await API.admin.pedidos.getResumenRepartidoresDia();
            if (res.success) setRepartidores(res.repartidores);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    React.useEffect(() => { load(); }, [load]);
    const onRefresh = () => { setRefreshing(true); load(true); };

    const totales = repartidores.reduce((acc, r) => ({
        pedidos: acc.pedidos + parseInt(r.pedidos_entregados),
        ganancia: acc.ganancia + parseFloat(r.ganancia),
        efectivo: acc.efectivo + parseFloat(r.efectivo_cobrado),
    }), { pedidos: 0, ganancia: 0, efectivo: 0 });

    const renderItem = ({ item }) => {
        const entregados = parseInt(item.pedidos_entregados);
        const ganancia = parseFloat(item.ganancia);
        const efectivo = parseFloat(item.efectivo_cobrado);

        return (
            <View style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {item.nombre?.[0]}{item.apellido?.[0]}
                        </Text>
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={styles.nombre}>{item.nombre} {item.apellido}</Text>
                        {item.telefono ? (
                            <TouchableOpacity
                                style={styles.telRow}
                                onPress={() => Linking.openURL(`tel:${item.telefono}`)}
                            >
                                <Ionicons name="call-outline" size={13} color="#888" />
                                <Text style={styles.tel}>{item.telefono}</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <View style={[styles.badge, entregados === 0 && styles.badgeInactive]}>
                        <Text style={[styles.badgeText, entregados === 0 && styles.badgeTextInactive]}>
                            {entregados} {entregados === 1 ? 'entrega' : 'entregas'}
                        </Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>${ganancia.toFixed(2)}</Text>
                        <Text style={styles.statLabel}>A cobrar</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={[styles.statValue, { color: '#2E7D32' }]}>${efectivo.toFixed(2)}</Text>
                        <Text style={styles.statLabel}>Efectivo cobrado</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={[styles.statValue, { color: efectivo > ganancia ? '#E53935' : '#1976D2' }]}>
                            ${Math.abs(efectivo - ganancia).toFixed(2)}
                        </Text>
                        <Text style={styles.statLabel}>
                            {efectivo >= ganancia ? 'Le devolvés' : 'Le pagás'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="Repartidores"
                subtitle="Resumen del día"
                onBack={() => navigation.goBack()}
            />

            <FlatList
                data={repartidores}
                keyExtractor={i => String(i.id)}
                renderItem={renderItem}
                contentContainerStyle={[styles.list, { paddingTop: insets.top + 80, paddingBottom: FLOATING_TAB_BAR_HEIGHT }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8700" colors={['#FF8700']} progressViewOffset={insets.top + 80} />
                }
                ListHeaderComponent={repartidores.length > 0 ? (
                    <View style={styles.totalCard}>
                        <Text style={styles.totalTitle}>Total del día</Text>
                        <View style={styles.totalRow}>
                            <View style={styles.totalStat}>
                                <Text style={styles.totalValue}>{totales.pedidos}</Text>
                                <Text style={styles.totalLabel}>Entregas</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.totalStat}>
                                <Text style={styles.totalValue}>${totales.ganancia.toFixed(2)}</Text>
                                <Text style={styles.totalLabel}>A pagar</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.totalStat}>
                                <Text style={styles.totalValue}>${totales.efectivo.toFixed(2)}</Text>
                                <Text style={styles.totalLabel}>Efectivo total</Text>
                            </View>
                        </View>
                    </View>
                ) : null}
                ListEmptyComponent={loading ? null : (
                    <View style={styles.empty}>
                        <Ionicons name="bicycle-outline" size={52} color="#ddd" />
                        <Text style={styles.emptyText}>No hay repartidores activos</Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },
    list: { paddingHorizontal: 16 },

    totalCard: {
        backgroundColor: '#FF8700', borderRadius: 20, padding: 20, marginBottom: 16,
    },
    totalTitle: { fontFamily: 'Poppins-Bold', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 12 },
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    totalStat: { alignItems: 'center', flex: 1 },
    totalValue: { fontFamily: 'Poppins-Bold', fontSize: 22, color: '#fff' },
    totalLabel: { fontFamily: 'Poppins-Regular', fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    card: {
        backgroundColor: '#fff', borderRadius: 16, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, overflow: 'hidden',
    },
    cardTop: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, paddingBottom: 14, gap: 12,
    },
    avatar: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontFamily: 'Poppins-Bold', fontSize: 16, color: '#FF8700' },
    cardInfo: { flex: 1 },
    nombre: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#1A1A1A' },
    telRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    tel: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#888' },
    badge: {
        backgroundColor: '#FFF3E0', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
    },
    badgeInactive: { backgroundColor: '#F5F5F5' },
    badgeText: { fontFamily: 'Poppins-SemiBold', fontSize: 11, color: '#FF8700' },
    badgeTextInactive: { color: '#bbb' },

    statsRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FAFAFA', borderTopWidth: 1, borderTopColor: '#F0F0F0',
        paddingVertical: 14,
    },
    stat: { alignItems: 'center', flex: 1 },
    statValue: { fontFamily: 'Poppins-Bold', fontSize: 16, color: '#1A1A1A' },
    statLabel: { fontFamily: 'Poppins-Regular', fontSize: 10, color: '#999', marginTop: 2 },
    statDivider: { width: 1, height: 32, backgroundColor: '#E8E8E8' },

    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#bbb', marginTop: 16 },
});
