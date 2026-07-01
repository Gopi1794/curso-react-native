// screens/orders/OrderConfirmationScreen.js
import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Lottie from 'lottie-react-native';

const OrderConfirmationScreen = ({ route, navigation }) => {
    const { orderTotal, orderItems, orderId } = route.params || {};

    const handleBackToHome = () => {
        navigation.navigate('HomeScreen');
    };

    const handleViewOrders = () => {
        if (orderId) {
            navigation.navigate('OrdersTab', {
                screen: 'OrderDetail',
                params: { orderId },
            });
        } else {
            navigation.navigate('OrdersTab');
        }
    };
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            <View style={styles.backgroundGradient} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>¡Pedido Confirmado!</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Animación de éxito */}
                <View style={styles.animationContainer}>
                    <Lottie
                        source={require('../../assets/animations/conffeti.json')}
                        autoPlay
                        loop={false}
                        style={styles.confettiAnimation}
                    />
                    <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
                </View>

                {/* Mensaje de confirmación */}
                <View style={styles.messageContainer}>
                    <Text style={styles.successTitle}>¡Pago Exitoso!</Text>
                    <Text style={styles.successMessage}>
                        Tu pedido ha sido confirmado y está siendo preparado
                    </Text>

                    <View style={styles.orderSummary}>
                        <Text style={styles.orderNumber}>Orden #{orderId ?? '—'}</Text>
                        <Text style={styles.orderTotal}>Total: ${orderTotal?.toFixed(2) || '0.00'}</Text>
                    </View>
                </View>

                {/* Detalles del pedido */}
                <View style={styles.detailsContainer}>
                    <Text style={styles.detailsTitle}>Resumen del Pedido</Text>

                    {orderItems?.map((item, index) => (
                        <View key={index} style={styles.orderItem}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                            <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                        </View>
                    ))}

                    <View style={styles.divider} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalAmount}>${orderTotal?.toFixed(2) || '0.00'}</Text>
                    </View>
                </View>

                {/* Información de entrega */}
                <View style={styles.infoContainer}>
                    <View style={styles.infoItem}>
                        <Ionicons name="time-outline" size={20} color="#ff8700" />
                        <View style={styles.infoText}>
                            <Text style={styles.infoTitle}>Tiempo estimado</Text>
                            <Text style={styles.infoSubtitle}>25-35 minutos</Text>
                        </View>
                    </View>

                    <View style={styles.infoItem}>
                        <Ionicons name="location-outline" size={20} color="#ff8700" />
                        <View style={styles.infoText}>
                            <Text style={styles.infoTitle}>Dirección de entrega</Text>
                            <Text style={styles.infoSubtitle}>Tu dirección registrada</Text>
                        </View>
                    </View>
                </View>
                {/* Botones de acción */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleViewOrders}
                    >
                        <Text style={styles.secondaryButtonText}>Ver Mis Pedidos</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleBackToHome}
                    >
                        <Text style={styles.primaryButtonText}>Seguir Comprando</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>


        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    backgroundGradient: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    scrollView: {
        flex: 1,
        marginTop: 100,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    header: {
        backgroundColor: '#de6f00ff',
        position: 'absolute',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
        top: 0,
        left: 0,
        right: 0,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        zIndex: 1000,
        paddingTop: StatusBar.currentHeight || 10,
    },
    headerContent: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
    },
    headerTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 20,
    },
    animationContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
    },
    confettiAnimation: {
        position: 'absolute',
        width: 300,
        height: 300,
    },
    messageContainer: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 10,
    },
    successMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    orderSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 10,
    },
    orderNumber: {
        fontSize: 14,
        color: '#888',
        fontWeight: '500',
    },
    orderTotal: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ff8700',
    },
    detailsContainer: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    detailsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 15,
    },
    orderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    itemName: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    itemQuantity: {
        fontSize: 14,
        color: '#888',
        marginHorizontal: 10,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 10,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#222',
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ff8700',
    },
    infoContainer: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    infoText: {
        marginLeft: 15,
        flex: 1,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    infoSubtitle: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    actionButtons: {
        position: 'relative',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    primaryButton: {
        backgroundColor: '#ff8700',
        paddingHorizontal: 10,
        paddingVertical: 15,
        borderRadius: 25,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
    },
    secondaryButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#ff8700',
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#ff8700',
        fontSize: 13,
        fontWeight: 'bold',
    },
});

export default OrderConfirmationScreen;