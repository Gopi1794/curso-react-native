import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const CustomQRCode = ({
    value,
    size = 200,
    color = 'black',
    backgroundColor = 'white',
    logo, // Opcional: imagen del logo
    logoSize = 40,
    logoBackgroundColor = 'white',
    logoMargin = 5
}) => {
    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <QRCode
                value={value}
                size={size}
                color={color}
                backgroundColor={backgroundColor}
                logo={logo}
                logoSize={logoSize}
                logoBackgroundColor={logoBackgroundColor}
                logoMargin={logoMargin}
                getRef={(ref) => {
                    // Opcional: referencia al componente
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 10,
    },
});

export default CustomQRCode;