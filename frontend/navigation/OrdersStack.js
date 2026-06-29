import { createStackNavigator } from '@react-navigation/stack';
import OrdersScreen from '../screens/orders/OrdersScreen';
import OrderDetailScreen from '../screens/orders/OrderDetailScreen';
import OrderTrackingScreen from '../screens/orders/OrderTrackingScreen';
import FoodDetailScreen from '../screens/food/FoodDetailScreen';

const Stack = createStackNavigator();

export default function OrdersStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="OrdersMain"      component={OrdersScreen} />
            <Stack.Screen name="OrderDetail"     component={OrderDetailScreen} />
            <Stack.Screen name="OrderTracking"   component={OrderTrackingScreen} />
            <Stack.Screen name="FoodDetail"      component={FoodDetailScreen} />
        </Stack.Navigator>
    );
}
