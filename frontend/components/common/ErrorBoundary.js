import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <View style={styles.container}>
                <Ionicons name="warning-outline" size={64} color="#FF6B00" />
                <Text style={styles.title}>Algo salió mal</Text>
                <Text style={styles.subtitle}>
                    Ocurrió un error inesperado. Podés intentar de nuevo o reiniciar la app.
                </Text>
                <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
                    <Text style={styles.buttonText}>Intentar de nuevo</Text>
                </TouchableOpacity>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 16,
    },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 22,
        color: '#111',
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
    button: {
        marginTop: 8,
        backgroundColor: '#FF6B00',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 24,
    },
    buttonText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 15,
        color: '#fff',
    },
});
