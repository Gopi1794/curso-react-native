import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TicketContent = ({ ticket }) => {
    return (
        <View style={styles.ticketContent}>
            <View style={[styles.offerBadge, { backgroundColor: ticket.color }]}>
                <Text style={styles.offerText}>{ticket.offer}</Text>
            </View>
            <Text style={styles.titleText}>{ticket.title}</Text>
        </View>
    );
};

// ✅ AGREGAR ESTOS ESTILOS
const styles = StyleSheet.create({
    ticketContent: {
        zIndex: 2,
        position: 'absolute',
        top: 15,
        left: 15,
    },
    offerBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        marginBottom: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
    },
    offerText: {
        fontFamily: 'Poppins-Bold',
        color: 'white',
        fontSize: 12,
    },
    titleText: {
        fontFamily: 'Poppins-Bold',
        color: 'white',
        fontSize: 14,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
});

export default TicketContent;