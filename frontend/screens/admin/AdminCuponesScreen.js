import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Modal, ActivityIndicator, StatusBar, Alert,
    ScrollView, Image, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import AppHeader from '../../components/common/AppHeader';
import API from '../../services/api';

const COLORS = ['#FF6B6B','#FF8700','#4CAF50','#2196F3','#9C27B0','#FF5722','#009688'];

const emptyForm = () => ({
    titulo: '', oferta: '', discount_percent: '10', codigo: '',
    color: '#FF6B6B', valido_desde: '', valido_hasta: '', disclaimer: '',
    imagen_url: '',
});

export default function AdminCuponesScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [cupones, setCupones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [qrItem, setQrItem] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.admin.cupones.getAll();
            if (res.success) setCupones(res.cupones);
        } catch {
            Alert.alert('Error', 'No se pudieron cargar los cupones');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        setForm(emptyForm());
        setEditId(null);
        setModalVisible(true);
    };

    const openEdit = (item) => {
        setForm({
            titulo: item.titulo,
            oferta: item.oferta,
            discount_percent: String(item.discount_percent ?? 10),
            codigo: item.codigo,
            color: item.color,
            valido_desde: item.valido_desde?.slice(0, 10) || '',
            valido_hasta: item.valido_hasta?.slice(0, 10) || '',
            disclaimer: item.disclaimer || '',
            imagen_url: item.imagen_url || '',
        });
        setEditId(item.id);
        setModalVisible(true);
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
            aspect: [3, 2],
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

    const handleSave = async () => {
        if (!form.titulo.trim() || !form.codigo.trim() || !form.valido_hasta) {
            Alert.alert('Error', 'Título, código y fecha de vencimiento son requeridos');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...form,
                discount_percent: parseInt(form.discount_percent) || 10,
            };
            const res = editId
                ? await API.admin.cupones.update(editId, payload)
                : await API.admin.cupones.create(payload);

            if (res.success) {
                if (editId) {
                    setCupones(prev => prev.map(c => c.id === editId ? res.cupon : c));
                } else {
                    setCupones(prev => [res.cupon, ...prev]);
                }
                setModalVisible(false);
            } else {
                Alert.alert('Error', res.message);
            }
        } catch {
            Alert.alert('Error', 'No se pudo guardar el cupón');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (item) => {
        try {
            const res = await API.admin.cupones.update(item.id, { activo: !item.activo });
            if (res.success) {
                setCupones(prev => prev.map(c => c.id === item.id ? { ...c, activo: !c.activo } : c));
            }
        } catch {}
    };

    const handleDelete = (item) => {
        Alert.alert('Eliminar', `¿Eliminar el cupón "${item.titulo}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await API.admin.cupones.remove(item.id);
                        if (res.success) setCupones(prev => prev.filter(c => c.id !== item.id));
                    } catch {}
                },
            },
        ]);
    };

    const isExpired = (fecha) => fecha && new Date(fecha) < new Date();

    const renderItem = ({ item }) => (
        <View style={[styles.card, !item.activo && styles.cardInactive]}>
            <View style={[styles.cardStripe, { backgroundColor: item.color }]} />
            {item.imagen_url ? (
                <Image source={{ uri: item.imagen_url }} style={styles.cardImage} />
            ) : (
                <View style={[styles.cardImagePlaceholder, { backgroundColor: item.color + '22' }]}>
                    <Ionicons name="ticket-outline" size={28} color={item.color} />
                </View>
            )}
            <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                    <Text style={styles.cardTitulo} numberOfLines={1}>{item.titulo}</Text>
                    <View style={[styles.discountBadge, { backgroundColor: item.color }]}>
                        <Text style={styles.discountText}>{item.discount_percent}% OFF</Text>
                    </View>
                </View>
                <Text style={styles.cardCodigo}>{item.codigo}</Text>
                <Text style={[styles.cardFecha, isExpired(item.valido_hasta) && styles.expired]}>
                    Válido hasta: {item.valido_hasta?.slice(0, 10) || '—'}
                    {isExpired(item.valido_hasta) ? ' (vencido)' : ''}
                </Text>
                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setQrItem(item)}>
                        <Ionicons name="qr-code-outline" size={18} color="#1976D2" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
                        <Ionicons name="pencil-outline" size={18} color="#FF8700" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={18} color="#E53935" />
                    </TouchableOpacity>
                    <Switch
                        value={item.activo}
                        onValueChange={() => handleToggle(item)}
                        thumbColor={item.activo ? '#FF8700' : '#ccc'}
                        trackColor={{ false: '#eee', true: '#FFD580' }}
                    />
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            <AppHeader title="Cupones" subtitle={`${cupones.length} cupones`} onBack={() => navigation.goBack()} />

            <View style={[styles.body, { paddingTop: insets.top + 76 }]}>
                <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addText}>Nuevo cupón</Text>
                </TouchableOpacity>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF8700" style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={cupones}
                        keyExtractor={i => String(i.id)}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.empty}>Sin cupones. Creá uno.</Text>}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* Modal QR */}
            <Modal visible={!!qrItem} animationType="fade" transparent onRequestClose={() => setQrItem(null)}>
                <View style={styles.overlay}>
                    <View style={styles.qrModal}>
                        <Text style={styles.qrTitle}>{qrItem?.titulo}</Text>
                        <Text style={styles.qrCodigo}>{qrItem?.codigo}</Text>
                        <View style={styles.qrBox}>
                            {qrItem && <QRCode value={qrItem.codigo} size={200} />}
                        </View>
                        <Text style={styles.qrHint}>Mostrá este QR en el kiosco para aplicar el descuento</Text>
                        <TouchableOpacity style={styles.saveBtn} onPress={() => setQrItem(null)}>
                            <Text style={styles.saveText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal crear/editar */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalTitle}>{editId ? 'Editar cupón' : 'Nuevo cupón'}</Text>

                            <Text style={styles.label}>Título *</Text>
                            <TextInput style={styles.input} placeholder="Ej: 30% en hamburguesas" placeholderTextColor="#bbb" value={form.titulo} onChangeText={t => setForm(f => ({ ...f, titulo: t }))} />

                            <Text style={styles.label}>Descuento (%)</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={form.discount_percent} onChangeText={t => setForm(f => ({ ...f, discount_percent: t, oferta: t + '% OFF' }))} />

                            <Text style={styles.label}>Código *</Text>
                            <TextInput style={styles.input} placeholder="Ej: BURGER30" placeholderTextColor="#bbb" autoCapitalize="characters" value={form.codigo} onChangeText={t => setForm(f => ({ ...f, codigo: t }))} />

                            <Text style={styles.label}>Válido desde</Text>
                            <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#bbb" value={form.valido_desde} onChangeText={t => setForm(f => ({ ...f, valido_desde: t }))} />

                            <Text style={styles.label}>Válido hasta *</Text>
                            <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#bbb" value={form.valido_hasta} onChangeText={t => setForm(f => ({ ...f, valido_hasta: t }))} />

                            <Text style={styles.label}>Condición (opcional)</Text>
                            <TextInput style={styles.input} placeholder="Ej: Válido de lunes a viernes" placeholderTextColor="#bbb" value={form.disclaimer} onChangeText={t => setForm(f => ({ ...f, disclaimer: t }))} />

                            <Text style={styles.label}>Color</Text>
                            <View style={styles.colorRow}>
                                {COLORS.map(c => (
                                    <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, form.color === c && styles.colorDotSelected]} onPress={() => setForm(f => ({ ...f, color: c }))} />
                                ))}
                            </View>

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
                                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
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
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FF8700', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20,
        alignSelf: 'flex-start', marginBottom: 16,
        shadowColor: '#FF8700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    addText: { color: '#fff', fontFamily: 'Poppins-SemiBold', fontSize: 14 },
    list: { paddingBottom: 120 },
    card: {
        flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, marginBottom: 12,
        borderWidth: 1, borderColor: '#f0f0f0', overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    cardInactive: { opacity: 0.55 },
    cardStripe: { width: 6 },
    cardImage: { width: 72, height: 72, margin: 12, borderRadius: 10 },
    cardImagePlaceholder: {
        width: 72, height: 72, margin: 12, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center',
    },
    cardBody: { flex: 1, paddingVertical: 12, paddingRight: 12 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    cardTitulo: { flex: 1, fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#1a1a1a' },
    discountBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    discountText: { color: '#fff', fontSize: 11, fontFamily: 'Poppins-Bold' },
    cardCodigo: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#888', marginBottom: 2 },
    cardFecha: { fontSize: 11, fontFamily: 'Poppins-Regular', color: '#aaa', marginBottom: 8 },
    expired: { color: '#E53935' },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#eee' },
    empty: { textAlign: 'center', color: '#bbb', fontFamily: 'Poppins-Regular', marginTop: 60, fontSize: 14 },

    // QR modal
    qrModal: {
        backgroundColor: '#fff', borderRadius: 24, padding: 28, margin: 24, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
    },
    qrTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
    qrCodigo: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#888', marginBottom: 20 },
    qrBox: { padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eee', marginBottom: 16 },
    qrHint: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#aaa', textAlign: 'center', marginBottom: 20 },

    // Form modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '92%' },
    modalTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#1a1a1a', marginBottom: 16 },
    label: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#666', marginBottom: 6, marginTop: 12 },
    input: {
        borderWidth: 1, borderColor: '#eee', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 11,
        fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1a1a1a', backgroundColor: '#fafafa',
    },
    colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    colorDot: { width: 32, height: 32, borderRadius: 16 },
    colorDotSelected: { borderWidth: 3, borderColor: '#1a1a1a' },
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
