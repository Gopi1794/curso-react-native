// frontend/components/rewards/SpinWheel.js
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal, Image } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Lottie from 'lottie-react-native';
import * as Clipboard from 'expo-clipboard';
import API from '../../services/api';
import { showErrorMessage } from '../FlashMessageWrapper';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps,
    withSequence,
    withTiming,
    withRepeat,
    Easing,
    runOnJS,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import {
    SEGMENT_COUNT,
    segmentPath,
    segmentMidAngle,
    targetRotationForIndex,
} from './wheelMath';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(screenWidth - 60, 340);
const RADIUS = WHEEL_SIZE / 2;
const LABEL_RADIUS = RADIUS * 0.62;
const RING_SIZE = WHEEL_SIZE + 20;
const RING_RADIUS = RING_SIZE / 2;
const BULB_COUNT = 20;
const BULB_ORBIT = RING_RADIUS - 6;
const RING_BULBS = Array.from({ length: BULB_COUNT }).map((_, i) => {
    const angle = (360 / BULB_COUNT) * i;
    return {
        x: RING_RADIUS + BULB_ORBIT * Math.cos((angle * Math.PI) / 180),
        y: RING_RADIUS + BULB_ORBIT * Math.sin((angle * Math.PI) / 180),
    };
});
const toRad = (deg) => {
    'worklet';
    return (deg * Math.PI) / 180;
};

