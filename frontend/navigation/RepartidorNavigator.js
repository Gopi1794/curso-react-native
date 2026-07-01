import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import RepartidorScreen from '../screens/repartidor/RepartidorScreen';
import RepartidorHistorialScreen from '../screens/repartidor/RepartidorHistorialScreen';
import RepartidorPerfilScreen from '../screens/repartidor/RepartidorPerfilScreen';

const Tab = createBottomTabNavigator();

export default function RepartidorNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#FF8700',
                tabBarInactiveTintColor: '#999',
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopColor: '#F0F0F0',
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                },
                tabBarLabelStyle: {
                    fontFamily: 'Poppins-SemiBold',
                    fontSize: 11,
                },
                tabBarIcon: ({ color, size }) => {
                    const icons = {
                        Repartos: 'bicycle-outline',
                        Historial: 'time-outline',
                        Perfil: 'person-outline',
                    };
                    return <Ionicons name={icons[route.name]} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Repartos" component={RepartidorScreen} />
            <Tab.Screen name="Historial" component={RepartidorHistorialScreen} />
            <Tab.Screen name="Perfil" component={RepartidorPerfilScreen} />
        </Tab.Navigator>
    );
}
