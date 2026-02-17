import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    BackHandler,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ TU NUEVA API (reemplaza Firebase)
import API from '../services/api'; import { useAppDispatch } from '../store/hooks';
import { login } from '../store/slices/userSlice';

export const ModernRegisterForm = ({ onBackToLogin }) => {
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
    const dispatch = useAppDispatch();

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
            Alert.alert("Error", `Por favor, completa: ${missingFields.join(', ')}`);
            return;
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            Alert.alert("Error", "Por favor, ingresa un correo electrónico válido");
            return;
        }

        // Validar teléfono (mínimo 8 dígitos)
        const phoneDigits = formData.telefono.replace(/\D/g, '');
        if (phoneDigits.length < 8) {
            Alert.alert("Error", "Por favor, ingresa un número de teléfono válido");
            return;
        }

        // Validar contraseña
        if (formData.password.length < 6) {
            Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setLoading(true);

        try {
            // ✅ LLAMAR A TU API (NO Firebase) - SIN DIRECCIÓN
            const response = await API.register({
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
                // ✅ Guardar token en AsyncStorage
                if (response.token) {
                    await AsyncStorage.setItem('userToken', response.token);
                }

                // ✅ Guardar usuario en Redux
                dispatch(login({
                    id: response.user.id || response.user.uuid,
                    nombre: response.user.nombre,
                    apellido: response.user.apellido,
                    email: response.user.email,
                    telefono: response.user.telefono,
                    rol: response.user.rol || 'cliente',
                    estado: response.user.estado || 'activo',
                    token: response.token,
                    // Opcional: avatar por defecto
                    avatar: require('../assets/img/usuario-img.jpg'),
                }));

                Alert.alert(
                    "🎉 ¡Registro Exitoso!",
                    "Tu cuenta ha sido creada exitosamente",
                    [
                        {
                            text: "Continuar",
                            onPress: onBackToLogin
                        }
                    ]
                );
            } else {
                Alert.alert("Error", response.message || "Error al crear la cuenta");
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

            Alert.alert("Error", errorMessage);
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
                        color={isFocused ? "#ff8000" : "#888"}
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
                        onFocus={() => setFocusedInput(field.id)}
                        onBlur={() => setFocusedInput(null)}
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
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeIcon}
                            disabled={loading}
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
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
            <View style={styles.container}>
                <LinearGradient
                    colors={['#ffa346ff', '#ffa346ff']}
                    style={styles.gradientBackground}
                >
                    <BlurView intensity={25} tint="dark" style={styles.blurContainer}>
                        <View style={styles.formContainer}>
                            {/* Header */}
                            <View style={styles.header}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={onBackToLogin}
                                    disabled={loading}
                                >
                                    <Ionicons name="arrow-back" size={24} color="white" />
                                </TouchableOpacity>
                                <Text style={styles.title}>Crear Cuenta</Text>
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
                                style={[
                                    styles.submitButton,
                                    loading && styles.disabledButton,
                                    progress < 100 && styles.incompleteButton
                                ]}
                                onPress={handleSubmit}
                                activeOpacity={0.8}
                                disabled={loading || progress < 100}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <>
                                        <Text style={styles.submitButtonText}>Crear Cuenta</Text>
                                        <Ionicons name="rocket-outline" size={20} color="white" />
                                    </>
                                )}
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
                    </BlurView>
                </LinearGradient>
            </View>
        </KeyboardAvoidingView>
    );
};

// Los estilos se mantienen igual...
const styles = StyleSheet.create({
    mainContainer: {
        backgroundColor: '#ff8000',
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        borderColor: '#ffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        width: '90%',
        maxWidth: 400,
        borderRadius: 30,
        overflow: 'hidden',
    },
    gradientBackground: {
        borderRadius: 30,
        overflow: 'hidden',
    },
    blurContainer: {
        borderRadius: 30,
        overflow: 'hidden',
    },
    formContainer: {
        padding: 30,
        gap: 20,
    },
    header: {
        flexDirection: "row",
        alignItems: 'center',
    },
    backButton: {
        left: 0,
        top: 0,
        padding: 8,
    },
    title: {
        left: 35,
        fontFamily: "Poppins-Bold",
        fontSize: 20,
        color: "white",
        textAlign: 'center',
        marginBottom: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    progressContainer: {
        marginBottom: 10,
    },
    progressBackground: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#e1d902ff',
        borderRadius: 3,
    },
    progressText: {
        fontFamily: "Poppins-Regular",
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.7)",
        textAlign: 'center',
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
        fontFamily: "Poppins-Regular",
        fontSize: 16,
        color: "#333333",
    },
    eyeIcon: {
        padding: 4,
    },
    submitButton: {
        width: "100%",
        backgroundColor: "#f53232ff",
        borderRadius: 25,
        padding: 18,
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        shadowColor: "#FF6B6B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    incompleteButton: {
        backgroundColor: "#f53232ff",
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
        color: "#f53232ff",
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
        color: "#f53232ff",
        fontSize: 14,
    },
});

export default ModernRegisterForm;