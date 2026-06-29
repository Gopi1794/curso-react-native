import React, { memo } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const CategoryButton = memo(({
    label,
    icon,
    isActive = false,
    onPress
}) => {
    const iconColor = isActive ? '#fff' : '#988c8d';

    return (
        <TouchableOpacity
            style={[
                styles.categoryButton,
                isActive && styles.categoryButtonActive
            ]}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}
        >
            <View style={styles.inner}>
                {icon && (
                    <Ionicons name={icon} size={12} color={iconColor} style={styles.icon} />
                )}
                <Text style={[
                    styles.categoryText,
                    isActive && styles.categoryTextActive
                ]}>
                    {label}
                </Text>
            </View>
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
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    icon: {
        marginTop: 1,
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