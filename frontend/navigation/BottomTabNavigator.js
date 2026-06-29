import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useEffect } from 'react';

const { width: screenWidth } = Dimensions.get('window');

import HomeStack from './HomeStack';
import FavoritesStack from './FavoritesStack';
import OrdersStack from './OrdersStack';
import ProfileStack from './ProfileStack';

const Tab = createBottomTabNavigator();

const TAB_BAR_WIDTH = 290;
const TAB_COUNT = 4;
const ITEM_WIDTH = TAB_BAR_WIDTH / TAB_COUNT;
const CIRCLE_SIZE = 54;
const CIRCLE_OFFSET = (ITEM_WIDTH - CIRCLE_SIZE) / 2;

const TAB_CONFIG = [
    { active: 'home', inactive: 'home-outline', label: 'Inicio' },
    { active: 'heart', inactive: 'heart-outline', label: 'Favoritos' },
    { active: 'receipt', inactive: 'receipt-outline', label: 'Pedidos' },
    { active: 'person', inactive: 'person-outline', label: 'Perfil' },
];

const CustomTabBar = ({ state, navigation }) => {
    const slideX = useRef(
        new Animated.Value(state.index * ITEM_WIDTH + CIRCLE_OFFSET)
    ).current;

    const iconAnims = useRef(
        TAB_CONFIG.map((_, i) => new Animated.Value(i === state.index ? 1 : 0))
    ).current;

    useEffect(() => {
        Animated.spring(slideX, {
            toValue: state.index * ITEM_WIDTH + CIRCLE_OFFSET,
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
        <View style={styles.tabBar}>
            <Animated.View
                style={[styles.activeCircle, { transform: [{ translateX: slideX }] }]}
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
                        style={styles.tabItem}
                        activeOpacity={0.7}
                        accessibilityLabel={TAB_CONFIG[index].label}
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
                                name={focused ? TAB_CONFIG[index].active : TAB_CONFIG[index].inactive}
                                size={22}
                            />
                        </Animated.Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default function BottomTabNavigator() {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{ headerShown: false }}
        >
            <Tab.Screen name="HomeTab" component={HomeStack} options={{ tabBarAccessibilityLabel: 'Inicio' }} />
            <Tab.Screen name="FavoritesTab" component={FavoritesStack} options={{ tabBarAccessibilityLabel: 'Favoritos' }} />
            <Tab.Screen name="OrdersTab" component={OrdersStack} options={{ tabBarAccessibilityLabel: 'Pedidos' }} />
            <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ tabBarAccessibilityLabel: 'Perfil' }} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 28,
        width: TAB_BAR_WIDTH,
        height: 74,
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        borderColor: '#ff8000',
        borderWidth: 2,
        borderRadius: 40,
        flexDirection: 'row',
        alignSelf: 'center',
        alignItems: 'center',
        marginHorizontal: (screenWidth - TAB_BAR_WIDTH) / 2,
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
        top: (72 - CIRCLE_SIZE) / 2,
        left: 0,
    },
    tabItem: {
        width: ITEM_WIDTH,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
});
