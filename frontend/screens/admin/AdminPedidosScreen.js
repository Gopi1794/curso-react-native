import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import AppHeader from '../../components/common/AppHeader';
import { showSuccessMessage, showErrorMessage } from '../../components/FlashMessageWrapper';
import API from '../../services/api';

const ESTADO_COLOR = {
    pendiente:      '#FB8C00',
    confirmado:     '#0288D1',
    en_preparacion: '#1976D2',
    en_camino:      '#7B1FA2',
    entregado:      '#2E7D32',
    cancelado:      '#C62828',
};

const NEXT_ESTADOS = {
    pendiente:      ['en_preparacion', 'cancelado'],
    confirmado:     ['en_preparacion', 'cancelado'],
    en_preparacion: ['cancelado'],
};

const ESTADO_LABEL = {
    en_preparacion: 'En preparación',
    en_camino:      'En camino',
    entregado:      'Entregado',
    cancelado:      'Cancelar pedido',
};

const ESTADO_BTN_COLOR = {
    en_preparacion: '#1976D2',
    en_camino:      '#7B1FA2',
    entregado:      '#2E7D32',
    cancelado:      '#C62828',
};

export default function AdminPedidosScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [pedidos, setPedidos] = useState([]);
    const [repartidores, setRepartidores] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState(null);
    const [estadoModal, setEstadoModal] = useState(false);
    const [estadoPedido, setEstadoPedido] = useState(null);
    const [updatingEstado, setUpdatingEstado] = useState(false);

    const load = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const [pedRes, repRes] = await Promise.all([
                API.admin.pedidos.getAll(),
                API.admin.pedidos.getRepartidores(),
            ]);
