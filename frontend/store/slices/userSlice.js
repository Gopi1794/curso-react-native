// store/slices/userSlice.js
import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
    name: 'user',
    initialState: {
        userInfo: null,
        isLoggedIn: false,
        favorites: [],
    },
    reducers: {
        login: (state, action) => {
            state.userInfo = action.payload;
            state.isLoggedIn = true;
        },
        logout: (state) => {
            state.userInfo = null;
            state.isLoggedIn = false;
            state.favorites = [];
        },
        addToFavorites: (state, action) => {
            if (!state.favorites.find(item => item.id === action.payload.id)) {
                state.favorites.push(action.payload);
            }
        },
        removeFromFavorites: (state, action) => {
            state.favorites = state.favorites.filter(item => item.id !== action.payload);
        },
        updateUserProfile: (state, action) => {
            if (state.userInfo) {
                state.userInfo = { ...state.userInfo, ...action.payload };
            }
        },
    },
});

export const { login, logout, addToFavorites, removeFromFavorites, updateUserProfile } = userSlice.actions;
export default userSlice.reducer;