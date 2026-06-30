import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AppHeader from '../../components/common/AppHeader';

const CARDS = [
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
        key: 'ingredientes',
        screen: 'AdminIngredients',
        title: 'Catálogo de ingredientes',
        subtitle: 'Agregá o desactivá ingredientes',
        icon: 'leaf-outline',
        colors: ['#1565C0', '#1976D2'],
    },
];

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
                <Text style={styles.greeting}>¿Qué querés gestionar?</Text>

                {CARDS.map(card => (
                    <TouchableOpacity
                        key={card.key}
                        onPress={() => navigation.navigate(card.screen)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={card.title}
                    >
                        <LinearGradient colors={card.colors} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    greeting: {
        fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#666',
        marginBottom: 20,
    },
    card: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 18, padding: 20, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
    },
    cardIcon: {
        width: 52, height: 52, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center', marginRight: 16,
    },
    cardText: { flex: 1 },
    cardTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#fff', marginBottom: 2 },
    cardSub: { fontSize: 12, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.8)' },
});
