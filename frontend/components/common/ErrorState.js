import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const ErrorState = ({ message = 'No se pudo cargar el contenido', onRetry, icon = 'cloud-offline-outline' }) => (
    <View style={styles.container}>
        <Ionicons name={icon} size={52} color="#ccc" />
        <Text style={styles.message}>{message}</Text>
        {onRetry && (
            <TouchableOpacity style={styles.button} onPress={onRetry}>
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <Text style={styles.buttonText}>Reintentar</Text>
            </TouchableOpacity>
        )}
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 12,
    },
    message: {
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
        backgroundColor: '#FF6B00',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
    },
    buttonText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#fff',
    },
});
