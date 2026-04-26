import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
    View,
    ScrollView,
    StyleSheet,
    StatusBar,
    FlatList,
    Dimensions,
    Text,
    Animated,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
// Componentes reutilizables
import { HeaderSection } from '../components/HeaderSection';
import { CategoryFilter } from '../components/CategoryFilter';
import { PromoSection } from '../components/PromoSection';
import MenuItem from '../components/MenuItem';
import ListSugerencias from '../components/ListSugerencias';
import WelcomePopup from '../components/WelcomePopup';

// API
import API from '../services/api';
import menuItemsData from '../assets/data/menuItems.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { clearJustRegistered } from '../store/slices/userSlice';

const { width: screenWidth } = Dimensions.get('window');

// Se obtiene del store de Redux (seleccionado en SelectRestaurantScreen)

// Skeleton shimmer para mientras carga el menú
const MenuItemSkeleton = () => {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

    return (
        <Animated.View style={[skeletonStyles.card, { opacity }]}>
            <View style={skeletonStyles.image} />
            <View style={skeletonStyles.titleLine} />
            <View style={skeletonStyles.priceLine} />
            <View style={skeletonStyles.button} />
        </Animated.View>
    );
};

const skeletonStyles = StyleSheet.create({
    card: {
        width: 105,
        height: 131,
        marginRight: 22,
        backgroundColor: 'rgba(217, 217, 217, 1)',
        borderRadius: 25,
        alignItems: 'center',
        paddingTop: 8,
        marginTop: 50,
    },
    image: {
        width: 90,
        height: 70,
        borderRadius: 15,
        backgroundColor: '#C8C8C8',
        marginBottom: 8,
    },
    titleLine: {
        width: 70,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#C8C8C8',
        marginBottom: 6,
    },
    priceLine: {
        width: 45,
        height: 10,
        borderRadius: 4,
        backgroundColor: '#C8C8C8',
        marginBottom: 8,
    },
    button: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#D8D8D8',
    },
});

// Mapea campos de la API al shape que esperan los componentes
const mapMenuItem = (item) => ({
    id: item.id,
    name: item.nombre,
    price: `$${parseFloat(item.precio).toFixed(2)}`,
    imageKey: item.imagen_key,
    category: item.categoria,
    calories: item.calories ?? item.calorias ?? null,
    weight: item.weight ?? item.peso ?? null,
    descriptionText: item.descripcion,
    ingredientText: item.ingredientes || [],
    ingredientesDetalle: item.ingredientes_detalle || [],
    disponible: item.disponible,
});

