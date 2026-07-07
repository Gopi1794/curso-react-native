import React, { memo, useRef } from 'react';
import { View, Text, Image, Animated, Pressable, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';

const SIZE_HEIGHTS = { sm: 55, msm: 75, md: 90, lg: 140 };
const CONTAINER_PADDING = 20;
const GAP = 12;

const CategoryTile = memo(({ item, isActive, dimmed, onPress, tileWidth }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const animateTo = (toValue) => {
        Animated.spring(scale, { toValue, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
    };

    return (
        <Pressable
            style={{ width: tileWidth }}
            onPressIn={() => animateTo(0.94)}
            onPressOut={() => animateTo(1)}
            onPress={() => onPress(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
        >
            <Animated.View style={{ transform: [{ scale }] }}>
                <View>
                    <Image
                        source={{ uri: item.image }}
                        resizeMode="contain"
                        style={[
                            styles.tile,
                            { height: SIZE_HEIGHTS[item.size] || SIZE_HEIGHTS.md, marginBottom: item.offsetY || 0 },
                        ]}
                    />
                    {dimmed && (
                        <BlurView
                            intensity={80}
                            tint="light"
                            style={[styles.tileBlurOverlay, { bottom: item.offsetY || 0 }]}
                            pointerEvents="none"
                        />
                    )}
                </View>
                <Text style={[styles.tileLabel, isActive && styles.tileLabelActive]} numberOfLines={2}>
                    {item.label}
                </Text>
            </Animated.View>
        </Pressable>
    );
});

export const CategoryExploreGrid = memo(({ categories, selectedCategory, onCategoryPress, columns = 4, renderExpanded }) => {
    const { width: screenWidth } = Dimensions.get('window');
    const tileWidth = (screenWidth - CONTAINER_PADDING * 2 - GAP * (columns - 1)) / columns;

    const rows = [];
    for (let i = 0; i < categories.length; i += columns) {
        rows.push(categories.slice(i, i + columns));
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Explora tus momentos</Text>
            {rows.map((row, rowIndex) => {
                const rowHasSelected = row.some(item => item.id === selectedCategory);
                return (
                    <View key={rowIndex}>
                        <View style={styles.row}>
                            {row.map(item => (
                                <CategoryTile
                                    key={item.id}
                                    item={item}
                                    isActive={selectedCategory === item.id}
                                    dimmed={!!selectedCategory && selectedCategory !== 'todos' && selectedCategory !== item.id}
                                    onPress={onCategoryPress}
                                    tileWidth={tileWidth}
                                />
                            ))}
                        </View>
                        {rowHasSelected && renderExpanded && renderExpanded()}
                    </View>
                );
            })}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: CONTAINER_PADDING,
        paddingVertical: 20,
    },
    title: {
        color: '#191919',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 12,
        gap: GAP,
    },
    tile: {
        width: '100%',
        borderRadius: 16,
    },
    tileBlurOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        borderRadius: 16,
        overflow: 'hidden',
    },
    tileLabel: {
        color: '#191919',
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 6,
    },
    tileLabelActive: {
        color: '#FF8700',
    },
});

export default CategoryExploreGrid;
