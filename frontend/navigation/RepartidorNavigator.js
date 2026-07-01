import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RepartidorScreen from '../screens/repartidor/RepartidorScreen';
import RepartidorHistorialScreen from '../screens/repartidor/RepartidorHistorialScreen';
import RepartidorPerfilScreen from '../screens/repartidor/RepartidorPerfilScreen';

function MapaPlaceholder() {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.placeholder, { paddingTop: insets.top + 20 }]}>
            <Ionicons name="map-outline" size={52} color="#ddd" />
            <Text style={styles.placeholderText}>Mapa próximamente</Text>
        </View>
    );
}

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
    'Mis repartos': 'bicycle-outline',
    Historial: 'time-outline',
    Mapa: 'map-outline',
    Perfil: 'person-outline',
};

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
                    height: 62,
                    paddingBottom: 10,
                    paddingTop: 6,
                },
                tabBarLabelStyle: {
                    fontFamily: 'Poppins-SemiBold',
                    fontSize: 11,
                },
                tabBarIcon: ({ color, size }) => (
                    <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
                ),
            })}
        >
            <Tab.Screen name="Mis repartos" component={RepartidorScreen} />
            <Tab.Screen name="Historial" component={RepartidorHistorialScreen} />
            <Tab.Screen name="Mapa" component={MapaPlaceholder} />
            <Tab.Screen name="Perfil" component={RepartidorPerfilScreen} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    placeholder: { flex: 1, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
    placeholderText: { fontFamily: 'Poppins-SemiBold', fontSize: 16, color: '#ccc', marginTop: 16 },
});
