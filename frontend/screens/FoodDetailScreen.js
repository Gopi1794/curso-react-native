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
    Alert,
    Dimensions,
    FlatList,
    TextInput,
    Animated
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Lottie from 'lottie-react-native';
import { Share } from 'react-native';

// Componentes Common
import { BackButton } from '../components/common/BackButton';
import { ShareButton } from '../components/common/ShareButton';
import { ActionButton } from '../components/ActionButton';

// Datos y Redux
import menuItemsData from '../assets/data/menuItems.json';
import { imageMap } from '../assets/utils/imageMap';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { addToFavorites, removeFromFavorites } from '../store/slices/userSlice';
import { addToCart } from '../store/slices/cartSlice';
import { showSuccessMessage, showFavoriteMessage } from '../components/FlashMessageWrapper';
import { ActionBar } from '../components/common/ActionBar';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const heartLikeAnimation = require('../assets/animations/like.json');
const statAnimate = require('../assets/animations/statAnimate.json');
const clockAnimate = require('../assets/animations/clock.json');

// Datos de ejemplo para comentarios
const sampleComments = [
    {
        id: 1,
        user: 'María González',
        rating: 5,
        comment: '¡Increíble! La mejor hamburguesa que he probado. Los ingredientes son frescos y el pan está perfecto.',
        date: 'Hace 2 días',
        avatar: '👩'
    },
    {
        id: 2,
        user: 'Carlos Rodríguez',
        rating: 4,
        comment: 'Muy buena relación calidad-precio. La porción es generosa y el sabor excelente.',
        date: 'Hace 1 semana',
        avatar: '👨'
    }
];

