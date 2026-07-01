import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FloatingTabBar from './FloatingTabBar';
import RepartidorScreen from '../screens/repartidor/RepartidorScreen';
import RepartidorHistorialScreen from '../screens/repartidor/RepartidorHistorialScreen';
import RepartidorPerfilScreen from '../screens/repartidor/RepartidorPerfilScreen';
import RepartidorMapaScreen from '../screens/repartidor/RepartidorMapaScreen';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
    { active: 'bicycle',  inactive: 'bicycle-outline', label: 'Mis repartos' },
    { active: 'time',     inactive: 'time-outline',    label: 'Historial' },
    { active: 'map',      inactive: 'map-outline',     label: 'Mapa' },
    { active: 'person',   inactive: 'person-outline',  label: 'Perfil' },
];

export default function RepartidorNavigator() {
    return (
        <Tab.Navigator
            tabBar={(props) => <FloatingTabBar {...props} tabConfig={TAB_CONFIG} />}
            screenOptions={{ headerShown: false }}
        >
            <Tab.Screen name="Mis repartos" component={RepartidorScreen} />
            <Tab.Screen name="Historial"    component={RepartidorHistorialScreen} />
            <Tab.Screen name="Mapa"         component={RepartidorMapaScreen} />
            <Tab.Screen name="Perfil"       component={RepartidorPerfilScreen} />
        </Tab.Navigator>
    );
}
