import React from 'react';
import { TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Share } from 'react-native';

export const ShareButton = ({
    shareOptions,
    color = "white",
    backgroundColor = '#ff8000ff',
    size = 20,
    style
}) => {
    const handleShare = async () => {
        try {
            await Share.share(shareOptions);
        } catch (error) {
            Alert.alert('Error', 'No se pudo compartir el contenido');
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.shareButton,
                { backgroundColor },
                style
            ]}
            onPress={handleShare}
        >
            <Ionicons name="share-outline" size={size} color={color} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    shareButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
});