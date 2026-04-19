import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ImageBackground,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../services/api';
import { useAppDispatch } from '../store/hooks';
import { login } from '../store/slices/userSlice';
import { showErrorMessage, showInfoMessage } from './FlashMessageWrapper';

export const ComponenteLogin = ({ onShowRegister, onLoginSuccess, onVerifyEmail }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);
    const [errors, setErrors] = useState({});
    const dispatch = useAppDispatch();

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
                avatar: require('../assets/img/usuario-img.jpg'),
                token: response.token,
            }));

            await AsyncStorage.setItem('showWelcomePopup', 'true');
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

    const handleGoogleLogin = () => {
        showInfoMessage(
            "Próximamente",
            "El inicio de sesión con Google estará disponible pronto"
        );
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
            <ImageBackground
                source={require('../assets/img/back-app.jpg')}
                style={styles.background}
                resizeMode="cover"
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.container}>
                        <BlurView intensity={55} tint="dark" style={styles.blurContainer}>
                            <View style={styles.formContainer}>
                                <Image
                                    source={require('../assets/img/logoApp.png')}
                                    style={styles.logo}
                                />

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
                                            color={errors.email ? "#FF6B6B" : focusedInput === 'email' ? "#FF6B6B" : "#888"}
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
                                            editable={!loading}
                                            onFocus={() => setFocusedInput('email')}
                                            onBlur={() => setFocusedInput(null)}
                                        />
                                    </View>
                                    {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                                </View>

                                {/* Campo de Contraseña */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Contraseña</Text>
                                    <View style={[
                                        styles.inputContainer,
                                        focusedInput === 'password' && styles.inputFocused,
                                        errors.password && styles.inputError
                                    ]}>
                                        <Ionicons
                                            name="lock-closed-outline"
                                            size={20}
                                            color={errors.password ? "#FF6B6B" : focusedInput === 'password' ? "#FF6B6B" : "#888"}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={styles.input}
                                            value={password}
                                            onChangeText={(text) => { setPassword(text); setErrors(e => ({ ...e, password: null })); }}
                                            placeholder="••••••••"
                                            placeholderTextColor="#888"
                                            secureTextEntry={!showPassword}
                                            editable={!loading}
                                            onFocus={() => setFocusedInput('password')}
                                            onBlur={() => setFocusedInput(null)}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword(!showPassword)}
                                            style={styles.eyeIcon}
                                        >
                                            <Ionicons
                                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                                size={20}
                                                color="#888"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                                </View>

                                {/* Error general (credenciales / conexión) */}
                                {errors.general && (
                                    <View style={styles.generalErrorContainer}>
                                        <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
                                        <Text style={styles.generalErrorText}>{errors.general}</Text>
                                    </View>
                                )}

                                {/* Botón de Ingresar */}
                                <TouchableOpacity
                                    style={[
                                        styles.primaryButton,
                                        loading && styles.disabledButton
                                    ]}
                                    onPress={handleLogin}
                                    activeOpacity={0.8}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <>
                                            <Text style={styles.buttonText}>Ingresar</Text>
                                            <Ionicons name="arrow-forward" size={20} color="white" />
                                        </>
                                    )}
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
                                        loading && styles.disabledButton
                                    ]}
                                    onPress={handleGoogleLogin}
                                    activeOpacity={0.8}
                                    disabled={loading}
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
                        </BlurView>
                    </View>
                </ScrollView>
            </ImageBackground>
        </KeyboardAvoidingView>
    );
};

// Los estilos se mantienen igual...
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
    background: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 40,
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
    blurContainer: {
        borderRadius: 30,
        overflow: 'hidden',
    },
    formContainer: {
        padding: 30,
        alignItems: "center",
        gap: 20,
    },
    inputGroup: {
        width: "100%",
    },
    label: {
        fontFamily: "Poppins-SemiBold",
        color: "white",
        fontSize: 14,
        marginBottom: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 15,
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 16,
        borderColor: "#ff8000",
        shadowColor: "#ff8000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    inputFocused: {
        borderColor: "#FF6B6B",
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontFamily: "Poppins-Regular",
        fontSize: 16,
        color: "#333333",
    },
    eyeIcon: {
        padding: 4,
    },
    primaryButton: {
        width: "100%",
        backgroundColor: "#f53232ff",
        borderRadius: 25,
        padding: 18,
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        shadowColor: "#FF6B6B",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    disabledButton: {
        opacity: 0.6,
    },
    inputError: {
        borderColor: '#FF6B6B',
    },
    errorText: {
        color: '#FF6B6B',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: 4,
        marginLeft: 4,
    },
    generalErrorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 107, 107, 0.15)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        width: '100%',
        gap: 6,
    },
    generalErrorText: {
        color: '#FF6B6B',
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
        color: "#f53232ff",
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