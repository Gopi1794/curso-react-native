import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Modal, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/common/AppHeader';
import { showSuccessMessage, showErrorMessage } from '../../components/FlashMessageWrapper';
import API from '../../services/api';
import { useAppSelector } from '../../store/hooks';

const CATEGORIA_COLOR = {
    proteina: '#E53935', lacteo: '#F9A825', verdura: '#43A047',
    fruta: '#FB8C00', pan: '#795548', salsa: '#E91E63',
    condimento: '#FF7043', grano: '#FDD835', pasta: '#FFA726',
    bebida: '#29B6F6', dulce: '#AB47BC', otro: '#78909C',
};

const stockColor = (cantidad, umbral) => {
    if (cantidad <= 0) return '#E53935';
    if (cantidad <= umbral) return '#FB8C00';
    return '#43A047';
};

export default function AdminStockScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const restaurante = useAppSelector(s => s.restaurant.selected);
    const restauranteId = restaurante?.id ?? 1;

    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editItem, setEditItem] = useState(null);
    const [editCantidad, setEditCantidad] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.admin.stock.getByRestaurante(restauranteId);
            if (res.success) setStock(res.stock);
        } catch {
            showErrorMessage('Error', 'No se pudo cargar el stock');
        } finally {
            setLoading(false);
        }
    }, [restauranteId]);

    useEffect(() => { load(); }, [load]);

    const openEdit = (item) => {
        setEditItem(item);
        setEditCantidad(String(item.cantidad));
    };

    const handleSave = async () => {
        const cantidad = parseFloat(editCantidad);
        if (isNaN(cantidad) || cantidad < 0) {
            showErrorMessage('Cantidad inválida');
            return;
        }
        setSaving(true);
        try {
            const res = await API.admin.stock.update(editItem.id, { cantidad });
            if (res.success) {
                setStock(prev => prev.map(s => s.id === editItem.id ? { ...s, cantidad: res.stock.cantidad } : s));
                setEditItem(null);
                showSuccessMessage('Stock actualizado', `${editItem.nombre}: ${cantidad} ${editItem.unidad_medida}`);
            } else {
                showErrorMessage('Error', res.message);
            }
        } catch {
            showErrorMessage('Error', 'No se pudo actualizar el stock');
        } finally {
            setSaving(false);
        }
    };

    const filtered = stock.filter(s =>
        s.nombre.toLowerCase().includes(search.toLowerCase()) ||
        s.categoria.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }) => {
        const color = stockColor(item.cantidad, item.umbral_minimo);
        return (
            <TouchableOpacity style={styles.row} onPress={() => openEdit(item)} activeOpacity={0.7}>
                <View style={[styles.catDot, { backgroundColor: CATEGORIA_COLOR[item.categoria] ?? '#78909C' }]} />
                <View style={styles.info}>
                    <Text style={styles.nombre}>{item.nombre}</Text>
                    <Text style={styles.categoria}>{item.categoria}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
                    <Text style={[styles.badgeNum, { color }]}>{item.cantidad}</Text>
                    <Text style={[styles.badgeUnit, { color }]}>{item.unidad_medida}</Text>
                </View>
                <Ionicons name="pencil-outline" size={16} color="#ccc" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            <AppHeader title="Stock" subtitle={`${stock.length} ingredientes`} onBack={() => navigation.goBack()} />

            <View style={[styles.body, { paddingTop: insets.top + 76 }]}>
                <View style={styles.legend}>
                    {[['#43A047','OK'],['#FB8C00','Bajo'],['#E53935','Sin stock']].map(([c,l]) => (
                        <View key={l} style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: c }]} />
                            <Text style={styles.legendText}>{l}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar ingrediente..."
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
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.empty}>Sin resultados</Text>}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={20}
                        maxToRenderPerBatch={20}
                        windowSize={5}
                    />
                )}
            </View>

            <Modal visible={!!editItem} animationType="slide" transparent onRequestClose={() => setEditItem(null)}>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Editar stock</Text>
                        <Text style={styles.modalSub}>{editItem?.nombre}</Text>
                        <Text style={styles.label}>Cantidad ({editItem?.unidad_medida})</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={editCantidad}
                            onChangeText={setEditCantidad}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditItem(null)}>
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar</Text>}
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
        elevation: 1,
    },
    searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a', fontFamily: 'Poppins-Regular' },
    list: { paddingBottom: 120 },
    row: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: '#f0f0f0', elevation: 1,
    },
    catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    info: { flex: 1 },
    nombre: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#1a1a1a' },
    categoria: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#aaa', textTransform: 'capitalize' },
    badge: {
        flexDirection: 'row', alignItems: 'baseline', gap: 3,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
    },
    badgeNum: { fontSize: 15, fontFamily: 'Poppins-Bold' },
    badgeUnit: { fontSize: 11, fontFamily: 'Poppins-Regular' },
    empty: { textAlign: 'center', color: '#bbb', fontFamily: 'Poppins-Regular', marginTop: 60, fontSize: 14 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#1a1a1a', marginBottom: 4 },
    modalSub: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#888', marginBottom: 20 },
    label: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#666', marginBottom: 8 },
    input: {
        borderWidth: 1, borderColor: '#eee', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 20, fontFamily: 'Poppins-Regular', color: '#1a1a1a', backgroundColor: '#fafafa',
    },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    cancelText: { color: '#666', fontFamily: 'Poppins-SemiBold', fontSize: 15 },
    saveBtn: { flex: 1, backgroundColor: '#FF8700', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    saveText: { color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 15 },
});
