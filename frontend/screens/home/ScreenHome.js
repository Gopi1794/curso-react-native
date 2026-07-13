import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
    View,
    StyleSheet,
    StatusBar,
    FlatList,
    Dimensions,
    Text,
    Animated,
    RefreshControl,
    Modal,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
// Componentes reutilizables
import { HeaderSection } from '../../components/HeaderSection';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import { CategoryExploreGrid } from '../../components/CategoryExploreGrid';
import { ErrorState } from '../../components/common/ErrorState';
import { PromoSection } from '../../components/PromoSection';
import SpinWheel from '../../components/rewards/SpinWheel';
import MenuItem from '../../components/MenuItem';
import RecommendationsSection from '../../components/RecommendationsSection';
import WelcomePopup from '../../components/WelcomePopup';
import RecentSearchesPanel from '../../components/common/RecentSearchesPanel';

// API
import API from '../../services/api';
import menuItemsData from '../../assets/data/menuItems.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { clearJustRegistered } from '../../store/slices/userSlice';
import { useNotificationBadge } from '../../hooks/useNotificationBadge';

const { width: screenWidth } = Dimensions.get('window');

const useShimmer = () => {
    const shimmer = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
};

const MenuItemSkeleton = () => {
    const opacity = useShimmer();
    return (
        <Animated.View style={[skeletonStyles.card, { opacity }]}>
            <View style={skeletonStyles.image} />
            <View style={skeletonStyles.titleLine} />
            <View style={skeletonStyles.priceLine} />
            <View style={skeletonStyles.button} />
        </Animated.View>
    );
};

const PromoSkeleton = () => {
    const opacity = useShimmer();
    return (
        <View style={skeletonStyles.promoSection}>
            {/* Header */}
            <View style={skeletonStyles.promoHeader}>
                <View>
                    <Animated.View style={[skeletonStyles.promoTitleLine, { opacity }]} />
                    <Animated.View style={[skeletonStyles.promoSubtitleLine, { opacity }]} />
                </View>
                <Animated.View style={[skeletonStyles.promoVerTodas, { opacity }]} />
            </View>
            {/* Card */}
            <Animated.View style={[skeletonStyles.promoCard, { opacity }]} />
            {/* Dots */}
            <View style={skeletonStyles.promoDots}>
                {[0, 1, 2].map(i => (
                    <Animated.View key={i} style={[skeletonStyles.promoDot, i === 0 && skeletonStyles.promoDotActive, { opacity }]} />
                ))}
            </View>
        </View>
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

    // Promo skeleton
    promoSection: { paddingBottom: 8 },
    promoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 18,
    },
    promoTitleLine: { width: 160, height: 14, borderRadius: 7, backgroundColor: '#E0E0E0', marginBottom: 6 },
    promoSubtitleLine: { width: 200, height: 10, borderRadius: 5, backgroundColor: '#E8E8E8' },
    promoVerTodas: { width: 64, height: 12, borderRadius: 6, backgroundColor: '#E0E0E0' },
    promoCard: {
        marginHorizontal: 20,
        height: 160,
        borderRadius: 20,
        backgroundColor: '#E8E8E8',
        marginTop: 20,
    },
    promoDots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 16, marginBottom: 8 },
    promoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
    promoDotActive: { width: 20, backgroundColor: '#D0D0D0' },

});

const mapMenuItem = (item) => ({
    id: item.id,
    name: item.nombre,
    price: `$${parseFloat(item.precio).toFixed(2)}`,
    basePrice: parseFloat(item.precio),
    imageKey: item.imagen_key,
    category: item.categoria,
    calories: item.calories ?? item.calorias ?? null,
    weight: item.weight ?? item.peso ?? null,
    descriptionText: item.descripcion,
    ingredientText: item.ingredientes || [],
    ingredientesDetalle: item.ingredientes_detalle || [],
    disponible: item.disponible,
    opciones: item.opciones || null,
});

