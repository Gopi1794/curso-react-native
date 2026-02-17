// firebase/googleConfig.js
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './config';

// Para desarrollo con Expo, puedes usar un mock temporal
// O configurar expo-auth-session para producción

export const configureGoogleSignIn = () => {
    console.log('✅ Firebase Web SDK - Google SignIn configurado');
    // No necesita configuración adicional para Web SDK
};

export const signInWithGoogle = async () => {
    try {
        // Mock temporal para desarrollo
        // En producción, integra con expo-auth-session
        const mockUser = {
            uid: 'mock-user-id-' + Date.now(),
            email: 'usuario@ejemplo.com',
            displayName: 'Usuario Demo'
        };

        return mockUser;
    } catch (error) {
        console.error('Error en Google SignIn:', error);
        throw error;
    }
};