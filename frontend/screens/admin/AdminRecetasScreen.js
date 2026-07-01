import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Modal, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/common/AppHeader';
import { showSuccessMessage, showErrorMessage } from '../../components/FlashMessageWrapper';
import API from '../../services/api';
import { useAppSelector } from '../../store/hooks';

const CATEGORIA_ICON = {
    burgers: 'fast-food-outline',
    ensaladas: 'leaf-outline',
    sandwichs: 'nutrition-outline',
    pizzas: 'pizza-outline',
    pastas: 'flame-outline',
    emplatados: 'restaurant-outline',
    postres: 'cafe-outline',
    helados: 'snow-outline',
    bebidas: 'beer-outline',
    promos: 'pricetag-outline',
};

export default function AdminRecetasScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const restaurante = useAppSelector(s => s.restaurant.selected);
    const restauranteId = restaurante?.id;

    const [platos, setPlatos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedPlato, setSelectedPlato] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!restauranteId) return;
        setLoading(true);
        try {
            const res = await API.admin.recetas.getByRestaurante(restauranteId);
            if (res.success) setPlatos(res.platos);
        } catch {
            showErrorMessage('Error', 'No se pudieron cargar las recetas');
        } finally {
            setLoading(false);
        }
    }, [restauranteId]);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        if (!search.trim()) return platos;
        const q = search.toLowerCase();
        return platos.filter(p => p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q));
    }, [platos, search]);

    const openReceta = (plato) => {
        setSelectedPlato(plato);
        const vals = {};
        plato.ingredientes.forEach(i => { vals[i.id] = String(i.cantidad_usada); });
        setEditValues(vals);
    };

    const handleSave = async () => {
        const items = selectedPlato.ingredientes;
        for (const item of items) {
            const val = parseFloat(editValues[item.id]);
            if (isNaN(val) || val <= 0) {
                showErrorMessage('Valor inválido', `"${item.nombre}" debe ser mayor a 0`);
                return;
            }
        }
        setSaving(true);
        try {
            await Promise.all(
                items
                    .filter(item => parseFloat(editValues[item.id]) !== item.cantidad_usada)
                    .map(item => API.admin.recetas.updateCantidad(item.id, parseFloat(editValues[item.id])))
            );
            setPlatos(prev => prev.map(p =>
                p.id === selectedPlato.id
                    ? { ...p, ingredientes: p.ingredientes.map(i => ({ ...i, cantidad_usada: parseFloat(editValues[i.id]) })) }
                    : p
            ));
            showSuccessMessage('Receta guardada', selectedPlato.nombre);
            setSelectedPlato(null);
        } catch {
            showErrorMessage('Error', 'No se pudieron guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    const renderPlato = ({ item }) => {
        const sinReceta = item.ingredientes.length === 0;
        const icon = CATEGORIA_ICON[item.categoria] || 'restaurant-outline';
        return (
            <TouchableOpacity style={styles.row} onPress={() => openReceta(item)} activeOpacity={0.7}>
                <View style={styles.rowIcon}>
                    <Ionicons name={icon} size={20} color="#FF8700" />
                </View>
                <View style={styles.rowInfo}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.nombre}</Text>
                    <Text style={styles.rowSub}>
                        {sinReceta
                            ? 'Sin ingredientes cargados'
                            : `${item.ingredientes.length} ingrediente${item.ingredientes.length !== 1 ? 's' : ''}`}
                    </Text>
                </View>
                {sinReceta
                    ? <View style={styles.badge}><Text style={styles.badgeText}>vacía</Text></View>
                    : <Ionicons name="chevron-forward" size={18} color="#ccc" />
                }
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            <AppHeader title="Recetas" onBack={() => navigation.goBack()} />

            <View style={[styles.body, { paddingTop: insets.top + 76 }]}>
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar plato..."
                        placeholderTextColor="#bbb"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color="#bbb" />
                        </TouchableOpacity>
                    )}
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF8700" style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={i => String(i.id)}
                        renderItem={renderPlato}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={<Text style={styles.empty}>Sin resultados</Text>}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                    />
                )}
            </View>

            {/* Modal edición de receta */}
            <Modal visible={!!selectedPlato} animationType="slide" transparent onRequestClose={() => setSelectedPlato(null)}>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrapper}>
                        <View style={styles.modal}>
                            <View style={styles.modalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalTitle} numberOfLines={1}>{selectedPlato?.nombre}</Text>
                                    <Text style={styles.modalSub}>{selectedPlato?.categoria}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedPlato(null)} style={styles.closeBtn}>
                                    <Ionicons name="close" size={22} color="#555" />
                                </TouchableOpacity>
                            </View>

                            {selectedPlato?.ingredientes.length === 0 ? (
                                <View style={styles.emptyReceta}>
                                    <Ionicons name="alert-circle-outline" size={40} color="#ddd" />
                                    <Text style={styles.emptyRecetaText}>Este plato no tiene ingredientes asignados.</Text>
                                    <Text style={styles.emptyRecetaSub}>Asignales desde el catálogo de ingredientes.</Text>
                                </View>
                            ) : (
                                <>
                                    <View style={styles.tableHeader}>
                                        <Text style={[styles.thCell, { flex: 1 }]}>Ingrediente</Text>
                                        <Text style={[styles.thCell, styles.thRight]}>Cantidad</Text>
                                        <Text style={[styles.thCell, styles.thRight, { width: 52 }]}>Unidad</Text>
                                    </View>

                                    <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
                                        {selectedPlato?.ingredientes.map(item => (
                                            <View key={item.id} style={styles.tableRow}>
                                                <Text style={styles.tdName} numberOfLines={1}>{item.nombre}</Text>
                                                <TextInput
                                                    style={styles.tdInput}
                                                    value={editValues[item.id] ?? String(item.cantidad_usada)}
                                                    onChangeText={v => setEditValues(prev => ({ ...prev, [item.id]: v }))}
                                                    keyboardType="decimal-pad"
                                                    selectTextOnFocus
                                                />
                                                <Text style={styles.tdUnit}>{item.unidad_medida}</Text>
                                            </View>
                                        ))}
                                    </ScrollView>

                                    <TouchableOpacity
                                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                                        onPress={handleSave}
                                        disabled={saving}
                                    >
                                        {saving
                                            ? <ActivityIndicator color="#fff" size="small" />
                                            : <Text style={styles.saveBtnText}>Guardar receta</Text>
                                        }
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },
    body: { flex: 1, paddingHorizontal: 16 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12,
        height: 44, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    searchInput: { flex: 1, fontFamily: 'Poppins-Regular', fontSize: 14, color: '#333' },
    list: { paddingBottom: 32 },
    separator: { height: 1, backgroundColor: '#f0f0f0' },
    empty: { textAlign: 'center', color: '#aaa', fontFamily: 'Poppins-Regular', marginTop: 40 },

    row: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 16,
    },
    rowIcon: {
        width: 38, height: 38, borderRadius: 10,
        backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    rowInfo: { flex: 1 },
    rowName: { fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#333' },
    rowSub: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#aaa', marginTop: 1 },
    badge: { backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontFamily: 'Poppins-SemiBold', fontSize: 11, color: '#FF8700' },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalWrapper: { justifyContent: 'flex-end' },
    modal: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 36, maxHeight: '85%',
    },
    modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    modalTitle: { fontFamily: 'Poppins-Bold', fontSize: 18, color: '#222' },
    modalSub: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#aaa', textTransform: 'capitalize', marginTop: 2 },
    closeBtn: { padding: 4, marginLeft: 8 },

    tableHeader: {
        flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4,
        borderBottomWidth: 2, borderBottomColor: '#f0f0f0', marginBottom: 4,
    },
    thCell: { fontFamily: 'Poppins-SemiBold', fontSize: 12, color: '#aaa' },
    thRight: { textAlign: 'right', width: 70 },

    tableBody: { maxHeight: 320 },
    tableRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 10, paddingHorizontal: 4,
        borderBottomWidth: 1, borderBottomColor: '#f9f9f9',
    },
    tdName: { flex: 1, fontFamily: 'Poppins-Regular', fontSize: 14, color: '#333' },
    tdInput: {
        width: 70, height: 38, borderWidth: 1, borderColor: '#e0e0e0',
        borderRadius: 8, textAlign: 'center',
        fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#333',
        backgroundColor: '#FAFAFA',
    },
    tdUnit: { width: 52, textAlign: 'right', fontFamily: 'Poppins-Regular', fontSize: 12, color: '#aaa' },

    emptyReceta: { alignItems: 'center', paddingVertical: 32 },
    emptyRecetaText: { fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#ccc', marginTop: 12, textAlign: 'center' },
    emptyRecetaSub: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#ddd', marginTop: 4, textAlign: 'center' },

    saveBtn: {
        backgroundColor: '#FF8700', borderRadius: 14, height: 50,
        justifyContent: 'center', alignItems: 'center', marginTop: 20,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { fontFamily: 'Poppins-Bold', fontSize: 16, color: '#fff' },
});
