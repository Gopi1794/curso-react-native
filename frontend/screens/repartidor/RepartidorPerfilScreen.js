import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dialog, Portal, Button, Paragraph } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/userSlice';
import API from '../../services/api';

export default function RepartidorPerfilScreen() {
    const insets = useSafeAreaInsets();
    const dispatch = useAppDispatch();
    const userInfo = useAppSelector(s => s.user.userInfo);
    const [logoutVisible, setLogoutVisible] = useState(false);

    const confirmLogout = async () => {
        setLogoutVisible(false);
        await API.token.remove();
        dispatch(logout());
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.headerTitle}>Mi perfil</Text>
            </View>

            <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {userInfo?.nombre?.[0]}{userInfo?.apellido?.[0]}
                    </Text>
                </View>
                <Text style={styles.nombre}>{userInfo?.nombre} {userInfo?.apellido}</Text>
                <Text style={styles.email}>{userInfo?.email}</Text>
                <View style={styles.rolBadge}>
                    <Ionicons name="bicycle-outline" size={13} color="#FF8700" />
                    <Text style={styles.rolText}>Repartidor</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutVisible(true)}>
                <Ionicons name="log-out-outline" size={20} color="#ff4444" />
                <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>

            <Portal>
                <Dialog visible={logoutVisible} onDismiss={() => setLogoutVisible(false)} style={styles.dialog}>
                    <Dialog.Icon icon="log-out" size={36} color="#FF8700" />
                    <Dialog.Title style={styles.dialogTitle}>Cerrar sesión</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph style={styles.dialogMessage}>¿Estás seguro que querés cerrar sesión?</Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setLogoutVisible(false)} textColor="#888">Cancelar</Button>
                        <Button onPress={confirmLogout} textColor="#ff4444">Cerrar sesión</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    headerTitle: { fontFamily: 'Poppins-Bold', fontSize: 26, color: '#1A1A1A' },
    avatarSection: { alignItems: 'center', paddingTop: 40, paddingBottom: 30 },
    avatar: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#FF8700',
        justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    },
    avatarText: { fontFamily: 'Poppins-Bold', fontSize: 28, color: '#fff' },
    nombre: { fontFamily: 'Poppins-Bold', fontSize: 20, color: '#1A1A1A', marginBottom: 4 },
    email: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#888', marginBottom: 10 },
    rolBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#FFF5EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    },
    rolText: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#FF8700' },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginHorizontal: 20, padding: 16, backgroundColor: '#fff',
        borderRadius: 16, borderWidth: 1, borderColor: '#FFE5E5',
    },
    logoutText: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#ff4444' },
    dialog: { borderRadius: 20, backgroundColor: '#fff' },
    dialogTitle: { textAlign: 'center', fontFamily: 'Poppins-Bold', fontSize: 18 },
    dialogMessage: { textAlign: 'center', fontFamily: 'Poppins-Regular', color: '#666' },
});
