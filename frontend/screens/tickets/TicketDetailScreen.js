// screens/tickets/TicketDetailScreen.js
import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Dimensions,
    StatusBar,
    Animated,
    AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Componentes comunes
import AppHeader from '../../components/common/AppHeader';
import InstructionBanner from '../../components/common/InstructionBanner';
import TicketFlipCard from '../../components/ticket/TicketFlipCard';
import TicketContent from '../../components/ticket/TicketContent';
import CustomQRCode from '../../components/CustomQRCode';

// Datos y configuraciones
import { ticketImages, realProductImages } from '../../config/images';

const { width: screenWidth } = Dimensions.get('window');

const TicketDetailScreen = ({ route, navigation }) => {
    const { ticket } = route.params;
    const [reduceMotion, setReduceMotion] = useState(false);
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
            setReduceMotion(enabled);
            if (enabled) {
                fadeAnim.setValue(1);
                slideAnim.setValue(0);
            } else {
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        });
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
        return () => sub.remove();
    }, []);

    const handleGoBack = () => {
        navigation.goBack();
    };

    const getTicketImage = () => {
        return ticketImages[ticket.img] || ticketImages['ticket-1.webp'];
    };

    const getRealProductImage = () => {
        return realProductImages[ticket.realImage] || getTicketImage();
    };

    const renderFrontContent = () => (
        <TicketContent ticket={ticket} />
    );

    const renderBackContent = () => (
        <View style={styles.productLabel}>
            <Text style={styles.productLabelText}>PRODUCTO REAL</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <View style={styles.background} />

            <AppHeader
                title="Detalle del Cupón"
                onBack={handleGoBack}
            />

            <ScrollView
                style={[styles.scrollView, { marginTop: insets.top + 44 + 16 }]}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: FLOATING_TAB_BAR_HEIGHT + 24 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Instrucción */}
                <InstructionBanner
                    text="Toca la imagen para voltear y ver el producto real"
                />

                {/* Flip Card */}
                <View
                    style={styles.flipWrapper}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Imagen del cupón, toca para ver el producto real"
                    accessibilityHint="Voltea la tarjeta para mostrar el producto"
                >
                    <TicketFlipCard
                        ticket={ticket}
                        showFront={true}
                        frontImage={getTicketImage()}
                        backImage={getRealProductImage()}
                        frontContent={renderFrontContent()}
                        backContent={renderBackContent()}
                    />
                </View>

                {/* Info principal */}
                <Animated.View style={[
                    styles.infoCard,
                    { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                ]}>
                    {/* Barra de color */}
                    <View style={[styles.infoColorBar, { backgroundColor: ticket.color }]} />

                    <View style={[styles.offerBadge, { backgroundColor: ticket.color }]}>
                        <Ionicons name="pricetag" size={14} color="#fff" />
                        <Text style={styles.offerText}>{ticket.offer}</Text>
                    </View>

                    <Text style={styles.titleText}>{ticket.title}</Text>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color="#888" />
                        <Text style={styles.infoLabel}>Válido hasta</Text>
                        <Text style={styles.infoValue}>{ticket.validUntil}</Text>
                    </View>

                    {ticket.disclaimer ? (
                        <View style={styles.disclaimerBox}>
                            <Ionicons name="information-circle-outline" size={14} color="#e67e00" />
                            <Text style={styles.disclaimerText}>{ticket.disclaimer}</Text>
                        </View>
                    ) : null}
                </Animated.View>

                {/* QR Code */}
                <Animated.View style={[
                    styles.qrCard,
                    { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                ]}>
                    <Text style={styles.qrTitle}>Código QR para canjear</Text>

                    <View style={styles.qrWrapper}>
                        <CustomQRCode
                            value={ticket.code}
                            size={180}
                            color="#1a1a1a"
                            backgroundColor="white"
                        />
                    </View>

                    <View style={styles.codeBox}>
                        <Text style={styles.codeText}>{ticket.code}</Text>
                    </View>

                    <View style={styles.qrInstructionRow}>
                        <Ionicons name="scan-outline" size={16} color="#888" />
                        <Text style={styles.qrInstruction}>
                            Presentá este código al personal para canjear tu promo
                        </Text>
                    </View>
                </Animated.View>

                {/* Términos */}
                {ticket.backText ? (
                    <Animated.View style={[
                        styles.termsCard,
                        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                    ]}>
                        <View style={styles.termsHeader}>
                            <Ionicons name="document-text-outline" size={16} color="#888" />
                            <Text style={styles.termsTitle}>Términos y Condiciones</Text>
                        </View>
                        <Text style={styles.termsText}>{ticket.backText}</Text>
                    </Animated.View>
                ) : null}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        alignItems: 'center',
    },

    // Flip card
    flipWrapper: {
        width: screenWidth - 40,
        marginBottom: 20,
    },
    productLabel: {
        position: 'absolute',
        top: 15,
        left: 15,
        zIndex: 2,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    productLabelText: {
        fontFamily: 'Poppins-Bold',
        color: 'white',
        fontSize: 12,
    },

    // Info card
    infoCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        overflow: 'hidden',
    },
    infoColorBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
    },
    offerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        marginBottom: 12,
    },
    offerText: {
        fontFamily: 'Poppins-Bold',
        color: '#fff',
        fontSize: 14,
    },
    titleText: {
        fontFamily: 'Poppins-Bold',
        color: '#222',
        fontSize: 20,
        marginBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    infoLabel: {
        fontFamily: 'Poppins-Regular',
        color: '#888',
        fontSize: 13,
    },
    infoValue: {
        fontFamily: 'Poppins-Bold',
        color: '#333',
        fontSize: 13,
    },
    disclaimerBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#fff8f0',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ffe0b2',
    },
    disclaimerText: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        color: '#b36b00',
        fontSize: 12,
        lineHeight: 18,
    },

    // QR Card
    qrCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    qrTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
        color: '#333',
        marginBottom: 20,
    },
    qrWrapper: {
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#f0f0f0',
        marginBottom: 16,
    },
    codeBox: {
        backgroundColor: '#f8f8f8',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 16,
    },
    codeText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        color: '#333',
        letterSpacing: 2,
    },
    qrInstructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    qrInstruction: {
        flex: 1,
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#888',
        lineHeight: 18,
    },

    // Terms card
    termsCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    termsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    termsTitle: {
        fontFamily: 'Poppins-Bold',
        color: '#333',
        fontSize: 14,
    },
    termsText: {
        fontFamily: 'Poppins-Regular',
        color: '#666',
        fontSize: 13,
        lineHeight: 20,
    },
});

export default TicketDetailScreen;
