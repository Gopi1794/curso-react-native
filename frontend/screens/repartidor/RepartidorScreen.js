import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, StatusBar, Linking, Image, TextInput, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import { Dialog, Portal, Button, Paragraph } from 'react-native-paper';
import { showSuccessMessage, showErrorMessage } from '../../components/FlashMessageWrapper';
import { imageMap } from '../../assets/utils/imageMap';
import API from '../../services/api';
import { useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/userSlice';
import { useNotificationBadge } from '../../hooks/useNotificationBadge';

const ESTADO_LABEL = {
    preparando:     'Preparando',
    en_preparacion: 'Preparando',
    en_camino:      'En camino',
    pendiente:      'Pendiente',
};

const ESTADO_COLOR = {
    preparando:     '#FB8C00',
    en_preparacion: '#FB8C00',
    en_camino:      '#43A047',
    pendiente:      '#888',
};

export default function RepartidorScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const dispatch = useAppDispatch();
    const [pedidos, setPedidos] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [logoutVisible, setLogoutVisible] = useState(false);
    const [cobrarVisible, setCobrarVisible] = useState(false);
    const [cobrarPedido, setCobrarPedido] = useState(null);
    const [montoRecibido, setMontoRecibido] = useState('');
    const [cobrandoLoading, setCobrandoLoading] = useState(false);
    const [cobradoData, setCobradoData] = useState(null); // { vuelto, total, monto }
    const [confirmData, setConfirmData] = useState(null); // { pedido, nuevoEstado }
    const [entregadoId, setEntregadoId] = useState(null);
    const [sortVisible, setSortVisible] = useState(false);
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterEstado, setFilterEstado] = useState('todos');
    const [resumen, setResumen] = useState({ pedidos_entregados: 0, ganancia: '0.00', efectivo_cobrado: '0.00' });
    const { unreadCount: unreadNotifications } = useNotificationBadge();

    const loadResumen = useCallback(async () => {
        try {
            const res = await API.repartidor.getResumenDia();
            if (res.success) setResumen(res);
        } catch {}
    }, []);

    const load = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const [pedidosRes] = await Promise.all([
                API.repartidor.getMisPedidos(),
                loadResumen(),
            ]);
            if (pedidosRes.success) setPedidos(pedidosRes.pedidos);
        } catch {
            showErrorMessage('Error', 'No se pudieron cargar los pedidos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [loadResumen]);

    useEffect(() => { load(); }, [load]);
    const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, [load]);

    const confirmLogout = async () => {
        setLogoutVisible(false);
        await API.token.remove();
        dispatch(logout());
    };

    const handleUpdateEstado = (pedido, nuevoEstado) => {
        setConfirmData({ pedido, nuevoEstado });
    };

    const doUpdateEstado = async () => {
        const { pedido, nuevoEstado } = confirmData;
        setConfirmData(null);
        setUpdating(pedido.id);
        try {
            const res = await API.repartidor.updateEstado(pedido.id, nuevoEstado);
            if (res.success) {
                if (nuevoEstado === 'entregado') {
                    setPedidos(prev => prev.filter(p => p.id !== pedido.id));
                    setEntregadoId(pedido.id);
                    loadResumen();
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
    };

    const openCobrar = (pedido) => {
        setCobrarPedido(pedido);
        setMontoRecibido('');
        setCobrarVisible(true);
    };

    const handleCobrar = async () => {
        const monto = parseFloat(montoRecibido);
        if (isNaN(monto) || monto <= 0) {
            showErrorMessage('Monto inválido', 'Ingresá el monto recibido');
            return;
        }
        if (monto < parseFloat(cobrarPedido.total)) {
            showErrorMessage('Monto insuficiente', `El total es $${parseFloat(cobrarPedido.total).toFixed(2)}`);
            return;
        }
        setCobrandoLoading(true);
        try {
            const res = await API.repartidor.cobrarEfectivo(cobrarPedido.id, monto);
            if (res.success) {
                const vuelto = parseFloat(res.vuelto);
                const total = parseFloat(cobrarPedido.total);
                const monto = parseFloat(montoRecibido);
                setCobrarVisible(false);
                setPedidos(prev => prev.filter(p => p.id !== cobrarPedido.id));
                setCobradoData({ vuelto, total, monto });
                loadResumen();
            } else {
                showErrorMessage('Error', res.message);
            }
        } catch {
            showErrorMessage('Error', 'No se pudo registrar el cobro');
        } finally {
            setCobrandoLoading(false);
        }
    };

    const sortedPedidos = [...pedidos]
        .filter(p => {
            if (filterEstado === 'todos') return true;
            if (filterEstado === 'en_camino') return p.estado === 'en_camino';
            if (filterEstado === 'preparando') return p.estado === 'preparando' || p.estado === 'en_preparacion';
            return true;
        })
        .sort((a, b) => {
            const da = new Date(a.fecha_creacion);
            const db = new Date(b.fecha_creacion);
            return sortOrder === 'desc' ? db - da : da - db;
        });

    const renderPedido = ({ item }) => {
        const isUpdating = updating === item.id;
        const validItems = (item.items || []).filter(i => i.nombre);
        const firstImage = validItems.find(i => i.imagen_key)?.imagen_key;
        const imgSrc = firstImage && imageMap[firstImage] ? imageMap[firstImage] : null;
        const estadoColor = ESTADO_COLOR[item.estado] ?? '#888';
        const estadoLabel = ESTADO_LABEL[item.estado] ?? item.estado;

        return (
            <View style={styles.section}>
                {/* Status row fuera de la card */}
                <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Pedido activo</Text>
                    <View style={styles.estadoBadge}>
                        <View style={[styles.estadoDot, { backgroundColor: estadoColor }]} />
                        <Text style={[styles.estadoText, { color: estadoColor }]}>{estadoLabel}</Text>
                    </View>
                </View>

                {/* Card */}
                <View style={styles.card}>
                    {/* Header de la card */}
                    <TouchableOpacity
                        style={styles.cardHeader}
                        onPress={() => navigation.navigate('Mapa', { pedidoId: item.id })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardIconWrap}>
                            <Ionicons name="clipboard-outline" size={22} color="#FF8700" />
                        </View>
                        <View style={styles.cardHeaderInfo}>
                            <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
                            <View style={styles.infoRow}>
                                <Ionicons name="person-outline" size={13} color="#aaa" />
                                <Text style={styles.infoText}>
                                    {item.cliente_nombre} {item.cliente_apellido}
                                    {item.cliente_telefono ? ` · ${item.cliente_telefono}` : ''}
                                </Text>
                            </View>
                            {item.direccion_entrega && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="location-outline" size={13} color="#FF8700" />
                                    <Text style={styles.infoText}>{item.direccion_entrega}</Text>
                                </View>
                            )}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#ccc" />
                    </TouchableOpacity>

                    {/* Productos */}
                    <View style={styles.productosBox}>
                        <View style={styles.productosContent}>
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

                    {/* Total */}
                    <View style={styles.totalRow}>
                        <View>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalAmount}>${parseFloat(item.total).toFixed(2)}</Text>
                        </View>
                        {item.metodo_pago === 'efectivo' ? (
                            <View style={[styles.pagadoBadge, { backgroundColor: '#FFF8E1', }]}>
                                <Ionicons name="cash-outline" size={14} color="#F57F17" />
                                <Text style={[styles.pagadoText, { color: '#F57F17' }]}>Efectivo</Text>
                            </View>
                        ) : (
                            <View style={styles.pagadoBadge}>
                                <Ionicons name="card-outline" size={14} color="#2E7D32" />
                                <Text style={styles.pagadoText}>Pagado</Text>
                            </View>
                        )}
                    </View>

                    {/* Contacto */}
                    <View style={styles.contactRow}>
                        {item.cliente_telefono && (
                            <TouchableOpacity
                                style={[styles.contactBtn, { backgroundColor: '#E8F5E9' }]}
                                onPress={() => Linking.openURL(`tel:${item.cliente_telefono}`)}
                            >
                                <Ionicons name="call-outline" size={16} color="#43A047" />
                                <Text style={[styles.contactText, { color: '#43A047' }]}>Llamar{'\n'}cliente</Text>
                            </TouchableOpacity>
                        )}
                        {item.cliente_telefono && (
                            <TouchableOpacity
                                style={[styles.contactBtn, { backgroundColor: '#E8F5E9' }]}
                                onPress={() => Linking.openURL(`whatsapp://send?phone=${item.cliente_telefono}`)}
                            >
                                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                                <Text style={[styles.contactText, { color: '#25D366' }]}>WhatsApp{'\n'}cliente</Text>
                            </TouchableOpacity>
                        )}
                        {item.admin_telefono && (
                            <TouchableOpacity
                                style={[styles.contactBtn, { backgroundColor: '#E3F2FD' }]}
                                onPress={() => Linking.openURL(`whatsapp://send?phone=${item.admin_telefono}`)}
                            >
                                <Ionicons name="shield-checkmark-outline" size={16} color="#1976D2" />
                                <Text style={[styles.contactText, { color: '#1976D2' }]}>Chat con{'\n'}admin</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Botón de acción */}
                    {(item.estado === 'preparando' || item.estado === 'en_preparacion') && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#1976D2' }, isUpdating && styles.btnDisabled]}
                            onPress={() => handleUpdateEstado(item, 'en_camino')}
                            disabled={isUpdating}
                        >
                            <Ionicons name="bicycle-outline" size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>Salir a entregar</Text>
                        </TouchableOpacity>
                    )}
                    {item.estado === 'en_camino' && item.metodo_pago === 'efectivo' && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#2E7D32' }, isUpdating && styles.btnDisabled]}
                            onPress={() => openCobrar(item)}
                            disabled={isUpdating}
                        >
                            <Ionicons name="cash-outline" size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>Cobrar efectivo</Text>
                        </TouchableOpacity>
                    )}
                    {item.estado === 'en_camino' && item.metodo_pago !== 'efectivo' && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#43A047' }, isUpdating && styles.btnDisabled]}
                            onPress={() => handleUpdateEstado(item, 'entregado')}
                            disabled={isUpdating}
                        >
                            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>Marcar como entregado</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header naranja */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View>
                    <Text style={styles.headerTitle}>Mis repartos</Text>
                    <Text style={styles.headerSub}>
                        {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} activo{pedidos.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.getParent()?.navigate('NotificationsFeed')}>
                        <Ionicons name="notifications-outline" size={22} color="#FF8700" />
                        {unreadNotifications > 0 && (
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>
                                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => setSortVisible(true)}>
                        <Ionicons name="options-outline" size={22} color="#FF8700" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={sortedPedidos}
                keyExtractor={i => String(i.id)}
                renderItem={renderPedido}
                contentContainerStyle={[styles.list, { paddingBottom: FLOATING_TAB_BAR_HEIGHT }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" colors={['#FF8700']} progressViewOffset={insets.top + 70} />
                }
                ListHeaderComponent={(
                    <View style={styles.resumenCard}>
                        <View style={styles.resumenHeader}>
                            <Ionicons name="stats-chart" size={16} color="#FF8700" />
                            <Text style={styles.resumenTitle}>Resumen de hoy</Text>
                        </View>
                        <View style={styles.resumenStats}>
                            <View style={styles.resumenStat}>
                                <Text style={styles.resumenStatValue}>{resumen.pedidos_entregados}</Text>
                                <Text style={styles.resumenStatLabel}>Entregas</Text>
                            </View>
                            <View style={styles.resumenDivider} />
                            <View style={styles.resumenStat}>
                                <Text style={styles.resumenStatValue}>${resumen.ganancia}</Text>
                                <Text style={styles.resumenStatLabel}>Ganancia</Text>
                            </View>
                            <View style={styles.resumenDivider} />
                            <View style={styles.resumenStat}>
                                <Text style={styles.resumenStatValue}>${resumen.efectivo_cobrado}</Text>
                                <Text style={styles.resumenStatLabel}>Efectivo</Text>
                            </View>
                        </View>
                    </View>
                )}
                ListFooterComponent={pedidos.length > 0 ? (
                    <View style={styles.tipCard}>
                        <Ionicons name="information-circle-outline" size={22} color="#1976D2" />
                        <View style={styles.tipContent}>
                            <Text style={styles.tipTitle}>Consejo</Text>
                            <Text style={styles.tipSub}>Confirmá la entrega para mantener a tus clientes satisfechos.</Text>
                        </View>
                        <Image
                            source={require('../../assets/img/paquete-de-alimentos-listo-illustration-svg-download-png-14822599.webp')}
                            style={styles.tipImg}
                            resizeMode="contain"
                        />
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
                <Dialog visible={sortVisible} onDismiss={() => setSortVisible(false)} style={styles.dialog}>
                    <Dialog.Title style={styles.dialogTitle}>Filtrar y ordenar</Dialog.Title>
                    <Dialog.Content>
                        <Text style={styles.sortSection}>Estado</Text>
                        {[
                            { key: 'todos', label: 'Todos' },
                            { key: 'en_camino', label: 'En camino' },
                            { key: 'preparando', label: 'Preparando' },
                        ].map(opt => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[styles.sortOption, filterEstado === opt.key && styles.sortOptionActive]}
                                onPress={() => setFilterEstado(opt.key)}
                            >
                                <Text style={[styles.sortOptionText, filterEstado === opt.key && { color: '#FF8700' }]}>{opt.label}</Text>
                                {filterEstado === opt.key && <Ionicons name="checkmark" size={18} color="#FF8700" />}
                            </TouchableOpacity>
                        ))}

                        <Text style={[styles.sortSection, { marginTop: 12 }]}>Orden</Text>
                        {[
                            { key: 'desc', label: 'Más reciente primero', icon: 'arrow-down-outline' },
                            { key: 'asc', label: 'Más antiguo primero', icon: 'arrow-up-outline' },
                        ].map(opt => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[styles.sortOption, sortOrder === opt.key && styles.sortOptionActive]}
                                onPress={() => setSortOrder(opt.key)}
                            >
                                <Ionicons name={opt.icon} size={16} color={sortOrder === opt.key ? '#FF8700' : '#888'} />
                                <Text style={[styles.sortOptionText, sortOrder === opt.key && { color: '#FF8700' }]}>{opt.label}</Text>
                                {sortOrder === opt.key && <Ionicons name="checkmark" size={18} color="#FF8700" />}
                            </TouchableOpacity>
                        ))}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setSortVisible(false)} textColor="#FF8700">Listo</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <Portal>
                <Dialog visible={cobrarVisible} onDismiss={() => setCobrarVisible(false)} style={styles.dialog}>
                    <Dialog.Title style={styles.dialogTitle}>Cobrar en efectivo</Dialog.Title>
                    <Dialog.Content>
                        <Text style={styles.cobrarTotal}>
                            Total del pedido: <Text style={{ color: '#FF8700' }}>${parseFloat(cobrarPedido?.total || 0).toFixed(2)}</Text>
                        </Text>
                        <Text style={styles.cobrarLabel}>¿Cuánto te dio el cliente?</Text>
                        <TextInput
                            style={styles.cobrarInput}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            value={montoRecibido}
                            onChangeText={setMontoRecibido}
                            selectTextOnFocus
                        />
                        {montoRecibido && !isNaN(parseFloat(montoRecibido)) && parseFloat(montoRecibido) >= parseFloat(cobrarPedido?.total || 0) && (
                            <View style={styles.vueltoBox}>
                                <Ionicons name="arrow-undo-outline" size={16} color="#1976D2" />
                                <Text style={styles.vueltoText}>
                                    Vuelto: <Text style={{ fontFamily: 'Poppins-Bold' }}>${(parseFloat(montoRecibido) - parseFloat(cobrarPedido?.total || 0)).toFixed(2)}</Text>
                                </Text>
                            </View>
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setCobrarVisible(false)} textColor="#888">Cancelar</Button>
                        <Button onPress={handleCobrar} textColor="#2E7D32" loading={cobrandoLoading} disabled={cobrandoLoading}>
                            Confirmar cobro
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* ── Modal ¡Cobrado! ── */}
            <Modal
                visible={!!cobradoData}
                transparent
                animationType="fade"
                onRequestClose={() => setCobradoData(null)}
            >
                <View style={styles.cobradoOverlay}>
                    <View style={styles.cobradoSheet}>
                        {/* Icono de éxito */}
                        <View style={styles.cobradoIconWrap}>
                            <Ionicons name="checkmark-circle" size={72} color="#43A047" />
                        </View>

                        <Text style={styles.cobradoTitle}>¡Cobrado!</Text>
                        <Text style={styles.cobradoSub}>Pedido entregado exitosamente</Text>

                        {/* Detalle de montos */}
                        <View style={styles.cobradoBox}>
                            <View style={styles.cobradoRow}>
                                <Text style={styles.cobradoRowLabel}>Total del pedido</Text>
                                <Text style={styles.cobradoRowValue}>${cobradoData?.total.toFixed(2)}</Text>
                            </View>
                            <View style={styles.cobradoRow}>
                                <Text style={styles.cobradoRowLabel}>Recibido</Text>
                                <Text style={styles.cobradoRowValue}>${cobradoData?.monto.toFixed(2)}</Text>
                            </View>
                            <View style={styles.cobradoDivider} />
                            <View style={styles.cobradoRow}>
                                <Text style={styles.cobradoVueltoLabel}>Vuelto a dar</Text>
                                <Text style={[
                                    styles.cobradoVueltoValue,
                                    { color: cobradoData?.vuelto > 0 ? '#1976D2' : '#43A047' }
                                ]}>
                                    ${cobradoData?.vuelto.toFixed(2)}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.cobradoBtn}
                            onPress={() => setCobradoData(null)}
                        >
                            <Text style={styles.cobradoBtnText}>Listo</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Modal confirmación (salir / entregar) ── */}
            <Modal
                visible={!!confirmData}
                transparent
                animationType="fade"
                onRequestClose={() => setConfirmData(null)}
            >
                <View style={styles.cobradoOverlay}>
                    <View style={styles.cobradoSheet}>
                        <View style={[styles.cobradoIconWrap, { backgroundColor: confirmData?.nuevoEstado === 'en_camino' ? '#E3F2FD' : '#E8F5E9' }]}>
                            <Ionicons
                                name={confirmData?.nuevoEstado === 'en_camino' ? 'bicycle-outline' : 'checkmark-circle-outline'}
                                size={64}
                                color={confirmData?.nuevoEstado === 'en_camino' ? '#1976D2' : '#43A047'}
                            />
                        </View>
                        <Text style={styles.cobradoTitle}>
                            {confirmData?.nuevoEstado === 'en_camino' ? '¿Salís a entregar?' : '¿Pedido entregado?'}
                        </Text>
                        <Text style={[styles.cobradoSub, { marginBottom: 28 }]}>
                            {confirmData?.nuevoEstado === 'en_camino'
                                ? `Pedido #${confirmData?.pedido?.id} se marcará como en camino`
                                : `Pedido #${confirmData?.pedido?.id} se marcará como entregado`}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity
                                style={[styles.cobradoBtn, { flex: 1, backgroundColor: '#F0F0F0' }]}
                                onPress={() => setConfirmData(null)}
                            >
                                <Text style={[styles.cobradoBtnText, { color: '#555' }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.cobradoBtn, { flex: 1, backgroundColor: confirmData?.nuevoEstado === 'en_camino' ? '#1976D2' : '#43A047' }]}
                                onPress={doUpdateEstado}
                            >
                                <Text style={styles.cobradoBtnText}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Modal ¡Entregado! ── */}
            <Modal
                visible={!!entregadoId}
                transparent
                animationType="fade"
                onRequestClose={() => setEntregadoId(null)}
            >
                <View style={styles.cobradoOverlay}>
                    <View style={styles.cobradoSheet}>
                        <View style={styles.cobradoIconWrap}>
                            <Ionicons name="checkmark-circle" size={72} color="#43A047" />
                        </View>
                        <Text style={styles.cobradoTitle}>¡Entregado!</Text>
                        <Text style={[styles.cobradoSub, { marginBottom: 28 }]}>
                            Pedido #{entregadoId} completado exitosamente
                        </Text>
                        <TouchableOpacity
                            style={styles.cobradoBtn}
                            onPress={() => setEntregadoId(null)}
                        >
                            <Text style={styles.cobradoBtnText}>Listo</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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

    // ── Header ──────────────────────────────────────────────
    header: {
        backgroundColor: '#FF8700',
        paddingHorizontal: 20,
        paddingBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottomLeftRadius: 25, borderBottomRightRadius: 25,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
    },
    headerTitle: { fontFamily: 'Poppins-Bold', fontSize: 28, color: '#fff' },
    headerSub: { fontFamily: 'Poppins-Regular', fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    headerBtn: {
        width: 46, height: 46, borderRadius: 14,
        backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        position: 'relative',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 5, elevation: 3,
    },
    notifBadge: {
        position: 'absolute', top: 6, right: 6,
        backgroundColor: '#D80000',
        minWidth: 16, height: 16, borderRadius: 8,
        justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 3,
    },
    notifBadgeText: {
        color: '#fff', fontSize: 9, fontWeight: 'bold',
    },

    list: { padding: 16, paddingBottom: 32 },

    // ── Resumen del día ─────────────────────────────────────
    resumenCard: {
        backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
    },
    resumenHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    resumenTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#FF8700' },
    resumenStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    resumenStat: { alignItems: 'center', flex: 1 },
    resumenStatValue: { fontFamily: 'Poppins-Bold', fontSize: 22, color: '#1A1A1A' },
    resumenStatLabel: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#999', marginTop: 2 },
    resumenDivider: { width: 1, height: 36, backgroundColor: '#F0F0F0' },

    // ── Sección + card ───────────────────────────────────────
    section: { marginBottom: 16 },
    sectionRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, paddingHorizontal: 2,
    },
    sectionTitle: { fontFamily: 'Poppins-Bold', fontSize: 15, color: '#1A1A1A' },
    estadoBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    },
    estadoDot: { width: 8, height: 8, borderRadius: 4 },
    estadoText: { fontFamily: 'Poppins-SemiBold', fontSize: 12 },

    card: {
        backgroundColor: '#fff', borderRadius: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
        overflow: 'hidden',
    },

    // ── Card header ─────────────────────────────────────────
    cardHeader: {
        flexDirection: 'row', alignItems: 'flex-start',
        gap: 12, padding: 16, paddingBottom: 14,
    },
    cardIconWrap: {
        width: 48, height: 48, borderRadius: 16,
        backgroundColor: '#FFF5EB', justifyContent: 'center', alignItems: 'center',
    },
    cardHeaderInfo: { flex: 1 },
    pedidoId: { fontFamily: 'Poppins-Bold', fontSize: 16, color: '#1A1A1A', marginBottom: 4 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
    infoText: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#666', flex: 1 },

    // ── Productos ────────────────────────────────────────────
    productosBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF5EB', padding: 16, gap: 12,
    },
    productosContent: { flex: 1 },
    productosCount: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#FF8700', marginBottom: 6 },
    productoItem: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#555', marginBottom: 2 },
    productoImg: {
        width: 70, height: 70, borderRadius: 35,
        borderWidth: 3, borderColor: '#43A047',
    },

    divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 16 },

    // ── Total ────────────────────────────────────────────────
    totalRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, paddingBottom: 12,
    },
    totalLabel: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#999', marginBottom: 2 },
    totalAmount: { fontFamily: 'Poppins-Bold', fontSize: 24, color: '#1A1A1A' },
    pagadoBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    },
    pagadoText: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#2E7D32' },

    // ── Contacto ─────────────────────────────────────────────
    contactRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
    contactBtn: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        gap: 5, borderRadius: 14, paddingVertical: 10,
    },
    contactText: { fontFamily: 'Poppins-SemiBold', fontSize: 11, textAlign: 'center', lineHeight: 15 },

    // ── Acción ───────────────────────────────────────────────
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, marginHorizontal: 16, marginBottom: 16,
        borderRadius: 16, paddingVertical: 16,
    },
    btnDisabled: { opacity: 0.5 },
    actionBtnText: { fontFamily: 'Poppins-Bold', fontSize: 16, color: '#fff' },

    // ── Tip ─────────────────────────────────────────────────
    tipCard: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#EFF6FF', borderRadius: 18, padding: 16, marginTop: 4,
    },
    tipContent: { flex: 1 },
    tipTitle: { fontFamily: 'Poppins-Bold', fontSize: 14, color: '#1A1A1A' },
    tipSub: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#555', marginTop: 3 },
    tipImg: { width: 60, height: 60 },

    // ── Empty ────────────────────────────────────────────────
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
    emptyTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 18, color: '#bbb', marginTop: 16 },
    emptySub: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#ccc', textAlign: 'center', marginTop: 8 },

    // ── Dialog ───────────────────────────────────────────────
    dialog: { borderRadius: 20, backgroundColor: '#fff' },
    dialogTitle: { textAlign: 'center', fontFamily: 'Poppins-Bold', fontSize: 18 },
    dialogMessage: { textAlign: 'center', fontFamily: 'Poppins-Regular', color: '#666' },
    cobrarTotal: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#555', marginBottom: 12 },
    cobrarLabel: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#333', marginBottom: 8 },
    cobrarInput: {
        borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
        padding: 14, fontFamily: 'Poppins-Regular', fontSize: 18,
        color: '#1A1A1A', textAlign: 'center', backgroundColor: '#F9F9F9',
    },
    vueltoBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#E3F2FD', borderRadius: 10, padding: 12, marginTop: 12,
    },
    vueltoText: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#1976D2' },

    sortSection: { fontFamily: 'Poppins-SemiBold', fontSize: 12, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    sortOption: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        padding: 12, borderRadius: 12, marginBottom: 4, backgroundColor: '#F9F9F9',
    },
    sortOptionActive: { backgroundColor: '#FFF5EB' },
    sortOptionText: { flex: 1, fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#555' },

    /* ── Modal ¡Cobrado! ── */
    cobradoOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    cobradoSheet: {
        backgroundColor: '#fff', borderRadius: 28,
        padding: 28, width: '100%', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
    },
    cobradoIconWrap: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#E8F5E9',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    cobradoTitle: {
        fontSize: 28, fontFamily: 'Poppins-Bold',
        color: '#1a1a1a', marginBottom: 4,
    },
    cobradoSub: {
        fontSize: 14, fontFamily: 'Poppins-Regular',
        color: '#888', marginBottom: 24,
    },
    cobradoBox: {
        width: '100%', backgroundColor: '#F9F9F9',
        borderRadius: 16, padding: 18, marginBottom: 24,
    },
    cobradoRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 10,
    },
    cobradoRowLabel: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#666' },
    cobradoRowValue: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#333' },
    cobradoDivider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 8 },
    cobradoVueltoLabel: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#1a1a1a' },
    cobradoVueltoValue: { fontSize: 24, fontFamily: 'Poppins-Bold' },
    cobradoBtn: {
        width: '100%', backgroundColor: '#43A047',
        paddingVertical: 16, borderRadius: 16,
        alignItems: 'center',
    },
    cobradoBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins-Bold' },
});
