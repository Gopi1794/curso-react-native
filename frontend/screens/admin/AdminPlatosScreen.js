import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Modal, ActivityIndicator, StatusBar, Alert,
    ScrollView, Image, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { imageMap } from '../../assets/utils/imageMap';
import AppHeader from '../../components/common/AppHeader';
import API from '../../services/api';
import { useAppSelector } from '../../store/hooks';

const CATEGORIAS = ['burgers','pizzas','sushi','pasta','ensaladas','bebidas','postres','otros'];

const emptyForm = () => ({ nombre: '', precio: '', categoria: 'burgers', descripcion: '', imagen_url: '' });

export default function AdminPlatosScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const restaurante = useAppSelector(s => s.restaurant.selected);
    const restauranteId = restaurante?.id ?? 1;

    const [platos, setPlatos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.admin.platos.getAll(restauranteId);
            if (res.success) setPlatos(res.platos);
        } catch {
            Alert.alert('Error', 'No se pudieron cargar los platos');
        } finally {
            setLoading(false);
        }
    }, [restauranteId]);

    useEffect(() => { load(); }, [load]);

    const handleToggle = async (item) => {
        try {
            const res = await API.admin.platos.toggle(item.id);
            if (res.success) {
                setPlatos(prev => prev.map(p => p.id === item.id ? { ...p, disponible: !p.disponible } : p));
            }
        } catch {
            Alert.alert('Error', 'No se pudo cambiar el estado');
        }
    };

    const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (result.canceled) return;

        setUploading(true);
        try {
            const res = await API.admin.upload(result.assets[0].uri);
            if (res.success) {
                setForm(f => ({ ...f, imagen_url: res.url }));
            } else {
                Alert.alert('Error', res.message);
            }
        } catch {
            Alert.alert('Error', 'No se pudo subir la imagen');
        } finally {
            setUploading(false);
        }
    };

    const handleCreate = async () => {
        if (!form.nombre.trim() || !form.precio || !form.categoria) {
            Alert.alert('Error', 'Nombre, precio y categoría son requeridos');
            return;
        }
        setSaving(true);
        try {
            const res = await API.admin.platos.create(restauranteId, form);
            if (res.success) {
                setPlatos(prev => [...prev, res.plato]);
                setModalVisible(false);
                setForm(emptyForm());
            } else {
                Alert.alert('Error', res.message);
            }
        } catch {
            Alert.alert('Error', 'No se pudo crear el plato');
        } finally {
            setSaving(false);
        }
    };

    const filtered = platos.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.categoria.toLowerCase().includes(search.toLowerCase())
    );

    const getImageSource = (item) => {
        if (item.imagen_url) return { uri: item.imagen_url };
        if (item.imagen_key && imageMap[item.imagen_key]) return { uri: imageMap[item.imagen_key] };
        return null;
    };

    const renderItem = ({ item }) => {
        const imgSrc = getImageSource(item);
        return (
        <View style={[styles.row, !item.disponible && styles.rowInactive]}>
            {imgSrc ? (
                <Image source={imgSrc} style={styles.thumb} />
            ) : (
                <View style={styles.thumbPlaceholder}>
                    <Ionicons name="fast-food-outline" size={22} color="#ddd" />
                </View>
            )}
            <View style={styles.info}>
                <Text style={styles.nombre} numberOfLines={1}>{item.nombre}</Text>
                <Text style={styles.categoria}>{item.categoria}</Text>
                <Text style={styles.precio}>${parseFloat(item.precio).toFixed(2)}</Text>
            </View>
            <Switch
                value={item.disponible}
                onValueChange={() => handleToggle(item)}
                thumbColor={item.disponible ? '#FF8700' : '#ccc'}
                trackColor={{ false: '#eee', true: '#FFD580' }}
            />
        </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            <AppHeader title="Platos" subtitle={`${platos.length} platos`} onBack={() => navigation.goBack()} />

            <View style={[styles.body, { paddingTop: insets.top + 76 }]}>
                <View style={styles.topRow}>
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
                    <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
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
                        ListEmptyComponent={<Text style={styles.empty}>Sin resultados</Text>}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalTitle}>Nuevo plato</Text>

                            <Text style={styles.label}>Nombre *</Text>
                            <TextInput style={styles.input} placeholder="Ej: Burger clásica" placeholderTextColor="#bbb" value={form.nombre} onChangeText={t => setForm(f => ({ ...f, nombre: t }))} />

                            <Text style={styles.label}>Precio *</Text>
                            <TextInput style={styles.input} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#bbb" value={form.precio} onChangeText={t => setForm(f => ({ ...f, precio: t }))} />

                            <Text style={styles.label}>Categoría *</Text>
                            <View style={styles.chipRow}>
                                {CATEGORIAS.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.chip, form.categoria === cat && styles.chipSelected]}
                                        onPress={() => setForm(f => ({ ...f, categoria: cat }))}
                                    >
                                        <Text style={[styles.chipText, form.categoria === cat && styles.chipTextSelected]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Descripción (opcional)</Text>
                            <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                placeholder="Descripción del plato..."
                                placeholderTextColor="#bbb"
                                multiline
                                value={form.descripcion}
                                onChangeText={t => setForm(f => ({ ...f, descripcion: t }))}
                            />

                            <Text style={styles.label}>Imagen</Text>
                            <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
                                {uploading ? (
                                    <ActivityIndicator color="#FF8700" />
                                ) : form.imagen_url ? (
                                    <Image source={{ uri: form.imagen_url }} style={styles.imagePreview} />
                                ) : (
                                    <>
                                        <Ionicons name="image-outline" size={28} color="#ccc" />
                                        <Text style={styles.imagePickerText}>Seleccionar imagen</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                    <Text style={styles.cancelText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },
    body: { flex: 1, paddingHorizontal: 16 },
    topRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    searchBox: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: '#eee', elevation: 1,
    },
    searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a', fontFamily: 'Poppins-Regular' },
    addBtn: {
        width: 48, height: 48, borderRadius: 14, backgroundColor: '#FF8700',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#FF8700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    list: { paddingBottom: 120 },
    row: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
        borderWidth: 1, borderColor: '#f0f0f0', elevation: 1, gap: 12,
    },
    rowInactive: { opacity: 0.5 },
    thumb: { width: 56, height: 56, borderRadius: 10 },
    thumbPlaceholder: {
        width: 56, height: 56, borderRadius: 10,
        backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center',
    },
    info: { flex: 1 },
    nombre: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#1a1a1a' },
    categoria: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#aaa', textTransform: 'capitalize' },
    precio: { fontSize: 14, fontFamily: 'Poppins-Bold', color: '#FF8700', marginTop: 2 },
    empty: { textAlign: 'center', color: '#bbb', fontFamily: 'Poppins-Regular', marginTop: 60, fontSize: 14 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '92%' },
    modalTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#1a1a1a', marginBottom: 16 },
    label: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#666', marginBottom: 6, marginTop: 12 },
    input: {
        borderWidth: 1, borderColor: '#eee', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 11,
        fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1a1a1a', backgroundColor: '#fafafa',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fafafa' },
    chipSelected: { backgroundColor: '#FF8700', borderColor: '#FF8700' },
    chipText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#666', textTransform: 'capitalize' },
    chipTextSelected: { color: '#fff', fontFamily: 'Poppins-SemiBold' },
    imagePicker: {
        borderWidth: 1, borderColor: '#eee', borderRadius: 12, borderStyle: 'dashed',
        height: 100, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa',
    },
    imagePreview: { width: '100%', height: 100, borderRadius: 12 },
    imagePickerText: { color: '#bbb', fontFamily: 'Poppins-Regular', fontSize: 13, marginTop: 6 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    cancelText: { color: '#666', fontFamily: 'Poppins-SemiBold', fontSize: 15 },
    saveBtn: { flex: 1, backgroundColor: '#FF8700', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    saveText: { color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 15 },
});
