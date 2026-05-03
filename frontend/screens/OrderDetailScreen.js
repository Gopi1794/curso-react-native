import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import API from '../services/api';
import ReviewBottomSheet from '../components/ReviewBottomSheet';

const ORANGE = '#ff8700';

const STEP_KEYS   = ['pendiente', 'preparando', 'en_camino', 'entregado'];
const STEP_LABELS = ['Aceptado', 'Preparando', 'Recogido', 'Entregado'];
const STEP_ICONS  = [
  'cube-outline',
  'restaurant-outline',
  'bicycle-outline',
  'bag-check-outline',
];

const STATUS_INFO = {
  pendiente:  { title: 'Pedido recibido',      subtitle: 'Esperando al restaurante' },
  preparando: { title: 'Preparando tu pedido', subtitle: 'El chef ya está cocinando' },
  en_camino:  { title: 'En camino',            subtitle: 'Tu pedido está llegando' },
  entregado:  { title: '¡Pedido entregado!',   subtitle: '¡Buen provecho!' },
  cancelado:  { title: 'Pedido cancelado',     subtitle: 'Este pedido fue cancelado' },
};

const TIP_OPTIONS = ['$2.00', '$5.00', '$10.00', '$15.00'];

// ── Spinner animado para paso activo ──────────────────────
function SpinnerIcon() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true })
    ).start();
  }, []);
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name="sync-outline" size={18} color="#fff" />
    </Animated.View>
  );
}

