// components/common/PromoActionBar.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export const PromoActionBar = ({
    quantity,
    onIncrease,
    onDecrease,
    onAddToCart,
    price,
    originalPrice,
    buttonText = "Agregar Promo",
    min = 1,
    style
}) => {
    // Función para calcular el precio total
    const calculateTotalPrice = () => {
        try {
            const priceValue = parseFloat(price.replace('$', '').replace(',', ''));
            return (priceValue * quantity).toFixed(2);
        } catch (error) {
            console.error('Error calculando precio:', error);
            return '0.00';
        }
    };

    const formatPrice = (value) => {
        return `$${value}`;
    };

    const totalPrice = calculateTotalPrice();

    // ✅ CORREGIDO: Manejar correctamente el evento
    const handleAddToCartPress = () => {
        // Llamar a onAddToCart sin pasar el evento
        if (onAddToCart) {
            onAddToCart(quantity);
        }
    };

    const handleIncreasePress = () => {
        if (onIncrease) {
            onIncrease();
        }
    };

    const handleDecreasePress = () => {
        if (onDecrease) {
            onDecrease();
        }
    };

    return (
        <View style={[styles.actionBar, style]}>
            <View style={styles.quantitySection}>
                <View style={styles.quantitySelector}>
                    <TouchableOpacity
                        style={[
                            styles.quantityButton,
                            quantity === min && styles.quantityButtonDisabled
                        ]}
                        onPress={handleDecreasePress} // ✅ Usar la función corregida
                        disabled={quantity === min}
                    >
                        <Feather
                            name="minus"
                            size={20}
                            color={quantity === min ? "#ccc" : "#333"}
                        />
                    </TouchableOpacity>

                    <Text style={styles.quantityText}>{quantity}</Text>

                    <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={handleIncreasePress} // ✅ Usar la función corregida
                    >
                        <Feather name="plus" size={20} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity
                style={styles.addToCartButton}
                onPress={handleAddToCartPress} // ✅ Usar la función corregida
            >
                <Feather name="shopping-cart" size={20} color="white" />
                <View style={styles.buttonTextContainer}>
                    <Text style={styles.addToCartText}>
                        {buttonText}
                    </Text>
                    <View style={styles.priceContainer}>
                        {originalPrice && quantity === 1 && (
                            <Text style={styles.originalPrice}>{originalPrice}</Text>
                        )}
                        <Text style={styles.priceText}>
                            {formatPrice(totalPrice)}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    // ... tus estilos existentes ...
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    quantitySection: {
        marginRight: 16,
    },
    quantitySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 4,
    },
    quantityButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'white',
    },
    quantityButtonDisabled: {
        backgroundColor: '#f5f5f5',
    },
    quantityText: {
        fontSize: 16,
        fontWeight: '600',
        marginHorizontal: 16,
        minWidth: 20,
        textAlign: 'center',
        color: '#333',
    },
    addToCartButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF6B35',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 12,
    },
    buttonTextContainer: {
        flex: 1,
    },
    addToCartText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        marginBottom: 4,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    originalPrice: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        textDecorationLine: 'line-through',
        fontFamily: 'Poppins-Regular',
    },
    priceText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Poppins-SemiBold',
    },
});