import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Linking, ActivityIndicator, Platform, Alert, ScrollView, Animated, Modal, TextInput, Keyboard,
} from 'react-native';
import MapView, { Marker, Circle, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import API from '../../services/api';
import { useRepartidorRoute } from '../../hooks/useRepartidorRoute';
import NavigationOverlay from '../../components/repartidor/NavigationOverlay';
import SlideToConfirm from '../../components/common/SlideToConfirm';
import { showErrorMessage, showSuccessMessage } from '../../components/FlashMessageWrapper';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

async function geocodeAddress(address) {
    try {
        const url = `${NOMINATIM}?q=${encodeURIComponent(address)}&format=json&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'TuAppFood/1.0' } });
        const data = await res.json();
        if (data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
            };
        }
    } catch {}
    return null;
}

function openWaze(lat, lon) {
    const url = `waze://?ll=${lat},${lon}&navigate=yes`;
    const fallback = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
    Linking.canOpenURL(url)
        .then(supported => Linking.openURL(supported ? url : fallback))
        .catch(() => Linking.openURL(fallback));
}

function openGoogleMaps(lat, lon) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
    Linking.openURL(url);
}

const ESTADO_COLOR = {
    preparando:     '#FB8C00',
    en_preparacion: '#FB8C00',
    en_camino:      '#43A047',
    pendiente:      '#888',
};

const ESTADO_LABEL = {
    preparando:     'Preparando',
    en_preparacion: 'Preparando',
    en_camino:      'En camino',
    pendiente:      'Pendiente',
};

export default function RepartidorMapaScreen({ route }) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const mapRef = useRef(null);

    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(false);
    const [pedidos, setPedidos] = useState([]);
    const [coords, setCoords] = useState({});   // { [pedidoId]: { latitude, longitude } }
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [geocoding, setGeocoding] = useState(false);
    const [topBlockHeight, setTopBlockHeight] = useState(0);
    const [navegando, setNavegando] = useState(false);
    const [showIrModal, setShowIrModal] = useState(false);
    const [iniciandoEntrega, setIniciandoEntrega] = useState(false);
    const [showLlegadaModal, setShowLlegadaModal] = useState(false);
    const [avisando, setAvisando] = useState(false);
    const [showCobroSheet, setShowCobroSheet] = useState(false);
    const [montoRecibido, setMontoRecibido] = useState('');
    const [cobrando, setCobrando] = useState(false);
    const [resetToken, setResetToken] = useState(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // ── Ocultar el navbar flotante mientras se navega ─────
    useEffect(() => {
        navigation.setParams({ hideTabBar: navegando });
    }, [navegando]);

    // ── Permiso y watch de ubicación ──────────────────────
    useEffect(() => {
        let sub;
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError(true);
                setLoading(false);
                return;
            }

            const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLocation(current.coords);
            setLoading(false);

            sub = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, distanceInterval: 10 },
                pos => {
                    setLocation(pos.coords);
                    API.repartidor.updateUbicacion(pos.coords.latitude, pos.coords.longitude).catch(() => {});
                }
            );
        })();
        return () => sub?.remove();
    }, []);

    // ── Cargar pedidos al enfocar la tab ──────────────────
    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                try {
                    const res = await API.repartidor.getMisPedidos();
                    if (active && res.success) setPedidos(res.pedidos);
                } catch {}
            })();
            return () => { active = false; };
        }, [])
    );

    // ── Geocodificar direcciones ───────────────────────────
    useEffect(() => {
        if (pedidos.length === 0) return;

        const missing = pedidos.filter(p => p.direccion_entrega && !coords[p.id]);
        if (missing.length === 0) return;

        setGeocoding(true);
        const delay = (ms) => new Promise(r => setTimeout(r, ms));

        (async () => {
            const newCoords = { ...coords };
            for (let i = 0; i < missing.length; i++) {
                const p = missing[i];
                const result = await geocodeAddress(p.direccion_entrega);
                if (result) newCoords[p.id] = result;
                if (i < missing.length - 1) await delay(1100); // respetar 1 req/s de Nominatim
            }
            setCoords(newCoords);
            setGeocoding(false);
        })();
    }, [pedidos]);

    // ── Seleccionar automáticamente el pedido que llegó por navegación ──
    useEffect(() => {
        const pedidoId = route?.params?.pedidoId;
        if (!pedidoId) return;
        if (selected?.id === pedidoId) {
            navigation.setParams({ pedidoId: undefined });
            return;
        }
        const match = pedidos.find(p => p.id === pedidoId && coords[p.id]);
        if (match) {
            setSelected(match);
            navigation.setParams({ pedidoId: undefined });
        }
    }, [route?.params?.pedidoId, pedidos, coords, selected]);

    // ── Centrar mapa en marcador seleccionado ─────────────
    useEffect(() => {
        if (!selected || !coords[selected.id] || !mapRef.current) return;
        mapRef.current.animateToRegion({
            ...coords[selected.id],
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }, 500);
    }, [selected]);

    const { routePoints, routeInfo, etaTarget, steps, stepActualIndex } = useRepartidorRoute({ location, coords, selected });

    const destinoNav = useMemo(() => {
        if (!selected || !coords[selected.id]) return null;
        return { lat: coords[selected.id].latitude, lng: coords[selected.id].longitude };
    }, [selected, coords[selected?.id]?.latitude, coords[selected?.id]?.longitude]);

    // ── Centrar en mi posición ────────────────────────────
    const centerOnMe = () => {
        if (!location || !mapRef.current) return;
        mapRef.current.animateToRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
        }, 500);
    };

    const pedidosConCoords = pedidos.filter(p => coords[p.id]);

    const handleIrPress = () => {
        if (!selected) return;
        if (selected.estado === 'en_camino') {
            setNavegando(true);
        } else {
            setShowIrModal(true);
        }
    };

    const handleVerRecorrido = () => {
        setShowIrModal(false);
        setNavegando(true);
    };

    const handleArrive = () => {
        setNavegando(false);
        setShowLlegadaModal(true);
    };

    const handleLlamarCliente = () => {
        if (selected?.cliente_telefono) Linking.openURL(`tel:${selected.cliente_telefono}`);
    };

    const handleWhatsappCliente = () => {
        if (selected?.cliente_telefono) Linking.openURL(`whatsapp://send?phone=${selected.cliente_telefono}`);
    };

    const handleAvisarLlegada = async () => {
        if (!selected) return;
        setAvisando(true);
        try {
            const res = await API.repartidor.avisarLlegada(selected.id);
            if (!res.success) showErrorMessage('Error', res.message || 'No se pudo avisar al cliente');
        } catch {
            showErrorMessage('Error', 'No se pudo avisar al cliente');
        } finally {
            setAvisando(false);
        }
    };

    const handleIrACobrar = () => {
        setShowLlegadaModal(false);
        setMontoRecibido('');
        setShowCobroSheet(true);
    };

    const handleConfirmarCobro = async () => {
        if (!selected) return;
        const esEfectivo = selected.metodo_pago === 'efectivo';

        if (esEfectivo) {
            const monto = parseFloat(montoRecibido.replace(',', '.'));
            if (isNaN(monto) || monto < parseFloat(selected.total)) {
                showErrorMessage('Monto inválido', 'Ingresá un monto mayor o igual al total del pedido');
                setResetToken(t => t + 1);
                return;
            }
        }

        setCobrando(true);
        try {
            const res = esEfectivo
                ? await API.repartidor.cobrarEfectivo(selected.id, parseFloat(montoRecibido.replace(',', '.')))
                : await API.repartidor.updateEstado(selected.id, 'entregado');

            if (res.success) {
                setPedidos(prev => prev.filter(p => p.id !== selected.id));
                setSelected(null);
                setShowCobroSheet(false);
                showSuccessMessage(
                    '¡Entregado!',
                    esEfectivo ? `Vuelto: $${res.vuelto}` : 'Pedido marcado como entregado'
                );
            } else {
                showErrorMessage('Error', res.message || 'No se pudo confirmar la entrega');
                setResetToken(t => t + 1);
            }
        } catch {
            showErrorMessage('Error', 'No se pudo confirmar la entrega');
            setResetToken(t => t + 1);
        } finally {
            setCobrando(false);
        }
    };

    const handleComenzarEntrega = async () => {
        if (!selected) return;
        setIniciandoEntrega(true);
        try {
            const res = await API.repartidor.updateEstado(selected.id, 'en_camino');
            if (res.success) {
                setPedidos(prev => prev.map(p => p.id === selected.id ? { ...p, estado: 'en_camino' } : p));
                setSelected(prev => prev ? { ...prev, estado: 'en_camino' } : prev);
                setShowIrModal(false);
                setNavegando(true);
            } else {
                showErrorMessage('Error', res.message || 'No se pudo iniciar la entrega');
            }
        } catch {
            showErrorMessage('Error', 'No se pudo iniciar la entrega');
        } finally {
            setIniciandoEntrega(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#FF8700" />
                <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
            </View>
        );
    }

    if (locationError) {
        return (
            <View style={styles.centered}>
                <Ionicons name="location-off-outline" size={56} color="#ddd" />
                <Text style={styles.errorTitle}>Sin permiso de ubicación</Text>
                <Text style={styles.errorSub}>Habilitá la ubicación en ajustes para usar el mapa</Text>
                <TouchableOpacity style={styles.settingsBtn} onPress={() => Linking.openSettings()}>
                    <Text style={styles.settingsBtnText}>Abrir ajustes</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const initialRegion = location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
    } : {
        latitude: -34.6037,
        longitude: -58.3816,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    };

    return (
        <View style={styles.root}>
            {/* ── Mapa ── */}
            {!navegando && (
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={initialRegion}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    showsCompass={false}
                >
                    {/* Pin del repartidor */}
                    {location && (
                        <>
                            <Circle
                                center={{ latitude: location.latitude, longitude: location.longitude }}
                                radius={80}
                                fillColor="rgba(0,122,255,0.12)"
                                strokeColor="rgba(0,122,255,0.3)"
                                strokeWidth={1}
                            />
                            <Marker
                                coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                                anchor={{ x: 0.5, y: 0.5 }}
                                flat
                            >
                                <View style={styles.myDot} />
                            </Marker>
                        </>
                    )}

                    {/* Pins de pedidos */}
                    {pedidosConCoords.map(p => (
                        <Marker
                            key={p.id}
                            coordinate={coords[p.id]}
                            onPress={() => setSelected(p)}
                            anchor={{ x: 0.5, y: 1 }}
                        >
                            <View style={[
                                styles.pinWrapper,
                                selected?.id === p.id && styles.pinWrapperSelected,
                            ]}>
                                <View style={[styles.pin, { backgroundColor: ESTADO_COLOR[p.estado] ?? '#888' }]}>
                                    <Text style={styles.pinText}>#{p.id}</Text>
                                </View>
                                <View style={[styles.pinArrow, { borderTopColor: ESTADO_COLOR[p.estado] ?? '#888' }]} />
                            </View>
                        </Marker>
                    ))}

                    {routePoints && (
                        <Polyline
                            coordinates={routePoints}
                            strokeColor="#FF8700"
                            strokeWidth={4}
                        />
                    )}
                </MapView>
            )}

            {/* ── Bloque superior: header + lista ── */}
            <View
                style={[styles.topBlock, { paddingTop: insets.top + 8 }]}
                onLayout={e => setTopBlockHeight(e.nativeEvent.layout.height)}
            >
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Mapa de repartos</Text>
                    {geocoding && (
                        <View style={styles.geocodingBadge}>
                            <ActivityIndicator size="small" color="#FF8700" />
                            <Text style={styles.geocodingText}>Ubicando...</Text>
                        </View>
                    )}
                </View>

                {pedidos.length === 0 ? (
                    <View style={styles.noPedidosRow}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#43A047" />
                        <Text style={styles.noPedidosText}>Sin repartos activos</Text>
                    </View>
                ) : (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.miniListContent}
                        style={styles.miniListScroll}
                    >
                        {pedidosConCoords.map(p => (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.miniCard, selected?.id === p.id && styles.miniCardSelected]}
                                onPress={() => setSelected(selected?.id === p.id ? null : p)}
                            >
                                {p.estado === 'en_camino' ? (
                                    <Animated.View style={[styles.miniDot, { backgroundColor: ESTADO_COLOR[p.estado], opacity: pulseAnim }]} />
                                ) : (
                                    <View style={[styles.miniDot, { backgroundColor: ESTADO_COLOR[p.estado] ?? '#888' }]} />
                                )}
                                <View>
                                    <Text style={styles.miniNum}>Pedido #{p.id}</Text>
                                    <Text style={styles.miniCliente} numberOfLines={1}>
                                        {p.cliente_nombre} {p.cliente_apellido}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-down" size={16} color="#ccc" style={{ marginLeft: 'auto' }} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                <LinearGradient
                    colors={['rgba(255,255,255,0.96)', 'rgba(255,255,255,0)']}
                    style={styles.topBlockFade}
                    pointerEvents="none"
                />
            </View>

            {/* ── Botón centrar ── */}
            <TouchableOpacity style={styles.centerBtn} onPress={centerOnMe}>
                <Ionicons name="locate" size={22} color="#FF8700" />
            </TouchableOpacity>

            {/* ── Card del pedido seleccionado ── */}
            {selected && (
                <View style={[styles.card, { top: topBlockHeight }]}>
                    <BlurView
                        intensity={55}
                        tint="light"
                        experimentalBlurMethod="dimezisBlurView"
                        style={styles.cardBlur}
                    />
                    <View style={styles.cardHeader}>
                        <View style={[styles.estadoBadge, { backgroundColor: `${ESTADO_COLOR[selected.estado]}20` }]}>
                            <View style={[styles.estadoDot, { backgroundColor: ESTADO_COLOR[selected.estado] }]} />
                            <Text style={[styles.estadoText, { color: ESTADO_COLOR[selected.estado] }]}>
                                {ESTADO_LABEL[selected.estado] ?? selected.estado}
                            </Text>
                        </View>
                        <Text style={styles.cardOrderNum}>Pedido #{selected.id}</Text>
                        <TouchableOpacity style={styles.cardClose} onPress={() => setSelected(null)}>
                            <Ionicons name="close" size={20} color="#888" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.cardClientName}>
                        {selected.cliente_nombre} {selected.cliente_apellido}
                    </Text>

                    <View style={styles.cardRow}>
                        <Ionicons name="location-outline" size={15} color="#FF8700" />
                        <Text style={styles.cardAddress} numberOfLines={2}>
                            {selected.direccion_entrega || 'Sin dirección'}
                        </Text>
                    </View>

                    <View style={styles.cardRow}>
                        <Ionicons name="cash-outline" size={15} color="#666" />
                        <Text style={styles.cardTotal}>${parseFloat(selected.total).toFixed(2)}</Text>
                        {selected.metodo_pago === 'efectivo' && (
                            <View style={styles.efectivoBadge}>
                                <Text style={styles.efectivoText}>Efectivo</Text>
                            </View>
                        )}
                    </View>

                    {routeInfo && (
                        <View style={styles.cardRow}>
                            <Ionicons name="speedometer-outline" size={15} color="#666" />
                            <Text style={styles.cardTotal}>
                                {(routeInfo.distanceMeters / 1000).toFixed(1)} km · {Math.round(routeInfo.durationSeconds / 60)} min
                            </Text>
                        </View>
                    )}

                    {routePoints && (
                        <TouchableOpacity
                            style={styles.irBtn}
                            onPress={handleIrPress}
                        >
                            <Ionicons name="navigate-circle" size={20} color="#fff" />
                            <Text style={styles.irBtnText}>Ir</Text>
                        </TouchableOpacity>
                    )}

                    {coords[selected.id] && (
                        <View style={styles.navButtons}>
                            <TouchableOpacity
                                style={[styles.navBtn, styles.wazeBtn]}
                                onPress={() => openWaze(coords[selected.id].latitude, coords[selected.id].longitude)}
                            >
                                <Ionicons name="navigate" size={18} color="#fff" />
                                <Text style={styles.navBtnText}>Waze</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.navBtn, styles.gmapsBtn]}
                                onPress={() => openGoogleMaps(coords[selected.id].latitude, coords[selected.id].longitude)}
                            >
                                <Ionicons name="map" size={18} color="#fff" />
                                <Text style={styles.navBtnText}>Google Maps</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <LinearGradient
                        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0)']}
                        style={styles.cardBottomShadow}
                        pointerEvents="none"
                    />
                </View>
            )}

            <Modal
                visible={showIrModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowIrModal(false)}
            >
                <View style={styles.irModalOverlay}>
                    <View style={styles.irModalSheet}>
                        <View style={styles.irModalIconWrap}>
                            <Ionicons name="bicycle-outline" size={64} color="#1976D2" />
                        </View>
                        <Text style={styles.irModalTitle}>¿Qué querés hacer?</Text>
                        <Text style={styles.irModalSub}>
                            Comenzar la entrega avisa al cliente que ya salís con su pedido
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity
                                style={[styles.irModalBtn, { backgroundColor: '#F0F0F0' }]}
                                onPress={handleVerRecorrido}
                                disabled={iniciandoEntrega}
                            >
                                <Text style={[styles.irModalBtnText, { color: '#555' }]}>Solo ver recorrido</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.irModalBtn, { backgroundColor: '#1976D2' }]}
                                onPress={handleComenzarEntrega}
                                disabled={iniciandoEntrega}
                            >
                                {iniciandoEntrega ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.irModalBtnText}>Comenzar entrega</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <NavigationOverlay
                visible={navegando}
                pedido={selected}
                location={location}
                steps={steps}
                stepActualIndex={stepActualIndex}
                routeInfo={routeInfo}
                etaTarget={etaTarget}
                destino={destinoNav}
                routePoints={routePoints}
                onExit={() => setNavegando(false)}
                onArrive={handleArrive}
            />

            <Modal
                visible={showLlegadaModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLlegadaModal(false)}
            >
                <View style={styles.irModalOverlay}>
                    <View style={styles.irModalSheet}>
                        <View style={[styles.irModalIconWrap, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="checkmark-done-circle-outline" size={64} color="#43A047" />
                        </View>
                        <Text style={styles.irModalTitle}>¡Llegaste!</Text>
                        <Text style={styles.irModalSub}>
                            Pedido #{selected?.id} — {selected?.cliente_nombre} {selected?.cliente_apellido}
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginBottom: 12 }}>
                            <TouchableOpacity
                                style={[styles.irModalBtn, { backgroundColor: '#E8F5E9' }]}
                                onPress={handleLlamarCliente}
                            >
                                <Ionicons name="call-outline" size={18} color="#43A047" />
                                <Text style={[styles.irModalBtnText, { color: '#43A047' }]}>Llamar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.irModalBtn, { backgroundColor: '#E8F5E9' }]}
                                onPress={handleWhatsappCliente}
                            >
                                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                                <Text style={[styles.irModalBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.irModalFullBtn, { backgroundColor: '#F0F0F0', marginBottom: 12 }]}
                            onPress={handleAvisarLlegada}
                            disabled={avisando}
                        >
                            {avisando ? (
                                <ActivityIndicator size="small" color="#555" />
                            ) : (
                                <>
                                    <Ionicons name="notifications-outline" size={18} color="#555" />
                                    <Text style={[styles.irModalBtnText, { color: '#555' }]}>Avisar que estoy afuera</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.irModalFullBtn, { backgroundColor: selected?.metodo_pago === 'efectivo' ? '#2E7D32' : '#43A047' }]}
                            onPress={handleIrACobrar}
                        >
                            <Ionicons name={selected?.metodo_pago === 'efectivo' ? 'cash-outline' : 'checkmark-circle-outline'} size={18} color="#fff" />
                            <Text style={styles.irModalBtnText}>
                                {selected?.metodo_pago === 'efectivo' ? 'Cobrar efectivo' : 'Marcar como entregado'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showCobroSheet}
                transparent
                animationType="slide"
                onRequestClose={() => !cobrando && setShowCobroSheet(false)}
            >
                <View style={styles.cobroOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        disabled={cobrando}
                        onPress={() => setShowCobroSheet(false)}
                    />
                    <View style={[styles.cobroSheet, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.cobroHandle} />

                        <View style={styles.cobroHeader}>
                            <Text style={styles.cobroTitle}>Pedido #{selected?.id}</Text>
                            <Text style={styles.cobroSub}>
                                {selected?.cliente_nombre} {selected?.cliente_apellido}
                            </Text>
                        </View>

                        <View style={styles.cobroTotalRow}>
                            <Text style={styles.cobroTotalLabel}>Total del pedido</Text>
                            <Text style={styles.cobroTotalValue}>${parseFloat(selected?.total || 0).toFixed(2)}</Text>
                        </View>

                        {selected?.metodo_pago === 'efectivo' ? (
                            <>
                                <Text style={styles.cobroInputLabel}>Monto recibido</Text>
                                <TextInput
                                    style={styles.cobroInput}
                                    placeholder="$0.00"
                                    placeholderTextColor="#bbb"
                                    keyboardType="decimal-pad"
                                    value={montoRecibido}
                                    onChangeText={setMontoRecibido}
                                    editable={!cobrando}
                                    returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss}
                                />
                                {montoRecibido.trim() !== '' && !isNaN(parseFloat(montoRecibido.replace(',', '.'))) && (
                                    <Text style={styles.cobroVuelto}>
                                        Vuelto: ${Math.max(0, parseFloat(montoRecibido.replace(',', '.')) - parseFloat(selected?.total || 0)).toFixed(2)}
                                    </Text>
                                )}
                                <View style={{ marginTop: 20 }}>
                                    <SlideToConfirm
                                        key={resetToken}
                                        label="Deslizá para cobrar →"
                                        color="#2E7D32"
                                        loading={cobrando}
                                        onConfirm={handleConfirmarCobro}
                                    />
                                </View>
                            </>
                        ) : (
                            <View style={styles.cobroPagadoBadge}>
                                <Ionicons name="card-outline" size={16} color="#1976D2" />
                                <Text style={styles.cobroPagadoText}>Ya pagado — solo falta confirmar la entrega</Text>
                            </View>
                        )}

                        {selected?.metodo_pago !== 'efectivo' && (
                            <View style={{ marginTop: 20 }}>
                                <SlideToConfirm
                                    key={resetToken}
                                    label="Deslizá para marcar entregado →"
                                    color="#43A047"
                                    loading={cobrando}
                                    onConfirm={handleConfirmarCobro}
                                />
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    map: { ...StyleSheet.absoluteFillObject },

    irModalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    irModalSheet: {
        backgroundColor: '#fff', borderRadius: 28,
        padding: 28, width: '100%', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
    },
    irModalIconWrap: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#E3F2FD',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    irModalTitle: {
        fontSize: 22, fontFamily: 'Poppins-Bold',
        color: '#1a1a1a', marginBottom: 4, textAlign: 'center',
    },
    irModalSub: {
        fontSize: 13, fontFamily: 'Poppins-Regular',
        color: '#888', marginBottom: 24, textAlign: 'center',
    },
    irModalBtn: {
        flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 14, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    irModalFullBtn: {
        flexDirection: 'row', gap: 6, width: '100%', paddingVertical: 16, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    irModalBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins-Bold' },

    cobroOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
    },
    cobroSheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 12,
    },
    cobroHandle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0',
        alignSelf: 'center', marginBottom: 16,
    },
    cobroHeader: { marginBottom: 16 },
    cobroTitle: { fontSize: 20, fontFamily: 'Poppins-Bold', color: '#1a1a1a' },
    cobroSub: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#888', marginTop: 2 },
    cobroTotalRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#F9F9F9', borderRadius: 16, padding: 16, marginBottom: 20,
    },
    cobroTotalLabel: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#666' },
    cobroTotalValue: { fontSize: 20, fontFamily: 'Poppins-Bold', color: '#1a1a1a' },
    cobroInputLabel: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#555', marginBottom: 8 },
    cobroInput: {
        borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 16,
        paddingHorizontal: 16, paddingVertical: 14, fontSize: 22,
        fontFamily: 'Poppins-Bold', color: '#1a1a1a',
    },
    cobroVuelto: {
        fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#2E7D32', marginTop: 10,
    },
    cobroPagadoBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#E3F2FD', borderRadius: 16, padding: 16,
    },
    cobroPagadoText: { flex: 1, fontSize: 13, fontFamily: 'Poppins-Regular', color: '#1976D2' },

    centered: {
        flex: 1, backgroundColor: '#F5F5F5',
        alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    loadingText: { marginTop: 16, fontSize: 14, color: '#888', fontFamily: 'Poppins-Regular' },
    errorTitle: { marginTop: 16, fontSize: 18, fontWeight: '700', color: '#333', textAlign: 'center' },
    errorSub: { marginTop: 8, fontSize: 14, color: '#888', textAlign: 'center' },
    settingsBtn: {
        marginTop: 20, backgroundColor: '#FF8700',
        paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20,
    },
    settingsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    /* Bloque superior */
    topBlock: {
        position: 'absolute', top: 0, left: 0, right: 0,
        backgroundColor: 'rgba(255,255,255,0.96)',
        paddingBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
    },
    topBlockFade: {
        position: 'absolute',
        bottom: -28, left: 0, right: 0,
        height: 28,
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 10,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', fontFamily: 'Poppins-Bold' },
    geocodingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    geocodingText: { fontSize: 12, color: '#FF8700', fontFamily: 'Poppins-Regular' },
    noPedidosRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 20,
    },
    noPedidosText: { fontSize: 13, color: '#43A047', fontWeight: '600' },
    miniListScroll: { flexGrow: 0 },
    miniListContent: { gap: 10, paddingHorizontal: 16 },

    /* Botón centrar */
    centerBtn: {
        position: 'absolute', right: 16, bottom: FLOATING_TAB_BAR_HEIGHT - 8,
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#FF8700',
        shadowColor: '#FF8700', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
    },

    /* Pin personalizado */
    pinWrapper: { alignItems: 'center' },
    pinWrapperSelected: { transform: [{ scale: 1.15 }] },
    pin: {
        borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
        minWidth: 42, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
    },
    pinText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    pinArrow: {
        width: 0, height: 0,
        borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
    },

    /* Dot del repartidor */
    myDot: {
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: '#007AFF',
        borderWidth: 3, borderColor: '#fff',
        shadowColor: '#007AFF', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5, shadowRadius: 4,
    },

    /* Card del pedido */
    card: {
        position: 'absolute', left: 0, right: 0,
        backgroundColor: 'rgba(255,255,255,0.55)',
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15, shadowRadius: 6,
    },
    cardBlur: {
        ...StyleSheet.absoluteFillObject,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        overflow: 'hidden',
    },
    cardBottomShadow: {
        position: 'absolute',
        bottom: -12, left: 0, right: 0,
        height: 12,
    },
    cardClose: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#f0f0f0',
        alignItems: 'center', justifyContent: 'center',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    estadoBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    },
    estadoDot: { width: 8, height: 8, borderRadius: 4 },
    estadoText: { fontSize: 12, fontWeight: '700' },
    cardOrderNum: { fontSize: 13, color: '#888', fontWeight: '500', flex: 1 },
    cardClientName: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    cardAddress: { fontSize: 13, color: '#555', flex: 1 },
    cardTotal: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
    efectivoBadge: {
        backgroundColor: '#E8F5E9', borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6,
    },
    efectivoText: { fontSize: 11, color: '#2E7D32', fontWeight: '600' },

    /* Botones de navegación */
    navButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },
    navBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 13, borderRadius: 14,
    },
    wazeBtn: { backgroundColor: '#33CCFF' },
    gmapsBtn: { backgroundColor: '#4285F4' },
    navBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    irBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 13, borderRadius: 14,
        backgroundColor: '#FF8700', marginTop: 10,
    },
    irBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    miniCard: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#fff', borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 2, borderColor: '#FF8700',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
        minWidth: 180,
    },
    miniCardSelected: {
        borderColor: '#FF8700', backgroundColor: '#FFF8F0',
    },
    miniDot: { width: 10, height: 10, borderRadius: 5 },
    miniNum: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
    miniCliente: { fontSize: 12, color: '#888', maxWidth: 130 },
});
