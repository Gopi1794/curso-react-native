import React, { useState } from 'react';
import {
    View, Text, Modal, TouchableOpacity, StyleSheet,
    ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../services/api';
import { showSuccessMessage, showErrorMessage } from './FlashMessageWrapper';

const ORANGE = '#ff8700';

function StarRow({ rating, onRate }) {
    return (
        <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => onRate(star)}>
                    <Ionicons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={28}
                        color={ORANGE}
                        style={{ marginHorizontal: 3 }}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
}

export default function ReviewBottomSheet({ visible, onClose, onSubmit, items }) {
    const reviewableItems = (items || []).filter(item => item.menu_item_id);

    const [ratings,    setRatings]    = useState({});
    const [comments,   setComments]   = useState({});
    const [submitting, setSubmitting] = useState(false);

    const setRating  = (id, val) => setRatings(prev  => ({ ...prev, [id]: val }));
    const setComment = (id, val) => setComments(prev => ({ ...prev, [id]: val }));

    const allRated = reviewableItems.length > 0 &&
        reviewableItems.every(item => (ratings[item.menu_item_id] || 0) >= 1);

    const handleSubmit = async () => {
        if (!allRated) {
            showErrorMessage('Faltan calificaciones', 'Dale al menos 1 estrella a cada plato');
            return;
        }
        setSubmitting(true);
        try {
            await Promise.all(
                reviewableItems.map(item =>
                    API.comentarios.create(
                        item.menu_item_id,
                        ratings[item.menu_item_id],
                        (comments[item.menu_item_id] || '').trim() || '¡Muy bueno!'
                    )
                )
            );
            showSuccessMessage('¡Gracias!', 'Tu reseña fue publicada');
            onSubmit();
        } catch {
            showErrorMessage('Error', 'No se pudieron enviar algunas reseñas');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <Text style={styles.title}>Calificá tu pedido</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {reviewableItems.map((item, idx) => (
                            <View
                                key={item.menu_item_id}
                                style={[styles.itemBlock, idx > 0 && styles.itemBorder]}
                            >
                                <Text style={styles.itemName} numberOfLines={1}>
                                    {item.nombre_item}
                                </Text>
                                <StarRow
                                    rating={ratings[item.menu_item_id] || 0}
                                    onRate={val => setRating(item.menu_item_id, val)}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Escribe tu opinión... (opcional)"
                                    placeholderTextColor="#bbb"
                                    value={comments[item.menu_item_id] || ''}
                                    onChangeText={val => setComment(item.menu_item_id, val)}
                                    multiline
                                    numberOfLines={2}
                                />
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitBtn, (!allRated || submitting) && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={!allRated || submitting}
                        >
                            {submitting
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.submitText}>Enviar reseñas</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        maxHeight: '80%',
        paddingBottom: 32,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#ddd',
        alignSelf: 'center', marginTop: 12, marginBottom: 4,
    },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    title:    { fontFamily: 'Poppins-Bold', fontSize: 18, color: '#1a1a1a' },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center', alignItems: 'center',
    },
    list:      { paddingHorizontal: 24, paddingTop: 8 },
    itemBlock: { paddingVertical: 16 },
    itemBorder: { borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    itemName:  { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#111', marginBottom: 8 },
    starRow:   { flexDirection: 'row', marginBottom: 10 },
    input: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12, padding: 12,
        fontFamily: 'Poppins-Regular', fontSize: 13, color: '#333',
        textAlignVertical: 'top',
        borderWidth: 1, borderColor: '#eee',
        minHeight: 60,
    },
    footer: { paddingHorizontal: 24, paddingTop: 16 },
    submitBtn: {
        backgroundColor: ORANGE,
        borderRadius: 20, paddingVertical: 16, alignItems: 'center',
        shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
    },
    submitBtnDisabled: { backgroundColor: '#e0e0e0', shadowOpacity: 0 },
    submitText: { fontFamily: 'Poppins-Bold', color: '#fff', fontSize: 16 },
});
