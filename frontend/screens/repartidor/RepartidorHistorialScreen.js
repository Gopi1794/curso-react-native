import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import API from '../../services/api';

export default function RepartidorHistorialScreen() {
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();
    const [pedidos, setPedidos] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (isRefresh = false) => {
        try {
            const res = await API.repartidor.getHistorial();
            if (res.success) setPedidos(res.pedidos);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    const onRefresh = () => { setRefreshing(true); load(true); };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
                <View style={styles.badge}>
                    <Ionicons name="checkmark-circle" size={13} color="#2E7D32" />
                    <Text style={styles.badgeText}>Entregado</Text>
                </View>
            </View>
            <Text style={styles.cliente}>{item.cliente_nombre} {item.cliente_apellido}</Text>
            {item.direccion_entrega && (
                <Text style={styles.dir}>{item.direccion_entrega}</Text>
            )}
            <Text style={styles.total}>${parseFloat(item.total).toFixed(2)}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.headerTitle}>Historial</Text>
                <Text style={styles.headerSub}>{pedidos.length} entrega{pedidos.length !== 1 ? 's' : ''} completada{pedidos.length !== 1 ? 's' : ''}</Text>
            </View>
            <FlatList
                data={pedidos}
                keyExtractor={i => String(i.id)}
                renderItem={renderItem}
                contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8700" colors={['#FF8700']} />}
                ListEmptyComponent={loading ? null : (
                    <View style={styles.empty}>
                        <Ionicons name="time-outline" size={52} color="#ddd" />
                        <Text style={styles.emptyText}>Todavía no completaste ningún reparto</Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    headerTitle: { fontFamily: 'Poppins-Bold', fontSize: 26, color: '#1A1A1A' },
    headerSub: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#888', marginTop: 2 },
    list: { padding: 16, paddingBottom: 32 },
    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    pedidoId: { fontFamily: 'Poppins-Bold', fontSize: 15, color: '#1A1A1A' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { fontFamily: 'Poppins-SemiBold', fontSize: 11, color: '#2E7D32' },
    cliente: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#444', marginBottom: 2 },
    dir: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#888', marginBottom: 6 },
    total: { fontFamily: 'Poppins-Bold', fontSize: 16, color: '#1A1A1A' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#bbb', marginTop: 16, textAlign: 'center', paddingHorizontal: 40 },
});
