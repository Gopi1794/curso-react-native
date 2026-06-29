import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    Animated,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AppHeader from '../../components/common/AppHeader';
import API from '../../services/api';
import { ticketImages } from '../../config/images';

const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    const day   = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year  = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

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

const CouponItem = memo(({ coupon, onPress, index }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const entryAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(entryAnim, {
            toValue: 1,
            duration: 400,
            delay: index * 80,
            useNativeDriver: true,
        }).start();
    }, []);

    const translateY = entryAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }, { translateY }], opacity: entryAnim }}>
            <TouchableOpacity
                onPress={() => onPress(coupon)}
                onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
                activeOpacity={1}
                style={styles.couponTouchable}
            >
                <View style={styles.couponCard}>
                    <Image
                        style={styles.couponImage}
                        source={ticketImages[coupon.img]}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.65)']}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={[styles.colorBar, { backgroundColor: coupon.color }]} />
                    <View style={[styles.offerBadge, { backgroundColor: coupon.color }]}>
                        <Ionicons name="pricetag" size={11} color="#fff" />
                        <Text style={styles.offerText}>{coupon.offer}</Text>
                    </View>
                    <View style={styles.couponContent}>
                        <Text style={styles.couponTitle} numberOfLines={2}>{coupon.title}</Text>
                        <View style={styles.couponFooter}>
                            <View style={styles.dateRow}>
                                <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.85)" />
                                <Text style={styles.dateText}>Válido hasta {coupon.validUntil}</Text>
                            </View>
                            <View style={[styles.qrBadge, { borderColor: coupon.color }]}>
                                <Ionicons name="qr-code-outline" size={14} color="#fff" />
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

const Skeleton = memo(() => {
    const shimmer = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
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

const EmptyState = () => (
    <View style={styles.emptyState}>
        <Ionicons name="ticket-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Sin cupones disponibles</Text>
        <Text style={styles.emptySubtitle}>Los cupones activos aparecerán aquí</Text>
    </View>
);

export default function CouponsScreen({ navigation }) {
    const [cupones, setCupones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    const fetchCupones = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await API.cupones.getAll();
            if (res.success) {
                setCupones(res.cupones.map(mapCupon));
            } else {
                setError('No se pudieron cargar los cupones');
            }
        } catch {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCupones(); }, []);

    const handlePress = useCallback((coupon) => {
        navigation.navigate('CouponDetail', { ticket: coupon });
    }, [navigation]);

    const renderItem = useCallback(({ item, index }) => (
        <CouponItem coupon={item} onPress={handlePress} index={index} />
    ), [handlePress]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <AppHeader title="Cupones y Promociones" onBack={() => navigation.goBack()} showCart={false} />

            {loading ? (
                <View style={styles.list}>
                    <Skeleton /><Skeleton /><Skeleton />
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#999" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchCupones}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={cupones}
                    renderItem={renderItem}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={EmptyState}
                    initialNumToRender={5}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    list: {
        paddingTop: (StatusBar.currentHeight || 40) + 70,
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    couponTouchable: { marginBottom: 16 },
    couponCard: {
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
    couponImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    colorBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
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
    offerText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    couponContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
    couponTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
        marginBottom: 8,
    },
    couponFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dateText: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
    qrBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skeletonCard: {
        height: 170,
        borderRadius: 20,
        backgroundColor: '#e0e0e0',
        marginBottom: 16,
        padding: 16,
        justifyContent: 'space-between',
    },
    skeletonBadge: { width: 100, height: 28, borderRadius: 14, backgroundColor: '#ccc' },
    skeletonContent: { gap: 8 },
    skeletonTitle: { width: '70%', height: 16, borderRadius: 8, backgroundColor: '#ccc' },
    skeletonDate: { width: '45%', height: 12, borderRadius: 6, backgroundColor: '#ccc' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#666' },
    emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingTop: 80 },
    errorText: { color: '#666', fontSize: 14, textAlign: 'center' },
    retryButton: { backgroundColor: '#ff8000', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
    retryText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
