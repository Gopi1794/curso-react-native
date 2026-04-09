import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Alert,
    Dimensions,
    FlatList,
    TextInput,
    Animated,
    Modal,
    Switch,
    PanResponder,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Lottie from 'lottie-react-native';
import { Share } from 'react-native';

// Componentes Common
import { BackButton } from '../components/common/BackButton';
import { ShareButton } from '../components/common/ShareButton';
import { ActionButton } from '../components/ActionButton';

// Datos, API y Redux
import api from '../services/api';
import { imageMap } from '../assets/utils/imageMap';
const toUri = (val) => {
    if (typeof val === 'string') return val;
    if (val && val.uri) return val.uri;
    return null;
};
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { addToFavorites, removeFromFavorites } from '../store/slices/userSlice';
import { addToCart } from '../store/slices/cartSlice';
import { showSuccessMessage, showErrorMessage, showFavoriteMessage } from '../components/FlashMessageWrapper';
import { ActionBar } from '../components/common/ActionBar';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const heartLikeAnimation = require('../assets/animations/like.json');
const statAnimate = require('../assets/animations/statAnimate.json');
const clockAnimate = require('../assets/animations/clock.json');

// Helper para formatear fecha relativa
const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 5) return `Hace ${diffWeeks} semana${diffWeeks > 1 ? 's' : ''}`;
    const diffMonths = Math.floor(diffDays / 30);
    return `Hace ${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
};

const FoodDetailScreen = ({ route }) => {
    const navigation = useNavigation();
    const { foodItem } = route.params;

    const dispatch = useAppDispatch();
    const favorites = useAppSelector(state => state.user.favorites);
    const userInfo = useAppSelector(state => state.user.userInfo);

    const [isFavorite, setIsFavorite] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [userRating, setUserRating] = useState(0);
    const [showAllComments, setShowAllComments] = useState(false);
    const [ratingPromedio, setRatingPromedio] = useState(0);
    const [totalResenas, setTotalResenas] = useState(0);
    const [loadingComments, setLoadingComments] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [carouselImages, setCarouselImages] = useState([]);
    const [selectedIngredients, setSelectedIngredients] = useState(
        () => new Set(foodItem.ingredientText || [])
    );

    // Mapa de ingredientes removibles (desde ingredientes_detalle del backend)
    const removibleMap = React.useMemo(() => {
        const map = {};
        (foodItem.ingredientesDetalle || []).forEach(ing => {
            map[ing.nombre] = ing.es_removible;
        });
        return map;
    }, [foodItem.ingredientesDetalle]);
    const [showIngredientSheet, setShowIngredientSheet] = useState(false);
    const sheetAnim = useRef(new Animated.Value(0)).current;

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

    // Cargar comentarios desde la API
    const fetchComments = async () => {
        try {
            const data = await api.comentarios.getByMenuItem(foodItem.id);
            if (data.success) {
                setComments(data.comentarios.map(c => ({
                    id: c.id,
                    userId: c.usuario_id,
                    user: `${c.nombre} ${c.apellido}`,
                    rating: c.rating,
                    comment: c.comentario,
                    date: timeAgo(c.fecha_creacion),
                    avatar: c.nombre.charAt(0).toUpperCase()
                })));
                setRatingPromedio(data.rating_promedio);
                setTotalResenas(data.total_resenas);
            }
        } catch (error) {
            console.error('Error cargando comentarios:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [foodItem.id]);

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
                image: { uri: toUri(imageMap[mainImageKey]) },
                descriptionText: foodItem.descriptionText,
                ingredientText: foodItem.ingredientText,
                ingredientesDetalle: foodItem.ingredientesDetalle,
                addedDate: new Date().toISOString()
            };
            dispatch(addToFavorites(favoriteItem));
            showFavoriteMessage(true);
        }
        setIsFavorite(!isFavorite);
    };

    const handleToggleIngredient = (ingredient) => {
        // Solo permitir toggle si el ingrediente es removible
        if (removibleMap[ingredient] === false) return;
        setSelectedIngredients(prev => {
            const next = new Set(prev);
            next.has(ingredient) ? next.delete(ingredient) : next.add(ingredient);
            return next;
        });
    };

    const openIngredientSheet = () => {
        setShowIngredientSheet(true);
        Animated.spring(sheetAnim, {
            toValue: 1,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
        }).start();
    };

    const closeIngredientSheet = () => {
        Animated.timing(sheetAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
        }).start(() => setShowIngredientSheet(false));
    };

    const removedCount = (foodItem.ingredientText || []).filter(i => !selectedIngredients.has(i)).length;

    const handleAddToCart = (selectedQuantity = quantity) => {
        const mainImageKey = Array.isArray(foodItem.imageKey)
            ? foodItem.imageKey[0]
            : foodItem.imageKey;

        const allIngredients = foodItem.ingredientText || [];
        const removedIngredients = allIngredients.filter(i => !selectedIngredients.has(i));

        const cartItem = {
            id: foodItem.id,
            name: foodItem.name,
            price: parseFloat(foodItem.price.replace('$', '')),
            image: imageMap[mainImageKey],
            quantity: selectedQuantity,
            description: foodItem.descriptionText,
            removedIngredients,
        };

        dispatch(addToCart(cartItem));
        showSuccessMessage('¡Agregado al carrito!', `${foodItem.name} se ha añadido al carrito`);
        setQuantity(1);
    };

    // ✅ FUNCIONES PARA COMENTARIOS
    const handleAddComment = async () => {
        if (!newComment.trim() || userRating < 1) {
            showErrorMessage('Faltan datos', 'Agrega un comentario y una calificación');
            return;
        }
        setSubmitting(true);
        try {
            const data = await api.comentarios.create(foodItem.id, userRating, newComment.trim());
            if (data.success) {
                setNewComment('');
                setUserRating(0);
                showSuccessMessage('¡Gracias!', 'Tu comentario ha sido publicado');
                fetchComments();
            } else {
                showErrorMessage('Error', data.message || 'No se pudo publicar el comentario');
            }
        } catch (error) {
            showErrorMessage('Error', 'No se pudo conectar con el servidor');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteComment = async () => {
        try {
            const data = await api.comentarios.remove(foodItem.id);
            if (data.success) {
                showSuccessMessage('Eliminado', 'Tu comentario fue borrado');
                fetchComments();
            } else {
                showErrorMessage('Error', data.message || 'No se pudo eliminar');
            }
        } catch (error) {
            showErrorMessage('Error', 'No se pudo conectar con el servidor');
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
                source={{ uri: toUri(imageMap[item.imageKey]) }}
                style={styles.carouselImage}
                resizeMode="cover"
            />
        </View>
    );

    // Renderizar comentarios
    const isOwnComment = (comment) => userInfo && comment.userId == userInfo.id;

    const renderComment = ({ item }) => (
        <View style={styles.commentCard}>
            <View style={styles.commentHeader}>
                <View style={styles.userInfo}>
                    <Text style={styles.userAvatar}>{item.avatar}</Text>
                    <View>
                        <Text style={styles.userName}>
                            {item.user}{isOwnComment(item) ? ' (Tú)' : ''}
                        </Text>
                        {renderStars(item.rating, false, 14)}
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.commentDate}>{item.date}</Text>
                    {isOwnComment(item) && (
                        <TouchableOpacity onPress={handleDeleteComment} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Feather name="trash-2" size={16} color="#e74c3c" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <Text style={styles.commentText}>{item.comment}</Text>
        </View>
    );

    const displayedComments = showAllComments ? comments : comments.slice(0, 2);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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
                            {renderStars(ratingPromedio, false, 20)}
                            <Text style={styles.ratingText}>
                                {ratingPromedio > 0 ? `${ratingPromedio} (${totalResenas} reseña${totalResenas !== 1 ? 's' : ''})` : 'Sin reseñas aún'}
                            </Text>
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

                    {/* Botón de personalización */}
                    {foodItem.ingredientText && foodItem.ingredientText.length > 0 && (
                        <TouchableOpacity
                            style={[styles.customizeButton, removedCount > 0 && styles.customizeButtonActive]}
                            onPress={openIngredientSheet}
                            activeOpacity={0.8}
                        >
                            <Feather name="sliders" size={18} color={removedCount > 0 ? 'white' : '#FF8000'} />
                            <Text style={[styles.customizeButtonText, removedCount > 0 && styles.customizeButtonTextActive]}>
                                Personalizar ingredientes
                            </Text>
                            {removedCount > 0 && (
                                <View style={styles.customizeBadge}>
                                    <Text style={styles.customizeBadgeText}>{removedCount} quitado{removedCount > 1 ? 's' : ''}</Text>
                                </View>
                            )}
                            <Feather name="chevron-right" size={18} color={removedCount > 0 ? 'white' : '#FF8000'} />
                        </TouchableOpacity>
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

            {/* Bottom Sheet — Personalizar ingredientes */}
            <Modal
                visible={showIngredientSheet}
                transparent
                animationType="none"
                onRequestClose={closeIngredientSheet}
            >
                <TouchableOpacity
                    style={styles.sheetOverlay}
                    activeOpacity={1}
                    onPress={closeIngredientSheet}
                />
                <Animated.View style={[
                    styles.sheet,
                    {
                        transform: [{
                            translateY: sheetAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [500, 0],
                            })
                        }]
                    }
                ]}>
                    {/* Handle */}
                    <View style={styles.sheetHandle} />

                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <View>
                            <Text style={styles.sheetTitle}>Personalizá tu pedido</Text>
                            <Text style={styles.sheetSubtitle}>Desactivá lo que no querés</Text>
                        </View>
                        <TouchableOpacity onPress={closeIngredientSheet} style={styles.sheetClose}>
                            <Feather name="x" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Lista de ingredientes */}
                    <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
                        {(foodItem.ingredientText || []).map((ingredient, index) => {
                            const isOn = selectedIngredients.has(ingredient);
                            const canRemove = removibleMap[ingredient] !== false;
                            return (
                                <View key={index} style={[styles.sheetRow, !canRemove && { opacity: 0.5 }]}>
                                    <View style={styles.sheetRowLeft}>
                                        <View style={[styles.sheetDot, !isOn && styles.sheetDotOff]} />
                                        <View>
                                            <Text style={[styles.sheetRowText, !isOn && styles.sheetRowTextOff]}>
                                                {ingredient}
                                            </Text>
                                            {!canRemove && (
                                                <Text style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
                                                    Base del plato
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    <Switch
                                        value={isOn}
                                        onValueChange={() => handleToggleIngredient(ingredient)}
                                        disabled={!canRemove}
                                        trackColor={{ false: '#e0e0e0', true: '#FFD0A0' }}
                                        thumbColor={isOn ? '#FF8000' : '#bbb'}
                                        ios_backgroundColor="#e0e0e0"
                                    />
                                </View>
                            );
                        })}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.sheetFooter}>
                        {removedCount > 0 && (
                            <Text style={styles.sheetRemovedText}>
                                Sin: {(foodItem.ingredientText || []).filter(i => !selectedIngredients.has(i)).join(' · ')}
                            </Text>
                        )}
                        <TouchableOpacity style={styles.sheetConfirm} onPress={closeIngredientSheet}>
                            <Text style={styles.sheetConfirmText}>
                                {removedCount > 0 ? `Listo · ${removedCount} quitado${removedCount > 1 ? 's' : ''}` : 'Listo'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Modal>
        </View>
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
    // Botón de personalización en el detalle
    customizeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#FF8000',
        backgroundColor: '#FFF3E8',
        marginBottom: 24,
    },
    customizeButtonActive: {
        backgroundColor: '#FF8000',
        borderColor: '#FF8000',
    },
    customizeButtonText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
        color: '#FF8000',
    },
    customizeButtonTextActive: {
        color: 'white',
    },
    customizeBadge: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    customizeBadgeText: {
        color: 'white',
        fontSize: 11,
        fontFamily: 'Poppins-SemiBold',
    },
    // Bottom Sheet
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 32,
        maxHeight: '75%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 20,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ddd',
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 4,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    sheetTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#1a1a1a',
    },
    sheetSubtitle: {
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        color: '#999',
        marginTop: 2,
    },
    sheetClose: {
        padding: 6,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
    },
    sheetList: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    sheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    sheetRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    sheetDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF8000',
        marginRight: 12,
    },
    sheetDotOff: {
        backgroundColor: '#ddd',
    },
    sheetRowText: {
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        color: '#1a1a1a',
    },
    sheetRowTextOff: {
        color: '#bbb',
        textDecorationLine: 'line-through',
    },
    sheetFooter: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    sheetRemovedText: {
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        color: '#FF6B6B',
        marginBottom: 12,
        textAlign: 'center',
    },
    sheetConfirm: {
        backgroundColor: '#FF8000',
        borderRadius: 20,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#FF8000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    },
    sheetConfirmText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
    // Estilos legacy (mantenidos por compatibilidad)
    ingredientsSection: {
        marginBottom: 24,
    },
    ingredientRow: { flexDirection: 'row' },
    ingredientRowRemoved: {},
    checkbox: {},
    checkboxSelected: {},
    ingredientRowText: { flex: 1 },
    ingredientRowTextRemoved: {},
    removedBadge: {},
    removedBadgeText: {
        color: 'white',
        fontSize: 10,
        fontFamily: 'Poppins-SemiBold',
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