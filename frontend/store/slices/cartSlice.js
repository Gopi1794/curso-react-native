// store/slices/cartSlice.js
import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
    name: 'cart',
    initialState: {
        items: [],
        total: 0,
    },
    reducers: {
        addToCart: (state, action) => {
            const newItem = action.payload;
            const existingItem = state.items.find(item => item.id === newItem.id);

            if (existingItem) {
                // ✅ SUMAR LA CANTIDAD QUE VIENE DEL PAYLOAD, NO SIEMPRE 1
                existingItem.quantity += newItem.quantity;
            } else {
                // ✅ AGREGAR EL ITEM CON LA CANTIDAD QUE VIENE DEL PAYLOAD
                state.items.push(newItem);
            }

            state.total = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        },

        removeFromCart: (state, action) => {
            state.items = state.items.filter(item => item.id !== action.payload);
            state.total = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        },

        updateQuantity: (state, action) => {
            const { id, quantity } = action.payload;
            const item = state.items.find(item => item.id === id);

            if (item) {
                item.quantity = quantity;
                state.total = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
            }
        },

        clearCart: (state) => {
            state.items = [];
            state.total = 0;
        },
    },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;