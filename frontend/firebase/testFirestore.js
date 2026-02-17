// firebase/testFirestore.js
import { db } from './config';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export const testFirestoreConnection = async () => {
    try {
        console.log('🔄 Probando conexión con Firestore...');

        // Intentar escribir un documento de prueba
        const docRef = await addDoc(collection(db, 'testConnection'), {
            message: 'Conexión exitosa',
            timestamp: new Date()
        });

        console.log('✅ Documento escrito con ID:', docRef.id);

        // Intentar leer documentos
        const querySnapshot = await getDocs(collection(db, 'testConnection'));
        console.log('✅ Documentos leídos:', querySnapshot.size);

        // Limpiar documento de prueba
        // Nota: Para borrar necesitarías configurar más reglas

        return true;
    } catch (error) {
        console.error('❌ Error en Firestore:', error);
        return false;
    }
};