export const ScreenHome = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const justRegistered = useAppSelector((state) => state.user.justRegistered);
    const selectedRestaurant = useAppSelector((state) => state.restaurant.selected);
    const promoFlatListRef = useRef(null);
    const menuItemsFlatListRef = useRef(null);
    const searchDebounceRef = useRef(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const menuListAnim = useRef(new Animated.Value(1)).current;
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("todos");
    const [activePromoIndex, setActivePromoIndex] = useState(1);
    const [showWelcomePopup, setShowWelcomePopup] = useState(false);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [menuError, setMenuError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const { unreadCount: unreadNotifications } = useNotificationBadge();

    const fetchMenu = useCallback(async (isRefresh = false) => {
        if (!selectedRestaurant) return;
        if (!isRefresh) setLoading(true);
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
            setRefreshing(false);
        }
    }, [selectedRestaurant]);

    useEffect(() => { fetchMenu(); }, [fetchMenu]);

    useEffect(() => {
        AsyncStorage.getItem('recentSearches')
            .then(raw => { if (raw) setRecentSearches(JSON.parse(raw)); })
            .catch(() => {});
    }, []);

    const saveSearch = useCallback(async (term) => {
        const trimmed = term.trim();
        if (!trimmed) return;
        setRecentSearches(prev => {
            const updated = [trimmed, ...prev.filter(s => s !== trimmed)].slice(0, 6);
            AsyncStorage.setItem('recentSearches', JSON.stringify(updated)).catch(() => {});
            return updated;
        });
    }, []);

    const handleRemoveRecentSearch = useCallback((term) => {
        setRecentSearches(prev => {
            const updated = prev.filter(s => s !== term);
            AsyncStorage.setItem('recentSearches', JSON.stringify(updated)).catch(() => {});
            return updated;
        });
    }, []);

    const handleClearAllRecentSearches = useCallback(() => {
        setRecentSearches([]);
        AsyncStorage.removeItem('recentSearches').catch(() => {});
    }, []);

    const handleSelectRecentSearch = useCallback((term) => {
        setSearchQuery(term);
        setDebouncedQuery(term);
        setSearchFocused(false);
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchMenu(true);
    }, [fetchMenu]);

    const CATEGORY_MAP = {
        cafe_merienda:      ['cafe_merienda'],
        para_picar:         ['picadas', 'finger_food', 'papas_gourmet', 'empanadas'],
        sandwiches_burgers: ['sandwiches', 'hamburguesas'],
        platos:             ['milanesas', 'platos', 'pastas', 'promoDia'],
        pizzas:             ['pizzas', 'tartas'],
        ensaladas:          ['ensaladas'],
        sin_tacc:           ['sin_tacc'],
        dulces:             ['dulces', 'helados'],
        bebidas:            ['bebidas'],
    };

    const CATEGORIAS_BUCKET_URL = 'https://bbavirgboqyvqhxvuarp.supabase.co/storage/v1/object/public/Categorias';

    const EXPLORE_CATEGORIES = [
        { id: 'cafe_merienda',      label: 'Cafe & Meriendas', image: `${CATEGORIAS_BUCKET_URL}/${encodeURIComponent('cafe&merienda.webp')}`, size: 'sm' },
        { id: 'para_picar',         label: 'Para Picar',        image: `${CATEGORIAS_BUCKET_URL}/parapicar.webp`, size: 'sm', offsetY: 8 },
        { id: 'sandwiches_burgers', label: 'Burgers & Sandwiches', image: `${CATEGORIAS_BUCKET_URL}/${encodeURIComponent('burgers&sandwich.webp')}`, offsetY: -16 },
        { id: 'platos',             label: 'Platos',            image: `${CATEGORIAS_BUCKET_URL}/platos.webp` },
        { id: 'pizzas',             label: 'Pizzas',             image: `${CATEGORIAS_BUCKET_URL}/pizzas.webp` },
        { id: 'ensaladas',          label: 'Ensaladas',          image: `${CATEGORIAS_BUCKET_URL}/ensaldas.webp` },
        { id: 'sin_tacc',           label: 'SIN TACC',           image: `${CATEGORIAS_BUCKET_URL}/sintacc.webp`, size: 'msm', offsetY: 8 },
        { id: 'dulces',             label: 'Dulces',             image: `${CATEGORIAS_BUCKET_URL}/dulce.webp`, size: 'msm', offsetY: 8 },
        { id: 'bebidas',            label: 'Bebidas',            image: `${CATEGORIAS_BUCKET_URL}/bebidas.webp` },
    ];

    const exploreCategories = useMemo(() => {
        const hour = new Date().getHours();
        let priorityId;
        if (hour >= 7 && hour < 11)       priorityId = 'cafe_merienda';
        else if (hour >= 11 && hour < 16) priorityId = 'platos';
        else if (hour >= 16 && hour < 18) priorityId = 'para_picar';
        else                               priorityId = 'pizzas';
        const priority = EXPLORE_CATEGORIES.find(c => c.id === priorityId);
        const rest      = EXPLORE_CATEGORIES.filter(c => c.id !== priorityId);
        return [priority, ...rest].filter(Boolean);
    }, []);

    const promos = useMemo(
        () => menuItems.filter(item => item.category === 'promoDia'),
        [menuItems]
    );

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
        if (selectedCategory !== 'todos') {
            const dbCategories = CATEGORY_MAP[selectedCategory];
            if (dbCategories) {
                filtered = filtered.filter(item => dbCategories.includes(item.category));
            }
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
        menuListAnim.setValue(0);
        Animated.spring(menuListAnim, {
            toValue: 1,
            useNativeDriver: true,
            damping: 16,
            stiffness: 140,
            mass: 0.9,
        }).start();
        setTimeout(() => {
            menuItemsFlatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
    }, [menuListAnim]);

    const handleClearSearch = useCallback(() => {
        setSearchQuery("");
        setDebouncedQuery("");
    }, []);

    const handleSearchSubmit = useCallback(() => {
        if (searchQuery.trim()) saveSearch(searchQuery);
        setSearchFocused(false);
    }, [searchQuery, saveSearch]);

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
        if (debouncedQuery.trim() && foodItem) saveSearch(foodItem.name);
        navigation.navigate('FoodDetail', { foodItem });
    }, [menuItems, navigation, debouncedQuery, saveSearch]);

    const navigateToTicket = () => navigation.navigate('Tickets');
    const navigateToCart = () => navigation.navigate('Cart');
    const navigateToNotifications = () => navigation.navigate('NotificationsFeed');

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

    const renderMenuSection = useCallback(() => {
        if (loading) {
            return (
                <View style={styles.skeletonRow} accessibilityLabel="Cargando menú">
                    {[1, 2, 3, 4, 5].map(i => <MenuItemSkeleton key={i} />)}
                </View>
            );
        }
        if (menuError) {
            return (
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
            );
        }
        return (
            <Animated.View
                style={{
                    opacity: menuListAnim,
                    transform: [{
                        translateY: menuListAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
                    }],
                }}
            >
                <View>
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
                    <LinearGradient
                        colors={['#FFFFFF', 'rgba(255,255,255,0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.menuFadeLeft}
                        pointerEvents="none"
                    />
                    <LinearGradient
                        colors={['rgba(255,255,255,0)', '#FFFFFF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.menuFadeRight}
                        pointerEvents="none"
                    />
                </View>
            </Animated.View>
        );
    }, [loading, menuError, filteredMenuItems, renderMenuItem, renderEmptyResults, selectedCategory, menuListAnim, selectedRestaurant]);

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
                onNotificationsPress={navigateToNotifications}
                unreadNotifications={unreadNotifications}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onClearSearch={handleClearSearch}
                onSearchFocus={() => setSearchFocused(true)}
                onSearchBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onSearchSubmit={handleSearchSubmit}
                scrollY={scrollY}
            />

            <Animated.ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                removeClippedSubviews={true}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#FF8700']}
                        tintColor="#FF8700"
                        progressViewOffset={(StatusBar.currentHeight || 40) + 60}
                    />
                }
            >
                {searchFocused && !debouncedQuery.trim() && recentSearches.length > 0 && (
                    <RecentSearchesPanel
                        searches={recentSearches}
                        onSelect={handleSelectRecentSearch}
                        onRemove={handleRemoveRecentSearch}
                        onClearAll={handleClearAllRecentSearches}
                    />
                )}

                {!debouncedQuery.trim() && (
                    loading ? <PromoSkeleton /> : (
                        <View style={{ marginTop: 16 }}>
                        <PromoSection
                            promos={promos}
                            activePromoIndex={activePromoIndex}
                            onPromoPress={handlePromoPress}
                            onPromoIndicatorPress={handlePromoIndicatorPress}
                            onPromoScroll={handlePromoScroll}
                            promoFlatListRef={promoFlatListRef}
                            onVerTodas={() => navigation.navigate('AllPromos', { promos })}
                        />
                        </View>
                    )
                )}

                <View style={styles.topSection}>
                    <CategoryExploreGrid
                        categories={exploreCategories}
                        selectedCategory={selectedCategory}
                        onCategoryPress={handleCategoryPress}
                        renderExpanded={!debouncedQuery.trim() ? renderMenuSection : undefined}
                    />

                    {debouncedQuery.trim() && (
                        <>
                            <View style={styles.searchResultsHeader} accessibilityRole="text">
                                <Text style={styles.searchResultsText}>
                                    {filteredMenuItems.length} resultado{filteredMenuItems.length !== 1 ? 's' : ''} para "{debouncedQuery}"
                                </Text>
                            </View>
                            {renderMenuSection()}
                        </>
                    )}
                </View>


                {!debouncedQuery.trim() && !loading && selectedRestaurant && (
                    <RecommendationsSection
                        restauranteId={selectedRestaurant.id}
                        onItemPress={(item) => {
                            const menuItem = menuItems.find(m => m.id === item.id);
                            if (menuItem) navigation.navigate('FoodDetail', { foodItem: menuItem });
                        }}
                    />
                )}
            </Animated.ScrollView>

            {showWelcomePopup && (
                <WelcomePopup
                    showWelcomePopup={showWelcomePopup}
                    setShowWelcomePopup={setShowWelcomePopup}
                />
            )}

            <Modal visible transparent animationType="fade">
                <View style={styles.spinWheelBackdrop}>
                    <SpinWheel />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    spinWheelBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.96)',
        justifyContent: 'center',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: FLOATING_TAB_BAR_HEIGHT + 24,
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
    menuFadeLeft: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 24,
    },
    menuFadeRight: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 24,
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
