import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppSelector } from '../../store/hooks';

export const Header = ({
    onTicketPress,
    onCartPress,
}) => {

    const cartItems = useAppSelector(state => state.cart.items);

    const totalItemsCount = cartItems.reduce((total, item) => total + item.quantity, 0);

    return (
        <View style={styles.header}>
            <View style={styles.logoContainer}>
                <Image
                    source={require("../../assets/img/logoApp.png")}
                    style={styles.logoImage}
                />
                <Text style={styles.logoText}>APPFOOD</Text>
            </View>

            <View style={styles.icons}>
                <TouchableOpacity onPress={onTicketPress} style={styles.headerButton}>
                    <Ionicons name="ticket-outline" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity onPress={onCartPress} style={styles.headerButton}>
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
    icons: {
        flexDirection: "row",
        gap: 10,
    },
    headerButton: {
        padding: 8,
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