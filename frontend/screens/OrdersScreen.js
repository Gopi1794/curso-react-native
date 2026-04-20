import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Dialog, Portal, Button, Paragraph } from 'react-native-paper';

import AppHeader from '../components/common/AppHeader';
import API from '../services/api';

// Config de estados
const STATUS_CONFIG = {
  pendiente: {
    label: 'Pendiente',
    icon: 'time-outline',
    color: '#FF9500',
    bgColor: '#FFF8F0',
  },
  preparando: {
    label: 'Preparando',
    icon: 'restaurant-outline',
    color: '#007AFF',
    bgColor: '#F0F6FF',
  },
  en_camino: {
    label: 'En Camino',
    icon: 'bicycle-outline',
    color: '#5856D6',
    bgColor: '#F5F0FF',
  },
  entregado: {
    label: 'Entregado',
    icon: 'checkmark-circle',
    color: '#34C759',
    bgColor: '#F0FFF4',
  },
  cancelado: {
    label: 'Cancelado',
    icon: 'close-circle',
    color: '#FF3B30',
    bgColor: '#FFF0F0',
  },
};

const getStatusConfig = (estado) =>
  STATUS_CONFIG[estado] || STATUS_CONFIG.pendiente;

// Fecha relativa
const timeAgo = (isoDate) => {
  if (!isoDate) return '';
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHr < 24) return `Hace ${diffHr}h`;
  if (diffDay === 1) return 'Ayer';
  if (diffDay < 7) return `Hace ${diffDay} días`;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Formatear precio
