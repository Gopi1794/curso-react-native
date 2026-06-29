import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    BackHandler,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// ✅ TU NUEVA API (reemplaza Firebase)
import API from '../services/api';
import { useAppDispatch } from '../store/hooks';
import { login } from '../store/slices/userSlice';
import { showSuccessMessage, showErrorMessage } from './FlashMessageWrapper';

const COLORS = {
    primary: '#EA580C',
    secondary: '#F97316',
    error: '#DC2626',
    inputBorder: '#EA580C',
    inputFocused: '#F97316',
};

export const ModernRegisterForm = ({ onBackToLogin, onVerifyEmail }) => {
    const [formData, setFormData] = useState({
        // ✅ CAMBIOS: Según tu tabla 'usuarios'
        nombre: "",           // Antes: displayName
        apellido: "",         // NUEVO: según tu tabla
        telefono: "",         // Igual
        email: "",            // Igual
        password: "",         // Igual
        // ❌ ELIMINADO: direccion: "",        // Se manejará en otro screen
    });

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [progress, setProgress] = useState(0);
    const [focusedInput, setFocusedInput] = useState(null);
    const inputRefs = useRef({});
    const scrollRef = useRef(null);
    const dispatch = useAppDispatch();

    const autoCompleteMap = {
        nombre: 'given-name',
        apellido: 'family-name',
        telefono: 'tel',
        email: 'email',
        password: 'new-password',
    };

    const textContentTypeMap = {
        nombre: 'givenName',
        apellido: 'familyName',
        telefono: 'telephoneNumber',
        email: 'emailAddress',
        password: 'newPassword',
    };

    const validateFieldOnBlur = (field, value) => {
        if (field === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                showErrorMessage("Email inválido", "Ingresá un correo electrónico válido");
            }
        }
        if (field === 'telefono' && value) {
            const digits = value.replace(/\D/g, '');
            if (digits.length < 8) {
                showErrorMessage("Teléfono inválido", "Ingresá al menos 8 dígitos");
            }
        }
    };

    // Efecto para manejar el botón físico de atrás
    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                onBackToLogin();
                return true;
            }
        );
        return () => backHandler.remove();
    }, [onBackToLogin]);

    // Calcular progreso del formulario
    useEffect(() => {
        const filledFields = Object.values(formData).filter(value =>
            value !== null && value !== undefined && value.toString().length > 0
        ).length;
        const totalFields = Object.keys(formData).length;
        setProgress((filledFields / totalFields) * 100);
    }, [formData]);

    // ✅ CAMBIAR los campos según tu tabla 'usuarios' (SIN DIRECCIÓN)
    const formFields = [
        {
            id: "nombre",
            label: "Nombre",
            placeholder: "Tu nombre",
            type: "text",
            icon: "person-outline",
            returnKeyType: "next",
        },
        {
            id: "apellido",
            label: "Apellido",
            placeholder: "Tu apellido",
            type: "text",
            icon: "person-outline",
            returnKeyType: "next",
        },
        {
            id: "telefono",
            label: "Teléfono",
            placeholder: "+54 11 1234 5678",
            type: "tel",
            icon: "call-outline",
            returnKeyType: "next",
        },
        {
            id: "email",
            label: "Correo Electrónico",
            placeholder: "tu@email.com",
            type: "email",
            icon: "mail-outline",
            returnKeyType: "next",
        },
        {
            id: "password",
            label: "Contraseña",
            placeholder: "••••••••",
            type: "password",
            icon: "lock-closed-outline",
            returnKeyType: "done",
        },
    ];

    const handleInputChange = (id, value) => {
        setFormData(prev => ({
            ...prev,
            [id]: value,
        }));
    };

    const handleSubmit = async () => {
        // ✅ Validación según tu tabla (SIN DIRECCIÓN)
        const requiredFields = ['nombre', 'apellido', 'email', 'password', 'telefono'];
        const missingFields = requiredFields.filter(field => !formData[field]);

        if (missingFields.length > 0) {
            showErrorMessage("Error", `Por favor, completa: ${missingFields.join(', ')}`);
            return;
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showErrorMessage("Error", "Por favor, ingresa un correo electrónico válido");
            return;
        }

        // Validar teléfono (mínimo 8 dígitos)
        const phoneDigits = formData.telefono.replace(/\D/g, '');
        if (phoneDigits.length < 8) {
            showErrorMessage("Error", "Por favor, ingresa un número de teléfono válido");
            return;
        }

        // Validar contraseña
        if (formData.password.length < 8) {
            showErrorMessage("Error", "La contraseña debe tener al menos 8 caracteres");
            return;
        }

        setLoading(true);

        try {
            // ✅ LLAMAR A TU API (NO Firebase) - SIN DIRECCIÓN
            const response = await API.auth.register({
                nombre: formData.nombre,
                apellido: formData.apellido,
                email: formData.email,
                telefono: formData.telefono,
                password: formData.password,
                // ❌ NO se envía dirección - se manejará en otro screen
                // Estos campos los maneja tu backend:
                // - uuid: se genera automáticamente
                // - rol: default 'cliente'
                // - estado: default 'activo'
                // - fecha_creacion: automático
                // - avatar_url: null por defecto
            });

            if (response.success) {
                if (response.requiresVerification) {
                    // Ir a pantalla de verificación
                    showSuccessMessage("Registro exitoso", "Revisá tu email para el código de verificación");
                    if (onVerifyEmail) {
                        onVerifyEmail(response.email);
                    }
                } else if (response.token) {
                    // Login directo (no debería pasar, pero por si acaso)
                    await API.token.save(response.token);
                    dispatch(login({
                        id: response.user.id || response.user.uuid,
                        nombre: response.user.nombre,
                        apellido: response.user.apellido,
                        email: response.user.email,
                        telefono: response.user.telefono,
                        rol: response.user.rol || 'cliente',
                        estado: response.user.estado || 'activo',
                        token: response.token,
                        justRegistered: true,
                    }));
                }
            } else {
                showErrorMessage("Error", response.message || "Error al crear la cuenta");
            }

        } catch (error) {
            console.error('Error en registro:', error);

            // ✅ Manejar errores específicos de tu API
            let errorMessage = "Error al crear la cuenta";

            if (error.message.includes('email already exists') ||
                error.message.includes('duplicate key')) {
                errorMessage = "Este email ya está registrado";
            } else if (error.message.includes('password')) {
                errorMessage = "La contraseña no cumple los requisitos";
            } else if (error.message.includes('network')) {
                errorMessage = "Error de conexión. Verifica tu internet";
            } else if (error.message) {
                errorMessage = error.message;
            }

            showErrorMessage("Error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const renderInputField = (field, index) => {
        const isFocused = focusedInput === field.id;

        return (
            <View key={field.id} style={styles.inputGroup}>
                <Text style={styles.label}>{field.label}</Text>
                <View style={[
                    styles.inputContainer,
                    isFocused && styles.inputFocused
                ]}>
                    <Ionicons
                        name={field.icon}
                        size={20}
                        color={isFocused ? COLORS.inputFocused : "#888"}
                        style={styles.inputIcon}
                    />
                    <TextInput
                        ref={ref => inputRefs.current[field.id] = ref}
                        style={styles.input}
                        value={formData[field.id]}
                        onChangeText={(value) => handleInputChange(field.id, value)}
                        placeholder={field.placeholder}
                        placeholderTextColor="#888"
                        keyboardType={
                            field.type === "email" ? "email-address" :
                                field.type === "tel" ? "phone-pad" : "default"
                        }
                        secureTextEntry={field.type === "password" && !showPassword}
                        autoCapitalize={
                            field.id === "email" ? "none" : "words"
                        }
                        editable={!loading}
                        autoComplete={autoCompleteMap[field.id]}
                        textContentType={textContentTypeMap[field.id]}
                        onFocus={() => {
                            setFocusedInput(field.id);
                            if (index >= formFields.length - 2) {
                                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
                            }
                        }}
                        onBlur={() => { setFocusedInput(null); validateFieldOnBlur(field.id, formData[field.id]); }}
                        returnKeyType={field.returnKeyType}
                        onSubmitEditing={() => {
                            if (index < formFields.length - 1) {
                                const nextField = formFields[index + 1].id;
                                setTimeout(() => {
                                    inputRefs.current[nextField]?.focus();
                                }, 50);
                            } else {
                                handleSubmit();
                            }
                        }}
                        blurOnSubmit={index === formFields.length - 1}
                        autoCorrect={field.id !== "email"}
                        spellCheck={field.id !== "email"}
                    />
                    {field.type === "password" && (
                        <TouchableOpacity
                            onPressIn={() => setShowPassword(v => !v)}
                            style={styles.eyeIcon}
                            disabled={loading}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons
                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                size={20}
                                color="#888"
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.mainContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={{ flex: 1 }}>
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                <View style={styles.container}>
                    <View style={styles.blurContainer}>
                        <View style={styles.formContainer}>
                            {/* Back button */}
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={onBackToLogin}
                                disabled={loading}
                            >
                                <Ionicons name="arrow-back" size={24} color="white" />
                            </TouchableOpacity>

                            {/* Logo */}
                            <View style={styles.heroSection}>
                                <Image
                                    source={require('../assets/img/logoApp.png')}
                                    style={styles.logo}
                                />
                                <Text style={styles.welcomeTitle}>Crear Cuenta</Text>
                                <Text style={styles.welcomeSubtitle}>Registrate y pedí en minutos</Text>
                            </View>

                            {/* Progress Bar */}
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBackground}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            { width: `${progress}%` }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.progressText}>
                                    {Math.round(progress)}% completado
                                </Text>
                            </View>

                            {/* Form Fields */}
                            {formFields.map(renderInputField)}

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[styles.submitButtonWrapper, loading && styles.disabledButton]}
                                onPress={handleSubmit}
                                activeOpacity={0.85}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.secondary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.submitButton}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <>
                                            <Text style={styles.submitButtonText}>Crear Cuenta</Text>
                                            <Ionicons name="rocket-outline" size={20} color="white" />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Terms */}
                            <View style={styles.termsContainer}>
                                <Text style={styles.termsText}>
                                    Al registrarte, aceptas nuestros{' '}
                                    <Text style={styles.termsLink}>Términos de Servicio</Text>{' '}
                                    y <Text style={styles.termsLink}>Política de Privacidad</Text>
                                </Text>
                            </View>

                            {/* Login Link */}
                            <View style={styles.loginContainer}>
                                <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
                                <TouchableOpacity onPress={onBackToLogin} disabled={loading}>
                                    <Text style={styles.loginLink}>Iniciar Sesión</Text>
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
        alignItems: 'center',
        gap: 16,
    },
    heroSection: {
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    logo: {
        width: 101,
        height: 103,
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
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        padding: 8,
        borderRadius: 10,
        zIndex: 10,
    },
    progressContainer: {
        marginBottom: 4,
    },
    progressBackground: {
        height: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#EA580C',
        borderRadius: 3,
    },
    progressText: {
        fontFamily: "Poppins-Regular",
        fontSize: 11,
        color: "rgba(255, 255, 255, 0.65)",
        textAlign: 'center',
    },
    inputGroup: {
        width: "100%",
    },
    label: {
        fontFamily: "Poppins-SemiBold",
        color: "white",
        fontSize: 13,
        marginBottom: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
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
        paddingVertical: 14,
        fontFamily: "Poppins-Regular",
        fontSize: 15,
        color: "#1a1a1a",
    },
    eyeIcon: {
        padding: 6,
    },
    submitButtonWrapper: {
        width: "100%",
        borderRadius: 25,
        shadowColor: "#EA580C",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    submitButton: {
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
    submitButtonText: {
        fontFamily: "Poppins-Bold",
        color: "white",
        fontSize: 18,
    },
    termsContainer: {
        marginTop: 10,
    },
    termsText: {
        fontFamily: "Poppins-Regular",
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.7)",
        textAlign: 'center',
        lineHeight: 16,
    },
    termsLink: {
        color: "#F97316",
        textDecorationLine: 'underline',
    },
    loginContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    loginText: {
        fontFamily: "Poppins-Regular",
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: 14,
    },
    loginLink: {
        fontFamily: "Poppins-SemiBold",
        color: "#F97316",
        fontSize: 14,
    },
});

export default ModernRegisterForm;