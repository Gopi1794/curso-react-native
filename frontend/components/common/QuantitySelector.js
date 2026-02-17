// components/common/ActionBar.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export const ActionBar = ({
    quantity,
    onIncrease,
    onDecrease,
    onAddToCart,
    price,
    buttonText = "Añadir",
    min = 1,
    max,
    style,
    showQuantity = true
}) => {
    return (
        <View style={[styles.actionBar, style]}>
            {showQuantity && (
                <View style={styles.quantitySection}>
                    <Text style={styles.quantityLabel}>Cantidad:</Text>
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
                onPress={onAddToCart}
            >
                <Feather name="shopping-cart" size={20} color="white" />
                <View style={styles.buttonTextContainer}>
                    <Text style={styles.addToCartText}>
                        {buttonText}
                    </Text>
                    {price && (
                        <Text style={styles.priceText}>
                            {price}
                        </Text>
                    )}
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
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
        flex: 1,
    },
    quantityLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 12,
        fontFamily: 'Poppins-Regular',
    },
    quantitySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 4,
    },
    quantityButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 18,
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
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF8000',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 12,
    },
    buttonTextContainer: {
        alignItems: 'center',
    },
    addToCartText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
    priceText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
    },
});