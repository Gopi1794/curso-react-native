import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, Modal, Animated, TouchableOpacity,
    FlatList, Image, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { addToCart } from '../store/slices/cartSlice';
import { imageMap } from '../assets/utils/imageMap';
import { showSuccessMessage } from './FlashMessageWrapper';
import API from '../services/api';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.72;

const SUGGESTION_CATS = ['bebidas', 'postres'];

export default function SuggestionSheet({ visible, onDismiss }) {
    const dispatch           = useAppDispatch();
    const selectedRestaurant = useAppSelector(s => s.restaurant.selected);
    const translateY         = useRef(new Animated.Value(SHEET_H)).current;
    const [items, setItems]  = useState([]);
    const [loading, setLoading] = useState(false);
    const [added, setAdded]  = useState({});

    const slideIn  = () => Animated.spring(translateY, { toValue: 0,       useNativeDriver: true, bounciness: 4 }).start();
    const slideOut = (cb) => Animated.timing(translateY, { toValue: SHEET_H, duration: 280, useNativeDriver: true }).start(cb);

    useEffect(() => {
        if (visible) {
            setAdded({});
            slideIn();
            if (selectedRestaurant?.id) fetchSuggestions();
        }
    }, [visible]);

    const fetchSuggestions = async () => {
        setLoading(true);
        try {
            const res = await API.restaurants.getMenu(selectedRestaurant.id);
            if (res.success) {
                const filtered = res.items.filter(i =>
                    SUGGESTION_CATS.includes(i.categoria?.toLowerCase()) && i.disponible
                );
                setItems(filtered);
            }
        } catch {}
        finally { setLoading(false); }
    };

    const handleDismiss = () => slideOut(() => onDismiss());

    const handleAdd = useCallback((item) => {
        dispatch(addToCart({
            id:       item.id,
            name:     item.nombre,
            price:    parseFloat(item.precio),
            image:    imageMap[item.imagen_key],
            quantity: 1,
        }));
        setAdded(prev => ({ ...prev, [item.id]: true }));
        showSuccessMessage('¡Agregado!', `${item.nombre} se añadió al carrito`);
    }, [dispatch]);

    const sections = SUGGESTION_CATS.map(cat => ({
        cat,
        label: cat === 'bebidas' ? 'Bebidas' : 'Postres',
        icon:  cat === 'bebidas' ? 'beer-outline' : 'cafe-outline',
        data:  items.filter(i => i.categoria?.toLowerCase() === cat),
    })).filter(s => s.data.length > 0);

    const renderCard = (item) => {
        const img = imageMap[item.imagen_key];
        const isAdded = !!added[item.id];
        return (
            <View key={item.id} style={styles.card}>
                {img ? (
                    <Image source={img} style={styles.cardImg} resizeMode="cover" />
                ) : (
                    <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
                        <Ionicons name="image-outline" size={26} color="#ddd" />
                    </View>
                )}
                <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={2}>{item.nombre}</Text>
                <View style={styles.cardBottom}>
                    <Text style={styles.cardPrice}>${parseFloat(item.precio).toFixed(2)}</Text>
                    <TouchableOpacity
                        style={[styles.addBtn, isAdded && styles.addBtnDone]}
                        onPress={() => !isAdded && handleAdd(item)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name={isAdded ? 'checkmark' : 'add'} size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleDismiss} />

            <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
                <View style={styles.handle} />

                <View style={styles.titleRow}>
                    <View>
                        <Text style={styles.title}>¿Algo para acompañar?</Text>
                        <Text style={styles.subtitle}>Sumale una bebida o un postre</Text>
                    </View>
                    <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
                        <Ionicons name="close" size={20} color="#888" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF8700" style={styles.loader} />
                ) : sections.length === 0 ? (
                    <Text style={styles.empty}>Sin sugerencias disponibles</Text>
                ) : (
                    <FlatList
                        data={sections}
                        keyExtractor={s => s.cat}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.outerList}
                        renderItem={({ item: section }) => (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name={section.icon} size={17} color="#FF8700" />
                                    <Text style={styles.sectionTitle}>{section.label}</Text>
                                    <Text style={styles.sectionCount}>{section.data.length} opciones</Text>
                                </View>
                                <FlatList
                                    data={section.data}
                                    keyExtractor={i => String(i.id)}
                                    renderItem={({ item }) => renderCard(item)}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.hList}
                                />
                            </View>
                        )}
                    />
                )}

                <TouchableOpacity style={styles.skipBtn} onPress={handleDismiss}>
                    <Text style={styles.skipText}>No gracias</Text>
                </TouchableOpacity>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: SHEET_H,
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingBottom: 28,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#E0E0E0', alignSelf: 'center', marginTop: 12, marginBottom: 4,
    },
    titleRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        marginTop: 12, marginBottom: 16,
    },
    title:    { fontFamily: 'Poppins-Bold',    fontSize: 18, color: '#1a1a1a' },
    subtitle: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#888',   marginTop: 2 },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center',
    },

    loader: { marginTop: 40 },
    empty:  { textAlign: 'center', color: '#aaa', fontFamily: 'Poppins-Regular', marginTop: 40 },

    outerList: { paddingBottom: 8 },
    hList: { paddingHorizontal: 2, paddingBottom: 4 },

    section: { marginBottom: 24 },
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
    },
    sectionTitle: { fontFamily: 'Poppins-Bold', fontSize: 16, color: '#1a1a1a', flex: 1 },
    sectionCount: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#aaa' },

    card: {
        width: 130,
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
        padding: 10,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#FF8700',
    },
    cardImg: { width: 110, height: 90, borderRadius: 12, marginBottom: 8 },
    cardImgPlaceholder: {
        backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center',
    },
    cardInfo: {
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderColor: '#FFE4C4',
        borderRadius: 10,
        padding: 8,
        marginTop: 6,
    },
    cardName: {
        fontFamily: 'Poppins-SemiBold', fontSize: 12, color: '#1a1a1a',
        lineHeight: 16, marginBottom: 8, minHeight: 32,
    },
    cardBottom: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    cardPrice: { fontFamily: 'Poppins-Bold', fontSize: 13, color: '#FF8700' },

    addBtn: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#FF8700', justifyContent: 'center', alignItems: 'center',
    },
    addBtnDone: { backgroundColor: '#4CD964' },

    skipBtn: { alignItems: 'center', paddingVertical: 12 },
    skipText: { fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#aaa' },
});
