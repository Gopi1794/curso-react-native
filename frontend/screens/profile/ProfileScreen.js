import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Dialog, Portal, Button, Paragraph } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/userSlice';
import API from '../../services/api';

const QUICK_ACCESS_ADMIN = [
    { icon: 'fast-food-outline',  label: 'Platos',        screen: 'AdminPlatos' },
    { icon: 'bicycle-outline',    label: 'Pedidos',        screen: 'AdminPedidos' },
    { icon: 'layers-outline',     label: 'Stock',          screen: 'AdminStock' },
    { icon: 'cash-outline',       label: 'Repartidores',   screen: 'AdminRepartidores' },
];

const CONFIG_ITEMS = [
    { icon: 'person-outline',        color: '#FF8700', label: 'Editar Perfil',    sub: 'Actualiza tu información personal',     screen: 'EditProfile' },
    { icon: 'location-outline',      color: '#FF8700', label: 'Mis Direcciones',  sub: 'Gestiona tus direcciones guardadas',    screen: 'Addresses' },
    { icon: 'notifications-outline', color: '#FF8700', label: 'Notificaciones',   sub: 'Configurá tus alertas y avisos',        screen: 'Notifications' },
];

const SUPPORT_ITEMS = [
    { icon: 'headset-outline',        color: '#1976D2', label: 'Centro de Ayuda',        sub: 'Resuelve tus dudas',               screen: 'Help' },
    { icon: 'shield-checkmark-outline', color: '#616161', label: 'Términos y Privacidad', sub: 'Información legal y políticas',    screen: 'Privacy' },
];

