import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeStack from './HomeStack';
import FavoritesStack from './FavoritesStack';
import OrdersStack from './OrdersStack';
import ProfileStack from './ProfileStack';

const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused }) => (
    <View style={focused ? styles.iconActive : styles.iconInactive}>
        <Ionicons name={name} size={22} color={focused ? '#fff' : '#555'} />
    </View>
);

export default function BottomTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: styles.tabBar,
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeStack}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="FavoritesTab"
                component={FavoritesStack}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? 'storefront' : 'storefront-outline'} focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="OrdersTab"
                component={OrdersStack}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? 'share-social' : 'share-social-outline'} focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileStack}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 28,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 40,
        height: 74,
        borderTopWidth: 0,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        paddingBottom: 0,
        paddingHorizontal: 8,
    },
    iconActive: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#ff8700',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconInactive: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
