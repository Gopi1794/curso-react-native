import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import AppHeader from '../../components/common/AppHeader';

const FAQS = [
    {
        category: 'Pedidos',
        icon: 'receipt-outline',
        items: [
            {
                q: '¿Cómo sé cuándo llega mi pedido?',
                a: 'Una vez confirmado tu pedido podés seguir su estado en tiempo real desde la sección "Mis Pedidos". También te enviamos notificaciones push en cada cambio de estado.',
            },
            {
                q: '¿Puedo cancelar un pedido?',
                a: 'Podés cancelar un pedido siempre que todavía esté en estado "pendiente". Una vez que el restaurante lo confirme, ya no es posible cancelarlo desde la app.',
            },
            {
                q: '¿Qué pasa si mi pedido llega incompleto?',
                a: 'Contactá a soporte desde esta pantalla con el número de tu pedido y te ayudamos a resolverlo lo antes posible.',
            },
        ],
    },
    {
        category: 'Pagos',
        icon: 'card-outline',
        items: [
            {
                q: '¿Qué métodos de pago aceptan?',
                a: 'Aceptamos tarjetas de débito y crédito (Visa, Mastercard, Amex), efectivo contra entrega y transferencia bancaria.',
            },
            {
                q: '¿Es seguro guardar mi tarjeta?',
                a: 'Solo guardamos los últimos 4 dígitos y la marca de tu tarjeta para identificarla. El número completo nunca se almacena en nuestros servidores.',
            },
        ],
    },
    {
        category: 'Cuenta',
        icon: 'person-outline',
        items: [
            {
                q: '¿Cómo cambio mi contraseña?',
                a: 'Andá a Perfil → Privacidad y Seguridad → Cambiar contraseña. Vas a necesitar tu contraseña actual para confirmar el cambio.',
            },
            {
                q: '¿Cómo elimino mi cuenta?',
                a: 'Podés eliminar tu cuenta desde Perfil → Privacidad y Seguridad → Zona de peligro. Esta acción es permanente e irreversible.',
            },
            {
                q: '¿Mis datos están seguros?',
                a: 'Sí. Solo guardamos la información mínima necesaria para que la app funcione y nunca vendemos tus datos a terceros.',
            },
        ],
    },
];

const CONTACT = [
    {
        icon: 'mail-outline',
        label: 'Email de soporte',
        value: 'soporte@tuappfood.com',
        action: () => Linking.openURL('mailto:soporte@tuappfood.com?subject=Soporte%20Tu%20App%20Food'),
        color: '#ff8800',
    },
    {
        icon: 'logo-whatsapp',
        label: 'WhatsApp',
        value: '+54 9 11 0000-0000',
        action: () => Linking.openURL('https://wa.me/5491100000000?text=Hola,%20necesito%20ayuda%20con%20Tu%20App%20Food'),
        color: '#25D366',
    },
];

function FaqItem({ item }) {
    const [open, setOpen] = useState(false);

    return (
        <View style={styles.faqItem}>
            <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => setOpen(v => !v)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={item.q}
                accessibilityState={{ expanded: open }}
            >
                <Text style={styles.faqQuestionText}>{item.q}</Text>
                <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#ff8800"
                />
            </TouchableOpacity>
            {open && (
                <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{item.a}</Text>
                </View>
            )}
        </View>
    );
}

