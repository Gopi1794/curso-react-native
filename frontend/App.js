import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { useAppSelector } from './store/hooks';
import { Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store
import { store } from './store';
import { Provider } from 'react-redux';

// Navegación
import AppNavigator from './navigation/AppNavigator';

// Componentes
import ComponenteLogin from './components/LoginForm';
import ComponenteRegister from './components/RegisterFrom';
import FlashMessageWrapper from './components/FlashMessageWrapper';
import AnimatedSplashScreen from './screens/AnimatedSplashScreen';
import OnboardingScreen from './screens/OnboardingScreen'; // ✅ NUEVO
import { LinearGradient } from 'expo-linear-gradient';

// Importar Firebase config
import './firebase/config';

// Pantalla de Login
function LoginScreen() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ebebebff', '#ebebebff']}
        style={styles.backgroundGradient}
      />

      <View style={styles.formOverlay}>
        {showRegister ? (
          <ComponenteRegister onBackToLogin={() => setShowRegister(false)} />
        ) : (
          <ComponenteLogin
            onShowRegister={() => setShowRegister(true)}
          />
        )}
      </View>

      <StatusBar style="light" hidden={true} translucent />
    </View>
  );
}

function MainApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false); // ✅ NUEVO
  const isLoggedIn = useAppSelector((state) => state.user.isLoggedIn);

  // Verificar si es la primera vez que abre la app
  useEffect(() => {
    checkFirstTimeUser();
    checkAuthenticationStatus();
  }, []);

  // Esperar a que Firebase esté listo
  useEffect(() => {
    const timer = setTimeout(() => {
      setFirebaseReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const checkFirstTimeUser = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.log('Error checking onboarding:', error);
    }
  };

  const checkAuthenticationStatus = async () => {
    try {
      // Tu lógica actual de verificación de autenticación
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.log('Error checking auth status:', error);
      setIsLoading(false);
    }
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // ✅ NUEVA FUNCIÓN: Cuando termina el onboarding
  const handleOnboardingFinish = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setShowOnboarding(false);
    } catch (error) {
      console.log('Error saving onboarding:', error);
      setShowOnboarding(false);
    }
  };

  // Mostrar SplashScreen animado
  if (showSplash) {
    return <AnimatedSplashScreen onAnimationFinish={handleSplashFinish} />;
  }

  // ✅ MOSTRAR ONBOARDING si es la primera vez


  // Si está cargando la verificación de autenticación O Firebase no está listo
  if (isLoading || !firebaseReady) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('./assets/img/logoApp.png')}
          style={styles.loadingLogo}
        />
      </View>
    );
  }

  // Usuario logueado - mostrar app principal
  if (isLoggedIn) {
    return (
      <NavigationContainer>
        <StatusBar style="white" />
        <AppNavigator />
        <FlashMessageWrapper />
      </NavigationContainer>
    );
  }

  // Usuario NO logueado - mostrar pantalla de login
  return <LoginScreen onLoginSuccess={() => { }} />;
}

export default function App() {
  useEffect(() => {
    console.log('✅ App iniciada - Firebase configurado');
  }, []);

  return (
    <Provider store={store}>
      <PaperProvider>
        <MainApp />
      </PaperProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  formOverlay: {
    flex: 1,
    width: '100%',
    zIndex: 10,
    elevation: 10,
    pointerEvents: 'box-none',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    width: 151,
    height: 153,
  },
});