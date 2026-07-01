import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import AppHeader from '../../components/common/AppHeader';
import API, { API_URL } from '../../services/api';
import { useAppDispatch } from '../../store/hooks';
import { updateUserProfile } from '../../store/slices/userSlice';
import { showSuccessMessage } from '../../components/FlashMessageWrapper';

export default function EditProfileScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userData, setUserData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
    });
    const [avatarUrl, setAvatarUrl] = useState(null);
    const dispatch = useAppDispatch();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const data = await API.users.getProfile();
            if (data.success) {
                const user = data.user;
                setUserData({
                    nombre: user.nombre || '',
                    apellido: user.apellido || '',
                    email: user.email || '',
                    telefono: user.telefono || '',
                });
                setAvatarUrl(user.avatar_url);
                dispatch(updateUserProfile({
                    nombre: user.nombre,
                    apellido: user.apellido,
                    telefono: user.telefono,
                    avatar_url: user.avatar_url,
                }));
            } else {
                Alert.alert('Error', data.message || 'No se pudieron cargar los datos del perfil');
            }
        } catch {
            Alert.alert('Error', 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permiso necesario', 'Se necesita permiso para acceder a las imágenes');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled) {
            await uploadImage(result.assets[0]);
        }
    };

    const uploadImage = async (asset) => {
        try {
            const token = await API.token.get();
            const ext = asset.uri.split('.').pop() || 'jpg';
            const mimeType = asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
            const formData = new FormData();
            formData.append('avatar', {
                uri: asset.uri,
                type: mimeType,
                name: `avatar.${ext}`,
            });
            const response = await fetch(`${API_URL}/api/users/avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            const data = await response.json();
            if (data.success) {
                setAvatarUrl(data.avatar_url);
                dispatch(updateUserProfile({ avatar_url: data.avatar_url }));
                showSuccessMessage('Foto de perfil actualizada');
            } else {
                Alert.alert('Error', data.message || 'Error al subir la imagen');
            }
        } catch {
            Alert.alert('Error', 'Error de conexión al subir imagen');
        }
    };

    const saveProfile = async () => {
        if (!userData.nombre.trim() || !userData.apellido.trim()) {
            Alert.alert('Error', 'Nombre y apellido son obligatorios');
            return;
        }
        setSaving(true);
        try {
            const data = await API.users.updateProfile({
                nombre: userData.nombre,
                apellido: userData.apellido,
                telefono: userData.telefono,
            });
            if (data.success) {
                dispatch(updateUserProfile({
                    nombre: userData.nombre,
                    apellido: userData.apellido,
                    telefono: userData.telefono,
                }));
                navigation.goBack();
            } else {
                Alert.alert('Error', data.message || 'Error al actualizar el perfil');
            }
        } catch {
            Alert.alert('Error', 'Error de conexión');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <AppHeader title="Editar Perfil" onBack={() => navigation.goBack()} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF8700" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AppHeader title="Editar Perfil" onBack={() => navigation.goBack()} />

            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + 44 + 24, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 24 }
                ]}
            >
                {/* Foto de perfil */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity
                        onPress={pickImage}
                        style={styles.avatarContainer}
                        accessibilityRole="button"
                        accessibilityLabel="Cambiar foto de perfil"
                    >
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarPlaceholderText}>
                                    {userData.nombre.charAt(0)}{userData.apellido.charAt(0)}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.changePhotoText}>Cambiar foto</Text>
                    </TouchableOpacity>
                </View>

                {/* Información Personal */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Información Personal</Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Nombre *</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.nombre}
                            onChangeText={(text) => setUserData({ ...userData, nombre: text })}
                            placeholder="Ingresá tu nombre"
                            accessibilityLabel="Nombre"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Apellido *</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.apellido}
                            onChangeText={(text) => setUserData({ ...userData, apellido: text })}
                            placeholder="Ingresá tu apellido"
                            accessibilityLabel="Apellido"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, styles.disabledInput]}
                            value={userData.email}
                            editable={false}
                            accessibilityLabel="Email, no editable"
                        />
                        <Text style={styles.helperText}>El email no se puede modificar</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Teléfono</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.telefono}
                            onChangeText={(text) => setUserData({ ...userData, telefono: text })}
                            placeholder="Ingresá tu teléfono"
                            keyboardType="phone-pad"
                            accessibilityLabel="Teléfono"
                        />
                    </View>
                </View>

                {/* Botones */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={saveProfile}
                        disabled={saving}
                        accessibilityRole="button"
                        accessibilityLabel="Guardar cambios"
                    >
                        {saving ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                        accessibilityRole="button"
                        accessibilityLabel="Cancelar"
                    >
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContainer: { flex: 1 },
    scrollContent: { paddingHorizontal: 16 },

    avatarSection: {
        alignItems: 'center',
        marginVertical: 20,
    },
    avatarContainer: {
        alignItems: 'center',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#e0e0e0',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FF8700',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#e0e0e0',
    },
    avatarPlaceholderText: {
        fontSize: 36,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    changePhotoText: {
        marginTop: 8,
        color: '#FF8700',
        fontSize: 14,
        fontWeight: '500',
    },

    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
        color: '#333',
    },

    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 6,
        color: '#555',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 13,
        fontSize: 16,
        backgroundColor: '#fafafa',
        minHeight: 44,
    },
    disabledInput: {
        backgroundColor: '#f0f0f0',
        color: '#888',
    },
    helperText: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
        fontStyle: 'italic',
    },

    buttonContainer: {
        marginVertical: 8,
    },
    saveButton: {
        backgroundColor: '#FF8700',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 12,
        minHeight: 44,
    },
    saveButtonDisabled: {
        backgroundColor: '#FFB966',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        minHeight: 44,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
});
