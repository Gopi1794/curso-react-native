import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, AnimatedRegion, MarkerAnimated } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import API from '../../services/api';

const ORANGE = '#ff8700';

const STEP_KEYS   = ['pendiente', 'preparando', 'en_camino', 'entregado'];
const STEP_LABELS = ['Aceptado', 'Preparando', 'Recogido', 'Entregado'];
const STEP_ICONS  = ['cube-outline', 'restaurant-outline', 'bicycle-outline', 'bag-check-outline'];

function Stepper({ estado }) {
    const activeIndex = STEP_KEYS.indexOf(estado);
    return (
        <View style={{ paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {STEP_LABELS.map((_, i) => {
                    const done   = i < activeIndex;
                    const active = i === activeIndex;
                    const bg     = done || active ? ORANGE : '#e8e8e8';
                    return (
                        <React.Fragment key={i}>
                            <View style={{
                                width: 36, height: 36, borderRadius: 18,
                                backgroundColor: bg,
                                justifyContent: 'center', alignItems: 'center',
                            }}>
                                {done   && <Ionicons name="checkmark"    size={18} color="#fff" />}
                                {active && <Ionicons name={STEP_ICONS[i]} size={16} color="#fff" />}
                                {!done && !active && <Ionicons name={STEP_ICONS[i]} size={16} color="#bbb" />}
                            </View>
                            {i < STEP_LABELS.length - 1 && (
                                <View style={{ flex: 1, height: 3, backgroundColor: i < activeIndex ? ORANGE : '#e8e8e8' }} />
                            )}
                        </React.Fragment>
                    );
                })}
            </View>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
                {STEP_LABELS.map((label, i) => (
                    <React.Fragment key={i}>
                        <Text style={{
                            width: 36, textAlign: 'center', fontSize: 9,
                            fontFamily: 'Poppins-Regular',
                            color: i <= activeIndex ? '#333' : '#bbb',
                        }}>{label}</Text>
                        {i < STEP_LABELS.length - 1 && <View style={{ flex: 1 }} />}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );
}

const STATUS_TEXT = {
    pendiente:  { title: 'Pedido recibido',       subtitle: 'El restaurante está confirmando tu pedido' },
    preparando: { title: 'Preparando tu pedido',  subtitle: 'El repartidor espera en el restaurante' },
    en_camino:  { title: 'En camino',             subtitle: 'Tu pedido está llegando' },
    entregado:  { title: '¡Pedido entregado!',    subtitle: '¡Buen provecho!' },
};

function initials(name) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function OrderTrackingScreen({ route, navigation }) {
    const { orderId } = route.params;

    const [trackingData, setTrackingData]   = useState(null);
    const [error, setError]                 = useState(null);
    const [mapError, setMapError]           = useState(false);
    const [destinoCoords, setDestinoCoords] = useState(null);

    const markerCoord = useRef(null);
    const intervalRef = useRef(null);

    const fetchTracking = async () => {
        try {
            const res = await API.orders.getTracking(orderId);
            if (!res.success) { setError('No se pudo cargar el tracking'); return; }

            if (!markerCoord.current) {
                markerCoord.current = new AnimatedRegion({
                    latitude:        res.repartidor.lat,
                    longitude:       res.repartidor.lng,
                    latitudeDelta:   0,
                    longitudeDelta:  0,
                });
            } else {
                markerCoord.current.timing({
                    latitude:       res.repartidor.lat,
                    longitude:      res.repartidor.lng,
                    duration:       800,
                    useNativeDriver: false,
                }).start();
            }

            setTrackingData(res);

            if (res.estado === 'entregado' || res.estado === 'cancelado') {
                clearInterval(intervalRef.current);
                navigation.goBack();
            }
        } catch {
            setError('Error de conexión');
        }
    };

    useEffect(() => {
        fetchTracking();
        intervalRef.current = setInterval(fetchTracking, 10000);
        return () => clearInterval(intervalRef.current);
    }, [orderId]);

    useEffect(() => {
        if (!trackingData?.direccionEntrega || destinoCoords) return;
        (async () => {
            try {
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trackingData.direccionEntrega)}&format=json&limit=1`;
                const res = await fetch(url, { headers: { 'User-Agent': 'TuAppFood/1.0' } });
                const data = await res.json();
                if (data.length > 0) {
                    setDestinoCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
                }
            } catch {}
        })();
    }, [trackingData]);

    if (error) {
        return (
            <View style={[styles.container, styles.center]}>
                <Ionicons name="cloud-offline-outline" size={48} color="#999" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchTracking}>
                    <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!trackingData) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={ORANGE} />
                <Text style={styles.loadingText}>Cargando mapa...</Text>
            </View>
        );
    }

    const { repartidor, restaurante, estado, distanciaMetros, duracionSegundos, etaCalculadoEn } = trackingData;
    const statusInfo = STATUS_TEXT[estado] || STATUS_TEXT.pendiente;

    const etaMinutosRestantes = (() => {
        if (!etaCalculadoEn || !duracionSegundos) return null;
        const objetivoMs = new Date(etaCalculadoEn).getTime() + duracionSegundos * 1000;
        const restanteMs = objetivoMs - Date.now();
        return Math.max(1, Math.round(restanteMs / 60000)); // nunca mostrar 0 o negativo
    })();

    const midLat = (restaurante.lat + (destinoCoords?.lat ?? restaurante.lat)) / 2;
    const midLng = (restaurante.lng + (destinoCoords?.lng ?? restaurante.lng)) / 2;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="arrow-back" size={20} color="#333" />
            </TouchableOpacity>

            {mapError ? (
                <View style={[styles.map, styles.center]}>
                    <Ionicons name="map-outline" size={48} color="#ccc" />
                    <Text style={styles.errorText}>No se pudo cargar el mapa</Text>
                </View>
            ) : (
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                onMapError={() => setMapError(true)}
                initialRegion={{
                    latitude:      midLat,
                    longitude:     midLng,
                    latitudeDelta:  0.04,
                    longitudeDelta: 0.04,
                }}
            >
                <Marker
                    coordinate={{ latitude: restaurante.lat, longitude: restaurante.lng }}
                    title="Restaurante"
                >
                    <View style={styles.pinRestaurante}>
                        <Ionicons name="storefront" size={16} color="#fff" />
                    </View>
                </Marker>

                {destinoCoords && (
                    <Marker
                        coordinate={{ latitude: destinoCoords.lat, longitude: destinoCoords.lng }}
                        title="Tu dirección"
                    >
                        <View style={styles.pinDestino}>
                            <Ionicons name="home" size={16} color="#fff" />
                        </View>
                    </Marker>
                )}

                {markerCoord.current && (
                    <MarkerAnimated
                        coordinate={markerCoord.current}
                        title={repartidor.nombre}
                    >
                        <View style={styles.pinRepartidor}>
                            <Text style={styles.pinInitials}>{initials(repartidor.nombre)}</Text>
                        </View>
                    </MarkerAnimated>
                )}

                {destinoCoords && (
                    <Polyline
                        coordinates={[
                            { latitude: restaurante.lat,  longitude: restaurante.lng },
                            { latitude: repartidor.lat,   longitude: repartidor.lng },
                            { latitude: destinoCoords.lat, longitude: destinoCoords.lng },
                        ]}
                        strokeColor={ORANGE}
                        strokeWidth={3}
                        lineDashPattern={[6, 4]}
                    />
                )}
            </MapView>
            )}

            <View style={styles.panel}>
                <Text style={styles.panelTitle}>{statusInfo.title}</Text>
                <Text style={styles.panelSubtitle}>{statusInfo.subtitle}</Text>

                <View style={styles.stepperWrap}>
                    <Stepper estado={estado} />
                </View>

                <View style={styles.driverCard}>
                    <View style={styles.driverAvatar}>
                        <Text style={styles.driverInitials}>{initials(repartidor.nombre)}</Text>
                    </View>
                    <View style={styles.driverInfo}>
                        <Text style={styles.driverName}>{repartidor.nombre}</Text>
                        <View style={styles.driverRatingRow}>
                            <Ionicons name="star" size={12} color={ORANGE} />
                            <Text style={styles.driverRating}>{repartidor.rating} · {statusInfo.subtitle}</Text>
                        </View>
                        {etaMinutosRestantes != null && (
                            <Text style={styles.driverRating}>Llega en {etaMinutosRestantes} min</Text>
                        )}
                    </View>
                    <View style={styles.driverActions}>
                        <TouchableOpacity style={styles.driverBtn}>
                            <Ionicons name="call-outline" size={20} color={ORANGE} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.driverBtn}>
                            <Ionicons name="chatbubble-ellipses-outline" size={20} color={ORANGE} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center:    { justifyContent: 'center', alignItems: 'center', gap: 12 },

    backBtn: {
        position: 'absolute',
        top: (StatusBar.currentHeight || 40) + 8,
        left: 16,
        zIndex: 100,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
    },

    map: { flex: 1 },

    pinRestaurante: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#444',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    pinDestino: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#34C759',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    pinRepartidor: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: ORANGE,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#fff',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
    },
    pinInitials: { fontFamily: 'Poppins-Bold', color: '#fff', fontSize: 14 },

    panel: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: 32,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 10,
    },
    panelTitle:    { fontFamily: 'Poppins-Bold', fontSize: 18, color: '#111', marginBottom: 4 },
    panelSubtitle: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#888', marginBottom: 16 },
    stepperWrap:   { marginBottom: 16 },

    driverCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f8f8f8', borderRadius: 16, padding: 12,
    },
    driverAvatar: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: ORANGE,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    driverInitials: { fontFamily: 'Poppins-Bold', color: '#fff', fontSize: 16 },
    driverInfo:  { flex: 1 },
    driverName:  { fontFamily: 'Poppins-SemiBold', color: '#111', fontSize: 15 },
    driverRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    driverRating: { fontFamily: 'Poppins-Regular', color: '#888', fontSize: 12 },
    driverActions: { flexDirection: 'row', gap: 8 },
    driverBtn: {
        width: 40, height: 40, borderRadius: 20,
        borderWidth: 1.5, borderColor: ORANGE,
        justifyContent: 'center', alignItems: 'center',
    },

    errorText:   { fontFamily: 'Poppins-Regular', color: '#666', fontSize: 14, textAlign: 'center' },
    loadingText: { fontFamily: 'Poppins-Regular', color: '#888', fontSize: 13, marginTop: 8 },
    retryBtn:    { backgroundColor: ORANGE, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
    retryText:   { fontFamily: 'Poppins-Bold', color: '#fff', fontSize: 14 },
});
