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
import MapView, { Marker, UrlTile } from 'react-native-maps';
import AppHeader from '../components/common/AppHeader';
import InstructionBanner from '../components/common/InstructionBanner';
import { Ionicons } from '@expo/vector-icons';
import { showSuccessMessage } from '../components/FlashMessageWrapper';
import { Swipeable } from 'react-native-gesture-handler';
import * as Location from 'expo-location';
import api from '../services/api';

export default function AddressesScreen({ navigation }) {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [label, setLabel] = useState('');
    const [details, setDetails] = useState('');
    const [coords, setCoords] = useState(null);
    const [isDefault, setIsDefault] = useState(false);

    const [search, setSearch] = useState('');

    useEffect(() => {
        loadAddresses();
    }, []);

    const loadAddresses = async () => {
        try {
            const res = await api.users.getAddresses();
            if (res.success) {
                // Mapear columnas DB → estado local
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
        } catch (e) {
            console.error('Error loading addresses', e);
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
        setModalVisible(true);
    };

    const handleDelete = (id) => {
        Alert.alert('Eliminar', '¿Eliminar esta dirección?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await api.users.deleteAddress(id);
                        if (res.success) {
                            setAddresses(prev => prev.filter(a => a.id !== id));
                            showSuccessMessage('Dirección eliminada');
                        } else {
                            Alert.alert('Error', res.message || 'No se pudo eliminar');
                        }
                    } catch (e) {
                        console.error('Error deleting address', e);
                        Alert.alert('Error', 'No se pudo eliminar la dirección');
                    }
                }
            }
        ]);
    };

    const handleSave = async () => {
        if (!label.trim()) {
            Alert.alert('Validación', 'Ingresa un nombre para la dirección');
            return;
        }
        if (!details.trim()) {
            Alert.alert('Validación', 'Ingresa una dirección');
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
        } catch (e) {
            console.error('Error saving address', e);
            Alert.alert('Error', 'No se pudo guardar la dirección');
        }
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
                    <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
                        <Text style={styles.modalTitle}>Agregar Dirección</Text>

                        <TextInput
                            placeholder="Nombre (ej. Casa)"
                            value={label}
                            onChangeText={setLabel}
                            style={styles.input}
                        />
                        <TextInput
                            placeholder="Detalles / Dirección"
                            value={details}
                            onChangeText={setDetails}
                            style={[styles.input, { height: 80 }]}
                            multiline
                        />

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                            <TouchableOpacity style={styles.smallButton} onPress={useCurrentLocation}>
                                <Ionicons name="locate" size={14} color="#fff" />
                                <Text style={[styles.smallButtonText, { marginLeft: 4 }]}>Mi ubicación</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#ccc' }]} onPress={() => { setCoords(null); setDetails(''); }}>
                                <Text style={[styles.smallButtonText, { color: '#333' }]}>Limpiar</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={{ marginBottom: 6, color: '#555', fontSize: 13 }}>
                            {coords ? '📍 Ubicación seleccionada — tocá para mover el pin' : 'Tocá en el mapa para marcar la ubicación:'}
                        </Text>
                        <View style={styles.modalMapWrapper}>
                            <MapView
                                style={StyleSheet.absoluteFillObject}
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
                                onPress={async (e) => {
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
                                }}
                            >
                                <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
                                {coords && <Marker coordinate={coords} pinColor="#ff8000" />}
                            </MapView>
                        </View>

                        <TouchableOpacity
                            onPress={() => setIsDefault(!isDefault)}
                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 4 }}
                        >
                            <Ionicons name={isDefault ? 'star' : 'star-outline'} size={18} color={isDefault ? '#f1c40f' : '#666'} />
                            <Text style={{ marginLeft: 8, color: '#333' }}>
                                {isDefault ? 'Predeterminada' : 'Marcar como predeterminada'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                                <Text>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                                <Text style={{ color: 'white' }}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
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
    modal: { backgroundColor: 'white', borderRadius: 12, padding: 16, flexGrow: 1 },
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