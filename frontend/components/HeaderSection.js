import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { clearRestaurant } from '../store/slices/restaurantSlice';
import { SearchBar } from './common/SearchBar';

export const HeaderSection = ({
    onTicketPress,
    onCartPress,
    searchQuery,
    onSearchChange,
    onClearSearch,
}) => {
    const insets = useSafeAreaInsets();
    const dispatch = useAppDispatch();

    const cartItems          = useAppSelector(state => state.cart.items);
    const selectedRestaurant = useAppSelector(state => state.restaurant.selected);

    const totalItems   = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const locationName = selectedRestaurant
        ? selectedRestaurant.nombre.replace('FoodApp - ', '')
        : 'Seleccionar sucursal';

    return (
        <View style={[styles.container, { paddingTop: insets.top + 10 }]}>

            {/* Fila superior: ubicación + iconos */}
            <View style={styles.topRow}>
                <TouchableOpacity
                    style={styles.locationBtn}
                    onPress={() => selectedRestaurant && dispatch(clearRestaurant())}
                    activeOpacity={selectedRestaurant ? 0.7 : 1}
                >
                    <Text style={styles.deliverLabel}>Entregar en</Text>
                    <View style={styles.locationRow}>
                        <Ionicons name="location-sharp" size={14} color="#ff8700" />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {locationName}
                        </Text>
                        {selectedRestaurant && (
                            <Ionicons name="chevron-down" size={14} color="#555" />
                        )}
                    </View>
                </TouchableOpacity>

                <View style={styles.icons}>
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={onTicketPress}
                        accessibilityLabel="Mis cupones"
                    >
                        <Ionicons name="ticket-outline" size={21} color="#222" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={onCartPress}
                        accessibilityLabel={totalItems > 0 ? `Carrito, ${totalItems} items` : 'Carrito vacío'}
                    >
                        <Ionicons name="cart-outline" size={21} color="#222" />
                        {totalItems > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {totalItems > 99 ? '99+' : totalItems}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Heading */}
            <Text style={styles.heading}>
                {'¿Qué se te antoja '}
                <Text style={styles.headingAccent}>Hoy?</Text>
            </Text>

            {/* Barra de búsqueda */}
            <SearchBar
                value={searchQuery}
                onChangeText={onSearchChange}
                onClearSearch={onClearSearch}
                placeholder="Buscar platos o restaurantes..."
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingBottom: 4,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 6,
        zIndex: 1000,
    },

    // Fila superior
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    locationBtn: {
        flex: 1,
        marginRight: 12,
    },
    deliverLabel: {
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        color: '#888',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    locationText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: '#111',
        maxWidth: 180,
    },

    // Iconos
    icons: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#D80000',
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: 'bold',
    },

    // Heading
    heading: {
        fontFamily: 'Poppins-Bold',
        fontSize: 26,
        color: '#111',
        lineHeight: 34,
        marginBottom: 12,
    },
    headingAccent: {
        color: '#ff8700',
    },
});