export default function HelpScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <AppHeader title="Ayuda y Soporte" onBack={() => navigation.goBack()} />

            <ScrollView
                contentContainerStyle={[
                    styles.scroll,
                    { paddingTop: insets.top + 44 + 24, paddingBottom: FLOATING_TAB_BAR_HEIGHT + insets.bottom + 32 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Contacto */}
                <Text style={styles.sectionLabel}>CONTACTO</Text>
                <View style={styles.card}>
                    {CONTACT.map((item, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.contactRow, i < CONTACT.length - 1 && styles.contactRowBorder]}
                            onPress={item.action}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={item.label}
                        >
                            <View style={[styles.contactIcon, { backgroundColor: item.color + '18' }]}>
                                <Ionicons name={item.icon} size={22} color={item.color} />
                            </View>
                            <View style={styles.contactText}>
                                <Text style={styles.contactLabel}>{item.label}</Text>
                                <Text style={styles.contactValue}>{item.value}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#ccc" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* FAQs */}
                {FAQS.map((section) => (
                    <View key={section.category}>
                        <View style={styles.categoryHeader}>
                            <Ionicons name={section.icon} size={15} color="#ff8800" />
                            <Text style={styles.sectionLabel}>{section.category.toUpperCase()}</Text>
                        </View>
                        <View style={styles.card}>
                            {section.items.map((item, i) => (
                                <View key={i}>
                                    <FaqItem item={item} />
                                    {i < section.items.length - 1 && <View style={styles.divider} />}
                                </View>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Chat con IA */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('ChatSupport')}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel="Chatear con asistente IA"
                    style={styles.chatBtnShadow}
                >
                    <LinearGradient
                        colors={['#1a0533', '#2d1b69', '#0d1b4d']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.chatBtn}
                    >
                        {/* Orb decorativo */}
                        <View style={styles.chatOrb1} />
                        <View style={styles.chatOrb2} />

                        {/* Icono */}
                        <View style={styles.chatBtnIcon}>
                            <Ionicons name="flash" size={22} color="#c084fc" />
                        </View>

                        {/* Texto */}
                        <View style={{ flex: 1 }}>
                            <View style={styles.chatBtnTitleRow}>
                                <Text style={styles.chatBtnTitle}>Asistente IA</Text>
                                <View style={styles.aiBadge}>
                                    <Text style={styles.aiBadgeText}>CLAUDE</Text>
                                </View>
                            </View>
                            <Text style={styles.chatBtnSub}>Respuestas instantáneas · Disponible 24/7</Text>
                        </View>

                        <Ionicons name="chevron-forward" size={18} color="rgba(192,132,252,0.6)" />
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.footer}>
                    ¿No encontraste lo que buscabas? Escribinos y te respondemos a la brevedad.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },

    scroll: { paddingHorizontal: 16 },

    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#888',
        letterSpacing: 1.2,
        marginBottom: 10,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 24,
        marginBottom: 10,
    },

    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
    },

    // Contact
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        minHeight: 64,
    },
    contactRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    contactIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    contactText:  { flex: 1 },
    contactLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
    contactValue: { fontSize: 13, color: '#888' },

    // FAQ
    faqItem:     { padding: 16 },
    faqQuestion: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
    faqQuestionText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a1a', lineHeight: 20 },
    faqAnswer:   { marginTop: 10 },
    faqAnswerText: { fontSize: 14, color: '#666', lineHeight: 20 },

    divider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 16 },

    chatBtnShadow: {
        marginTop: 24,
        borderRadius: 20,
        elevation: 8,
        shadowColor: '#7c3aed',
        shadowOpacity: 0.55,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 16,
    },
    chatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        padding: 18,
        gap: 14,
        borderWidth: 1,
        borderColor: 'rgba(192,132,252,0.25)',
        overflow: 'hidden',
    },
    chatOrb1: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(139,92,246,0.25)',
        top: -40,
        right: -20,
    },
    chatOrb2: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(59,130,246,0.2)',
        bottom: -30,
        left: 20,
    },
    chatBtnIcon: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(192,132,252,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(192,132,252,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatBtnTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
    chatBtnTitle:    { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
    aiBadge: {
        backgroundColor: 'rgba(192,132,252,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(192,132,252,0.4)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    aiBadgeText: { color: '#c084fc', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
    chatBtnSub:  { color: 'rgba(255,255,255,0.5)', fontSize: 12 },

    footer: {
        marginTop: 24,
        fontSize: 13,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 16,
    },
});
