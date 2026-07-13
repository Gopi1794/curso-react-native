// frontend/components/rewards/SpinWheel.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import {
    SEGMENT_COUNT,
    segmentPath,
    labelPosition,
} from './wheelMath';

const { width: screenWidth } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(screenWidth - 60, 340);
const RADIUS = WHEEL_SIZE / 2;
const LABEL_RADIUS = RADIUS * 0.62;

export const PREMIOS_DEFAULT = [
    { id: 'off20', label: '20% OFF', icon: 'pricetag-outline' },
    { id: 'envio', label: 'Envío gratis', icon: 'bicycle-outline' },
    { id: 'postre', label: 'Postre gratis', icon: 'ice-cream-outline' },
    { id: 'off15', label: '15% OFF', icon: 'pricetag-outline' },
    { id: 'plato', label: 'Plato gratis', icon: 'restaurant-outline' },
    { id: 'bebidas', label: '2x1 en bebidas', icon: 'wine-outline' },
    { id: 'pizzas', label: '2x1 en pizzas', icon: 'pizza-outline' },
    { id: 'off10', label: '10% OFF', icon: 'bag-handle-outline' },
];

export default function SpinWheel({
    premios = PREMIOS_DEFAULT,
    girosDisponibles = 3,
    onPremioGanado,
}) {
    const [girando, setGirando] = useState(false);

    const handleGirar = () => {
        // Lógica de giro llega en la Tarea 2 — por ahora no hace nada.
    };

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>¡Es tu momento de{'\n'}ganar!</Text>
            <Text style={styles.subtitulo}>
                Girá la ruleta y obtené premios increíbles en tu próxima compra.
            </Text>

            <View style={styles.badge}>
                <Ionicons name="refresh" size={14} color="#FF8800" />
                <Text style={styles.badgeText}>{girosDisponibles} giros disponibles</Text>
            </View>

            <View style={styles.wheelOuter}>
                <View style={styles.pointer} />
                <View style={styles.wheelPerspective}>
                    <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                        {premios.slice(0, SEGMENT_COUNT).map((premio, i) => (
                            <Path
                                key={premio.id}
                                d={segmentPath(i, RADIUS, RADIUS, RADIUS)}
                                fill={i % 2 === 0 ? '#FF8800' : '#1A1A2E'}
                                stroke="#FFB74D"
                                strokeWidth={1}
                            />
                        ))}
                        <Circle cx={RADIUS} cy={RADIUS} r={RADIUS * 0.16} fill="#FF8800" stroke="#fff" strokeWidth={2} />
                    </Svg>
                    {premios.slice(0, SEGMENT_COUNT).map((premio, i) => {
                        const pos = labelPosition(i, RADIUS, RADIUS, LABEL_RADIUS);
                        return (
                            <View
                                key={premio.id}
                                style={[styles.labelWrap, { left: pos.x - 34, top: pos.y - 24 }]}
                            >
                                <Ionicons name={premio.icon} size={18} color="#fff" />
                                <Text style={styles.labelText}>{premio.label}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            <TouchableOpacity
                style={[styles.girarBtn, girando && styles.girarBtnDisabled]}
                onPress={handleGirar}
                disabled={girando}
                activeOpacity={0.85}
            >
                <Text style={styles.girarBtnText}>¡Girar!</Text>
            </TouchableOpacity>
            <Text style={styles.footerText}>
                Tus premios se aplican automáticamente en el carrito.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 40 },
    titulo: { color: '#fff', fontSize: 28, fontFamily: 'Poppins-Bold', textAlign: 'center' },
    subtitulo: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginTop: 10, fontFamily: 'Poppins-Regular' },
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 8, marginTop: 18,
    },
    badgeText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins-SemiBold' },
    wheelOuter: { alignItems: 'center', marginTop: 32 },
    pointer: {
        width: 0, height: 0, zIndex: 10,
        borderLeftWidth: 14, borderRightWidth: 14, borderTopWidth: 20,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor: '#FFB74D', marginBottom: -6,
    },
    wheelPerspective: {
        transform: [{ perspective: 800 }, { rotateX: '8deg' }],
        shadowColor: '#000', shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
    },
    labelWrap: {
        position: 'absolute', width: 68, alignItems: 'center',
    },
    labelText: {
        color: '#fff', fontSize: 11, fontFamily: 'Poppins-SemiBold',
        textAlign: 'center', marginTop: 2,
    },
    girarBtn: {
        backgroundColor: '#fff', borderRadius: 30,
        paddingVertical: 16, paddingHorizontal: 60, marginTop: 32,
    },
    girarBtnDisabled: { opacity: 0.6 },
    girarBtnText: { color: '#FF8800', fontSize: 18, fontFamily: 'Poppins-Bold' },
    footerText: {
        color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center',
        marginTop: 14, marginBottom: 20,
    },
});
