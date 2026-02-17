// screens/TicketDetailScreen.js
import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Dimensions,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Componentes comunes
import AppHeader from '../components/common/AppHeader';
import InstructionBanner from '../components/common/InstructionBanner';
import TicketFlipCard from '../components/ticket/TicketFlipCard';
import TicketContent from '../components/ticket/TicketContent';
import CustomQRCode from '../components/CustomQRCode';

// Datos y configuraciones
import { ticketImages, realProductImages } from '../config/images';

const { width: screenWidth } = Dimensions.get('window');

// DEFINIR LOS ESTILOS ANTES del componente
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
        paddingBottom: 120,
        alignItems: 'center',
    },
    flipWrapper: {
        width: screenWidth - 40,
        marginBottom: 25,
    },
    productLabel: {
        position: 'absolute',
        top: 15,
        left: 15,
        zIndex: 2,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    productLabelText: {
        fontFamily: 'Poppins-Bold',
        color: 'white',
        fontSize: 8,
    },

    // SECCIONES ORIGINALES
    infoContainer: {
        backgroundColor: '#000',
        padding: 20,
        borderTopRightRadius: 15,
        borderTopLeftRadius: 15,
        width: '90%',
        alignItems: 'center',
    },
    offerText: {
        color: '#FF8000',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5,
    },
    titleText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    validUntilText: {
        color: '#ccc',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
    },
    disclaimerText: {
        color: '#FF6B6B',
        fontSize: 14,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    qrContainer: {
        zIndex: 1,
        backgroundColor: 'white',
        padding: 20,
        width: '95%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    qrTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    qrCodeContainer: {
        padding: 10,
        borderRadius: 10,
    },
    qrCodeText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'monospace',
        marginBottom: 10,
    },
    qrInstruction: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    termsContainer: {
        backgroundColor: '#000',
        padding: 20,
        borderBottomRightRadius: 15,
        borderBottomLeftRadius: 15,
        width: '90%',
    },
    termsTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    termsText: {
        color: '#ccc',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});

const TicketDetailScreen = ({ route, navigation }) => {
    const { ticket } = route.params;

    const handleGoBack = () => {
        navigation.goBack();
    };

    // Obtener imagen del ticket
    const getTicketImage = () => {
        return ticketImages[ticket.img] || ticketImages['ticket-1.webp'];
    };

    // Obtener imagen real del producto
    const getRealProductImage = () => {
        return realProductImages[ticket.realImage] || getTicketImage();
    };

    // Contenido frontal del ticket
    const renderFrontContent = () => (
        <TicketContent ticket={ticket} />
    );

    // Contenido trasero del ticket
    const renderBackContent = () => (
        <View style={styles.productLabel}>
            <Text style={styles.productLabelText}>PRODUCTO REAL</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Fondo con gradiente */}
            <LinearGradient
                colors={['#ffffffff', '#ffffffff', '#ffffffff']}
                style={styles.backgroundGradient}
            />

            <AppHeader
                title="Detalle del Ticket"
                onBack={handleGoBack}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Instrucción */}
                <InstructionBanner
                    text="Toca la imagen para voltear y ver el producto real"
                />

                {/* CONTENEDOR FLIP */}
                <View style={styles.flipWrapper}>
                    <TicketFlipCard
                        ticket={ticket}
                        showFront={true}
                        frontImage={getTicketImage()}
                        backImage={getRealProductImage()}
                        frontContent={renderFrontContent()}
                        backContent={renderBackContent()}
                    />
                </View>

                {/* Información del ticket */}
                <View style={styles.infoContainer}>
                    <Text style={styles.offerText}>{ticket.offer}</Text>
                    <Text style={styles.titleText}>{ticket.title}</Text>
                    <Text style={styles.validUntilText}>Válido hasta: {ticket.validUntil}</Text>
                    <Text style={styles.disclaimerText}>{ticket.disclaimer}</Text>
                </View>

                {/* Código QR */}
                <View style={styles.qrContainer}>
                    <Text style={styles.qrTitle}>Código QR para canjear</Text>
                    <View style={styles.qrCodeContainer}>
                        <CustomQRCode
                            value={ticket.code}
                            size={200}
                            color="black"
                            backgroundColor="white"
                        />
                    </View>
                    <Text style={styles.qrCodeText}>{ticket.code}</Text>
                    <Text style={styles.qrInstruction}>
                        Presenta este código al personal para canjear tu promo
                    </Text>
                </View>

                {/* Términos y condiciones */}
                <View style={styles.termsContainer}>
                    <Text style={styles.termsTitle}>Términos y Condiciones</Text>
                    <Text style={styles.termsText}>{ticket.backText}</Text>
                </View>
            </ScrollView>
        </View>
    );
};

export default TicketDetailScreen;