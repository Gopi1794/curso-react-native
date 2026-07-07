import React, { memo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { CategoryButton } from './CategoryButton';

export const CategoryFilter = memo(({
    categories,
    selectedCategory,
    onCategoryPress
}) => {
    const renderCategory = ({ item }) => (
        <CategoryButton
            label={item.label}
            icon={item.icon}
            isActive={selectedCategory === item.id}
            onPress={() => onCategoryPress(item.id)}
        />
    );

    return (
        <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
        />
    );
});

const styles = StyleSheet.create({
    categoriesContainer: {
        marginTop: 20,
        height: 50,
    },
    categoriesContent: {
        paddingHorizontal: 15,
    },
});