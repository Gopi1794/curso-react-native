import { View, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useEffect } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

const TAB_BAR_WIDTH = 290;
const CIRCLE_SIZE = 54;

// Height exposed to useBottomTabBarHeight(): bar (74) + bottom offset (28) + safe area
export const FLOATING_TAB_BAR_HEIGHT = 74 + 28 + 16;

export default function FloatingTabBar({ state, navigation, tabConfig }) {
    const insets = useSafeAreaInsets();
    const tabCount = tabConfig.length;
    const itemWidth = TAB_BAR_WIDTH / tabCount;
    const circleOffset = (itemWidth - CIRCLE_SIZE) / 2;
    const totalHeight = 74 + 28 + insets.bottom;

    const slideX = useRef(
        new Animated.Value(state.index * itemWidth + circleOffset)
    ).current;

    const iconAnims = useRef(
        tabConfig.map((_, i) => new Animated.Value(i === state.index ? 1 : 0))
    ).current;

    useEffect(() => {
        Animated.spring(slideX, {
            toValue: state.index * itemWidth + circleOffset,
            friction: 7,
            tension: 80,
            useNativeDriver: true,
        }).start();

        iconAnims.forEach((anim, i) => {
            Animated.timing(anim, {
                toValue: i === state.index ? 1 : 0,
                duration: 160,
                useNativeDriver: false,
            }).start();
        });
    }, [state.index]);

    return (
        <BottomTabBarHeightContext.Provider value={totalHeight}>
        <View style={[styles.tabBar, { width: TAB_BAR_WIDTH, marginHorizontal: (screenWidth - TAB_BAR_WIDTH) / 2 }]}>
            <Animated.View
                style={[styles.activeCircle, { transform: [{ translateX: slideX }], top: (72 - CIRCLE_SIZE) / 2 }]}
            />
            {state.routes.map((route, index) => {
                const focused = state.index === index;
                const color = iconAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#888', '#fff'],
                });

                return (
                    <TouchableOpacity
                        key={route.key}
                        style={[styles.tabItem, { width: itemWidth }]}
                        activeOpacity={0.7}
                        accessibilityLabel={tabConfig[index].label}
                        onPress={() => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });
                            if (!focused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        }}
                    >
                        <Animated.Text style={{ color }}>
                            <Ionicons
                                name={focused ? tabConfig[index].active : tabConfig[index].inactive}
                                size={22}
                            />
                        </Animated.Text>
                    </TouchableOpacity>
                );
            })}
        </View>
        </BottomTabBarHeightContext.Provider>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 28,
        height: 74,
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        borderColor: '#ff8000',
        borderWidth: 2,
        borderRadius: 40,
        flexDirection: 'row',
        alignSelf: 'center',
        alignItems: 'center',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        overflow: 'hidden',
    },
    activeCircle: {
        position: 'absolute',
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        backgroundColor: '#ff8700',
        left: 0,
    },
    tabItem: {
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
});