if (pedRes.success) setPedidos(pedRes.pedidos);
            if (repRes.success) setRepartidores(repRes.repartidores);
        } catch {
            showErrorMessage('Error', 'No se pudieron cargar los pedidos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, [load]);

    const openAsignar = (pedido) => {
        setSelectedPedido(pedido);
        setModalVisible(true);
    };

    const openEstadoModal = (pedido) => {
        setEstadoPedido(pedido);
        setEstadoModal(true);
    };

    const handleUpdateEstado = async (nuevoEstado) => {
        if (!estadoPedido) return;
        setUpdatingEstado(true);
        try {
            const res = await API.admin.pedidos.updateEstado(estadoPedido.id, nuevoEstado);
            if (res.success) {
                setPedidos(prev => prev.map(p =>
                    p.id === estadoPedido.id ? { ...p, estado: nuevoEstado } : p
                ));
                setEstadoModal(false);
                setEstadoPedido(null);
                showSuccessMessage('Estado actualizado', `Pedido #${estadoPedido.id} → ${ESTADO_LABEL[nuevoEstado]}`);
            } else {
                showErrorMessage('Error', res.message);
            }
        } catch {
            showErrorMessage('Error', 'No se pudo actualizar el estado');
        } finally {
            setUpdatingEstado(false);
        }
    };

    const handleAsignar = async (repartidorId) => {
        if (!selectedPedido) return;
        setAssigning(true);
        try {
            const res = await API.admin.pedidos.asignar(selectedPedido.id, repartidorId);
            if (res.success) {
                const rep = repartidores.find(r => r.id === repartidorId);
                setPedidos(prev => prev.map(p =>
                    p.id === selectedPedido.id
                        ? { ...p, repartidor_id: repartidorId, repartidor_nombre: rep?.nombre, repartidor_apellido: rep?.apellido, estado: 'en_camino' }
                        : p
                ));
                showSuccessMessage('Repartidor asignado', `${rep?.nombre} va a buscar el pedido #${selectedPedido.id}`);
                setModalVisible(false);
                setSelectedPedido(null);
            } else {
                showErrorMessage('Error', res.message);
            }
        } catch {
            showErrorMessage('Error', 'No se pudo asignar el repartidor');
        } finally {
            setAssigning(false);
        }
    };

    const renderPedido = ({ item }) => {
        const color = ESTADO_COLOR[item.estado] ?? '#888';
        const yaAsignado = !!item.repartidor_id;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
                    <View style={[styles.estadoBadge, { borderColor: color, backgroundColor: color + '18' }]}>
                        <Text style={[styles.estadoText, { color }]}>{item.estado?.replace('_', ' ')}</Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={14} color="#888" />
                    <Text style={styles.infoText}>{item.cliente_nombre} {item.cliente_apellido}</Text>
                </View>

                {item.direccion_entrega && (
                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={14} color="#FF8700" />
                        <Text style={styles.infoText}>{item.direccion_entrega}</Text>
                    </View>
                )}

                <View style={styles.itemsList}>
                    {(item.items || []).filter(i => i.nombre).map((i, idx) => (
                        <Text key={idx} style={styles.itemText}>· {i.cantidad}x {i.nombre}</Text>
                    ))}
                </View>

                {/* Método de pago */}
                <View style={styles.payRow}>
                    <View style={[styles.metodoBadge, item.metodo_pago === 'efectivo' ? styles.badgeEfectivo : styles.badgeMP]}>
                        <Ionicons
                            name={item.metodo_pago === 'efectivo' ? 'cash-outline' : 'card-outline'}
                            size={12}
                            color={item.metodo_pago === 'efectivo' ? '#2E7D32' : '#1565C0'}
                        />
                        <Text style={[styles.metodoText, { color: item.metodo_pago === 'efectivo' ? '#2E7D32' : '#1565C0' }]}>
                            {item.metodo_pago === 'efectivo' ? 'Efectivo' : 'MercadoPago'}
                        </Text>
                    </View>
                    {item.pago_confirmado_at && (
                        <View style={styles.pagoConfirmadoBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#2E7D32" />
                            <Text style={styles.pagoConfirmadoText}>Pago confirmado</Text>
                        </View>
                    )}
                    {item.metodo_pago === 'efectivo' && item.monto_recibido ? (
                        <Text style={styles.cobradoInfo}>
                            Cobrado ${parseFloat(item.monto_recibido).toFixed(2)}
                            {parseFloat(item.monto_recibido) > parseFloat(item.total)
                                ? ` · Vuelto $${(parseFloat(item.monto_recibido) - parseFloat(item.total)).toFixed(2)}`
                                : ''}
                        </Text>
                    ) : null}
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.total}>Total: ${parseFloat(item.total).toFixed(2)}</Text>

                    <View style={styles.footerActions}>
                        {NEXT_ESTADOS[item.estado] && (
                            <TouchableOpacity
                                style={styles.estadoBtn}
                                onPress={() => openEstadoModal(item)}
                            >
                                <Ionicons name="swap-horizontal-outline" size={14} color="#fff" />
                                <Text style={styles.estadoBtnText}>Estado</Text>
                            </TouchableOpacity>
                        )}

                        {yaAsignado ? (
                            <View style={styles.asignadoChip}>
                                <Ionicons name="bicycle-outline" size={13} color="#7B1FA2" />
                                <Text style={styles.asignadoText}>{item.repartidor_nombre} {item.repartidor_apellido}</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.asignarBtn}
                                onPress={() => openAsignar(item)}
                            >
                                <Ionicons name="person-add-outline" size={14} color="#fff" />
                                <Text style={styles.asignarBtnText}>Asignar</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Pedidos" onBack={() => navigation.goBack()} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#FF8700" />
                </View>
            ) : (
                <FlatList
                    data={pedidos}
                    keyExtractor={i => String(i.id)}
                    renderItem={renderPedido}
                    contentContainerStyle={[styles.list, { paddingTop: insets.top + 76, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 16 }]}
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8700" colors={['#FF8700']} progressViewOffset={insets.top + 76} />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="receipt-outline" size={52} color="#ddd" />
                            <Text style={styles.emptyText}>No hay pedidos activos</Text>
                        </View>
                    }
                />
            )}

            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>
                            Asignar repartidor al pedido #{selectedPedido?.id}
                        </Text>

                        {repartidores.length === 0 ? (
                            <View style={styles.noReps}>
                                <Ionicons name="bicycle-outline" size={40} color="#ccc" />
                                <Text style={styles.noRepsText}>No hay repartidores activos</Text>
                            </View>
                        ) : (
                            repartidores.map(rep => (
                                <TouchableOpacity
                                    key={rep.id}
                                    style={[styles.repRow, assigning && styles.repRowDisabled]}
                                    onPress={() => handleAsignar(rep.id)}
                                    disabled={assigning}
                                >
                                    <View style={styles.repAvatar}>
                                        <Text style={styles.repAvatarText}>
                                            {rep.nombre?.[0]}{rep.apellido?.[0]}
                                        </Text>
                                    </View>
                                    <View style={styles.repInfo}>
                                        <Text style={styles.repNombre}>{rep.nombre} {rep.apellido}</Text>
                                        {rep.email && <Text style={styles.repEmail}>{rep.email}</Text>}
                                    </View>
                                    {assigning ? (
                                        <ActivityIndicator size="small" color="#FF8700" />
                                    ) : (
                                        <Ionicons name="chevron-forward" size={18} color="#ccc" />
                                    )}
                                </TouchableOpacity>
                            ))
                        )}

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                            <Text style={styles.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal cambiar estado */}
            <Modal
                visible={estadoModal}
                transparent
                animationType="slide"
                onRequestClose={() => setEstadoModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>
                            Cambiar estado — pedido #{estadoPedido?.id}
                        </Text>
                        <Text style={styles.estadoActualLabel}>
                            Estado actual: <Text style={{ color: ESTADO_COLOR[estadoPedido?.estado] ?? '#888', fontFamily: 'Poppins-SemiBold' }}>
                                {estadoPedido?.estado?.replace('_', ' ')}
                            </Text>
                        </Text>

                        {(NEXT_ESTADOS[estadoPedido?.estado] ?? []).map(next => (
                            <TouchableOpacity
                                key={next}
                                style={[styles.estadoOptionBtn, { backgroundColor: ESTADO_BTN_COLOR[next] }, updatingEstado && { opacity: 0.6 }]}
                                onPress={() => handleUpdateEstado(next)}
                                disabled={updatingEstado}
                            >
                                <Text style={styles.estadoOptionText}>{ESTADO_LABEL[next]}</Text>
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setEstadoModal(false)} disabled={updatingEstado}>
                            <Text style={styles.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },

    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    pedidoId: { fontFamily: 'Poppins-Bold', fontSize: 15, color: '#222' },
    estadoBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
    estadoText: { fontFamily: 'Poppins-SemiBold', fontSize: 11, textTransform: 'capitalize' },

    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    infoText: { flex: 1, fontFamily: 'Poppins-Regular', fontSize: 13, color: '#555' },

    itemsList: { backgroundColor: '#F9F9F9', borderRadius: 10, padding: 10, marginVertical: 8 },
    itemText: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#555', marginBottom: 2 },

    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    total: { fontFamily: 'Poppins-Bold', fontSize: 15, color: '#222' },

    asignarBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#FF8700', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    },
    asignarBtnText: { fontFamily: 'Poppins-Bold', fontSize: 12, color: '#fff' },

    asignadoChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#F3E5F5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    },
    asignadoText: { fontFamily: 'Poppins-SemiBold', fontSize: 12, color: '#7B1FA2' },

    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontFamily: 'Poppins-SemiBold', fontSize: 16, color: '#bbb', marginTop: 16 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: 36,
    },
    modalHandle: {
        width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2,
        alignSelf: 'center', marginBottom: 16,
    },
    modalTitle: { fontFamily: 'Poppins-Bold', fontSize: 17, color: '#222', marginBottom: 20, textAlign: 'center' },

    noReps: { alignItems: 'center', paddingVertical: 30 },
    noRepsText: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#bbb', marginTop: 12 },

    repRow: {
        flexDirection: 'row', alignItems: 'center', padding: 14,
        borderRadius: 14, backgroundColor: '#F9F9F9', marginBottom: 10,
    },
    repRowDisabled: { opacity: 0.5 },
    repAvatar: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF8700',
        justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    repAvatarText: { fontFamily: 'Poppins-Bold', fontSize: 15, color: '#fff' },
    repInfo: { flex: 1 },
    repNombre: { fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#222' },
    repEmail: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#888', marginTop: 2 },

    cancelBtn: { marginTop: 8, alignItems: 'center', padding: 14 },
    cancelText: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#888' },

    pagoConfirmadoBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#E8F5E9', borderRadius: 20,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    pagoConfirmadoText: { fontFamily: 'Poppins-SemiBold', fontSize: 11, color: '#2E7D32' },

    payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
    metodoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    badgeEfectivo: { backgroundColor: '#E8F5E9' },
    badgeMP: { backgroundColor: '#E3F2FD' },
    metodoText: { fontFamily: 'Poppins-SemiBold', fontSize: 11 },
    cobradoInfo: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#888' },

    footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    estadoBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#455A64', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    },
    estadoBtnText: { fontFamily: 'Poppins-Bold', fontSize: 12, color: '#fff' },

    estadoActualLabel: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#666', marginBottom: 16, textAlign: 'center' },
    estadoOptionBtn: {
        borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20,
        alignItems: 'center', marginBottom: 10,
    },
    estadoOptionText: { fontFamily: 'Poppins-Bold', fontSize: 15, color: '#fff' },
});
