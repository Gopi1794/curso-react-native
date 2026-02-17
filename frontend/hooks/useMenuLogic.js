import { useState, useMemo, useCallback } from 'react';

export function useMenuLogic(initialMenuItems = []) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('TODOS');

    const searchItems = useCallback((query, items) => {
        if (!query || !query.trim()) return items;
        const term = query.toLowerCase().trim();
        return items.filter(item => {
            if (item.name?.toLowerCase().includes(term)) return true;
            if (item.descriptionText?.toLowerCase().includes(term)) return true;
            if (Array.isArray(item.ingredientText) && item.ingredientText.some(ing => ing.toLowerCase().includes(term))) return true;
            if (item.category?.toLowerCase().includes(term)) return true;
            return false;
        });
    }, []);

    const filteredMenuItems = useMemo(() => {
        let filtered = initialMenuItems || [];
        if (selectedCategory && selectedCategory !== 'TODOS') {
            filtered = filtered.filter(
                i => i.category?.toLowerCase() === selectedCategory.toLowerCase()
            );
        }
        return searchItems(searchQuery, filtered);
    }, [initialMenuItems, searchQuery, selectedCategory, searchItems]);

    return {
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        filteredMenuItems
    };
}

export default useMenuLogic;
