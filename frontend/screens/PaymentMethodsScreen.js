import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import AppHeader from '../components/common/AppHeader';
import InstructionBanner from '../components/common/InstructionBanner';
import { showSuccessMessage, showErrorMessage } from '../components/FlashMessageWrapper';
import api from '../services/api';

const TIPOS = ['tarjeta', 'efectivo', 'transferencia'];
const MARCAS = ['visa', 'mastercard', 'amex', 'otro'];

const TIPO_META = {
    tarjeta:       { icon: 'card',             color: '#1A1F71', label: 'Tarjeta' },
    efectivo:      { icon: 'cash',             color: '#34C759', label: 'Efectivo' },
    transferencia: { icon: 'swap-horizontal',  color: '#007AFF', label: 'Transferencia' },
};

const MARCA_META = {
    visa:       { color: '#1A1F71' },
    mastercard: { color: '#EB001B' },
    amex:       { color: '#007B5E' },
    otro:       { color: '#666' },
};

function getIconColor(method) {
    if (method.tipo === 'tarjeta' && method.marca) {
        return MARCA_META[method.marca]?.color ?? '#666';
    }
    return TIPO_META[method.tipo]?.color ?? '#666';
}

function getIcon(method) {
    return TIPO_META[method.tipo]?.icon ?? 'card';
}

function getLabel(method) {
    if (method.tipo === 'tarjeta') {
        const brand = method.marca ? method.marca.charAt(0).toUpperCase() + method.marca.slice(1) : '';
        const digits = method.ultimos_4_digitos ? ` •••• ${method.ultimos_4_digitos}` : '';
        return `${brand}${digits}`;
    }
    return TIPO_META[method.tipo]?.label ?? method.tipo;
}

