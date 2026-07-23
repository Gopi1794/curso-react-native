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

export default function AdminZonasEnvioScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const restaurante = useAppSelector(s => s.restaurant.selected);
    const [zonas, setZonas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [nombre, setNombre] = useState('');
    const [radioKm, setRadioKm] = useState('');
    const [costoEnvio, setCostoEnvio] = useState('');

    const load = useCallback(async () => {
        if (!restaurante) return;
        setLoading(true);
        try {
            const res = await API.admin.zonasEnvio.getAll(restaurante.id);
            if (res.success) setZonas(res.zonas);
        } catch {
            showErrorMessage('Error', 'No se pudieron cargar las zonas de envío');
        } finally {
            setLoading(false);
        }
    }, [restaurante]);

    useEffect(() => { load(); }, [load]);

    const handleCrear = async () => {
        if (!nombre.trim() || !radioKm.trim() || !costoEnvio.trim()) {
            showErrorMessage('Faltan datos', 'Completá nombre, radio y costo');
            return;
        }
        setSaving(true);
        try {
            const res = await API.admin.zonasEnvio.create(restaurante.id, {
                nombre: nombre.trim(),
                radio_km: parseFloat(radioKm),
                costo_envio: parseFloat(costoEnvio),
            });
            if (res.success) {
                showSuccessMessage('Zona creada', `${res.zona.nombre} — hasta ${res.zona.radio_km}km`);
                setNombre('');
                setRadioKm('');
                setCostoEnvio('');
                load();
            } else {
                showErrorMessage('Error', res.message || 'No se pudo crear la zona');
            }
        } catch {
            showErrorMessage('Error', 'No se pudo crear la zona');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActiva = async (zona) => {
        try {
            const res = await API.admin.zonasEnvio.update(zona.id, { activa: !zona.activa });
            if (res.success) {
                setZonas(prev => prev.map(z => z.id === zona.id ? { ...z, activa: res.zona.activa } : z));
            } else {
                showErrorMessage('Error', res.message || 'No se pudo actualizar la zona');
            }
        } catch {
            showErrorMessage('Error', 'No se pudo actualizar la zona');
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
            <AppHeader title="Zonas de envío" subtitle="Costo de envío según distancia" onBack={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}>
                {zonas.length === 0 && (
                    <Text style={styles.emptyText}>Todavía no configuraste ninguna zona. Sin zonas activas, los pedidos se rechazan en el checkout.</Text>
                )}

                {zonas.map(zona => (
                    <View key={zona.id} style={[styles.zonaCard, !zona.activa && styles.zonaCardInactiva]}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.zonaNombre}>{zona.nombre}</Text>
                            <Text style={styles.zonaDetalle}>Hasta {zona.radio_km}km — ${parseFloat(zona.costo_envio).toFixed(2)}</Text>
                        </View>
                        <Switch
                            value={zona.activa}
                            onValueChange={() => handleToggleActiva(zona)}
                            trackColor={{ false: '#ccc', true: '#FFD0A0' }}
                            thumbColor={zona.activa ? '#FF8700' : '#888'}
                        />
                    </View>
                ))}

                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Nueva zona</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre (ej. Zona centro)"
                        value={nombre}
                        onChangeText={setNombre}
                        maxLength={40}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Radio en km (ej. 3)"
                        value={radioKm}
                        onChangeText={(text) => setRadioKm(text.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Costo de envío (ej. 500)"
                        value={costoEnvio}
                        onChangeText={(text) => setCostoEnvio(text.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={handleCrear} disabled={saving}>
                        {saving ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                                <Text style={styles.addBtnText}>Agregar zona</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F5' },
    centered: { alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 18 },
    zonaCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    },
    zonaCardInactiva: { opacity: 0.5 },
    zonaNombre: { fontSize: 15, fontWeight: '600', color: '#222' },
    zonaDetalle: { fontSize: 13, color: '#888', marginTop: 2 },
    formCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 8,
    },
    formTitle: { fontSize: 13, color: '#888', marginBottom: 8, fontWeight: '600' },
    input: {
        borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 12,
    },
    addBtn: {
        flexDirection: 'row', gap: 6, backgroundColor: '#FF8700', borderRadius: 16,
        paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    },
    addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
