import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export const BackButton = ({
    onPress,
    color = "white",
    backgroundColor = '#ff8000ff',
    size = 24,
    style
}) => {
    const navigation = useNavigation();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            navigation.goBack();
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.backButton,
                { backgroundColor },
                style
            ]}
            onPress={handlePress}
        >
            <Ionicons name="arrow-back" size={size} color={color} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    backButton: {
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