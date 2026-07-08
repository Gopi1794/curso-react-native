// frontend/components/repartidor/NavigationOverlay.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haversineMeters } from '../../utils/routeGeometry';

const DISTANCIA_LLEGADA_METROS = 30;

export default function NavigationOverlay({
    visible,
    pedido,
    location,
    steps,
    stepActualIndex,
    routeInfo,
    etaTarget,
    destino,
    routePoints,
    onExit,
}) {
    const insets = useSafeAreaInsets();
    const mapRef = useRef(null);
    const lastAnnouncedIndexRef = useRef(-1);
    const [heading, setHeading] = useState(0);

    // ── Seguir el heading del dispositivo (si está disponible) ──
    useEffect(() => {
        if (!visible) return;
        let sub;
        (async () => {
            try {
                sub = await Location.watchHeadingAsync(h => {
                    const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
                    if (value >= 0) setHeading(value);
                });
            } catch {
                // Sin heading confiable (emulador, sin sensor, etc.) — la cámara no rota, no rompe nada
            }
        })();
        return () => sub?.remove();
    }, [visible]);

    // ── Mover la cámara con la posición y el heading ──
    useEffect(() => {
        if (!visible || !location || !mapRef.current) return;
        mapRef.current.animateCamera({
            center: { latitude: location.latitude, longitude: location.longitude },
            heading,
            pitch: 45,
            zoom: 18,
        }, { duration: 500 });
    }, [visible, location, heading]);

    // ── Anunciar por voz cada instrucción nueva, una sola vez ──
    useEffect(() => {
        if (!visible || !steps || steps.length === 0) return;
        if (stepActualIndex === lastAnnouncedIndexRef.current) return;

        const instruccion = steps[stepActualIndex]?.instruccion;
        if (instruccion) {
            try {
                Speech.speak(instruccion, { language: 'es-AR' });
            } catch {
                // Sin TTS disponible en el dispositivo — la instrucción se sigue mostrando en texto
            }
        }
        lastAnnouncedIndexRef.current = stepActualIndex;
    }, [visible, steps, stepActualIndex]);

    // ── Detectar llegada ──
    useEffect(() => {
        if (!visible || !location || !destino) return;
        const distancia = haversineMeters({ lat: location.latitude, lng: location.longitude }, destino);
        if (distancia < DISTANCIA_LLEGADA_METROS) {
            Speech.stop();
            onExit();
        }
    }, [visible, location, destino, onExit]);

    if (!visible) return null;

    const instruccionActual = steps && steps.length > 0 ? steps[stepActualIndex]?.instruccion : null;
    const minutosRestantes = etaTarget ? Math.max(1, Math.round((etaTarget.getTime() - Date.now()) / 60000)) : null;

    return (
        <View style={styles.root}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={location ? {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                } : undefined}
                showsUserLocation
            >
                {destino && (
                    <Marker coordinate={{ latitude: destino.lat, longitude: destino.lng }} />
                )}
                {routePoints && (
                    <Polyline
                        coordinates={routePoints}
                        strokeColor="#FF8700"
                        strokeWidth={4}
                    />
                )}
            </MapView>

            <View style={[styles.instructionBanner, { paddingTop: insets.top + 12 }]}>
                <Ionicons name="navigate" size={22} color="#fff" />
                <Text style={styles.instructionText} numberOfLines={2}>
                    {instruccionActual || 'Continuá por la ruta trazada'}
                </Text>
            </View>

            <TouchableOpacity style={[styles.exitBtn, { top: insets.top + 12 }]} onPress={() => { Speech.stop(); onExit(); }}>
                <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
                <Text style={styles.bottomText}>
                    {routeInfo ? `${(routeInfo.distanceMeters / 1000).toFixed(1)} km` : ''}
                    {minutosRestantes != null ? ` · ${minutosRestantes} min` : ''}
                </Text>
                <Text style={styles.bottomSubtext} numberOfLines={1}>
                    Pedido #{pedido?.id} — {pedido?.cliente_nombre} {pedido?.cliente_apellido}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: '#000' },
    map: { ...StyleSheet.absoluteFillObject },
    instructionBanner: {
        position: 'absolute', top: 0, left: 0, right: 0,
        backgroundColor: 'rgba(26,26,26,0.92)',
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingBottom: 16,
    },
    instructionText: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
    exitBtn: {
        position: 'absolute', right: 16,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center', justifyContent: 'center',
    },
    bottomBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(26,26,26,0.92)',
        paddingHorizontal: 20, paddingTop: 14,
    },
    bottomText: { color: '#fff', fontSize: 22, fontWeight: '800' },
    bottomSubtext: { color: '#ccc', fontSize: 13, marginTop: 2 },
});
