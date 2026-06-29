import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import API from '../../services/api';
import { useAppDispatch } from '../../store/hooks';
import { login } from '../../store/slices/userSlice';
import { showSuccessMessage, showErrorMessage } from '../../components/FlashMessageWrapper';

const CODE_LENGTH = 6;

const COLORS = {
    primary: '#EA580C',
    secondary: '#F97316',
};

export default function VerifyEmailScreen({ route, navigation, email: emailProp, onBack }) {
    const email = emailProp ?? route?.params?.email;
    const dispatch = useAppDispatch();

    const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const inputs = useRef([]);

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleChange = (text, index) => {
        const digit = text.replace(/[^0-9]/g, '');
        if (!digit && text !== '') return;

        const newCode = [...code];
        newCode[index] = digit;
        setCode(newCode);

        if (digit && index < CODE_LENGTH - 1) {
            inputs.current[index + 1]?.focus();
        }

        if (digit && index === CODE_LENGTH - 1) {
            const fullCode = newCode.join('');
            if (fullCode.length === CODE_LENGTH) handleVerify(fullCode);
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
            showErrorMessage('Código incompleto', 'Ingresá los 6 dígitos del código');
            return;
        }

        setLoading(true);
        try {
            const data = await API.auth.verifyEmail(email, codeStr);

            if (data.success) {
                await API.token.save(data.token);
                dispatch(login({ ...data.user, token: data.token, justRegistered: true }));
            } else {
                showErrorMessage('Código incorrecto', data.message || 'Revisá el código e intentá de nuevo');
                setCode(Array(CODE_LENGTH).fill(''));
                inputs.current[0]?.focus();
            }
        } catch {
            showErrorMessage('Sin conexión', 'No se pudo conectar con el servidor');
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
                showSuccessMessage('Código enviado', 'Revisá tu bandeja de entrada');
                setCountdown(60);
                setCode(Array(CODE_LENGTH).fill(''));
                inputs.current[0]?.focus();
            } else {
                showErrorMessage('Error', data.message);
            }
        } catch {
            showErrorMessage('Error', 'No se pudo reenviar el código');
        } finally {
            setResending(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.card}>
                        <View style={styles.cardInner}>
                            {/* Ícono */}
                            <View style={styles.iconContainer}>
                                <Ionicons name="mail-unread-outline" size={36} color={COLORS.secondary} />
                            </View>

                            <Text style={styles.title}>Verificá tu email</Text>
                            <Text style={styles.subtitle}>
                                Enviamos un código de 6 dígitos a
                            </Text>
                            <Text style={styles.email}>{email}</Text>

                            {/* OTP inputs */}
                            <View style={styles.codeRow}>
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
                                        accessibilityLabel={`Dígito ${index + 1}`}
                                    />
                                ))}
                            </View>

                            {/* Botón verificar */}
                            <TouchableOpacity
                                style={[styles.btnWrapper, loading && styles.btnDisabled]}
                                onPress={() => handleVerify()}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.secondary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.btn}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Text style={styles.btnText}>Verificar</Text>
                                            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Reenviar */}
                            <View style={styles.resendRow}>
                                <Text style={styles.resendLabel}>¿No recibiste el código? </Text>
                                {countdown > 0 ? (
                                    <Text style={styles.countdown}>Reenviar en {countdown}s</Text>
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
                                style={styles.backBtn}
                                onPress={() => onBack ? onBack() : navigation?.goBack()}
                                accessibilityRole="button"
                                accessibilityLabel="Volver al registro"
                            >
                                <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.6)" />
                                <Text style={styles.backText}>Volver al registro</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    background: { flex: 1 },

    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },

    card: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        borderRadius: 30,
        overflow: 'hidden',
    },
    cardInner: {
        backgroundColor: 'rgba(0,0,0,0.40)',
        borderRadius: 30,
        padding: 28,
        alignItems: 'center',
        gap: 8,
    },

    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(249,115,22,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(249,115,22,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },

    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 22,
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
    },
    email: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
        color: COLORS.secondary,
        textAlign: 'center',
        marginBottom: 12,
    },

    codeRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
        marginTop: 8,
    },
    codeInput: {
        width: 46,
        height: 56,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.08)',
        color: '#fff',
        fontSize: 22,
        fontFamily: 'Poppins-Bold',
        textAlign: 'center',
    },
    codeInputFilled: {
        borderColor: COLORS.secondary,
        backgroundColor: 'rgba(249,115,22,0.15)',
    },

    btnWrapper: {
        width: '100%',
        borderRadius: 25,
        shadowColor: '#EA580C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
        marginBottom: 8,
    },
    btnDisabled: { opacity: 0.6 },
    btn: {
        borderRadius: 25,
        paddingVertical: 17,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    btnText: {
        fontFamily: 'Poppins-Bold',
        color: '#fff',
        fontSize: 18,
    },

    resendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 4,
    },
    resendLabel: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: 'rgba(255,255,255,0.65)',
    },
    countdown: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: 'rgba(255,255,255,0.4)',
    },
    resendLink: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        color: COLORS.secondary,
    },

    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        padding: 8,
    },
    backText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
    },
});
