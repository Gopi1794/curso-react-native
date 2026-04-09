import React, { useState, useRef, useCallback, useMemo } from "react";
import { View, Text, Image, StyleSheet, FlatList, Dimensions, TouchableOpacity, Animated } from "react-native";
import { ActionButton } from './ActionButton';

const { width: screenWidth } = Dimensions.get('window');

import { imageMap } from '../assets/utils/imageMap';

const toImageSource = (val) => {
    if (typeof val === 'string') return { uri: val };
    if (val && val.uri) return { uri: val.uri };
    return null;
};

// Componente memoizado para cada sugerencia
const SugerenciaItem = React.memo(({ sugerencia, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.88,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 40,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={[styles.sugerenciaItemContainer, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                style={styles.sugerenciaItemInner}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                accessibilityLabel={`Ver ${sugerencia.name}`}
                accessibilityRole="button"
            >
                <Image
                    style={styles.sugerenciaImage}
                    source={sugerencia.image}
                    resizeMode="cover"
                />

                <View style={styles.sugerenciaCard}>
                    <Text style={styles.sugerenciaText} numberOfLines={2}>
                        {sugerencia.name}
                    </Text>
                    <View style={styles.sugerenciaButtonDecor}>
                        <ActionButton
                            onPress={onPress}
                            size="medium"
                            variant="suggestion"
                            accessibilityLabel=""
                            style={styles.sugerenciaButton}
                        />
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

export const ListSugerencias = ({ navigation, menuItems = [] }) => {
    const flatListRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    // 3 platos fijos que tienen carrusel de imágenes (sufijos _0, _1, etc.)
    const SUGERENCIA_KEYS = ['imgBurger5', 'imgEmplatado4', 'imgHelado9'];

    const sugerenciasData = useMemo(() => {
        return SUGERENCIA_KEYS
            .map(key => {
                const item = menuItems.find(m => {
                    const mKey = Array.isArray(m.imageKey) ? m.imageKey[0] : m.imageKey;
                    return mKey === key;
                });
                if (!item) return null;
                return {
                    ...item,
                    image: toImageSource(imageMap[key]),
                };
            })
            .filter(Boolean);
    }, [menuItems]);

    const handlePress = useCallback((foodItem) => {
        if (navigation && foodItem.id) {
            navigation.navigate('FoodDetail', { foodItem });
        }
    }, [navigation]);

    const handleScroll = useCallback((event) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / (screenWidth - 40));
        setActiveIndex(index);
    }, []);

    const renderSugerencia = useCallback(({ item }) => (
        <SugerenciaItem
            sugerencia={item}
            onPress={() => handlePress(item)}
        />
    ), [handlePress]);

    if (sugerenciasData.length === 0) return null;

    return (
        <View style={styles.sugerenciasSection}>
            <View style={styles.sugerenciasHeader}>
                <Text style={styles.sugerenciasTitle}>SUGERENCIAS</Text>
                <View style={styles.sugerenciasIndicators}>
                    {sugerenciasData.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                activeIndex === index && styles.indicatorActive
                            ]}
                        />
                    ))}
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={sugerenciasData}
                renderItem={renderSugerencia}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={screenWidth - 40}
                snapToAlignment="start"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    sugerenciasSection: {
        position: 'relative',
        backgroundColor: 'transparent',
        height: 180,
    },
    sugerenciasHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
        marginBottom: 15,
    },
    sugerenciasTitle: {
        fontFamily: 'Poppins-Bold',
        fontWeight: 'bold',
        color: '#ff8000',
        fontSize: 16,
    },
    sugerenciasIndicators: {
        flexDirection: 'row',
        gap: 10,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 50,
        backgroundColor: '#E0E0E0',
    },
    indicatorActive: {
        backgroundColor: '#ff8700',
        borderColor: '#ffff',
        borderWidth: 2,
        width: 16,
    },
    scrollView: {
        height: 140,
    },
    scrollViewContent: {
        paddingHorizontal: 10,
    },
    sugerenciaItemContainer: {
        width: screenWidth - 50,
        height: 120,
        marginRight: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sugerenciaItemInner: {
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    sugerenciaImage: {
        position: 'absolute',
        width: 120,
        height: 120,
        zIndex: 1,
    },
    sugerenciaCard: {
        flex: 1,
        height: 80,
        backgroundColor: 'rgba(217, 217, 217, 1)',
        borderRadius: 20,
        marginLeft: 80,
        marginRight: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 50,
        paddingRight: 8,
        shadowColor: '#FF8000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
    },
    sugerenciaText: {
        flex: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.25)',
        fontFamily: 'Poppins-Bold',
        fontWeight: 'bold',
        color: 'gray',
        fontSize: 13,
        lineHeight: 18,
    },
    sugerenciaButtonDecor: {
        marginLeft: 8,
    },
    sugerenciaButton: {},
});

export default ListSugerencias;