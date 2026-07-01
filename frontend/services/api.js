import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── URL base ──────────────────────────────────────────────
// Cambiá esto según dónde corra el backend:
//   Android emulator : 'http://10.0.2.2:3000'
//   iOS simulator    : 'http://localhost:3000'
//   Dispositivo físico: tu IP local, ej: 'http://192.168.1.100:3000'
//   Ngrok            : 'https://xxxx.ngrok-free.dev'
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://curso-react-native.onrender.com';


const TOKEN_KEY = 'userToken';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Cache offline ─────────────────────────────────────────
const CACHE_PREFIX = '@api_cache:';
const cacheSet = (key, data) => AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data)).catch(() => { });
const cacheGet = async (key) => {
    try {
        const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
};

const requestWithCache = async (cacheKey, fn) => {
    try {
        const result = await fn();
        cacheSet(cacheKey, result);
        return result;
    } catch (err) {
        const cached = await cacheGet(cacheKey);
        if (cached) return { ...cached, _fromCache: true };
        throw err;
    }
};

// ── Helper base ───────────────────────────────────────────
const request = async (endpoint, options = {}, retries = 2) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);

    const headers = {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const method = options.method?.toUpperCase() || 'GET';
    const isReadOnly = method === 'GET';

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers,
            });
            const data = await response.json();
            return data;
        } catch (err) {
            if (!isReadOnly || attempt === retries) throw err;
            await sleep(500 * (attempt + 1));
        }
    }
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

    forgotPassword: (email) => request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    }),

    resetPassword: (email, code, newPassword) => request('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
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

    deleteAccount: (password) => request('/api/users/account', {
        method: 'DELETE',
        body: JSON.stringify({ password }),
    }),

    getStats: () => request('/api/users/stats'),

    getAddresses: () => request('/api/users/addresses'),

    createAddress: (data) => request('/api/users/addresses', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    deleteAddress: (id) => request(`/api/users/addresses/${id}`, { method: 'DELETE' }),
};

// ── RESTAURANTS ───────────────────────────────────────────
const restaurants = {
    getAll: () => requestWithCache('restaurants', () => request('/api/restaurants')),

    getById: (id) => request(`/api/restaurants/${id}`),

    getMenu: (id, category = null) => {
        const query = category ? `?category=${category}` : '';
        return requestWithCache(`menu:${id}:${category || ''}`, () =>
            request(`/api/restaurants/${id}/menu${query}`)
        );
    },

    getMenuItem: (restaurantId, itemId) =>
        request(`/api/restaurants/${restaurantId}/menu/${itemId}`),
};

// ── ORDERS ────────────────────────────────────────────────
const orders = {
    create: (restauranteId, items, direccionEntrega, notas, metodoPago) => request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
            restaurante_id: restauranteId,
            items,
            direccion_entrega: direccionEntrega,
            notas,
            metodo_pago: metodoPago || 'mercadopago',
        }),
    }),

    getAll: () => request('/api/orders'),

    getById: (id) => request(`/api/orders/${id}`),

    cancel: (id) => request(`/api/orders/${id}/cancel`, { method: 'PUT' }),

    getTracking: (id) => request(`/api/orders/${id}/tracking`),

    updateStatus: (id, estado) => request(`/api/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ estado }),
    }),
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

    createPreference: (pedidoId) => request('/api/payments/mp-preference', {
        method: 'POST',
        body: JSON.stringify({ pedido_id: pedidoId }),
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

// ── FAVORITES ────────────────────────────────────────────
const favorites = {
    getAll: () => request('/api/favorites'),

    add: (menuItemId) => request('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ menu_item_id: menuItemId }),
    }),

    remove: (menuItemId) => request(`/api/favorites/${menuItemId}`, { method: 'DELETE' }),
};

// ── CUPONES ───────────────────────────────────────────────
const cupones = {
    getAll: () => request('/api/cupones'),
    getById: (id) => request(`/api/cupones/${id}`),
    validate: (codigo) => request('/api/cupones/validate', {
        method: 'POST',
        body: JSON.stringify({ codigo }),
    }),
};

// ── NOTIFICATIONS ─────────────────────────────────────────
const notifications = {
    savePushToken: (pushToken) => request('/api/users/push-token', {
        method: 'PUT',
        body: JSON.stringify({ pushToken }),
    }),

    getPreferences: () => request('/api/users/notification-preferences'),

    updatePreferences: (prefs) => request('/api/users/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(prefs),
    }),
};

// ── REPARTIDOR ────────────────────────────────────────────
const repartidor = {
    getMisPedidos: () => request('/api/repartidor/pedidos'),
    getHistorial: () => request('/api/repartidor/historial'),
    updateEstado: (id, estado) => request(`/api/repartidor/pedidos/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) }),
    cobrarEfectivo: (id, monto_recibido) => request(`/api/repartidor/pedidos/${id}/cobrar`, { method: 'PUT', body: JSON.stringify({ monto_recibido }) }),
};

