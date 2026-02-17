// components/FlashMessageWrapper.js
import React from 'react';
import FlashMessage, { showMessage } from 'react-native-flash-message';
import { StatusBar } from 'react-native';
const FlashMessageWrapper = () => {
    return (
        <FlashMessage
            position="center"
            animated={true}
            statusBarHeight={StatusBar.currentHeight}
            floating={true}
            duration={3000}
            style={{
                borderRadius: 10,

            }}
            titleStyle={{
                fontSize: 16,
                fontWeight: 'bold',
                textAlign: 'center',
            }}
        />
    );
};

export default FlashMessageWrapper;

// Función para mostrar mensajes de éxito
export const showSuccessMessage = (message, description = '') => {
    showMessage({
        message,
        description,
        type: 'success',
        backgroundColor: '#4CAF50',
        color: 'white',
        icon: 'success',
    });
};

// Función para mostrar mensajes de error
export const showErrorMessage = (message, description = '') => {
    showMessage({
        message,
        description,
        type: 'danger',
        backgroundColor: '#F44336',
        color: 'white',
        icon: 'danger',
    });
};

// Función para mostrar mensajes de información
export const showInfoMessage = (message, description = '') => {
    showMessage({
        message,
        description,
        type: 'info',
        backgroundColor: '#2196F3',
        color: 'white',
        icon: 'info',
    });
};

// Función para mostrar mensajes de advertencia
export const showWarningMessage = (message, description = '') => {
    showMessage({
        message,
        description,
        type: 'warning',
        backgroundColor: '#FF9800',
        color: 'white',
        icon: 'warning',
    });
};

// Función específica para favoritos
export const showFavoriteMessage = (isAdded) => {
    if (isAdded) {
        showSuccessMessage(
            '¡Agregado a favoritos!',
            'El plato se ha agregado a tus favoritos'
        );
    } else {
        showInfoMessage(
            'Eliminado de favoritos',
            'El plato se ha removido de tus favoritos'
        );
    }
};

