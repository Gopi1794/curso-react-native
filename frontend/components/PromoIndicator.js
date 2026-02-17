import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';

export const PromoIndicator = memo(({ total, activeIndex, onPress }) => {
    return (
        <View style={styles.promoIndicatorsContainer}>
            {Array.from({ length: total }).map((_, index) => (
                <TouchableOpacity
                    key={index}
                    onPress={() => onPress(index + 1)}
                    style={styles.indicatorWrapper}
                >
                    <View
                        style={[
                            styles.promoIndicator,
                            activeIndex === index + 1
                                ? styles.promoIndicatorActive
                                : styles.promoIndicatorInactive
                        ]}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
});

const styles = StyleSheet.create({
    promoIndicatorsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    indicatorWrapper: {
        padding: 4,
    },
    promoIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        transition: 'all 0.3s ease',
    },
    promoIndicatorActive: {
        backgroundColor: '#FF8000',
        width: 20,
    },
    promoIndicatorInactive: {
        backgroundColor: '#E0E0E0',
    },
});