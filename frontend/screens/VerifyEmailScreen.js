import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ImageBackground
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import API from '../services/api';
import { useAppDispatch } from '../store/hooks';
import { login } from '../store/slices/userSlice';
import Colors from '../constants/Colors';
import Spacing from '../constants/Spacing';

const CODE_LENGTH = 6;

export default function VerifyEmailScreen({ route, navigation, email: emailProp, onBack }) {
    const email = emailProp ?? route?.params?.email;
    const dispatch = useAppDispatch();

    const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const inputs = useRef([]);

    // Countdown para reenviar
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleChange = (text, index) => {
        // Solo números
        const digit = text.replace(/[^0-9]/g, '');
        if (!digit && text !== '') return;

        const newCode = [...code];
        newCode[index] = digit;
        setCode(newCode);

        // Avanzar al siguiente input
        if (digit && index < CODE_LENGTH - 1) {
            inputs.current[index + 1]?.focus();
        }

        // Si se llenaron todos, verificar automáticamente
        if (digit && index === CODE_LENGTH - 1) {
            const fullCode = newCode.join('');
            if (fullCode.length === CODE_LENGTH) {
                handleVerify(fullCode);
            }
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputs.current[index - 1]?.focus();
            const newCode = [...code];
            newCode[index - 1] = '';
            setCode(newCode);
        }
    };

    const handleVerify = async (fullCode) => {
        const codeStr = fullCode || code.join('');
        if (codeStr.length !== CODE_LENGTH) {
            Alert.alert('Error', 'Ingresá el código completo de 6 dígitos');
            return;
        }

        setLoading(true);
        try {
            const data = await API.auth.verifyEmail(email, codeStr);

            if (data.success) {
                // Guardar token y loguear
                await API.token.save(data.token);
                dispatch(login({
                    ...data.user,
                    token: data.token,
                    justRegistered: true,
                }));
            } else {
                Alert.alert('Error', data.message || 'Código incorrecto');
                // Limpiar código
                setCode(Array(CODE_LENGTH).fill(''));
                inputs.current[0]?.focus();
            }
        } catch (error) {
            console.error('Error verifying:', error);
            Alert.alert('Error', 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0) return;

        setResending(true);
        try {
            const data = await API.auth.resendVerification(email);
            if (data.success) {
                Alert.alert('Listo', 'Te enviamos un nuevo código');
                setCountdown(60);
                setCode(Array(CODE_LENGTH).fill(''));
                inputs.current[0]?.focus();
            } else {
                Alert.alert('Error', data.message);
            }
        } catch (error) {
            Alert.alert('Error', 'Error de conexión');
        } finally {
            setResending(false);
        }
    };

    return (
        <ImageBackground
            source={require('../assets/img/back-app.jpg')}
            style={styles.background}
        >
            <BlurView intensity={55} tint="dark" style={styles.blurOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
                    <View style={styles.content}>
                        {/* Icono */}
                        <View style={styles.iconContainer}>
                            <Ionicons name="mail-outline" size={48} color={Colors.primary} />
                        </View>

                        <Text style={styles.title}>Verificá tu email</Text>
                        <Text style={styles.subtitle}>
                            Enviamos un código de 6 dígitos a
                        </Text>
                        <Text style={styles.email}>{email}</Text>

                        {/* Inputs del código */}
                        <View style={styles.codeContainer}>
                            {code.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={ref => inputs.current[index] = ref}
                                    style={[
                                        styles.codeInput,
                                        digit ? styles.codeInputFilled : null,
                                    ]}
                                    value={digit}
                                    onChangeText={text => handleChange(text, index)}
                                    onKeyPress={e => handleKeyPress(e, index)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    textContentType="oneTimeCode"
                                    autoComplete={index === 0 ? 'sms-otp' : 'off'}
                                    selectTextOnFocus
                                />
                            ))}
                        </View>

                        {/* Botón verificar */}
                        <TouchableOpacity
                            style={[styles.verifyButton, loading && styles.buttonDisabled]}
                            onPress={() => handleVerify()}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.verifyButtonText}>Verificar</Text>
                            )}
                        </TouchableOpacity>

                        {/* Reenviar */}
                        <View style={styles.resendContainer}>
                            <Text style={styles.resendLabel}>¿No recibiste el código? </Text>
                            {countdown > 0 ? (
                                <Text style={styles.countdownText}>
                                    Reenviar en {countdown}s
                                </Text>
                            ) : (
                                <TouchableOpacity onPress={handleResend} disabled={resending}>
                                    <Text style={styles.resendLink}>
                                        {resending ? 'Enviando...' : 'Reenviar código'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Volver */}
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => onBack ? onBack() : navigation?.goBack()}
                        >
                            <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
                            <Text style={styles.backText}>Volver al registro</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    blurOverlay: {
        flex: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: Spacing.xl,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 136, 0, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        fontFamily: 'Poppins-Bold',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
    },
    email: {
        fontSize: 14,
        color: Colors.primary,
        fontFamily: 'Poppins-SemiBold',
        marginBottom: Spacing.xxl,
    },
    codeContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.xxl,
    },
    codeInput: {
        width: 48,
        height: 56,
        borderRadius: Spacing.md,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        color: Colors.textPrimary,
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        fontFamily: 'Poppins-Bold',
    },
    codeInputFilled: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(255, 136, 0, 0.1)',
    },
    verifyButton: {
        width: '100%',
        backgroundColor: Colors.primary,
        borderRadius: Spacing.md,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    verifyButtonText: {
        color: Colors.textOnPrimary,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Poppins-SemiBold',
    },
    resendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    resendLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: 'Poppins-Regular',
    },
    countdownText: {
        fontSize: 14,
        color: Colors.textMuted,
        fontFamily: 'Poppins-Regular',
    },
    resendLink: {
        fontSize: 14,
        color: Colors.primary,
        fontFamily: 'Poppins-SemiBold',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    backText: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: 'Poppins-Regular',
    },
});
