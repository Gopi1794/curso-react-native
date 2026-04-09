import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import cartReducer from './slices/cartSlice';
import restaurantReducer from './slices/restaurantSlice';

export const store = configureStore({
    reducer: {
        user: userReducer,
        cart: cartReducer,
        restaurant: restaurantReducer,
    },
});

export default store;