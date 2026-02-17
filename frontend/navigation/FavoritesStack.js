// navigation/FavoritesStack.js
import { createStackNavigator } from '@react-navigation/stack';
import FavoritesScreen from '../screens/FavoritesScreen';
import FoodDetailScreen from '../screens/FoodDetailScreen';
import TicketScreen from '../screens/TicketScreen';
import TicketDetailScreen from '../screens/TicketDetailScreen';

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