import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Importar AppHeader
import AppHeader from '../components/common/AppHeader';
import { useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/userSlice';

const { width: screenWidth } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {

  const handleGoBack = () => {
    navigation.goBack();
  };

  const dispatch = useAppDispatch();

  const handleEditProfile = () => navigation.navigate('EditProfile');
  const handleAddresses = () => navigation.navigate('Addresses');
  const handlePaymentMethods = () => navigation.navigate('PaymentMethods');
  const handleCoupons = () => navigation.navigate('Coupons');
  const handleNotifications = () => navigation.navigate('Notifications');
  const handlePrivacy = () => navigation.navigate('Privacy');
  const handleHelp = () => navigation.navigate('Help');

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            // Resetear la navegación al stack principal (evita acciones no manejadas)
            try {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainApp' }],
              });
            } catch (e) {
              // Fallback: navegar al root del parent si existe
              const parent = navigation.getParent && navigation.getParent();
              if (parent && parent.navigate) parent.navigate('MainApp');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Fondo con gradiente */}
      <LinearGradient
        colors={['#ffff', '#ffff', '#ffff']}
        style={styles.backgroundGradient}
      />


      {/* ✅ USAR APPHEADER EN LUGAR DEL HEADER PERSONALIZADO */}
      <AppHeader
        title="Mi Perfil"
        onBack={handleGoBack}
        showCart={false} // O true si quieres mostrar el carrito
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Contenido principal */}
        <View style={styles.content}>
          {/* Tarjeta de perfil mejorada */}
          <LinearGradient
            colors={['rgba(255, 136, 0, 1)', 'rgba(255, 85, 0, 1)']}
            style={styles.profileCard}
          >
            <View style={styles.avatarContainer}>
              <Image
                source={require('../assets/img/usuario-img.jpg')}
                style={styles.avatarImage}
                resizeMode="cover"
              />
              {/* Badge de verificación */}
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={16} color="white" />
              </View>
            </View>

            <Text style={styles.userName}>Usuario</Text>
            <Text style={styles.userEmail}>usuario@email.com</Text>

            {/* Stats del usuario */}
            <View style={styles.userStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>Pedidos</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>8</Text>
                <Text style={styles.statLabel}>Favoritos</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>4.8</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </LinearGradient>



          {/* Sección de menú con diseño mejorado */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Configuración</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
              <LinearGradient
                colors={['#ff8800ff', '#ff8800ff']}
                style={styles.menuIconContainer}
              >
                <Ionicons name="person-outline" size={20} color="#ffffffff" />
              </LinearGradient>
              <Text style={styles.menuText}>Editar Perfil</Text>
              <Ionicons name="chevron-forward" size={18} color="#FF8700" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleAddresses}>
              <LinearGradient
                colors={['#ff8800ff', '#ff8800ff']}
                style={styles.menuIconContainer}
              >
                <Ionicons name="location-outline" size={20} color="#ffffffff" />
              </LinearGradient>
              <Text style={styles.menuText}>Mis Direcciones</Text>
              <Ionicons name="chevron-forward" size={18} color="#FF8700" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handlePaymentMethods}>
              <LinearGradient
                colors={['#ff8800ff', '#ff8800ff']}
                style={styles.menuIconContainer}
              >
                <Ionicons name="card-outline" size={20} color="#ffffffff" />
              </LinearGradient>
              <Text style={styles.menuText}>Métodos de Pago</Text>
              <Ionicons name="chevron-forward" size={18} color="#FF8700" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleCoupons}>
              <LinearGradient
                colors={['#ff8800ff', '#ff8800ff']}
                style={styles.menuIconContainer}
              >
                <Ionicons name="gift-outline" size={20} color="#ffffffff" />
              </LinearGradient>
              <Text style={styles.menuText}>Cupones y Promociones</Text>
              <Ionicons name="chevron-forward" size={18} color="#FF8700" />
            </TouchableOpacity>
          </View>

          {/* Sección adicional */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Más Opciones</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleNotifications}>
              <LinearGradient
                colors={['#ff8800ff', '#ff8800ff']}
                style={styles.menuIconContainer}
              >
                <Ionicons name="notifications-outline" size={20} color="#ffffffff" />
              </LinearGradient>
              <Text style={styles.menuText}>Notificaciones</Text>
              <Ionicons name="chevron-forward" size={18} color="#FF8700" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handlePrivacy}>
              <LinearGradient
                colors={['#ff8800ff', '#ff8800ff']}
                style={styles.menuIconContainer}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="#ffffffff" />
              </LinearGradient>
              <Text style={styles.menuText}>Privacidad y Seguridad</Text>
              <Ionicons name="chevron-forward" size={18} color="#FF8700" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleHelp}>
              <LinearGradient
                colors={['#ff8800ff', '#ff8800ff']}
                style={styles.menuIconContainer}
              >
                <Ionicons name="help-circle-outline" size={20} color="#ffffffff" />
              </LinearGradient>
              <Text style={styles.menuText}>Ayuda y Soporte</Text>
              <Ionicons name="chevron-forward" size={18} color="#FF8700" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
              <LinearGradient
                colors={['#cc0000ff', '#cc0000ff']}
                style={styles.menuIconContainer}
              >
                <Ionicons name="log-out-outline" size={20} color="#ffffffff" />
              </LinearGradient>
              <Text style={[styles.menuText, styles.logoutText]}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView >
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#330000',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  decoCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 135, 0, 0.1)',
    top: -50,
    right: -50,
    zIndex: 0,
  },
  decoCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 87, 0, 0.1)',
    bottom: 100,
    left: -50,
    zIndex: 0,
  },
  decoCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 135, 0, 0.05)',
    top: '40%',
    right: '20%',
    zIndex: 0,
  },
  scrollView: {
    flex: 1,
    marginTop: 100, // ✅ Ajustar para que el contenido no quede debajo del AppHeader
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    padding: 20,
    zIndex: 1,
    marginTop: 10,
  },
  profileCard: {
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'white',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#4CD964',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
    fontFamily: 'Poppins-Bold',
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Poppins-Regular',
    marginBottom: 20,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins-Regular',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 10,
  },
  menuSection: {
    backgroundColor: 'rgba(184, 184, 184, 1)',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(184, 184, 184, 1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    padding: 20,
    paddingBottom: 10,
    fontFamily: 'Poppins-SemiBold',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    fontFamily: 'Poppins-Regular',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#ff4444',
  },

});