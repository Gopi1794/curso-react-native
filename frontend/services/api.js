import * as SecureStore from 'expo-secure-store';

// ── URL base ──────────────────────────────────────────────
// Cambiá esto según dónde corra el backend:
//   Android emulator : 'http://10.0.2.2:3000'
//   iOS simulator    : 'http://localhost:3000'
//   Dispositivo físico: tu IP local, ej: 'http://192.168.1.100:3000'
//   Ngrok            : 'https://xxxx.ngrok-free.dev'
const API_BASE_URL = 'http://192.168.1.33:3000';

const TOKEN_KEY = 'userToken';

// ── Helper base ───────────────────────────────────────────
const request = async (endpoint, options = {}) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();
    return data;
};

// ── AUTH ──────────────────────────────────────────────────
const auth = {
    register: (userData) => request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
    }),

    login: (email, password) => request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    }),

    logout: () => request('/api/auth/logout', { method: 'POST' }),

    getMe: () => request('/api/auth/me'),

    googleLogin: (idToken, accessToken) => request('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken, accessToken }),
    }),

    verifyEmail: (email, code) => request('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
    }),

    resendVerification: (email) => request('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
    }),
};

// ── USERS ─────────────────────────────────────────────────
const users = {
    getProfile: () => request('/api/users/profile'),

    updateProfile: (data) => request('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
    }),

    changePassword: (currentPassword, newPassword) => request('/api/users/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
    }),

    getStats: () => request('/api/users/stats'),
};

// ── RESTAURANTS ───────────────────────────────────────────
const restaurants = {
    getAll: () => request('/api/restaurants'),

    getById: (id) => request(`/api/restaurants/${id}`),

    getMenu: (id, category = null) => {
        const query = category ? `?category=${category}` : '';
        return request(`/api/restaurants/${id}/menu${query}`);
    },

    getMenuItem: (restaurantId, itemId) =>
        request(`/api/restaurants/${restaurantId}/menu/${itemId}`),
};

// ── ORDERS ────────────────────────────────────────────────
const orders = {
    create: (restauranteId, items, direccionEntrega, notas) => request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
            restaurante_id: restauranteId,
            items,
            direccion_entrega: direccionEntrega,
            notas,
        }),
    }),

    getAll: () => request('/api/orders'),

    getById: (id) => request(`/api/orders/${id}`),

    cancel: (id) => request(`/api/orders/${id}/cancel`, { method: 'PUT' }),
};

// ── PAYMENTS ──────────────────────────────────────────────
const payments = {
    getMethods: () => request('/api/payments/methods'),

    addMethod: (data) => request('/api/payments/methods', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    deleteMethod: (id) => request(`/api/payments/methods/${id}`, { method: 'DELETE' }),

    pay: (pedidoId, metodoPagoId) => request('/api/payments/pay', {
        method: 'POST',
        body: JSON.stringify({ pedido_id: pedidoId, metodo_pago_id: metodoPagoId }),
    }),

    getHistory: () => request('/api/payments/history'),
};

// ── COMENTARIOS ──────────────────────────────────────────
const comentarios = {
    getByMenuItem: (menuItemId) => request(`/api/menu-items/${menuItemId}/comentarios`),

    create: (menuItemId, rating, comentario) => request(`/api/menu-items/${menuItemId}/comentarios`, {
        method: 'POST',
        body: JSON.stringify({ rating, comentario }),
    }),

    remove: (menuItemId) => request(`/api/menu-items/${menuItemId}/comentarios`, { method: 'DELETE' }),
};

// ── CUPONES ───────────────────────────────────────────────
const cupones = {
    getAll: () => request('/api/cupones'),
    getById: (id) => request(`/api/cupones/${id}`),
};

// ── Token helpers (SecureStore) ──────────────────────────
const token = {
    save: (t) => SecureStore.setItemAsync(TOKEN_KEY, t),
    remove: () => SecureStore.deleteItemAsync(TOKEN_KEY),
    get: () => SecureStore.getItemAsync(TOKEN_KEY),
};

export { API_BASE_URL as API_URL };
export default { auth, users, restaurants, orders, payments, comentarios, cupones, token };
