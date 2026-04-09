// store/slices/restaurantSlice.js
import { createSlice } from '@reduxjs/toolkit';

const restaurantSlice = createSlice({
    name: 'restaurant',
    initialState: {
        selected: null, // { id, nombre, descripcion, direccion, telefono, horario }
    },
    reducers: {
        selectRestaurant: (state, action) => {
            state.selected = action.payload;
        },
        clearRestaurant: (state) => {
            state.selected = null;
        },
    },
});

export const { selectRestaurant, clearRestaurant } = restaurantSlice.actions;
export default restaurantSlice.reducer;
