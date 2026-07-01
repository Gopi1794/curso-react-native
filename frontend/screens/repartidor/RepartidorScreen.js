import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, StatusBar, Alert, Linking, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dialog, Portal, Button, Paragraph } from 'react-native-paper';
import { showSuccessMessage, showErrorMessage } from '../../components/FlashMessageWrapper';
import { imageMap } from '../../assets/utils/imageMap';
import API from '../../services/api';
import { useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/userSlice';
import { useAppSelector } from '../../store/hooks';

export default function RepartidorScreen() {
    const insets = useSafeAreaInsets();
    const dispatch = useAppDispatch();
    const userInfo = useAppSelector(s => s.user.userInfo);
    const [pedidos, setPedidos] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [logoutVisible, setLogoutVisible] = useState(false);

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

    const confirmLogout = async () => {
        setLogoutVisible(false);
        await API.token.remove();
        dispatch(logout());
    };

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
                                    setPedidos(prev => prev.map(p =>
                                        p.id === pedido.id ? { ...p, estado: nuevoEstado } : p
                                    ));
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

    const renderPedido = ({ item }) => {
        const isUpdating = updating === item.id;
        const validItems = (item.items || []).filter(i => i.nombre);
        const firstImage = validItems.find(i => i.imagen_key)?.imagen_key;
        const imgSrc = firstImage && imageMap[firstImage] ? imageMap[firstImage] : null;

        return (
            <View style={styles.card}>
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.cardIconWrap}>
                        <Ionicons name="clipboard-outline" size={22} color="#FF8700" />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                        <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
                        <View style={styles.clienteRow}>
                            <Ionicons name="person-outline" size={13} color="#888" />
                            <Text style={styles.clienteText}>
                                {item.cliente_nombre} {item.cliente_apellido}
                                {item.cliente_telefono ? ` · ${item.cliente_telefono}` : ''}
                            </Text>
                        </View>
                        {item.direccion_entrega && (
                            <View style={styles.dirRow}>
                                <Ionicons name="location-outline" size={13} color="#FF8700" />
                                <Text style={styles.dirText}>{item.direccion_entrega}</Text>
                            </View>
                        )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </View>

                <View style={styles.divider} />

                {/* Productos */}
                <View style={styles.productosRow}>
                    <View style={styles.productosInfo}>
                        <Text style={styles.productosCount}>
                            {validItems.length} producto{validItems.length !== 1 ? 's' : ''}
                        </Text>
                        {validItems.map((i, idx) => (
                            <Text key={idx} style={styles.productoItem}>· {i.cantidad}x {i.nombre}</Text>
                        ))}
                    </View>
                    {imgSrc && (
                        <Image source={imgSrc} style={styles.productoImg} resizeMode="cover" />
                    )}
                </View>

                <View style={styles.divider} />

                {/* Total + pagado */}
                <View style={styles.totalRow}>
                    <View>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalAmount}>${parseFloat(item.total).toFixed(2)}</Text>
                    </View>
                    <View style={styles.pagadoBadge}>
                        <Ionicons name="cash-outline" size={13} color="#2E7D32" />
                        <Text style={styles.pagadoText}>Pagado</Text>
                    </View>
                </View>

                {/* Contacto */}
                <View style={styles.contactRow}>
                    {item.cliente_telefono && (
                        <TouchableOpacity
                            style={styles.contactBtn}
                            onPress={() => Linking.openURL(`tel:${item.cliente_telefono}`)}
                        >
                            <Ionicons name="call-outline" size={15} color="#43A047" />
                            <Text style={[styles.contactText, { color: '#43A047' }]}>Llamar cliente</Text>
                        </TouchableOpacity>
                    )}
                    {item.cliente_telefono && (
                        <TouchableOpacity
                            style={styles.contactBtn}
                            onPress={() => Linking.openURL(`whatsapp://send?phone=${item.cliente_telefono}`)}
                        >
                            <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                            <Text style={[styles.contactText, { color: '#25D366' }]}>WhatsApp cliente</Text>
                        </TouchableOpacity>
                    )}
                    {item.admin_telefono && (
                        <TouchableOpacity
                            style={styles.contactBtn}
                            onPress={() => Linking.openURL(`whatsapp://send?phone=${item.admin_telefono}`)}
                        >
                            <Ionicons name="shield-checkmark-outline" size={15} color="#1976D2" />
                            <Text style={[styles.contactText, { color: '#1976D2' }]}>Chat con admin</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Acción */}
                {item.estado === 'preparando' || item.estado === 'en_preparacion' ? (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.btnCamino, isUpdating && styles.btnDisabled]}
                        onPress={() => handleUpdateEstado(item, 'en_camino')}
                        disabled={isUpdating}
                    >
                        <Ionicons name="bicycle-outline" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Salir a entregar</Text>
                    </TouchableOpacity>
                ) : item.estado === 'en_camino' ? (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.btnEntregado, isUpdating && styles.btnDisabled]}
                        onPress={() => handleUpdateEstado(item, 'entregado')}
                        disabled={isUpdating}
                    >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Marcar como entregado</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View>
                    <Text style={styles.headerTitle}>Mis repartos</Text>
                    <Text style={styles.headerSub}>
                        {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} activo{pedidos.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => setLogoutVisible(true)} style={styles.headerBtn}>
                    <Ionicons name="log-out-outline" size={22} color="#FF8700" />
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
                ListFooterComponent={pedidos.length > 0 ? (
                    <View style={styles.tipCard}>
                        <Ionicons name="information-circle-outline" size={20} color="#1976D2" />
                        <View style={styles.tipText}>
                            <Text style={styles.tipTitle}>Consejo</Text>
                            <Text style={styles.tipSub}>Confirmá la entrega para mantener a tus clientes satisfechos.</Text>
                        </View>
                        <Text style={styles.tipEmoji}>📦✅</Text>
                    </View>
                ) : null}
                ListEmptyComponent={loading ? null : (
                    <View style={styles.empty}>
                        <Ionicons name="bicycle-outline" size={56} color="#ddd" />
                        <Text style={styles.emptyTitle}>Sin repartos por ahora</Text>
                        <Text style={styles.emptySub}>Cuando el admin te asigne un pedido va a aparecer acá</Text>
                    </View>
                )}
            />

            <Portal>
                <Dialog visible={logoutVisible} onDismiss={() => setLogoutVisible(false)} style={styles.dialog}>
                    <Dialog.Icon icon="log-out" size={36} color="#FF8700" />
                    <Dialog.Title style={styles.dialogTitle}>Cerrar sesión</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph style={styles.dialogMessage}>¿Estás seguro que querés cerrar sesión?</Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setLogoutVisible(false)} textColor="#888">Cancelar</Button>
                        <Button onPress={confirmLogout} textColor="#ff4444">Cerrar sesión</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },

    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 20, paddingBottom: 16,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    headerTitle: { fontFamily: 'Poppins-Bold', fontSize: 26, color: '#1A1A1A' },
    headerSub: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#888', marginTop: 2 },
    headerBtn: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: '#FFF5EB', justifyContent: 'center', alignItems: 'center',
    },

    list: { padding: 16, paddingBottom: 32 },

    card: {
        backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4 },
    cardIconWrap: {
        width: 46, height: 46, borderRadius: 14,
        backgroundColor: '#FFF5EB', justifyContent: 'center', alignItems: 'center',
    },
    cardHeaderInfo: { flex: 1 },
    pedidoId: { fontFamily: 'Poppins-Bold', fontSize: 16, color: '#1A1A1A', marginBottom: 3 },
    clienteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
    clienteText: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#666', flex: 1 },
    dirRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
    dirText: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#555', flex: 1 },

    divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 12 },

    productosRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    productosInfo: { flex: 1 },
    productosCount: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#FF8700', marginBottom: 4 },
    productoItem: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#555', marginBottom: 2 },
    productoImg: { width: 64, height: 64, borderRadius: 14 },

    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    totalLabel: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#888' },
    totalAmount: { fontFamily: 'Poppins-Bold', fontSize: 22, color: '#1A1A1A' },
    pagadoBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    },
    pagadoText: { fontFamily: 'Poppins-SemiBold', fontSize: 12, color: '#2E7D32' },

    contactRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    contactBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: '#F5F5F5',
    },
    contactText: { fontFamily: 'Poppins-SemiBold', fontSize: 12 },

    actionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, borderRadius: 14, paddingVertical: 14,
    },
    btnCamino: { backgroundColor: '#1976D2' },
    btnEntregado: { backgroundColor: '#43A047' },
    btnDisabled: { opacity: 0.5 },
    actionBtnText: { fontFamily: 'Poppins-Bold', fontSize: 15, color: '#fff' },

    tipCard: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#EFF6FF', borderRadius: 16, padding: 14, marginTop: 4,
    },
    tipText: { flex: 1 },
    tipTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#1A1A1A' },
    tipSub: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#555', marginTop: 2 },
    tipEmoji: { fontSize: 26 },

    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
    emptyTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 18, color: '#bbb', marginTop: 16 },
    emptySub: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#ccc', textAlign: 'center', marginTop: 8 },

    dialog: { borderRadius: 20, backgroundColor: '#fff' },
    dialogTitle: { textAlign: 'center', fontFamily: 'Poppins-Bold', fontSize: 18 },
    dialogMessage: { textAlign: 'center', fontFamily: 'Poppins-Regular', color: '#666' },
});
