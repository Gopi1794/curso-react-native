import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// ✅ FIREBASE COMPAT
import { auth } from '../firebase/config';
import { useAppDispatch } from '../store/hooks';
import { login } from '../store/slices/userSlice';

export const ComponenteLogin = ({ onShowRegister, onLoginSuccess }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);
    const dispatch = useAppDispatch();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Por favor, completa todos los campos");
            return;
        }

        setLoading(true);


        try {
            // ✅ FIREBASE COMPAT - Método directo
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            dispatch(login({
                id: user.uid,
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                avatar: require('../assets/img/usuario-img.jpg'),
                isPremium: false
            }));

            onLoginSuccess?.();

        } catch (error) {
            console.error('Error en login:', error);
            let errorMessage = "Error al iniciar sesión";

            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = "Usuario no encontrado";
                    break;
                case 'auth/wrong-password':
                    errorMessage = "Contraseña incorrecta";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "Email inválido";
                    break;
                case 'auth/too-many-requests':
                    errorMessage = "Demasiados intentos. Intenta más tarde";
                    break;
                default:
                    errorMessage = error.message;
            }

            Alert.alert("Error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);

        try {
            // ✅ TEMPORAL: Mensaje informativo
            Alert.alert(
                "Google Sign-In",
                "Google Sign-In estará disponible pronto. Por ahora usa el login con email."
            );

            // Para una implementación real con Expo, usarías:
            // - expo-auth-session + Firebase Web SDK
            // O mantén el login con email como opción principal

        } catch (error) {
            console.error('Error en Google login:', error);
            Alert.alert("Error", "Error al iniciar sesión con Google");
        } finally {
            setLoading(false);
        }
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
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.container}>
                    <LinearGradient
                        colors={['#ffa346ff', '#ffa346ff']}
                        style={styles.gradientBackground}
                    >
                        <BlurView intensity={25} tint="dark" style={styles.blurContainer}>
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
                                        focusedInput === 'email' && styles.inputFocused
                                    ]}>
                                        <Ionicons
                                            name="mail-outline"
                                            size={20}
                                            color={focusedInput === 'email' ? "#FF6B6B" : "#888"}
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
                                            editable={!loading}
                                            onFocus={() => setFocusedInput('email')}
                                            onBlur={() => setFocusedInput(null)}
                                        />
                                    </View>
                                </View>

                                {/* Campo de Contraseña */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Contraseña</Text>
                                    <View style={[
                                        styles.inputContainer,
                                        focusedInput === 'password' && styles.inputFocused
                                    ]}>
                                        <Ionicons
                                            name="lock-closed-outline"
                                            size={20}
                                            color={focusedInput === 'password' ? "#FF6B6B" : "#888"}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={styles.input}
                                            value={password}
                                            onChangeText={setPassword}
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
                                </View>

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
                    </LinearGradient>
                </View>
            </ScrollView>
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
        backgroundColor: '#ff8000',
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    container: {
        borderColor: '#ffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
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