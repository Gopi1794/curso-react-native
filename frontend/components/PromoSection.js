import React, { memo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
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
}) => {
    const renderPromo = ({ item, index }) => (
        <PromoCard
            promo={item}
            onPress={() => onPromoPress(item)}
            isActive={activePromoIndex === index + 1}
        />
    );

    return (
        <View style={styles.section}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Promociones del día</Text>
                    <Text style={styles.subtitle}>Ofertas exclusivas por tiempo limitado</Text>
                </View>
                <PromoIndicator
                    total={promos.length}
                    activeIndex={activePromoIndex}
                    onPress={onPromoIndicatorPress}
                />
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
                snapToInterval={screenWidth - 72 + 16}
                snapToAlignment="start"
            />
        </View>
    );
});

const styles = StyleSheet.create({
    section: {
        paddingTop: 24,
        paddingBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
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
    slider: {
        overflow: 'visible',
    },
    sliderContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 20,
        overflow: 'visible',
    },
});
