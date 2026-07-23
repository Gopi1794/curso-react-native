import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AppHeader from '../../components/common/AppHeader';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';

const CARDS = [
    {
        key: 'stats',
        screen: 'AdminStats',
        title: 'Estadísticas',
        subtitle: 'Revenue, pedidos y top platos',
        icon: 'bar-chart-outline',
        colors: ['#0F4C75', '#1B6CA8'],
    },
    {
        key: 'platos',
        screen: 'AdminPlatos',
        title: 'Platos del menú',
        subtitle: 'Habilitá, deshabilitá o agregá platos',
        icon: 'fast-food-outline',
        colors: ['#E65100', '#FF8700'],
    },
    {
        key: 'stock',
        screen: 'AdminStock',
        title: 'Stock de ingredientes',
        subtitle: 'Controlá las cantidades disponibles',
        icon: 'layers-outline',
        colors: ['#2E7D32', '#43A047'],
    },
    {
        key: 'cupones',
        screen: 'AdminCupones',
        title: 'Cupones de descuento',
        subtitle: 'Creá cupones con QR para el kiosco',
        icon: 'ticket-outline',
        colors: ['#6A1B9A', '#9C27B0'],
    },
    {
        key: 'ruleta',
        screen: 'AdminRuleta',
        title: 'Ruleta de premios',
        subtitle: 'Activala y configurá los premios',
        icon: 'sync-outline',
        colors: ['#D84315', '#FF7043'],
    },
    {
        key: 'zonas-envio',
        screen: 'AdminZonasEnvio',
        title: 'Zonas de envío',
        subtitle: 'Costo de envío según distancia',
        icon: 'map-outline',
        colors: ['#00838F', '#00ACC1'],
    },
    {
        key: 'ingredientes',
        screen: 'AdminIngredients',
        title: 'Catálogo de ingredientes',
        subtitle: 'Agregá o desactivá ingredientes',
        icon: 'leaf-outline',
        colors: ['#1565C0', '#1976D2'],
    },
    {
        key: 'recetas',
        screen: 'AdminRecetas',
        title: 'Recetas',
        subtitle: 'Editá las cantidades de cada plato',
        icon: 'clipboard-outline',
        colors: ['#00695C', '#00897B'],
    },
    {
        key: 'pedidos',
        screen: 'AdminPedidos',
        title: 'Pedidos',
        subtitle: 'Asigná repartidores y seguí el estado',
        icon: 'bicycle-outline',
        colors: ['#AD1457', '#E91E63'],
    },
    {
        key: 'repartidores',
        screen: 'AdminRepartidores',
        title: 'Repartidores',
        subtitle: 'Resumen del día y liquidación de envíos',
        icon: 'cash-outline',
        colors: ['#00838F', '#00ACC1'],
    },
    {
        key: 'reviews',
        screen: 'AdminReviewsInsights',
        title: 'Insights de reseñas',
        subtitle: 'Análisis IA de comentarios de clientes',
        icon: 'sparkles-outline',
        colors: ['#7B2FF7', '#FF8700'],
    },
];

function CardItem({ card, navigation }) {
    const shineAnim = useRef(new Animated.Value(0)).current;
    const isAI = card.key === 'reviews';

    useEffect(() => {
        if (!isAI) return;
        Animated.loop(
            Animated.sequence([
                Animated.timing(shineAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.delay(2000),
            ])
        ).start();
    }, []);

    const shineTranslate = shineAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 380] });

    return (
        <TouchableOpacity
            onPress={() => navigation.navigate(card.screen)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={card.title}
        >
            <LinearGradient colors={card.colors} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                {isAI && (
                    <Animated.View style={[
                        styles.cardShine,
                        { transform: [{ translateX: shineTranslate }, { skewX: '-15deg' }] },
                    ]} />
                )}
                <View style={styles.cardIcon}>
                    <Ionicons name={card.icon} size={28} color="#fff" />
                </View>
                <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardSub}>{card.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
        </TouchableOpacity>
    );
}

export default function AdminDashboardScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            <AppHeader title="Panel Admin" onBack={() => navigation.goBack()} />

            <ScrollView
                contentContainerStyle={[styles.content, { paddingTop: insets.top + 76 }]}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity
                    style={styles.onboardingBanner}
                    onPress={() => navigation.navigate('AdminOnboarding')}
                    activeOpacity={0.85}
                >
                    <View style={styles.onboardingIcon}>
                        <Ionicons name="rocket-outline" size={20} color="#FF8700" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.onboardingTitle}>Configuración inicial</Text>
                        <Text style={styles.onboardingSub}>Completá los 5 pasos para arrancar</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#FF8700" />
                </TouchableOpacity>

                <Text style={styles.greeting}>¿Qué querés gestionar?</Text>

                {CARDS.map(card => (
                    <CardItem key={card.key} card={card} navigation={navigation} />
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },
    content: { paddingHorizontal: 20, paddingBottom: FLOATING_TAB_BAR_HEIGHT },
    greeting: {
        fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#666',
        marginBottom: 20,
    },
    card: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 18, padding: 20, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
        overflow: 'hidden',
    },
    cardShine: {
        position: 'absolute',
        top: -20,
        bottom: -20,
        width: 50,
        backgroundColor: 'rgba(255,255,255,0.22)',
    },
    cardIcon: {
        width: 52, height: 52, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center', marginRight: 16,
    },
    cardText: { flex: 1 },
    cardTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#fff', marginBottom: 2 },
    cardSub: { fontSize: 12, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.8)' },
    onboardingBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: '#FFEDD5', marginBottom: 16,
    },
    onboardingIcon: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center',
    },
    onboardingTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
    onboardingSub: { fontSize: 12, color: '#B45309', marginTop: 1 },
});
