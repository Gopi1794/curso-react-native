import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Animated,
    StatusBar,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch } from '../../store/hooks';
import { selectRestaurant } from '../../store/slices/restaurantSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';

const COLORS = {
    brand: '#D95A00',
    brandLight: '#FF8C00',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textTertiary: '#9B9B9B',
    open: '#10B981',
    closed: '#6B7280',
    skeleton: '#E8E8E8',
    skeletonLine: '#D0D0D0',
};

const RestaurantCard = ({ restaurant, onPress, index }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const pressAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            delay: index * 90,
            tension: 55,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, []);

    const handlePressIn = () => Animated.spring(pressAnim, { toValue: 0.96, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true }).start();

    const horario = restaurant.horario || {};
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const hoy = dias[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    const horarioHoy = horario[hoy] || 'Cerrado';
    const abierto = horarioHoy !== 'Cerrado';

    return (
        <Animated.View
            style={[
                styles.card,
                { transform: [{ scale: Animated.multiply(scaleAnim, pressAnim) }], opacity: scaleAnim },
            ]}
        >
            <TouchableOpacity
                onPress={() => onPress(restaurant)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar ${restaurant.nombre}`}
            >
                {/* Banner */}
                <View style={styles.bannerContainer}>
                    {restaurant.logo_url ? (
                        <Image
                            source={{ uri: restaurant.logo_url }}
                            style={styles.bannerImg}
                            resizeMode="cover"
                        />
                    ) : (
                        <LinearGradient
                            colors={[COLORS.brand, COLORS.brandLight]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.bannerPlaceholder}
                        >
                            <Ionicons name="restaurant" size={36} color="rgba(255,255,255,0.5)" />
                        </LinearGradient>
                    )}
                    <View style={[styles.badge, { backgroundColor: abierto ? COLORS.open : COLORS.closed }]}>
                        <Text style={styles.badgeText}>{abierto ? 'Abierto' : 'Cerrado'}</Text>
                    </View>
                </View>

                {/* Body */}
                <View style={styles.cardBody}>
                    <View style={styles.cardBodyRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardName} numberOfLines={1}>
                                {restaurant.nombre}
                            </Text>
                            <Text style={styles.cardDistance}>1.2 km • 8 min</Text>
                            {restaurant.descripcion ? (
                                <Text style={styles.cardDesc} numberOfLines={1}>
                                    {restaurant.descripcion}
                                </Text>
                            ) : null}
                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={13} color={COLORS.textTertiary} />
                                <Text style={styles.infoText} numberOfLines={1}>
                                    {restaurant.direccion || 'Sin dirección'}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons name="time-outline" size={13} color={COLORS.textTertiary} />
                                <Text style={styles.infoText}>Hoy: {horarioHoy}</Text>
                            </View>
                        </View>

                        <View style={styles.arrowBtn}>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function SelectRestaurantScreen() {
    const dispatch = useAppDispatch();
    const insets = useSafeAreaInsets();
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const titleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(titleAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
        fetchRestaurants();
    }, []);

    const fetchRestaurants = async () => {
        try {
            const response = await API.restaurants.getAll();
            if (response.success) {
                setRestaurants(response.restaurants);
            }
        } catch (err) {
            console.error('Error cargando restaurantes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (restaurant) => {
        const data = {
            id: restaurant.id,
            nombre: restaurant.nombre,
            descripcion: restaurant.descripcion,
            direccion: restaurant.direccion,
            telefono: restaurant.telefono,
            horario: restaurant.horario,
            logo_url: restaurant.logo_url || '',
        };
        dispatch(selectRestaurant(data));
        try {
            await AsyncStorage.setItem('selectedRestaurant', JSON.stringify(data));
        } catch {}
    };

    const SkeletonCard = () => {
        const shimmer = useRef(new Animated.Value(0)).current;
        useEffect(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                    Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
                ])
            ).start();
        }, []);
        const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });
        return (
            <Animated.View style={[styles.card, styles.skeletonCard, { opacity }]}>
                <View style={styles.skeletonBanner} />
                <View style={styles.skeletonBody}>
                    <View style={[styles.skeletonLine, { width: '60%', marginBottom: 8 }]} />
                    <View style={[styles.skeletonLine, { width: '35%', marginBottom: 12 }]} />
                    <View style={[styles.skeletonLine, { width: '80%', marginBottom: 6 }]} />
                    <View style={[styles.skeletonLine, { width: '50%' }]} />
                </View>
            </Animated.View>
        );
    };

    return (
        <LinearGradient
            colors={['#B84500', '#D95A00', '#F97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <Image
                    source={require('../../assets/img/logoApp.png')}
                    style={styles.logo}
                />
                <Animated.View
                    style={{
                        opacity: titleAnim,
                        transform: [
                            {
                                translateY: titleAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0],
                                }),
                            },
                        ],
                        alignItems: 'center',
                    }}
                >
                    <Text style={styles.title}>Elegí tu sucursal</Text>
                    <Text style={styles.subtitle}>Seleccioná la sucursal más cercana</Text>
                </Animated.View>
            </View>

            {/* Lista */}
            <View style={styles.listContainer}>
                {loading ? (
                    <View style={styles.list}>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </View>
                ) : restaurants.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="storefront-outline" size={60} color={COLORS.brand} />
                        <Text style={styles.emptyTitle}>Sin locales disponibles</Text>
                        <Text style={styles.emptySubtitle}>No hay restaurantes activos por el momento.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={restaurants}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={({ item, index }) => (
                            <RestaurantCard
                                restaurant={item}
                                onPress={handleSelect}
                                index={index}
                            />
                        )}
                        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingBottom: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    logo: {
        width: 70,
        height: 70,
        marginBottom: 16,
    },
    title: {
        fontSize: 26,
        fontFamily: 'Poppins-Bold',
        color: '#fff',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 20,
    },
    listContainer: {
        flex: 1,
        marginTop: -20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        backgroundColor: COLORS.background,
    },
    list: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 30,
    },

    // ─── Card ─────────────────────────────────────────────────
    card: {
        marginBottom: 18,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
    },

    // ─── Banner ───────────────────────────────────────────────
    bannerContainer: {
        position: 'relative',
    },
    bannerImg: {
        width: '100%',
        height: 130,
    },
    bannerPlaceholder: {
        width: '100%',
        height: 130,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ─── Badge ────────────────────────────────────────────────
    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'Poppins-Bold',
        letterSpacing: 0.3,
    },

    // ─── Card body ────────────────────────────────────────────
    cardBody: {
        padding: 16,
    },
    cardBodyRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardName: {
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        color: COLORS.textPrimary,
        marginBottom: 2,
        lineHeight: 22,
    },
    cardDistance: {
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        color: COLORS.textTertiary,
        marginBottom: 6,
        lineHeight: 17,
    },
    cardDesc: {
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        color: COLORS.textSecondary,
        marginBottom: 8,
        lineHeight: 18,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    infoText: {
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        color: COLORS.textTertiary,
        flex: 1,
        lineHeight: 17,
    },

    // ─── Botón circular ───────────────────────────────────────
    arrowBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.brand,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        elevation: 4,
        shadowColor: COLORS.brand,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },

    // ─── Empty state ──────────────────────────────────────────
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: 60,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },

    // ─── Skeleton ─────────────────────────────────────────────
    skeletonCard: {
        backgroundColor: COLORS.surface,
    },
    skeletonBanner: {
        width: '100%',
        height: 130,
        backgroundColor: COLORS.skeleton,
    },
    skeletonBody: {
        padding: 16,
    },
    skeletonLine: {
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.skeletonLine,
        width: '100%',
    },
});
