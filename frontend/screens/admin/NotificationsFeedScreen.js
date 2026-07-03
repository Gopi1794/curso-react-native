import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import AppHeader from '../../components/common/AppHeader';
import API from '../../services/api';
import { markNotificationsRead } from '../../hooks/useNotificationBadge';
import { navigationRef } from '../../navigation/navigationRef';
import { useAppSelector } from '../../store/hooks';

const ESTADO_CONFIG = {
    pendiente:   { icon: 'time-outline',        color: '#F59E0B', label: 'Nuevo pedido',        bg: '#FFFBEB' },
    en_proceso:  { icon: 'restaurant-outline',   color: '#3B82F6', label: 'En preparación',      bg: '#EFF6FF' },
    en_camino:   { icon: 'bicycle-outline',      color: '#8B5CF6', label: 'En camino',           bg: '#F5F3FF' },
    entregado:   { icon: 'checkmark-circle-outline', color: '#10B981', label: 'Entregado',       bg: '#ECFDF5' },
    cancelado:   { icon: 'close-circle-outline', color: '#EF4444', label: 'Cancelado',           bg: '#FEF2F2' },
};

const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1)  return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffH < 24)   return `Hace ${diffH}h`;
    if (diffD === 1)   return 'Ayer';
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

const buildMessage = (noti) => {
    const cliente = `${noti.cliente_nombre} ${noti.cliente_apellido}`;
    const rep = noti.repartidor_nombre
        ? `${noti.repartidor_nombre} ${noti.repartidor_apellido}`
        : null;

    switch (noti.estado) {
        case 'pendiente':   return `${cliente} realizó un nuevo pedido`;
        case 'en_proceso':  return `Pedido de ${cliente} en preparación`;
        case 'en_camino':   return rep ? `${rep} salió a entregar a ${cliente}` : `Pedido de ${cliente} en camino`;
        case 'entregado':   return rep ? `${rep} completó entrega a ${cliente}` : `Pedido de ${cliente} entregado`;
        case 'cancelado':   return `Pedido de ${cliente} fue cancelado`;
        default:            return `Pedido #${noti.id} actualizado`;
    }
};

export default function NotificationsFeedScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const userRol = useAppSelector(state => state.user.userInfo?.rol);
    const [notificaciones, setNotificaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const handleItemPress = (item) => {
        if (userRol === 'repartidor') {
            navigation.goBack();
        } else if (navigationRef.isReady()) {
            // admin y cliente — navegar al detalle del pedido en la tab de Pedidos
            navigationRef.navigate('OrdersTab', {
                screen: 'OrderDetail',
                params: { orderId: item.id },
            });
        }
    };

    const load = useCallback(async (isRefresh = false) => {
        try {
            const res = await API.notifications.getFeed();
            if (res.success) setNotificaciones(res.notificaciones);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    React.useEffect(() => { load(); markNotificationsRead(); }, [load]);
    const onRefresh = () => { setRefreshing(true); load(true); };

    const renderItem = ({ item }) => {
        const cfg = ESTADO_CONFIG[item.estado] ?? ESTADO_CONFIG.pendiente;
        return (
            <TouchableOpacity
                style={[styles.item, { backgroundColor: cfg.bg }]}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconWrap, { backgroundColor: cfg.color + '22' }]}>
                    <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                </View>
                <View style={styles.itemText}>
                    <Text style={styles.itemLabel}>{cfg.label}</Text>
                    <Text style={styles.itemMsg}>{buildMessage(item)}</Text>
                    <Text style={styles.itemTime}>{formatTime(item.fecha_actualizacion)}</Text>
                </View>
                <View style={styles.itemRight}>
                    <Text style={styles.itemAmount}>${parseFloat(item.total).toFixed(2)}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Notificaciones" onBack={() => navigation.goBack()} />

            <FlatList
                data={notificaciones}
                keyExtractor={i => String(i.id)}
                renderItem={renderItem}
                contentContainerStyle={[styles.list, { paddingTop: insets.top + 60, paddingBottom: FLOATING_TAB_BAR_HEIGHT }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8700" colors={['#FF8700']} progressViewOffset={insets.top + 60} />
                }
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={loading ? null : (
                    <View style={styles.empty}>
                        <Ionicons name="notifications-off-outline" size={52} color="#ddd" />
                        <Text style={styles.emptyText}>Sin notificaciones recientes</Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    list: { paddingHorizontal: 16 },

    item: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderRadius: 16, padding: 14,
    },
    iconWrap: {
        width: 46, height: 46, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        flexShrink: 0,
    },
    itemText: { flex: 1 },
    itemLabel: { fontFamily: 'Poppins-SemiBold', fontSize: 12, color: '#555', marginBottom: 2 },
    itemMsg:   { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#1a1a1a', lineHeight: 18 },
    itemTime:  { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#999', marginTop: 4 },
    itemRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
    itemAmount: { fontFamily: 'Poppins-Bold', fontSize: 14, color: '#1a1a1a' },

    separator: { height: 8 },

    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#bbb', marginTop: 16 },
});
