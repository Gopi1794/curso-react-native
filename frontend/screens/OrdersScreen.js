import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

export default function OrdersScreen({ navigation }) {
  const orders = [
    {
      id: 1,
      date: '2024-01-15',
      status: 'Entregado',
      total: '$25.50',
      items: ['MAEL KUN', 'BURRITOS VEGANOS X2'],
      statusColor: '#4CAF50'
    },
    {
      id: 2,
      date: '2024-01-12',
      status: 'En Camino',
      total: '$18.00',
      items: ['TORTILLA ESPAÑOLA', 'GAZPACHO'],
      statusColor: '#FF9800'
    },
    {
      id: 3,
      date: '2024-01-10',
      status: 'Preparando',
      total: '$32.00',
      items: ['POLLO SANTEADO', 'HOTCAKE CON FRUTILLAS'],
      statusColor: '#2196F3'
    },
    {
      id: 4,
      date: '2024-01-08',
      status: 'Entregado',
      total: '$15.50',
      items: ['MR JOWER'],
      statusColor: '#4CAF50'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Entregado':
        return 'checkmark-circle';
      case 'En Camino':
        return 'car';
      case 'Preparando':
        return 'time';
      default:
        return 'ellipse';
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Fondo decorado */}
      <Image
        style={styles.backgroundDeco1}
        source={require("../assets/img/deco_1.png")}
        resizeMode="cover"
      />

      <Image
        style={styles.backgroundDeco2}
        source={require("../assets/img/deco_2.png")}
        resizeMode="cover"
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Pedidos</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >


        {/* Contenido */}
        <View style={styles.content}>
          {orders.map((order) => (
            <TouchableOpacity key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderDate}>Pedido #{order.id}</Text>
                  <Text style={styles.orderDate}>{order.date}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: order.statusColor }]}>
                  <Ionicons name={getStatusIcon(order.status)} size={16} color="white" />
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
              </View>

              <View style={styles.orderItems}>
                {order.items.map((item, index) => (
                  <Text key={index} style={styles.itemText}>• {item}</Text>
                ))}
              </View>

              <View style={styles.orderFooter}>
                <Text style={styles.totalText}>Total: {order.total}</Text>
                <TouchableOpacity style={styles.reorderButton}>
                  <Text style={styles.reorderText}>Pedir de Nuevo</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

          {orders.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={80} color="#ccc" />
              <Text style={styles.emptyText}>No tienes pedidos aún</Text>
              <Text style={styles.emptySubtext}>¡Haz tu primer pedido!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#330000',
  },
  scrollView: {
    flex: 1,
  },
  backgroundDeco1: {
    position: 'absolute',
    height: 266,
    top: 0,
    width: '100%',
    zIndex: 0,
  },
  backgroundDeco2: {
    position: 'absolute',
    width: screenWidth,
    height: 266,
    bottom: -60,
    zIndex: 0,
  },
  header: {
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#330000',
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerRight: {
    width: 40,
  },
  content: {
    padding: 20,
    zIndex: 1,
    marginTop: 10,
  },
  orderCard: {
    backgroundColor: 'rgba(217, 217, 217, 0.67)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderInfo: {
    flex: 1,
  },
  orderDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  orderItems: {
    marginBottom: 15,
  },
  itemText: {
    fontSize: 14,
    color: '#ffffffff',
    marginBottom: 5,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D80000',
  },
  reorderButton: {
    backgroundColor: '#D80000',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  reorderText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: 'white',
    borderRadius: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
});