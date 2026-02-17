import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AppHeader = ({
    title,
    onBack,
    showBackButton = true,
    rightComponent
}) => {
    return (
        <View style={styles.header}>
            <View style={styles.headerContent}>
                {showBackButton ? (
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.backButtonPlaceholder} />
                )}

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{title}</Text>
                </View>

                {rightComponent || <View style={styles.headerRight} />}
            </View>
        </View>
    );
};

// ✅ AGREGAR ESTOS ESTILOS
const styles = StyleSheet.create({
    header: {
        backgroundColor: '#ff8000ff',
        position: 'absolute',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
        top: 0,
        left: 0,
        right: 0,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        zIndex: 1000,
        paddingTop: StatusBar.currentHeight || 20,
    },
    headerContent: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    backButtonPlaceholder: {
        width: 44,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitle: {
        fontFamily: 'Poppins-Bold',
        color: 'white',
        fontSize: 20,

    },
    headerRight: {
        width: 44,
    },
});

export default AppHeader;