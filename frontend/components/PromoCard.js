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
const CARD_HEIGHT = 230;
const BOTTOM_STRIP_H = 52;
const IMAGE_AREA_H = CARD_HEIGHT - BOTTOM_STRIP_H;

export const PromoCard = memo(({ promo, onPress, isActive, width }) => {
    const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.93)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const floatCal = useRef(new Animated.Value(0)).current;
    const floatWeight = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1, duration: 250, useNativeDriver: true,
        }).start();

        const drift = (val, to, dur) =>
            Animated.timing(val, { toValue: to, duration: dur, useNativeDriver: true });

        Animated.loop(
            Animated.sequence([
                Animated.parallel([drift(floatCal, -5, 1800), drift(floatWeight, 4, 2200)]),
                Animated.parallel([drift(floatCal, 3, 1600), drift(floatWeight, -5, 2000)]),
                Animated.parallel([drift(floatCal, 0, 1700), drift(floatWeight, 0, 1900)]),
            ])
        ).start();
    }, []);

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: isActive ? 1 : 0.93,
            friction: 7, tension: 60, useNativeDriver: true,
        }).start();
    }, [isActive]);

    const imageKey = Array.isArray(promo.imageKey) ? promo.imageKey[0] : promo.imageKey;
    const originalImageKey = Array.isArray(promo.originalImageKey)
        ? promo.originalImageKey[0]
        : promo.originalImageKey;

    const localItem = menuItemsData.find(m => {
        const k = Array.isArray(m.imageKey) ? m.imageKey[0] : m.imageKey;
        return m.id === promo.id || k === originalImageKey || k === imageKey;
    });

    const calories = promo.calories ?? localItem?.calories ?? null;
    const weight = promo.weight ?? localItem?.weight ?? null;
    const discountPct = localItem?.discountPercentage ?? promo.discountPercentage ?? null;

    const imgSrc = {
        uri: (typeof imageKey === 'string' && imageKey.startsWith('http'))
            ? imageKey
            : toUri(imageMap[imageKey]),
    };

    const currentPrice = promo.basePrice ?? parseFloat((promo.price || '0').toString().replace('$', '')) ?? 0;
    const originalPrice = promo.originalPrice ?? localItem?.originalPrice ?? (currentPrice + 2000);

    const priceStr = (promo.price || '$0').toString().replace('$', '');
    const originalPriceStr = originalPrice.toString().replace('$', '');

    const nameWords = (promo.name || '').toUpperCase().split(' ');
    const nameFontSize = nameWords.length >= 3 ? 14 : 18;
    const nameLineHeight = nameWords.length >= 3 ? 18 : 23;

    return (
        <Animated.View style={[
            styles.outerContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            width ? { width } : null,
        ]}>
            <TouchableOpacity
                style={[styles.card, width ? { width } : null]}
                onPress={onPress}
                activeOpacity={0.95}
                accessibilityRole="button"
                accessibilityLabel={`Ver promoción ${promo.name}`}
            >

                {/* ── Top row: pills ── */}
                <View style={styles.topRow}>
                    <View style={styles.timePill}>
                        <Ionicons name="time-outline" size={12} color="#fff" />
                        <Text style={styles.timePillText}>22 mins</Text>
                    </View>
                    <View style={styles.deliveryPill}>
                        <Ionicons name="bicycle-outline" size={13} color="#666" />
                        <Text style={styles.deliveryText}>Envío gratis</Text>
                    </View>
                </View>

                {/* ── Nombre ── */}
                <View style={styles.nameBlock}>
                    <Text
                        style={[styles.nameLine, { fontSize: nameFontSize, lineHeight: nameLineHeight }]}
                        numberOfLines={2}
                    >
                        {promo.name?.toUpperCase()}
                    </Text>
                </View>

                {/* ── Precios ── */}
                <View style={styles.priceRow}>
                    <Text style={styles.price}>
                        <Text style={styles.priceDollar}>$</Text>
                        {priceStr}
                    </Text>
                    {originalPriceStr && (
                        <Text style={styles.originalPrice}>${originalPriceStr}</Text>
                    )}
                </View>

                {/* ── Imagen: lado derecho desde arriba hasta el strip ── */}
                <Image
                    source={imgSrc}
                    style={[
                        styles.foodImage,
                        promo.imageScale ? {
                            width: CARD_WIDTH * 0.58 * promo.imageScale,
                            height: (IMAGE_AREA_H + 10) * promo.imageScale,
                        } : null,
                    ]}
                    resizeMode="cover"
                />

                {/* ── Badges flotantes ── */}
                {calories != null && (
                    <Animated.View style={[
                        styles.badgeCal,
                        { transform: [{ rotate: '-13deg' }, { translateY: floatCal }] },
                    ]}>
                        <Ionicons name="flame" size={11} color="#ff8700" />
                        <Text style={styles.badgeTextOrange}>{calories} cal</Text>
                    </Animated.View>
                )}
                {weight != null && (
                    <Animated.View style={[
                        styles.badgeWeight,
                        { transform: [{ rotate: '9deg' }, { translateY: floatWeight }] },
                    ]}>
                        <Ionicons name="barbell-outline" size={11} color="#666" />
                        <Text style={styles.badgeTextGray}>{weight} g</Text>
                    </Animated.View>
                )}

                {/* ── Franja inferior ── */}
                <View style={styles.bottomStrip}>
                    <View style={styles.discountLeft}>
                        <View style={styles.discountCircle}>
                            <Text style={styles.discountIcon}>%</Text>
                        </View>
                        <View>
                            <Text style={styles.specialLabel}>Oferta especial</Text>
                            <Text style={styles.offText}>
                                {discountPct ? `${discountPct}% Off Precios` : '25% Off Precios'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.cartBtn}>
                        <Ionicons name="cart" size={19} color="#fff" />
                    </View>
                </View>

            </TouchableOpacity>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    outerContainer: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        marginRight: 16,
    },

    card: {
        width: '100%',
        height: '100%',
        backgroundColor: '#FFF7ED',
        borderRadius: 22,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
        elevation: 6,
    },

    // ── Top row ──
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 6,
        zIndex: 10,
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
    deliveryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        zIndex: 10,
    },
    deliveryText: {
        color: '#666',
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
    },

    // ── Nombre ──
    nameBlock: {
        paddingHorizontal: 14,
        paddingBottom: 2,
        maxWidth: '52%',
        zIndex: 10,
    },
    nameLine: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        color: '#111',
        lineHeight: 23,
    },

    // ── Precio ──
    priceRow: {
        position: 'absolute',
        left: 0,
        bottom: 6 + BOTTOM_STRIP_H + 8,
        paddingHorizontal: 14,
        zIndex: 10,
    },
    price: {
        fontFamily: 'Poppins-Bold',
        fontSize: 28,
        color: '#FF6B00',
        lineHeight: 34,
    },
    priceDollar: {
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        color: '#FF6B00',
    },
    originalPrice: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#aaa',
        textDecorationLine: 'line-through',
        lineHeight: 18,
    },

    // ── Imagen: mitad derecha desde arriba hasta el strip ──
    foodImage: {
        position: 'absolute',
        right: 10,
        top: 10,
        width: CARD_WIDTH * 0.58,
        height: IMAGE_AREA_H + 10,
        zIndex: 1,
    },

    // ── Badges — siempre dentro de la zona de imagen (derecha) ──
    badgeCal: {
        position: 'absolute',
        left: '38%',
        top: '14%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 12,
        shadowColor: '#ff8700',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 20,
    },
    badgeWeight: {
        position: 'absolute',
        left: '36%',
        top: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 20,
    },
    badgeTextOrange: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 11,
        color: '#ff8700',
    },
    badgeTextGray: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 11,
        color: '#555',
    },

    // ── Franja inferior ──
    bottomStrip: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        right: 6,
        height: BOTTOM_STRIP_H,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(232, 230, 230, 0.96)',
        paddingHorizontal: 14,
        borderRadius: 15,
        zIndex: 15,
    },
    discountLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    discountCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
    },
    discountIcon: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Poppins-Bold',
    },
    specialLabel: {
        fontFamily: 'Poppins-Regular',
        fontSize: 10,
        color: '#000000',
        lineHeight: 14,
    },
    offText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 13,
        color: '#111',
        lineHeight: 17,
    },
    cartBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
});
