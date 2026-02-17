// navigation/HomeStack.js
import { createStackNavigator } from '@react-navigation/stack';
import ScreenHome from '../screens/ScreenHome';
import FoodDetailScreen from '../screens/FoodDetailScreen';
import PromoFoodDetailScreen from '../screens/PromoFoodDetailScreen';
import TicketScreen from '../screens/TicketScreen';
import TicketDetailScreen from '../screens/TicketDetailScreen';
import CartScreen from '../screens/CartScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';

const Stack = createStackNavigator();

export default function HomeStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeScreen" component={ScreenHome} />
            <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
            <Stack.Screen name="PromoFoodDetail" component={PromoFoodDetailScreen} />
            <Stack.Screen name="Tickets" component={TicketScreen} />
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen
                name="OrderConfirmation"
                component={OrderConfirmationScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
}