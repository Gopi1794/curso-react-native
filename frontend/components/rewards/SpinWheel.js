// frontend/components/rewards/SpinWheel.js
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal } from 'react-native';
import Svg, { Path, Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    withRepeat,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import {
    SEGMENT_COUNT,
    segmentPath,
    segmentMidAngle,
    targetRotationForIndex,
} from './wheelMath';

const { width: screenWidth } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(screenWidth - 60, 340);
const RADIUS = WHEEL_SIZE / 2;
const LABEL_RADIUS = RADIUS * 0.62;
const GLOW_SIZE = WHEEL_SIZE * 1.9;
const GLOW_CORE_SIZE = WHEEL_SIZE * 1.05;
const toRad = (deg) => {
    'worklet';
    return (deg * Math.PI) / 180;
};

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
    const [premioGanado, setPremioGanado] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const rotation = useSharedValue(0);
    const girandoRef = useRef(false);
    const pulse = useSharedValue(1);
    const glow = useSharedValue(0.6);

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.03, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            false
        );
        // Flicker irregular (no un pulso parejo) para que la luz de fondo "titile"
        glow.value = withRepeat(
            withSequence(
                withTiming(0.9, { duration: 120, easing: Easing.inOut(Easing.quad) }),
                withTiming(0.5, { duration: 180, easing: Easing.inOut(Easing.quad) }),
                withTiming(1, { duration: 90, easing: Easing.inOut(Easing.quad) }),
                withTiming(0.6, { duration: 220, easing: Easing.inOut(Easing.quad) }),
                withTiming(0.85, { duration: 140, easing: Easing.inOut(Easing.quad) }),
                withTiming(0.55, { duration: 200, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            false
        );
    }, []);

    const animatedWheelStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glow.value,
    }));

    const mostrarResultado = (premio) => {
        setPremioGanado(premio);
        setModalVisible(true);
        setGirando(false);
        girandoRef.current = false;
        onPremioGanado?.(premio);
    };

    const resetGirando = () => {
        setGirando(false);
        girandoRef.current = false;
    };

    const handleGirar = () => {
        if (girandoRef.current) return;
        girandoRef.current = true;
        setGirando(true);

        const items = premios.slice(0, SEGMENT_COUNT);
        const winnerIndex = Math.floor(Math.random() * items.length);
        const winner = items[winnerIndex];
        const finalTarget = targetRotationForIndex(winnerIndex, rotation.value, 4);

        rotation.value = withSequence(
            withTiming(finalTarget - 15, {
                duration: 2800,
                easing: Easing.out(Easing.cubic),
            }),
            withTiming(finalTarget + 10, { duration: 220, easing: Easing.linear }),
            withTiming(finalTarget, { duration: 180, easing: Easing.out(Easing.quad) }, (finished) => {
                if (finished) {
                    runOnJS(mostrarResultado)(winner);
                } else {
                    runOnJS(resetGirando)();
                }
            })
        );
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
                <View style={styles.wheelStack}>
                    <Animated.View pointerEvents="none" style={[styles.glowWrap, glowStyle]}>
                        <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
                            <Defs>
                                <RadialGradient id="glowHalo" cx="50%" cy="50%" r="50%">
                                    <Stop offset="0%" stopColor="#FFC400" stopOpacity="0.55" />
                                    <Stop offset="45%" stopColor="#FF8800" stopOpacity="0.25" />
                                    <Stop offset="100%" stopColor="#FF8800" stopOpacity="0" />
                                </RadialGradient>
                            </Defs>
                            <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#glowHalo)" />
                        </Svg>
                        <Svg width={GLOW_CORE_SIZE} height={GLOW_CORE_SIZE} style={styles.glowCore}>
                            <Defs>
                                <RadialGradient id="glowCore" cx="50%" cy="50%" r="50%">
                                    <Stop offset="0%" stopColor="#FFF3C4" stopOpacity="0.95" />
                                    <Stop offset="35%" stopColor="#FFD700" stopOpacity="0.75" />
                                    <Stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
                                </RadialGradient>
                            </Defs>
                            <Circle cx={GLOW_CORE_SIZE / 2} cy={GLOW_CORE_SIZE / 2} r={GLOW_CORE_SIZE / 2} fill="url(#glowCore)" />
                        </Svg>
                    </Animated.View>
                    {SPARKLE_POSITIONS.map((pos, i) => (
                        <Sparkle key={i} {...pos} />
                    ))}
                    <View style={styles.wheelPerspective}>
                    <Animated.View style={animatedWheelStyle}>
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
                        </Svg>
                    </Animated.View>
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.centerHub,
                            { left: RADIUS - RADIUS * 0.16, top: RADIUS - RADIUS * 0.16, width: RADIUS * 0.32, height: RADIUS * 0.32, borderRadius: RADIUS * 0.16 },
                            pulseStyle,
                        ]}
                    >
                        <Ionicons name="star" size={RADIUS * 0.16} color="#fff" />
                    </Animated.View>
                    {premios.slice(0, SEGMENT_COUNT).map((premio, i) => (
                        <Label key={premio.id} index={i} premio={premio} rotation={rotation} />
                    ))}
                    </View>
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

            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        {premioGanado && (
                            <>
                                <Ionicons name={premioGanado.icon} size={48} color="#FF8800" />
                                <Text style={styles.modalTitle}>¡Ganaste {premioGanado.label}!</Text>
                            </>
                        )}
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.modalCloseBtnText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    wheelStack: {
        width: WHEEL_SIZE, height: WHEEL_SIZE,
        alignItems: 'center', justifyContent: 'center',
    },
    glowWrap: {
        position: 'absolute',
        width: GLOW_SIZE, height: GLOW_SIZE,
        left: (WHEEL_SIZE - GLOW_SIZE) / 2, top: (WHEEL_SIZE - GLOW_SIZE) / 2,
    },
    glowCore: {
        position: 'absolute',
        left: (GLOW_SIZE - GLOW_CORE_SIZE) / 2, top: (GLOW_SIZE - GLOW_CORE_SIZE) / 2,
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
    modalBackdrop: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center', alignItems: 'center',
    },
    modalCard: {
        backgroundColor: '#1A1A2E', borderRadius: 24,
        paddingVertical: 32, paddingHorizontal: 28,
        alignItems: 'center', width: '80%',
    },
    modalTitle: {
        color: '#fff', fontSize: 20, fontFamily: 'Poppins-Bold',
        textAlign: 'center', marginTop: 12, marginBottom: 20,
    },
    modalCloseBtn: {
        backgroundColor: '#FF8800', borderRadius: 20,
        paddingVertical: 10, paddingHorizontal: 32,
    },
    modalCloseBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins-Bold' },
    centerHub: {
        position: 'absolute', backgroundColor: '#FF8800',
        borderWidth: 2, borderColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
    },
    background: { flex: 1, backgroundColor: '#1A1A2E' },
    confettiPiece: {
        position: 'absolute', width: 10, height: 16, borderRadius: 3,
    },
});

