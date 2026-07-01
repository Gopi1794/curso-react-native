import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Image, Animated, Dimensions } from 'react-native';
import { Asset } from 'expo-asset';
import { useState, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { login, setFavorites } from './store/slices/userSlice';
import { hydrateCart } from './store/slices/cartSlice';
import { selectRestaurant } from './store/slices/restaurantSlice';
import { CART_STORAGE_KEY } from './store';
import { Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store
import { store } from './store';
import { Provider } from 'react-redux';
import { ThemeProvider } from './contexts/ThemeContext';

// Navegación
import AppNavigator from './navigation/AppNavigator';
import RepartidorNavigator from './navigation/RepartidorNavigator';

// Componentes
import ComponenteLogin from './components/LoginForm';
import ComponenteRegister from './components/RegisterForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import AnimatedAuthBackground from './components/AnimatedAuthBackground';
import FlashMessageWrapper from './components/FlashMessageWrapper';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import AnimatedSplashScreen from './screens/onboarding/AnimatedSplashScreen';
import OnboardingScreen from './screens/onboarding/OnboardingScreen';
import SelectRestaurantScreen from './screens/restaurant/SelectRestaurantScreen';
import { LinearGradient } from 'expo-linear-gradient';

import * as Notifications from 'expo-notifications';
import API from './services/api';
import { registerForPushNotifications } from './services/pushNotifications';
import VerifyEmailScreen from './screens/auth/VerifyEmailScreen';
import { useTheme } from './contexts/ThemeContext';

// Pantalla de Login
function LoginScreen() {
  const [showRegister, setShowRegister] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get('window');

  const transition = (action, direction = 'forward') => {
    const outTo  = direction === 'forward' ? -width : width;
    const inFrom = direction === 'forward' ?  width : -width;

    Animated.timing(slideAnim, {
      toValue: outTo,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      action();
      slideAnim.setValue(inFrom);
      requestAnimationFrame(() => {
        Animated.spring(slideAnim, {
          toValue: 0,
          bounciness: 3,
          speed: 14,
          useNativeDriver: true,
        }).start();
      });
    });
  };

  return (
    <View style={styles.container}>
      <AnimatedAuthBackground style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.formOverlay, { transform: [{ translateX: slideAnim }] }]}>
        {verifyEmail ? (
          <VerifyEmailScreen
            route={{ params: { email: verifyEmail } }}
            navigation={{ goBack: () => transition(() => setVerifyEmail(null), 'back') }}
            onBack={() => transition(() => setVerifyEmail(null), 'back')}
          />
        ) : showForgot ? (
          <ForgotPasswordForm
            onBackToLogin={() => transition(() => setShowForgot(false), 'back')}
          />
        ) : showRegister ? (
          <ComponenteRegister
            onBackToLogin={() => transition(() => setShowRegister(false), 'back')}
            onVerifyEmail={(email) => transition(() => setVerifyEmail(email), 'forward')}
          />
        ) : (
          <ComponenteLogin
            onShowRegister={() => transition(() => setShowRegister(true), 'forward')}
            onVerifyEmail={(email) => transition(() => setVerifyEmail(email), 'forward')}
            onForgotPassword={() => transition(() => setShowForgot(true), 'forward')}
          />
        )}
      </Animated.View>
    </View>
  );
}

function MainApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const isLoggedIn = useAppSelector((state) => state.user.isLoggedIn);
  const userRol = useAppSelector((state) => state.user.userInfo?.rol);
  const selectedRestaurant = useAppSelector((state) => state.restaurant.selected);
  const dispatch = useAppDispatch();
  const { isDark } = useTheme();

  // Verificar si es la primera vez que abre la app
  useEffect(() => {
    checkFirstTimeUser();
    checkAuthenticationStatus();
  }, []);

  // Manejar acciones de notificaciones (ej: botón "Poner en preparación")
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      if (response.actionIdentifier === 'PREPARAR') {
        const orderId = response.notification.request.content.data?.orderId;
        if (orderId) {
          try {
            await API.admin.pedidos.preparar(orderId);
          } catch (e) {
            console.error('Error al preparar pedido desde notificación:', e);
          }
        }
      }
    });
    return () => sub.remove();
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
        // Precargamos las imágenes antes de mostrar el onboarding
        await Asset.loadAsync([
          require('./assets/img/onboarding/slide1.jpg'),
          require('./assets/img/onboarding/slide2.jpg'),
          require('./assets/img/onboarding/slide3.jpg'),
        ]);
        setShowOnboarding(true);
      }
    } catch (error) {
      setShowOnboarding(true); // Si falla el preload, mostramos igual
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

        // Restaurar restaurante seleccionado desde AsyncStorage
        try {
          const saved = await AsyncStorage.getItem('selectedRestaurant');
          if (saved) dispatch(selectRestaurant(JSON.parse(saved)));
        } catch {}

        // Restaurar carrito guardado desde AsyncStorage
        try {
          const savedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
          if (savedCart) dispatch(hydrateCart(JSON.parse(savedCart)));
        } catch {}

        // Cargar favoritos desde la DB en segundo plano
        API.favorites.getAll().then(res => {
          if (res.success) {
            dispatch(setFavorites(res.data.map(row => ({
              id: row.id,
              name: row.nombre,
              price: row.precio,
              imageKey: row.imagen_key,
              descriptionText: row.descripcion,
            }))));
          }
        }).catch(() => {});

        // Registrar push token en segundo plano
        registerForPushNotifications()
          .then((pushToken) => {
            if (pushToken) API.notifications.savePushToken(pushToken).catch(() => {});
          })
          .catch(() => {});
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

  // Repartidor — su propia pantalla, sin restaurante ni tab bar
  if (isLoggedIn && userRol === 'repartidor') {
    return (
      <NavigationContainer>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <RepartidorNavigator />
        <FlashMessageWrapper />
      </NavigationContainer>
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

  const linking = {
    prefixes: ['tuappfood://', 'https://tuappfood.com'],
    config: {
      screens: {
        HomeTab: {
          screens: {
            Home: 'home',
            FoodDetail: 'food/:foodItemId',
          },
        },
        OrdersTab: {
          screens: {
            OrdersMain: 'orders',
            OrderDetail: 'orders/:orderId',
            OrderTracking: 'tracking/:orderId',
          },
        },
        ProfileTab: {
          screens: {
            Profile: 'profile',
            EditProfile: 'profile/edit',
          },
        },
      },
    },
  };

  // Usuario logueado con restaurante seleccionado - mostrar app principal
  if (isLoggedIn) {
    return (
      <NavigationContainer linking={linking}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
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
  }, []);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <PaperProvider>
            <MainApp />
          </PaperProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#EA580C',
    justifyContent: 'center',
    backgroundColor: '#ff8000',
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