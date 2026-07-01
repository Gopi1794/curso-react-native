import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 32;
import { useNavigation } from '@react-navigation/native';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { PromoCard } from '../../components/PromoCard';
import AppHeader from '../../components/common/AppHeader';
import menuItemsData from '../../assets/data/menuItems.json';

const SORT_OPTIONS = [
    { id: 'discount', label: 'Mayor descuento', icon: 'pricetag-outline' },
    { id: 'price_asc', label: 'Menor precio',   icon: 'trending-down-outline' },
    { id: 'popular',  label: 'Populares',        icon: 'flame-outline' },
];

const parsePrice = (price) =>
    parseFloat(String(price).replace('$', '').replace(',', '.')) || 0;

const AllPromosScreen = ({ route }) => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { promos = [] } = route.params ?? {};
    const [activeSort, setActiveSort] = useState('discount');

    const sorted = useMemo(() => {
        const list = [...promos];
        if (activeSort === 'discount') {
            return list.sort((a, b) => {
                const localA = menuItemsData.find(m => m.id === a.id);
                const localB = menuItemsData.find(m => m.id === b.id);
                return (localB?.discountPercentage ?? 0) - (localA?.discountPercentage ?? 0);
            });
        }
        if (activeSort === 'price_asc') {
            return list.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
        }
        return list;
    }, [promos, activeSort]);

    const handlePromoPress = useCallback((promo) => {
        const localItem = menuItemsData.find(m => m.id === promo.id);
        navigation.navigate('PromoFoodDetail', {
            foodItem: {
                ...promo,
                originalPrice: localItem?.originalPrice ?? null,
                discountPercentage: localItem?.discountPercentage ?? null,
                includes: localItem?.includes ?? [],
            },
        });
    }, [navigation]);

    const renderItem = useCallback(({ item }) => (
        <View style={styles.cardWrapper}>
            <PromoCard
                promo={item}
                onPress={() => handlePromoPress(item)}
                isActive={true}
                width={CARD_WIDTH}
            />
        </View>
    ), [handlePromoPress]);

    const keyExtractor = useCallback((item) => item.id.toString(), []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <AppHeader
                title="Promociones del día"
                subtitle={`${promos.length} ofertas disponibles`}
                onBack={() => navigation.goBack()}
            />

            {/* Sort pills */}
            <View style={[styles.sortRow, { marginTop: insets.top + 72 }]}>
                {SORT_OPTIONS.map(opt => (
                    <TouchableOpacity
                        key={opt.id}
                        style={[styles.sortPill, activeSort === opt.id && styles.sortPillActive]}
                        onPress={() => setActiveSort(opt.id)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={opt.icon}
                            size={12}
                            color={activeSort === opt.id ? '#fff' : '#666'}
                        />
                        <Text style={[styles.sortText, activeSort === opt.id && styles.sortTextActive]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Lista */}
            <FlatList
                data={sorted}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={[styles.list, { paddingBottom: FLOATING_TAB_BAR_HEIGHT + 32 }]}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF9F7',
    },
    sortRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 8,
    },
    sortPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#efefef',
    },
    sortPillActive: {
        backgroundColor: '#FF6B00',
    },
    sortText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 11,
        color: '#666',
    },
    sortTextActive: {
        color: '#fff',
    },
    list: {
        paddingBottom: 32,
        paddingLeft: 6,
        gap: 16,
    },
    cardWrapper: {
        width: screenWidth,
        alignItems: 'center',
    },
});

export default AllPromosScreen;
