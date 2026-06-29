// navigation/HomeStack.js
import { createStackNavigator } from '@react-navigation/stack';
import ScreenHome from '../screens/home/ScreenHome';
import FoodDetailScreen from '../screens/food/FoodDetailScreen';
import PromoFoodDetailScreen from '../screens/food/PromoFoodDetailScreen';
import TicketScreen from '../screens/tickets/TicketScreen';
import TicketDetailScreen from '../screens/tickets/TicketDetailScreen';
import CartScreen from '../screens/cart/CartScreen';
import AllPromosScreen from '../screens/home/AllPromosScreen';
import OrderConfirmationScreen from '../screens/orders/OrderConfirmationScreen';

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
            <Stack.Screen name="AllPromos" component={AllPromosScreen} />
            <Stack.Screen
                name="OrderConfirmation"
                component={OrderConfirmationScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
}