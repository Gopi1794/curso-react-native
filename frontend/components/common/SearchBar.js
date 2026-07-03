import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export const SearchBar = ({
    value,
    onChangeText,
    onClearSearch,
    onFocus,
    onBlur,
    onSubmitEditing,
    placeholder = "Buscar...",
    placeholderTextColor = "#999999"
}) => {
    return (
        <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
                <Feather name="search" size={20} color="#888888" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={placeholder}
                    placeholderTextColor={placeholderTextColor}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onSubmitEditing={onSubmitEditing}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                />
                {/* ✅ BOTÓN PARA LIMPIAR BÚSQUEDA */}
                {value.length > 0 && (
                    <TouchableOpacity onPress={onClearSearch} style={styles.clearButton}>
                        <Feather name="x" size={18} color="#888888" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    searchContainer: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    searchBar: {
        width: '100%',
        height: 46,
        backgroundColor: '#f5f5f5',
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    searchIcon: {
        marginRight: 8,
        color: '#888888',
    },
    searchInput: {
        flex: 1,
        fontWeight: '500',
        color: '#1a1a1a',
        fontSize: 15,
        padding: 0,
    },
    // ✅ NUEVO ESTILO PARA BOTÓN LIMPIAR
    clearButton: {
        padding: 4,
        marginLeft: 8,
    },
});