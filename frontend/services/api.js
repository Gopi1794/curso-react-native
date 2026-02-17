// services/api.js - VERSIÓN KISS (Keep It Simple, Stupid)
import { Platform } from 'react-native';

// ELIGE UNA URL (comenta/descomenta):
const URL_OPTIONS = {
    // OPCIÓN A: Android Emulator
    // API_BASE_URL: 'http://10.0.2.2:3000',

    // OPCIÓN B: iOS Simulator  
    // API_BASE_URL: 'http://localhost:3000',

    // OPCIÓN C: Expo en celular (TU IP)
    API_BASE_URL: 'https://verlie-ripply-jill.ngrok-free.dev',

    // OPCIÓN D: Ngrok (si las otras fallan)
    // API_BASE_URL: 'https://abc123.ngrok.io',
};

const API_BASE_URL = URL_OPTIONS.API_BASE_URL;

console.log('🎯 URL actual:', API_BASE_URL);
console.log('📱 Platform:', Platform.OS);

const api = {
    register: async (userData) => {
        console.log('📤 Enviando a:', API_BASE_URL);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            console.log('✅ Respuesta:', data.message);
            return data;

        } catch (error) {
            console.error('❌ Error:', error.message);

            // Si falla, prueba automáticamente con localhost
            if (API_BASE_URL.includes('192.168')) {
                console.log('🔄 Probando con localhost...');
                try {
                    const fallbackResponse = await fetch('http://localhost:3000/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userData)
                    });
                    return await fallbackResponse.json();
                } catch (fallbackError) {
                    // Si todo falla, devolver mock
                    console.log('📦 Devolviendo MOCK');
                    return {
                        success: true,
                        message: 'Usuario creado (MOCK FINAL)',
                        user: { ...userData, id: 999, rol: 'cliente' },
                        token: 'final_mock_token'
                    };
                }
            }

            throw error;
        }
    }
};

export default api;