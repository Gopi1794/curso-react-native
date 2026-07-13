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

const TIPOS_PREMIO = [
    { value: null,            label: 'Solo visual' },
    { value: 'porcentaje',    label: '% de descuento' },
    { value: 'envio_gratis',  label: 'Envío gratis' },
    { value: 'plato_gratis',  label: 'Plato gratis' },
    { value: 'postre_gratis', label: 'Postre gratis' },
    { value: '2x1_bebidas',   label: '2x1 bebidas' },
    { value: '2x1_pizzas',    label: '2x1 pizzas' },
];

const emptySlots = () => Array.from({ length: 8 }, (_, i) => ({ posicion: i, label: '', icon: null, tipo: null, valor: '' }));

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
                setPremios(res.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null, tipo: p.tipo || null, valor: p.valor != null ? String(p.valor) : '' })));
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
        updateSlot(posicion, { label: '', icon: null, tipo: null, valor: '' });
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
                    tipo: p.label.trim() ? p.tipo : null,
                    valor: p.tipo === 'porcentaje' ? (parseFloat(p.valor) || 0) : null,
                })),
            });
            if (res.success) {
                showSuccessMessage('Guardado', 'La configuración de la ruleta se actualizó');
                setPremios(res.data.premios.map(p => ({ posicion: p.posicion, label: p.label || '', icon: p.icon || null, tipo: p.tipo || null, valor: p.valor != null ? String(p.valor) : '' })));
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
                        <Text style={styles.tipoLabel}>Tipo de premio</Text>
                        <View style={styles.tipoGrid}>
                            {TIPOS_PREMIO.map((t) => (
                                <TouchableOpacity
                                    key={t.label}
                                    style={[styles.tipoChip, premio.tipo === t.value && styles.tipoChipSelected]}
                                    onPress={() => updateSlot(premio.posicion, { tipo: t.value })}
                                >
                                    <Text style={[styles.tipoChipText, premio.tipo === t.value && styles.tipoChipTextSelected]}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {premio.tipo === 'porcentaje' && (
                            <TextInput
                                style={styles.input}
                                placeholder="Porcentaje (ej. 15)"
                                value={premio.valor}
                                onChangeText={(text) => updateSlot(premio.posicion, { valor: text.replace(/[^0-9]/g, '') })}
                                keyboardType="numeric"
                                maxLength={3}
                            />
                        )}
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
    tipoLabel: { fontSize: 12, color: '#888', marginBottom: 6, fontWeight: '600' },
    tipoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    tipoChip: {
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
        backgroundColor: '#F0F0F0',
    },
    tipoChipSelected: { backgroundColor: '#FF8700' },
    tipoChipText: { fontSize: 12, color: '#666', fontWeight: '600' },
    tipoChipTextSelected: { color: '#fff' },
    clearBtn: { alignSelf: 'flex-start' },
    clearBtnText: { color: '#E53935', fontSize: 13, fontWeight: '600' },
    saveBtn: {
        backgroundColor: '#FF8700', borderRadius: 16, paddingVertical: 16,
        alignItems: 'center', marginTop: 8,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
