import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Header } from './common/Header';
import { SearchBar } from './common/SearchBar';

export const HeaderSection = ({
    onTicketPress,
    onCartPress,
    cartItemsCount,
    searchQuery,
    onSearchChange,
    onClearSearch // ✅ Nueva prop
}) => {
    return (
        <View style={styles.fixedHeader}>
            <Header
                onTicketPress={onTicketPress}
                onCartPress={onCartPress}
                cartItemsCount={cartItemsCount}
            />

            <SearchBar
                value={searchQuery}
                onChangeText={onSearchChange}
                onClearSearch={onClearSearch} // ✅ Pasar la nueva prop
                placeholder="Buscar platos, ingredientes..."
            />
        </View>
    );
};

const styles = StyleSheet.create({
    fixedHeader: {
        borderBottomRightRadius: 15,
        borderBottomLeftRadius: 15,
        backgroundColor: '#FF8000',
        position: 'static',
        height: 150,
        zIndex: 1000,
        paddingTop: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
    },
});