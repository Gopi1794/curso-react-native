import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import { Dialog, Portal, Button, Paragraph } from 'react-native-paper';
import AppHeader from '../../components/common/AppHeader';
import { showSuccessMessage, showErrorMessage } from '../../components/FlashMessageWrapper';
import { useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/userSlice';
import API from '../../services/api';

const DATA_ITEMS = [
    { icon: 'person-outline',    label: 'Nombre y email',         desc: 'Para identificarte y contactarte' },
    { icon: 'location-outline',  label: 'Direcciones de entrega', desc: 'Para procesar tus pedidos' },
    { icon: 'receipt-outline',   label: 'Historial de pedidos',   desc: 'Para soporte y estadísticas' },
    { icon: 'card-outline',      label: 'Últimos 4 dígitos',      desc: 'Nunca guardamos el número completo' },
    { icon: 'notifications-outline', label: 'Token de notificaciones', desc: 'Solo para enviarte alertas de tus pedidos' },
];

export default function PrivacyScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const dispatch = useAppDispatch();

    // Change password
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword]         = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent]         = useState(false);
    const [showNew, setShowNew]                 = useState(false);
    const [showConfirm, setShowConfirm]         = useState(false);
    const [savingPw, setSavingPw]               = useState(false);

    // Delete account
    const [deleteDialog, setDeleteDialog]       = useState(false);
    const [deletePassword, setDeletePassword]   = useState('');
    const [showDeletePw, setShowDeletePw]       = useState(false);
    const [deleting, setDeleting]               = useState(false);

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Validación', 'Completá todos los campos');
            return;
        }
        if (newPassword.length < 8) {
            Alert.alert('Validación', 'La nueva contraseña debe tener al menos 8 caracteres');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Validación', 'Las contraseñas nuevas no coinciden');
            return;
        }
        setSavingPw(true);
        try {
            const res = await API.users.changePassword(currentPassword, newPassword);
            if (res.success) {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                showSuccessMessage('Contraseña actualizada');
            } else {
                showErrorMessage(res.message || 'No se pudo actualizar la contraseña');
            }
        } catch {
            showErrorMessage('Error de conexión');
        } finally {
            setSavingPw(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            showErrorMessage('Ingresá tu contraseña para confirmar');
            return;
        }
        setDeleting(true);
        try {
            const res = await API.users.deleteAccount(deletePassword);
            if (res.success) {
                setDeleteDialog(false);
                dispatch(logout());
                try {
                    navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
                } catch {
                    navigation.getParent?.()?.navigate('MainApp');
                }
            } else {
                showErrorMessage(res.message || 'No se pudo eliminar la cuenta');
            }
        } catch {
            showErrorMessage('Error de conexión');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Privacidad y Seguridad" onBack={() => navigation.goBack()} />

            <ScrollView
                contentContainerStyle={[
                    styles.scroll,
                    { paddingTop: insets.top + 44 + 24, paddingBottom: FLOATING_TAB_BAR_HEIGHT + insets.bottom + 48 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Cambiar contraseña ── */}
                <Text style={styles.sectionLabel}>SEGURIDAD</Text>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardIconBox}>
                            <Ionicons name="lock-closed-outline" size={20} color="#ff8800" />
                        </View>
                        <Text style={styles.cardTitle}>Cambiar contraseña</Text>
                    </View>

                    <Text style={styles.fieldLabel}>Contraseña actual</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry={!showCurrent}
                            accessibilityLabel="Contraseña actual"
                        />
                        <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={styles.eyeBtn}>
                            <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.fieldLabel}>Nueva contraseña</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="Mínimo 8 caracteres"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry={!showNew}
                            accessibilityLabel="Nueva contraseña"
                        />
                        <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
                            <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.fieldLabel}>Confirmá la nueva contraseña</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showConfirm}
                            accessibilityLabel="Confirmar nueva contraseña"
                        />
                        <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                            <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryBtn, savingPw && { opacity: 0.6 }]}
                        onPress={handleChangePassword}
                        disabled={savingPw}
                        accessibilityRole="button"
                        accessibilityLabel="Guardar nueva contraseña"
                    >
                        {savingPw
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={styles.primaryBtnText}>Guardar contraseña</Text>
                        }
                    </TouchableOpacity>
                </View>

                {/* ── Tus datos ── */}
                <Text style={[styles.sectionLabel, { marginTop: 28 }]}>TUS DATOS</Text>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardIconBox}>
                            <Ionicons name="shield-checkmark-outline" size={20} color="#ff8800" />
                        </View>
                        <Text style={styles.cardTitle}>Qué información guardamos</Text>
                    </View>
                    <Text style={styles.dataIntro}>
                        Solo guardamos lo mínimo necesario para que la app funcione. Nunca vendemos tus datos.
                    </Text>
                    {DATA_ITEMS.map((item, i) => (
                        <View key={i} style={styles.dataRow}>
                            <Ionicons name={item.icon} size={18} color="#ff8800" style={{ marginRight: 12, marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.dataLabel}>{item.label}</Text>
                                <Text style={styles.dataDesc}>{item.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* ── Zona de peligro ── */}
                <Text style={[styles.sectionLabel, { marginTop: 28, color: '#cc0000' }]}>ZONA DE PELIGRO</Text>
                <View style={[styles.card, styles.dangerCard]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIconBox, { backgroundColor: 'rgba(204,0,0,0.08)' }]}>
                            <Ionicons name="trash-outline" size={20} color="#cc0000" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: '#cc0000' }]}>Eliminar cuenta</Text>
                            <Text style={styles.dangerDesc}>
                                Esta acción es permanente e irreversible. Se borrarán todos tus datos, pedidos y métodos de pago.
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.dangerBtn}
                        onPress={() => { setDeletePassword(''); setDeleteDialog(true); }}
                        accessibilityRole="button"
                        accessibilityLabel="Eliminar mi cuenta"
                    >
                        <Text style={styles.dangerBtnText}>Eliminar mi cuenta</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Dialog eliminar cuenta */}
            <Portal>
                <Dialog visible={deleteDialog} onDismiss={() => setDeleteDialog(false)} style={styles.dialog}>
                    <Dialog.Icon icon="alert-circle-outline" size={40} color="#cc0000" />
                    <Dialog.Title style={styles.dialogTitle}>¿Eliminar cuenta?</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph style={styles.dialogMessage}>
                            Esta acción no se puede deshacer. Ingresá tu contraseña para confirmar.
                        </Paragraph>
                        <View style={[styles.inputRow, { marginTop: 12 }]}>
                            <TextInput
                                style={styles.input}
                                placeholder="Tu contraseña"
                                value={deletePassword}
                                onChangeText={setDeletePassword}
                                secureTextEntry={!showDeletePw}
                                accessibilityLabel="Contraseña de confirmación"
                            />
                            <TouchableOpacity onPress={() => setShowDeletePw(v => !v)} style={styles.eyeBtn}>
                                <Ionicons name={showDeletePw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                            </TouchableOpacity>
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions style={styles.dialogActions}>
                        <Button onPress={() => setDeleteDialog(false)} textColor="#888">Cancelar</Button>
                        <Button onPress={handleDeleteAccount} textColor="#cc0000" disabled={deleting}>
                            {deleting ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },

    scroll: { paddingHorizontal: 16 },

    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#888',
        letterSpacing: 1.2,
        marginBottom: 10,
    },

    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
    },
    dangerCard: {
        borderWidth: 1,
        borderColor: 'rgba(204,0,0,0.15)',
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    cardIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,136,0,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        paddingTop: 10,
    },

    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#555',
        marginBottom: 6,
        marginTop: 4,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        backgroundColor: '#fafafa',
        marginBottom: 12,
        minHeight: 44,
    },
    input: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 15,
        color: '#222',
    },
    eyeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        minWidth: 44,
        alignItems: 'center',
    },

    primaryBtn: {
        backgroundColor: '#ff8800',
        borderRadius: 10,
        paddingVertical: 13,
        alignItems: 'center',
        marginTop: 4,
        minHeight: 44,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    dataIntro: {
        fontSize: 13,
        color: '#666',
        marginBottom: 14,
        lineHeight: 18,
    },
    dataRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    dataLabel: { fontSize: 14, fontWeight: '600', color: '#222', marginBottom: 2 },
    dataDesc:  { fontSize: 12, color: '#888', lineHeight: 16 },

    dangerDesc: {
        fontSize: 13,
        color: '#888',
        lineHeight: 18,
        marginTop: 4,
        flex: 1,
    },
    dangerBtn: {
        borderWidth: 1.5,
        borderColor: '#cc0000',
        borderRadius: 10,
        paddingVertical: 13,
        alignItems: 'center',
        minHeight: 44,
    },
    dangerBtnText: { color: '#cc0000', fontWeight: '700', fontSize: 15 },

    dialog:        { borderRadius: 20, backgroundColor: '#fff' },
    dialogTitle:   { textAlign: 'center', fontSize: 16, color: '#1a1a1a' },
    dialogMessage: { textAlign: 'center', fontSize: 14, color: '#555', lineHeight: 20 },
    dialogActions: { justifyContent: 'space-around', paddingBottom: 8 },
});
