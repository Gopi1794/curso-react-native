import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal, TextInput, Alert,
    TouchableOpacity, ScrollView, PanResponder, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import LeafletMap from './LeafletMap';
import api from '../../services/api';

export default function AddAddressSheet({ visible, onClose, onSaved }) {
    const [label,     setLabel]     = useState('');
    const [details,   setDetails]   = useState('');
    const [coords,    setCoords]    = useState(null);
    const [isDefault, setIsDefault] = useState(false);
    const [searching, setSearching] = useState(false);

    const sheetY = useRef(new Animated.Value(600)).current;

    const panResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
        onPanResponderMove:  (_, g) => { if (g.dy > 0) sheetY.setValue(g.dy); },
        onPanResponderRelease: (_, g) => {
            if (g.dy > 100) {
                Animated.timing(sheetY, { toValue: 600, duration: 200, useNativeDriver: true })
                    .start(() => { sheetY.setValue(600); onClose(); });
            } else {
                Animated.spring(sheetY, { toValue: 0, useNativeDriver: true }).start();
            }
        },
    })).current;

    useEffect(() => {
        if (visible) {
            setLabel('');
            setDetails('');
            setCoords(null);
            setIsDefault(false);
            setSearching(false);
            sheetY.setValue(600);
            Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
    }, [visible]);

    const closeSheet = () => {
        Animated.timing(sheetY, { toValue: 600, duration: 200, useNativeDriver: true })
            .start(() => { sheetY.setValue(600); onClose(); });
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
            if (rev?.length) {
                const p = rev[0];
                setDetails([p.name, p.street, p.city, p.region, p.postalCode].filter(Boolean).join(', ')
                    || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            } else {
                setDetails(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            }
        } catch {
            Alert.alert('Error', 'No se pudo obtener la ubicación');
        }
    };

    const handleSearchAddress = async () => {
        if (!details.trim()) return;
        setSearching(true);
        try {
            const results = await Location.geocodeAsync(details.trim());
            if (results?.length) {
                const { latitude, longitude } = results[0];
                setCoords({ latitude, longitude });
            } else {
                Alert.alert('No encontrado', 'No se encontró esa dirección. Intentá con más detalles o seleccionala en el mapa.');
            }
        } catch {
            Alert.alert('Error', 'No se pudo buscar la dirección');
        } finally {
            setSearching(false);
        }
    };

    const handleMapPress = async ({ latitude, longitude }) => {
        setCoords({ latitude, longitude });
        try {
            const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (rev?.length) {
                const p = rev[0];
                setDetails([p.name, p.street, p.city, p.region, p.postalCode].filter(Boolean).join(', ')
                    || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            } else {
                setDetails(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            }
        } catch {
            setDetails(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
    };

    const handleSave = async () => {
        if (!label.trim())   { Alert.alert('Validación', 'Ingresá un nombre para la dirección'); return; }
        if (!details.trim()) { Alert.alert('Validación', 'Ingresá una dirección'); return; }
        try {
            const res = await api.users.createAddress({
                etiqueta:    label.trim(),
                direccion:   details.trim(),
                ciudad:      '',
                latitud:     coords?.latitude  ?? null,
                longitud:    coords?.longitude ?? null,
                es_principal: isDefault,
            });
            if (res.success) {
                closeSheet();
                onSaved?.(res.address);
            } else {
                Alert.alert('Error', res.message || 'No se pudo guardar');
            }
        } catch {
            Alert.alert('Error', 'No se pudo guardar la dirección');
        }
    };

    return (
        <Modal visible={visible} animationType="none" transparent statusBarTranslucent>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeSheet} />
            <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>

                {/* Handle + close */}
                <View style={styles.sheetHeader} {...panResponder.panHandlers}>
                    <View style={styles.handle} />
                    <TouchableOpacity style={styles.closeBtn} onPress={closeSheet}
                        accessibilityRole="button" accessibilityLabel="Cerrar">
                        <Ionicons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.title}>Agregar Dirección</Text>

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

                    {/* Acciones de ubicación */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.btnPrimary} onPress={useCurrentLocation}
                            accessibilityRole="button" accessibilityLabel="Usar mi ubicación actual">
                            <Ionicons name="locate" size={14} color="#fff" />
                            <Text style={styles.btnPrimaryText}>Mi ubicación</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btnPrimary, searching && styles.btnDisabled]}
                            onPress={handleSearchAddress}
                            disabled={searching}
                            accessibilityRole="button"
                            accessibilityLabel="Buscar dirección"
                        >
                            <Ionicons name="search" size={14} color="#fff" />
                            <Text style={styles.btnPrimaryText}>{searching ? 'Buscando...' : 'Buscar'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.btnSecondary}
                            onPress={() => { setCoords(null); setDetails(''); }}
                            accessibilityRole="button" accessibilityLabel="Limpiar"
                        >
                            <Text style={styles.btnSecondaryText}>Limpiar</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.mapHintRow}>
                        <Ionicons name={coords ? 'location' : 'map-outline'} size={14} color={coords ? '#ff8000' : '#555'} />
                        <Text style={styles.mapHintText}>
                            {coords
                                ? 'Ubicación seleccionada — tocá para mover el pin'
                                : 'Tocá en el mapa para marcar la ubicación'}
                        </Text>
                    </View>

                    <View style={styles.mapWrapper}>
                        <LeafletMap
                            latitude={coords?.latitude  ?? -34.6037}
                            longitude={coords?.longitude ?? -58.3816}
                            interactive={true}
                            onPress={({ latitude, longitude }) => handleMapPress({ latitude, longitude })}
                        />
                    </View>

                    <TouchableOpacity onPress={() => setIsDefault(!isDefault)} style={styles.defaultToggle}
                        accessibilityRole="checkbox"
                        accessibilityLabel={isDefault ? 'Predeterminada' : 'Marcar como predeterminada'}>
                        <Ionicons name={isDefault ? 'star' : 'star-outline'} size={18} color={isDefault ? '#f1c40f' : '#666'} />
                        <Text style={styles.defaultToggleText}>
                            {isDefault ? 'Predeterminada' : 'Marcar como predeterminada'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <TouchableOpacity onPress={closeSheet} style={styles.cancelBtn}
                            accessibilityRole="button" accessibilityLabel="Cancelar">
                            <Text style={styles.cancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}
                            accessibilityRole="button" accessibilityLabel="Guardar dirección">
                            <Text style={styles.saveBtnText}>Guardar</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '92%', minHeight: '50%',
    },
    sheetHeader: {
        alignItems: 'center', paddingTop: 12, paddingBottom: 4, paddingHorizontal: 16,
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', marginBottom: 4 },
    closeBtn: {
        position: 'absolute', right: 16, top: 10,
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
    },
    content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#1a1a1a' },
    inputLabel: { fontSize: 13, fontWeight: '500', color: '#555', marginBottom: 4 },
    input: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 12,
        marginBottom: 12, fontSize: 15, minHeight: 44, backgroundColor: '#fafafa',
    },
    inputMultiline: { height: 80, textAlignVertical: 'top' },
    actionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    btnPrimary: {
        backgroundColor: '#ff8000', paddingHorizontal: 10, paddingVertical: 12,
        borderRadius: 8, flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 5, minHeight: 44,
    },
    btnDisabled: { opacity: 0.6 },
    btnPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '500' },
    btnSecondary: {
        backgroundColor: '#eee', paddingHorizontal: 10, paddingVertical: 12,
        borderRadius: 8, flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44,
    },
    btnSecondaryText: { color: '#333', fontSize: 12, fontWeight: '500' },
    mapHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    mapHintText: { fontSize: 13, color: '#555', flex: 1 },
    mapWrapper: {
        width: '100%', height: 180, borderRadius: 8,
        overflow: 'hidden', backgroundColor: '#eee', marginBottom: 12,
    },
    defaultToggle: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 8, marginBottom: 4, minHeight: 44,
    },
    defaultToggleText: { color: '#333', fontSize: 14 },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 44, justifyContent: 'center' },
    cancelBtnText: { color: '#666', fontSize: 15 },
    saveBtn: {
        backgroundColor: '#ff8000', paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 8, minHeight: 44, justifyContent: 'center',
    },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
