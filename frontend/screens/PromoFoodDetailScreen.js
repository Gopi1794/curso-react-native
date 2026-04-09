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
    Animated
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Lottie from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Share } from 'react-native';

// Componentes Common
import { BackButton } from '../components/common/BackButton';
import { ShareButton } from '../components/common/ShareButton';


// Utilidades y Redux
import { showSuccessMessage } from '../components/FlashMessageWrapper';
import { addToCart } from '../store/slices/cartSlice';
import { useAppDispatch } from '../store/hooks';
import { imageMap } from '../assets/utils/imageMap';
const toUri = (val) => {
    if (typeof val === 'string') return val;
    if (val && val.uri) return val.uri;
    return null;
};
import { PromoActionBar } from '../components/common/PromoActionBar';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const discountAnimation = require('../assets/animations/discount.json');
const clockAnimate = require('../assets/animations/clock.json');
const starAnimation = require('../assets/animations/Twinkle.json');

const PromoFoodDetailScreen = ({ route }) => {
    const navigation = useNavigation();
    const { foodItem } = route.params;
    const dispatch = useAppDispatch();

    const [quantity, setQuantity] = useState(1);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [carouselImages, setCarouselImages] = useState([]);

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

    // Inicializar carrusel
    useEffect(() => {
        const images = getAllPromoImages();
        setCarouselImages(images);

        // Animaciones de entrada
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 20,
                friction: 7,
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

        console.log('Agregando al carrito:', cartItem);
        console.log('Tipo de precio:', typeof cartItem.price, 'Valor:', cartItem.price);

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

            {/* Fondo con gradiente más vibrante para promos */}
            <LinearGradient
                colors={['#FF6B35', '#FF8E53', '#FFA726']}
                style={styles.backgroundGradient}
            />

            {/* Header */}
            <View style={styles.header}>
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
                contentContainerStyle={styles.scrollViewContent}
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
                            <Ionicons name="chevron-back" size={24} color="white" />
                        </TouchableOpacity>
                    )}

                    {currentImageIndex < carouselImages.length - 1 && (
                        <TouchableOpacity style={[styles.carouselButton, styles.nextButton]} onPress={handleNextImage}>
                            <Ionicons name="chevron-forward" size={24} color="white" />
                        </TouchableOpacity>
                    )}

                    {/* Badge de PROMO */}
                    <View style={styles.promoBadge}>
                        <Lottie
                            source={discountAnimation}
                            autoPlay
                            loop
                            style={styles.discountAnimation}
                        />
                        <Text style={styles.promoBadgeText}>PROMO</Text>
                    </View>

                    {/* Contador de imágenes */}
                    <View style={styles.imageCounter}>
                        <Text style={styles.imageCounterText}>
                            {currentImageIndex + 1} / {carouselImages.length}
                        </Text>
                    </View>

                    {/* Indicadores */}
                    <View style={styles.indicatorsContainer}>
                        {carouselImages.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.indicator,
                                    index === currentImageIndex && styles.activeIndicator
                                ]}
                            />
                        ))}
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
                    {/* Título y Precio */}
                    <View style={styles.titleSection}>
                        <View style={styles.titleLeft}>
                            <Text style={styles.foodTitle}>{foodItem.name}</Text>
                            {renderStars(4.7, 18)}
                        </View>
                        <View style={styles.priceContainer}>
                            {foodItem.originalPrice && (
                                <Text style={styles.originalPrice}>{foodItem.originalPrice}</Text>
                            )}
                            <Text style={styles.foodPrice}>{foodItem.price}</Text>
                            {foodItem.discountPercentage && (
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>
                                        {foodItem.discountPercentage}% OFF
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Estadísticas rápidas */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Lottie
                                source={clockAnimate}
                                autoPlay
                                loop
                                style={styles.statIcon}
                            />
                            <Text style={styles.statText}>15-20 min</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Lottie
                                source={starAnimation}
                                autoPlay
                                loop
                                style={styles.statIcon}
                            />
                            <Text style={styles.statText}>4.7</Text>
                        </View>
                    </View>

                    {/* Descripción */}
                    <View style={styles.descriptionSection}>
                        <Text style={styles.sectionTitle}>🎯 Sobre esta Promo</Text>
                        <Text style={styles.descriptionText}>{foodItem.descriptionText}</Text>
                    </View>

                    {/* Productos incluidos */}
                    {Array.isArray(foodItem.includes) && (
                        <View style={styles.includedSection}>
                            <Text style={styles.sectionTitle}>📦 Incluye</Text>
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
                            <Text style={styles.timeLimitTitle}>⏰ Oferta por Tiempo Limitado</Text>
                        </View>
                        <Text style={styles.timeLimitText}>
                            Esta promoción especial está disponible por tiempo limitado.
                            ¡No pierdas la oportunidad de disfrutarla!
                        </Text>
                    </View>

                    {/* Beneficios adicionales */}
                    <View style={styles.benefitsSection}>
                        <Text style={styles.sectionTitle}>✨ Beneficios</Text>
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

                </Animated.View>

            </Animated.ScrollView>

            {/* Barra de acciones con ActionButton */}
            <PromoActionBar
                quantity={quantity}
                onIncrease={handleIncrement}
                onDecrease={handleDecrement}
                onAddToCart={handleAddToCart}
                price={foodItem.price}
                originalPrice={foodItem.originalPrice}
                buttonText="Agregar Promo"
                style={styles.actionBar}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    backgroundGradient: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        paddingTop: StatusBar.currentHeight || 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 12,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingBottom: 120,
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
        backgroundColor: 'rgba(255, 107, 53, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    prevButton: {
        left: 16,
    },
    nextButton: {
        right: 16,
    },
    // Badge de PROMO
    promoBadge: {
        position: 'absolute',
        top: 300,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF8000',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 100,
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
    // Contador e indicadores
    imageCounter: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 100,
    },
    imageCounterText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Poppins-SemiBold',
        backgroundColor: '#ff80009f',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        overflow: 'hidden',
    },
    indicatorsContainer: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        zIndex: 100,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(104, 104, 104, 0.5)',
    },
    activeIndicator: {
        backgroundColor: '#FF6B35',
        width: 20,
    },
    // Contenido principal
    mainContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        padding: 25,
    },
    titleSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    titleLeft: {
        flex: 1,
        marginRight: 16,
    },
    foodTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        fontFamily: 'Poppins-Bold',
    },
    starsContainer: {
        flexDirection: 'row',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    originalPrice: {
        fontSize: 16,
        color: '#FF6B6B',
        textDecorationLine: 'line-through',
        marginBottom: 4,
        fontFamily: 'Poppins-Regular',
    },
    foodPrice: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FF6B35',
        fontFamily: 'Poppins-Bold',
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
        borderColor: "#ff8000",
        borderWidth: 1,
        backgroundColor: "#ff800072",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: 14,
        color: '#797979ff',
        fontFamily: 'Poppins-Regular',
    },
    // Secciones de contenido
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
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
        marginBottom: 104,
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
    // Barra de acciones con ActionButton
    actionBar: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
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