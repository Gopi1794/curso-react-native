import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, Switch, ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import AppHeader from '../../components/common/AppHeader';
import { showSuccessMessage, showErrorMessage } from '../../components/FlashMessageWrapper';
import API from '../../services/api';

const PREFS_CONFIG = [
    {
        key: 'pedidos',
        icon: 'receipt-outline',
        label: 'Estado de pedidos',
        description: 'Confirmación, preparación y entrega de tus pedidos',
    },
    {
        key: 'promociones',
        icon: 'pricetag-outline',
        label: 'Promociones y ofertas',
        description: 'Descuentos exclusivos y cupones especiales',
    },
    {
        key: 'noticias',
        icon: 'newspaper-outline',
        label: 'Novedades',
        description: 'Nuevos restaurantes y platos disponibles',
    },
    {
        key: 'recordatorios',
        icon: 'alarm-outline',
        label: 'Recordatorios',
        description: 'Sugerencias de pedido según tus hábitos',
    },
];

export default function NotificationsScreen({ navigation }) {
    const [prefs, setPrefs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();

    const loadPreferences = useCallback(async () => {
        try {
            const res = await API.notifications.getPreferences();
            if (res.success) setPrefs(res.preferences);
        } catch {
            showErrorMessage('No se pudieron cargar las preferencias');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    const handleToggle = async (key, value) => {
        const prev = prefs;
        const updated = { ...prefs, [key]: value };
        setPrefs(updated);
        setSaving(true);
        try {
            await API.notifications.updatePreferences(updated);
            const label = PREFS_CONFIG.find(p => p.key === key)?.label ?? key;
            showSuccessMessage(value ? `${label} activadas` : `${label} desactivadas`);
        } catch {
            setPrefs(prev);
            showErrorMessage('Error al guardar cambios');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Notificaciones" onBack={() => navigation.goBack()} />

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#ff8800" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[
                        styles.scroll,
                        { paddingTop: insets.top + 44 + 24, paddingBottom: tabBarHeight + 24 },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.sectionTitle}>Recibir notificaciones de</Text>

                    {PREFS_CONFIG.map((item) => (
                        <View key={item.key} style={styles.row}>
                            <View style={styles.iconContainer}>
                                <Ionicons name={item.icon} size={22} color="#ff8800" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.label}>{item.label}</Text>
                                <Text style={styles.description}>{item.description}</Text>
                            </View>
                            <Switch
                                value={prefs?.[item.key] ?? false}
                                onValueChange={(val) => handleToggle(item.key, val)}
                                trackColor={{ false: '#ddd', true: '#ff8800' }}
                                thumbColor="#fff"
                                disabled={saving}
                                accessibilityLabel={item.label}
                                accessibilityRole="switch"
                            />
                        </View>
                    ))}

                    <Text style={styles.hint}>
                        Los cambios se guardan automáticamente. Asegurate de tener los permisos
                        de notificaciones activados en la configuración de tu dispositivo.
                    </Text>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: {
        paddingHorizontal: 16,
    },
    sectionTitle: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        minHeight: 72,
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: 'rgba(255,136,0,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    textContainer: {
        flex: 1,
        marginRight: 10,
    },
    label: {
        color: '#1a1a1a',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    description: {
        color: '#888',
        fontSize: 12,
        lineHeight: 17,
    },
    hint: {
        color: '#aaa',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 18,
        paddingHorizontal: 10,
    },
});
