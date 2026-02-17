// screens/TicketScreen.js
import React, { useRef, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    Dimensions,
    StatusBar,
    TouchableOpacity,
    Animated,
    Image, // ← AGREGAR ESTA IMPORTACIÓN
    Text // ← AGREGAR ESTA IMPORTACIÓN
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // ← AGREGAR ESTA IMPORTACIÓN
import { LinearGradient } from 'expo-linear-gradient';

// Componentes comunes
import AppHeader from '../components/common/AppHeader';
import InstructionBanner from '../components/common/InstructionBanner';

// Datos y configuraciones
import ticketsData from '../assets/data/tickets.json';
import { ticketImages } from '../config/images';

const { width: screenWidth } = Dimensions.get('window');

const TicketScreen = ({ navigation }) => {
    const [tickets] = useState(ticketsData.tickets);

    const handleGoBack = () => {
        navigation.goBack();
    };

    const navigateToTicketDetail = (ticket) => {
        navigation.navigate('TicketDetail', { ticket });
    };

    const TicketItem = ({ ticket }) => {
        const scaleAnim = useRef(new Animated.Value(1)).current;

        const handlePressIn = () => {
            Animated.spring(scaleAnim, {
                toValue: 0.97,
                useNativeDriver: true,
            }).start();
        };

        const handlePressOut = () => {
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
            }).start();
        };

        return (
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                    onPress={() => navigateToTicketDetail(ticket)}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={0.9}
                >
                    <View style={styles.ticketContainer}>
                        {/* Frente del ticket */}
                        <View style={styles.ticketFace}>
                            <View style={styles.ticketLeft}>
                                <Image
                                    style={styles.decoTicket}
                                    source={ticketImages[ticket.img]}
                                    resizeMode="cover"
                                />

                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.4)']}
                                    style={styles.imageOverlay}
                                />

                                <View style={styles.ticketContent}>
                                    <View style={[styles.offerBadge, { backgroundColor: ticket.color }]}>
                                        <Text style={styles.offerText}>{ticket.offer}</Text>
                                    </View>
                                    <Text style={styles.titleText}>{ticket.title}</Text>
                                </View>

                                <View style={styles.validUntilContainer}>
                                    <Ionicons name="calendar-outline" size={10} color="rgba(255,255,255,0.9)" />
                                    <Text style={styles.validUntilText}>
                                        Valido hasta: {ticket.validUntil}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.dottedLineContainer}>
                                <View style={styles.dottedcircul} />
                                <View style={styles.dottedLine} />
                                <View style={styles.dottedcircul} />
                            </View>

                            <View style={styles.ticketRight}>
                                <View style={styles.logoSection}>
                                    <Image
                                        style={styles.logoImage}
                                        source={require('../assets/adaptive-icon.png')}
                                        resizeMode="contain"
                                    />
                                    <Image
                                        style={styles.lineDeco}
                                        source={require('../assets/img/line-deco-ticket.png')}
                                        resizeMode="contain"
                                    />
                                </View>

                                <View style={styles.tapIndicator}>
                                    <Ionicons name="qr-code" size={16} color={ticket.color} />
                                    <Text style={styles.tapText}>Toca para QR</Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.glowEffect, { backgroundColor: ticket.color }]} />
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <LinearGradient
                colors={['#ffffffff', '#ffffffff', '#ffffffff']}
                style={styles.backgroundGradient}
            />

            <AppHeader
                title="Mis Tickets"
                onBack={handleGoBack}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <InstructionBanner
                        text="Toca cualquier ticket para ver el código QR"
                    />

                    {tickets.map((ticket) => (
                        <TicketItem key={ticket.id} ticket={ticket} />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

// Estilos (mantener los mismos que tenías)
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundGradient: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    scrollView: {
        flex: 1,
        marginTop: 100,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    content: {
        padding: 20,
        zIndex: 1,
    },
    ticketContainer: {
        height: 140,
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
        position: 'relative',
    },
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
    tapIndicator: {
        alignItems: 'center',
        gap: 3,
    },
    tapText: {
        fontFamily: 'Poppins-Regular',
        color: '#666',
        fontSize: 7,
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

export default TicketScreen;