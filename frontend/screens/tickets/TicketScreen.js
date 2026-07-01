// screens/tickets/TicketScreen.js
import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Dimensions,
    StatusBar,
    TouchableOpacity,
    Animated,
    Image,
    Text,
    AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Componentes comunes
import AppHeader from '../../components/common/AppHeader';

// API
import API from '../../services/api';
import { ticketImages } from '../../config/images';

const { width: screenWidth } = Dimensions.get('window');

// Convierte "2026-09-30T..." → "30/09/2026"
const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    const day   = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year  = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

// Mapea los campos de la API al shape que esperan los componentes
const mapCupon = (c) => ({
    id:         c.id,
    offer:      c.oferta,
    title:      c.titulo,
    img:        c.imagen_key,
    realImage:  c.imagen_real_key,
    validUntil: formatDate(c.valido_hasta),
    disclaimer: c.disclaimer,
    backText:   c.texto_reverso,
    code:       c.codigo,
    color:      c.color,
});

// Componente de ticket memoizado (fuera del render principal)
const TicketItem = memo(({ ticket, onPress, index, reduceMotion }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const entryAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

    useEffect(() => {
        if (reduceMotion) return;
        Animated.timing(entryAnim, {
            toValue: 1,
            duration: 300,
            delay: index * 40,
            useNativeDriver: true,
        }).start();
    }, []);

    const handlePressIn = () => {
        if (reduceMotion) return;
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        if (reduceMotion) return;
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();
    };

    const translateY = entryAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [30, 0],
    });

    return (
        <Animated.View style={{
            transform: [{ scale: scaleAnim }, { translateY }],
            opacity: entryAnim,
        }}>
            <TouchableOpacity
                onPress={() => onPress(ticket)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                style={styles.ticketTouchable}
                accessibilityRole="button"
                accessibilityLabel={`Cupón ${ticket.title}, válido hasta ${ticket.validUntil}`}
            >
                <View style={styles.ticketCard}>
                    {/* Imagen de fondo */}
                    <Image
                        style={styles.ticketImage}
                        source={ticketImages[ticket.img]}
                        resizeMode="cover"
                    />

                    {/* Overlay gradiente */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.65)']}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Barra de color superior */}
                    <View style={[styles.colorBar, { backgroundColor: ticket.color }]} />

                    {/* Badge de oferta */}
                    <View style={[styles.offerBadge, { backgroundColor: ticket.color }]}>
                        <Ionicons name="pricetag" size={11} color="#fff" />
                        <Text style={styles.offerText}>{ticket.offer}</Text>
                    </View>

                    {/* Contenido inferior */}
                    <View style={styles.ticketContent}>
                        <Text style={styles.ticketTitle} numberOfLines={2}>
                            {ticket.title}
                        </Text>

                        <View style={styles.ticketFooter}>
                            <View style={styles.dateRow}>
                                <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.85)" />
                                <Text style={styles.dateText}>
                                    Válido hasta {ticket.validUntil}
                                </Text>
                            </View>

                            <View style={[styles.qrBadge, { borderColor: ticket.color }]}>
                                <Ionicons name="qr-code-outline" size={14} color="#fff" />
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

// Skeleton para carga
const TicketSkeleton = memo(({ reduceMotion }) => {
    const shimmer = useRef(new Animated.Value(reduceMotion ? 0.5 : 0)).current;

    useEffect(() => {
        if (reduceMotion) return;
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const opacity = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View style={[styles.skeletonCard, { opacity }]}>
            <View style={styles.skeletonBadge} />
            <View style={styles.skeletonContent}>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonDate} />
            </View>
        </Animated.View>
    );
});

// Estado vacío
const EmptyState = () => (
    <View style={styles.emptyState}>
        <Ionicons name="ticket-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No hay cupones</Text>
        <Text style={styles.emptySubtitle}>
            Los cupones disponibles aparecerán aquí
        </Text>
    </View>
);

const TicketScreen = ({ navigation }) => {
    const [tickets, setTickets]   = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    const [reduceMotion, setReduceMotion] = useState(false);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
        return () => sub.remove();
    }, []);

    const fetchCupones = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await API.cupones.getAll();
            if (response.success) {
                setTickets(response.cupones.map(mapCupon));
            } else {
                setError('No se pudieron cargar los cupones');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCupones();
    }, [fetchCupones]);

    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleTicketPress = useCallback((ticket) => {
        navigation.navigate('TicketDetail', { ticket });
    }, [navigation]);

    const renderTicket = useCallback(({ item, index }) => (
        <TicketItem ticket={item} onPress={handleTicketPress} index={index} reduceMotion={reduceMotion} />
    ), [handleTicketPress, reduceMotion]);

    const keyExtractor = useCallback((item) => String(item.id), []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <View style={styles.background} />

            <AppHeader
                title="Mis Cupones"
                onBack={handleGoBack}
            />

            {loading ? (
                <View style={[styles.listContent, { paddingTop: insets.top + 44 + 32, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 16 }]}>
                    <TicketSkeleton reduceMotion={reduceMotion} />
                    <TicketSkeleton reduceMotion={reduceMotion} />
                    <TicketSkeleton reduceMotion={reduceMotion} />
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#999" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={fetchCupones}
                        accessibilityRole="button"
                        accessibilityLabel="Reintentar cargar cupones"
                    >
                        <Text style={styles.retryText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={tickets}
                    renderItem={renderTicket}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 44 + 32, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 16 }]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={EmptyState}
                    initialNumToRender={5}
                    maxToRenderPerBatch={5}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#f5f5f5',
    },
    listContent: {
        paddingTop: 16,
        paddingHorizontal: 20,
    },

    // Ticket card
    ticketTouchable: {
        marginBottom: 16,
    },
    ticketCard: {
        height: 170,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#222',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    ticketImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    colorBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
    },
    offerBadge: {
        position: 'absolute',
        top: 14,
        left: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    offerText: {
        fontFamily: 'Poppins-Bold',
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    ticketContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
    },
    ticketTitle: {
        fontFamily: 'Poppins-Bold',
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
        marginBottom: 8,
    },
    ticketFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dateText: {
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.85)',
        fontSize: 11,
    },
    qrBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Skeleton
    skeletonCard: {
        height: 170,
        borderRadius: 20,
        backgroundColor: '#e0e0e0',
        marginBottom: 16,
        padding: 16,
        justifyContent: 'space-between',
    },
    skeletonBadge: {
        width: 100,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#ccc',
    },
    skeletonContent: {
        gap: 8,
    },
    skeletonTitle: {
        width: '70%',
        height: 16,
        borderRadius: 8,
        backgroundColor: '#ccc',
    },
    skeletonDate: {
        width: '45%',
        height: 12,
        borderRadius: 6,
        backgroundColor: '#ccc',
    },

    // Empty state
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
        gap: 12,
    },
    emptyTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        color: '#666',
    },
    emptySubtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },

    // Error
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        paddingTop: 80,
    },
    errorText: {
        fontFamily: 'Poppins-Regular',
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#ff8000',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
    },
    retryText: {
        fontFamily: 'Poppins-Bold',
        color: '#fff',
        fontSize: 14,
    },
});

export default TicketScreen;
