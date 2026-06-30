import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, SectionList, TouchableOpacity,
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

const ITEMS_PER_PAGE = 10;

const CATEGORIAS = ['burgers','pizzas','sushi','pasta','ensaladas','bebidas','postres','otros'];

const CATEGORIA_ICON = {
    burgers: 'fast-food-outline', pizzas: 'pizza-outline', bebidas: 'wine-outline',
    ensaladas: 'leaf-outline', pasta: 'restaurant-outline', postres: 'ice-cream-outline',
    sushi: 'fish-outline', otros: 'grid-outline',
};

const emptyForm = () => ({ nombre: '', precio: '', categoria: 'burgers', descripcion: '', imagen_url: '' });

export default function AdminPlatosScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const restaurante = useAppSelector(s => s.restaurant.selected);
    const restauranteId = restaurante?.id ?? 1;

    const [platos, setPlatos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategoria, setFilterCategoria] = useState(null);
    const [filterVisible, setFilterVisible] = useState(false);
    const [page, setPage] = useState(1);
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

    const showActions = (item) => {
        Alert.alert(item.nombre, null, [
            { text: 'Ver detalle', onPress: () => goToDetail(item) },
            {
                text: item.disponible ? 'Deshabilitar' : 'Habilitar',
                onPress: () => handleToggle(item),
            },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    };

    const goToDetail = (item) => {
        navigation.navigate('HomeTab', {
            screen: 'FoodDetail',
            params: {
                foodItem: {
                    id: item.id,
                    name: item.nombre,
                    price: `$${parseFloat(item.precio).toFixed(2)}`,
                    imageKey: item.imagen_key || item.imagen_url || '',
                    category: item.categoria,
                    descriptionText: item.descripcion || '',
                    ingredientText: [],
                },
            },
        });
    };

    const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
        });
        if (result.canceled) return;
        setUploading(true);
        try {
            const res = await API.admin.upload(result.assets[0].uri);
            if (res.success) setForm(f => ({ ...f, imagen_url: res.url }));
            else Alert.alert('Error', res.message);
        } catch { Alert.alert('Error', 'No se pudo subir la imagen'); }
        finally { setUploading(false); }
    };

    const handleCreate = async () => {
        if (!form.nombre.trim() || !form.precio || !form.categoria) {
            Alert.alert('Error', 'Nombre, precio y categoría son requeridos'); return;
        }
        setSaving(true);
        try {
            const res = await API.admin.platos.create(restauranteId, form);
            if (res.success) {
                setPlatos(prev => [...prev, res.plato]);
                setModalVisible(false);
                setForm(emptyForm());
            } else Alert.alert('Error', res.message);
        } catch { Alert.alert('Error', 'No se pudo crear el plato'); }
        finally { setSaving(false); }
    };

    const getImageSource = (item) => {
        if (item.imagen_url) return { uri: item.imagen_url };
        if (item.imagen_key) {
            const src = imageMap[item.imagen_key];
            if (typeof src === 'string') return { uri: src };
            if (src?.uri) return { uri: src.uri };
        }
        return null;
    };

    // Filter
    const filtered = useMemo(() => platos.filter(p => {
        const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
            p.categoria.toLowerCase().includes(search.toLowerCase());
        const matchCat = !filterCategoria || p.categoria === filterCategoria;
        return matchSearch && matchCat;
    }), [platos, search, filterCategoria]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const pageItems = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
    }, [filtered, page]);

    // Group by category for SectionList
    const sections = useMemo(() => {
        const grouped = pageItems.reduce((acc, item) => {
            if (!acc[item.categoria]) acc[item.categoria] = [];
            acc[item.categoria].push(item);
            return acc;
        }, {});
        return Object.entries(grouped).map(([title, data]) => ({ title, data }));
    }, [pageItems]);

    const handleSearch = (text) => { setSearch(text); setPage(1); };
    const handleFilter = (cat) => { setFilterCategoria(cat); setPage(1); setFilterVisible(false); };

    // Pagination page numbers
    const pageNumbers = useMemo(() => {
        if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (page <= 3) return [1, 2, 3, '...', totalPages];
        if (page >= totalPages - 2) return [1, '...', totalPages - 2, totalPages - 1, totalPages];
        return [1, '...', page, '...', totalPages];
    }, [totalPages, page]);

    const startItem = filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(page * ITEMS_PER_PAGE, filtered.length);

    const renderSectionHeader = ({ section }) => {
        const count = platos.filter(p => p.categoria === section.title).length;
        return (
            <View style={styles.sectionHeader}>
                <Ionicons name={CATEGORIA_ICON[section.title] ?? 'grid-outline'} size={20} color="#555" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>{section.title.charAt(0).toUpperCase() + section.title.slice(1)}</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count} platos</Text>
                </View>
            </View>
        );
    };

    const renderItem = ({ item }) => {
        const imgSrc = getImageSource(item);
        return (
            <View style={styles.card}>
                <TouchableOpacity style={styles.cardMain} onPress={() => goToDetail(item)} activeOpacity={0.75}>
                    {imgSrc ? (
                        <Image source={imgSrc} style={styles.thumb} />
                    ) : (
                        <View style={styles.thumbPlaceholder}>
                            <Ionicons name="fast-food-outline" size={22} color="#ddd" />
                        </View>
                    )}
                    <View style={styles.info}>
                        <Text style={styles.nombre} numberOfLines={1}>{item.nombre.toUpperCase()}</Text>
                        <Text style={styles.categoria}>{item.categoria}</Text>
                        <Text style={styles.precio}>${parseFloat(item.precio).toFixed(2)}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.cardRight}>
                    <TouchableOpacity style={styles.moreBtn} onPress={() => showActions(item)}>
                        <Ionicons name="ellipsis-vertical" size={18} color="#aaa" />
                    </TouchableOpacity>
                    <Switch
                        value={item.disponible}
                        onValueChange={() => handleToggle(item)}
                        thumbColor={item.disponible ? '#fff' : '#fff'}
                        trackColor={{ false: '#ddd', true: '#4CAF50' }}
                        style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                    />
                    <Text style={[styles.estadoText, { color: item.disponible ? '#4CAF50' : '#E53935' }]}>
                        {item.disponible ? 'Habilitado' : 'Deshabilitado'}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            <AppHeader
                title="Platos"
                subtitle={`${platos.length} platos registrados`}
                onBack={() => navigation.goBack()}
                rightComponent={
                    <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                }
            />

            <View style={[styles.body, { paddingTop: insets.top + 76 }]}>
                {/* Search + Filter */}
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar plato..."
                            placeholderTextColor="#bbb"
                            value={search}
                            onChangeText={handleSearch}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.filterBtn, filterCategoria && styles.filterBtnActive]}
                        onPress={() => setFilterVisible(true)}
                    >
                        <Ionicons name="filter-outline" size={16} color={filterCategoria ? '#fff' : '#555'} />
                        <Text style={[styles.filterText, filterCategoria && styles.filterTextActive]}>Filtros</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF8700" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        <SectionList
                            sections={sections}
                            keyExtractor={i => String(i.id)}
                            renderItem={renderItem}
                            renderSectionHeader={renderSectionHeader}
                            contentContainerStyle={styles.list}
                            ListEmptyComponent={<Text style={styles.empty}>Sin resultados</Text>}
                            showsVerticalScrollIndicator={false}
                            stickySectionHeadersEnabled={false}
                            initialNumToRender={10}
                        />

                        {/* Pagination */}
                        {filtered.length > 0 && (
                            <View style={styles.pagination}>
                                <Text style={styles.paginationInfo}>
                                    Mostrando {startItem} - {endItem} de {filtered.length}
                                </Text>
                                <View style={styles.pageNumbers}>
                                    <TouchableOpacity
                                        style={[styles.pageArrow, page === 1 && styles.pageDisabled]}
                                        onPress={() => page > 1 && setPage(p => p - 1)}
                                    >
                                        <Ionicons name="chevron-back" size={16} color={page === 1 ? '#ccc' : '#555'} />
                                    </TouchableOpacity>

                                    {pageNumbers.map((n, i) => n === '...'
                                        ? <Text key={`dots${i}`} style={styles.pageDots}>...</Text>
                                        : <TouchableOpacity
                                            key={n}
                                            style={[styles.pageNum, page === n && styles.pageNumActive]}
                                            onPress={() => setPage(n)}
                                        >
                                            <Text style={[styles.pageNumText, page === n && styles.pageNumTextActive]}>{n}</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.pageArrow, page === totalPages && styles.pageDisabled]}
                                        onPress={() => page < totalPages && setPage(p => p + 1)}
                                    >
                                        <Ionicons name="chevron-forward" size={16} color={page === totalPages ? '#ccc' : '#555'} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Modal filtro */}
            <Modal visible={filterVisible} animationType="slide" transparent onRequestClose={() => setFilterVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.filterModal}>
                        <Text style={styles.modalTitle}>Filtrar por categoría</Text>
                        <TouchableOpacity
                            style={[styles.filterOption, !filterCategoria && styles.filterOptionActive]}
                            onPress={() => handleFilter(null)}
                        >
                            <Text style={[styles.filterOptionText, !filterCategoria && styles.filterOptionTextActive]}>Todas</Text>
                        </TouchableOpacity>
                        {CATEGORIAS.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.filterOption, filterCategoria === cat && styles.filterOptionActive]}
                                onPress={() => handleFilter(cat)}
                            >
                                <Ionicons name={CATEGORIA_ICON[cat] ?? 'grid-outline'} size={16} color={filterCategoria === cat ? '#fff' : '#555'} style={{ marginRight: 8 }} />
                                <Text style={[styles.filterOptionText, filterCategoria === cat && styles.filterOptionTextActive]}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* Modal crear */}
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
                                {uploading ? <ActivityIndicator color="#FF8700" /> : form.imagen_url ? (
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

    addBtn: {
        width: 44, height: 44, borderRadius: 14, backgroundColor: '#FF8700',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#FF8700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },

    searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    searchBox: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: '#eee', elevation: 1,
    },
    searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a', fontFamily: 'Poppins-Regular' },
    filterBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: '#eee', elevation: 1,
    },
    filterBtnActive: { backgroundColor: '#FF8700', borderColor: '#FF8700' },
    filterText: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#555' },
    filterTextActive: { color: '#fff' },

    list: { paddingBottom: 8 },

    sectionHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 10, paddingHorizontal: 4, marginTop: 8,
    },
    sectionTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#333', flex: 1 },
    countBadge: {
        backgroundColor: '#FF870015', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 3,
    },
    countText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#FF8700' },

    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 14, marginBottom: 8,
        borderWidth: 1, borderColor: '#f0f0f0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
        overflow: 'hidden',
    },
    cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
    thumb: { width: 64, height: 64, borderRadius: 10, marginRight: 12 },
    thumbPlaceholder: {
        width: 64, height: 64, borderRadius: 10, marginRight: 12,
        backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center',
    },
    info: { flex: 1 },
    nombre: { fontSize: 13, fontFamily: 'Poppins-Bold', color: '#1a1a1a', letterSpacing: 0.3 },
    categoria: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#aaa', textTransform: 'capitalize', marginTop: 1 },
    precio: { fontSize: 14, fontFamily: 'Poppins-Bold', color: '#FF8700', marginTop: 4 },

    cardRight: { alignItems: 'center', paddingRight: 10, paddingVertical: 10, gap: 2 },
    moreBtn: { padding: 4 },
    estadoText: { fontSize: 10, fontFamily: 'Poppins-SemiBold' },

    // Pagination
    pagination: {
        paddingVertical: 12, paddingBottom: 20,
        borderTopWidth: 1, borderTopColor: '#f0f0f0',
        backgroundColor: '#F8F8F8',
    },
    paginationInfo: { textAlign: 'center', fontSize: 12, fontFamily: 'Poppins-Regular', color: '#888', marginBottom: 10 },
    pageNumbers: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
    pageArrow: {
        width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee',
    },
    pageDisabled: { opacity: 0.4 },
    pageNum: {
        width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee',
    },
    pageNumActive: { backgroundColor: '#FF8700', borderColor: '#FF8700' },
    pageNumText: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#555' },
    pageNumTextActive: { color: '#fff' },
    pageDots: { fontSize: 14, color: '#aaa', paddingHorizontal: 2 },

    empty: { textAlign: 'center', color: '#bbb', fontFamily: 'Poppins-Regular', marginTop: 60, fontSize: 14 },

    // Filter modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    filterModal: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40,
    },
    filterOption: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 6,
        backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#eee',
    },
    filterOptionActive: { backgroundColor: '#FF8700', borderColor: '#FF8700' },
    filterOptionText: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#555', textTransform: 'capitalize' },
    filterOptionTextActive: { color: '#fff' },

    // Create modal
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
