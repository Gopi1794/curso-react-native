import React, { memo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { PromoCard } from './PromoCard';
import { PromoIndicator } from './PromoIndicator';
import Feather from '@expo/vector-icons/Feather';
import { Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export const PromoSection = memo(({
    promos,
    activePromoIndex,
    onPromoPress,
    onPromoIndicatorPress,
    onPromoScroll,
    promoFlatListRef
}) => {

    const renderPromo = ({ item, index }) => (
        <PromoCard
            promo={item}
            onPress={() => onPromoPress(item)}
            isActive={activePromoIndex === index + 1}
        />
    );

    return (
        <View style={styles.promoSection}>
            <View style={styles.promoHeader}>
                <View style={styles.promoTitleContainer}>
                    <Text style={styles.promoMainTitle}>PROMOCIONES DEL DÍA</Text>
                    <Text style={styles.promoSubtitle}>Ofertas exclusivas por tiempo limitado</Text>
                </View>

                <PromoIndicator
                    total={promos.length}
                    activeIndex={activePromoIndex}
                    onPress={onPromoIndicatorPress}
                />
            </View>

            {/* Slider de Promociones */}
            <FlatList
                ref={promoFlatListRef}
                data={promos}
                renderItem={renderPromo}
                keyExtractor={item => item.id.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.promoSlider}
                contentContainerStyle={styles.promoSliderContent}
                onScroll={onPromoScroll}
                scrollEventThrottle={32}
                decelerationRate="fast"
                snapToInterval={screenWidth - 60}
                snapToAlignment="center"
            />

            <View style={styles.timerContainer}>
                <Feather name="zap" size={16} color="#FF8000" />
                <Text style={styles.timerText}>
                    ¡No te lo pierdas! Ofertas terminan pronto
                </Text>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    promoSection: {
        height: 380,
        backgroundColor: '#ffffff2d',
        paddingTop: 20,
    },
    promoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    promoTitleContainer: {
        flex: 1,
    },
    promoMainTitle: {
        fontWeight: 'bold',
        color: '#FF8000',
        fontSize: 14,
        marginBottom: 4,
    },
    promoSubtitle: {
        color: '#666',
        fontSize: 12,
        fontWeight: '500',
    },
    promoSlider: {
        height: 220,
    },
    promoSliderContent: {
        paddingHorizontal: 20,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    timerText: {
        color: '#666',
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 6,
    },
});