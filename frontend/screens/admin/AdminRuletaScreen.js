import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Switch, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/common/AppHeader';
import { showSuccessMessage, showErrorMessage } from '../../components/FlashMessageWrapper';
import API from '../../services/api';
import { useAppSelector } from '../../store/hooks';

const ICONOS_DISPONIBLES = [
    'pricetag-outline', 'bicycle-outline', 'restaurant-outline', 'ice-cream-outline',
    'wine-outline', 'pizza-outline', 'bag-handle-outline', 'gift-outline',
    'star-outline', 'fast-food-outline', 'cafe-outline', 'heart-outline',
];

const emptySlots = () => Array.from({ length: 8 }, (_, i) => ({ posicion: i, label: '', icon: null }));

export default function AdminRuletaScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const restaurante = useAppSelector(s => s.restaurant.selected);
    const [activa, setActiva] = useState(false);
    const [premios, setPremios] = useState(emptySlots());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!restaurante) return;
        setLoading(true);
        try {
            const res = await API.admin.ruleta.getInfo(restaurante.id);
            if (res.success) {
                setActiva(res.activa);
                setPremios(res.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null })));
            }
        } catch {
            showErrorMessage('Error', 'No se pudo cargar la configuración de la ruleta');
        } finally {
            setLoading(false);
        }
    }, [restaurante]);

    useEffect(() => { load(); }, [load]);

    const updateSlot = (posicion, changes) => {
        setPremios(prev => prev.map(p => p.posicion === posicion ? { ...p, ...changes } : p));
    };

    const clearSlot = (posicion) => {
        updateSlot(posicion, { label: '', icon: null });
    };

    const handleGuardar = async () => {
        setSaving(true);
        try {
            const res = await API.admin.ruleta.updateInfo(restaurante.id, {
                activa,
                premios: premios.map(p => ({
                    posicion: p.posicion,
                    label: p.label.trim() || null,
                    icon: p.label.trim() ? p.icon : null,
                })),
            });
            if (res.success) {
                showSuccessMessage('Guardado', 'La configuración de la ruleta se actualizó');
                setPremios(res.data.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null })));
            } else {
                showErrorMessage('Error', res.message || 'No se pudo guardar');
            }
        } catch {
            showErrorMessage('Error', 'No se pudo guardar la configuración de la ruleta');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.root, styles.centered]}>
                <ActivityIndicator size="large" color="#FF8700" />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <AppHeader title="Ruleta de premios" subtitle="Configurá los premios y activala" onBack={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}>
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Mostrar ruleta a los clientes</Text>
                    <Switch value={activa} onValueChange={setActiva} trackColor={{ false: '#ccc', true: '#FFD0A0' }} thumbColor={activa ? '#FF8700' : '#888'} />
                </View>

                {premios.map((premio) => (
                    <View key={premio.posicion} style={styles.slotCard}>
                        <Text style={styles.slotTitle}>Gajo {premio.posicion + 1}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Vacío"
                            value={premio.label}
                            onChangeText={(text) => updateSlot(premio.posicion, { label: text })}
                            maxLength={40}
                        />
                        <View style={styles.iconGrid}>
                            {ICONOS_DISPONIBLES.map((icon) => (
                                <TouchableOpacity
                                    key={icon}
                                    style={[styles.iconOption, premio.icon === icon && styles.iconOptionSelected]}
                                    onPress={() => updateSlot(premio.posicion, { icon })}
                                >
                                    <Ionicons name={icon} size={20} color={premio.icon === icon ? '#fff' : '#666'} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.clearBtn} onPress={() => clearSlot(premio.posicion)}>
                            <Text style={styles.clearBtnText}>Vaciar</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity style={styles.saveBtn} onPress={handleGuardar} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar cambios</Text>}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F5' },
    centered: { alignItems: 'center', justifyContent: 'center' },
    switchRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20,
    },
    switchLabel: { fontSize: 15, fontWeight: '600', color: '#222' },
    slotCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    },
    slotTitle: { fontSize: 13, color: '#888', marginBottom: 8, fontWeight: '600' },
    input: {
        borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 12,
    },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    iconOption: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0',
        alignItems: 'center', justifyContent: 'center',
    },
    iconOptionSelected: { backgroundColor: '#FF8700' },
    clearBtn: { alignSelf: 'flex-start' },
    clearBtnText: { color: '#E53935', fontSize: 13, fontWeight: '600' },
    saveBtn: {
        backgroundColor: '#FF8700', borderRadius: 16, paddingVertical: 16,
        alignItems: 'center', marginTop: 8,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
