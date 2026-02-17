import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export const CategoryButton = memo(({
    label,
    isActive = false,
    onPress
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.categoryButton,
                isActive && styles.categoryButtonActive
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[
                styles.categoryText,
                isActive && styles.categoryTextActive
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    categoryButton: {
        backgroundColor: '#d9d9d9',
        borderRadius: 25,
        paddingHorizontal: 15,
        marginHorizontal: 5,
        minWidth: 99,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryButtonActive: {
        backgroundColor: '#ff8000',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    categoryText: {
        fontWeight: '500',
        fontSize: 10,
        color: '#988c8d',
    },
    categoryTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});