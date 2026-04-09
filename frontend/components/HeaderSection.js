import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from './common/Header';
import { SearchBar } from './common/SearchBar';

export const HeaderSection = ({
    onTicketPress,
    onCartPress,
    searchQuery,
    onSearchChange,
    onClearSearch
}) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.fixedHeader, { paddingTop: insets.top + 8 }]}>
            <Header
                onTicketPress={onTicketPress}
                onCartPress={onCartPress}
            />

            <SearchBar
                value={searchQuery}
                onChangeText={onSearchChange}
                onClearSearch={onClearSearch}
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
        position: 'relative',
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});