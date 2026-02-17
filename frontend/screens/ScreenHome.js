import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
    View,
    ScrollView,
    StyleSheet,
    StatusBar,
    FlatList,
    Dimensions,
    Text
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';

// Componentes reutilizables
import { HeaderSection } from '../components/HeaderSection';
import { CategoryFilter } from '../components/CategoryFilter';
import { PromoSection } from '../components/PromoSection';
import MenuItem from '../components/MenuItem';
import ListSugerencias from '../components/ListSugerencias';
import WelcomePopup from '../components/WelcomePopup';

// Datos
import menuItemsData from '../assets/data/menuItems.json';

const { width: screenWidth } = Dimensions.get('window');

export const ScreenHome = ({ navigation }) => {
    const promoFlatListRef = useRef(null);
    const menuItemsFlatListRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("TODOS");
    const [activePromoIndex, setActivePromoIndex] = useState(1);
    const [showWelcomePopup, setShowWelcomePopup] = useState(false);
    const [menuItems, setMenuItems] = useState(menuItemsData);

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
    const promos = menuItems.filter(item => item.category === "promoDia");

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
        if (promoItem) {
            navigation.navigate('PromoFoodDetail', {
                foodItem: promoItem,
                promoData: promo
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

    // Mostrar popup de bienvenida
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowWelcomePopup(true);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle="auto-content" translucent backgroundColor="#ff8000ff" />

            {/* Fondo con gradiente */}
            <LinearGradient
                colors={['#FFFF', '#FFFF']}
                style={styles.backgroundGradient}
            />

            {/* Header con búsqueda */}
            <HeaderSection
                onTicketPress={navigateToTicket}
                onCartPress={navigateToCart}
                cartItemsCount={2}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onClearSearch={handleClearSearch} // ✅ Nueva prop
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
                            <ListSugerencias />
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