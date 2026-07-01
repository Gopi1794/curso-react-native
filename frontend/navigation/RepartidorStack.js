import { createStackNavigator } from '@react-navigation/stack';
import RepartidorNavigator from './RepartidorNavigator';
import NotificationsFeedScreen from '../screens/admin/NotificationsFeedScreen';

const Stack = createStackNavigator();

export default function RepartidorStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="RepartidorTabs" component={RepartidorNavigator} />
            <Stack.Screen name="NotificationsFeed" component={NotificationsFeedScreen} />
        </Stack.Navigator>
    );
}
