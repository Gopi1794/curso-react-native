import { createStackNavigator } from '@react-navigation/stack';
import SuperAdminDashboardScreen from '../screens/admin/SuperAdminDashboardScreen';
import SuperAdminTenantDetailScreen from '../screens/admin/SuperAdminTenantDetailScreen';

const Stack = createStackNavigator();

export default function SuperAdminStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} />
            <Stack.Screen name="SuperAdminTenantDetail" component={SuperAdminTenantDetailScreen} />
        </Stack.Navigator>
    );
}
