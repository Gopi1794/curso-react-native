// navigation/BottomTabNavigator.js
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import HomeStack from './HomeStack';
import FavoritesStack from './FavoritesStack';
import OrdersStack from './OrdersStack';
import ProfileStack from './ProfileStack';

const Tab = createBottomTabNavigator();



export default function BottomTabNavigator() {

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    backgroundColor: '#ff8800',
                    height: 80,
                    paddingTop: 12,
                    borderTopWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarBackground: () => (
                    <BlurView
                        intensity={0}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                    />
                ),
                tabBarShowLabel: false,
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeStack}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={focused ? styles.iconContainerActive : styles.iconContainer}>
                            <Ionicons
                                name={focused ? "home" : "home-outline"}
                                size={focused ? 28 : 26}
                                color={focused ? "#ffffffff" : "#ffffff"}
                            />
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name="FavoritesTab"
                component={FavoritesStack}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={focused ? styles.iconContainerActive : styles.iconContainer}>
                            <Ionicons
                                name={focused ? "heart" : "heart-outline"}
                                size={focused ? 28 : 26}
                                color={focused ? "#ffffffff" : "#ffffff"}
                            />
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name="OrdersTab"
                component={OrdersStack}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={focused ? styles.iconContainerActive : styles.iconContainer}>
                            <Ionicons
                                name={focused ? "receipt" : "receipt-outline"}
                                size={focused ? 28 : 26}
                                color={focused ? "#ffffffff" : "#ffffff"}
                            />
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileStack}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={focused ? styles.iconContainerActive : styles.iconContainer}>
                            <Ionicons
                                name={focused ? "person" : "person-outline"}
                                size={focused ? 28 : 26}
                                color={focused ? "#ffffffff" : "#ffffff"}
                            />
                        </View>
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    iconContainer: {
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    iconContainerActive: {
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        transform: [{ scale: 1.1 }],
    },
});