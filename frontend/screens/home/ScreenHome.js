import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
    View,
    StyleSheet,
    StatusBar,
    FlatList,
    Dimensions,
    Text,
    Animated,
} from "react-native";
// Componentes reutilizables
import { HeaderSection } from '../../components/HeaderSection';
import { CategoryFilter } from '../../components/CategoryFilter';
import { ErrorState } from '../../components/common/ErrorState';
import { PromoSection } from '../../components/PromoSection';
import MenuItem from '../../components/MenuItem';
import ListSugerencias from '../../components/ListSugerencias';
import WelcomePopup from '../../components/WelcomePopup';

// API
import API from '../../services/api';
import menuItemsData from '../../assets/data/menuItems.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { clearJustRegistered } from '../../store/slices/userSlice';

const { width: screenWidth } = Dimensions.get('window');

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
    const searchDebounceRef = useRef(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("TODOS");
    const [activePromoIndex, setActivePromoIndex] = useState(1);
    const [showWelcomePopup, setShowWelcomePopup] = useState(false);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [menuError, setMenuError] = useState(null);

    useEffect(() => {
        if (!selectedRestaurant) return;
        const fetchMenu = async () => {
            setMenuError(null);
            try {
                const response = await API.restaurants.getMenu(selectedRestaurant.id);
                if (response.success) {
                    setMenuItems(response.items.map(mapMenuItem));
                } else {
                    setMenuError('No se pudo cargar el menú');
                }
            } catch (err) {
                setMenuError('Error de conexión. Revisá tu internet.');
            } finally {
                setLoading(false);
            }
        };
        fetchMenu();
    }, [selectedRestaurant]);

    const categories = [
        { id: "todos",      label: "TODOS",      icon: "grid-outline" },
        { id: "ensaladas",  label: "ENSALADAS",  icon: "leaf-outline" },
        { id: "burgers",    label: "BURGERS",    icon: "fast-food-outline" },
        { id: "emplatados", label: "EMPLATADOS", icon: "restaurant-outline" },
        { id: "sandwichs",  label: "SANDWICHS",  icon: "nutrition-outline" },
        { id: "promos",     label: "PROMOS",     icon: "pricetag-outline" },
        { id: "pizzas",     label: "PIZZAS",     icon: "pizza-outline" },
        { id: "pastas",     label: "PASTAS",     icon: "flame-outline" },
        { id: "postres",    label: "POSTRES",    icon: "cafe-outline" },
        { id: "helados",    label: "HELADOS",    icon: "snow-outline" },
        { id: "bebidas",    label: "BEBIDAS",    icon: "beer-outline" },
    ];

    const promos = menuItems.filter(item => item.category === "promoDia");

    const searchItems = useCallback((query, items) => {
        if (!query.trim()) return items;
        const searchTerm = query.toLowerCase().trim();
        return items.filter(item => {
            if (item.name?.toLowerCase().includes(searchTerm)) return true;
            if (item.descriptionText?.toLowerCase().includes(searchTerm)) return true;
            if (Array.isArray(item.ingredientText)) {
                return item.ingredientText.some(i => i.toLowerCase().includes(searchTerm));
            }
            if (item.category?.toLowerCase().includes(searchTerm)) return true;
            return false;
        });
    }, []);

    const filteredMenuItems = useMemo(() => {
        let filtered = menuItems;
        if (selectedCategory !== "TODOS") {
            filtered = filtered.filter(
                item => item.category?.toLowerCase() === selectedCategory.toLowerCase()
            );
        }
        if (debouncedQuery.trim()) {
            filtered = searchItems(debouncedQuery, filtered);
        }
        return filtered;
    }, [menuItems, selectedCategory, debouncedQuery, searchItems]);

    const handleSearchChange = useCallback((text) => {
        setSearchQuery(text);
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setDebouncedQuery(text);
        }, 300);
    }, []);

    const handleCategoryPress = useCallback((categoryLabel) => {
        setSelectedCategory(categoryLabel);
        setSearchQuery("");
        setDebouncedQuery("");
        setTimeout(() => {
            menuItemsFlatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchQuery("");
        setDebouncedQuery("");
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
        promoFlatListRef.current?.scrollToIndex({ index: buttonId - 1, animated: true });
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

    const navigateToTicket = () => navigation.navigate('Tickets');
    const navigateToCart = () => navigation.navigate('Cart');

    const renderMenuItem = useCallback(({ item }) => (
        <MenuItem item={item} onAddToCart={handleAddToCart} />
    ), [handleAddToCart]);

    const renderEmptyResults = useCallback(() => {
        if (debouncedQuery.trim() && filteredMenuItems.length === 0) {
            return (
                <View style={styles.emptyResults} accessibilityRole="text">
                    <Text style={styles.emptyResultsText}>
                        No se encontraron resultados para "{debouncedQuery}"
                    </Text>
                    <Text style={styles.emptyResultsSubtext}>
                        Intentá con otros términos o revisá la ortografía
                    </Text>
                </View>
            );
        }
        return null;
    }, [debouncedQuery, filteredMenuItems.length]);

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

    useEffect(() => {
        if (justRegistered) {
            setShowWelcomePopup(true);
            dispatch(clearJustRegistered());
        }
    }, [justRegistered]);

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            <HeaderSection
                onTicketPress={navigateToTicket}
                onCartPress={navigateToCart}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onClearSearch={handleClearSearch}
                scrollY={scrollY}
            />

            <Animated.ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                removeClippedSubviews={true}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
            >
                <View style={styles.topSection}>
                    <CategoryFilter
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onCategoryPress={handleCategoryPress}
                    />

                    {debouncedQuery.trim() ? (
                        <View style={styles.searchResultsHeader} accessibilityRole="text">
                            <Text style={styles.searchResultsText}>
                                {filteredMenuItems.length} resultado{filteredMenuItems.length !== 1 ? 's' : ''} para "{debouncedQuery}"
                            </Text>
                        </View>
                    ) : null}

                    {loading ? (
                        <View style={styles.skeletonRow} accessibilityLabel="Cargando menú">
                            {[1, 2, 3, 4, 5].map(i => <MenuItemSkeleton key={i} />)}
                        </View>
                    ) : menuError ? (
                        <ErrorState
                            message={menuError}
                            onRetry={() => {
                                setLoading(true);
                                API.restaurants.getMenu(selectedRestaurant.id)
                                    .then(r => { if (r.success) setMenuItems(r.items.map(mapMenuItem)); else setMenuError('No se pudo cargar el menú'); })
                                    .catch(() => setMenuError('Error de conexión. Revisá tu internet.'))
                                    .finally(() => setLoading(false));
                            }}
                        />
                    ) : (
                        <FlatList
                            ref={menuItemsFlatListRef}
                            data={filteredMenuItems}
                            renderItem={renderMenuItem}
                            keyExtractor={item => item.id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.menuItemsContainer}
                            contentContainerStyle={styles.menuItemsContent}
                            ListEmptyComponent={renderEmptyResults}
                            initialNumToRender={4}
                            maxToRenderPerBatch={5}
                            windowSize={5}
                            extraData={selectedCategory}
                        />
                    )}
                </View>

                {!debouncedQuery.trim() && (
                    <>
                        <PromoSection
                            promos={promos}
                            activePromoIndex={activePromoIndex}
                            onPromoPress={handlePromoPress}
                            onPromoIndicatorPress={handlePromoIndicatorPress}
                            onPromoScroll={handlePromoScroll}
                            promoFlatListRef={promoFlatListRef}
                            onVerTodas={() => navigation.navigate('AllPromos', { promos })}
                        />

                        <View style={styles.sugerenciasWrapper}>
                            <ListSugerencias
                                navigation={navigation}
                                menuItems={menuItems}
                            />
                        </View>
                    </>
                )}
            </Animated.ScrollView>

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
    root: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    topSection: {
        minHeight: 300,
        paddingBottom: 20,
    },
    skeletonRow: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        marginTop: 10,
    },
    menuItemsContainer: {
        height: 270,
    },
    menuItemsContent: {
        paddingHorizontal: 15,
    },
    sugerenciasWrapper: {
        marginTop: 20,
        marginBottom: 20,
        minHeight: 280,
        paddingVertical: 10,
    },
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
