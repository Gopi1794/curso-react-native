// navigation/FavoritesStack.js
import { createStackNavigator } from '@react-navigation/stack';
import FavoritesScreen from '../screens/favorites/FavoritesScreen';
import FoodDetailScreen from '../screens/food/FoodDetailScreen';
import TicketScreen from '../screens/tickets/TicketScreen';
import TicketDetailScreen from '../screens/tickets/TicketDetailScreen';

const Stack = createStackNavigator();

export default function FavoritesStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="FavoritesMain" component={FavoritesScreen} />
            <Stack.Screen name="FoodDetailFromFavorites" component={FoodDetailScreen} />
            <Stack.Screen name="Tickets" component={TicketScreen} />
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
        </Stack.Navigator>
    );
}