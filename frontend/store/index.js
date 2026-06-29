import { configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userReducer from './slices/userSlice';
import cartReducer from './slices/cartSlice';
import restaurantReducer from './slices/restaurantSlice';

export const CART_STORAGE_KEY = '@appfood_cart';

export const store = configureStore({
    reducer: {
        user: userReducer,
        cart: cartReducer,
        restaurant: restaurantReducer,
    },
});

// Persist cart on every state change
let prevCart = store.getState().cart;
store.subscribe(() => {
    const nextCart = store.getState().cart;
    if (nextCart !== prevCart) {
        prevCart = nextCart;
        AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCart)).catch(() => {});
    }
});

export default store;