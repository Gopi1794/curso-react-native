// navigation/AppNavigator.js
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; // ← Importar BlurView

import DrawerHeader from '../components/DrawerHeader';
import BottomTabNavigator from './BottomTabNavigator';
import SettingsScreen from '../screens/SettingsScreen';

const Drawer = createDrawerNavigator();

export default function AppNavigator() {
    return (
        <Drawer.Navigator
            initialRouteName="MainApp"
            drawerContent={(props) => (
                <BlurView
                    intensity={80} // ← Intensidad del blur (0-100)
                    tint="dark"    // ← Tono: 'light', 'dark', 'default'
                    style={{ flex: 1 }}
                >
                    <DrawerHeader />
                    <DrawerContentScrollView {...props}>
                        <DrawerItemList {...props} />
                    </DrawerContentScrollView>
                </BlurView>
            )}
            screenOptions={{
                drawerHideStatusBarOnOpen: true,
                drawerType: "slide",
                drawerStyle: {
                    backgroundColor: 'transparent', // ← Cambiar a transparente
                    width: 280, // ← Un poco más ancho para el efecto blur
                },
                drawerActiveTintColor: '#f69627ff',
                drawerInactiveTintColor: '#fff', // ← Cambiar a blanco para mejor contraste
                drawerLabelStyle: {
                    fontSize: 16,
                    fontWeight: 'bold',
                },
                headerShown: false,
                overlayColor: 'transparent', // ← Quitar overlay por defecto
                sceneContainerStyle: {
                    backgroundColor: 'transparent',
                },
            }}
        >
            <Drawer.Screen
                name="MainApp"
                component={BottomTabNavigator}
                options={{
                    title: 'Inicio',
                    drawerIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    )
                }}
            />
            <Drawer.Screen
                name="SettingsScreen"
                component={SettingsScreen}
                options={{
                    title: 'Configuración',
                    drawerIcon: ({ color, size }) => (
                        <Ionicons name="settings" size={size} color={color} />
                    )
                }}
            />
        </Drawer.Navigator>
    );
}