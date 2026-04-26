import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { login } from './store/slices/userSlice';
import { Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store
import { store } from './store';
import { Provider } from 'react-redux';

// Navegación
import AppNavigator from './navigation/AppNavigator';

// Componentes
import ComponenteLogin from './components/LoginForm';
import ComponenteRegister from './components/RegisterForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import FlashMessageWrapper from './components/FlashMessageWrapper';
import AnimatedSplashScreen from './screens/AnimatedSplashScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import SelectRestaurantScreen from './screens/SelectRestaurantScreen';
import VerifyEmailScreen from './screens/VerifyEmailScreen';
import API from './services/api';

// Pantalla de Login
function LoginScreen() {
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');

  const handleBackToLogin = () => {
    setShowRegister(false);
    setShowForgotPassword(false);
    setShowVerify(false);
  };

  const handleVerifyEmail = (email) => {
    setVerifyEmail(email);
    setShowRegister(false);
    setShowVerify(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.formOverlay}>
        {showVerify ? (
          <VerifyEmailScreen email={verifyEmail} onBack={handleBackToLogin} />
        ) : showRegister ? (
          <ComponenteRegister onBackToLogin={handleBackToLogin} onVerifyEmail={handleVerifyEmail} />
        ) : showForgotPassword ? (
          <ForgotPasswordForm onBackToLogin={handleBackToLogin} />
        ) : (
          <ComponenteLogin
            onShowRegister={() => setShowRegister(true)}
            onForgotPassword={() => setShowForgotPassword(true)}
            onVerifyEmail={handleVerifyEmail}
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
  const selectedRestaurant = useAppSelector((state) => state.restaurant.selected);
  const dispatch = useAppDispatch();

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
      const savedToken = await API.token.get();

      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      // Validar el token contra el backend
      const response = await API.auth.getMe();

      if (response.success) {
        dispatch(login({
          id: response.user.id,
          uuid: response.user.uuid,
          nombre: response.user.nombre,
          apellido: response.user.apellido,
          email: response.user.email,
          telefono: response.user.telefono,
          rol: response.user.rol,
          estado: response.user.estado,
          avatar: require('./assets/img/usuario-img.jpg'),
          token: savedToken,
        }));
      } else {
        // Token inválido o expirado — limpiar
        await API.token.remove();
      }
    } catch (error) {
      console.log('Error checking auth status:', error);
      await API.token.remove();
    } finally {
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
  if (showOnboarding) {
    return <OnboardingScreen onFinish={handleOnboardingFinish} />;
  }

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

  // Usuario logueado pero sin restaurante seleccionado
  if (isLoggedIn && !selectedRestaurant) {
    return (
      <>
        <SelectRestaurantScreen />
        <FlashMessageWrapper />
      </>
    );
  }

  // Usuario logueado con restaurante seleccionado - mostrar app principal
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
  return (
    <>
      <LoginScreen onLoginSuccess={() => { }} />
      <FlashMessageWrapper />
    </>
  );
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