// screens/OrderConfirmationScreen.js
import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Lottie from 'lottie-react-native';

const OrderConfirmationScreen = ({ route, navigation }) => {
    const { orderTotal, orderItems } = route.params || {};

    const handleBackToHome = () => {
        navigation.navigate('Home');
    };

    const handleViewOrders = () => {
        navigation.navigate('Orders');
    };
    const simulatePayment = () => {
        Alert.alert(
            'Confirmar Pedido',
            `¿Proceder con el pago de $${calculateTotal().toFixed(2)}?`,
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Confirmar Pago',
                    onPress: () => {
                        // Navegar a la pantalla de confirmación
                        navigation.navigate('OrderConfirmation', {
                            orderTotal: calculateTotal(),
                            orderItems: cartItems
                        });

                        // Limpiar el carrito después de navegar
                        setCartItems([]);
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <LinearGradient
                colors={['#ffffff', '#ffffff', '#ffffff']}
                style={styles.backgroundGradient}
            />

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
                        source={require('../assets/animations/conffeti.json')}
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
                        <Text style={styles.orderNumber}>Orden #{(Math.random() * 10000).toFixed(0)}</Text>
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
        backgroundColor: '#000000',
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
        backgroundColor: 'rgba(255, 255, 255, 0.56)',
        borderRadius: 15,
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 25,
        alignItems: 'center',
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 10,
    },
    successMessage: {
        fontSize: 16,
        color: '#ffffffff',
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
        color: '#ffffffff',
        fontWeight: '500',
    },
    orderTotal: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4d7c40ff',
    },
    detailsContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.56)',
        borderRadius: 15,
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
    },
    detailsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffffff',
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
        color: '#ffffffff',
        flex: 1,
    },
    itemQuantity: {
        fontSize: 14,
        color: '#ffffffff',
        marginHorizontal: 10,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ffffffff',
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
        color: '#ffffffff',
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#4d7c40ff',
    },
    infoContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.56)',
        borderRadius: 15,
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
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
        color: '#ffffffff',
    },
    infoSubtitle: {
        fontSize: 12,
        color: '#ffffffff',
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
        backgroundColor: '#D80000',
        paddingHorizontal: 10,
        paddingVertical: 15,
        borderRadius: 25,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#D80000',
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
        backgroundColor: '#ffff',

    },
    secondaryButtonText: {
        color: '#D80000',
        fontSize: 10,
        fontWeight: 'bold',
    },
});

export default OrderConfirmationScreen;