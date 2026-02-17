import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppHeader from '../components/common/AppHeader';

export default function NotificationsScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <AppHeader title="Notificaciones" onBack={() => navigation.goBack()} showCart={false} />
            <View style={styles.content}>
                <Text>Pantalla Notificaciones (placeholder)</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