// ── ADMIN ─────────────────────────────────────────────────
const admin = {
    upload: async (uri, type = 'image/jpeg') => {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const form = new FormData();
        form.append('image', { uri, type, name: 'upload.jpg' });
        const res = await fetch(`${API_BASE_URL}/api/admin/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });
        return res.json();
    },
    ingredientes: {
        getAll: () => request('/api/admin/ingredientes'),
        create: (data) => request('/api/admin/ingredientes', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => request(`/api/admin/ingredientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id) => request(`/api/admin/ingredientes/${id}`, { method: 'DELETE' }),
    },
    stock: {
        getByRestaurante: (restauranteId) => request(`/api/admin/stock/${restauranteId}`),
        update: (id, data) => request(`/api/admin/stock/item/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    },
    cupones: {
        getAll: () => request('/api/admin/cupones'),
        create: (data) => request('/api/admin/cupones', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => request(`/api/admin/cupones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id) => request(`/api/admin/cupones/${id}`, { method: 'DELETE' }),
    },
    pedidos: {
        getAll: () => request('/api/admin/pedidos'),
        getRepartidores: () => request('/api/admin/repartidores'),
        preparar: (id) => request(`/api/admin/pedidos/${id}/preparar`, { method: 'PUT' }),
        asignar: (id, repartidor_id) => request(`/api/admin/pedidos/${id}/asignar`, { method: 'PUT', body: JSON.stringify({ repartidor_id }) }),
    },
    recetas: {
        getByRestaurante: (restauranteId) => request(`/api/admin/recetas/${restauranteId}`),
        updateCantidad: (id, cantidad_usada) => request(`/api/admin/recetas/item/${id}`, { method: 'PUT', body: JSON.stringify({ cantidad_usada }) }),
    },
    platos: {
        getAll: (restauranteId) => request(`/api/admin/platos/${restauranteId}`),
        create: (restauranteId, data) => request(`/api/admin/platos/${restauranteId}`, { method: 'POST', body: JSON.stringify(data) }),
        toggle: (id) => request(`/api/admin/platos/${id}/toggle`, { method: 'PUT' }),
        update: (id, data) => request(`/api/admin/platos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        remove: (id) => request(`/api/admin/platos/${id}`, { method: 'DELETE' }),
    },
};

// ── SUPPORT ───────────────────────────────────────────────
const support = {
    chat: (messages) => request('/api/support/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
    }),
};

// ── Token helpers (SecureStore) ──────────────────────────
const token = {
    save: (t) => SecureStore.setItemAsync(TOKEN_KEY, t),
    remove: () => SecureStore.deleteItemAsync(TOKEN_KEY),
    get: () => SecureStore.getItemAsync(TOKEN_KEY),
};

export { API_BASE_URL as API_URL };
export default { auth, users, restaurants, orders, payments, comentarios, cupones, favorites, notifications, support, admin, repartidor, token };
