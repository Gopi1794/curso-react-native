import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import API from '../services/api';
import { showSuccessMessage, showErrorMessage } from './FlashMessageWrapper';

const COLORS = {
    primary: '#EA580C',
    secondary: '#F97316',
    error: '#DC2626',
};

export default function ForgotPasswordForm({ onBackToLogin }) {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);

    const codeRef = useRef(null);
    const newPasswordRef = useRef(null);
    const confirmRef = useRef(null);

    const handleSendCode = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            showErrorMessage('Campo vacío', 'Ingresá tu correo electrónico');
            return;
        }
        if (!emailRegex.test(email.trim())) {
            showErrorMessage('Email inválido', 'Ingresá un correo electrónico válido');
            return;
        }

        setLoading(true);
        try {
            const response = await API.auth.forgotPassword(email.trim().toLowerCase());
            if (response.success) {
                setStep(2);
            } else {
                showErrorMessage('Error', response.message || 'No se pudo enviar el código');
            }
        } catch {
            showErrorMessage('Sin conexión', 'No se pudo conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!code.trim() || code.length !== 6) {
            showErrorMessage('Código inválido', 'Ingresá el código de 6 dígitos');
            return;
        }
        if (!newPassword) {
            showErrorMessage('Campo vacío', 'Ingresá tu nueva contraseña');
            return;
        }
        if (newPassword.length < 8) {
            showErrorMessage('Contraseña débil', 'La contraseña debe tener al menos 8 caracteres');
            return;
        }
        if (newPassword !== confirmPassword) {
            showErrorMessage('No coinciden', 'Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        try {
            const response = await API.auth.resetPassword(email.trim().toLowerCase(), code.trim(), newPassword);
            if (response.success) {
                showSuccessMessage('¡Listo!', 'Tu contraseña fue cambiada. Ya podés iniciar sesión.');
                onBackToLogin();
            } else {
                if (response.expired) {
                    showErrorMessage('Código expirado', 'Solicitá un nuevo código');
                    setStep(1);
                    setCode('');
                } else {
                    showErrorMessage('Error', response.message || 'Código incorrecto');
                }
            }
        } catch {
            showErrorMessage('Sin conexión', 'No se pudo conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = (field) => [
        styles.inputContainer,
        focusedInput === field && styles.inputFocused,
    ];

    return (
        <KeyboardAvoidingView
            style={styles.mainContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <LinearGradient
                colors={['#C2410C', '#EA580C', '#F97316']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={styles.background}
            >
                <View style={styles.blob1} />
                <View style={styles.blob2} />
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.container}>
                        <BlurView intensity={35} tint="light" style={styles.blurContainer}>
                            <View style={styles.formContainer}>

                                {/* Header */}
                                <View style={styles.header}>
                                    <TouchableOpacity
                                        style={styles.backButton}
                                        onPress={onBackToLogin}
                                        disabled={loading}
                                    >
                                        <Ionicons name="arrow-back" size={22} color="white" />
                                    </TouchableOpacity>
                                    <View style={styles.headerText}>
                                        <Text style={styles.title}>
                                            {step === 1 ? 'Recuperar contraseña' : 'Nueva contraseña'}
                                        </Text>
                                        <Text style={styles.subtitle}>
                                            {step === 1
                                                ? 'Te enviamos un código a tu email'
                                                : `Código enviado a ${email}`}
                                        </Text>
                                    </View>
                                </View>

                                {/* Step indicator */}
                                <View style={styles.stepRow}>
                                    <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
                                    <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
                                    <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
                                </View>

                                {step === 1 ? (
                                    /* ── PASO 1: Email ── */
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Correo electrónico</Text>
                                        <View style={inputStyle('email')}>
                                            <Ionicons
                                                name="mail-outline"
                                                size={20}
                                                color={focusedInput === 'email' ? COLORS.secondary : '#888'}
                                                style={styles.inputIcon}
                                            />
                                            <TextInput
                                                style={styles.input}
                                                value={email}
                                                onChangeText={setEmail}
                                                placeholder="tu@email.com"
                                                placeholderTextColor="#888"
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                autoComplete="email"
                                                textContentType="emailAddress"
                                                returnKeyType="done"
                                                editable={!loading}
                                                onFocus={() => setFocusedInput('email')}
                                                onBlur={() => setFocusedInput(null)}
                                                onSubmitEditing={handleSendCode}
                                            />
                                        </View>
                                    </View>
                                ) : (
                                    /* ── PASO 2: Código + nueva contraseña ── */
                                    <>
                                        {/* Código */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Código de verificación</Text>
                                            <View style={inputStyle('code')}>
                                                <Ionicons
                                                    name="keypad-outline"
                                                    size={20}
                                                    color={focusedInput === 'code' ? COLORS.secondary : '#888'}
                                                    style={styles.inputIcon}
                                                />
                                                <TextInput
                                                    ref={codeRef}
                                                    style={[styles.input, styles.codeInput]}
                                                    value={code}
                                                    onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                                                    placeholder="123456"
                                                    placeholderTextColor="#888"
                                                    keyboardType="number-pad"
                                                    maxLength={6}
                                                    returnKeyType="next"
                                                    editable={!loading}
                                                    onFocus={() => setFocusedInput('code')}
                                                    onBlur={() => setFocusedInput(null)}
                                                    onSubmitEditing={() => newPasswordRef.current?.focus()}
                                                />
                                                <TouchableOpacity
                                                    onPress={() => { setStep(1); setCode(''); }}
                                                    disabled={loading}
                                                >
                                                    <Text style={styles.resendLink}>Reenviar</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Nueva contraseña */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Nueva contraseña</Text>
                                            <View style={inputStyle('newPassword')}>
                                                <Ionicons
                                                    name="lock-closed-outline"
                                                    size={20}
                                                    color={focusedInput === 'newPassword' ? COLORS.secondary : '#888'}
                                                    style={styles.inputIcon}
                                                />
                                                <TextInput
                                                    ref={newPasswordRef}
                                                    style={styles.input}
                                                    value={newPassword}
                                                    onChangeText={setNewPassword}
                                                    placeholder="Mínimo 8 caracteres"
                                                    placeholderTextColor="#888"
                                                    secureTextEntry={!showPassword}
                                                    autoComplete="new-password"
                                                    textContentType="newPassword"
                                                    returnKeyType="next"
                                                    editable={!loading}
                                                    onFocus={() => setFocusedInput('newPassword')}
                                                    onBlur={() => setFocusedInput(null)}
                                                    onSubmitEditing={() => confirmRef.current?.focus()}
                                                />
                                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Confirmar contraseña */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Confirmar contraseña</Text>
                                            <View style={inputStyle('confirm')}>
                                                <Ionicons
                                                    name="shield-checkmark-outline"
                                                    size={20}
                                                    color={focusedInput === 'confirm' ? COLORS.secondary : '#888'}
                                                    style={styles.inputIcon}
                                                />
                                                <TextInput
                                                    ref={confirmRef}
                                                    style={styles.input}
                                                    value={confirmPassword}
                                                    onChangeText={setConfirmPassword}
                                                    placeholder="Repetí la contraseña"
                                                    placeholderTextColor="#888"
                                                    secureTextEntry={!showConfirm}
                                                    autoComplete="new-password"
                                                    textContentType="newPassword"
                                                    returnKeyType="done"
                                                    editable={!loading}
                                                    onFocus={() => setFocusedInput('confirm')}
                                                    onBlur={() => setFocusedInput(null)}
                                                    onSubmitEditing={handleResetPassword}
                                                />
                                                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon}>
                                                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </>
                                )}

                                {/* Botón principal */}
                                <TouchableOpacity
                                    style={[styles.buttonWrapper, loading && styles.disabledButton]}
                                    onPress={step === 1 ? handleSendCode : handleResetPassword}
                                    activeOpacity={0.85}
                                    disabled={loading}
                                >
                                    <LinearGradient
                                        colors={[COLORS.primary, COLORS.secondary]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.button}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="white" size="small" />
                                        ) : (
                                            <>
                                                <Text style={styles.buttonText}>
                                                    {step === 1 ? 'Enviar código' : 'Cambiar contraseña'}
                                                </Text>
                                                <Ionicons
                                                    name={step === 1 ? 'send-outline' : 'checkmark-outline'}
                                                    size={20}
                                                    color="white"
                                                />
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={onBackToLogin} disabled={loading}>
                                    <Text style={styles.backLink}>Volver al inicio de sesión</Text>
                                </TouchableOpacity>

                            </View>
                        </BlurView>
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 10,
    },
    background: { flex: 1 },
    blob1: {
        position: 'absolute',
        width: 260, height: 260, borderRadius: 130,
        backgroundColor: '#fff', opacity: 0.1,
        top: -60, right: -60,
    },
    blob2: {
        position: 'absolute',
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: '#fff', opacity: 0.07,
        bottom: 80, left: -50,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    container: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        borderRadius: 30,
        overflow: 'hidden',
    },
    blurContainer: { borderRadius: 30, overflow: 'hidden' },
    formContainer: { padding: 28, gap: 18 },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    backButton: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        marginTop: 2,
    },
    headerText: { flex: 1 },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 20,
        color: 'white',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    subtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 2,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    stepDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    stepDotActive: { backgroundColor: '#EA580C' },
    stepLine: {
        flex: 1, height: 2,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginHorizontal: 6,
    },
    stepLineActive: { backgroundColor: '#EA580C' },
    inputGroup: { width: '100%' },
    label: {
        fontFamily: 'Poppins-SemiBold',
        color: 'white',
        fontSize: 13,
        marginBottom: 7,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderRadius: 14,
        borderWidth: 2,
        paddingHorizontal: 14,
        borderColor: 'rgba(234,88,12,0.4)',
        shadowColor: '#EA580C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    inputFocused: {
        borderColor: '#EA580C',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    inputIcon: { marginRight: 10 },
    input: {
        flex: 1,
        paddingVertical: 15,
        fontFamily: 'Poppins-Regular',
        fontSize: 15,
        color: '#1a1a1a',
    },
    codeInput: {
        letterSpacing: 6,
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
    },
    eyeIcon: { padding: 6 },
    resendLink: {
        fontFamily: 'Poppins-SemiBold',
        color: '#EA580C',
        fontSize: 13,
        paddingLeft: 8,
    },
    buttonWrapper: {
        width: '100%',
        borderRadius: 25,
        shadowColor: '#EA580C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    button: {
        borderRadius: 25,
        paddingVertical: 17,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    buttonText: {
        fontFamily: 'Poppins-Bold',
        color: 'white',
        fontSize: 17,
    },
    disabledButton: { opacity: 0.6 },
    backLink: {
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
});
