import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PromoCard } from './PromoCard';
import { PromoIndicator } from './PromoIndicator';

const { width: screenWidth } = Dimensions.get('window');

export const PromoSection = memo(({
    promos,
    activePromoIndex,
    onPromoPress,
    onPromoIndicatorPress,
    onPromoScroll,
    promoFlatListRef,
    onVerTodas,
}) => {
    const ITEM_WIDTH = screenWidth - 72 + 16;

    const renderPromo = useCallback(({ item, index }) => (
        <PromoCard
            promo={item}
            onPress={() => onPromoPress(item)}
            isActive={activePromoIndex === index + 1}
        />
    ), [activePromoIndex, onPromoPress]);

    const getItemLayout = useCallback((_, index) => ({
        length: ITEM_WIDTH,
        offset: ITEM_WIDTH * index,
        index,
    }), [ITEM_WIDTH]);

    return (
        <View style={styles.section}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Promociones del día</Text>
                    <Text style={styles.subtitle}>Ofertas exclusivas por tiempo limitado</Text>
                </View>
                <TouchableOpacity
                    style={styles.verTodas}
                    onPress={onVerTodas}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Ver todas las promociones"
                >
                    <Text style={styles.verTodasText}>Ver todas</Text>
                    <Ionicons name="chevron-forward" size={14} color="#FF6B00" />
                </TouchableOpacity>
            </View>

            {/* Slider */}
            <FlatList
                ref={promoFlatListRef}
                data={promos}
                renderItem={renderPromo}
                keyExtractor={item => item.id.toString()}
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                style={styles.slider}
                contentContainerStyle={styles.sliderContent}
                onScroll={onPromoScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={ITEM_WIDTH}
                snapToAlignment="start"
                getItemLayout={getItemLayout}
            />

            {/* Dots centrados debajo del slider */}
            <View style={styles.dotsRow}>
                <PromoIndicator
                    total={promos.length}
                    activeIndex={activePromoIndex}
                    onPress={onPromoIndicatorPress}
                />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    section: {
        paddingBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 18,
    },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 17,
        color: '#111',
        marginBottom: 2,
    },
    subtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#888',
    },
    verTodas: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    verTodasText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#FF6B00',
    },
    slider: {
        overflow: 'visible',
    },
    sliderContent: {
        paddingHorizontal: 20,
        paddingBottom: 8,
        paddingTop: 20,
        overflow: 'visible',
    },
    dotsRow: {
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
});