export default function ProfileScreen({ navigation }) {
    const dispatch   = useAppDispatch();
    const insets     = useSafeAreaInsets();
    const userInfo   = useAppSelector(s => s.user.userInfo);
    const [logoutVisible, setLogoutVisible] = useState(false);

    const userName = userInfo ? `${userInfo.nombre ?? ''} ${userInfo.apellido ?? ''}`.trim() : 'Usuario';
    const userEmail = userInfo?.email ?? '';
    const isAdmin   = userInfo?.rol === 'admin';
    const avatarSource = userInfo?.avatar_url
        ? { uri: userInfo.avatar_url }
        : require('../../assets/img/usuario-img.jpg');

    const goTo = (item) => {
        if (item.screen) {
            navigation.navigate(item.screen);
        } else if (item.tab) {
            navigation.getParent()?.navigate(item.tab);
        }
    };

    const confirmLogout = () => {
        setLogoutVisible(false);
        dispatch(logout());
        API.token.remove().catch(() => {});
        API.auth.logout().catch(() => {});
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: FLOATING_TAB_BAR_HEIGHT }]}
            >
                {/* ── Encabezado ── */}
                <View style={styles.pageHeader}>
                    <Text style={styles.pageTitle}>Mi Perfil</Text>
                </View>

                {/* ── Hero card naranja ── */}
                <LinearGradient colors={['#FF8700', '#FF5500']} style={styles.heroCard}>
                    {/* Patrón de fondo */}
                    <View style={styles.pattern} pointerEvents="none">
                        {[
                            { name: 'pizza-outline',    top: -10, right: 20,  size: 64 },
                            { name: 'fast-food-outline', top: 30,  right: -12, size: 56 },
                            { name: 'cafe-outline',      bottom: -8, left: -8, size: 52 },
                            { name: 'ice-cream-outline', bottom: 20, right: 60, size: 44 },
                        ].map((p, i) => (
                            <Ionicons
                                key={i}
                                name={p.name}
                                size={p.size}
                                color="rgba(255,255,255,0.12)"
                                style={{ position: 'absolute', top: p.top, bottom: p.bottom, left: p.left, right: p.right }}
                            />
                        ))}
                    </View>

                    <View style={styles.avatarWrap}>
                        <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
                        <View style={styles.verifiedDot}>
                            <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                    </View>

                    <Text style={styles.heroName}>{userName}</Text>
                    <Text style={styles.heroEmail}>{userEmail}</Text>

                    <View style={styles.verifiedPill}>
                        <Ionicons name="checkmark-circle" size={15} color="#fff" />
                        <Text style={styles.verifiedText}>Cuenta verificada</Text>
                    </View>
                </LinearGradient>

                {/* ── Accesos rápidos (solo admin) ── */}
                {isAdmin && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Accesos rápidos</Text>
                        <View style={styles.quickGrid}>
                            {QUICK_ACCESS_ADMIN.map((item, i) => (
                                <TouchableOpacity key={i} style={styles.quickItem} onPress={() => goTo(item)}>
                                    <View style={styles.quickIcon}>
                                        <Ionicons name={item.icon} size={22} color="#FF8700" />
                                    </View>
                                    <Text style={styles.quickLabel}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Administración ── */}
                {isAdmin && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Administración</Text>
                        <View style={styles.menuCard}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AdminDashboard')}>
                                <View style={[styles.menuIcon, { backgroundColor: '#2E7D32' }]}>
                                    <Ionicons name="leaf-outline" size={20} color="#fff" />
                                </View>
                                <View style={styles.menuText}>
                                    <Text style={styles.menuLabel}>Administración</Text>
                                    <Text style={styles.menuSub}>Gestiona tu negocio y preferencias</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#ccc" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── Configuración ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Configuración</Text>
                    <View style={styles.menuCard}>
                        {CONFIG_ITEMS.map((item, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.menuItem, i < CONFIG_ITEMS.length - 1 && styles.menuItemBorder]}
                                onPress={() => goTo(item)}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                                    <Ionicons name={item.icon} size={20} color="#fff" />
                                </View>
                                <View style={styles.menuText}>
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    <Text style={styles.menuSub}>{item.sub}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#ccc" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ── Soporte y legal ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Soporte y legal</Text>
                    <View style={styles.menuCard}>
                        {SUPPORT_ITEMS.map((item, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.menuItem, i < SUPPORT_ITEMS.length - 1 && styles.menuItemBorder]}
                                onPress={() => goTo(item)}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                                    <Ionicons name={item.icon} size={20} color="#fff" />
                                </View>
                                <View style={styles.menuText}>
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    <Text style={styles.menuSub}>{item.sub}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#ccc" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ── Cerrar sesión ── */}
                <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutVisible(true)}>
                    <Ionicons name="log-out-outline" size={20} color="#FF8700" />
                    <Text style={styles.logoutText}>Cerrar sesión</Text>
                </TouchableOpacity>
            </ScrollView>

            <Portal>
                <Dialog visible={logoutVisible} onDismiss={() => setLogoutVisible(false)} style={styles.dialog}>
                    <Dialog.Icon icon="log-out" size={36} color="#FF8700" />
                    <Dialog.Title style={styles.dialogTitle}>Cerrar sesión</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph style={styles.dialogMessage}>¿Estás seguro que querés cerrar sesión?</Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions style={styles.dialogActions}>
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
    scroll: { paddingHorizontal: 20 },

    /* Encabezado */
    pageHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20,
    },
    pageTitle: { fontFamily: 'Poppins-Bold', fontSize: 26, color: '#1a1a1a' },

    /* Hero card */
    heroCard: {
        borderRadius: 24, padding: 24, alignItems: 'center',
        marginBottom: 24, overflow: 'hidden',
        shadowColor: '#FF8700', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
    },
    pattern: { ...StyleSheet.absoluteFillObject },
    avatarWrap: { position: 'relative', marginBottom: 12 },
    avatar: {
        width: 96, height: 96, borderRadius: 48,
        borderWidth: 3, borderColor: '#fff',
    },
    verifiedDot: {
        position: 'absolute', bottom: 4, right: 4,
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: '#4CD964', borderWidth: 2, borderColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
    },
    heroName:  { fontFamily: 'Poppins-Bold', fontSize: 20, color: '#fff', marginBottom: 2 },
    heroEmail: { fontFamily: 'Poppins-Regular', fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 14 },
    verifiedPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 6,
    },
    verifiedText: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#fff' },

    /* Sección */
    section: { marginBottom: 20 },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontFamily: 'Poppins-Bold', fontSize: 16, color: '#1a1a1a', marginBottom: 12 },

    /* Accesos rápidos */
    quickGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    quickItem: {
        flex: 1, backgroundColor: '#fff', borderRadius: 16,
        alignItems: 'center', paddingVertical: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    quickIcon: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    quickLabel: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#555', textAlign: 'center', lineHeight: 15 },

    /* Menu card */
    menuCard: {
        backgroundColor: '#fff', borderRadius: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
        overflow: 'hidden',
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    menuIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    menuText: { flex: 1 },
    menuLabel: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#1a1a1a' },
    menuSub:   { fontFamily: 'Poppins-Regular',   fontSize: 12, color: '#999',   marginTop: 1 },

    /* Cerrar sesión */
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: '#FFF3E0', borderRadius: 16, paddingVertical: 16,
        marginBottom: 8,
    },
    logoutText: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#FF8700' },

    /* Dialog */
    dialog: { borderRadius: 20, backgroundColor: '#fff' },
    dialogTitle: { textAlign: 'center', fontFamily: 'Poppins-Bold', fontSize: 16, color: '#1a1a1a' },
    dialogMessage: { textAlign: 'center', fontFamily: 'Poppins-Regular', fontSize: 14, color: '#555', lineHeight: 20 },
    dialogActions: { justifyContent: 'space-around', paddingBottom: 8 },
});