// ── Stepper horizontal ────────────────────────────────────
function Stepper({ estado }) {
  const cancelled   = estado === 'cancelado';
  const activeIndex = cancelled ? -1 : STEP_KEYS.indexOf(estado);
  const NODE = 40;

  return (
    <View style={{ paddingVertical: 4 }}>
      {/* Nodos + líneas */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {STEP_LABELS.map((_, i) => {
          const done   = !cancelled && i < activeIndex;
          const active = !cancelled && i === activeIndex;
          const bg     = done || active ? ORANGE : '#e8e8e8';
          return (
            <React.Fragment key={i}>
              <View style={{
                width: NODE, height: NODE, borderRadius: NODE / 2,
                backgroundColor: bg,
                justifyContent: 'center', alignItems: 'center',
              }}>
                {done   && <Ionicons name="checkmark"      size={20} color="#fff" />}
                {active && <SpinnerIcon />}
                {!done && !active && <Ionicons name={STEP_ICONS[i]} size={18} color="#bbb" />}
              </View>

              {i < STEP_LABELS.length - 1 && (
                <View style={{
                  flex: 1, height: 3,
                  backgroundColor: !cancelled && i < activeIndex ? ORANGE : '#e8e8e8',
                }} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Etiquetas alineadas bajo los nodos */}
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {STEP_LABELS.map((label, i) => (
          <React.Fragment key={i}>
            <Text style={{
              width: NODE, textAlign: 'center', fontSize: 10,
              fontFamily: 'Poppins-Regular',
              color: !cancelled && i <= activeIndex ? '#333' : '#bbb',
            }}>
              {label}
            </Text>
            {i < STEP_LABELS.length - 1 && <View style={{ flex: 1 }} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

// ── Avatar con iniciales ──────────────────────────────────
function AvatarInitials({ name }) {
  const initials = name
    .split(' ').slice(0, 2)
    .map(w => w[0]).join('').toUpperCase();
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

// ── Card del repartidor ───────────────────────────────────
function DeliveryCard({ estado, onViewMap }) {
  const showActions = ['preparando', 'en_camino'].includes(estado);
  const showMapBtn  = ['preparando', 'en_camino'].includes(estado);
  const repartidor  = { nombre: 'Carlos Méndez', rating: '4.8' };
  const subtitle    = {
    preparando: 'Pronto saldrá a entregar',
    en_camino:  'En camino hacia vos',
    entregado:  'Pedido entregado',
  }[estado] ?? '';

  return (
    <View style={styles.card}>
      <View style={styles.deliveryRow}>
        <AvatarInitials name={repartidor.nombre} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.deliveryName}>{repartidor.nombre}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={styles.deliverySub}>{subtitle}</Text>
            <Ionicons name="star" size={12} color={ORANGE} />
            <Text style={[styles.deliverySub, { color: '#555' }]}>{repartidor.rating}</Text>
          </View>
        </View>
        {showActions && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={ORANGE} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="call-outline" size={20} color={ORANGE} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {showMapBtn && (
        <TouchableOpacity style={styles.mapBtn} onPress={onViewMap}>
          <Ionicons name="map-outline" size={15} color="#fff" />
          <Text style={styles.mapBtnText}>Ver en mapa</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Sección de propina ────────────────────────────────────
function TipSection() {
  const [selected,  setSelected]  = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleTip = (tip) => {
    if (confirmed) return;
    setSelected(tip);
    setTimeout(() => setConfirmed(true), 500);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Dale propina a tu repartidor</Text>
      <Text style={styles.tipSubtitle}>Todos merecen un poco de reconocimiento</Text>

      {confirmed ? (
        <View style={styles.tipConfirmed}>
          <Ionicons name="heart" size={16} color={ORANGE} />
          <Text style={styles.tipConfirmedText}>¡Gracias! Enviaste {selected}</Text>
        </View>
      ) : (
        <View style={styles.tipChips}>
          {TIP_OPTIONS.map(tip => (
            <TouchableOpacity
              key={tip}
              style={[styles.tipChip, selected === tip && styles.tipChipOn]}
              onPress={() => handleTip(tip)}
            >
              <Text style={[styles.tipChipText, selected === tip && styles.tipChipTextOn]}>
                {tip}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────
export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;

  const [order,        setOrder]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [headerH,      setHeaderH]      = useState((StatusBar.currentHeight || 40) + 90);
  const [navigatingId, setNavigatingId] = useState(null);
  const [showReview,   setShowReview]   = useState(false);
  const [reviewDone,   setReviewDone]   = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await API.orders.getById(orderId);
      if (res.success) setOrder(res.order);
      else setError('No se pudo cargar el pedido');
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const handleItemPress = useCallback(async (item) => {
    if (!item.menu_item_id || !order?.restaurante_id) return;
    setNavigatingId(item.id);
    try {
      const res = await API.restaurants.getMenuItem(order.restaurante_id, item.menu_item_id);
      if (res.success && res.item) {
        const foodItem = {
          id:                 res.item.id,
          name:               res.item.nombre,
          price:              `$${parseFloat(res.item.precio).toFixed(2)}`,
          imageKey:           res.item.imagen_key,
          descriptionText:    res.item.descripcion || '',
          ingredientText:     res.item.ingredientes || [],
          ingredientesDetalle: res.item.ingredientes_detalle || [],
        };
        navigation.navigate('FoodDetail', { foodItem });
      }
    } catch {
      // ítem no disponible, no navegar
    } finally {
      setNavigatingId(null);
    }
  }, [order, navigation]);

  useFocusEffect(useCallback(() => { fetchOrder(); }, [fetchOrder]));

  const info         = order ? (STATUS_INFO[order.estado] ?? STATUS_INFO.pendiente) : null;
  const showDelivery = order && ['preparando', 'en_camino', 'entregado'].includes(order.estado);
  const showTip      = order && ['en_camino', 'entregado'].includes(order.estado);
  const isCancelled  = order?.estado === 'cancelado';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Header ── */}
      <View
        style={[styles.header, { paddingTop: (StatusBar.currentHeight || 40) + 8 }]}
        onLayout={e => setHeaderH(e.nativeEvent.layout.height)}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {info && (
            <>
              <Text style={styles.headerTitle}>{info.title}</Text>
              <Text style={styles.headerSub}>{info.subtitle}</Text>
            </>
          )}
        </View>

        {order && (
          <View style={styles.headerRight}>
            <Text style={styles.codeNum}>#{order.id}</Text>
            <Text style={styles.codeLabel}>Tu código</Text>
          </View>
        )}
      </View>

      {/* ── Contenido ── */}
      {loading ? (
        <View style={[styles.center, { paddingTop: headerH }]}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      ) : error ? (
        <View style={[styles.center, { paddingTop: headerH }]}>
          <Ionicons name="cloud-offline-outline" size={48} color="#999" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchOrder}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: headerH + 8 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Stepper / Cancelado */}
          <View style={[styles.card, isCancelled && styles.cardCancelled]}>
            {isCancelled ? (
              <View style={styles.cancelledRow}>
                <Ionicons name="close-circle" size={32} color="#FF3B30" />
                <Text style={styles.cancelledText}>Pedido cancelado</Text>
              </View>
            ) : (
              <Stepper estado={order.estado} />
            )}
          </View>

          {showDelivery && (
            <DeliveryCard
              estado={order.estado}
              onViewMap={() => navigation.navigate('OrderTracking', { orderId: order.id })}
            />
          )}

          {/* Resumen */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Resumen del pedido</Text>

            <View style={styles.summaryRow}>
              <Ionicons name="storefront-outline" size={15} color="#888" />
              <Text style={styles.summaryText} numberOfLines={1}>
                {order.restaurante_nombre}
              </Text>
            </View>

            {order.direccion_entrega ? (
              <View style={styles.summaryRow}>
                <Ionicons name="location-outline" size={15} color="#888" />
                <Text style={styles.summaryText} numberOfLines={1}>
                  {order.direccion_entrega}
                </Text>
              </View>
            ) : null}

            <View style={styles.divider} />

            {order.items?.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onPress={() => handleItemPress(item)}
                disabled={!item.menu_item_id || navigatingId === item.id}
                activeOpacity={item.menu_item_id ? 0.6 : 1}
              >
                <View style={styles.itemQtyBadge}>
                  <Text style={styles.itemQty}>{item.cantidad}</Text>
                </View>
                <Text style={styles.itemName} numberOfLines={1}>{item.nombre_item}</Text>
                {navigatingId === item.id ? (
                  <ActivityIndicator size="small" color={ORANGE} />
                ) : (
                  <>
                    <Text style={styles.itemPrice}>
                      ${parseFloat(item.subtotal).toFixed(2)}
                    </Text>
                    {item.menu_item_id && (
                      <Ionicons name="chevron-forward" size={14} color="#ccc" style={{ marginLeft: 4 }} />
                    )}
                  </>
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                ${parseFloat(order.total).toFixed(2)}
              </Text>
            </View>
          </View>

          {showTip && <TipSection />}

          {order.estado === 'entregado' && (
            <View style={styles.card}>
              {reviewDone ? (
                <View style={styles.reviewDoneRow}>
                  <Ionicons name="checkmark-circle" size={22} color="#34C759" />
                  <Text style={styles.reviewDoneText}>Ya calificaste este pedido</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>¿Cómo estuvo tu pedido?</Text>
                  <Text style={styles.reviewSubtitle}>Contanos tu experiencia con cada plato</Text>
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => setShowReview(true)}
                  >
                    <Ionicons name="star-outline" size={15} color="#fff" />
                    <Text style={styles.reviewBtnText}>Calificar pedido</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </ScrollView>
      )}

      <ReviewBottomSheet
        visible={showReview}
        onClose={() => setShowReview(false)}
        onSubmit={() => { setShowReview(false); setReviewDone(true); }}
        items={order?.items || []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 5,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, paddingHorizontal: 12 },
  headerTitle:  { fontFamily: 'Poppins-Bold', fontSize: 16, color: '#111' },
  headerSub:    { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#888', marginTop: 2 },
  headerRight:  { alignItems: 'flex-end' },
  codeNum:      { fontFamily: 'Poppins-Bold', fontSize: 22, color: '#111' },
  codeLabel:    { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#999' },

  // Centro
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  errorText: { fontFamily: 'Poppins-Regular', color: '#666', fontSize: 14 },
  retryBtn: {
    backgroundColor: ORANGE,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  retryText: { fontFamily: 'Poppins-Bold', color: '#fff', fontSize: 13 },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },

  // Card base
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardCancelled: { borderWidth: 1, borderColor: '#FFD0D0', backgroundColor: '#FFF8F8' },

  // Cancelado
  cancelledRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, justifyContent: 'center', paddingVertical: 8,
  },
  cancelledText: { fontFamily: 'Poppins-SemiBold', color: '#FF3B30', fontSize: 16 },

  // Repartidor
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: ORANGE,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText:   { fontFamily: 'Poppins-Bold', color: '#fff', fontSize: 18 },
  deliveryRow:  { flexDirection: 'row', alignItems: 'center' },
  deliveryName: { fontFamily: 'Poppins-SemiBold', color: '#111', fontSize: 15 },
  deliverySub:  { fontFamily: 'Poppins-Regular', color: '#888', fontSize: 12 },
  actionBtn: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 1.5, borderColor: ORANGE,
    justifyContent: 'center', alignItems: 'center',
  },

  // Resumen
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold', color: '#111', fontSize: 14, marginBottom: 12,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  summaryText: { fontFamily: 'Poppins-Regular', color: '#555', fontSize: 13, flex: 1 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },

  // Items
  itemRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  itemQtyBadge: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: '#FFF0E0',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  itemQty:   { fontFamily: 'Poppins-Bold', color: ORANGE, fontSize: 12 },
  itemName:  { flex: 1, fontFamily: 'Poppins-Regular', color: '#333', fontSize: 13 },
  itemPrice: { fontFamily: 'Poppins-SemiBold', color: '#333', fontSize: 13 },

  // Total
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: 'Poppins-SemiBold', color: '#111', fontSize: 15 },
  totalValue: { fontFamily: 'Poppins-Bold', color: ORANGE, fontSize: 20 },

  // Propina
  tipSubtitle: {
    fontFamily: 'Poppins-Regular', color: '#888', fontSize: 12,
    marginTop: -6, marginBottom: 14,
  },
  tipChips: { flexDirection: 'row', gap: 8 },
  tipChip: {
    flex: 1, paddingVertical: 11, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center',
  },
  tipChipOn:       { backgroundColor: ORANGE, borderColor: ORANGE },
  tipChipText:     { fontFamily: 'Poppins-SemiBold', color: '#555', fontSize: 13 },
  tipChipTextOn:   { color: '#fff' },
  tipConfirmed: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center', paddingVertical: 8,
  },
  tipConfirmedText: { fontFamily: 'Poppins-SemiBold', color: ORANGE, fontSize: 14 },

  // Reseña
  reviewSubtitle: {
    fontFamily: 'Poppins-Regular',
    color: '#888',
    fontSize: 12,
    marginTop: -6,
    marginBottom: 14,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ORANGE,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignSelf: 'flex-start',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  reviewBtnText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    fontSize: 14,
  },
  reviewDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  reviewDoneText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#34C759',
    fontSize: 14,
  },

  // Botón mapa
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: ORANGE,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  mapBtnText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    fontSize: 13,
  },
});
