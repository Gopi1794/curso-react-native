import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Image,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

export default function SettingsScreen({ navigation }) {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [locationEnabled, setLocationEnabled] = useState(true);

    const handleGoBack = () => {
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            {/* Fondo decorado */}
            <Image
                style={styles.backgroundDeco1}
                source={require("../../assets/img/deco_1.png")}
                resizeMode="cover"
            />

            <Image
                style={styles.backgroundDeco2}
                source={require("../../assets/img/deco_2.png")}
                resizeMode="cover"
            />

            {/* Header Fijo */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Configuración</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Notificaciones</Text>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Ionicons name="notifications-outline" size={24} color="#333" />
                                <Text style={styles.settingText}>Notificaciones Push</Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: '#767577', true: '#D80000' }}
                                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                            />
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Ionicons name="mail-outline" size={24} color="#333" />
                                <Text style={styles.settingText}>Notificaciones por Email</Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: '#767577', true: '#D80000' }}
                                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Privacidad</Text>

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Ionicons name="location-outline" size={24} color="#333" />
                                <Text style={styles.settingText}>Ubicación</Text>
                            </View>
                            <Switch
                                value={locationEnabled}
                                onValueChange={setLocationEnabled}
                                trackColor={{ false: '#767577', true: '#D80000' }}
                                thumbColor={locationEnabled ? '#fff' : '#f4f3f4'}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Ionicons name="shield-outline" size={24} color="#333" />
                                <Text style={styles.settingText}>Política de Privacidad</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Aplicación</Text>

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Ionicons name="help-circle-outline" size={24} color="#333" />
                                <Text style={styles.settingText}>Ayuda y Soporte</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Ionicons name="information-circle-outline" size={24} color="#333" />
                                <Text style={styles.settingText}>Acerca de</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Ionicons name="star-outline" size={24} color="#333" />
                                <Text style={styles.settingText}>Calificar App</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={24} color="#D80000" />
                        <Text style={styles.logoutText}>Cerrar Sesión</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#330000',
    },
    scrollView: {
        flex: 1,
        marginTop: 110, // Espacio para el header fijo
    },
    scrollContent: {
        paddingBottom: 20,
    },
    backgroundDeco1: {
        position: 'absolute',
        height: 266,
        top: 0,
        width: '100%',
        zIndex: 0,
    },
    backgroundDeco2: {
        position: 'absolute',
        width: screenWidth,
        height: 266,
        bottom: -60,
        zIndex: 0,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: 'transparent',
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    headerRight: {
        width: 40,
    },
    content: {
        padding: 20,
        zIndex: 1,
    },
    section: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 15,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        padding: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 15,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 15,
        padding: 20,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#D80000',
        marginLeft: 10,
    },
});