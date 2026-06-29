// components/common/ActionBar.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';

export const ActionBar = ({
    quantity,
    onIncrease,
    onDecrease,
    onAddToCart,
    price, // Precio unitario (ej: "$12.99")
    buttonText = "Añadir",
    min = 1,
    max,
    style,
    showQuantity = true
}) => {
    // Función para calcular el precio total
    const calculateTotalPrice = () => {
        const priceValue = parseFloat(price.replace('$', '').replace(',', ''));
        return (priceValue * quantity).toFixed(2);
    };

    const formatPrice = (value) => {
        return `$${value}`;
    };

    const totalPrice = calculateTotalPrice();

    // Función que maneja el agregar al carrito con la cantidad correcta
    const handleAddToCartPress = () => {
        onAddToCart(quantity); // Pasar la cantidad actual al handler
    };

    return (
        <View style={[styles.actionBar, style]}>
            {showQuantity && (
                <View style={styles.quantitySection}>
                    <View style={styles.quantitySelector}>
                        <TouchableOpacity
                            style={[
                                styles.quantityButton,
                                quantity === min && styles.quantityButtonDisabled
                            ]}
                            onPress={onDecrease}
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
                            style={[
                                styles.quantityButton,
                                max && quantity >= max && styles.quantityButtonDisabled
                            ]}
                            onPress={onIncrease}
                            disabled={max && quantity >= max}
                        >
                            <Feather
                                name="plus"
                                size={20}
                                color={max && quantity >= max ? "#ccc" : "#333"}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <TouchableOpacity
                style={styles.addToCartButton}
                onPress={handleAddToCartPress} // Usar la nueva función
            >
                <Ionicons name="bag-handle-outline" size={22} color="white" />
                <View style={styles.buttonTextContainer}>
                    <Text style={styles.addToCartText}>
                        {buttonText}
                    </Text>
                    <Text style={styles.priceText}>
                        {formatPrice(totalPrice)}
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
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
        backgroundColor: '#d3d2d2',
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
        justifyContent: 'center',
        backgroundColor: '#FF8000',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 18,
        gap: 12,
    },
    buttonTextContainer: {
        alignItems: 'center',
    },
    addToCartText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 10,
        fontFamily: 'Poppins-Bold',
        marginBottom: 2,
    },
    priceText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
    },
});