export default function PaymentMethodsScreen({ navigation }) {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    // form state
    const [tipo, setTipo] = useState('tarjeta');
    const [marca, setMarca] = useState('visa');
    const [digitos, setDigitos] = useState('');
    const [esPrincipal, setEsPrincipal] = useState(false);

    useEffect(() => {
        loadMethods();
    }, []);

    const loadMethods = async () => {
        try {
            const res = await api.payments.getMethods();
            if (res.success) {
                setMethods(res.methods);
            } else {
                Alert.alert('Error', res.message || 'No se pudieron cargar los métodos');
            }
        } catch (e) {
            console.error('Error loading payment methods', e);
            Alert.alert('Error', 'No se pudieron cargar los métodos de pago');
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setTipo('tarjeta');
        setMarca('visa');
        setDigitos('');
        setEsPrincipal(false);
        setModalVisible(true);
    };

    const handleDelete = (id) => {
        Alert.alert('Eliminar', '¿Eliminar este método de pago?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await api.payments.deleteMethod(id);
                        if (res.success) {
                            setMethods(prev => prev.filter(m => m.id !== id));
                            showSuccessMessage('Método eliminado');
                        } else {
                            showErrorMessage(res.message || 'No se pudo eliminar');
                        }
                    } catch (e) {
                        console.error('Error deleting method', e);
                        showErrorMessage('No se pudo eliminar el método');
                    }
                }
            }
        ]);
    };

    const handleSave = async () => {
        if (tipo === 'tarjeta') {
            if (!/^\d{4}$/.test(digitos)) {
                Alert.alert('Validación', 'Ingresá exactamente los últimos 4 dígitos de la tarjeta');
                return;
            }
        }

        setSaving(true);
        try {
            const payload = {
                tipo,
                ...(tipo === 'tarjeta' && { ultimos_4_digitos: digitos, marca }),
                es_principal: esPrincipal,
            };
            const res = await api.payments.addMethod(payload);
            if (res.success) {
                setModalVisible(false);
                showSuccessMessage('Método de pago guardado');
                loadMethods();
            } else {
                showErrorMessage(res.message || 'No se pudo guardar');
            }
        } catch (e) {
            console.error('Error saving method', e);
            showErrorMessage('No se pudo guardar el método');
        } finally {
            setSaving(false);
        }
    };

    const renderRightActions = (id) => (
        <TouchableOpacity style={styles.rightAction} onPress={() => handleDelete(id)}>
            <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
    );

    const renderItem = ({ item }) => (
        <Swipeable renderRightActions={() => renderRightActions(item.id)}>
            <View style={styles.item}>
                <View style={[styles.iconCircle, { backgroundColor: getIconColor(item) + '18' }]}>
                    <Ionicons name={getIcon(item)} size={24} color={getIconColor(item)} />
                </View>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel}>{getLabel(item)}</Text>
                    <Text style={styles.itemSub}>{TIPO_META[item.tipo]?.label ?? item.tipo}</Text>
                </View>
                {item.es_principal && (
                    <View style={styles.principalBadge}>
                        <Ionicons name="star" size={12} color="#f1c40f" />
                        <Text style={styles.principalText}>Principal</Text>
                    </View>
                )}
            </View>
        </Swipeable>
    );

    if (loading) return (
        <View style={styles.container}>
            <AppHeader title="Métodos de Pago" onBack={() => navigation.goBack()} showCart={false} />
            <View style={styles.centered}><ActivityIndicator size="large" color="#ff8000" /></View>
        </View>
    );

    return (
        <View style={styles.container}>
            <AppHeader title="Métodos de Pago" onBack={() => navigation.goBack()} showCart={false} />

            <View style={styles.content}>
                {methods.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="wallet-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>No tenés métodos de pago guardados.</Text>
                    </View>
                ) : (
                    <>
                        <InstructionBanner text="Deslizá a la izquierda para eliminar" />
                        <FlatList
                            data={methods}
                            keyExtractor={m => String(m.id)}
                            renderItem={renderItem}
                            contentContainerStyle={{ paddingVertical: 10 }}
                        />
                    </>
                )}

                <TouchableOpacity style={styles.fab} onPress={openAdd}>
                    <Ionicons name="add" size={28} color="white" />
                </TouchableOpacity>
            </View>

            {/* ── MODAL AGREGAR ── */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
                        <Text style={styles.modalTitle}>Agregar método de pago</Text>

                        {/* Selector de tipo */}
                        <Text style={styles.fieldLabel}>Tipo</Text>
                        <View style={styles.pillRow}>
                            {TIPOS.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.pill, tipo === t && styles.pillActive]}
                                    onPress={() => setTipo(t)}
                                >
                                    <Ionicons
                                        name={TIPO_META[t].icon}
                                        size={14}
                                        color={tipo === t ? '#fff' : '#555'}
                                        style={{ marginRight: 4 }}
                                    />
                                    <Text style={[styles.pillText, tipo === t && styles.pillTextActive]}>
                                        {TIPO_META[t].label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Campos específicos para tarjeta */}
                        {tipo === 'tarjeta' && (
                            <>
                                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Marca</Text>
                                <View style={styles.pillRow}>
                                    {MARCAS.map(m => (
                                        <TouchableOpacity
                                            key={m}
                                            style={[styles.pill, marca === m && { backgroundColor: MARCA_META[m].color, borderColor: MARCA_META[m].color }]}
                                            onPress={() => setMarca(m)}
                                        >
                                            <Text style={[styles.pillText, marca === m && styles.pillTextActive]}>
                                                {m.charAt(0).toUpperCase() + m.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Últimos 4 dígitos</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="1234"
                                    value={digitos}
                                    onChangeText={t => setDigitos(t.replace(/\D/g, '').slice(0, 4))}
                                    keyboardType="numeric"
                                    maxLength={4}
                                />
                            </>
                        )}

                        {/* Principal */}
                        <TouchableOpacity
                            style={styles.principalRow}
                            onPress={() => setEsPrincipal(v => !v)}
                        >
                            <Ionicons
                                name={esPrincipal ? 'star' : 'star-outline'}
                                size={20}
                                color={esPrincipal ? '#f1c40f' : '#999'}
                            />
                            <Text style={styles.principalRowText}>
                                {esPrincipal ? 'Predeterminado' : 'Marcar como predeterminado'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                                disabled={saving}
                            >
                                {saving
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={styles.saveBtnText}>Guardar</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container:      { flex: 1, backgroundColor: '#f7f7f7', paddingTop: 110 },
    centered:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content:        { flex: 1, padding: 16 },

    empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText:      { color: '#999', fontSize: 15, textAlign: 'center' },

    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginVertical: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
    },
    iconCircle:     { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    itemInfo:       { flex: 1 },
    itemLabel:      { fontWeight: '700', fontSize: 15, color: '#222' },
    itemSub:        { fontSize: 12, color: '#888', marginTop: 2 },

    principalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff9e6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#f1c40f' },
    principalText:  { fontSize: 11, color: '#b8860b', fontWeight: '600' },

    rightAction:    { backgroundColor: '#cc0000', justifyContent: 'center', alignItems: 'center', width: 72, marginVertical: 6, borderRadius: 12 },

    fab: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#ff8000',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
    },

    // Modal
    modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modal:          { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle:     { fontSize: 18, fontWeight: '700', marginBottom: 18, color: '#222' },

    fieldLabel:     { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },

    pillRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fafafa' },
    pillActive:     { backgroundColor: '#ff8000', borderColor: '#ff8000' },
    pillText:       { fontSize: 13, color: '#555', fontWeight: '500' },
    pillTextActive: { color: '#fff' },

    input: {
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        letterSpacing: 4,
        color: '#222',
        marginTop: 4,
    },

    principalRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 4 },
    principalRowText: { color: '#444', fontSize: 14 },

    modalActions:   { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
    cancelBtn:      { paddingVertical: 12, paddingHorizontal: 20 },
    cancelBtnText:  { color: '#666', fontWeight: '500' },
    saveBtn:        { backgroundColor: '#ff8000', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10 },
    saveBtnText:    { color: '#fff', fontWeight: '700' },
});