const FoodDetailScreen = ({ route }) => {
    const navigation = useNavigation();
    const { foodItem } = route.params;

    const dispatch = useAppDispatch();
    const favorites = useAppSelector(state => state.user.favorites);

    const [isFavorite, setIsFavorite] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [comments, setComments] = useState(sampleComments);
    const [newComment, setNewComment] = useState('');
    const [userRating, setUserRating] = useState(0);
    const [showAllComments, setShowAllComments] = useState(false);
    const [carouselImages, setCarouselImages] = useState([]);

    const heartAnimationRef = useRef(null);
    const flatListRef = useRef(null);

    // ✅ AGREGAR LAS ANIMACIONES AQUÍ
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    // ✅ FUNCIÓN PARA OBTENER TODAS LAS IMÁGENES DEL PLATO
    const getAllPlateImages = () => {
        // Si ya es un array, filtrar solo las que tienen _
        if (Array.isArray(foodItem.imageKey)) {
            const imagesWithSuffix = foodItem.imageKey.filter(imageKey =>
                imageKey.includes('_') && !isNaN(imageKey.split('_').pop())
            );
            return imagesWithSuffix.map((imageKey, index) => ({
                id: index,
                imageKey: imageKey,
                isMain: index === 0
            }));
        }
        // Si es string, buscar solo imágenes con sufijos _0, _1, _2, etc.
        else if (typeof foodItem.imageKey === 'string') {
            const baseImageKey = foodItem.imageKey;
            const images = [];

            // Buscar imágenes con sufijos _0, _1, _2, etc. (EXCLUYENDO la principal)
            for (let i = 0; i <= 10; i++) {
                const additionalImageKey = `${baseImageKey}_${i}`;

                // Verificar si la imagen existe en imageMap
                if (imageMap[additionalImageKey]) {
                    images.push(additionalImageKey);
                } else {
                    // Si no encuentra una imagen, detener la búsqueda
                    break;
                }
            }

            return images.map((imageKey, index) => ({
                id: index,
                imageKey: imageKey,
                isMain: index === 0
            }));
        }
        // Fallback para casos no reconocidos
        else {
            console.warn('Formato de imageKey no reconocido:', foodItem.imageKey);
            return [];
        }
    };

    // ✅ INICIALIZAR CARRUSEL Y ANIMACIONES AL CARGAR EL COMPONENTE
    useEffect(() => {
        const images = getAllPlateImages();
        setCarouselImages(images);

        // ✅ AGREGAR LAS ANIMACIONES DE ENTRADA PARALELAS
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

    // Verificar favoritos desde Redux
    useEffect(() => {
        const favoriteExists = favorites.some(item => item.id === foodItem.id);
        setIsFavorite(favoriteExists);
    }, [favorites, foodItem.id]);

    useEffect(() => {
        if (heartAnimationRef.current) {
            if (isFavorite) {
                heartAnimationRef.current.play(0, 60);
            } else {
                heartAnimationRef.current.play(0, 0);
            }
        }
    }, [isFavorite]);

    // ✅ FUNCIONES PARA EL CARRUSEL
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

    // Funciones para cantidad
    const handleIncreaseQuantity = () => setQuantity(prev => prev + 1);
    const handleDecreaseQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

    const handleShare = async () => {
        try {
            const shareOptions = {
                message: `¡Mira este delicioso ${foodItem.name}! 🍽️\n\n${foodItem.descriptionText}\n\nPrecio: ${foodItem.price}\n\nDescarga la app para ver más platillos increíbles!`,
                title: `Compartir ${foodItem.name}`,
                url: 'https://tu-app.com'
            };
            await Share.share(shareOptions);
        } catch (error) {
            Alert.alert('Error', 'No se pudo compartir el contenido');
        }
    };

    const toggleFavorite = () => {
        if (isFavorite) {
            dispatch(removeFromFavorites(foodItem.id));
            showFavoriteMessage(false);
        } else {
            const mainImageKey = Array.isArray(foodItem.imageKey)
                ? foodItem.imageKey[0]
                : foodItem.imageKey;

            const favoriteItem = {
                id: foodItem.id,
                name: foodItem.name,
                price: foodItem.price,
                imageKey: mainImageKey,
                image: imageMap[mainImageKey],
                descriptionText: foodItem.descriptionText,
                ingredientText: foodItem.ingredientText,
                addedDate: new Date().toISOString()
            };
            dispatch(addToFavorites(favoriteItem));
            showFavoriteMessage(true);
        }
        setIsFavorite(!isFavorite);
    };

    const handleAddToCart = (selectedQuantity = quantity) => {
        const mainImageKey = Array.isArray(foodItem.imageKey)
            ? foodItem.imageKey[0]
            : foodItem.imageKey;

        const cartItem = {
            id: foodItem.id,
            name: foodItem.name,
            price: parseFloat(foodItem.price.replace('$', '')),
            image: imageMap[mainImageKey],
            quantity: selectedQuantity, // Usar la cantidad pasada como parámetro
            description: foodItem.descriptionText
        };

        dispatch(addToCart(cartItem));
        showSuccessMessage('¡Agregado al carrito!', `${foodItem.name} se ha añadido al carrito`);
        setQuantity(1); // Resetear a 1 después de agregar
    };

    // ✅ FUNCIONES PARA COMENTARIOS
    const handleAddComment = () => {
        if (newComment.trim() && userRating > 0) {
            const newCommentObj = {
                id: comments.length + 1,
                user: 'Tú',
                rating: userRating,
                comment: newComment,
                date: 'Ahora mismo',
                avatar: '😊'
            };
            setComments([newCommentObj, ...comments]);
            setNewComment('');
            setUserRating(0);
            Alert.alert('¡Gracias!', 'Tu comentario ha sido publicado');
        } else {
            Alert.alert('Error', 'Por favor agrega un comentario y una calificación');
        }
    };

    const renderStars = (rating, interactive = false, size = 16) => {
        return (
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                        key={star}
                        disabled={!interactive}
                        onPress={() => interactive && setUserRating(star)}
                    >
                        <Ionicons
                            name={star <= rating ? "star" : "star-outline"}
                            size={size}
                            color={interactive ? "#FFD700" : "#FF8000"}
                            style={interactive ? styles.interactiveStar : {}}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    // ✅ RENDERIZAR IMAGEN DEL CARRUSEL
    const renderImageItem = ({ item }) => (
        <View style={styles.carouselItem}>
            <Image
                source={imageMap[item.imageKey]}
                style={styles.carouselImage}
                resizeMode="cover"
            />
        </View>
    );

    // Renderizar comentarios
    const renderComment = ({ item }) => (
        <View style={styles.commentCard}>
            <View style={styles.commentHeader}>
                <View style={styles.userInfo}>
                    <Text style={styles.userAvatar}>{item.avatar}</Text>
                    <View>
                        <Text style={styles.userName}>{item.user}</Text>
                        {renderStars(item.rating, false, 14)}
                    </View>
                </View>
                <Text style={styles.commentDate}>{item.date}</Text>
            </View>
            <Text style={styles.commentText}>{item.comment}</Text>
        </View>
    );

    const displayedComments = showAllComments ? comments : comments.slice(0, 2);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="auto-content" translucent backgroundColor="#ff800097" />

            {/* Header con componentes Common */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <BackButton />

                    <ShareButton
                        shareOptions={{
                            message: `¡Mira este delicioso ${foodItem.name}! 🍽️\n\n${foodItem.descriptionText}\n\nPrecio: ${foodItem.price}\n\nDescarga la app para ver más platillos increíbles!`,
                            title: `Compartir ${foodItem.name}`,
                            url: 'https://tu-app.com'
                        }}
                    />
                </View>
            </View>

            <Animated.ScrollView
                style={[styles.scrollView, { opacity: fadeAnim }]}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollViewContent}
            >
                {/* ✅ CARRUSEL DE IMÁGENES DEL MISMO PLATO */}
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

                    {/* Contador de imágenes */}
                    <View style={styles.imageCounter}>
                        <Text style={styles.imageCounterText}>
                            {currentImageIndex + 1} / {carouselImages.length}
                        </Text>
                    </View>

                    {/* Botón de favorito */}
                    <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
                        <Lottie
                            ref={heartAnimationRef}
                            source={heartLikeAnimation}
                            style={styles.heartAnimation}
                            loop={false}
                            autoPlay={false}
                        />
                    </TouchableOpacity>
                </View>

                {/* ✅ APLICAR ANIMACIONES AL CONTENIDO PRINCIPAL */}
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
                        <Text style={styles.foodTitle}>{foodItem.name}</Text>
                        <Text style={styles.foodPrice}>{foodItem.price}</Text>
                    </View>

                    {/* Rating y Estadísticas */}
                    <View style={styles.ratingSection}>
                        <View style={styles.ratingContainer}>
                            {renderStars(4.8, false, 20)}
                            <Text style={styles.ratingText}>4.8 (128 reseñas)</Text>
                        </View>
                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Lottie
                                    source={clockAnimate}
                                    autoPlay
                                    loop
                                    style={styles.clockAnimate}
                                />
                                <Text style={styles.statText}>15-20 min</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Lottie
                                    source={statAnimate}
                                    autoPlay
                                    loop
                                    style={styles.statAnimate}
                                />
                                <Text style={styles.statText}>650 cal</Text>
                            </View>
                        </View>
                    </View>

                    {/* Descripción */}
                    <View style={styles.descriptionSection}>
                        <Text style={styles.sectionTitle}>Descripción</Text>
                        <Text style={styles.descriptionText}>{foodItem.descriptionText}</Text>
                    </View>

                    {/* Ingredientes */}
                    {foodItem.ingredientText && Array.isArray(foodItem.ingredientText) && (
                        <View style={styles.ingredientsSection}>
                            <Text style={styles.sectionTitle}>Ingredientes</Text>
                            <View style={styles.ingredientsGrid}>
                                {foodItem.ingredientText.map((ingredient, index) => (
                                    <View key={index} style={styles.ingredientChip}>
                                        <Text style={styles.ingredientText}>{ingredient}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Sección de Comentarios */}
                    <View style={styles.commentsSection}>
                        <View style={styles.commentsHeader}>
                            <Text style={styles.sectionTitle}>Comentarios ({comments.length})</Text>
                            <TouchableOpacity onPress={() => setShowAllComments(!showAllComments)}>
                                <Text style={styles.seeAllText}>
                                    {showAllComments ? 'Ver menos' : 'Ver todos'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Lista de Comentarios */}
                        <FlatList
                            data={displayedComments}
                            renderItem={renderComment}
                            keyExtractor={item => item.id.toString()}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
                        />

                        {/* Agregar Comentario */}
                        <View style={styles.addCommentSection}>
                            <Text style={styles.addCommentTitle}>Agrega tu comentario</Text>

                            {/* Calificación */}
                            <View style={styles.ratingInput}>
                                <Text style={styles.ratingLabel}>Tu calificación:</Text>
                                {renderStars(userRating, true, 24)}
                            </View>

                            {/* Input de comentario */}
                            <View style={styles.commentInputContainer}>
                                <TextInput
                                    style={styles.commentInput}
                                    placeholder="Escribe tu experiencia con este plato..."
                                    placeholderTextColor="#999"
                                    value={newComment}
                                    onChangeText={setNewComment}
                                    multiline
                                    numberOfLines={3}
                                />
                                <ActionButton
                                    onPress={handleAddComment}
                                    size="small"
                                    variant="default"
                                    accessibilityLabel="Enviar comentario"
                                    style={styles.submitCommentButton}
                                >
                                    <Feather name="send" size={16} color="white" />
                                </ActionButton>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </Animated.ScrollView>

            {/* Barra de Acciones Fija con componentes Common */}
            <ActionBar
                quantity={quantity}
                onIncrease={handleIncreaseQuantity}
                onDecrease={handleDecreaseQuantity}
                onAddToCart={handleAddToCart}
                price={foodItem.price}
                buttonText="Añadir al carrito"
                style={styles.actionBar}
            />
        </SafeAreaView>
    );
};

// Estilos (se mantienen igual)
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
        paddingTop: StatusBar.currentHeight || 10,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingBottom: 100,
    },
    // Carrusel Principal
    carouselSection: {
        height: 350,
        position: 'relative',
    },
    carousel: {
        flex: 1,
    },
    carouselItem: {
        width: screenWidth,
        height: 350,
        position: 'relative',
    },
    carouselImage: {
        width: '100%',
        height: '100%',
    },

    // Botones de navegación del carrusel
    carouselButton: {
        position: 'absolute',
        top: '50%',
        transform: [{ translateY: -20 }],
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ff80009f',
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
    // Contador de imágenes
    imageCounter: {
        position: 'absolute',
        top: 40,
        alignContent: 'center',
        alignSelf: 'center',
        backgroundColor: '#ff80009f',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    imageCounterText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },

    // Botón de favorito
    favoriteButton: {
        position: 'absolute',
        top: 260,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 100,
    },
    heartAnimation: {
        width: 70,
        height: 70,
    },
    // Main Content
    mainContent: {
        padding: 20,
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -40,
    },
    titleSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    foodTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10,
        fontFamily: 'Poppins-Bold',
    },
    foodPrice: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FF8000',
        fontFamily: 'Poppins-Bold',
    },
    ratingSection: {
        marginBottom: 24,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    starsContainer: {
        flexDirection: 'row',
        marginRight: 12,
    },
    interactiveStar: {
        marginHorizontal: 2,
    },
    ratingText: {
        fontSize: 16,
        color: '#666',
        fontFamily: 'Poppins-Regular',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statAnimate: {
        top: 5,
        width: 30,
        height: 30,
    },
    clockAnimate: {
        width: 30,
        height: 30,
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
    descriptionSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffffff',
        marginBottom: 12,
        fontFamily: 'Poppins-SemiBold',
    },
    descriptionText: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
        fontFamily: 'Poppins-Regular',
    },
    ingredientsSection: {
        marginBottom: 24,
    },
    ingredientsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    ingredientChip: {
        backgroundColor: '#f8f8f8',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    ingredientText: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Poppins-Regular',
    },
    // Comentarios
    commentsSection: {
        backgroundColor: '#cacacaff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    commentsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    seeAllText: {
        color: '#FF8000',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Poppins-SemiBold',
    },
    commentCard: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userAvatar: {
        fontSize: 24,
        marginRight: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
        fontFamily: 'Poppins-SemiBold',
    },
    commentDate: {
        fontSize: 12,
        color: '#999',
        fontFamily: 'Poppins-Regular',
    },
    commentText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        fontFamily: 'Poppins-Regular',
    },
    addCommentSection: {
        marginTop: 20,
        marginBottom: 60,
        padding: 16,
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
    },
    addCommentTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        fontFamily: 'Poppins-SemiBold',
    },
    ratingInput: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    ratingLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 12,
        fontFamily: 'Poppins-Regular',
    },
    commentInputContainer: {
        position: 'relative',
    },
    commentInput: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        paddingRight: 50,
        fontSize: 14,
        color: '#333',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        textAlignVertical: 'top',
        fontFamily: 'Poppins-Regular',
    },
    submitCommentButton: {
        position: 'absolute',
        right: 8,
        bottom: 8,
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    // Action Bar
    actionBar: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
    },
});

export default FoodDetailScreen;