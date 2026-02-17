// navigation/OrdersStack.js
import { createStackNavigator } from '@react-navigation/stack';
import OrdersScreen from '../screens/OrdersScreen';

const Stack = createStackNavigator();

export default function OrdersStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="OrdersMain" component={OrdersScreen} />
        </Stack.Navigator>
    );
}