// screens/CartScreen.js
import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    StatusBar,
    Alert,
    Modal,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { clearCart, removeFromCart, updateQuantity } from '../store/slices/cartSlice';
import FlashMessageWrapper, { showSuccessMessage, showInfoMessage, showErrorMessage, showWarningMessage } from '../components/FlashMessageWrapper';
import imageMap from '../assets/utils/imageMap';
const { width: screenWidth } = Dimensions.get('window');

const CartScreen = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const cartItems = useAppSelector(state => state.cart.items);
    const [showMercadoPago, setShowMercadoPago] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoBack = () => {
        navigation.goBack();
    };

    const backHome = () => {
        navigation.goBack('Home');
    };

    const calculateSubtotal = () => {
        return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const calculateTotal = () => {
        return calculateSubtotal() + 2.99;
    };

    // ✅ FUNCIÓN PARA VER DETALLE DEL PRODUCTO
    const handleViewProductDetail = (item) => {
        // Encontrar el imageKey basado en la imagen
        const imageKey = Object.keys(imageMap).find(key =>
            imageMap[key] === item.image
        ) || 'imgBurger1'; // Valor por defecto

        // Crear un objeto foodItem compatible con FoodDetailScreen
        const foodItem = {
            id: item.id,
            name: item.name,
            price: `$${item.price.toFixed(2)}`,
            imageKey: imageKey,
            descriptionText: item.description || 'Delicioso plato preparado con los mejores ingredientes.',
            ingredientText: ['Ingrediente fresco 1', 'Ingrediente premium 2', 'Ingrediente especial 3']
        };

        navigation.navigate('FoodDetail', { foodItem });
    };

    // ✅ FUNCIONES PARA MANEJAR CANTIDADES CON MENSAJES
    const handleIncreaseQuantity = (itemId) => {
        const item = cartItems.find(item => item.id === itemId);
        if (item) {
            dispatch(updateQuantity({ id: itemId, quantity: item.quantity + 1 }));
            showInfoMessage(
                'Cantidad actualizada',
                `${item.name}: ${item.quantity + 1} unidades`
            );
        }
    };

    const handleDecreaseQuantity = (itemId) => {
        const item = cartItems.find(item => item.id === itemId);
        if (item && item.quantity > 1) {
            dispatch(updateQuantity({ id: itemId, quantity: item.quantity - 1 }));
            showInfoMessage(
                'Cantidad actualizada',
                `${item.name}: ${item.quantity - 1} unidades`
            );
        } else if (item && item.quantity === 1) {
            // Si es 1 y intenta disminuir, sugerir eliminar
            showRemoveConfirmation(item.id, item.name);
        }
    };

    // ✅ FUNCIÓN DE CONFIRMACIÓN PARA ELIMINAR PRODUCTO
    const showRemoveConfirmation = (itemId, itemName) => {
        Alert.alert(
            'Eliminar producto',
            `¿Quieres eliminar "${itemName}" del carrito?`,
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Eliminar',
                    onPress: () => handleRemoveItem(itemId, itemName),
                    style: 'destructive'
                }
            ]
        );
    };

    // ✅ FUNCIÓN PARA ELIMINAR PRODUCTO CON MENSAJE
    const handleRemoveItem = (itemId, itemName) => {
        dispatch(removeFromCart(itemId));
        showErrorMessage(
            'Producto eliminado',
            `${itemName} se ha removido del carrito`
        );
    };

    // ✅ FUNCIÓN PARA VACIAR CARRITO
    const handleClearCart = () => {
        if (cartItems.length === 0) return;

        Alert.alert(
            'Vaciar carrito',
            '¿Estás seguro de que quieres vaciar todo el carrito?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Vaciar',
                    onPress: () => {
                        dispatch(clearCart());
                        showWarningMessage(
                            'Carrito vaciado',
                            'Todos los productos han sido removidos'
                        );
                    },
                    style: 'destructive'
                }
            ]
        );
    };

    // Función para crear la preferencia de pago
    const createMercadoPagoPreference = async () => {
        setLoading(true);

        try {
            const mockPreference = {
                id: 'mock_preference_123456',
                init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=mock123'
            };

            await new Promise(resolve => setTimeout(resolve, 1500));
            return mockPreference;

        } catch (error) {
            console.error('Error creando preferencia:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Iniciar pago con Mercado Pago
    const handleMercadoPagoPayment = async () => {
        if (cartItems.length === 0) {
            showWarningMessage('Carrito vacío', 'Agrega productos al carrito antes de pagar');
            return;
        }

        try {
            const preference = await createMercadoPagoPreference();

            Alert.alert(
                'Simulación Mercado Pago',
                `¿Proceder con pago de $${calculateTotal().toFixed(2)}?`,
                [
                    {
                        text: 'Cancelar',
                        style: 'cancel'
                    },
                    {
                        text: 'Pagar Exitoso',
                        onPress: () => handlePaymentSuccess()
                    },
                    {
                        text: 'Pago Rechazado',
                        onPress: () => handlePaymentFailure()
                    }
                ]
            );

        } catch (error) {
            showErrorMessage('Error', 'No se pudo iniciar el proceso de pago');
        }
    };

    // Manejar pago exitoso
    const handlePaymentSuccess = () => {
        setShowMercadoPago(false);
        showSuccessMessage(
            '¡Pago Exitoso!',
            `Tu pedido de $${calculateTotal().toFixed(2)} ha sido confirmado`
        );

        // Navegar después de mostrar el mensaje
        setTimeout(() => {
            dispatch(clearCart());
            navigation.navigate('OrderConfirmation', {
                orderTotal: calculateTotal(),
                orderItems: cartItems
            });
        }, 2000);
    };

    // Manejar pago fallido
    const handlePaymentFailure = () => {
        setShowMercadoPago(false);
        showErrorMessage(
            'Pago Rechazado',
            'El pago no pudo ser procesado. Por favor, intenta nuevamente.'
        );
    };

    // WebView para Mercado Pago (para producción)
    const handleWebViewNavigation = (navState) => {
        const { url } = navState;

        if (url.includes('success')) {
            setShowMercadoPago(false);
            handlePaymentSuccess();
        } else if (url.includes('failure')) {
            setShowMercadoPago(false);
            handlePaymentFailure();
        } else if (url.includes('pending')) {
            setShowMercadoPago(false);
            showInfoMessage('Pago Pendiente', 'Tu pago está siendo procesado.');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <LinearGradient
                colors={['#ffffffff', '#ffffffff', '#ffffffff']}
                style={styles.backgroundGradient}
            />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>

                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Mi Carrito</Text>
                        <Text style={styles.itemCount}>
                            {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}
                        </Text>
                    </View>

                    {/* ✅ BOTÓN PARA VACIAR CARRITO */}
                    {cartItems.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearCartButton}
                            onPress={handleClearCart}
                        >
                            <Ionicons name="trash-outline" size={20} color="white" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {cartItems.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="cart-outline" size={80} color="#ffff" />
                        <Text style={styles.emptyText}>Tu carrito está vacío</Text>
                        <Text style={styles.emptySubtext}>Agrega algunos productos deliciosos</Text>
                        <TouchableOpacity
                            style={styles.continueShoppingButton}
                            onPress={backHome}
                        >
                            <Text style={styles.continueShoppingText}>Continuar Comprando</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* Lista de items - ACTUALIZADA CON NAVEGACIÓN */}
                        <View style={styles.itemsContainer}>
                            {cartItems.map((item) => (

                                <View key={item.id} style={styles.cartItem}>
                                    {/* ✅ IMAGEN CLICKEABLE */}
                                    <TouchableOpacity
                                        onPress={() => handleViewProductDetail(item)}
                                        style={styles.imageTouchable}
                                    >
                                        <Image source={item.image} style={styles.itemImage} />
                                    </TouchableOpacity>

                                    <View style={styles.itemInfo}>
                                        {/* ✅ TÍTULO CLICKEABLE */}
                                        <TouchableOpacity
                                            onPress={() => handleViewProductDetail(item)}
                                            style={styles.titleTouchable}
                                        >
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            {item.isPromo && (
                                                <Text style={styles.promoBadge}>🎯 PROMO</Text>
                                            )}
                                        </TouchableOpacity>

                                        {/* ✅ MOSTRAR PRECIO UNITARIO Y TOTAL */}
                                        <View style={styles.priceContainer}>
                                            <Text style={styles.itemPrice}>
                                                ${item.price.toFixed(2)} c/u
                                            </Text>
                                            {item.originalPrice && (
                                                <Text style={styles.originalPrice}>
                                                    {String(item.originalPrice)} {/* ✅ Asegurar que sea string */}
                                                </Text>
                                            )}
                                        </View>

                                        {/* Contador de cantidad */}
                                        <View style={styles.quantityContainer}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.quantityButton,
                                                    item.quantity === 1 && styles.quantityButtonDisabled
                                                ]}
                                                onPress={() => handleDecreaseQuantity(item.id)}
                                                disabled={item.quantity === 1}
                                            >
                                                <Ionicons
                                                    name="remove"
                                                    size={16}
                                                    color={item.quantity === 1 ? "#ccc" : "#ff8700"}
                                                />
                                            </TouchableOpacity>

                                            <Text style={styles.quantityText}>{item.quantity}</Text>

                                            <TouchableOpacity
                                                style={styles.quantityButton}
                                                onPress={() => handleIncreaseQuantity(item.id)}
                                            >
                                                <Ionicons name="add" size={16} color="#ff8700" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.itemRightSection}>
                                        {/* ✅ BOTÓN ELIMINAR CON CONFIRMACIÓN */}
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => showRemoveConfirmation(item.id, item.name)}
                                        >
                                            <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                        </TouchableOpacity>

                                        {/* ✅ MOSTRAR EL TOTAL DEL ITEM (precio × cantidad) */}
                                        <View style={styles.totalContainer}>
                                            <Text style={styles.itemTotal}>
                                                ${(item.price * item.quantity).toFixed(2)}
                                            </Text>
                                            {item.quantity > 1 && (
                                                <Text style={styles.unitCalculation}>
                                                    {item.quantity} × ${item.price.toFixed(2)}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Resumen del pedido */}
                        <View style={styles.summaryContainer}>
                            <Text style={styles.summaryTitle}>Resumen del Pedido</Text>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>
                                    Subtotal ({cartItems.reduce((total, item) => total + item.quantity, 0)} productos)
                                </Text>
                                <Text style={styles.summaryValue}>${calculateSubtotal().toFixed(2)}</Text>
                            </View>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Envío</Text>
                                <Text style={styles.summaryValue}>$2.99</Text>
                            </View>

                            <View style={[styles.summaryRow, styles.totalRow]}>
                                <Text style={styles.summaryLabel}>Total</Text>
                                <Text style={styles.summaryTotal}>${calculateTotal().toFixed(2)}</Text>
                            </View>
                        </View>

                        {/* Botón de pago */}
                        <TouchableOpacity
                            style={[styles.mercadoPagoButton, loading && styles.buttonDisabled]}
                            onPress={handleMercadoPagoPayment}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text style={styles.mercadoPagoText}>
                                        Pagar con Mercado Pago
                                    </Text>
                                    <Text style={styles.mercadoPagoAmount}>
                                        ${calculateTotal().toFixed(2)}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.demoNote}>
                            💡 Modo Desarrollo: Elige "Pagar Exitoso" o "Pago Rechazado" para simular
                        </Text>
                    </>
                )}
            </ScrollView>

            {/* ✅ FLASH MESSAGE WRAPPER */}
            <FlashMessageWrapper />

            {/* Modal para Mercado Pago WebView (producción) */}
            <Modal
                visible={showMercadoPago}
                animationType="slide"
                onRequestClose={() => setShowMercadoPago(false)}
            >
                <View style={styles.webViewContainer}>
                    <View style={styles.webViewHeader}>
                        <TouchableOpacity
                            onPress={() => setShowMercadoPago(false)}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.webViewTitle}>Mercado Pago</Text>
                    </View>

                    <WebView
                        source={{ uri: checkoutUrl }}
                        onNavigationStateChange={handleWebViewNavigation}
                        style={styles.webView}
                    />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    backgroundGradient: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    scrollView: {
        flex: 1,
        marginTop: 130,
    },
    scrollContent: {
        paddingBottom: 30,
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
        justifyContent: 'space-between',
        paddingVertical: 15,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    itemCount: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 2,
    },
    clearCartButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.56)',
        borderRadius: 15,
        marginHorizontal: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffffff',
        marginTop: 20,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#ffffffff',
        marginTop: 5,
        marginBottom: 20,
    },
    continueShoppingButton: {
        backgroundColor: '#D80000',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
    },
    continueShoppingText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    itemsContainer: {
        backgroundColor: 'rgba(153, 153, 153, 0.56)',
        borderRadius: 15,
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 15,
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    // ✅ NUEVOS ESTILOS PARA ELEMENTOS CLICKEABLES
    imageTouchable: {
        borderRadius: 10,
        overflow: 'hidden',
    },
    titleTouchable: {
        marginBottom: 4,
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 10,
    },
    itemInfo: {
        flex: 1,
        marginLeft: 15,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffffff',
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 14,
        color: '#ffffffff',
        marginBottom: 8,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(153, 153, 153, 0.56)',
        borderRadius: 20,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    quantityButton: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        backgroundColor: 'white',
    },
    quantityButtonDisabled: {
        backgroundColor: '#f0f0f0',
    },
    quantityText: {
        fontSize: 14,
        fontWeight: '600',
        marginHorizontal: 12,
        minWidth: 20,
        textAlign: 'center',
        color: '#333',
    },
    itemRightSection: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 110,
    },
    deleteButton: {
        padding: 6,
        borderRadius: 20,
        backgroundColor: 'hsla(0, 0%, 100%, 0.36)',
        marginBottom: 8,
    },
    itemTotal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffffff',
    },
    summaryContainer: {
        backgroundColor: 'rgba(153, 153, 153, 0.56)',
        borderRadius: 15,
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffffff',
        marginBottom: 15,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
        marginTop: 5,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#ffffffff',
    },
    summaryValue: {
        fontSize: 14,
        color: '#ffffffff',
        fontWeight: '500',
    },
    summaryTotal: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4d7c40ff',
    },
    mercadoPagoButton: {
        backgroundColor: '#009EE3',
        marginHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 25,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    buttonDisabled: {
        backgroundColor: '#cccccc',
    },
    mercadoPagoText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    mercadoPagoAmount: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    demoNote: {
        textAlign: 'center',
        color: '#000000ff',
        fontSize: 12,
        marginTop: 10,
        marginHorizontal: 20,
        fontStyle: 'italic',
    },
    webViewContainer: {
        flex: 1,
        marginTop: 40,
    },
    webViewHeader: {
        backgroundColor: '#009EE3',
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    closeButton: {
        marginRight: 15,
    },
    webViewTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    webView: {
        flex: 1,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    originalPrice: {
        fontSize: 10,
        bottom: 3,
        color: '#ff4444',
        textDecorationLine: 'line-through',
    },
    promoBadge: {
        fontSize: 10,
        color: '#FF6B35',
        fontWeight: 'bold',
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 2,
    },
    totalContainer: {
        alignItems: 'flex-end',
    },
    unitCalculation: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 2,
    },
});

export default CartScreen;