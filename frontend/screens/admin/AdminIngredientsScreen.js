import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Modal, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/common/AppHeader';
import API from '../../services/api';

const CATEGORIAS = ['proteina','lacteo','verdura','fruta','pan','salsa','condimento','grano','pasta','bebida','dulce','otro'];
const UNIDADES   = ['gr','ml','unidad'];

const CATEGORIA_COLOR = {
    proteina: '#E53935', lacteo: '#F9A825', verdura: '#43A047',
    fruta: '#FB8C00', pan: '#795548', salsa: '#E91E63',
    condimento: '#FF7043', grano: '#FDD835', pasta: '#FFA726',
    bebida: '#29B6F6', dulce: '#AB47BC', otro: '#78909C',
};

export default function AdminIngredientsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [ingredientes, setIngredientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ nombre: '', categoria: 'proteina', unidad_medida: 'gr' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.admin.ingredientes.getAll();
            if (res.success) setIngredientes(res.ingredientes);
        } catch {
            Alert.alert('Error', 'No se pudieron cargar los ingredientes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        if (!form.nombre.trim()) {
            Alert.alert('Error', 'El nombre es requerido');
            return;
        }
        setSaving(true);
        try {
            const res = await API.admin.ingredientes.create(form);
            if (res.success) {
                setIngredientes(prev => [...prev, res.ingrediente].sort((a, b) => a.nombre.localeCompare(b.nombre)));
                setModalVisible(false);
                setForm({ nombre: '', categoria: 'proteina', unidad_medida: 'gr' });
            } else {
                Alert.alert('Error', res.message);
            }
        } catch {
            Alert.alert('Error', 'No se pudo crear el ingrediente');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (item) => {
        Alert.alert(
            'Eliminar ingrediente',
            `¿Eliminar "${item.nombre}"? Esta acción no se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await API.admin.ingredientes.remove(item.id);
                            if (res.success) {
                                setIngredientes(prev => prev.filter(i => i.id !== item.id));
                            } else {
                                Alert.alert('Error', res.message);
                            }
                        } catch {
                            Alert.alert('Error', 'No se pudo eliminar');
                        }
                    },
                },
            ]
        );
    };

    const handleToggleActivo = async (item) => {
        try {
            const res = await API.admin.ingredientes.update(item.id, { activo: !item.activo });
            if (res.success) {
                setIngredientes(prev => prev.map(i => i.id === item.id ? { ...i, activo: !i.activo } : i));
            }
        } catch {}
    };

    const filtered = ingredientes.filter(i =>
        i.nombre.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <View style={[styles.item, !item.activo && styles.itemInactive]}>
            <View style={styles.itemLeft}>
                <View style={[styles.catBadge, { backgroundColor: CATEGORIA_COLOR[item.categoria] ?? '#78909C' }]}>
                    <Text style={styles.catText}>{item.categoria}</Text>
                </View>
                <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, !item.activo && styles.itemNameInactive]}>{item.nombre}</Text>
                    <Text style={styles.itemUnit}>{item.unidad_medida}</Text>
                </View>
            </View>
            <View style={styles.itemActions}>
                <TouchableOpacity
                    style={[styles.actionBtn, item.activo ? styles.activeBtn : styles.inactiveBtn]}
                    onPress={() => handleToggleActivo(item)}
                    accessibilityLabel={item.activo ? 'Desactivar' : 'Activar'}
                >
                    <Ionicons name={item.activo ? 'eye-outline' : 'eye-off-outline'} size={16} color={item.activo ? '#43A047' : '#aaa'} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item)}
                    accessibilityLabel="Eliminar ingrediente"
                >
                    <Ionicons name="trash-outline" size={16} color="#E53935" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            <AppHeader title="Ingredientes" subtitle={`${ingredientes.length} registrados`} onBack={() => navigation.goBack()} />

            <View style={[styles.body, { paddingTop: insets.top + 76 }]}>
                <View style={styles.searchRow}>
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
                    <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)} accessibilityLabel="Agregar ingrediente">
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF8700" style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={i => String(i.id)}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <Text style={styles.empty}>
                                {search ? 'Sin resultados' : 'No hay ingredientes. Agregá uno.'}
                            </Text>
                        }
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* Modal agregar */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Nuevo ingrediente</Text>

                        <Text style={styles.label}>Nombre</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: Pechuga de pollo"
                            placeholderTextColor="#bbb"
                            value={form.nombre}
                            onChangeText={t => setForm(f => ({ ...f, nombre: t }))}
                        />

                        <Text style={styles.label}>Categoría</Text>
                        <View style={styles.chipRow}>
                            {CATEGORIAS.map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.chip, form.categoria === cat && { backgroundColor: CATEGORIA_COLOR[cat] }]}
                                    onPress={() => setForm(f => ({ ...f, categoria: cat }))}
                                >
                                    <Text style={[styles.chipText, form.categoria === cat && styles.chipTextActive]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Unidad de medida</Text>
                        <View style={styles.chipRow}>
                            {UNIDADES.map(u => (
                                <TouchableOpacity
                                    key={u}
                                    style={[styles.chip, form.unidad_medida === u && styles.chipSelected]}
                                    onPress={() => setForm(f => ({ ...f, unidad_medida: u }))}
                                >
                                    <Text style={[styles.chipText, form.unidad_medida === u && styles.chipTextActive]}>{u}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
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

    searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    searchBox: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: '#eee',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a', fontFamily: 'Poppins-Regular' },
    addBtn: {
        width: 48, height: 48, borderRadius: 14, backgroundColor: '#FF8700',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#FF8700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },

    list: { paddingBottom: 100 },
    item: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: '#f0f0f0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    itemInactive: { opacity: 0.5 },
    itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    catBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 12 },
    catText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins-SemiBold', textTransform: 'capitalize' },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 15, color: '#1a1a1a', fontFamily: 'Poppins-SemiBold' },
    itemNameInactive: { color: '#aaa' },
    itemUnit: { fontSize: 12, color: '#999', fontFamily: 'Poppins-Regular', marginTop: 2 },

    itemActions: { flexDirection: 'row', gap: 8 },
    actionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    activeBtn: { borderColor: '#C8E6C9', backgroundColor: '#F1F8E9' },
    inactiveBtn: { borderColor: '#eee', backgroundColor: '#fafafa' },
    deleteBtn: { borderColor: '#FFCDD2', backgroundColor: '#FFF3F3' },

    empty: { textAlign: 'center', color: '#bbb', fontFamily: 'Poppins-Regular', marginTop: 60, fontSize: 14 },

    // Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40,
    },
    modalTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#1a1a1a', marginBottom: 20 },
    label: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#666', marginBottom: 8, marginTop: 14 },
    input: {
        borderWidth: 1, borderColor: '#eee', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1a1a1a', backgroundColor: '#fafafa',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fafafa',
    },
    chipSelected: { backgroundColor: '#FF8700', borderColor: '#FF8700' },
    chipText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#666', textTransform: 'capitalize' },
    chipTextActive: { color: '#fff', fontFamily: 'Poppins-SemiBold' },

    modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    cancelBtn: {
        flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 14,
        paddingVertical: 14, alignItems: 'center',
    },
    cancelText: { color: '#666', fontFamily: 'Poppins-SemiBold', fontSize: 15 },
    saveBtn: { flex: 1, backgroundColor: '#FF8700', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    saveText: { color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 15 },
});