export const ScreenHome = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const justRegistered = useAppSelector((state) => state.user.justRegistered);
    const selectedRestaurant = useAppSelector((state) => state.restaurant.selected);
    const promoFlatListRef = useRef(null);
    const menuItemsFlatListRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("TODOS");
    const [activePromoIndex, setActivePromoIndex] = useState(1);
    const [showWelcomePopup, setShowWelcomePopup] = useState(false);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!selectedRestaurant) return;
        const fetchMenu = async () => {
            try {
                const response = await API.restaurants.getMenu(selectedRestaurant.id);
                if (response.success) {
                    setMenuItems(response.items.map(mapMenuItem));
                }
            } catch (err) {
                console.error('Error cargando menú:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMenu();
    }, [selectedRestaurant]);

    // Categorías
    const categories = [
        { id: "todos", label: "TODOS" },
        { id: "ensaladas", label: "ENSALADAS" },
        { id: "burgers", label: "BURGERS" },
        { id: "emplatados", label: "EMPLATADOS" },
        { id: "sandwichs", label: "SANDWICHS" },
        { id: "promos", label: "PROMOS" },
        { id: "pizzas", label: "PIZZAS" },
        { id: "pastas", label: "PASTAS" },
        { id: "postres", label: "POSTRES" },
        { id: "helados", label: "HELADOS" },
        { id: "bebidas", label: "BEBIDAS" }
    ];

    // Promociones
    const promos = menuItems
        .filter(item => item.category === "promoDia");

    // ✅ FUNCIÓN DE BÚSQUEDA MEJORADA
    const searchItems = useCallback((query, items) => {
        if (!query.trim()) return items;

        const searchTerm = query.toLowerCase().trim();
        return items.filter(item => {
            // Buscar en nombre
            if (item.name?.toLowerCase().includes(searchTerm)) return true;

            // Buscar en descripción
            if (item.descriptionText?.toLowerCase().includes(searchTerm)) return true;

            // Buscar en ingredientes
            if (Array.isArray(item.ingredientText)) {
                return item.ingredientText.some(ingredient =>
                    ingredient.toLowerCase().includes(searchTerm)
                );
            }

            // Buscar en categoría
            if (item.category?.toLowerCase().includes(searchTerm)) return true;

            return false;
        });
    }, []);

    // ✅ ITEMS FILTRADOS CON USEMEMO PARA OPTIMIZACIÓN
    const filteredMenuItems = useMemo(() => {
        let filtered = menuItems;

        // Aplicar filtro de categoría
        if (selectedCategory !== "TODOS") {
            filtered = filtered.filter(
                item => item.category?.toLowerCase() === selectedCategory.toLowerCase()
            );
        }

        // Aplicar filtro de búsqueda
        if (searchQuery.trim()) {
            filtered = searchItems(searchQuery, filtered);
        }

        return filtered;
    }, [menuItems, selectedCategory, searchQuery, searchItems]);

    // ✅ HANDLERS OPTIMIZADOS
    const handleSearchChange = useCallback((text) => {
        setSearchQuery(text);
    }, []);

    const handleCategoryPress = useCallback((categoryLabel) => {
        setSelectedCategory(categoryLabel);
        setSearchQuery(""); // Limpiar búsqueda al cambiar categoría

        setTimeout(() => {
            menuItemsFlatListRef.current?.scrollToOffset({
                offset: 0,
                animated: true
            });
        }, 100);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchQuery("");
    }, []);

    const handlePromoPress = useCallback((promo) => {
        const promoItem = menuItems.find(item => item.id === promo.id);
        const localItem = menuItemsData.find(item => item.id === promo.id);
        if (promoItem) {
            navigation.navigate('PromoFoodDetail', {
                foodItem: {
                    ...promoItem,
                    imageKey: Array.isArray(localItem?.imageKey) ? localItem.imageKey : promoItem.imageKey,
                    includes: localItem?.includes ?? promoItem.includes,
                    discountPercentage: localItem?.discountPercentage ?? promoItem.discountPercentage,
                    originalPrice: localItem?.originalPrice ?? promoItem.originalPrice,
                },
            });
        }
    }, [menuItems, navigation]);

    const handlePromoIndicatorPress = useCallback((buttonId) => {
        setActivePromoIndex(buttonId);
        promoFlatListRef.current?.scrollToIndex({
            index: buttonId - 1,
            animated: true
        });
    }, []);

    const handlePromoScroll = useCallback((event) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const activeIndex = Math.round(contentOffsetX / (screenWidth - 80)) + 1;
        setActivePromoIndex(activeIndex);
    }, []);

    const handleAddToCart = useCallback((itemId) => {
        const foodItem = menuItems.find(item => item.id === itemId);
        navigation.navigate('FoodDetail', { foodItem });
    }, [menuItems, navigation]);

    const navigateToTicket = () => {
        navigation.navigate('Tickets');
    };

    const navigateToCart = () => {
        navigation.navigate('Cart');
    };

    // ✅ RENDERIZADORES OPTIMIZADOS
    const renderMenuItem = useCallback(({ item }) => (
        <MenuItem item={item} onAddToCart={handleAddToCart} />
    ), [handleAddToCart]);

    // ✅ COMPONENTE PARA RESULTADOS VACÍOS
    const renderEmptyResults = useCallback(() => {
        if (searchQuery.trim() && filteredMenuItems.length === 0) {
            return (
                <View style={styles.emptyResults}>
                    <Text style={styles.emptyResultsText}>
                        No se encontraron resultados para "{searchQuery}"
                    </Text>
                    <Text style={styles.emptyResultsSubtext}>
                        Intenta con otros términos o revisa la ortografía
                    </Text>
                </View>
            );
        }
        return null;
    }, [searchQuery, filteredMenuItems.length]);

    // Mostrar popup de bienvenida solo después de un login exitoso
    useEffect(() => {
        const checkWelcome = async () => {
            const show = await AsyncStorage.getItem('showWelcomePopup');
            if (show === 'true') {
                await AsyncStorage.removeItem('showWelcomePopup');
                setShowWelcomePopup(true);
            }
        };
        checkWelcome();
    }, []);

    // Mostrar popup de bienvenida al registrarse
    useEffect(() => {
        if (justRegistered) {
            setShowWelcomePopup(true);
            dispatch(clearJustRegistered());
        }
    }, [justRegistered]);

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* Fondo con gradiente */}
            <LinearGradient
                colors={['#FFFF', '#FFFF']}
                style={styles.backgroundGradient}
            />

            {/* Header con búsqueda */}
            <HeaderSection
                onTicketPress={navigateToTicket}
                onCartPress={navigateToCart}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onClearSearch={handleClearSearch}
            />

            {/* Contenido desplazable */}
            <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                removeClippedSubviews={true}
            >
                {/* Sección superior con categorías y menú */}
                <View style={styles.topSection}>
                    <View style={styles.headerSpacer} />

                    {/* Filtros de categoría */}
                    <CategoryFilter
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onCategoryPress={handleCategoryPress}
                    />

                    {/* ✅ Mensaje de resultados de búsqueda */}
                    {searchQuery.trim() && (
                        <View style={styles.searchResultsHeader}>
                            <Text style={styles.searchResultsText}>
                                {filteredMenuItems.length} resultado{filteredMenuItems.length !== 1 ? 's' : ''} para "{searchQuery}"
                            </Text>
                        </View>
                    )}

                    {/* Lista de items del menú */}
                    {loading && (
                        <View style={{ flexDirection: 'row', paddingHorizontal: 15, marginTop: 10 }}>
                            {[1, 2, 3].map(i => <MenuItemSkeleton key={i} />)}
                        </View>
                    )}
                    <FlatList
                        ref={menuItemsFlatListRef}
                        data={filteredMenuItems}
                        renderItem={renderMenuItem}
                        keyExtractor={item => item.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.menuItemsContainer}
                        contentContainerStyle={styles.menuItemsContent}
                        ListEmptyComponent={renderEmptyResults} // ✅ Mostrar cuando no hay resultados
                        initialNumToRender={3}
                        maxToRenderPerBatch={5}
                        windowSize={5}
                        removeClippedSubviews={true}
                        extraData={selectedCategory}
                    />
                </View>

                {/* ✅ OCULTAR PROMOCIONES Y SUGERENCIAS CUANDO HAY BÚSQUEDA ACTIVA */}
                {!searchQuery.trim() && (
                    <>
                        {/* Sección de promociones */}
                        <PromoSection
                            promos={promos}
                            activePromoIndex={activePromoIndex}
                            onPromoPress={handlePromoPress}
                            onPromoIndicatorPress={handlePromoIndicatorPress}
                            onPromoScroll={handlePromoScroll}
                            promoFlatListRef={promoFlatListRef}
                        />

                        {/* Sección de sugerencias */}
                        <View style={styles.sugerenciasWrapper}>
                            <ListSugerencias
                                navigation={navigation}
                                menuItems={menuItems}
                            />
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Popup de Bienvenida */}
            {showWelcomePopup && (
                <WelcomePopup
                    showWelcomePopup={showWelcomePopup}
                    setShowWelcomePopup={setShowWelcomePopup}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    backgroundGradient: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    headerSpacer: {
        height: 0,
    },
    topSection: {
        minHeight: 300,
        backgroundColor: 'transparent',
    },
    menuItemsContainer: {
        height: 250,
    },
    menuItemsContent: {
        paddingHorizontal: 15,
    },
    sugerenciasWrapper: {
        backgroundColor: 'transparent',
        marginTop: 20,
        marginBottom: 20,
        height: 300,
        paddingVertical: 10,
    },
    // ✅ NUEVOS ESTILOS PARA BÚSQUEDA
    searchResultsHeader: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'rgba(255, 135, 0, 0.1)',
        marginHorizontal: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    searchResultsText: {
        color: '#FF8700',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Poppins-SemiBold',
        textAlign: 'center',
    },
    emptyResults: {
        width: screenWidth - 30,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyResultsText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Poppins-SemiBold',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyResultsSubtext: {
        color: '#999',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
    },
});

export default ScreenHome;
