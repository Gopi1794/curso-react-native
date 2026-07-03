import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import API from '../services/api';
import { imageMap } from '../assets/utils/imageMap';

const COLORS = {
    brand: '#FF8700',
    ai: '#7B2FF7',
    text: '#1A1A1A',
    white: '#FFFFFF',
    cardBg: '#FFFFFF',
    sectionBg: '#F8F4FF',
};

const getImageSource = (key) => {
    const k = Array.isArray(key) ? key[0] : key;
    if (!k) return null;
    const src = imageMap[k];
    if (src) {
        if (typeof src === 'string') return { uri: src };
        if (src?.uri) return { uri: src.uri };
    }
    if (typeof k === 'string' && k.startsWith('http')) return { uri: k };
    return null;
};

const useShimmer = () => {
    const anim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return anim;
};

const usePulse = () => {
    const anim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1.25, duration: 1000, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return anim;
};

const useBadgeShine = () => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.delay(2000),
            ])
        ).start();
    }, []);
    return anim;
};

const useRotation = () => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.timing(anim, { toValue: 1, duration: 4000, useNativeDriver: true })
        ).start();
    }, []);
    return anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
};

function SkeletonCard() {
    const opacity = useShimmer();
    return (
        <Animated.View style={[styles.card, { opacity, backgroundColor: '#EEE8FF' }]}>
            <View style={[styles.imageContainer, { backgroundColor: '#DDD5F5' }]} />
            <View style={{ padding: 10, gap: 8 }}>
                <View style={{ width: '80%', height: 10, backgroundColor: '#DDD5F5', borderRadius: 5 }} />
                <View style={{ width: '60%', height: 8, backgroundColor: '#E8E0FF', borderRadius: 4 }} />
                <View style={{ width: '40%', height: 12, backgroundColor: '#DDD5F5', borderRadius: 5 }} />
            </View>
        </Animated.View>
    );
}

function RecommendationCard({ item, onPress, index }) {
    const entryScale = useRef(new Animated.Value(0.88)).current;
    const entryOpacity = useRef(new Animated.Value(0)).current;
    const pressScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(entryScale, {
                toValue: 1,
                delay: index * 75,
                tension: 55,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(entryOpacity, {
                toValue: 1,
                duration: 280,
                delay: index * 75,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handlePressIn = () => {
        Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true, tension: 120, friction: 8 }).start();
    };
    const handlePressOut = () => {
        Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
    };

    const imageSource = getImageSource(item.imagen_key);

    return (
        <Animated.View style={[
            styles.cardShadow,
            { transform: [{ scale: entryScale }, { scale: pressScale }], opacity: entryOpacity },
        ]}>
            <TouchableOpacity
                style={styles.card}
                onPress={() => onPress(item)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                accessibilityLabel={`${item.nombre}, $${parseFloat(item.precio).toFixed(2)}`}
            >
                <View style={styles.imageContainer}>
                    {imageSource ? (
                        <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
                    ) : (
                        <LinearGradient
                            colors={['#7B2FF7', '#FF8700']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.cardImage}
                        />
                    )}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.imageOverlay}
                    />
                    <Text style={styles.cardNameOverlay} numberOfLines={2}>{item.nombre}</Text>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.razonRow}>
                        <Ionicons name="sparkles" size={11} color={COLORS.ai} />
                        <Text style={styles.razon} numberOfLines={2}>{item.razon}</Text>
                    </View>
                    <Text style={styles.price}>${parseFloat(item.precio).toFixed(2)}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function RecommendationsSection({ restauranteId, onItemPress }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const sparkleScale = usePulse();
    const borderRotate = useRotation();
    const badgeShine = useBadgeShine();
    const shineTranslate = badgeShine.interpolate({ inputRange: [0, 1], outputRange: [-60, 200] });

    useEffect(() => {
        if (!restauranteId) return;
        API.recommendations.get(restauranteId)
            .then(res => { if (res.success) setItems(res.items); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [restauranteId]);

    if (!loading && items.length === 0) return null;

    return (
        <View style={styles.sectionShadow}>
            {/* Clip del gradiente rotativo */}
            <View style={styles.sectionBorderClip}>
                <Animated.View style={[styles.rotatingBorder, { transform: [{ rotate: borderRotate }] }]}>
                    <LinearGradient
                        colors={['#7B2FF7', '#FF8700', '#7B2FF7']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ flex: 1 }}
                    />
                </Animated.View>

                {/* Contenido real de la sección */}
                <View style={styles.sectionInner}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Animated.View style={{ transform: [{ scale: sparkleScale }] }}>
                                <Ionicons name="sparkles" size={18} color={COLORS.ai} />
                            </Animated.View>
                            <Text style={styles.title}>Para vos</Text>
                        </View>
                        <View style={styles.aiBadge}>
                            <LinearGradient
                                colors={['#7B2FF7', '#FF8700']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFillObject}
                            />
                            <Animated.View style={[
                                styles.badgeShine,
                                { transform: [{ translateX: shineTranslate }, { skewX: '-15deg' }] },
                            ]} />
                            <Ionicons name="sparkles" size={9} color={COLORS.white} />
                            <Text style={styles.aiBadgeText}>Recomendado por IA</Text>
                        </View>
                    </View>

                    <FlatList
                        data={loading ? [1, 2, 3] : items}
                        keyExtractor={(item, i) => loading ? String(i) : String(item.id)}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.list}
                        renderItem={({ item, index }) => loading ? (
                            <SkeletonCard />
                        ) : (
                            <RecommendationCard item={item} onPress={onItemPress} index={index} />
                        )}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    sectionShadow: {
        marginBottom: 24,
        marginHorizontal: 16,
        borderRadius: 22,
        shadowColor: '#7B2FF7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
    },
    sectionBorderClip: {
        borderRadius: 22,
        padding: 2,
        overflow: 'hidden',
    },
    rotatingBorder: {
        position: 'absolute',
        width: 600,
        height: 600,
        top: -180,
        left: -136,
    },
    sectionInner: {
        backgroundColor: COLORS.sectionBg,
        borderRadius: 20,
        paddingTop: 16,
        paddingBottom: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 14,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        color: COLORS.text,
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        overflow: 'hidden',
    },
    badgeShine: {
        position: 'absolute',
        top: -10,
        bottom: -10,
        width: 30,
        backgroundColor: 'rgba(255,255,255,0.28)',
    },
    aiBadgeText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 10,
        color: COLORS.white,
        letterSpacing: 0.3,
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    cardShadow: {
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    card: {
        width: 155,
        backgroundColor: COLORS.cardBg,
        borderRadius: 18,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        height: 108,
        overflow: 'hidden',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '65%',
    },
    cardNameOverlay: {
        position: 'absolute',
        bottom: 8,
        left: 10,
        right: 10,
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        color: COLORS.white,
        lineHeight: 16,
    },
    cardBody: {
        padding: 10,
        paddingTop: 9,
        paddingBottom: 13,
        gap: 5,
    },
    razonRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 5,
    },
    razon: {
        fontFamily: 'Poppins-Regular',
        fontSize: 10,
        color: COLORS.ai,
        flex: 1,
        lineHeight: 14,
    },
    price: {
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
        color: COLORS.brand,
    },
});
