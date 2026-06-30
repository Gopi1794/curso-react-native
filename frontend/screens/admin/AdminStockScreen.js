import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Modal, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/common/AppHeader';
import API from '../../services/api';
import { useAppSelector } from '../../store/hooks';

const CATEGORIA_COLOR = {
    proteina: '#E53935', lacteo: '#F9A825', verdura: '#43A047',
    fruta: '#FB8C00', pan: '#795548', salsa: '#E91E63',
    condimento: '#FF7043', grano: '#FDD835', pasta: '#FFA726',
    bebida: '#29B6F6', dulce: '#AB47BC', otro: '#78909C',
};

export default function AdminStockScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const restaurante = useAppSelector(s => s.restaurant.selected);
    const restauranteId = restaurante?.id ?? 1;

    const [platos, setPlatos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editItem, setEditItem] = useState(null);
    const [editCantidad, setEditCantidad] = useState('');
    const [saving, setSaving] = useState(false);
    const [expandedPlato, setExpandedPlato] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.admin.stock.getPlatosByRestaurante(restauranteId);
            if (res.success) setPlatos(res.platos);
        } catch {
            Alert.alert('Error', 'No se pudo cargar el stock');
        } finally {
            setLoading(false);
        }
    }, [restauranteId]);

    useEffect(() => { load(); }, [load]);

    const openEdit = (ingrediente) => {
        setEditItem(ingrediente);
        setEditCantidad(String(ingrediente.stock_actual));
    };

    const handleSave = async () => {
        const cantidad = parseFloat(editCantidad);
        if (isNaN(cantidad) || cantidad < 0) {
            Alert.alert('Error', 'Cantidad inválida');
            return;
        }
        if (!editItem.stock_id) {
            Alert.alert('Sin stock registrado', 'Este ingrediente no tiene registro de stock aún. Agregalo desde la sección de ingredientes.');
            return;
        }
        setSaving(true);
        try {
            const res = await API.admin.stock.update(editItem.stock_id, { cantidad });
            if (res.success) {
                setPlatos(prev => prev.map(p => ({
                    ...p,
                    ingredientes: p.ingredientes.map(i =>
                        i.ingrediente_id === editItem.ingrediente_id
                            ? { ...i, stock_actual: res.stock.cantidad }
                            : i
                    ),
                })));
                setEditItem(null);
            } else {
                Alert.alert('Error', res.message);
            }
        } catch {
            Alert.alert('Error', 'No se pudo actualizar el stock');
        } finally {
            setSaving(false);
        }
    };

    const stockColor = (actual, umbral) => {
        if (actual <= 0) return '#E53935';
        if (actual <= umbral) return '#FB8C00';
        return '#43A047';
    };

    const filtered = platos.filter(p =>
        p.plato.toLowerCase().includes(search.toLowerCase())
    );

    const renderIngrediente = (ing, idx) => (
        <View key={idx} style={styles.ingRow}>
            <View style={[styles.catDot, { backgroundColor: CATEGORIA_COLOR[ing.categoria] ?? '#78909C' }]} />
            <View style={styles.ingInfo}>
                <Text style={styles.ingNombre}>{ing.nombre}</Text>
                <Text style={styles.ingUso}>Usa: {ing.cantidad_usada} {ing.unidad_medida} por plato</Text>
            </View>
            <TouchableOpacity style={[styles.stockBadge, { backgroundColor: stockColor(ing.stock_actual, ing.umbral_minimo) + '22', borderColor: stockColor(ing.stock_actual, ing.umbral_minimo) }]} onPress={() => openEdit(ing)}>
                <Text style={[styles.stockNum, { color: stockColor(ing.stock_actual, ing.umbral_minimo) }]}>
                    {ing.stock_actual} {ing.unidad_medida}
                </Text>
                <Ionicons name="pencil-outline" size={12} color={stockColor(ing.stock_actual, ing.umbral_minimo)} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
        </View>
    );

    const renderPlato = ({ item }) => {
        const expanded = expandedPlato === item.id;
        const sinStock = item.ingredientes.some(i => i.stock_actual <= 0);
        const bajoStock = item.ingredientes.some(i => i.stock_actual > 0 && i.stock_actual <= i.umbral_minimo);

        return (
            <View style={styles.platoCard}>
                <TouchableOpacity style={styles.platoHeader} onPress={() => setExpandedPlato(expanded ? null : item.id)}>
                    <View style={styles.platoLeft}>
                        {sinStock
                            ? <Ionicons name="close-circle" size={20} color="#E53935" />
                            : bajoStock
                                ? <Ionicons name="warning" size={20} color="#FB8C00" />
                                : <Ionicons name="checkmark-circle" size={20} color="#43A047" />
                        }
                        <Text style={styles.platoNombre}>{item.plato}</Text>
                    </View>
                    <View style={styles.platoRight}>
                        <Text style={styles.ingCount}>{item.ingredientes.length} ing.</Text>
                        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#aaa" />
                    </View>
                </TouchableOpacity>

                {expanded && (
                    <View style={styles.ingList}>
                        {item.ingredientes.length === 0
                            ? <Text style={styles.noIng}>Sin ingredientes registrados</Text>
                            : item.ingredientes.map((ing, idx) => renderIngrediente(ing, idx))
                        }
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            <AppHeader title="Stock" subtitle="Por plato" onBack={() => navigation.goBack()} />

            <View style={[styles.body, { paddingTop: insets.top + 44 + 16 }]}>
                {/* Leyenda */}
                <View style={styles.legend}>
                    <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#43A047' }]} /><Text style={styles.legendText}>OK</Text></View>
                    <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#FB8C00' }]} /><Text style={styles.legendText}>Bajo</Text></View>
                    <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#E53935' }]} /><Text style={styles.legendText}>Sin stock</Text></View>
                </View>

                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar plato..."
                        placeholderTextColor="#bbb"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF8700" style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={i => String(i.id)}
                        renderItem={renderPlato}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.empty}>No hay platos registrados</Text>}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* Modal editar stock */}
            <Modal visible={!!editItem} animationType="slide" transparent onRequestClose={() => setEditItem(null)}>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Editar stock</Text>
                        <Text style={styles.modalSub}>{editItem?.nombre}</Text>

                        <Text style={styles.label}>Cantidad actual ({editItem?.unidad_medida})</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={editCantidad}
                            onChangeText={setEditCantidad}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditItem(null)}>
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                                {saving
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.saveText}>Guardar</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },
    body: { flex: 1, paddingHorizontal: 16 },

    legend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, color: '#888', fontFamily: 'Poppins-Regular' },

    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: '#eee', marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a', fontFamily: 'Poppins-Regular' },

    list: { paddingBottom: 100 },
    platoCard: {
        backgroundColor: '#fff', borderRadius: 14, marginBottom: 8,
        borderWidth: 1, borderColor: '#f0f0f0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
        overflow: 'hidden',
    },
    platoHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 14,
    },
    platoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    platoNombre: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#1a1a1a', flex: 1 },
    platoRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ingCount: { fontSize: 12, color: '#aaa', fontFamily: 'Poppins-Regular' },

    ingList: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
    ingRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#f9f9f9',
    },
    catDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    ingInfo: { flex: 1 },
    ingNombre: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#333' },
    ingUso: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#aaa', marginTop: 1 },
    stockBadge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1,
    },
    stockNum: { fontSize: 13, fontFamily: 'Poppins-SemiBold' },

    noIng: { color: '#bbb', fontFamily: 'Poppins-Regular', fontSize: 13, paddingVertical: 12 },
    empty: { textAlign: 'center', color: '#bbb', fontFamily: 'Poppins-Regular', marginTop: 60, fontSize: 14 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#1a1a1a', marginBottom: 4 },
    modalSub: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#888', marginBottom: 20 },
    label: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#666', marginBottom: 8 },
    input: {
        borderWidth: 1, borderColor: '#eee', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 16, fontFamily: 'Poppins-Regular', color: '#1a1a1a', backgroundColor: '#fafafa',
    },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    cancelText: { color: '#666', fontFamily: 'Poppins-SemiBold', fontSize: 15 },
    saveBtn: { flex: 1, backgroundColor: '#FF8700', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    saveText: { color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 15 },
});
