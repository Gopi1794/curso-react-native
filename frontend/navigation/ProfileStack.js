// navigation/ProfileStack.js
import { createStackNavigator } from '@react-navigation/stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import AddressesScreen from '../screens/profile/AddressesScreen';
import PaymentMethodsScreen from '../screens/profile/PaymentMethodsScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import PrivacyScreen from '../screens/profile/PrivacyScreen';
import HelpScreen from '../screens/profile/HelpScreen';
import ChatSupportScreen from '../screens/profile/ChatSupportScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import AdminIngredientsScreen from '../screens/admin/AdminIngredientsScreen';
import AdminStockScreen from '../screens/admin/AdminStockScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminCuponesScreen from '../screens/admin/AdminCuponesScreen';
import AdminRuletaScreen from '../screens/admin/AdminRuletaScreen';
import AdminPlatosScreen from '../screens/admin/AdminPlatosScreen';
import AdminZonasEnvioScreen from '../screens/admin/AdminZonasEnvioScreen';
import AdminConsumoInsightsScreen from '../screens/admin/AdminConsumoInsightsScreen';
import AdminRecetasScreen from '../screens/admin/AdminRecetasScreen';
import AdminPedidosScreen from '../screens/admin/AdminPedidosScreen';
import AdminRepartidoresScreen from '../screens/admin/AdminRepartidoresScreen';
import NotificationsFeedScreen from '../screens/admin/NotificationsFeedScreen';
import AdminOnboardingScreen from '../screens/admin/AdminOnboardingScreen';
import AdminStatsScreen from '../screens/admin/AdminStatsScreen';
import AdminReviewsInsightsScreen from '../screens/admin/AdminReviewsInsightsScreen';
import FoodDetailScreen from '../screens/food/FoodDetailScreen';
import PromoFoodDetailScreen from '../screens/food/PromoFoodDetailScreen';

const Stack = createStackNavigator();

export default function ProfileStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ProfileMain" component={ProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Addresses" component={AddressesScreen} />
            <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="ChatSupport" component={ChatSupportScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminIngredients" component={AdminIngredientsScreen} />
            <Stack.Screen name="AdminStock" component={AdminStockScreen} />
            <Stack.Screen name="AdminCupones" component={AdminCuponesScreen} />
            <Stack.Screen name="AdminRuleta" component={AdminRuletaScreen} />
            <Stack.Screen name="AdminPlatos" component={AdminPlatosScreen} />
            <Stack.Screen name="AdminZonasEnvio" component={AdminZonasEnvioScreen} />
            <Stack.Screen name="AdminConsumoInsights" component={AdminConsumoInsightsScreen} />
            <Stack.Screen name="AdminRecetas" component={AdminRecetasScreen} />
            <Stack.Screen name="AdminPedidos" component={AdminPedidosScreen} />
            <Stack.Screen name="AdminRepartidores" component={AdminRepartidoresScreen} />
            <Stack.Screen name="NotificationsFeed" component={NotificationsFeedScreen} />
            <Stack.Screen name="AdminOnboarding" component={AdminOnboardingScreen} />
            <Stack.Screen name="AdminStats" component={AdminStatsScreen} />
            <Stack.Screen name="AdminReviewsInsights" component={AdminReviewsInsightsScreen} />
            <Stack.Screen name="AdminFoodDetail" component={FoodDetailScreen} />
            <Stack.Screen name="AdminPromoFoodDetail" component={PromoFoodDetailScreen} />
        </Stack.Navigator>
    );
}
