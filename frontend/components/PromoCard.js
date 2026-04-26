import React, { memo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { imageMap } from '../assets/utils/imageMap';
import menuItemsData from '../assets/data/menuItems.json';

const toUri = (val) => {
    if (typeof val === 'string') return val;
    if (val && val.uri) return val.uri;
    return null;
};

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 72;
const CARD_HEIGHT = 215;

export const PromoCard = memo(({ promo, onPress, isActive }) => {
    const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.93)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1, duration: 500, useNativeDriver: true,
        }).start();
    }, []);

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: isActive ? 1 : 0.93,
            friction: 7, tension: 60, useNativeDriver: true,
        }).start();
    }, [isActive]);

    const imageKey = Array.isArray(promo.imageKey) ? promo.imageKey[0] : promo.imageKey;
    console.log('[PromoCard] id:', promo.id, '| imageKey:', imageKey, '| resolvedUri:', toUri(imageMap[imageKey]));
    const originalImageKey = Array.isArray(promo.originalImageKey)
        ? promo.originalImageKey[0]
        : promo.originalImageKey;
    const localItem = menuItemsData.find(m => {
        const k = Array.isArray(m.imageKey) ? m.imageKey[0] : m.imageKey;
        return m.id === promo.id || k === originalImageKey || k === imageKey;
    });
    const calories = promo.calories ?? localItem?.calories ?? null;
    const weight = promo.weight ?? localItem?.weight ?? null;
    const imgSrc = {
        uri: (typeof imageKey === 'string' && imageKey.startsWith('http'))
            ? imageKey
            : toUri(imageMap[imageKey]),
    };

    const words = (promo.name || '').split(' ');
    const nameFirst = words[0] ?? '';
    const nameRest = words.slice(1).join(' ');

    const priceStr = (promo.price || '$0').replace('$', '');

    return (
        <Animated.View style={[
            styles.outerContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}>
            {/* ── Card blanca ── */}
            <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>

                {/* ── Top row ── */}
                <View style={styles.topRow}>
                    <View style={styles.timePill}>
                        <Ionicons name="time-outline" size={12} color="#fff" />
                        <Text style={styles.timePillText}>22 mins</Text>
                    </View>
                    <View style={styles.deliveryRow}>
                        <Ionicons name="bicycle-outline" size={13} color="#888" />
                        <Text style={styles.deliveryText}>Envío gratis</Text>
                    </View>
                </View>

                {/* ── Nombre ── */}
                <View style={styles.nameBlock}>
                    <Text style={styles.nameLight}>{nameFirst} </Text>
                    <Text style={styles.nameBold} numberOfLines={2}>{nameRest}</Text>
                </View>

                {/* ── Precio ── */}
                <Text style={styles.price}>
                    <Text style={styles.priceDollar}>$</Text>
                    {priceStr}
                </Text>

                {/* ── Franja inferior ── */}
                <View style={styles.bottomStrip}>
                    <View style={styles.discountLeft}>
                        <View style={styles.discountIconCircle}>
                            <Text style={styles.discountIconText}>%</Text>
                        </View>
                        <View>
                            <Text style={styles.specialLabel}>Oferta especial</Text>
                            <Text style={styles.offText}>25% Off Precios</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.cartBtn} onPress={onPress}>
                        <Ionicons name="cart" size={19} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* ── Imagen circular (dentro de la card) ── */}
                <Image
                    source={imgSrc}
                    style={styles.floatingImage}
                    resizeMode="cover"
                />

                {/* ── Badges de calorías / peso ── */}
                {calories != null && (
                    <View style={styles.badgeCal}>
                        <Ionicons name="flame" size={11} color="#ff8700" />
                        <Text style={styles.badgeText}>{calories} cal</Text>
                    </View>
                )}
                {weight != null && (
                    <View style={styles.badgeWeight}>
                        <Ionicons name="barbell-outline" size={11} color="#888" />
                        <Text style={[styles.badgeText, { color: '#555' }]}>{weight} g</Text>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    outerContainer: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        marginRight: 16,
        overflow: 'visible',
    },

    // Card blanca
    card: {
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 22,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 6,
        justifyContent: 'space-between',
    },

    // Top row
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 4,
    },
    timePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#1C1C1E',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    timePillText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'Poppins-SemiBold',
    },
    deliveryRow: {
        zIndex: 1000,
        borderWidth: 1,
        backgroundColor: '#fff',
        borderColor: '#ddd',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    deliveryText: {
        color: '#888',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
    },

    // Nombre
    nameBlock: {
        paddingHorizontal: 14,
        maxWidth: '58%',
    },
    nameLight: {
        fontFamily: 'Poppins-Regular',
        fontSize: 20,
        color: '#111',
        lineHeight: 26,
    },
    nameBold: {
        fontFamily: 'Poppins-Bold',
        fontSize: 20,
        color: '#111',
        lineHeight: 26,
    },

    // Precio
    price: {
        paddingHorizontal: 14,
        fontFamily: 'Poppins-Bold',
        fontSize: 28,
        color: '#111',
        lineHeight: 34,
    },
    priceDollar: {
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        color: '#111',
    },

    // Franja inferior gris
    bottomStrip: {
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f5f5f5c2',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    discountLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    discountIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ff8700',
        justifyContent: 'center',
        alignItems: 'center',
    },
    discountIconText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Poppins-Bold',
    },
    specialLabel: {
        fontFamily: 'Poppins-Regular',
        fontSize: 10,
        color: '#888',
    },
    offText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 13,
        color: '#111',
    },
    cartBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#ff8700',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#ff8700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },

    // Imagen circular (dentro de la card, top-right)
    floatingImage: {
        position: 'absolute',
        right: -20,
        top: -50,
        width: 300,
        height: 300,
    },

    // Badges calorías / peso — stickers sueltos en el centro
    badgeCal: {
        position: 'absolute',
        left: '35%',
        top: '25%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'hsla(0, 0%, 100%, 0.93)',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 12,
        shadowColor: '#ff8700',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
        elevation: 4,
        transform: [{ rotate: '-13deg' }],
        zIndex: 20,
    },
    badgeWeight: {
        position: 'absolute',
        left: '35%',
        top: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.93)',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        transform: [{ rotate: '9deg' }],
        zIndex: 20,
    },
    badgeText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 11,
        color: '#ff8700',
    },
});
