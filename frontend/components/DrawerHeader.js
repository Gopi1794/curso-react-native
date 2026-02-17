import React from 'react';

import { View, Text, Image, StyleSheet } from 'react-native';

const DrawerHeader = () => {
    return (
        <View style={styles.headerContainer}>
            <View style={styles.imageContainer}>
                <Image
                    source={require('../assets/img/usuario-img.jpg')}
                    style={styles.headerImage}
                    resizeMode="cover"
                />
            </View>
            <Text style={styles.greetingText}>Hola!👋</Text>
            <Text style={styles.userName}>Nombre de Usuario</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    },
    imageContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerImage: {
        width: 70,
        height: 70,
        borderRadius: 50,
    },
    greetingText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    userName: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
});

export default DrawerHeader;
