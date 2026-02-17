import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import cartReducer from './slices/cartSlice'; // ✅ Agregar esto

export const store = configureStore({
    reducer: {
        user: userReducer,
        cart: cartReducer, // ✅ Agregar esto
    },
});

export default store;