const CONFETTI_PIECES = [
    { top: '8%', left: '10%', rotate: '20deg', color: '#FF8800' },
    { top: '15%', left: '85%', rotate: '-15deg', color: '#FFB74D' },
    { top: '35%', left: '5%', rotate: '40deg', color: '#FF5500' },
    { top: '55%', left: '90%', rotate: '-30deg', color: '#FF8800' },
    { top: '75%', left: '8%', rotate: '10deg', color: '#FFB74D' },
    { top: '85%', left: '88%', rotate: '-20deg', color: '#FF5500' },
];

const SPARKLE_POSITIONS = [
    { left: RADIUS - GLOW_SIZE * 0.42, top: RADIUS - GLOW_SIZE * 0.4, size: 16 },
    { left: RADIUS + GLOW_SIZE * 0.3, top: RADIUS - GLOW_SIZE * 0.44, size: 12 },
    { left: RADIUS - GLOW_SIZE * 0.46, top: RADIUS + GLOW_SIZE * 0.18, size: 10 },
    { left: RADIUS + GLOW_SIZE * 0.4, top: RADIUS + GLOW_SIZE * 0.22, size: 14 },
    { left: RADIUS - GLOW_SIZE * 0.1, top: RADIUS - GLOW_SIZE * 0.47, size: 11 },
];

function Sparkle({ left, top, size }) {
    const twinkle = useSharedValue(0.3);

    useEffect(() => {
        const delay = Math.random() * 600;
        const id = setTimeout(() => {
            twinkle.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 350 + Math.random() * 300, easing: Easing.inOut(Easing.quad) }),
                    withTiming(0.2, { duration: 500 + Math.random() * 400, easing: Easing.inOut(Easing.quad) })
                ),
                -1,
                false
            );
        }, delay);
        return () => clearTimeout(id);
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: twinkle.value,
        transform: [{ scale: 0.6 + twinkle.value * 0.4 }],
    }));

    return (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left, top }, style]}>
            <Ionicons name="sparkles" size={size} color="#FFF3C4" />
        </Animated.View>
    );
}

function Label({ index, premio, rotation }) {
    const mid = segmentMidAngle(index);

    const style = useAnimatedStyle(() => {
        const angle = mid + rotation.value;
        const x = RADIUS + LABEL_RADIUS * Math.cos(toRad(angle));
        const y = RADIUS + LABEL_RADIUS * Math.sin(toRad(angle));
        return {
            left: x - 34,
            top: y - 24,
        };
    });

    return (
        <Animated.View style={[styles.labelWrap, style]}>
            <Ionicons name={premio.icon} size={18} color="#fff" />
            <Text style={styles.labelText}>{premio.label}</Text>
        </Animated.View>
    );
}

function ConfettiPiece({ top, left, rotate, color }) {
    const drift = useSharedValue(0);

    useEffect(() => {
        drift.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 4000 + Math.random() * 1500, easing: Easing.inOut(Easing.sin) }),
                withTiming(0, { duration: 4000 + Math.random() * 1500, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            false
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateY: drift.value * -10 },
            { rotate },
        ],
    }));

    return (
        <Animated.View
            pointerEvents="none"
            style={[styles.confettiPiece, { top, left, backgroundColor: color }, style]}
        />
    );
}

export function SpinWheelBackground({ children }) {
    return (
        <View style={styles.background}>
            {CONFETTI_PIECES.map((p, i) => (
                <ConfettiPiece key={i} {...p} />
            ))}
            {children}
        </View>
    );
}
