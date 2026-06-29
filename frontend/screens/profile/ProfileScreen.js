import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Dialog, Portal, Button, Paragraph } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import AppHeader from '../../components/common/AppHeader';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/userSlice';
import API from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const userInfo = useAppSelector((state) => state.user.userInfo);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  const handleGoBack = () => navigation.goBack();
  const userName = userInfo ? `${userInfo.nombre ?? ''} ${userInfo.apellido ?? ''}`.trim() : 'Usuario';
  const userEmail = userInfo?.email ?? 'usuario@email.com';
  const avatarSource = userInfo?.avatar_url
    ? { uri: userInfo.avatar_url }
    : require('../../assets/img/usuario-img.jpg');

  const handleEditProfile = () => navigation.navigate('EditProfile');
  const handleAddresses = () => navigation.navigate('Addresses');
  const handlePaymentMethods = () => navigation.navigate('PaymentMethods');
  const handleNotifications = () => navigation.navigate('Notifications');
  const handlePrivacy = () => navigation.navigate('Privacy');
  const handleHelp = () => navigation.navigate('Help');

  const handleLogout = () => setLogoutDialogVisible(true);

  const confirmLogout = () => {
    setLogoutDialogVisible(false);
    dispatch(logout());
    API.token.remove().catch(() => {});
    API.auth.logout().catch(() => {});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <AppHeader
        title="Mi Perfil"
        onBack={handleGoBack}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 44 + 24, paddingBottom: tabBarHeight + 16 }]}
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
                source={avatarSource}
                style={styles.avatarImage}
                resizeMode="cover"
              />
              {/* Badge de verificación */}
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={16} color="white" />
              </View>
            </View>

            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userEmail}>{userEmail}</Text>

          </LinearGradient>



          {/* Sección de menú con diseño mejorado */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Configuración</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile} accessibilityRole="button" accessibilityLabel="Editar Perfil">
              <View style={styles.menuIconContainer}>
                <Ionicons name="person-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.menuText}>Editar Perfil</Text>
              <Ionicons name="chevron-forward" size={18} color="#FF8700" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleAddresses} accessibilityRole="button" accessibilityLabel="Mis Direcciones">
              <View style={styles.menuIconContainer}>
                <Ionicons name="location-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.menuText}>Mis Direcciones</Text>
              <Ionicons name="chevron-forward" size={18} color="#FF8700" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handlePaymentMethods} accessibilityRole="button" accessibilityLabel="Métodos de Pago">
              <View style={styles.menuIconContainer}>
                <Ionicons name="card-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.menuText}>Métodos de Pago</Text>
              <Ionicons name="chevron-forward" size={18} color="#FF8700" />
            </TouchableOpacity>

          </View>

          {/* Sección adicional */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Más Opciones</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleNotifications} accessibilityRole="button" accessibilityLabel="Notificaciones">
              <View style={styles.menuIconContainer}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.menuText}>Notificaciones</Text>
              <Ionicons name="chevron-forward" size={18} color="#FF8700" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handlePrivacy} accessibilityRole="button" accessibilityLabel="Privacidad y Seguridad">
              <View style={styles.menuIconContainer}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.menuText}>Privacidad y Seguridad</Text>
              <Ionicons name="chevron-forward" size={18} color="#FF8700" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleHelp} accessibilityRole="button" accessibilityLabel="Ayuda y Soporte">
              <View style={styles.menuIconContainer}>
                <Ionicons name="help-circle-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.menuText}>Ayuda y Soporte</Text>
              <Ionicons name="chevron-forward" size={18} color="#FF8700" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Cerrar Sesión">
              <View style={[styles.menuIconContainer, styles.logoutIconContainer]}>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
              </View>
              <Text style={[styles.menuText, styles.logoutText]}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={logoutDialogVisible}
          onDismiss={() => setLogoutDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Icon icon="log-out" size={36} color="#FF8700" />
          <Dialog.Title style={styles.dialogTitle}>Cerrar sesión</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogMessage}>
              ¿Estás seguro que querés cerrar sesión?
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setLogoutDialogVisible(false)} textColor="#888">
              Cancelar
            </Button>
            <Button onPress={confirmLogout} textColor="#ff4444">
              Cerrar sesión
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    padding: 20,
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
    color: '#fff',
    fontFamily: 'Poppins-Regular',
    marginBottom: 20,
  },
  menuSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    padding: 20,
    paddingBottom: 10,
    fontFamily: 'Poppins-SemiBold',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    minHeight: 56,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    backgroundColor: '#FF8800',
  },
  logoutIconContainer: {
    backgroundColor: '#cc0000',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    fontFamily: 'Poppins-Regular',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#ff4444',
  },

  dialog: {
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  dialogTitle: {
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#1a1a1a',
  },
  dialogMessage: {
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  dialogActions: {
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
});