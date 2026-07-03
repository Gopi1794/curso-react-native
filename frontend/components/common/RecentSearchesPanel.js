import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RecentSearchesPanel({ searches, onSelect, onRemove, onClearAll }) {
    if (!searches || searches.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Búsquedas recientes</Text>
                <TouchableOpacity onPress={onClearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.clearAll}>Borrar todo</Text>
                </TouchableOpacity>
            </View>

            {searches.map((term) => (
                <TouchableOpacity
                    key={term}
                    style={styles.row}
                    onPress={() => onSelect(term)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="time-outline" size={16} color="#aaa" style={styles.rowIcon} />
                    <Text style={styles.rowText} numberOfLines={1}>{term}</Text>
                    <TouchableOpacity
                        onPress={() => onRemove(term)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="close" size={16} color="#ccc" />
                    </TouchableOpacity>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 4,
        borderRadius: 16,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        marginBottom: 4,
    },
    title: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        color: '#888',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    clearAll: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        color: '#FF8700',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 11,
    },
    rowIcon: {
        marginRight: 10,
    },
    rowText: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#1a1a1a',
    },
});
