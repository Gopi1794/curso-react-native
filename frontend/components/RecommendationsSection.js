import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../services/api';
import { imageMap } from '../assets/utils/imageMap';

const getImageSource = (key) => {
    const k = Array.isArray(key) ? key[0] : key;
    const src = imageMap[k];
    if (!src) return null;
    if (typeof src === 'string') return { uri: src };
    if (src?.uri) return { uri: src.uri };
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

function SkeletonCard() {
    const opacity = useShimmer();
    return (
        <Animated.View style={[styles.card, { opacity, backgroundColor: '#F0F0F0' }]}>
            <View style={[styles.cardImage, { backgroundColor: '#E0E0E0' }]} />
            <View style={{ padding: 10, gap: 6 }}>
                <View style={{ width: '80%', height: 10, backgroundColor: '#E0E0E0', borderRadius: 5 }} />
                <View style={{ width: '50%', height: 8, backgroundColor: '#E8E8E8', borderRadius: 4 }} />
                <View style={{ width: '40%', height: 10, backgroundColor: '#E0E0E0', borderRadius: 5 }} />
            </View>
        </Animated.View>
    );
}

export default function RecommendationsSection({ restauranteId, onItemPress }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!restauranteId) return;
        API.recommendations.get(restauranteId)
            .then(res => {
                console.log('[Recs] response:', JSON.stringify(res).slice(0, 200));
                if (res.success) setItems(res.items);
            })
            .catch(err => console.error('[Recs] error:', err))
            .finally(() => setLoading(false));
    }, [restauranteId]);

    if (!loading && items.length === 0) return null;

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="sparkles" size={16} color="#FF8700" />
                    <Text style={styles.title}>Para vos</Text>
                </View>
                <Text style={styles.subtitle}>Basado en tus pedidos</Text>
            </View>

            <FlatList
                data={loading ? [1, 2, 3] : items}
                keyExtractor={(item, i) => loading ? String(i) : String(item.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => loading ? (
                    <SkeletonCard />
                ) : (
                    <TouchableOpacity style={styles.card} onPress={() => onItemPress(item)} activeOpacity={0.85}>
                        <Image
                            source={getImageSource(item.imagen_key)}
                            style={styles.cardImage}
                            resizeMode="cover"
                        />
                        <View style={styles.cardBody}>
                            <Text style={styles.cardName} numberOfLines={1}>{item.nombre}</Text>
                            <View style={styles.razonRow}>
                                <Ionicons name="sparkles-outline" size={10} color="#FF8700" />
                                <Text style={styles.razon} numberOfLines={1}>{item.razon}</Text>
                            </View>
                            <Text style={styles.price}>${parseFloat(item.precio).toFixed(2)}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 8 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, marginBottom: 12,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { fontFamily: 'Poppins-Bold', fontSize: 16, color: '#1a1a1a' },
    subtitle: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#999' },

    list: { paddingHorizontal: 16, gap: 12 },

    card: {
        width: 140, backgroundColor: '#fff', borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    },
    cardImage: { width: '100%', height: 90 },
    cardBody: { padding: 10, gap: 4 },
    cardName: { fontFamily: 'Poppins-SemiBold', fontSize: 12, color: '#1a1a1a' },
    razonRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    razon: { fontFamily: 'Poppins-Regular', fontSize: 10, color: '#FF8700', flex: 1 },
    price: { fontFamily: 'Poppins-Bold', fontSize: 13, color: '#1a1a1a', marginTop: 2 },
});
