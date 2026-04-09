import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { clearRestaurant } from '../../store/slices/restaurantSlice';

export const Header = ({
    onTicketPress,
    onCartPress,
}) => {

    const dispatch = useAppDispatch();
    const cartItems = useAppSelector(state => state.cart.items);
    const selectedRestaurant = useAppSelector(state => state.restaurant.selected);

    const totalItemsCount = cartItems.reduce((total, item) => total + item.quantity, 0);

    return (
        <View style={styles.header}>
            <View style={styles.logoContainer}>
                <Image
                    source={require("../../assets/img/logoApp.png")}
                    style={styles.logoImage}
                />
                <View>
                    <Text style={styles.logoText}>APPFOOD</Text>
                    {selectedRestaurant && (
                        <TouchableOpacity
                            onPress={() => dispatch(clearRestaurant())}
                            style={styles.branchButton}
                        >
                            <Ionicons name="location" size={11} color="#fff" />
                            <Text style={styles.branchText} numberOfLines={1}>
                                {selectedRestaurant.nombre.replace('FoodApp - ', '')}
                            </Text>
                            <Ionicons name="chevron-down" size={11} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.icons}>
                <TouchableOpacity
                    onPress={onTicketPress}
                    style={styles.headerButton}
                    accessibilityLabel="Mis cupones"
                    accessibilityRole="button"
                >
                    <Ionicons name="ticket-outline" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onCartPress}
                    style={styles.headerButton}
                    accessibilityLabel={totalItemsCount > 0 ? `Carrito, ${totalItemsCount} ${totalItemsCount === 1 ? 'item' : 'items'}` : 'Carrito vacío'}
                    accessibilityRole="button"
                >
                    <Ionicons name="cart-outline" size={24} color="white" />
                    {totalItemsCount > 0 && (
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>
                                {totalItemsCount > 99 ? '99+' : totalItemsCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 22,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoImage: {
        width: 27,
        height: 25,
    },
    logoText: {
        fontWeight: '900',
        color: 'white',
        fontSize: 23,
        marginLeft: 8,
    },
    branchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        marginTop: 1,
    },
    branchText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.9)',
        marginHorizontal: 3,
        maxWidth: 140,
    },
    icons: {
        flexDirection: "row",
        gap: 10,
    },
    headerButton: {
        padding: 10,
        minWidth: 44,
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    cartBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#D80000',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
});