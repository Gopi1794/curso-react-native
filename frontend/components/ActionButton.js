import React, { memo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export const ActionButton = memo(({
    onPress,
    size = "medium", // "small" | "medium" | "large"
    variant = "default", // "default" | "suggestion"
    accessibilityLabel = "Agregar al carrito",
    style
}) => {
    const getButtonSize = () => {
        switch (size) {
            case 'small':
                return { width: 50, height: 50, borderWidth: 3 };
            case 'large':
                return { width: 70, height: 70, borderWidth: 6 };
            case 'medium':
            default:
                return { width: 60, height: 60, borderWidth: 4 };
        }
    };

    const getIconSize = () => {
        switch (size) {
            case 'small': return 20;
            case 'large': return 28;
            case 'medium':
            default: return 24;
        }
    };

    const buttonStyles = getButtonSize();

    return (
        <TouchableOpacity
            style={[
                styles.actionButton,
                variant === "suggestion" && styles.suggestionButton,
                buttonStyles,
                style
            ]}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityLabel={accessibilityLabel}
        >
            <Feather
                name="arrow-up-right"
                size={getIconSize()}
                color="white"
            />
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    actionButton: {
        backgroundColor: '#ff8700',
        borderColor: 'rgba(217, 217, 217, 1)',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        // Shadow común para ambos
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    suggestionButton: {
        // Estilos específicos para sugerencias si son diferentes
        shadowColor: '#ff8700',
        shadowRadius: 6,
    },
});