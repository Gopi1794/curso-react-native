// screens/SplashScreen.js (versión con overlay para marca de agua)
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import LottieView from 'lottie-react-native';

const AnimatedSplashScreen = ({ onAnimationFinish }) => {
    const animationRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [showLoadingText, setShowLoadingText] = useState(false);

    useEffect(() => {
        if (animationRef.current) {
            animationRef.current.play();

            const textTimer = setTimeout(() => {
                setShowLoadingText(true);
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }).start();
            }, 2000);

            return () => clearTimeout(textTimer);
        }
    }, []);

    return (
        <View style={styles.container}>
            {/* Contenedor principal con overlay para tapar marca de agua */}
            <View style={styles.animationContainer}>
                <LottieView
                    ref={animationRef}
                    source={require('../assets/animations/logo_animated.json')}
                    autoPlay
                    loop={false}
                    style={styles.animation}
                    onAnimationFinish={onAnimationFinish}
                />

                {/* Overlay blanco para tapar marca de agua en esquina inferior izquierda */}
                <View style={styles.watermarkOverlay} />
            </View>

            {showLoadingText && (
                <Animated.Text style={[styles.loadingText, { opacity: fadeAnim }]}>
                    Cargando...
                </Animated.Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffffff',
    },
    animationContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    animation: {
        left: 15,
        width: 500,
        height: 500,
    },
    // Overlay para tapar la marca de agua
    watermarkOverlay: {
        position: 'absolute',
        bottom: 10,    // Ajusta según posición de la marca de agua
        right: 10,      // Ajusta según posición de la marca de agua
        width: 120,    // Ancho suficiente para cubrir la marca
        height: 60,    // Alto suficiente para cubrir la marca
        backgroundColor: '#ffffffff', // Mismo color de fondo
        zIndex: 10,    // Para que quede por encima
    },
    loadingText: {
        top: 20,
        fontSize: 16,
        color: '#bc5e00ff',
        fontFamily: 'Inter',
    },
});

export default AnimatedSplashScreen;