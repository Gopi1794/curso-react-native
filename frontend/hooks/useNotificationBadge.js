import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const STORAGE_KEY = 'notifications_last_seen';

export async function markNotificationsRead() {
    await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
}

export function useNotificationBadge() {
    const [unreadCount, setUnreadCount] = useState(0);

    const refresh = useCallback(async () => {
        try {
            const [res, lastSeenStr] = await Promise.all([
                api.notifications.getFeed(),
                AsyncStorage.getItem(STORAGE_KEY),
            ]);
            if (!res.success) return;
            const lastSeen = lastSeenStr ? new Date(lastSeenStr) : new Date(0);
            const count = res.notificaciones.filter(
                n => new Date(n.fecha_actualizacion) > lastSeen
            ).length;
            setUnreadCount(count);
        } catch {
            // silently fail — no badge si hay error de red
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    const markAllRead = useCallback(async () => {
        await markNotificationsRead();
        setUnreadCount(0);
    }, []);

    return { unreadCount, markAllRead };
}
