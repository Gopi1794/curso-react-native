import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Dimensions,
    FlatList,
    Animated,
    AccessibilityInfo,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Lottie from 'lottie-react-native';
import { Share } from 'react-native';

// Componentes Common
import { BackButton } from '../../components/common/BackButton';
import { ShareButton } from '../../components/common/ShareButton';


// Utilidades y Redux
import { showSuccessMessage } from '../../components/FlashMessageWrapper';
import { addToCart } from '../../store/slices/cartSlice';
import { useAppDispatch } from '../../store/hooks';
import { imageMap } from '../../assets/utils/imageMap';
const toUri = (val) => {
    if (typeof val === 'string') return val;
    if (val && val.uri) return val.uri;
    return null;
};
import { PromoActionBar } from '../../components/common/PromoActionBar';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const discountAnimation = require('../../assets/animations/discount.json');
const clockAnimate = require('../../assets/animations/clock.json');
const starAnimation = require('../../assets/animations/Twinkle.json');

const PromoFoodDetailScreen = ({ route }) => {
    const navigation = useNavigation();
    const { foodItem } = route.params;
    const dispatch = useAppDispatch();

    const [quantity, setQuantity] = useState(1);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [carouselImages, setCarouselImages] = useState([]);
    const [reduceMotion, setReduceMotion] = useState(false);
    const insets = useSafeAreaInsets();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const flatListRef = useRef(null);

    // Obtener imágenes para el carrusel
    const getAllPromoImages = () => {
        if (Array.isArray(foodItem.imageKey)) {
            return foodItem.imageKey.map((imageKey, index) => ({
                id: index,
                imageKey: imageKey,
                isMain: index === 0
            }));
        }
        else if (typeof foodItem.imageKey === 'string') {
            const baseImageKey = foodItem.imageKey;
            const images = [baseImageKey];

            for (let i = 1; i <= 3; i++) {
                const additionalImageKey = `${baseImageKey}_${i}`;
                if (imageMap[additionalImageKey]) {
                    images.push(additionalImageKey);
                } else {
                    break;
                }
            }

            return images.map((imageKey, index) => ({
                id: index,
                imageKey: imageKey,
                isMain: index === 0
            }));
        }
        else {
            return [{
                id: 0,
                imageKey: foodItem.imageKey || 'defaultImage',
                isMain: true
            }];
        }
    };

    // Detectar reduced motion
    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
        return () => sub.remove();
    }, []);

    // Inicializar carrusel
    useEffect(() => {
        const images = getAllPromoImages();
        setCarouselImages(images);

        // Animaciones de entrada
        if (reduceMotion) {
            fadeAnim.setValue(1);
            scaleAnim.setValue(1);
            return;
        }
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 40,
                friction: 8,
                useNativeDriver: true,
            })
        ]).start();
    }, [foodItem]);

    // Navegación del carrusel
    const handleNextImage = () => {
        if (currentImageIndex < carouselImages.length - 1) {
            const nextIndex = currentImageIndex + 1;
            setCurrentImageIndex(nextIndex);
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        }
    };

    const handlePrevImage = () => {
        if (currentImageIndex > 0) {
            const prevIndex = currentImageIndex - 1;
            setCurrentImageIndex(prevIndex);
            flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
        }
    };

    const onScroll = (event) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / screenWidth);
        setCurrentImageIndex(index);
    };

    // Funciones de cantidad
    const handleIncrement = () => setQuantity(prev => prev + 1);
    const handleDecrement = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

    const handleShare = async () => {
        try {
            const shareOptions = {
                message: `🔥 ¡PROMO ESPECIAL! ${foodItem.name}\n\n${foodItem.descriptionText}\n\n💰 Precio: ${foodItem.price}${foodItem.originalPrice ? ` (Antes: ${foodItem.originalPrice})` : ''}\n\n⏰ ¡No te pierdas esta oferta!`,
                title: `🔥 ${foodItem.name} - Promoción`,
                url: 'https://tu-app.com'
            };
            await Share.share(shareOptions);
        } catch (error) {
            console.log('Error sharing:', error);
        }
    };
    const handleAddToCart = (selectedQuantity = quantity) => {
        const mainImageKey = Array.isArray(foodItem.imageKey)
            ? foodItem.imageKey[0]
            : foodItem.imageKey;

        // ✅ MEJOR MANEJO DEL PRECIO
        let priceValue;
        try {
            // Si el precio ya es un número, usarlo directamente
            if (typeof foodItem.price === 'number') {
                priceValue = foodItem.price;
            }
            // Si es string, limpiarlo y convertirlo
            else if (typeof foodItem.price === 'string') {
                const cleanPrice = foodItem.price.replace('$', '').replace(',', '.').trim();
                priceValue = parseFloat(cleanPrice);
            }
            // Valor por defecto si no se puede parsear
            else {
                console.warn('Formato de precio no reconocido:', foodItem.price);
                priceValue = 0;
            }

            // Verificar que sea un número válido
            if (isNaN(priceValue)) {
                console.warn('Precio convertido a NaN:', foodItem.price);
                priceValue = 0;
            }
        } catch (error) {
            console.error('Error procesando precio:', error);
            priceValue = 0;
        }

        // ✅ Asegurarse de que originalPrice sea un string
        const originalPrice = foodItem.originalPrice ? String(foodItem.originalPrice) : null;

        const cartItem = {
            id: foodItem.id,
            name: foodItem.name,
            price: priceValue, // ✅ Ahora es siempre un número válido
            image: imageMap[mainImageKey],
            quantity: selectedQuantity,
            description: foodItem.descriptionText,
            isPromo: true,
            originalPrice: originalPrice
        };

        dispatch(addToCart(cartItem));
        showSuccessMessage('¡Promo agregada!', `${foodItem.name} se ha añadido al carrito`);
        setQuantity(1);
    };
    // Renderizar imágenes del carrusel
    const renderImageItem = ({ item }) => (
        <View style={styles.carouselItem}>
            <Image
                source={{ uri: toUri(imageMap[item.imageKey]) }}
                style={styles.carouselImage}
                resizeMode="cover"
            />
        </View>
    );

    // Renderizar estrellas de rating
    const renderStars = (rating, size = 16) => {
        return (
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                        key={star}
                        name={star <= rating ? "star" : "star-outline"}
                        size={size}
                        color="#FFD700"
                    />
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />


            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <BackButton color="white" />

                <View style={styles.headerRight}>
                    <ShareButton
                        shareOptions={{
                            message: `🔥 ¡PROMO ESPECIAL! ${foodItem.name}\n\n${foodItem.descriptionText}\n\n💰 Precio: ${foodItem.price}`,
                            title: `🔥 ${foodItem.name} - Promoción`,
                        }}
                        color="white"
                    />
                </View>
            </View>

            <Animated.ScrollView
                style={[styles.scrollView, { opacity: fadeAnim }]}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollViewContent, { paddingBottom: FLOATING_TAB_BAR_HEIGHT + 16 }]}
            >
                {/* Carrusel de imágenes */}
                <View style={styles.carouselSection}>
                    <FlatList
                        ref={flatListRef}
                        data={carouselImages}
                        renderItem={renderImageItem}
                        keyExtractor={item => item.id.toString()}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        style={styles.carousel}
                    />

                    {/* Botones de navegación del carrusel */}
                    {currentImageIndex > 0 && (
                        <TouchableOpacity style={[styles.carouselButton, styles.prevButton]} onPress={handlePrevImage}>
                            <BlurView
                                intensity={50}
                                tint="dark"
                                experimentalBlurMethod="dimezisBlurView"
                                style={styles.carouselButtonBlur}
                            />
                            <Ionicons name="chevron-back" size={24} color="white" />
                        </TouchableOpacity>
                    )}

                    {currentImageIndex < carouselImages.length - 1 && (
                        <TouchableOpacity style={[styles.carouselButton, styles.nextButton]} onPress={handleNextImage}>
                            <BlurView
                                intensity={50}
                                tint="dark"
                                experimentalBlurMethod="dimezisBlurView"
                                style={styles.carouselButtonBlur}
                            />
                            <Ionicons name="chevron-forward" size={24} color="white" />
                        </TouchableOpacity>
                    )}

                    {/* Contador de imágenes */}
                    <View style={styles.imageCounter}>
                        <View style={styles.imageCounterPill}>
                            <BlurView
                                intensity={50}
                                tint="dark"
                                experimentalBlurMethod="dimezisBlurView"
                                style={styles.imageCounterBlur}
                            />
                            <Text style={styles.imageCounterText}>
                                {currentImageIndex + 1} / {carouselImages.length}
                            </Text>
                        </View>
                    </View>

                    {/* Título y Precio — flotan sobre el carrusel */}
                    <View style={styles.titleBadgeWrap}>
                        <BlurView
                            intensity={50}
                            tint="dark"
                            experimentalBlurMethod="dimezisBlurView"
                            style={styles.titleBadgeBlur}
                        />
                        <Text style={styles.foodTitleOverlay} numberOfLines={1}>{foodItem.name}</Text>
                        <View style={styles.priceOverlayRight}>
                            {foodItem.originalPrice && (
                                <Text style={styles.originalPriceOverlay}>{foodItem.originalPrice}</Text>
                            )}
                            <View style={styles.foodPricePill}>
                                <Text style={styles.foodPriceOverlay}>{foodItem.price}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Contenido principal */}
                <Animated.View
                    style={[
                        styles.mainContent,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    {/* Rating y descuento */}
                    <View style={styles.ratingRow}>
                        {renderStars(4.7, 18)}
                        <View style={styles.ratingRowRight}>
                            {foodItem.discountPercentage && (
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>
                                        {foodItem.discountPercentage}% OFF
                                    </Text>
                                </View>
                            )}
                            <View style={styles.promoBadge}>
                                <Lottie
                                    source={discountAnimation}
                                    colorFilters={[{ keypath: '*', color: '#ffffff' }]}
                                    autoPlay={!reduceMotion}
                                    loop={!reduceMotion}
                                    style={styles.discountAnimation}
                                />
                                <Text style={styles.promoBadgeText}>PROMO</Text>
                            </View>
                        </View>
                    </View>

                    {/* Estadísticas rápidas */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Lottie
                                source={clockAnimate}
                                autoPlay={!reduceMotion}
                                loop={!reduceMotion}
                                style={styles.statIcon}
                            />
                            <Text style={styles.statText}>15-20 min</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Lottie
                                source={starAnimation}
                                autoPlay={!reduceMotion}
                                loop={!reduceMotion}
                                style={styles.statIcon}
                            />
                            <Text style={styles.statText}>4.7</Text>
                        </View>
                    </View>

                    {/* Descripción */}
                    <View style={styles.descriptionSection}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="pricetag" size={20} color="#FF8000" />
                            <Text style={styles.sectionTitle}>Sobre esta Promo</Text>
                        </View>
                        <Text style={styles.descriptionText}>{foodItem.descriptionText}</Text>
                    </View>

                    {/* Productos incluidos */}
                    {Array.isArray(foodItem.includes) && (
                        <View style={styles.includedSection}>
                            <View style={styles.sectionTitleRow}>
                                <Ionicons name="cube-outline" size={20} color="#FF8000" />
                                <Text style={styles.sectionTitle}>Incluye</Text>
                            </View>
                            <View style={styles.includedList}>
                                {foodItem.includes.map((item, idx) => (
                                    <View key={idx} style={styles.includedItem}>
                                        <View style={styles.includedDot} />
                                        <Text style={styles.includedText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Tiempo límite */}
                    <View style={styles.timeLimitSection}>
                        <View style={styles.timeLimitHeader}>
                            <Ionicons name="time-outline" size={20} color="#FF6B35" />
                            <Text style={styles.timeLimitTitle}>Oferta por Tiempo Limitado</Text>
                        </View>
                        <Text style={styles.timeLimitText}>
                            Esta promoción especial está disponible por tiempo limitado.
                            ¡No pierdas la oportunidad de disfrutarla!
                        </Text>
                    </View>

                    {/* Beneficios adicionales */}
                    <View style={styles.benefitsSection}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="star-outline" size={20} color="#FF8000" />
                            <Text style={styles.sectionTitle}>Beneficios</Text>
                        </View>
                        <View style={styles.benefitsGrid}>
                            <View style={styles.benefitItem}>
                                <Ionicons name="checkmark-circle" size={20} color="#4CD964" />
                                <Text style={styles.benefitText}>Ahorro garantizado</Text>
                            </View>
                            <View style={styles.benefitItem}>
                                <Ionicons name="checkmark-circle" size={20} color="#4CD964" />
                                <Text style={styles.benefitText}>Productos de calidad</Text>
                            </View>
                            <View style={styles.benefitItem}>
                                <Ionicons name="checkmark-circle" size={20} color="#4CD964" />
                                <Text style={styles.benefitText}>Preparación rápida</Text>
                            </View>
                        </View>
                    </View>

                    {/* Añadir al carrito */}
                    <PromoActionBar
                        quantity={quantity}
                        onIncrease={handleIncrement}
                        onDecrease={handleDecrement}
                        onAddToCart={handleAddToCart}
                        price={foodItem.price}
                        originalPrice={foodItem.originalPrice}
                        buttonText="Agregar Promo"
                        style={styles.inlineActionBar}
                    />

                </Animated.View>

            </Animated.ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 12,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingBottom: 24,
    },
    // Carrusel
    carouselSection: {

        height: 380,
        position: 'relative',
    },
    carousel: {
        flex: 1,
    },
    carouselItem: {
        width: screenWidth,
        height: 380,
        position: 'relative',
    },
    carouselImage: {
        width: '100%',
        height: '100%',
    },
    // Botones de navegación
    carouselButton: {
        position: 'absolute',
        top: '50%',
        transform: [{ translateY: -20 }],
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 107, 53, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    carouselButtonBlur: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 20,
        overflow: 'hidden',
    },
    prevButton: {
        left: 16,
    },
    nextButton: {
        right: 16,
    },
    // Badge de PROMO
    promoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF8000',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    discountAnimation: {
        width: 24,
        height: 24,
        marginRight: 6,
    },
    promoBadgeText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
    },
    // Contador
    imageCounter: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 100,
    },
    imageCounterPill: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255,128,0,0.5)',
    },
    imageCounterBlur: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 12,
        overflow: 'hidden',
    },
    imageCounterText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Poppins-SemiBold',
    },
    // Título y precio flotantes sobre el carrusel
    titleBadgeWrap: {
        position: 'absolute',
        left: 10,
        right: 10,
        bottom: 4,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 25,
        paddingHorizontal: 14,
        paddingVertical: 10,
        zIndex: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
    },
    titleBadgeBlur: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 25,
        overflow: 'hidden',
    },
    foodTitleOverlay: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        marginRight: 10,
        fontFamily: 'Poppins-Bold',
    },
    priceOverlayRight: {
        alignItems: 'flex-end',
    },
    originalPriceOverlay: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        textDecorationLine: 'line-through',
        marginBottom: 2,
        fontFamily: 'Poppins-Regular',
    },
    foodPricePill: {
        backgroundColor: '#FF8000',
        borderRadius: 25,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    foodPriceOverlay: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        fontFamily: 'Poppins-Bold',
    },
    // Contenido principal
    mainContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: 0,
        padding: 25,
    },
    ratingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    starsContainer: {
        flexDirection: 'row',
    },
    ratingRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    discountBadge: {
        backgroundColor: '#4CD964',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 4,
    },
    discountText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
    },
    // Estadísticas
    statsContainer: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 24,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statIcon: {
        width: 24,
        height: 24,
    },
    statText: {
        borderColor: "#FF8000",
        borderWidth: 1,
        backgroundColor: "#FF800020",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: 14,
        color: '#7A3B00',
        fontFamily: 'Poppins-Regular',
    },
    // Secciones de contenido
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'Poppins-SemiBold',
    },
    descriptionSection: {
        marginBottom: 24,
    },
    descriptionText: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
        fontFamily: 'Poppins-Regular',
    },
    includedSection: {
        marginBottom: 24,
    },
    includedList: {
        marginTop: 8,
    },
    includedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    includedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF6B35',
        marginRight: 12,
    },
    includedText: {
        fontSize: 15,
        color: '#666',
        flex: 1,
        fontFamily: 'Poppins-Regular',
    },
    timeLimitSection: {
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B35',
    },
    timeLimitHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    timeLimitTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF6B35',
        fontFamily: 'Poppins-SemiBold',
    },
    timeLimitText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        fontFamily: 'Poppins-Regular',
    },
    benefitsSection: {
        marginBottom: 24,
    },
    inlineActionBar: {
        borderTopWidth: 0,
        borderRadius: 16,
        marginTop: 8,
        elevation: 0,
        shadowOpacity: 0,
        backgroundColor: 'transparent',
    },
    benefitsGrid: {
        gap: 12,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    benefitText: {
        fontSize: 15,
        color: '#666',
        fontFamily: 'Poppins-Regular',
    },
    quantitySelector: {
        marginRight: 16,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#FF6B35',
        borderRadius: 12,
        height: 56,
    },
    actionButtonTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
    actionButtonSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
    },
});

export default PromoFoodDetailScreen;