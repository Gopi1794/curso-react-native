// navigation/OrdersStack.js
import { createStackNavigator } from '@react-navigation/stack';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import FoodDetailScreen from '../screens/FoodDetailScreen';

const Stack = createStackNavigator();

export default function OrdersStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="OrdersMain"   component={OrdersScreen} />
            <Stack.Screen name="OrderDetail"  component={OrderDetailScreen} />
            <Stack.Screen name="FoodDetail"   component={FoodDetailScreen} />
        </Stack.Navigator>
    );
}