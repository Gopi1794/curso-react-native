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
                        <TabIcon name={focused ? 'heart' : 'heart-outline'} focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="OrdersTab"
                component={OrdersStack}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? 'receipt' : 'receipt-outline'} focused={focused} />
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
        marginHorizontal: 80,
        paddingLeft: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        borderColor: '#ff8000',
        borderWidth: 2,
        borderRadius: 40,
        height: 74,
        width: 300,
        borderTopWidth: 0,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,

    },
    iconActive: {
        position: 'absolute',
        width: 64,
        height: 64,
        top: 0,
        borderRadius: 50,
        backgroundColor: '#ff8700',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconInactive: {
        position: 'absolute',
        color: '#ff8700',
        width: 44,
        height: 44,
        top: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
