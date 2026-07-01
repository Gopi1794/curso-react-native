import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showSuccessMessage, showErrorMessage } from '../../components/FlashMessageWrapper';
import API from '../../services/api';
import { useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/userSlice';

const ESTADO_CONFIG = {
    preparando:  { label: 'Preparando',  color: '#FB8C00', icon: 'time-outline' },
    en_camino:   { label: 'En camino',   color: '#1976D2', icon: 'bicycle-outline' },
    entregado:   { label: 'Entregado',   color: '#43A047', icon: 'checkmark-circle-outline' },
};

export default function RepartidorScreen() {
    const insets = useSafeAreaInsets();
    const dispatch = useAppDispatch();
    const [pedidos, setPedidos] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);

    const load = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const res = await API.repartidor.getMisPedidos();
            if (res.success) setPedidos(res.pedidos);
        } catch {
            showErrorMessage('Error', 'No se pudieron cargar los pedidos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, [load]);

    const handleUpdateEstado = (pedido, nuevoEstado) => {
        const labels = { en_camino: 'en camino', entregado: 'entregado' };
        Alert.alert(
            'Confirmar',
            `¿Marcar el pedido #${pedido.id} como ${labels[nuevoEstado]}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        setUpdating(pedido.id);
                        try {
                            const res = await API.repartidor.updateEstado(pedido.id, nuevoEstado);
                            if (res.success) {
                                if (nuevoEstado === 'entregado') {
                                    setPedidos(prev => prev.filter(p => p.id !== pedido.id));
                                    showSuccessMessage('¡Entregado!', `Pedido #${pedido.id} completado`);
                                } else {
                                    setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, estado: nuevoEstado } : p));
                                    showSuccessMessage('Estado actualizado', `Pedido #${pedido.id} en camino`);
                                }
                            } else {
                                showErrorMessage('Error', res.message);
                            }
                        } catch {
                            showErrorMessage('Error', 'No se pudo actualizar el estado');
                        } finally {
                            setUpdating(null);
                        }
                    },
                },
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: async () => {
                await API.token.remove();
                dispatch(logout());
            }},
        ]);
    };

    const renderPedido = ({ item }) => {
        const cfg = ESTADO_CONFIG[item.estado] ?? ESTADO_CONFIG.preparando;
        const isUpdating = updating === item.id;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
                    <View style={[styles.estadoBadge, { backgroundColor: cfg.color + '20', borderColor: cfg.color }]}>
                        <Ionicons name={cfg.icon} size={13} color={cfg.color} />
                        <Text style={[styles.estadoText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                </View>

                <View style={styles.clienteRow}>
                    <Ionicons name="person-outline" size={14} color="#888" />
                    <Text style={styles.clienteNombre}>{item.cliente_nombre} {item.cliente_apellido}</Text>
                    {item.cliente_telefono && (
                        <Text style={styles.clienteTel}>· {item.cliente_telefono}</Text>
                    )}
                </View>

                {item.direccion_entrega && (
                    <View style={styles.dirRow}>
                        <Ionicons name="location-outline" size={14} color="#FF8700" />
                        <Text style={styles.direccion}>{item.direccion_entrega}</Text>
                    </View>
                )}

                <View style={styles.itemsList}>
                    {(item.items || []).filter(i => i.nombre).map((i, idx) => (
                        <Text key={idx} style={styles.itemText}>· {i.cantidad}x {i.nombre}</Text>
                    ))}
                </View>

                <Text style={styles.total}>Total: ${parseFloat(item.total).toFixed(2)}</Text>

                {item.estado === 'preparando' && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.btnCamino, isUpdating && styles.btnDisabled]}
                        onPress={() => handleUpdateEstado(item, 'en_camino')}
                        disabled={isUpdating}
                    >
                        <Ionicons name="bicycle-outline" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Salir a entregar</Text>
                    </TouchableOpacity>
                )}

                {item.estado === 'en_camino' && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.btnEntregado, isUpdating && styles.btnDisabled]}
                        onPress={() => handleUpdateEstado(item, 'entregado')}
                        disabled={isUpdating}
                    >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Marcar como entregado</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View>
                    <Text style={styles.headerTitle}>Mis repartos</Text>
                    <Text style={styles.headerSub}>{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} activo{pedidos.length !== 1 ? 's' : ''}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={pedidos}
                keyExtractor={i => String(i.id)}
                renderItem={renderPedido}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8700" colors={['#FF8700']} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="bicycle-outline" size={56} color="#ddd" />
                        <Text style={styles.emptyTitle}>{loading ? 'Cargando...' : 'Sin repartos por ahora'}</Text>
                        <Text style={styles.emptySub}>Cuando el admin te asigne un pedido va a aparecer acá</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    header: {
        backgroundColor: '#FF8700', paddingHorizontal: 20, paddingBottom: 20,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    },
    headerTitle: { fontFamily: 'Poppins-Bold', fontSize: 22, color: '#fff' },
    headerSub: { fontFamily: 'Poppins-Regular', fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    logoutBtn: { padding: 8 },
    list: { padding: 16, paddingBottom: 40 },

    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    pedidoId: { fontFamily: 'Poppins-Bold', fontSize: 16, color: '#222' },
    estadoBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
    },
    estadoText: { fontFamily: 'Poppins-SemiBold', fontSize: 12 },

    clienteRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
    clienteNombre: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#444' },
    clienteTel: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#888' },

    dirRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 10 },
    direccion: { flex: 1, fontFamily: 'Poppins-Regular', fontSize: 13, color: '#555' },

    itemsList: { backgroundColor: '#F9F9F9', borderRadius: 10, padding: 10, marginBottom: 10 },
    itemText: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#555', marginBottom: 2 },
    total: { fontFamily: 'Poppins-Bold', fontSize: 15, color: '#222', marginBottom: 12 },

    actionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, borderRadius: 12, paddingVertical: 13,
    },
    btnCamino: { backgroundColor: '#1976D2' },
    btnEntregado: { backgroundColor: '#43A047' },
    btnDisabled: { opacity: 0.5 },
    actionBtnText: { fontFamily: 'Poppins-Bold', fontSize: 15, color: '#fff' },

    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
    emptyTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 18, color: '#bbb', marginTop: 16 },
    emptySub: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#ccc', textAlign: 'center', marginTop: 8 },
});
