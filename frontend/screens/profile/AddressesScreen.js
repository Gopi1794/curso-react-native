import React, { useEffect, useState, useRef } from 'react';
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
    PanResponder,
    Animated,
} from 'react-native';
import LeafletMap from '../../components/common/LeafletMap';
import { WebView } from 'react-native-webview';
import AppHeader from '../../components/common/AppHeader';
import InstructionBanner from '../../components/common/InstructionBanner';
import { Ionicons } from '@expo/vector-icons';
import { showSuccessMessage } from '../../components/FlashMessageWrapper';
import { Dialog, Portal, Button, Paragraph } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Location from 'expo-location';
import api from '../../services/api';

export default function AddressesScreen({ navigation }) {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [label, setLabel] = useState('');
    const [details, setDetails] = useState('');
    const [coords, setCoords] = useState(null);
    const [isDefault, setIsDefault] = useState(false);
    const [search, setSearch] = useState('');
    const [deleteDialog, setDeleteDialog] = useState({ visible: false, id: null });

    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();

    useEffect(() => {
        loadAddresses();
    }, []);

    const loadAddresses = async () => {
        try {
            const res = await api.users.getAddresses();
            if (res.success) {
                setAddresses(res.addresses.map(a => ({
                    id: String(a.id),
                    label: a.etiqueta,
                    details: a.direccion,
                    coords: (a.latitud && a.longitud)
                        ? { latitude: parseFloat(a.latitud), longitude: parseFloat(a.longitud) }
                        : null,
                    isDefault: a.es_principal,
                })));
            } else {
                Alert.alert('Error', res.message || 'No se pudieron cargar las direcciones');
            }
        } catch {
            Alert.alert('Error', 'No se pudieron cargar las direcciones');
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setLabel('');
        setDetails('');
        setCoords(null);
        setIsDefault(false);
        sheetY.setValue(600);
        setModalVisible(true);
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    };

    const handleDelete = (id) => {
        setDeleteDialog({ visible: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteDialog.id;
        setDeleteDialog({ visible: false, id: null });
        try {
            const res = await api.users.deleteAddress(id);
            if (res.success) {
                setAddresses(prev => prev.filter(a => a.id !== id));
                showSuccessMessage('Dirección eliminada');
            } else {
                Alert.alert('Error', res.message || 'No se pudo eliminar');
            }
        } catch {
            Alert.alert('Error', 'No se pudo eliminar la dirección');
        }
    };

    const handleSave = async () => {
        if (!label.trim()) {
            Alert.alert('Validación', 'Ingresá un nombre para la dirección');
            return;
        }
        if (!details.trim()) {
            Alert.alert('Validación', 'Ingresá una dirección');
            return;
        }
        try {
            const payload = {
                etiqueta: label.trim(),
                direccion: details.trim(),
                ciudad: '',
                latitud: coords ? coords.latitude : null,
                longitud: coords ? coords.longitude : null,
                es_principal: isDefault,
            };
            const res = await api.users.createAddress(payload);
            if (res.success) {
                setModalVisible(false);
                loadAddresses();
                showSuccessMessage('Dirección guardada');
            } else {
                Alert.alert('Error', res.message || 'No se pudo guardar');
            }
        } catch {
            Alert.alert('Error', 'No se pudo guardar la dirección');
        }
    };

    const useCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso denegado', 'Habilitá el permiso de ubicación desde Configuración del dispositivo.');
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
            const { latitude, longitude } = pos.coords;
            setCoords({ latitude, longitude });
            const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (rev && rev.length) {
                const place = rev[0];
                const addressString = [place.name, place.street, place.city, place.region, place.postalCode]
                    .filter(Boolean)
                    .join(', ');
                setDetails(addressString || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            } else {
                setDetails(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            }
        } catch {
            Alert.alert('Error', 'No se pudo obtener la ubicación');
        }
    };

    const handleMapPress = async (e) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setCoords({ latitude, longitude });
        try {
            const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (rev && rev.length) {
                const place = rev[0];
                const addressString = [place.name, place.street, place.city, place.region, place.postalCode]
                    .filter(Boolean)
                    .join(', ');
                setDetails(addressString || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            } else {
                setDetails(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            }
        } catch {
            setDetails(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
    };

    const sheetY = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
        onPanResponderMove: (_, g) => {
            if (g.dy > 0) sheetY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
            if (g.dy > 100) {
                Animated.timing(sheetY, { toValue: 600, duration: 200, useNativeDriver: true }).start(() => {
                    setModalVisible(false);
                    sheetY.setValue(0);
                });
            } else {
                Animated.spring(sheetY, { toValue: 0, useNativeDriver: true }).start();
            }
        },
    })).current;

    const closeSheet = () => {
        Animated.timing(sheetY, { toValue: 600, duration: 200, useNativeDriver: true }).start(() => {
            setModalVisible(false);
            sheetY.setValue(0);
        });
    };

    const renderRightActions = (id) => (
        <TouchableOpacity
            style={styles.rightAction}
            onPress={() => handleDelete(id)}
            accessibilityRole="button"
            accessibilityLabel="Eliminar dirección"
        >
            <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
    );

    const renderItem = ({ item }) => {
        const hasCoords = !!item.coords;
        return (
            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                <View style={styles.item}>
                    <View style={styles.itemLeft}>
                        <Ionicons
                            name={item.isDefault ? 'star' : 'location-outline'}
                            size={22}
                            color={item.isDefault ? '#f1c40f' : '#ff8000'}
                        />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.itemLabel}>{item.label}</Text>
                            <Text style={styles.itemDetails}>
                                {item.details ? item.details : (hasCoords
                                    ? `${item.coords.latitude.toFixed(5)}, ${item.coords.longitude.toFixed(5)}`
                                    : ''
                                )}
                            </Text>
                            {hasCoords && (
                                <View style={styles.mapPreview}>
                                    <WebView
                                        style={{ flex: 1 }}
                                        source={{ uri: `https://www.openstreetmap.org/export/embed.html?bbox=${item.coords.longitude - 0.002},${item.coords.latitude - 0.002},${item.coords.longitude + 0.002},${item.coords.latitude + 0.002}&layer=mapnik&marker=${item.coords.latitude},${item.coords.longitude}` }}
                                        scrollEnabled={false}
                                        pointerEvents="none"
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Swipeable>
        );
    };

    if (loading) return (
        <View style={[styles.container, { paddingTop: insets.top + 44 }]}>
            <AppHeader title="Mis Direcciones" onBack={() => navigation.goBack()} />
        <View style={styles.centered}><ActivityIndicator size="large" color="#ff8000" /></View>
        </View>
    );

    return (
        <View style={styles.container}>
            <AppHeader
                title="Mis Direcciones"
                onBack={() => navigation.goBack()}
                rightComponent={
                    <TouchableOpacity
                        style={styles.headerAddButton}
                        onPress={openAdd}
                        accessibilityRole="button"
                        accessibilityLabel="Agregar nueva dirección"
                    >
                        <Ionicons name="add" size={22} color="#ff8000" />
                    </TouchableOpacity>
                }
            />

            <View style={[styles.content, { paddingTop: insets.top + 44 + 32, paddingBottom: tabBarHeight + 16 }]}>
                {addresses.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="location-outline" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No hay direcciones guardadas</Text>
                    </View>
                ) : (
                    <>
                        <TextInput
                            placeholder="Buscar por nombre (Casa, Trabajo...)"
                            value={search}
                            onChangeText={setSearch}
                            style={styles.searchInput}
                            accessibilityLabel="Buscar dirección"
                        />
                        <InstructionBanner text="Deslizá a la izquierda para eliminar una dirección" />
                        <FlatList
                            data={addresses.filter(a => a.label.toLowerCase().includes(search.toLowerCase()))}
                            keyExtractor={i => i.id}
                            renderItem={renderItem}
                            contentContainerStyle={{ paddingVertical: 10 }}
                        />
                    </>
                )}

            </View>

            {/* Bottom sheet agregar dirección */}
            <Modal visible={modalVisible} animationType="none" transparent statusBarTranslucent>
                <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={closeSheet} />
                <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
                    {/* Handle + close */}
                    <View style={styles.sheetHeader} {...panResponder.panHandlers}>
                        <View style={styles.sheetHandle} />
                        <TouchableOpacity
                            style={styles.sheetClose}
                            onPress={closeSheet}
                            accessibilityRole="button"
                            accessibilityLabel="Cerrar"
                        >
                            <Ionicons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.sheetContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.modalTitle}>Agregar Dirección</Text>

                        <Text style={styles.inputLabel}>Nombre *</Text>
                        <TextInput
                            placeholder="Ej. Casa, Trabajo"
                            value={label}
                            onChangeText={setLabel}
                            style={styles.input}
                            accessibilityLabel="Nombre de la dirección"
                        />

                        <Text style={styles.inputLabel}>Dirección *</Text>
                        <TextInput
                            placeholder="Calle y número"
                            value={details}
                            onChangeText={setDetails}
                            style={[styles.input, styles.inputMultiline]}
                            multiline
                            accessibilityLabel="Dirección"
                        />

                        <View style={styles.locationRow}>
                            <TouchableOpacity
                                style={styles.smallButton}
                                onPress={useCurrentLocation}
                                accessibilityRole="button"
                                accessibilityLabel="Usar mi ubicación actual"
                            >
                                <Ionicons name="locate" size={14} color="#fff" />
                                <Text style={styles.smallButtonText}>Mi ubicación</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.smallButton, styles.smallButtonSecondary]}
                                onPress={() => { setCoords(null); setDetails(''); }}
                                accessibilityRole="button"
                                accessibilityLabel="Limpiar ubicación"
                            >
                                <Text style={styles.smallButtonTextSecondary}>Limpiar</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.mapHintRow}>
                            <Ionicons
                                name={coords ? 'location' : 'map-outline'}
                                size={14}
                                color={coords ? '#ff8000' : '#555'}
                            />
                            <Text style={styles.mapHintText}>
                                {coords ? 'Ubicación seleccionada — tocá para mover el pin' : 'Tocá en el mapa para marcar la ubicación'}
                            </Text>
                        </View>

                        <View style={styles.modalMapWrapper}>
                            <LeafletMap
                                latitude={coords ? coords.latitude : -34.6037}
                                longitude={coords ? coords.longitude : -58.3816}
                                interactive={true}
                                onPress={({ latitude, longitude }) => handleMapPress({
                                    nativeEvent: { coordinate: { latitude, longitude } }
                                })}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={() => setIsDefault(!isDefault)}
                            style={styles.defaultToggle}
                            accessibilityRole="checkbox"
                            accessibilityLabel={isDefault ? 'Predeterminada' : 'Marcar como predeterminada'}
                        >
                            <Ionicons
                                name={isDefault ? 'star' : 'star-outline'}
                                size={18}
                                color={isDefault ? '#f1c40f' : '#666'}
                            />
                            <Text style={styles.defaultToggleText}>
                                {isDefault ? 'Predeterminada' : 'Marcar como predeterminada'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                onPress={closeSheet}
                                style={styles.cancelButton}
                                accessibilityRole="button"
                                accessibilityLabel="Cancelar"
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                style={styles.saveButton}
                                accessibilityRole="button"
                                accessibilityLabel="Guardar dirección"
                            >
                                <Text style={styles.saveButtonText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Animated.View>
            </Modal>

            {/* Dialog eliminar */}
            <Portal>
                <Dialog
                    visible={deleteDialog.visible}
                    onDismiss={() => setDeleteDialog({ visible: false, id: null })}
                    style={styles.dialog}
                >
                    <Dialog.Icon icon="trash-can-outline" size={36} color="#cc0000" />
                    <Dialog.Title style={styles.dialogTitle}>Eliminar dirección</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph style={styles.dialogMessage}>
                            ¿Querés eliminar esta dirección?
                        </Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions style={styles.dialogActions}>
                        <Button
                            onPress={() => setDeleteDialog({ visible: false, id: null })}
                            textColor="#888"
                        >
                            Cancelar
                        </Button>
                        <Button onPress={confirmDelete} textColor="#cc0000">
                            Eliminar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    content: { flex: 1, paddingHorizontal: 16 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: { color: '#666', fontSize: 14 },

    searchInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        minHeight: 44,
        borderWidth: 1,
        borderColor: '#eee',
    },

    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 10,
        marginVertical: 6,
        elevation: 2,
    },
    itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    itemLabel: { fontWeight: '600', fontSize: 14, color: '#1a1a1a' },
    itemDetails: { color: '#666', fontSize: 12, marginTop: 2 },

    mapPreview: {
        width: '100%',
        height: 100,
        marginTop: 8,
        borderRadius: 8,
        overflow: 'hidden',
    },

    headerAddButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff3e0',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ffe0b2',
    },

    rightAction: {
        backgroundColor: '#cc0000',
        justifyContent: 'center',
        alignItems: 'center',
        width: 72,
        marginVertical: 6,
        borderRadius: 8,
    },

    // Bottom sheet
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '92%',
        minHeight: '50%',
    },
    sheetHeader: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
        paddingHorizontal: 16,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ddd',
        marginBottom: 4,
    },
    sheetClose: {
        position: 'absolute',
        right: 16,
        top: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#1a1a1a' },

    inputLabel: { fontSize: 13, fontWeight: '500', color: '#555', marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 12,
        fontSize: 15,
        minHeight: 44,
        backgroundColor: '#fafafa',
    },
    inputMultiline: { height: 80, textAlignVertical: 'top' },

    locationRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    smallButton: {
        backgroundColor: '#ff8000',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 8,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minHeight: 44,
    },
    smallButtonSecondary: { backgroundColor: '#eee' },
    smallButtonText: { color: 'white', fontSize: 13, fontWeight: '500' },
    smallButtonTextSecondary: { color: '#333', fontSize: 13, fontWeight: '500' },

    mapHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    mapHintText: { fontSize: 13, color: '#555', flex: 1 },

    modalMapWrapper: {
        width: '100%',
        height: 180,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#eee',
        marginBottom: 12,
    },

    defaultToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        marginBottom: 4,
        minHeight: 44,
    },
    defaultToggleText: { color: '#333', fontSize: 14 },

    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 44,
        justifyContent: 'center',
    },
    cancelButtonText: { color: '#666', fontSize: 15 },
    saveButton: {
        backgroundColor: '#ff8000',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        minHeight: 44,
        justifyContent: 'center',
    },
    saveButtonText: { color: 'white', fontSize: 15, fontWeight: '600' },

    // Dialog
    dialog: { borderRadius: 20, backgroundColor: '#fff' },
    dialogTitle: { textAlign: 'center', fontSize: 16, color: '#1a1a1a' },
    dialogMessage: { textAlign: 'center', fontSize: 14, color: '#555' },
    dialogActions: { justifyContent: 'space-around', paddingBottom: 8 },
});
