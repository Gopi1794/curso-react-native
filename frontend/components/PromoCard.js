import React, { memo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import Lottie from 'lottie-react-native';
import { imageMap } from '../assets/utils/imageMap';

const toUri = (val) => {
    if (typeof val === 'string') return val;
    if (val && val.uri) return val.uri;
    return null;
};

const { width: screenWidth } = Dimensions.get('window');

const lottie = {
    discount: require('../assets/animations/discount.json'),
};

// Función para obtener imágenes de promos


export const PromoCard = memo(({ promo, onPress, isActive }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View
            style={[
                styles.promoCardContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }]
                }
            ]}
        >
            <TouchableOpacity
                style={[
                    styles.promoCard,
                    isActive && styles.promoCardActive
                ]}
                activeOpacity={0.9}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                {/* Badge de PROMO */}
                <View style={styles.promoBadge}>
                    <Lottie
                        source={lottie.discount}
                        autoPlay
                        loop
                        style={styles.discountAnimation}
                    />
                    <Text style={styles.promoBadgeText}>PROMO</Text>
                </View>

                <Image
                    source={{ uri: toUri(imageMap[Array.isArray(promo.imageKey) ? promo.imageKey[0] : promo.imageKey]) }}
                    style={styles.promoImage}
                    resizeMode="cover"
                />

                {/* Overlay con gradiente */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.promoOverlay}
                />

                {/* Información de la promo usando datos reales */}
                <View style={styles.promoInfo}>
                    <Text style={styles.promoTitle}>OFERTA ESPECIAL</Text>
                    <Text style={styles.promoDescription}>
                        {promo.descriptionText}
                    </Text>
                    <View style={styles.promoPriceContainer}>
                        <Text style={styles.promoNewPrice}>{promo.price}</Text>
                    </View>
                    <View style={styles.promoTimeContainer}>
                        <Feather name="clock" size={14} color="#FFD700" />
                        <Text style={styles.promoTimeText}>Oferta por tiempo limitado</Text>
                    </View>
                </View>

                {/* Botón de acción */}
                <TouchableOpacity
                    style={styles.promoActionButton}
                    onPress={onPress}
                >
                    <Text style={styles.promoActionText}>VER OFERTA</Text>
                    <Feather name="arrow-right" size={16} color="white" />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    promoCardContainer: {
        width: screenWidth - 80,
        marginRight: 15,
    },
    promoCard: {
        height: 220,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    promoCardActive: {
        shadowColor: '#FF8000',
        shadowOpacity: 1,
    },
    promoBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(255, 128, 0, 0.95)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    discountAnimation: {
        width: 25,
        height: 25,
        marginRight: 4,
    },
    promoBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    promoImage: {
        width: '100%',
        height: '100%',
    },
    promoOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    promoInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        zIndex: 5,
    },
    promoTitle: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    promoDescription: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    promoPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    promoOldPrice: {
        color: '#FF6B6B',
        fontSize: 12,
        fontWeight: '500',
        textDecorationLine: 'line-through',
        marginRight: 8,
    },
    promoNewPrice: {
        color: '#4CD964',
        fontSize: 18,
        fontWeight: 'bold',
    },
    promoTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    promoTimeText: {
        color: '#FFD700',
        fontSize: 11,
        fontWeight: '500',
        marginLeft: 4,
    },
    promoActionButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(255, 128, 0, 0.95)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    promoActionText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        marginRight: 4,
    },
});