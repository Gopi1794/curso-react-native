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
    Image
} from 'react-native';
// ↓↓↓ IMPORT CORRECTO DE REACT-NATIVE-MAPS ↓↓↓
import MapView, { Marker, UrlTile } from 'react-native-maps';
import AppHeader from '../components/common/AppHeader';
import InstructionBanner from '../components/common/InstructionBanner';
import { Ionicons } from '@expo/vector-icons';
import { showSuccessMessage } from '../components/FlashMessageWrapper';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const STORAGE_KEY = 'user_addresses';

export default function AddressesScreen({ navigation }) {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState(null);
    const [label, setLabel] = useState('');
    const [details, setDetails] = useState('');
    const [coords, setCoords] = useState(null);
    const [isDefault, setIsDefault] = useState(false);
    const [tempCoords, setTempCoords] = useState(null); // para seleccionar en el mapa dentro del modal

    const [search, setSearch] = useState('');

    useEffect(() => {
        loadAddresses();
    }, []);

    const loadAddresses = async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            const list = raw ? JSON.parse(raw) : [];
            setAddresses(list);
        } catch (e) {
            console.error('Error loading addresses', e);
            Alert.alert('Error', 'No se pudieron cargar las direcciones');
        } finally {
            setLoading(false);
        }
    };

    const saveAddresses = async (list) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            setAddresses(list);
        } catch (e) {
            console.error('Error saving addresses', e);
            Alert.alert('Error', 'No se pudieron guardar las direcciones');
        }
    };

    const openAdd = () => {
        setEditing(null);
        setLabel('');
        setDetails('');
        setCoords(null);
        setTempCoords(null);
        setIsDefault(false);
        setModalVisible(true);
    };

    // Edit option removed — editing via inline UI disabled

    const handleDelete = (id) => {
        Alert.alert('Eliminar', '¿Eliminar esta dirección?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () => {
                    const filtered = addresses.filter(a => a.id !== id);
                    saveAddresses(filtered);
                    try {
                        showSuccessMessage('Dirección eliminada');
                    } catch (e) { /* noop if flash message not configured */ }
                }
            }
        ]);
    };

    const handleSave = () => {
        if (!label.trim()) {
            Alert.alert('Validación', 'Ingresa un nombre para la dirección');
            return;
        }

        // Si se marca como predeterminada, limpiar otras predeterminadas
        const clearDefault = (list) => list.map(x => ({ ...x, isDefault: false }));

        if (editing) {
            let updated = addresses.map(a => a.id === editing.id ? { ...a, label, details, coords, isDefault } : a);
            if (isDefault) updated = clearDefault(updated).map(a => a.id === editing.id ? { ...a, isDefault: true } : a);
            saveAddresses(updated);
        } else {
            let newItem = { id: Date.now().toString(), label, details, coords, isDefault };
            let list = [newItem, ...addresses];
            if (isDefault) list = clearDefault(list).map(a => a.id === newItem.id ? { ...a, isDefault: true } : a);
            saveAddresses(list);
        }

        setModalVisible(false);
    };

    const renderRightActions = (id) => (
        <TouchableOpacity style={styles.rightAction} onPress={() => handleDelete(id)}>
            <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
    );

    const useCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso denegado', 'Se requiere permiso de ubicación');
                return;
            }

            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
            const { latitude, longitude } = pos.coords;
            setCoords({ latitude, longitude });

            // Intentar geocoding inverso para completar detalles
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
        } catch (e) {
            console.error('Location error', e);
            Alert.alert('Error', 'No se pudo obtener la ubicación');
        }
    };

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
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                                <Text style={styles.itemLabel}>{item.label}</Text>
                            </View>
                            <Text style={styles.itemDetails}>
                                {item.details ? item.details : (hasCoords ?
                                    `${item.coords.latitude.toFixed(5)}, ${item.coords.longitude.toFixed(5)}` :
                                    ''
                                )}
                            </Text>

                            {/* MAPA CON OPENSTREETMAP - SIMPLE */}
                            {hasCoords && (
                                <View style={styles.mapPreview}>
                                    <MapView
                                        style={[StyleSheet.absoluteFillObject, styles.mapInner]}
                                        initialRegion={{
                                            latitude: item.coords.latitude,
                                            longitude: item.coords.longitude,
                                            latitudeDelta: 0.01,
                                            longitudeDelta: 0.01,
                                        }}
                                        scrollEnabled={true}
                                        zoomEnabled={true}
                                        rotateEnabled={true}
                                    >
                                        {/* TILE DE OPENSTREETMAP - GRATIS */}
                                        <UrlTile
                                            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            maximumZ={9}
                                        />
                                        <Marker
                                            coordinate={{
                                                latitude: item.coords.latitude,
                                                longitude: item.coords.longitude
                                            }}
                                            pinColor="#ff8000"
                                        />
                                    </MapView>
                                </View>
                            )}
                        </View>
                    </View>

                </View>
            </Swipeable>
        );
    };

    if (loading) return (
        <View style={styles.container}>
            <AppHeader title="Mis Direcciones" onBack={() => navigation.goBack()} showCart={false} />
            <View style={styles.content}><ActivityIndicator size="large" color="#ff8000" /></View>
        </View>
    );

    return (
        <View style={styles.container}>
            <AppHeader title="Mis Direcciones" onBack={() => navigation.goBack()} showCart={false} />
            <View style={styles.content}>
                {addresses.length === 0 ? (
                    <View style={styles.empty}><Text style={styles.emptyText}>No hay direcciones guardadas.</Text></View>
                ) : (
                    <>
                        <TextInput
                            placeholder="Buscar por nombre (Casa, Trabajo...)"
                            value={search}
                            onChangeText={setSearch}
                            style={styles.searchInput}
                        />
                        <InstructionBanner text="Para eliminar la ubicación deslizar a la izquierda" />

                        <FlatList
                            data={addresses.filter(a => a.label.toLowerCase().includes(search.toLowerCase()))}
                            keyExtractor={i => i.id}
                            renderItem={renderItem}
                            contentContainerStyle={{ paddingVertical: 10 }}
                        />
                    </>
                )}

                <TouchableOpacity style={styles.addButton} onPress={openAdd}>
                    <Ionicons name="add" size={28} color="white" />
                </TouchableOpacity>
            </View>

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalWrapper}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>{editing ? 'Editar Dirección' : 'Agregar Dirección'}</Text>
                        <TextInput placeholder="Nombre (ej. Casa)" value={label} onChangeText={setLabel} style={styles.input} />
                        <TextInput placeholder="Detalles / Dirección" value={details} onChangeText={setDetails} style={[styles.input, { height: 80 }]} multiline />
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                            <TouchableOpacity style={styles.smallButton} onPress={useCurrentLocation}>
                                <Text style={styles.smallButtonText}>Usar ubicación actual</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#ccc' }]} onPress={() => { setCoords(null); setDetails(''); }}>
                                <Text style={[styles.smallButtonText, { color: '#333' }]}>Limpiar</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Selector de ubicación embebido en el modal */}
                        <Text style={{ marginBottom: 6 }}>Toca en el mapa para seleccionar la ubicación:</Text>
                        <View style={styles.modalMapWrapper}>
                            <MapView
                                style={[StyleSheet.absoluteFillObject]}
                                initialRegion={coords ? {
                                    latitude: coords.latitude,
                                    longitude: coords.longitude,
                                    latitudeDelta: 0.02,
                                    longitudeDelta: 0.02,
                                } : {
                                    latitude: -34.6037,
                                    longitude: -58.3816,
                                    latitudeDelta: 1,
                                    longitudeDelta: 1,
                                }}
                                onPress={(e) => {
                                    const { latitude, longitude } = e.nativeEvent.coordinate;
                                    setTempCoords({ latitude, longitude });
                                }}
                            >
                                <UrlTile urlTemplate="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png" maximumZ={19} />
                                {tempCoords && <Marker coordinate={tempCoords} pinColor="#ff8000" />}
                            </MapView>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 6 }}>
                            <TouchableOpacity
                                style={styles.smallButton}
                                onPress={async () => {
                                    if (!tempCoords) {
                                        Alert.alert('Selecciona una ubicación', 'Toca en el mapa para elegir la ubicación');
                                        return;
                                    }
                                    setCoords(tempCoords);
                                    try {
                                        const rev = await Location.reverseGeocodeAsync(tempCoords);
                                        if (rev && rev.length) {
                                            const place = rev[0];
                                            const addressString = [place.name, place.street, place.city, place.region, place.postalCode]
                                                .filter(Boolean)
                                                .join(', ');
                                            setDetails(addressString || `${tempCoords.latitude.toFixed(5)}, ${tempCoords.longitude.toFixed(5)}`);
                                        } else {
                                            setDetails(`${tempCoords.latitude.toFixed(5)}, ${tempCoords.longitude.toFixed(5)}`);
                                        }
                                    } catch (e) {
                                        console.warn('Reverse geocode failed', e);
                                        setDetails(`${tempCoords.latitude.toFixed(5)}, ${tempCoords.longitude.toFixed(5)}`);
                                    }
                                }}
                            >
                                <Text style={styles.smallButtonText}>Usar ubicación seleccionada</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#eee' }]} onPress={() => setTempCoords(null)}>
                                <Text style={[styles.smallButtonText, { color: '#333' }]}>Cancelar selección</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <TouchableOpacity onPress={() => setIsDefault(!isDefault)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name={isDefault ? 'star' : 'star-outline'} size={18} color={isDefault ? '#f1c40f' : '#666'} />
                                <Text style={{ marginLeft: 8 }}>{isDefault ? 'Predeterminada' : 'Marcar como predeterminada'}</Text>
                            </TouchableOpacity>


                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}><Text>Cancelar</Text></TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} style={styles.saveButton}><Text style={{ color: 'white' }}>Guardar</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent', paddingBottom: 80, paddingTop: 110 },
    content: { flex: 1, padding: 16 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: '#666' },
    item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderRadius: 10, marginVertical: 6, elevation: 2 },
    itemLeft: { flexDirection: 'row', alignItems: 'center' },
    itemLabel: { fontWeight: '600' },
    itemDetails: { color: '#666', fontSize: 12 },

    addButton: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#ff8000', alignItems: 'center', justifyContent: 'center', elevation: 6 },
    modalWrapper: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
    modal: { backgroundColor: 'white', borderRadius: 12, padding: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10 },
    smallButton: { backgroundColor: '#ff8000', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center', justifyContent: 'center' },
    smallButtonText: { color: 'white' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 },
    cancelButton: { padding: 10, marginRight: 8 },
    saveButton: { backgroundColor: '#ff8000', padding: 10, borderRadius: 8 },
    searchInput: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 10 },
    mapPreview: {
        width: '100%',
        height: 100,
        marginTop: 8,
        borderRadius: 8,
        overflow: 'hidden',  // IMPORTANTE para bordes redondeados
    },
    mapInner: {
        borderRadius: 8,
    },
    modalMapWrapper: {
        width: '100%',
        height: 180,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#eee',
        marginBottom: 6,
    },
    rightAction: {
        backgroundColor: '#cc0000',
        justifyContent: 'center',
        alignItems: 'center',
        width: 72,
        marginVertical: 6,
        borderRadius: 8,
    },
    categoryPill: { backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    categoryText: { fontSize: 12, color: '#333' },
});