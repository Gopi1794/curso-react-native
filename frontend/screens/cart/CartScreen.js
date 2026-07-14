// screens/cart/CartScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    StatusBar,
    Modal,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { Dialog, Portal, Button, Paragraph } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MP_LOGO_COLOR } from '../../assets/img/mercadopago/logos';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import AppHeader from '../../components/common/AppHeader';
import AddAddressSheet from '../../components/common/AddAddressSheet';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { clearCart, removeFromCart, updateQuantity } from '../../store/slices/cartSlice';
import API from '../../services/api';
import FlashMessageWrapper, { showSuccessMessage, showErrorMessage, showWarningMessage } from '../../components/FlashMessageWrapper';
import imageMap from '../../assets/utils/imageMap';

const { width: screenWidth } = Dimensions.get('window');

const CartScreen = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const insets = useSafeAreaInsets();
    const cartItems = useAppSelector(state => state.cart.items);
    const selectedRestaurant = useAppSelector(state => state.restaurant.selected);
    const [currentOrderId, setCurrentOrderId] = useState(null);
    const [currentOrderItems, setCurrentOrderItems] = useState([]);
    const [loadingMP, setLoadingMP] = useState(false);
    const [loadingEfectivo, setLoadingEfectivo] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [couponDiscount, setCouponDiscount] = useState(10);
    const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
    const [couponEsRuleta, setCouponEsRuleta] = useState(false);
    const [couponHabilitado, setCouponHabilitado] = useState(true);
    const [couponDisabledReason, setCouponDisabledReason] = useState(null);
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({ title: '', message: '', onConfirm: null });
    const [addresses, setAddresses] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [addressPickerVisible, setAddressPickerVisible] = useState(false);
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [pendingOrderId, setPendingOrderId] = useState(null);

    const checkPendingOrder = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem('pendingOrderId');
            if (!stored) return;
            const orderStatus = await API.orders.getById(Number(stored));
            const aprobado = ['confirmado', 'preparando', 'en_preparacion', 'listo', 'entregado'].includes(orderStatus.order?.estado);
            if (aprobado) {
                await AsyncStorage.removeItem('pendingOrderId');
                setPendingOrderId(null);
            } else {
                setPendingOrderId(Number(stored));
            }
        } catch {
            setPendingOrderId(null);
        }
    }, []);

    const loadAddresses = async () => {
        try {
            const res = await API.users.getAddresses();
            if (res.success && res.addresses.length > 0) {
                setAddresses(res.addresses);
                if (!selectedAddress) {
                    const principal = res.addresses.find(a => a.es_principal) || res.addresses[0];
                    setSelectedAddress(principal);
                }
            }
        } catch {
            // sin direcciones
        } finally {
            setLoadingAddresses(false);
        }
    };

    useEffect(() => {
        loadAddresses();
        checkPendingOrder();
    }, []);

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
        return couponApplied ? couponDiscountAmount : 0;
    };

    const calculateTotal = () => {
        return calculateSubtotal() - calculateDiscount() + 2.99;
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setValidatingCoupon(true);
        try {
            const items = cartItems.map(item => ({ menu_item_id: item.id, cantidad: item.quantity }));
            const res = await API.cupones.validate(couponCode.trim(), selectedRestaurant?.id, items);
            if (res.success) {
                if (res.cupon.esRuleta) {
                    setCouponDiscountAmount(res.cupon.monto_descuento);
                    setCouponDiscount(0);
                } else {
                    setCouponDiscountAmount(calculateSubtotal() * (res.cupon.discount_percent / 100));
                    setCouponDiscount(res.cupon.discount_percent);
                }
                setCouponEsRuleta(!!res.cupon.esRuleta);
                setCouponHabilitado(true);
                setCouponDisabledReason(null);
                setCouponApplied(true);
                showSuccessMessage('Cupon aplicado', res.cupon.esRuleta ? `$${res.cupon.monto_descuento.toFixed(2)} de descuento en tu pedido` : `${res.cupon.discount_percent}% de descuento en tu pedido`);
            } else {
                showErrorMessage('Cupon invalido', res.message || 'Verifica el codigo e intenta de nuevo');
            }
        } catch {
            showErrorMessage('Error', 'No se pudo validar el cupón. Revisá tu conexión.');
        } finally {
            setValidatingCoupon(false);
        }
    };

    useEffect(() => {
        if (!couponApplied || !couponEsRuleta) return;

        const revalidar = async () => {
            try {
                const items = cartItems.map(item => ({ menu_item_id: item.id, cantidad: item.quantity }));
                const res = await API.cupones.validate(couponCode.trim(), selectedRestaurant?.id, items);
                if (res.success) {
                    setCouponDiscountAmount(res.cupon.monto_descuento);
                    setCouponHabilitado(true);
                    setCouponDisabledReason(null);
                } else {
                    setCouponHabilitado(false);
                    setCouponDisabledReason(res.message || 'Este cupón ya no se puede aplicar');
                    setCouponDiscountAmount(0);
                }
            } catch {
                // Sin conexión: no tocamos el estado actual del cupón, se reintenta en el próximo cambio del carrito.
            }
        };

        revalidar();
    }, [cartItems, couponApplied, couponEsRuleta]);

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
        setDialogConfig({
            title: 'Eliminar producto',
            message: `¿Querés eliminar "${itemName}" del carrito?`,
            onConfirm: () => handleRemoveItem(itemId, itemName),
        });
        setDialogVisible(true);
    };

    const handleRemoveItem = (itemId, itemName) => {
        dispatch(removeFromCart(itemId));
        showErrorMessage('Producto eliminado', `${itemName} se ha removido del carrito`);
    };

    const handleClearCart = () => {
        if (cartItems.length === 0) return;
        setDialogConfig({
            title: 'Vaciar carrito',
            message: '¿Estás seguro de que querés vaciar todo el carrito?',
            onConfirm: () => {
                dispatch(clearCart());
                showWarningMessage('Carrito vaciado', 'Todos los productos han sido removidos');
            },
        });
        setDialogVisible(true);
    };


    const checkItemsAvailability = async () => {
        if (!selectedRestaurant?.id) return { ok: false, unavailable: [] };
        try {
            const res = await API.restaurants.getMenu(selectedRestaurant.id);
            if (!res.success) return { ok: true, unavailable: [] };

            const menuMap = {};
            res.items.forEach(item => { menuMap[item.id] = item; });

            const unavailable = cartItems.filter(cartItem => {
                const menuItem = menuMap[cartItem.id];
                return !menuItem || menuItem.disponible === false;
            });

            return { ok: unavailable.length === 0, unavailable };
        } catch {
            return { ok: true, unavailable: [] };
        }
    };

    const handleMercadoPagoPayment = async () => {
        if (cartItems.length === 0) {
            showWarningMessage('Carrito vacio', 'Agrega productos al carrito antes de pagar');
            return;
        }

        setLoadingMP(true);
        const { ok, unavailable } = await checkItemsAvailability();

        if (!ok) {
            setLoadingMP(false);
            const names = unavailable.map(i => i.name).join(', ');
            showErrorMessage('Productos no disponibles', `${names} ya no están disponibles y serán eliminados del carrito.`);
            unavailable.forEach(i => dispatch(removeFromCart(i.id)));
            return;
        }

        try {
            const orderItems = cartItems.map(item => ({
                menu_item_id: item.id,
                nombre_item: item.name,
                precio_unitario: item.price,
                cantidad: item.quantity,
                ingredientes_removidos: item.removedIngredients || [],
            }));

            const orderRes = await API.orders.create(
                selectedRestaurant.id,
                orderItems,
                selectedAddress ? `${selectedAddress.direccion}, ${selectedAddress.ciudad}` : 'Dirección registrada',
                '',
                undefined,
                couponApplied && couponHabilitado ? couponCode : null
            );

            if (!orderRes.success) {
                showErrorMessage('Error al crear pedido', orderRes.message || 'Intentá de nuevo');
                return;
            }

            const prefRes = await API.payments.createPreference(orderRes.order.id);

            if (!prefRes.success) {
                showErrorMessage('Error de pago', prefRes.message || 'No se pudo iniciar el pago');
                return;
            }

            const url = __DEV__ ? prefRes.sandbox_init_point : prefRes.init_point;
            const savedOrderId    = orderRes.order.id;
            const savedOrderItems = [...cartItems];
            const savedTotal      = calculateTotal();

            setCurrentOrderId(savedOrderId);
            setCurrentOrderItems(savedOrderItems);

            // Abre Chrome Custom Tab — MP muestra todos los métodos de pago
            const result = await WebBrowser.openBrowserAsync(url, {
                dismissButtonStyle: 'cancel',
                toolbarColor: '#009EE3',
            });

            // El usuario cerró el browser — chequeamos el resultado via deep link
            // El webhook ya habrá procesado el pago exitoso en el backend
            if (result.type === 'cancel' || result.type === 'dismiss') {
                try {
                    // Reintentar hasta 4 veces — el webhook de MP puede tardar hasta ~5s
                    let estadoAprobado = false;
                    for (let intento = 0; intento < 4; intento++) {
                        await new Promise(r => setTimeout(r, 1500));
                        const orderStatus = await API.orders.getById(savedOrderId);
                        estadoAprobado = ['confirmado', 'preparando', 'en_preparacion'].includes(orderStatus.order?.estado);
                        if (estadoAprobado) break;
                    }

                    if (estadoAprobado) {
                        dispatch(clearCart());
                        await AsyncStorage.removeItem('pendingOrderId');
                    } else {
                        await AsyncStorage.setItem('pendingOrderId', String(savedOrderId));
                        setPendingOrderId(savedOrderId);
                    }
                    navigation.navigate('OrderConfirmation', {
                        orderId: savedOrderId,
                        orderTotal: savedTotal,
                        orderItems: savedOrderItems,
                        pagoPendiente: !estadoAprobado,
                    });
                } catch {
                    await AsyncStorage.setItem('pendingOrderId', String(savedOrderId));
                    setPendingOrderId(savedOrderId);
                    navigation.navigate('OrderConfirmation', {
                        orderId: savedOrderId,
                        orderTotal: savedTotal,
                        orderItems: savedOrderItems,
                        pagoPendiente: true,
                    });
                }
            }
        } catch {
            showErrorMessage('Error de conexión', 'No se pudo iniciar el pago. Revisá tu conexión.');
        } finally {
            setLoadingMP(false);
        }
    };


    const handleEfectivoPayment = async () => {
        if (cartItems.length === 0) {
            showWarningMessage('Carrito vacío', 'Agregá productos antes de pagar');
            return;
        }

        setLoadingEfectivo(true);
        const { ok, unavailable } = await checkItemsAvailability();

        if (!ok) {
            setLoadingEfectivo(false);
            const names = unavailable.map(i => i.name).join(', ');
            showErrorMessage('Productos no disponibles', `${names} ya no están disponibles.`);
            unavailable.forEach(i => dispatch(removeFromCart(i.id)));
            return;
        }

        try {
            const orderItems = cartItems.map(item => ({
                menu_item_id: item.id,
                nombre_item: item.name,
                precio_unitario: item.price,
                cantidad: item.quantity,
                ingredientes_removidos: item.removedIngredients || [],
            }));

            const orderRes = await API.orders.create(
                selectedRestaurant.id,
                orderItems,
                selectedAddress ? `${selectedAddress.direccion}, ${selectedAddress.ciudad}` : 'Dirección registrada',
                '',
                'efectivo',
                couponApplied && couponHabilitado ? couponCode : null
            );

            if (!orderRes.success) {
                showErrorMessage('Error al crear pedido', orderRes.message || 'Intentá de nuevo');
                return;
            }

            const total = calculateTotal();
            dispatch(clearCart());
            navigation.navigate('OrderConfirmation', {
                orderId: orderRes.order.id,
                orderTotal: total,
                orderItems: [...cartItems],
                metodoPago: 'efectivo',
            });
        } catch {
            showErrorMessage('Error de conexión', 'No se pudo crear el pedido. Revisá tu conexión.');
        } finally {
            setLoadingEfectivo(false);
        }
    };


    const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />


            <AppHeader
                title="Mi Carrito"
                subtitle={`${totalQuantity} ${totalQuantity === 1 ? 'producto' : 'productos'}`}
                onBack={handleGoBack}
                rightComponent={cartItems.length > 0 ? (
                    <TouchableOpacity
                        style={styles.trashButton}
                        onPress={handleClearCart}
                        accessibilityLabel="Vaciar carrito"
                        accessibilityRole="button"
                    >
                        <Ionicons name="trash-outline" size={20} color="#FF4444" />
                    </TouchableOpacity>
                ) : undefined}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 44 + 32, paddingBottom: FLOATING_TAB_BAR_HEIGHT }]}
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
                                accessibilityLabel="Código de descuento"
                                accessibilityHint="Ingresá tu código para obtener un descuento"
                            />
                            {couponApplied ? (
                                <View style={styles.couponApplied}>
                                    <Ionicons name={couponHabilitado ? 'checkmark-circle' : 'alert-circle'} size={18} color={couponHabilitado ? '#4CAF50' : '#E53935'} />
                                    <Text style={styles.couponAppliedText}>
                                        {couponHabilitado ? `-$${couponDiscountAmount.toFixed(2)}` : 'Pausado'}
                                    </Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.couponButton, (!couponCode.trim() || validatingCoupon) && { opacity: 0.5 }]}
                                    onPress={handleApplyCoupon}
                                    disabled={!couponCode.trim() || validatingCoupon}
                                >
                                    {validatingCoupon
                                        ? <ActivityIndicator size="small" color="white" />
                                        : <Text style={styles.couponButtonText}>Aplicar</Text>
                                    }
                                </TouchableOpacity>
                            )}
                        </View>
                        {couponApplied && !couponHabilitado && couponDisabledReason && (
                            <Text style={styles.couponDisabledText}>{couponDisabledReason}</Text>
                        )}

                        {/* --- Resumen del pedido --- */}
                        <View style={styles.summaryContainer}>
                            <Text style={styles.summaryTitle}>Resumen del pedido</Text>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>
                                    Subtotal ({totalQuantity} {totalQuantity === 1 ? 'producto' : 'productos'})
                                </Text>
                                <Text style={styles.summaryValue}>${calculateSubtotal().toFixed(2)}</Text>
                            </View>

                            {couponApplied && couponHabilitado && (
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, styles.discountLabel]}>Descuento</Text>
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

                        {/* --- Selección de dirección --- */}
                        <View style={styles.addressSection}>
                            <Text style={styles.addressSectionTitle}>
                                <Ionicons name="location-outline" size={15} color="#333" /> Dirección de entrega
                            </Text>
                            {loadingAddresses ? (
                                <ActivityIndicator size="small" color="#ff8700" style={{ marginTop: 8 }} />
                            ) : addresses.length === 0 ? (
                                <TouchableOpacity
                                    style={styles.addressEmpty}
                                    onPress={() => setShowAddSheet(true)}
                                >
                                    <Ionicons name="add-circle-outline" size={18} color="#ff8700" />
                                    <Text style={styles.addressEmptyText}>Agregá una dirección para continuar</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.addressSelector}
                                    onPress={() => setAddressPickerVisible(true)}
                                >
                                    <View style={styles.addressSelectorLeft}>
                                        <Ionicons name="location" size={18} color="#ff8700" />
                                        <View style={{ marginLeft: 10, flex: 1 }}>
                                            <Text style={styles.addressSelectorLabel} numberOfLines={1}>
                                                {selectedAddress?.etiqueta || 'Dirección'}
                                                {selectedAddress?.es_principal ? ' ⭐' : ''}
                                            </Text>
                                            <Text style={styles.addressSelectorValue} numberOfLines={1}>
                                                {selectedAddress?.direccion}, {selectedAddress?.ciudad}
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-down" size={18} color="#888" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* --- Banner pago pendiente --- */}
                        {pendingOrderId && (
                            <TouchableOpacity
                                style={styles.pendingBanner}
                                onPress={() => navigation.navigate('OrdersTab', { screen: 'OrderDetail', params: { orderId: pendingOrderId } })}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="time-outline" size={20} color="#FF8700" />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.pendingBannerTitle}>Tenés un pago en proceso</Text>
                                    <Text style={styles.pendingBannerSub}>No podés realizar un nuevo pedido hasta que se confirme. Tocá para ver el estado.</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#FF8700" />
                            </TouchableOpacity>
                        )}

                        {/* --- Boton efectivo --- */}
                        <TouchableOpacity
                            style={[styles.efectivoButton, (loadingEfectivo || loadingMP || !selectedAddress || !!pendingOrderId) && styles.buttonDisabled]}
                            onPress={handleEfectivoPayment}
                            disabled={loadingEfectivo || loadingMP || !selectedAddress || !!pendingOrderId}
                        >
                            {loadingEfectivo ? (
                                <ActivityIndicator color="#2E7D32" style={{ flex: 1 }} />
                            ) : (
                                <>
                                    <View style={styles.payButtonLeft}>
                                        <Ionicons name="cash-outline" size={20} color="#2E7D32" />
                                        <Text style={[styles.payButtonText, { color: '#2E7D32' }]}>Pagar en efectivo</Text>
                                    </View>
                                    <Text style={[styles.payButtonAmount, { color: '#2E7D32' }]}>${calculateTotal().toFixed(2)}</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* --- Boton de pago --- */}
                        <TouchableOpacity
                            style={[styles.payButton, (loadingMP || loadingEfectivo || !selectedAddress || !!pendingOrderId) && styles.buttonDisabled]}
                            onPress={handleMercadoPagoPayment}
                            disabled={loadingMP || loadingEfectivo || !selectedAddress || !!pendingOrderId}
                            accessibilityLabel={`Pagar $${calculateTotal().toFixed(2)}`}
                            accessibilityRole="button"
                        >
                            {loadingMP ? (
                                <ActivityIndicator color="#009EE3" style={{ flex: 1 }} />
                            ) : (
                                <>
                                    <View style={[styles.payButtonLeft, { marginLeft: -24 }]}>
                                        <SvgXml xml={MP_LOGO_COLOR} width={200} height={52} />
                                    </View>
                                    <Text style={[styles.payButtonAmount, { color: '#009EE3' }]}>${calculateTotal().toFixed(2)}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            {/* Modal selector de dirección */}
            <Modal
                visible={addressPickerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAddressPickerVisible(false)}
            >
                <TouchableOpacity
                    style={styles.addressModalOverlay}
                    activeOpacity={1}
                    onPress={() => setAddressPickerVisible(false)}
                >
                    <View style={styles.addressModalSheet}>
                        <View style={styles.addressModalHandle} />
                        <Text style={styles.addressModalTitle}>Seleccioná una dirección</Text>
                        {addresses.map(addr => (
                            <TouchableOpacity
                                key={addr.id}
                                style={[
                                    styles.addressOption,
                                    selectedAddress?.id === addr.id && styles.addressOptionSelected,
                                ]}
                                onPress={() => {
                                    setSelectedAddress(addr);
                                    setAddressPickerVisible(false);
                                }}
                            >
                                <View style={styles.addressOptionLeft}>
                                    <Ionicons
                                        name={selectedAddress?.id === addr.id ? 'radio-button-on' : 'radio-button-off'}
                                        size={20}
                                        color={selectedAddress?.id === addr.id ? '#ff8700' : '#ccc'}
                                    />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={styles.addressOptionLabel}>
                                            {addr.etiqueta}{addr.es_principal ? ' ⭐' : ''}
                                        </Text>
                                        <Text style={styles.addressOptionValue} numberOfLines={2}>
                                            {addr.direccion}, {addr.ciudad}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.addressModalAddBtn}
                            onPress={() => {
                                setAddressPickerVisible(false);
                                setShowAddSheet(true);
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={18} color="#ff8700" />
                            <Text style={styles.addressModalAddText}>Agregar nueva dirección</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <AddAddressSheet
                visible={showAddSheet}
                onClose={() => setShowAddSheet(false)}
                onSaved={async (newAddress) => {
                    await loadAddresses();
                    if (newAddress) setSelectedAddress(newAddress);
                    showSuccessMessage('Dirección guardada');
                }}
            />

            <FlashMessageWrapper />

            <Portal>
                <Dialog
                    visible={dialogVisible}
                    onDismiss={() => setDialogVisible(false)}
                    style={styles.dialog}
                >
                    <Dialog.Icon icon="alert-circle-outline" size={36} color="#FF8700" />
                    <Dialog.Title style={styles.dialogTitle}>{dialogConfig.title}</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph style={styles.dialogMessage}>{dialogConfig.message}</Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions style={styles.dialogActions}>
                        <Button onPress={() => setDialogVisible(false)} textColor="#888">
                            Cancelar
                        </Button>
                        <Button
                            onPress={() => {
                                setDialogVisible(false);
                                dialogConfig.onConfirm?.();
                            }}
                            textColor="#ff4444"
                        >
                            Confirmar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {},

    trashButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,68,68,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,68,68,0.15)',
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
        fontSize: 12,
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
        fontSize: 12,
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
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
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
        width: 44,
        height: 44,
        borderRadius: 22,
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
        fontSize: 12,
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
    couponDisabledText: {
        color: '#E53935', fontSize: 12, marginTop: -12, marginBottom: 16,
        paddingHorizontal: 4,
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

    /* Banner pago pendiente */
    pendingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        borderWidth: 1.5,
        borderColor: '#FF8700',
        borderRadius: 14,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 14,
    },
    pendingBannerTitle: {
        fontSize: 13,
        fontWeight: '700',
        fontFamily: 'Poppins-SemiBold',
        color: '#E65100',
        marginBottom: 2,
    },
    pendingBannerSub: {
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        color: '#BF360C',
        lineHeight: 16,
    },

    /* Boton efectivo */
    efectivoButton: {
        backgroundColor: '#E8F5E9',
        marginHorizontal: 16,
        marginBottom: 10,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderColor: '#43A047',
    },

    /* Boton de pago */
    payButton: {
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: '#009EE3',
        marginHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        shadowColor: '#009EE3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 3,
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

    /* Dirección de entrega */
    addressSection: {
        marginHorizontal: 16,
        marginBottom: 14,
    },
    addressSectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    addressEmpty: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFF3E0',
        borderWidth: 1.5,
        borderColor: '#ff8700',
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 14,
    },
    addressEmptyText: {
        color: '#ff8700',
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    addressSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    addressSelectorLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    addressSelectorLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#222',
    },
    addressSelectorValue: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },

    /* Modal picker de dirección */
    addressModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    addressModalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 36,
    },
    addressModalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#ddd',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    addressModalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    addressOption: {
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#fafafa',
        borderWidth: 1,
        borderColor: '#eee',
    },
    addressOptionSelected: {
        backgroundColor: '#FFF3E0',
        borderColor: '#ff8700',
    },
    addressOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addressOptionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#222',
    },
    addressOptionValue: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    addressModalAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#ff8700',
        borderStyle: 'dashed',
    },
    addressModalAddText: {
        color: '#ff8700',
        fontSize: 13,
        fontWeight: '600',
    },
});

export default CartScreen;
