import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AppHeader from '../../components/common/AppHeader';
import AddAddressSheet from '../../components/common/AddAddressSheet';
import InstructionBanner from '../../components/common/InstructionBanner';
import { Ionicons } from '@expo/vector-icons';
import { showSuccessMessage } from '../../components/FlashMessageWrapper';
import { Dialog, Portal, Button, Paragraph } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import api from '../../services/api';

export default function AddressesScreen({ navigation }) {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [search, setSearch] = useState('');
    const [deleteDialog, setDeleteDialog] = useState({ visible: false, id: null });

    const insets = useSafeAreaInsets();

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

    const openAdd = () => setModalVisible(true);

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

            <View style={[styles.content, { paddingTop: insets.top + 44 + 32, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 16 }]}>
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

            <AddAddressSheet
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSaved={() => { showSuccessMessage('Dirección guardada'); loadAddresses(); }}
            />

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

    // Dialog
    dialog: { borderRadius: 20, backgroundColor: '#fff' },
    dialogTitle: { textAlign: 'center', fontSize: 16, color: '#1a1a1a' },
    dialogMessage: { textAlign: 'center', fontSize: 14, color: '#555' },
    dialogActions: { justifyContent: 'space-around', paddingBottom: 8 },
});
