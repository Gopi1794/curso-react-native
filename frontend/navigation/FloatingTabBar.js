import { View, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

const TAB_BAR_WIDTH = 290;
const CIRCLE_SIZE = 54;

// Espacio total que ocupa el navbar flotante: alto (74) + offset inferior (28) + margen (16)
export const FLOATING_TAB_BAR_HEIGHT = 162;

export default function FloatingTabBar({ state, navigation, tabConfig }) {
    const { bottom: bottomInset } = useSafeAreaInsets();
    const tabCount = tabConfig.length;
    const itemWidth = TAB_BAR_WIDTH / tabCount;
    const circleOffset = (itemWidth - CIRCLE_SIZE) / 2;

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

    if (state.routes[state.index].params?.hideTabBar) {
        return null;
    }

    return (
        <View style={[styles.tabBar, { width: TAB_BAR_WIDTH, marginHorizontal: (screenWidth - TAB_BAR_WIDTH) / 2, bottom: 16 + bottomInset }]}>
            <BlurView
                intensity={45}
                tint="light"
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
            />
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
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        height: 74,
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
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
