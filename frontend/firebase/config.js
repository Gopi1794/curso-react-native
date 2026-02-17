// firebase/config.js
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage'; // Opcional para almacenamiento

const firebaseConfig = {
    apiKey: "AIzaSyBWUWQlo8VBOa23fjZRfudf8Q9Gq486fTY",
    authDomain: "turestauranteapp-529da.firebaseapp.com",
    projectId: "turestauranteapp-529da",
    storageBucket: "turestauranteapp-529da.firebasestorage.app",
    messagingSenderId: "279555469009",
    appId: "1:279555469009:web:41c57e8ec409673ec1dff0",
    measurementId: "G-N728HKQJBN"
};

// Inicializar solo una vez
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('🔥 Firebase COMPAT inicializado correctamente');
} else {
    firebase.app(); // Usar app existente
    console.log('🔥 Firebase COMPAT ya estaba inicializado');
}

// Exportar servicios
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage(); // Opcional

// Configuración adicional para React Native
auth.useDeviceLanguage(); // Usar idioma del dispositivo

export { firebase, auth, db, storage };