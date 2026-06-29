// store/slices/userSlice.js
import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
    name: 'user',
    initialState: {
        userInfo: null,
        token: null,
        isLoggedIn: false,
        justRegistered: false,
        favorites: [],
    },
    reducers: {
        login: (state, action) => {
            const { token, justRegistered, ...userInfo } = action.payload;
            state.userInfo = userInfo;
            state.token = token || null;
            state.isLoggedIn = true;
            state.justRegistered = justRegistered || false;
        },
        clearJustRegistered: (state) => {
            state.justRegistered = false;
        },
        logout: (state) => {
            state.userInfo = null;
            state.token = null;
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
        setFavorites: (state, action) => {
            state.favorites = action.payload;
        },
        updateUserProfile: (state, action) => {
            if (state.userInfo) {
                state.userInfo = { ...state.userInfo, ...action.payload };
            }
        },
    },
});

export const { login, logout, clearJustRegistered, addToFavorites, removeFromFavorites, setFavorites, updateUserProfile } = userSlice.actions;
export default userSlice.reducer;