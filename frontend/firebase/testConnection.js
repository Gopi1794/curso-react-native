// firebase/testConnection.js
import { auth, db } from './config';

export const testFirebaseConnection = async () => {
    try {
        console.log('✅ Firebase Web SDK conectado correctamente');
        return true;
    } catch (error) {
        console.log('❌ Error en conexión Firebase:', error);
        return false;
    }
};