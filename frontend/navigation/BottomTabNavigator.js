import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FloatingTabBar from './FloatingTabBar';

import HomeStack from './HomeStack';
import FavoritesStack from './FavoritesStack';
import OrdersStack from './OrdersStack';
import ProfileStack from './ProfileStack';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
    { active: 'home',    inactive: 'home-outline',    label: 'Inicio' },
    { active: 'heart',   inactive: 'heart-outline',   label: 'Favoritos' },
    { active: 'receipt', inactive: 'receipt-outline', label: 'Pedidos' },
    { active: 'person',  inactive: 'person-outline',  label: 'Perfil' },
];

export default function BottomTabNavigator() {
    return (
        <Tab.Navigator
            tabBar={(props) => <FloatingTabBar {...props} tabConfig={TAB_CONFIG} />}
            screenOptions={{ headerShown: false }}
        >
            <Tab.Screen name="HomeTab"      component={HomeStack}      options={{ tabBarAccessibilityLabel: 'Inicio' }} />
            <Tab.Screen name="FavoritesTab" component={FavoritesStack} options={{ tabBarAccessibilityLabel: 'Favoritos' }} />
            <Tab.Screen name="OrdersTab"    component={OrdersStack}    options={{ tabBarAccessibilityLabel: 'Pedidos' }} />
            <Tab.Screen name="ProfileTab"   component={ProfileStack}   options={{ tabBarAccessibilityLabel: 'Perfil' }} />
        </Tab.Navigator>
    );
}
