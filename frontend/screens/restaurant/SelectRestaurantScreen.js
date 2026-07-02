import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Animated,
    Dimensions,
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

const { width: screenWidth } = Dimensions.get('window');

const RestaurantCard = ({ restaurant, onPress, index }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const pressAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            delay: index * 120,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, []);

    const handlePressIn = () => {
        Animated.spring(pressAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(pressAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const horario = restaurant.horario || {};
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const hoy = dias[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    const horarioHoy = horario[hoy] || 'Cerrado';

    return (
        <Animated.View style={{ transform: [{ scale: Animated.multiply(scaleAnim, pressAnim) }], opacity: scaleAnim }}>
            <TouchableOpacity
                style={styles.card}
                onPress={() => onPress(restaurant)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.92}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar ${restaurant.nombre}`}
            >
                <LinearGradient
                    colors={['#ffffff', '#fff8f0']}
                    style={styles.cardGradient}
                >
                    <View style={styles.cardIconContainer}>
                        {restaurant.logo_url ? (
                            <Image source={{ uri: restaurant.logo_url }} style={styles.cardLogoImg} resizeMode="cover" accessibilityLabel={`Logo de ${restaurant.nombre}`} />
                        ) : (
                            <LinearGradient colors={['#ff8c00', '#ff6600']} style={styles.cardIcon}>
                                <Ionicons name="restaurant" size={28} color="#fff" />
                            </LinearGradient>
                        )}
                    </View>

                    <View style={styles.cardContent}>
                        <Text style={styles.cardName} numberOfLines={1}>{restaurant.nombre}</Text>

                        <View style={styles.cardRow}>
                            <Ionicons name="location-outline" size={14} color="#888" />
                            <Text style={styles.cardAddress} numberOfLines={1}>{restaurant.direccion}</Text>
                        </View>

                        <View style={styles.cardRow}>
                            <Ionicons name="time-outline" size={14} color="#888" />
                            <Text style={styles.cardSchedule}>Hoy: {horarioHoy}</Text>
                        </View>

                        {restaurant.telefono && (
                            <View style={styles.cardRow}>
                                <Ionicons name="call-outline" size={14} color="#888" />
                                <Text style={styles.cardPhone}>{restaurant.telefono}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.cardArrow}>
                        <Ionicons name="chevron-forward" size={22} color="#ff8c00" />
                    </View>
                </LinearGradient>
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
        const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
        return (
            <Animated.View style={[styles.card, styles.skeletonCard, { opacity }]}>
                <View style={[styles.cardIcon, styles.skeletonIcon]} />
                <View style={styles.cardContent}>
                    <View style={styles.skeletonLine} />
                    <View style={[styles.skeletonLine, { width: '80%' }]} />
                    <View style={[styles.skeletonLine, { width: '50%' }]} />
                </View>
            </Animated.View>
        );
    };

    return (
        <LinearGradient
            colors={['#C2410C', '#EA580C', '#F97316']}
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
                <Animated.View style={{ opacity: titleAnim, transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <Text style={styles.title}>Elegí tu local</Text>
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
                        <Ionicons name="storefront-outline" size={56} color="#F97316" />
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
                        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
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
        paddingTop: 20,
        paddingBottom: 30,
        paddingHorizontal: 24,
        alignItems: 'center',
        overflow: 'hidden',
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
    },
    listContainer: {
        flex: 1,
        marginTop: -15,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#f9f9f9',
    },
    list: {
        padding: 16,
        paddingBottom: 30,
    },
    card: {
        marginBottom: 14,
        borderRadius: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    cardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
    },
    cardIconContainer: {
        marginRight: 14,
    },
    cardIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardLogoImg: {
        width: 52,
        height: 52,
        borderRadius: 14,
    },
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
        color: '#222',
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
    },
    cardContent: {
        flex: 1,
    },
    cardName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#222',
        marginBottom: 4,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
    },
    cardAddress: {
        fontSize: 13,
        color: '#666',
        marginLeft: 5,
        flex: 1,
    },
    cardSchedule: {
        fontSize: 13,
        color: '#666',
        marginLeft: 5,
    },
    cardPhone: {
        fontSize: 13,
        color: '#666',
        marginLeft: 5,
    },
    cardArrow: {
        marginLeft: 8,
    },
    skeletonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#e8e8e8',
    },
    skeletonIcon: {
        backgroundColor: '#d0d0d0',
        marginRight: 14,
    },
    skeletonLine: {
        height: 12,
        borderRadius: 6,
        backgroundColor: '#d0d0d0',
        marginBottom: 8,
        width: '100%',
    },
});