const formatPrice = (total) => {
  const num = parseFloat(total);
  if (isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
};

// Componente de orden memoizado
const OrderItem = memo(({ order, onPress, onCancel, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const entryAnim = useRef(new Animated.Value(0)).current;
  const status = getStatusConfig(order.estado);

  useEffect(() => {
    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 350,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const translateY = entryAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <Animated.View style={{
      opacity: entryAnim,
      transform: [{ scale: scaleAnim }, { translateY }],
    }}>
      <TouchableOpacity
        onPress={() => onPress(order)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.orderTouchable}
      >
        <View style={styles.orderCard}>
          {/* Barra lateral de color */}
          <View style={[styles.colorStripe, { backgroundColor: status.color }]} />

          <View style={styles.orderContent}>
            {/* Header: # pedido + badge estado */}
            <View style={styles.orderHeader}>
              <View style={styles.orderIdRow}>
                <Text style={styles.orderId}>Pedido #{order.id}</Text>
                <Text style={styles.orderTime}>{timeAgo(order.fecha_creacion)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                <Ionicons name={status.icon} size={13} color={status.color} />
                <Text style={[styles.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            {/* Info */}
            <View style={styles.orderInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="storefront-outline" size={14} color="#888" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {order.restaurante_nombre || 'Restaurante'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="cube-outline" size={14} color="#888" />
                <Text style={styles.infoText}>
                  {order.cantidad_items} {order.cantidad_items === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </View>

            {/* Footer: total + cancelar */}
            <View style={styles.orderFooter}>
              <Text style={styles.totalText}>{formatPrice(order.total)}</Text>

              {order.estado === 'pendiente' && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => onCancel(order)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-outline" size={16} color="#FF3B30" />
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              )}

              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Skeleton
const OrderSkeleton = memo(() => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonStripe} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonBadge} />
        </View>
        <View style={styles.skeletonInfo} />
        <View style={styles.skeletonFooter} />
      </View>
    </Animated.View>
  );
});

// Empty state
const EmptyState = ({ onExplore }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconWrapper}>
      <Ionicons name="receipt-outline" size={52} color="#ff8700" />
    </View>
    <Text style={styles.emptyTitle}>Sin pedidos aún</Text>
    <Text style={styles.emptySubtitle}>
      Tus pedidos aparecerán aquí cuando realices tu primera compra
    </Text>
    <TouchableOpacity style={styles.exploreButton} onPress={onExplore}>
      <Text style={styles.exploreButtonText}>Explorar menú</Text>
    </TouchableOpacity>
  </View>
);

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Dialog para cancelar
  const [dialogVisible, setDialogVisible] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      const response = await API.orders.getAll();
      if (response.success) {
        setOrders(response.orders || []);
      } else {
        setError('No se pudieron cargar los pedidos');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  // Recargar al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, [fetchOrders]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOrderPress = useCallback((order) => {
    navigation.navigate('OrderDetail', { orderId: order.id });
  }, [navigation]);

  const handleExplore = useCallback(() => {
    navigation.navigate('HomeTab');
  }, [navigation]);

  // Cancel flow
  const showCancelDialog = useCallback((order) => {
    setCancelTarget(order);
    setDialogVisible(true);
  }, []);

  const dismissCancelDialog = useCallback(() => {
    setDialogVisible(false);
    setCancelTarget(null);
  }, []);

  const confirmCancel = useCallback(async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const response = await API.orders.cancel(cancelTarget.id);
      if (response.success) {
        // Actualizar el estado del pedido localmente
        setOrders(prev =>
          prev.map(o =>
            o.id === cancelTarget.id ? { ...o, estado: 'cancelado' } : o
          )
        );
      }
    } catch (err) {
      // Silently handle - user will see the order didn't change
    } finally {
      setCancelling(false);
      setDialogVisible(false);
      setCancelTarget(null);
    }
  }, [cancelTarget]);

  const renderOrder = useCallback(({ item, index }) => (
    <OrderItem
      order={item}
      index={index}
      onPress={handleOrderPress}
      onCancel={showCancelDialog}
    />
  ), [handleOrderPress, showCancelDialog]);

  const keyExtractor = useCallback((item) => String(item.id), []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.background} />

      <AppHeader
        title="Mis Pedidos"
        onBack={handleGoBack}
        showCart={false}
        rightContent={
          orders.length > 0 && !loading ? (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{orders.length}</Text>
            </View>
          ) : null
        }
      />

      {loading ? (
        <View style={styles.listContent}>
          <OrderSkeleton />
          <OrderSkeleton />
          <OrderSkeleton />
          <OrderSkeleton />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#999" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchOrders()}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState onExplore={handleExplore} />}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#ff8700']}
              tintColor="#ff8700"
              progressViewOffset={(StatusBar.currentHeight || 40) + 60}
            />
          }
        />
      )}

      {/* Dialog cancelar pedido */}
      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={dismissCancelDialog}
          style={styles.dialog}
        >
          <Dialog.Icon icon="alert-circle-outline" size={36} color="#FF3B30" />
          <Dialog.Title style={styles.dialogTitle}>Cancelar pedido</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogMessage}>
              ¿Estás seguro que querés cancelar el pedido #{cancelTarget?.id}?
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={dismissCancelDialog} textColor="#888" disabled={cancelling}>
              No, mantener
            </Button>
            <Button onPress={confirmCancel} textColor="#FF3B30" loading={cancelling}>
              Sí, cancelar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingTop: (StatusBar.currentHeight || 40) + 70,
    paddingHorizontal: 16,
    paddingBottom: 120,
  },

  // Order card
  orderTouchable: {
    marginBottom: 12,
  },
  orderCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  colorStripe: {
    width: 4,
  },
  orderContent: {
    flex: 1,
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderIdRow: {
    flex: 1,
    marginRight: 10,
  },
  orderId: {
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
    color: '#222',
  },
  orderTime: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
  },

  // Info
  orderInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#888',
  },

  // Footer
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    paddingTop: 12,
  },
  totalText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 17,
    color: '#ff8700',
    flex: 1,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFD0D0',
    marginRight: 8,
  },
  cancelButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    color: '#FF3B30',
  },
  arrowContainer: {
    width: 24,
    alignItems: 'center',
  },

  // Header badge
  countBadge: {
    backgroundColor: '#ff8700',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 11,
    color: '#fff',
  },

  // Skeleton
  skeletonCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    height: 130,
  },
  skeletonStripe: {
    width: 4,
    backgroundColor: '#e0e0e0',
  },
  skeletonContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonTitle: {
    width: 100,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e8e8e8',
  },
  skeletonBadge: {
    width: 80,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e8e8e8',
  },
  skeletonInfo: {
    width: '60%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e8e8e8',
  },
  skeletonFooter: {
    width: 70,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e8e8e8',
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fff8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#ff8700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#222',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  exploreButton: {
    backgroundColor: '#ff8700',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#ff8700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreButtonText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: '#fff',
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingTop: (StatusBar.currentHeight || 40) + 70,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ff8700',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    fontSize: 14,
  },

  // Dialog
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 24,
  },
  dialogTitle: {
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#222',
  },
  dialogMessage: {
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  dialogActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
});
