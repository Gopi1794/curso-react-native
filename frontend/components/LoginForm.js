import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../services/api';
import { useAppDispatch } from '../store/hooks';
import { login } from '../store/slices/userSlice';
import { selectRestaurant } from '../store/slices/restaurantSlice';
import { showErrorMessage, showInfoMessage } from './FlashMessageWrapper';
import { registerForPushNotifications } from '../services/pushNotifications';

WebBrowser.maybeCompleteAuthSession();

const COLORS = {
    primary: '#EA580C',
    secondary: '#F97316',
    error: '#DC2626',
    inputBorder: '#EA580C',
    inputFocused: '#F97316',
};

export const ComponenteLogin = ({ onShowRegister, onLoginSuccess, onVerifyEmail, onForgotPassword }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);
    const [errors, setErrors] = useState({});
    const passwordRef = useRef(null);
    const dispatch = useAppDispatch();

    const googleConfigured = !!(
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    );

    const [, googleResponse, promptAsync] = Google.useAuthRequest({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'not-configured',
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'not-configured',
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'not-configured',
    });

    useEffect(() => {
        if (googleResponse?.type === 'success') {
            const accessToken = googleResponse.authentication?.accessToken;
            if (accessToken) handleGoogleAuthResponse(accessToken);
        }
    }, [googleResponse]);

    const validateEmailOnBlur = (val) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (val && !emailRegex.test(val)) {
            setErrors(e => ({ ...e, email: 'Correo electrónico inválido' }));
        }
        setFocusedInput(null);
    };

    const handleLogin = async () => {
        if (!email && !password) {
            showErrorMessage("Campos vacíos", "Ingresá tu correo y contraseña");
            return;
        }
        if (!email) {
            showErrorMessage("Campo vacío", "Ingresá tu correo electrónico");
            return;
        }
        if (!password) {
            showErrorMessage("Campo vacío", "Ingresá tu contraseña");
            return;
        }

        setErrors({});
        setLoading(true);

        try {
            const response = await API.auth.login(email.trim(), password);

            if (!response.success) {
                // Si el email no está verificado, ir a verificación
                if (response.requiresVerification && onVerifyEmail) {
                    showInfoMessage('Verificá tu email', response.message);
                    onVerifyEmail(response.email);
                    return;
                }

                showErrorMessage(
                    'Error al iniciar sesión',
                    response.message || 'Verificá tu email y contraseña.'
                );
                return;
            }

            await API.token.save(response.token);

            dispatch(login({
                id: response.user.id,
                uuid: response.user.uuid,
                nombre: response.user.nombre,
                apellido: response.user.apellido,
                email: response.user.email,
                telefono: response.user.telefono,
                rol: response.user.rol,
                estado: response.user.estado,
                avatar_url: response.user.avatar_url || null,
                restaurante_id: response.user.restaurante_id || null,
                token: response.token,
            }));

            if (response.user.rol === 'admin' && response.user.restaurante) {
                dispatch(selectRestaurant(response.user.restaurante));
            }

            await AsyncStorage.setItem('showWelcomePopup', 'true');

            registerForPushNotifications()
                .then((pushToken) => {
                    if (pushToken) API.notifications.savePushToken(pushToken).catch(() => {});
                })
                .catch(() => {});

            onLoginSuccess?.();

        } catch (error) {
            console.error('Error en login:', error);
            showErrorMessage(
                'Sin conexión',
                'No se pudo conectar con el servidor. Verificá tu conexión.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        onForgotPassword?.();
    };

    const handleGoogleAuthResponse = async (accessToken) => {
        setLoading(true);
        try {
            const result = await API.auth.googleLogin(null, accessToken);
            if (!result.success) {
                showErrorMessage('Error con Google', result.message || 'No se pudo iniciar sesión');
                return;
            }
            await API.token.save(result.token);
            dispatch(login({
                id: result.user.id,
                uuid: result.user.uuid,
                nombre: result.user.nombre,
                apellido: result.user.apellido,
                email: result.user.email,
                telefono: result.user.telefono,
                rol: result.user.rol,
                estado: result.user.estado,
                avatar_url: result.user.avatar_url || null,
                token: result.token,
            }));
            await AsyncStorage.setItem('showWelcomePopup', 'true');
            registerForPushNotifications()
                .then((pushToken) => {
                    if (pushToken) API.notifications.savePushToken(pushToken).catch(() => {});
                })
                .catch(() => {});
            onLoginSuccess?.();
        } catch (error) {
            console.error('Error en Google login:', error);
            showErrorMessage('Error', 'No se pudo conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        if (!googleConfigured) {
            showInfoMessage('No disponible', 'El login con Google no está configurado aún.');
            return;
        }
        promptAsync();
    };

    // Usuarios de prueba para desarrollo (opcional)
    const testUsers = [
        { email: 'demo@test.com', password: '123456' },
        { email: 'test@test.com', password: 'test123' }
    ];

    const handleQuickLogin = (testEmail, testPassword) => {
        setEmail(testEmail);
        setPassword(testPassword);
    };

    return (
        <KeyboardAvoidingView
            style={styles.mainContainer}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.container}>
                        <View style={styles.blurContainer}>
                            <View style={styles.formContainer}>
                                <View style={styles.heroSection}>
                                    <Image
                                        source={require('../assets/img/logoApp.png')}
                                        style={styles.logo}
                                    />
                                    <Text style={styles.welcomeTitle}>¡Bienvenido!</Text>
                                    <Text style={styles.welcomeSubtitle}>Tu comida favorita, en minutos</Text>
                                </View>

                                {/* Campo de Email */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Correo Electrónico</Text>
                                    <View style={[
                                        styles.inputContainer,
                                        focusedInput === 'email' && styles.inputFocused,
                                        errors.email && styles.inputError
                                    ]}>
                                        <Ionicons
                                            name="mail-outline"
                                            size={20}
                                            color={errors.email ? COLORS.error : focusedInput === 'email' ? COLORS.inputFocused : "#888"}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={styles.input}
                                            value={email}
                                            onChangeText={(text) => { setEmail(text); setErrors(e => ({ ...e, email: null })); }}
                                            placeholder="tu@email.com"
                                            placeholderTextColor="#888"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoComplete="email"
                                            textContentType="emailAddress"
                                            returnKeyType="next"
                                            editable={!loading}
                                            onFocus={() => setFocusedInput('email')}
                                            onBlur={() => validateEmailOnBlur(email)}
                                            onSubmitEditing={() => passwordRef.current?.focus()}
                                        />
                                    </View>
                                    {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                                </View>

                                {/* Campo de Contraseña */}
                                <View style={styles.inputGroup}>
                                    <View style={styles.labelRow}>
                                        <Text style={styles.label}>Contraseña</Text>
                                        <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
                                            <Text style={styles.forgotLink}>¿Olvidaste tu contraseña?</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={[
                                        styles.inputContainer,
                                        focusedInput === 'password' && styles.inputFocused,
                                        errors.password && styles.inputError
                                    ]}>
                                        <Ionicons
                                            name="lock-closed-outline"
                                            size={20}
                                            color={errors.password ? COLORS.error : focusedInput === 'password' ? COLORS.inputFocused : "#888"}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            ref={passwordRef}
                                            style={styles.input}
                                            value={password}
                                            onChangeText={(text) => { setPassword(text); setErrors(e => ({ ...e, password: null })); }}
                                            placeholder="••••••••"
                                            placeholderTextColor="#888"
                                            secureTextEntry={!showPassword}
                                            autoComplete="current-password"
                                            textContentType="password"
                                            returnKeyType="done"
                                            editable={!loading}
                                            onFocus={() => setFocusedInput('password')}
                                            onBlur={() => setFocusedInput(null)}
                                            onSubmitEditing={handleLogin}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword(!showPassword)}
                                            style={styles.eyeIcon}
                                        >
                                            <Ionicons
                                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                                size={20}
                                                color="#999"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                                </View>

                                {/* Error general (credenciales / conexión) */}
                                {errors.general && (
                                    <View style={styles.generalErrorContainer}>
                                        <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
                                        <Text style={styles.generalErrorText}>{errors.general}</Text>
                                    </View>
                                )}

                                {/* Botón de Ingresar */}
                                <TouchableOpacity
                                    style={[styles.primaryButtonWrapper, loading && styles.disabledButton]}
                                    onPress={handleLogin}
                                    activeOpacity={0.85}
                                    disabled={loading}
                                >
                                    <LinearGradient
                                        colors={[COLORS.primary, COLORS.secondary]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.primaryButton}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="white" size="small" />
                                        ) : (
                                            <>
                                                <Text style={styles.buttonText}>Ingresar</Text>
                                                <Ionicons name="arrow-forward" size={20} color="white" />
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                {/* Botones de acceso rápido (solo desarrollo) */}
                                {__DEV__ && ( // Solo se muestra en desarrollo
                                    <View style={styles.quickAccessContainer}>
                                        <Text style={styles.quickAccessTitle}>Acceso Rápido (Desarrollo)</Text>
                                        <View style={styles.quickAccessButtons}>
                                            {testUsers.map((user, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={styles.quickAccessButton}
                                                    onPress={() => handleQuickLogin(user.email, user.password)}
                                                    disabled={loading}
                                                >
                                                    <Text style={styles.quickAccessText}>{user.email}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Separador */}
                                <View style={styles.separator}>
                                    <View style={styles.separatorLine} />
                                    <Text style={styles.separatorText}>o continúa con</Text>
                                    <View style={styles.separatorLine} />
                                </View>

                                {/* Botón de Google */}
                                <TouchableOpacity
                                    style={[
                                        styles.googleButton,
                                        (loading || !googleConfigured) && styles.disabledButton
                                    ]}
                                    onPress={handleGoogleLogin}
                                    activeOpacity={0.8}
                                    disabled={loading || !googleConfigured}
                                >
                                    <Image
                                        style={styles.googleLogo}
                                        source={{ uri: "https://c.animaapp.com/rJwT4rDY/img/google-logo-1@2x.png" }}
                                    />
                                    <Text style={styles.googleButtonText}>Google</Text>
                                </TouchableOpacity>

                                {/* Registrarse */}
                                <View style={styles.registerContainer}>
                                    <Text style={styles.registerText}>¿No tienes cuenta? </Text>
                                    <TouchableOpacity onPress={onShowRegister} disabled={loading}>
                                        <Text style={styles.registerLink}>Regístrate</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 40,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        borderRadius: 30,
        overflow: 'hidden',
    },
    blurContainer: {
        borderRadius: 30,
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.40)',
    },
    formContainer: {
        padding: 28,
        alignItems: "center",
        gap: 18,
    },
    heroSection: {
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    welcomeTitle: {
        fontFamily: "Poppins-Bold",
        fontSize: 22,
        color: "white",
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    welcomeSubtitle: {
        fontFamily: "Poppins-Regular",
        fontSize: 13,
        color: "rgba(255,255,255,0.75)",
    },
    inputGroup: {
        width: "100%",
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontFamily: "Poppins-SemiBold",
        color: "white",
        fontSize: 13,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    forgotLink: {
        fontFamily: "Poppins-Regular",
        color: "rgba(255,255,255,0.7)",
        fontSize: 12,
        textDecorationLine: 'underline',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "rgba(255, 255, 255, 0.96)",
        borderRadius: 14,
        borderWidth: 2,
        paddingHorizontal: 14,
        borderColor: "rgba(234,88,12,0.4)",
        shadowColor: "#EA580C",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    inputFocused: {
        borderColor: "#EA580C",
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 15,
        fontFamily: "Poppins-Regular",
        fontSize: 15,
        color: "#1a1a1a",
    },
    eyeIcon: {
        padding: 6,
    },
    primaryButtonWrapper: {
        width: "100%",
        borderRadius: 25,
        shadowColor: "#EA580C",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    primaryButton: {
        borderRadius: 25,
        paddingVertical: 17,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    disabledButton: {
        opacity: 0.6,
    },
    inputError: {
        borderColor: '#DC2626',
    },
    errorText: {
        color: '#DC2626',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: 4,
        marginLeft: 4,
    },
    generalErrorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(220, 38, 38, 0.12)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        width: '100%',
        gap: 6,
    },
    generalErrorText: {
        color: '#DC2626',
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        flex: 1,
    },
    buttonText: {
        fontFamily: "Poppins-Bold",
        color: "white",
        fontSize: 18,
    },
    quickAccessContainer: {
        width: '100%',
        marginVertical: 10,
    },
    quickAccessTitle: {
        fontFamily: "Poppins-Regular",
        color: "rgba(255, 255, 255, 0.7)",
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 8,
    },
    quickAccessButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    quickAccessButton: {
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    quickAccessText: {
        fontFamily: "Poppins-Regular",
        color: "white",
        fontSize: 10,
    },
    separator: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        marginVertical: 10,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: "rgba(255, 255, 255, 0.3)",
    },
    separatorText: {
        marginHorizontal: 15,
        color: "rgba(255, 255, 255, 0.7)",
        fontFamily: "Poppins-Regular",
        fontSize: 12,
    },
    googleButton: {
        width: "100%",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 25,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
    googleButtonText: {
        fontFamily: "Poppins-SemiBold",
        color: "#333333",
        fontSize: 16,
    },
    googleLogo: {
        width: 20,
        height: 20,
    },
    registerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    registerText: {
        fontFamily: "Poppins-Regular",
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: 14,
    },
    registerLink: {
        fontFamily: "Poppins-SemiBold",
        color: "#F97316",
        fontSize: 14,
    },
    logo: {
        width: 101,
        height: 103,
        position: 'relative',
        zIndex: 1
    }
});

export default ComponenteLogin;