const esGajoVacio = (premio) => !premio?.label;

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
    restauranteId,
    onPremioGanado,
}) {
    const [girando, setGirando] = useState(false);
    const [premioGanado, setPremioGanado] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [codigoGanado, setCodigoGanado] = useState(null);
    const [copiado, setCopiado] = useState(false);
    const rotation = useSharedValue(0);
    const girandoRef = useRef(false);
    const confettiAnim = useRef(null);
    const pulse = useSharedValue(1);

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.03, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) })
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

    useEffect(() => {
        if (modalVisible && premioGanado && !esGajoVacio(premioGanado)) {
            confettiAnim.current?.play();
        }
    }, [modalVisible, premioGanado]);

    const mostrarResultado = (premio) => {
        setPremioGanado(premio);
        setModalVisible(true);
        setGirando(false);
        girandoRef.current = false;
        if (!esGajoVacio(premio)) {
            onPremioGanado?.(premio);
        }
    };

    const resetGirando = () => {
        setGirando(false);
        girandoRef.current = false;
    };

    const handleGirar = () => {
        if (girandoRef.current) return;
        girandoRef.current = true;
        setGirando(true);
        setCodigoGanado(null);
        setCopiado(false);

        API.restaurants.girarRuleta(restauranteId)
            .then((res) => {
                if (!res.success) {
                    girandoRef.current = false;
                    setGirando(false);
                    showErrorMessage('No se pudo girar', res.message || 'Intentá de nuevo más tarde');
                    return;
                }

                const finalTarget = targetRotationForIndex(res.posicionGanadora, rotation.value, 4);
                const winner = res.premio
                    ? { ...res.premio, posicion: res.posicionGanadora }
                    : { label: null, icon: null, posicion: res.posicionGanadora };
                const codigo = res.codigo;

                rotation.value = withSequence(
                    withTiming(finalTarget - 15, {
                        duration: 2800,
                        easing: Easing.out(Easing.cubic),
                    }),
                    withTiming(finalTarget + 10, { duration: 220, easing: Easing.linear }),
                    withTiming(finalTarget, { duration: 180, easing: Easing.out(Easing.quad) }, (finished) => {
                        if (finished) {
                            runOnJS(setCodigoGanado)(codigo);
                            runOnJS(mostrarResultado)(winner);
                        } else {
                            runOnJS(resetGirando)();
                        }
                    })
                );
            })
            .catch(() => {
                girandoRef.current = false;
                setGirando(false);
                showErrorMessage('Sin conexión', 'No se pudo conectar con el servidor');
            });
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.headerText}>
                    <Text style={styles.titulo}>¡Es tu momento{'\n'}<Text style={styles.tituloAcento}>de GANAR!</Text></Text>
                    <Text style={styles.subtitulo}>
                        Girá la ruleta y obtené premios increíbles en tu próxima compra.
                    </Text>
                    <View style={styles.badge}>
                        <Ionicons name="refresh" size={14} color="#FF8800" />
                        <Text style={styles.badgeText}>{girosDisponibles} giros disponibles</Text>
                    </View>
                </View>
                <View style={styles.giftArea}>
                    <Image
                        source={require('../../assets/img/boxrulete.png')}
                        style={styles.giftBoxImage}
                        resizeMode="contain"
                    />
                </View>
            </View>

            <View style={styles.wheelOuter}>
                <View style={styles.pointer} />
                <View style={styles.wheelStack}>
                    <View style={styles.wheelPerspective}>
                        <Animated.View style={animatedWheelStyle}>
                            <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                                {premios.slice(0, SEGMENT_COUNT).map((premio, i) => (
                                    <Path
                                        key={premio.id ?? premio.posicion ?? i}
                                        d={segmentPath(i, RADIUS, RADIUS, RADIUS)}
                                        fill={esGajoVacio(premio) ? '#4A4A55' : (i % 2 === 0 ? '#FF8800' : '#1A1A2E')}
                                        stroke="#FFB74D"
                                        strokeWidth={1}
                                    />
                                ))}
                            </Svg>
                        </Animated.View>
                        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringFrame} pointerEvents="none">
                            <Circle
                                cx={RING_RADIUS} cy={RING_RADIUS} r={RING_RADIUS - 6}
                                stroke="#FFD700" strokeWidth={8} fill="none"
                            />
                            {RING_BULBS.map((bulb, i) => (
                                <RingBulb key={i} x={bulb.x} y={bulb.y} />
                            ))}
                        </Svg>
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.centerHub,
                                { left: RADIUS - RADIUS * 0.16, top: RADIUS - RADIUS * 0.16, width: RADIUS * 0.32, height: RADIUS * 0.32, borderRadius: RADIUS * 0.16 },
                                pulseStyle,
                            ]}
                        >
                            <Ionicons name="star" size={RADIUS * 0.16} color="#FF8800" />
                        </Animated.View>
                        {premios.slice(0, SEGMENT_COUNT).map((premio, i) => (
                            !esGajoVacio(premio) && (
                                <Label key={premio.id ?? premio.posicion ?? i} index={i} premio={premio} rotation={rotation} />
                            )
                        ))}
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={girando && styles.girarBtnDisabled}
                onPress={handleGirar}
                disabled={girando}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={['#FFA000', '#FF6B00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.girarBtn}
                >
                    <Text style={styles.girarBtnText}>¡GIRAR!</Text>
                </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.footerText}>
                Tus premios se aplican automáticamente en el carrito.
            </Text>

            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalBackdrop}>
                    {premioGanado && !esGajoVacio(premioGanado) && (
                        <Lottie
                            ref={confettiAnim}
                            source={require('../../assets/animations/conffeti.json')}
                            autoPlay={false}
                            loop={false}
                            style={styles.confettiAnimation}
                            resizeMode="cover"
                        />
                    )}
                    <View style={styles.modalCard}>
                        {premioGanado && !esGajoVacio(premioGanado) && (
                            <>
                                <Ionicons name={premioGanado.icon || 'gift-outline'} size={48} color="#FF8800" />
                                <Text style={styles.modalTitle}>¡Ganaste {premioGanado.label}!</Text>
                                {codigoGanado && (
                                    <>
                                        <TouchableOpacity
                                            style={styles.codigoBox}
                                            onPress={async () => {
                                                await Clipboard.setStringAsync(codigoGanado);
                                                setCopiado(true);
                                            }}
                                        >
                                            <Text style={styles.codigoText}>{codigoGanado}</Text>
                                            <Ionicons name={copiado ? 'checkmark' : 'copy-outline'} size={18} color="#FF8800" />
                                        </TouchableOpacity>
                                        <Text style={styles.codigoVence}>Vence en 7 días</Text>
                                    </>
                                )}
                            </>
                        )}
                        {premioGanado && esGajoVacio(premioGanado) && (
                            <>
                                <Ionicons name="sad-outline" size={48} color="#9A9AA5" />
                                <Text style={styles.modalTitle}>¡Sin premio esta vez!</Text>
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
    container: {
        alignItems: 'center', paddingHorizontal: 20, paddingTop: 32, paddingBottom: 24,
        backgroundColor: '#fff8ed00', borderRadius: 32,
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
        alignSelf: 'stretch',
    },
    headerText: { flex: 1, paddingRight: 12 },
    titulo: { color: '#ffffff', fontSize: 26, fontFamily: 'Poppins-Bold', textAlign: 'left' },
    tituloAcento: { color: '#FF8800' },
    subtitulo: { color: '#7A7A85', fontSize: 14, textAlign: 'left', marginTop: 10, fontFamily: 'Poppins-Regular' },
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#fff', borderRadius: 20, alignSelf: 'flex-start',
        paddingHorizontal: 14, paddingVertical: 8, marginTop: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
    },
    badgeText: { color: '#FF8800', fontSize: 13, fontFamily: 'Poppins-SemiBold' },
    giftArea: {
        width: 170, height: 170, alignItems: 'center', justifyContent: 'center', marginTop: -20, marginRight: -20,
    },
    giftBoxImage: {
        top: 40,
        width: '100%', height: '100%',
    },

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
    ringFrame: {
        position: 'absolute',
        left: (WHEEL_SIZE - RING_SIZE) / 2, top: (WHEEL_SIZE - RING_SIZE) / 2,
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
        borderRadius: 30,
        paddingVertical: 16, paddingHorizontal: 60, marginTop: 32,
        shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
    },
    girarBtnDisabled: { opacity: 0.6 },
    girarBtnText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins-Bold', textAlign: 'center' },
    footerText: {
        color: '#9A9AA5', fontSize: 12, textAlign: 'center',
        marginTop: 14,
    },
    modalBackdrop: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center', alignItems: 'center',
    },
    modalCard: {
        backgroundColor: '#1A1A2E', borderRadius: 24,
        paddingVertical: 32, paddingHorizontal: 28,
        alignItems: 'center', width: '80%',
    },
    confettiAnimation: {
        position: 'absolute',
        width: screenWidth * 1.2,
        height: screenHeight * 0.6,
        top: -screenHeight * 0.15,
        left: -screenWidth * 0.1,
    },
    modalTitle: {
        color: '#fff', fontSize: 20, fontFamily: 'Poppins-Bold',
        textAlign: 'center', marginTop: 12, marginBottom: 20,
    },
    codigoBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFF3E0', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20,
    },
    codigoText: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#1A1A2E', letterSpacing: 1 },
    codigoVence: {
        fontSize: 11, color: '#9A9AA5', marginTop: -12, marginBottom: 16,
        fontFamily: 'Poppins-Regular',
    },
    modalCloseBtn: {
        backgroundColor: '#FF8800', borderRadius: 20,
        paddingVertical: 10, paddingHorizontal: 32,
    },
    modalCloseBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins-Bold' },
    centerHub: {
        position: 'absolute', backgroundColor: '#fff',
        borderWidth: 2, borderColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
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

function RingBulb({ x, y }) {
    const twinkle = useSharedValue(1);

    useEffect(() => {
        const delay = Math.random() * 1200;
        const id = setTimeout(() => {
            twinkle.value = withRepeat(
                withSequence(
                    withTiming(0.25, { duration: 400 + Math.random() * 400, easing: Easing.inOut(Easing.quad) }),
                    withTiming(1, { duration: 400 + Math.random() * 400, easing: Easing.inOut(Easing.quad) })
                ),
                -1,
                false
            );
        }, delay);
        return () => clearTimeout(id);
    }, []);

    const animatedProps = useAnimatedProps(() => ({
        opacity: twinkle.value,
    }));

    return (
        <AnimatedCircle
            cx={x} cy={y} r={4}
            fill="#FFF3C4" stroke="#FFD700" strokeWidth={1}
            animatedProps={animatedProps}
        />
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
            <Ionicons name={premio.icon || 'gift-outline'} size={18} color="#fff" />
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
