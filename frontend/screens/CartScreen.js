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
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { clearCart, removeFromCart, updateQuantity } from '../store/slices/cartSlice';
import API from '../services/api';
import FlashMessageWrapper, { showSuccessMessage, showErrorMessage, showWarningMessage } from '../components/FlashMessageWrapper';
import imageMap from '../assets/utils/imageMap';

const { width: screenWidth } = Dimensions.get('window');

const CartScreen = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const insets = useSafeAreaInsets();
    const cartItems = useAppSelector(state => state.cart.items);
    const selectedRestaurant = useAppSelector(state => state.restaurant.selected);
    const [showMercadoPago, setShowMercadoPago] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);

    const HEADER_HEIGHT = insets.top + 74;

    const handleGoBack = () => {
        navigation.goBack();
    };

    const backHome = () => {
        navigation.goBack('Home');
    };

    const calculateSubtotal = () => {
        return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const calculateDiscount = () => {
        return couponApplied ? calculateSubtotal() * 0.1 : 0;
    };

    const calculateTotal = () => {
        return calculateSubtotal() - calculateDiscount() + 2.99;
    };

    const handleApplyCoupon = () => {
        if (couponCode.trim().toUpperCase() === 'PROMO10') {
            setCouponApplied(true);
            showSuccessMessage('Cupon aplicado', '10% de descuento en tu pedido');
        } else {
            showErrorMessage('Cupon invalido', 'Verifica el codigo e intenta de nuevo');
        }
    };

    const handleViewProductDetail = (item) => {
        const imageKey = Object.keys(imageMap).find(key =>
            imageMap[key] === item.image
        ) || 'imgBurger1';

        const foodItem = {
            id: item.id,
            name: item.name,
            price: `$${item.price.toFixed(2)}`,
            imageKey: imageKey,
            descriptionText: item.description || 'Delicioso plato preparado con los mejores ingredientes.',
            ingredientText: item.ingredientText || [],
        };

        navigation.navigate('FoodDetail', { foodItem });
    };

    const handleIncreaseQuantity = (itemId) => {
        const item = cartItems.find(i => i.id === itemId);
        if (item) {
            dispatch(updateQuantity({ id: itemId, quantity: item.quantity + 1 }));
        }
    };

    const handleDecreaseQuantity = (itemId) => {
        const item = cartItems.find(i => i.id === itemId);
        if (item && item.quantity > 1) {
            dispatch(updateQuantity({ id: itemId, quantity: item.quantity - 1 }));
        }
    };

    const showRemoveConfirmation = (itemId, itemName) => {
        Alert.alert(
            'Eliminar producto',
            `¿Quieres eliminar "${itemName}" del carrito?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    onPress: () => handleRemoveItem(itemId, itemName),
                    style: 'destructive'
                }
            ]
        );
    };

    const handleRemoveItem = (itemId, itemName) => {
        dispatch(removeFromCart(itemId));
        showErrorMessage('Producto eliminado', `${itemName} se ha removido del carrito`);
    };

    const handleClearCart = () => {
        if (cartItems.length === 0) return;
        Alert.alert(
            'Vaciar carrito',
            '¿Estas seguro de que quieres vaciar todo el carrito?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Vaciar',
                    onPress: () => {
                        dispatch(clearCart());
                        showWarningMessage('Carrito vaciado', 'Todos los productos han sido removidos');
                    },
                    style: 'destructive'
                }
            ]
        );
    };

    const createMercadoPagoPreference = async () => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return { id: 'mock_preference_123456' };
        } catch (error) {
            console.error('Error creando preferencia:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleMercadoPagoPayment = async () => {
        if (cartItems.length === 0) {
            showWarningMessage('Carrito vacio', 'Agrega productos al carrito antes de pagar');
            return;
        }
        try {
            await createMercadoPagoPreference();
            Alert.alert(
                'Simulacion Mercado Pago',
                `Proceder con pago de $${calculateTotal().toFixed(2)}?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Pagar Exitoso', onPress: () => handlePaymentSuccess() },
                    { text: 'Pago Rechazado', onPress: () => handlePaymentFailure() }
                ]
            );
        } catch (error) {
            showErrorMessage('Error', 'No se pudo iniciar el proceso de pago');
        }
    };

    const handlePaymentSuccess = async () => {
        setShowMercadoPago(false);
        const total = calculateTotal();
        const itemsSnapshot = [...cartItems];

        const orderItems = itemsSnapshot.map(item => ({
            menu_item_id: item.id,
            nombre_item: item.name,
            precio_unitario: item.price,
            cantidad: item.quantity,
            ingredientes_removidos: item.removedIngredients || [],
        }));

        if (!selectedRestaurant?.id) {
            showErrorMessage('Error', 'No se pudo identificar el restaurante. Volvé al menú y reintentá.');
            return;
        }

        try {
            const res = await API.orders.create(
                selectedRestaurant.id,
                orderItems,
                'Dirección registrada',
                ''
            );

            if (!res.success) {
                showErrorMessage('Error al crear pedido', res.message || 'Intentá de nuevo');
                return;
            }

            dispatch(clearCart());

            navigation.navigate('OrderConfirmation', {
                orderId: res.order?.id,
                orderTotal: total,
                orderItems: itemsSnapshot,
            });
        } catch (err) {
            showErrorMessage('Error de conexión', 'No se pudo crear el pedido. Revisá tu conexión.');
        }
    };

    const handlePaymentFailure = () => {
        setShowMercadoPago(false);
        showErrorMessage('Pago Rechazado', 'El pago no pudo ser procesado. Por favor, intenta nuevamente.');
    };

    const handleWebViewNavigation = (navState) => {
        const { url } = navState;
        if (url.includes('success')) { setShowMercadoPago(false); handlePaymentSuccess(); }
        else if (url.includes('failure')) { setShowMercadoPago(false); handlePaymentFailure(); }
    };

    const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <LinearGradient
                colors={['#F8F8F8', '#F8F8F8']}
                style={styles.backgroundGradient}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={handleGoBack}
                        style={styles.headerButton}
                        accessibilityLabel="Volver"
                        accessibilityRole="button"
                    >
                        <Ionicons name="arrow-back" size={22} color="white" />
                    </TouchableOpacity>

                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Mi Carrito</Text>
                        <Text style={styles.itemCount}>
                            {totalQuantity} {totalQuantity === 1 ? 'producto' : 'productos'}
                        </Text>
                    </View>

                    {cartItems.length > 0 ? (
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={handleClearCart}
                            accessibilityLabel="Vaciar carrito"
                            accessibilityRole="button"
                        >
                            <Ionicons name="trash-outline" size={20} color="white" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.headerButton} />
                    )}
                </View>
            </View>

            <ScrollView
                style={[styles.scrollView, { marginTop: HEADER_HEIGHT }]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {cartItems.length === 0 ? (
                    /* --- Empty State --- */
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconWrapper}>
                            <Ionicons name="cart-outline" size={56} color="#FF8700" />
                        </View>
                        <Text style={styles.emptyText}>Tu carrito esta vacio</Text>
                        <Text style={styles.emptySubtext}>Agrega algunos productos deliciosos</Text>
                        <TouchableOpacity style={styles.continueShoppingButton} onPress={backHome}>
                            <Text style={styles.continueShoppingText}>Continuar comprando</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* --- Lista de items --- */}
                        <View style={styles.itemsContainer}>
                            {cartItems.map((item, index) => (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.cartItem,
                                        index === cartItems.length - 1 && styles.cartItemLast
                                    ]}
                                >
                                    <TouchableOpacity
                                        onPress={() => handleViewProductDetail(item)}
                                        style={styles.imageTouchable}
                                        accessibilityLabel={`Ver detalle de ${item.name}`}
                                    >
                                        <Image source={item.image} style={styles.itemImage} />
                                    </TouchableOpacity>

                                    <View style={styles.itemInfo}>
                                        <TouchableOpacity onPress={() => handleViewProductDetail(item)}>
                                            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                                        </TouchableOpacity>

                                        {item.isPromo && (
                                            <View style={styles.promoBadge}>
                                                <Ionicons name="pricetag" size={10} color="#FF6B35" />
                                                <Text style={styles.promoBadgeText}>PROMO</Text>
                                            </View>
                                        )}

                                        {/* Ingredientes removidos */}
                                        {item.removedIngredients && item.removedIngredients.length > 0 && (
                                            <Text style={styles.removedIngText} numberOfLines={1}>
                                                Sin: {item.removedIngredients.join(', ')}
                                            </Text>
                                        )}

                                        <View style={styles.priceContainer}>
                                            <Text style={styles.itemPrice}>${item.price.toFixed(2)} c/u</Text>
                                            {item.originalPrice && (
                                                <Text style={styles.originalPrice}>{String(item.originalPrice)}</Text>
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
                                                accessibilityLabel="Disminuir cantidad"
                                            >
                                                <Ionicons
                                                    name="remove"
                                                    size={16}
                                                    color={item.quantity === 1 ? '#ccc' : '#FF8700'}
                                                />
                                            </TouchableOpacity>

                                            <Text style={styles.quantityText}>{item.quantity}</Text>

                                            <TouchableOpacity
                                                style={styles.quantityButton}
                                                onPress={() => handleIncreaseQuantity(item.id)}
                                                accessibilityLabel="Aumentar cantidad"
                                            >
                                                <Ionicons name="add" size={16} color="#FF8700" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.itemRightSection}>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => showRemoveConfirmation(item.id, item.name)}
                                            accessibilityLabel={`Eliminar ${item.name}`}
                                            accessibilityRole="button"
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#FF4444" />
                                        </TouchableOpacity>

                                        <View style={styles.totalContainer}>
                                            <Text style={styles.itemTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
                                            {item.quantity > 1 && (
                                                <Text style={styles.unitCalculation}>
                                                    {item.quantity} x ${item.price.toFixed(2)}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* --- Campo de cupon --- */}
                        <View style={styles.couponContainer}>
                            <Ionicons name="ticket-outline" size={20} color="#FF8700" style={styles.couponIcon} />
                            <TextInput
                                style={styles.couponInput}
                                placeholder="Codigo de descuento"
                                placeholderTextColor="#999"
                                value={couponCode}
                                onChangeText={setCouponCode}
                                autoCapitalize="characters"
                                editable={!couponApplied}
                            />
                            {couponApplied ? (
                                <View style={styles.couponApplied}>
                                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                                    <Text style={styles.couponAppliedText}>-10%</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.couponButton}
                                    onPress={handleApplyCoupon}
                                    disabled={!couponCode.trim()}
                                >
                                    <Text style={styles.couponButtonText}>Aplicar</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* --- Resumen del pedido --- */}
                        <View style={styles.summaryContainer}>
                            <Text style={styles.summaryTitle}>Resumen del pedido</Text>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>
                                    Subtotal ({totalQuantity} {totalQuantity === 1 ? 'producto' : 'productos'})
                                </Text>
                                <Text style={styles.summaryValue}>${calculateSubtotal().toFixed(2)}</Text>
                            </View>

                            {couponApplied && (
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, styles.discountLabel]}>Descuento (10%)</Text>
                                    <Text style={styles.discountValue}>-${calculateDiscount().toFixed(2)}</Text>
                                </View>
                            )}

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Envio</Text>
                                <Text style={styles.summaryValue}>$2.99</Text>
                            </View>

                            <View style={[styles.summaryRow, styles.totalRow]}>
                                <Text style={styles.summaryLabelTotal}>Total</Text>
                                <Text style={styles.summaryTotal}>${calculateTotal().toFixed(2)}</Text>
                            </View>
                        </View>

                        {/* --- Boton de pago --- */}
                        <TouchableOpacity
                            style={[styles.payButton, loading && styles.buttonDisabled]}
                            onPress={handleMercadoPagoPayment}
                            disabled={loading}
                            accessibilityLabel={`Pagar $${calculateTotal().toFixed(2)}`}
                            accessibilityRole="button"
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <View style={styles.payButtonLeft}>
                                        <Ionicons name="card-outline" size={20} color="white" />
                                        <Text style={styles.payButtonText}>Pagar con Mercado Pago</Text>
                                    </View>
                                    <Text style={styles.payButtonAmount}>${calculateTotal().toFixed(2)}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            <FlashMessageWrapper />

            {/* Modal para Mercado Pago WebView */}
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
        backgroundColor: '#F8F8F8',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 40,
    },

    /* Header */
    header: {
        backgroundColor: '#FF8000',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    headerContent: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 14,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
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
        fontFamily: 'Poppins-Bold',
        fontWeight: 'bold',
        fontSize: 18,
    },
    itemCount: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: 1,
    },

    /* Empty state */
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        marginHorizontal: 20,
        backgroundColor: '#fff',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    emptyIconWrapper: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(255,135,0,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
        color: '#1a1a1a',
        marginBottom: 6,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#888',
        fontFamily: 'Poppins-Regular',
        marginBottom: 24,
    },
    continueShoppingButton: {
        backgroundColor: '#FF8700',
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 25,
    },
    continueShoppingText: {
        color: 'white',
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
        fontSize: 15,
    },

    /* Items */
    itemsContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 16,
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    cartItemLast: {
        borderBottomWidth: 0,
    },
    imageTouchable: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    itemImage: {
        width: 64,
        height: 64,
        borderRadius: 12,
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        fontFamily: 'Poppins-SemiBold',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    promoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    promoBadgeText: {
        fontSize: 10,
        color: '#FF6B35',
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
    },
    removedIngText: {
        fontSize: 11,
        color: '#999',
        fontFamily: 'Poppins-Regular',
        fontStyle: 'italic',
        marginBottom: 4,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    itemPrice: {
        fontSize: 13,
        color: '#666',
        fontFamily: 'Poppins-Regular',
    },
    originalPrice: {
        fontSize: 11,
        color: '#ff4444',
        textDecorationLine: 'line-through',
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        alignSelf: 'flex-start',
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    quantityButton: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    quantityButtonDisabled: {
        backgroundColor: '#f5f5f5',
        shadowOpacity: 0,
        elevation: 0,
    },
    quantityText: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Poppins-SemiBold',
        marginHorizontal: 10,
        minWidth: 18,
        textAlign: 'center',
        color: '#1a1a1a',
    },
    itemRightSection: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        minHeight: 80,
        marginLeft: 8,
    },
    deleteButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,68,68,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    totalContainer: {
        alignItems: 'flex-end',
    },
    itemTotal: {
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
        color: '#1a1a1a',
    },
    unitCalculation: {
        fontSize: 10,
        color: '#aaa',
        fontFamily: 'Poppins-Regular',
        marginTop: 2,
    },

    /* Cupon */
    couponContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        borderStyle: 'dashed',
    },
    couponIcon: {
        marginRight: 10,
    },
    couponInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: '#1a1a1a',
        paddingVertical: 4,
    },
    couponButton: {
        backgroundColor: '#FF8700',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    couponButtonText: {
        color: 'white',
        fontWeight: '600',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },
    couponApplied: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    couponAppliedText: {
        color: '#4CAF50',
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
    },

    /* Resumen */
    summaryContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
        color: '#1a1a1a',
        marginBottom: 14,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Poppins-Regular',
    },
    summaryLabelTotal: {
        fontSize: 15,
        fontWeight: '600',
        fontFamily: 'Poppins-SemiBold',
        color: '#1a1a1a',
    },
    summaryValue: {
        fontSize: 14,
        color: '#1a1a1a',
        fontFamily: 'Poppins-SemiBold',
        fontWeight: '500',
    },
    discountLabel: {
        color: '#4CAF50',
    },
    discountValue: {
        fontSize: 14,
        color: '#4CAF50',
        fontFamily: 'Poppins-SemiBold',
        fontWeight: '600',
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 12,
        marginTop: 4,
        marginBottom: 0,
    },
    summaryTotal: {
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
        color: '#FF8700',
    },

    /* Boton de pago */
    payButton: {
        backgroundColor: '#009EE3',
        marginHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        shadowColor: '#009EE3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
        shadowOpacity: 0,
        elevation: 0,
    },
    payButtonLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    payButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
    },
    payButtonAmount: {
        color: 'white',
        fontSize: 17,
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
    },

    /* WebView */
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
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    webViewTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
    },
    webView: {
        flex: 1,
    },
});

export default CartScreen;
