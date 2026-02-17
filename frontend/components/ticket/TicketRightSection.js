import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TicketRightSection = ({ ticket, type = 'front' }) => {
    const logoappTicket = require('../../assets/adaptive-icon.png');
    const lineDecoTicket = require('../../assets/img/line-deco-ticket.png');

    return (
        <>
            <View style={styles.logoSection}>
                <Image
                    style={styles.logoImage}
                    source={logoappTicket}
                    resizeMode="contain"
                />
                <Image
                    style={styles.lineDeco}
                    source={lineDecoTicket}
                    resizeMode="contain"
                />
            </View>

            {type === 'front' && (
                <View style={styles.disclaimerSection}>
                    <Text style={styles.disclaimerText}>
                        {ticket.disclaimer}
                    </Text>
                </View>
            )}

            <View style={styles.tapIndicator}>
                <Ionicons
                    name={type === 'front' ? 'qr-code' : 'refresh'}
                    size={14}
                    color={ticket.color}
                />
                <Text style={styles.tapText}>
                    {type === 'front' ? 'Toca para voltear' : 'Volver al ticket'}
                </Text>
            </View>
        </>
    );
};

// ✅ AGREGAR ESTOS ESTILOS
const styles = StyleSheet.create({
    logoSection: {
        alignItems: 'center',
    },
    logoImage: {
        width: 40,
        height: 45,
    },
    lineDeco: {
        width: 1,
        height: 12,
        marginVertical: 6,
    },
    disclaimerSection: {
        flex: 1,
        justifyContent: 'center',
    },
    disclaimerText: {
        fontFamily: 'Poppins-Bold',
        color: 'black',
        fontSize: 8,
        textAlign: 'center',
        lineHeight: 10,
    },
    tapIndicator: {
        alignItems: 'center',
        gap: 3,
    },
    tapText: {
        fontFamily: 'Poppins-Regular',
        color: '#666',
        fontSize: 7,
    },
});

export default TicketRightSection;