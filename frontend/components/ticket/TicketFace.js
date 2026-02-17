import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import TicketRightSection from './TicketRightSection';

const TicketFace = ({
    ticket,
    image,
    type = 'front',
    children
}) => {
    return (
        <View style={styles.ticketFace}>
            <View style={styles.ticketLeft}>
                <Image
                    style={styles.decoTicket}
                    source={image}
                    resizeMode="cover"
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.4)']}
                    style={styles.imageOverlay}
                />

                {children}

                {type === 'front' && (
                    <View style={styles.validUntilContainer}>
                        <Ionicons name="calendar-outline" size={10} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.validUntilText}>
                            Valido hasta: {ticket.validUntil}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.dottedLineContainer}>
                <View style={styles.dottedcircul} />
                <View style={styles.dottedLine} />
                <View style={styles.dottedcircul} />
            </View>

            <View style={styles.ticketRight}>
                <TicketRightSection ticket={ticket} type={type} />
            </View>

            <View style={[styles.glowEffect, { backgroundColor: ticket.color }]} />
        </View>
    );
};

// ✅ AGREGAR ESTOS ESTILOS
const styles = StyleSheet.create({
    ticketFace: {
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#f8f8f8',
    },
    ticketLeft: {
        flex: 2.1,
        backgroundColor: '#f8f8f8',
        position: 'relative',
    },
    decoTicket: {
        width: "100%",
        height: '100%',
        position: 'absolute',
        left: 0,
        top: 0,
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    validUntilContainer: {
        position: 'absolute',
        bottom: 12,
        left: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        zIndex: 2,
    },
    validUntilText: {
        fontFamily: 'Poppins-Regular',
        color: 'white',
        fontSize: 9,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    dottedLineContainer: {
        position: 'absolute',
        left: '73%',
        zIndex: 10,
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        width: 15,
        height: 180,
        top: -17,
        bottom: 0,
    },
    dottedcircul: {
        width: 20,
        height: 20,
        borderRadius: 50,
        backgroundColor: '#dadadaff',
    },
    dottedLine: {
        flex: 1,
        width: 2,
        backgroundColor: '#979797ff',
        marginVertical: 3,
    },
    ticketRight: {
        flex: 0.5,
        flexDirection: 'column',
        backgroundColor: '#c7c7c7ff',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        position: 'relative',
    },
    glowEffect: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        opacity: 0.6,
    },
});

export default TicketFace;