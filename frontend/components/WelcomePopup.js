import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Animated,
    Dimensions
} from 'react-native';
import Lottie from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const lottie = {
    conffeti: require('../assets/animations/conffeti.json'),
}

const WelcomePopup = ({ showWelcomePopup, setShowWelcomePopup }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const confettiAnim = useRef(null);

    useEffect(() => {
        if (showWelcomePopup) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }).start();

            if (confettiAnim.current) {
                confettiAnim.current.play();
            }

            const timer = setTimeout(() => {
                handleClose();
            }, 5000);

            return () => clearTimeout(timer);
        } else {
            scaleAnim.setValue(0);
        }
    }, [showWelcomePopup]);

    const handleClose = () => {
        Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setShowWelcomePopup(false);
            }
        });
    };

    return (
        <Modal
            visible={showWelcomePopup}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}
            hardwareAccelerated={true}
        >
            <View style={styles.modalContainer}>
                {/* SOLO confetti.json - que SÍ existe */}
                <Lottie
                    ref={confettiAnim}
                    source={lottie.conffeti}
                    autoPlay={true}
                    loop={false}
                    style={styles.confettiAnimation}
                    resizeMode="cover"
                />
                {/* ELIMINADO: stars.json porque no existe */}
                {/* <Lottie
                    source={require('../assets/animationrrs/stars.json')}
                    autoPlay={true}
                    loop={true}
                    style={styles.starsAnimation}
                    speed={0.8}
                /> */}

                <Animated.View
                    style={[
                        styles.contentContainer,
                        { transform: [{ scale: scaleAnim }] }
                    ]}
                >
                    <Image
                        style={styles.imgPopup}
                        source={require('../assets/img/img-popup/chef-popup.png')}
                        resizeMode="contain"
                    />

                    <View style={styles.popup}>
                        <Image
                            style={styles.logoImagePopup}
                            source={require('../assets/adaptive-icon.png')}
                            resizeMode="contain"
                        />

                        <Text style={styles.welcomeText}>¡Bienvenido!</Text>
                        <Ionicons name="happy-outline" size={40} color="#ff8700" style={styles.welcomeIcon} />

                        <Text style={styles.message}>Has iniciado sesión correctamente</Text>

                        {/* ELIMINADO: success.json porque probablemente tampoco existe */}
                        {/* <Lottie
                            source={require('../assets/animations/success.json')}
                            autoPlay={true}
                            loop={false}
                            style={styles.successAnimation}
                        /> */}

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.closeButtonText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        paddingBottom: 150,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.67)',
    },
    confettiAnimation: {
        position: 'absolute',
        width: width * 1.2,
        height: height * 1.2,
        top: -height * 0.1,
        left: -width * 0.1,
        zIndex: 9,
    },
    contentContainer: {
        alignItems: 'center',
        zIndex: 9,
    },
    imgPopup: {
        position: 'absolute',
        width: 380,
        height: 500,
        shadowColor: '#191919ff',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.25,
    },
    popup: {
        top: 100,
        width: 280,
        padding: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 12,
        borderWidth: 2,
        borderColor: 'rgba(255, 135, 0, 0.3)',
    },
    logoImagePopup: {
        width: 40,
        height: 40,
        marginBottom: 12,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ff8700',
        textAlign: 'center',
        marginBottom: 5,
    },
    welcomeIcon: {
        marginBottom: 10,
    },
    message: {
        fontSize: 16,
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
        lineHeight: 22,
        fontWeight: '500',
    },
    closeButton: {
        backgroundColor: '#D80000',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        minWidth: 120,
        marginTop: 10,
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
    },
});

export default WelcomePopup;