import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
    PanResponder,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import { Dialog, Portal, Button, Paragraph } from 'react-native-paper';
import AppHeader from '../../components/common/AppHeader';
import InstructionBanner from '../../components/common/InstructionBanner';
import { showSuccessMessage, showErrorMessage } from '../../components/FlashMessageWrapper';
import api from '../../services/api';

// ─── Card brand detection ──────────────────────────────────────────────────────

function detectBrand(number) {
    const n = number.replace(/\D/g, '');
    if (/^4/.test(n)) return 'visa';
    if (/^5[1-5]/.test(n) || /^2[2-7]\d{2}/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    return 'otro';
}

const BRAND_THEME = {
    visa:       { gradient: ['#0d47a1', '#1976d2', '#42a5f5'], label: 'VISA' },
    mastercard: { gradient: ['#1a1a2e', '#b71c1c', '#e53935'], label: 'mastercard' },
    amex:       { gradient: ['#004d40', '#00796b', '#26a69a'], label: 'AMEX' },
    otro:       { gradient: ['#263238', '#455a64', '#78909c'], label: '' },
};

const TIPO_META = {
    tarjeta:       { icon: 'card',            color: '#1A1F71', label: 'Tarjeta' },
    efectivo:      { icon: 'cash',            color: '#34C759', label: 'Efectivo' },
    transferencia: { icon: 'swap-horizontal', color: '#007AFF', label: 'Transferencia' },
};

const TIPOS = ['tarjeta', 'efectivo', 'transferencia'];

function getIconColor(method) {
    const BRAND_COLOR = { visa: '#1A1F71', mastercard: '#EB001B', amex: '#007B5E', otro: '#666' };
    if (method.tipo === 'tarjeta' && method.marca) return BRAND_COLOR[method.marca] ?? '#666';
    return TIPO_META[method.tipo]?.color ?? '#666';
}

function getLabel(method) {
    if (method.tipo === 'tarjeta') {
        const brand = method.marca ? method.marca.charAt(0).toUpperCase() + method.marca.slice(1) : '';
        const digits = method.ultimos_4_digitos ? ` •••• ${method.ultimos_4_digitos}` : '';
        return `${brand}${digits}`;
    }
    return TIPO_META[method.tipo]?.label ?? method.tipo;
}

function formatDisplay(number) {
    const cleaned = number.replace(/\D/g, '');
    const padded = cleaned.padEnd(16, '•');
    return `${padded.slice(0, 4)} ${padded.slice(4, 8)} ${padded.slice(8, 12)} ${padded.slice(12, 16)}`;
}

function formatCardInput(text) {
    const digits = text.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(text) {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
}

// ─── Brand logo ───────────────────────────────────────────────────────────────

function BrandLogo({ brand }) {
    if (brand === 'visa') {
        return <Text style={cardStyles.visaText}>VISA</Text>;
    }
    if (brand === 'mastercard') {
        return (
            <View style={cardStyles.mcRow}>
                <View style={[cardStyles.mcCircle, { backgroundColor: '#eb001b' }]} />
                <View style={[cardStyles.mcCircle, { backgroundColor: '#f79e1b', marginLeft: -12 }]} />
            </View>
        );
    }
    if (brand === 'amex') {
        return <Text style={cardStyles.amexText}>AMEX</Text>;
    }
    return null;
}

// ─── Interactive card ─────────────────────────────────────────────────────────

function InteractiveCard({ cardNumber, cardHolder, cardExpiry, cardCvv, brand, isFlipped }) {
    const flipAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(flipAnim, {
            toValue: isFlipped ? 180 : 0,
            useNativeDriver: true,
            friction: 8,
            tension: 60,
        }).start();
    }, [isFlipped]);

    const frontRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
    const backRotate  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

    const theme = BRAND_THEME[brand] || BRAND_THEME.otro;

    return (
        <View style={cardStyles.wrapper}>
            {/* Front */}
            <Animated.View style={[cardStyles.face, { transform: [{ perspective: 1200 }, { rotateY: frontRotate }] }]}>
                <LinearGradient colors={theme.gradient} style={cardStyles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    {/* Decorative circles */}
                    <View style={cardStyles.circle1} />
                    <View style={cardStyles.circle2} />

                    {/* Top row */}
                    <View style={cardStyles.topRow}>
                        <View style={cardStyles.chip}>
                            <View style={cardStyles.chipVLine} />
                            <View style={cardStyles.chipHLine} />
                        </View>
                        <BrandLogo brand={brand} />
                    </View>

                    {/* Number */}
                    <Text style={cardStyles.number}>{formatDisplay(cardNumber)}</Text>

                    {/* Bottom row */}
                    <View style={cardStyles.bottomRow}>
                        <View style={{ flex: 1, marginRight: 16 }}>
                            <Text style={cardStyles.fieldLabel}>TITULAR</Text>
                            <Text style={cardStyles.fieldValue} numberOfLines={1}>
                                {cardHolder.toUpperCase() || 'NOMBRE APELLIDO'}
                            </Text>
                        </View>
                        <View>
                            <Text style={cardStyles.fieldLabel}>VENCE</Text>
                            <Text style={cardStyles.fieldValue}>{cardExpiry || 'MM/AA'}</Text>
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>

            {/* Back */}
            <Animated.View style={[cardStyles.face, cardStyles.faceBack, { transform: [{ perspective: 1200 }, { rotateY: backRotate }] }]}>
                <LinearGradient colors={[...theme.gradient].reverse()} style={cardStyles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <View style={cardStyles.stripe} />
                    <View style={cardStyles.cvvRow}>
                        <Text style={cardStyles.cvvLabel}>CVV</Text>
                        <View style={cardStyles.cvvStrip}>
                            <Text style={cardStyles.cvvValue}>
                                {cardCvv ? '•'.repeat(cardCvv.length) : '•••'}
                            </Text>
                        </View>
                    </View>
                    <View style={cardStyles.backBrandRow}>
                        <BrandLogo brand={brand} />
                    </View>
                </LinearGradient>
            </Animated.View>
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PaymentMethodsScreen({ navigation }) {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ visible: false, id: null });

    const [tipo, setTipo] = useState('tarjeta');
    const [cardNumber, setCardNumber] = useState('');
    const [cardHolder, setCardHolder] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [esPrincipal, setEsPrincipal] = useState(false);
    const [cvvFocused, setCvvFocused] = useState(false);

    const brand = detectBrand(cardNumber);

    const insets = useSafeAreaInsets();

    useEffect(() => { loadMethods(); }, []);

    const loadMethods = async () => {
        try {
            const res = await api.payments.getMethods();
            if (res.success) setMethods(res.methods);
            else Alert.alert('Error', res.message || 'No se pudieron cargar los métodos');
        } catch {
            Alert.alert('Error', 'No se pudieron cargar los métodos de pago');
        } finally {
            setLoading(false);
        }
    };

    // ── Bottom sheet ──

    const sheetY = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
        onPanResponderMove: (_, g) => { if (g.dy > 0) sheetY.setValue(g.dy); },
        onPanResponderRelease: (_, g) => {
            if (g.dy > 100) {
                Animated.timing(sheetY, { toValue: 700, duration: 200, useNativeDriver: true }).start(() => {
                    setModalVisible(false);
                    sheetY.setValue(0);
                });
            } else {
                Animated.spring(sheetY, { toValue: 0, useNativeDriver: true }).start();
            }
        },
    })).current;

    const openAdd = () => {
        setTipo('tarjeta');
        setCardNumber('');
        setCardHolder('');
        setCardExpiry('');
        setCardCvv('');
        setEsPrincipal(false);
        setCvvFocused(false);
        sheetY.setValue(700);
        setModalVisible(true);
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    };

    const closeSheet = () => {
        Animated.timing(sheetY, { toValue: 700, duration: 200, useNativeDriver: true }).start(() => {
            setModalVisible(false);
            sheetY.setValue(0);
        });
    };

    // ── CRUD ──

    const handleDelete = (id) => setDeleteDialog({ visible: true, id });

    const confirmDelete = async () => {
        const id = deleteDialog.id;
        setDeleteDialog({ visible: false, id: null });
        try {
            const res = await api.payments.deleteMethod(id);
            if (res.success) {
                setMethods(prev => prev.filter(m => m.id !== id));
                showSuccessMessage('Método eliminado');
            } else {
                showErrorMessage(res.message || 'No se pudo eliminar');
            }
        } catch {
            showErrorMessage('No se pudo eliminar el método');
        }
    };

    const handleSave = async () => {
        if (tipo === 'tarjeta') {
            const digits = cardNumber.replace(/\D/g, '');
            if (digits.length < 13) {
                Alert.alert('Validación', 'Ingresá un número de tarjeta válido');
                return;
            }
            if (!cardHolder.trim()) {
                Alert.alert('Validación', 'Ingresá el nombre del titular');
                return;
            }
            if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
                Alert.alert('Validación', 'Ingresá la fecha de vencimiento (MM/AA)');
                return;
            }
            if (cardCvv.length < 3) {
                Alert.alert('Validación', 'Ingresá el CVV');
                return;
            }
        }

        setSaving(true);
        try {
            const digits = cardNumber.replace(/\D/g, '');
            const payload = {
                tipo,
                ...(tipo === 'tarjeta' && {
                    ultimos_4_digitos: digits.slice(-4),
                    marca: brand,
                }),
                es_principal: esPrincipal,
            };
            const res = await api.payments.addMethod(payload);
            if (res.success) {
                closeSheet();
                showSuccessMessage('Método de pago guardado');
                loadMethods();
            } else {
                showErrorMessage(res.message || 'No se pudo guardar');
            }
        } catch {
            showErrorMessage('No se pudo guardar el método');
        } finally {
            setSaving(false);
        }
    };

    // ── Render ──

    const renderRightActions = (id) => (
        <TouchableOpacity
            style={styles.rightAction}
            onPress={() => handleDelete(id)}
            accessibilityRole="button"
            accessibilityLabel="Eliminar método de pago"
        >
            <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
    );

    const renderItem = ({ item }) => (
        <Swipeable renderRightActions={() => renderRightActions(item.id)}>
            <View style={styles.item}>
                <View style={[styles.iconCircle, { backgroundColor: getIconColor(item) + '18' }]}>
                    <Ionicons name={TIPO_META[item.tipo]?.icon ?? 'card'} size={24} color={getIconColor(item)} />
                </View>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel}>{getLabel(item)}</Text>
                    <Text style={styles.itemSub}>{TIPO_META[item.tipo]?.label ?? item.tipo}</Text>
                </View>
                {item.es_principal && (
                    <View style={styles.principalBadge}>
                        <Ionicons name="star" size={12} color="#f1c40f" />
                        <Text style={styles.principalBadgeText}>Principal</Text>
                    </View>
                )}
            </View>
        </Swipeable>
    );

    if (loading) return (
        <View style={styles.container}>
            <AppHeader title="Métodos de Pago" onBack={() => navigation.goBack()} />
            <View style={styles.centered}><ActivityIndicator size="large" color="#ff8000" /></View>
        </View>
    );

    return (
        <View style={styles.container}>
            <AppHeader
                title="Métodos de Pago"
                onBack={() => navigation.goBack()}
                rightComponent={
                    <TouchableOpacity
                        style={styles.headerAddButton}
                        onPress={openAdd}
                        accessibilityRole="button"
                        accessibilityLabel="Agregar método de pago"
                    >
                        <Ionicons name="add" size={22} color="#ff8000" />
                    </TouchableOpacity>
                }
            />

            <View style={[styles.content, { paddingTop: insets.top + 44 + 32, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 16 }]}>
                {methods.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="wallet-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>No tenés métodos de pago guardados.</Text>
                    </View>
                ) : (
                    <>
                        <InstructionBanner text="Deslizá a la izquierda para eliminar" />
                        <FlatList
                            data={methods}
                            keyExtractor={m => String(m.id)}
                            renderItem={renderItem}
                            contentContainerStyle={{ paddingVertical: 10 }}
                        />
                    </>
                )}
            </View>

            {/* Bottom sheet */}
            <Modal visible={modalVisible} animationType="none" transparent statusBarTranslucent>
                <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={closeSheet} />
                <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
                    <View style={styles.sheetHeader} {...panResponder.panHandlers}>
                        <View style={styles.sheetHandle} />
                        <TouchableOpacity style={styles.sheetClose} onPress={closeSheet} accessibilityRole="button" accessibilityLabel="Cerrar">
                            <Ionicons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.sheetContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.modalTitle}>Agregar método de pago</Text>

                        {/* Tipo pills */}
                        <View style={styles.pillRow}>
                            {TIPOS.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.pill, tipo === t && styles.pillActive]}
                                    onPress={() => setTipo(t)}
                                    accessibilityRole="button"
                                    accessibilityLabel={TIPO_META[t].label}
                                >
                                    <Ionicons name={TIPO_META[t].icon} size={14} color={tipo === t ? '#fff' : '#555'} style={{ marginRight: 4 }} />
                                    <Text style={[styles.pillText, tipo === t && styles.pillTextActive]}>
                                        {TIPO_META[t].label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {tipo === 'tarjeta' ? (
                            <>
                                {/* Interactive card */}
                                <InteractiveCard
                                    cardNumber={cardNumber}
                                    cardHolder={cardHolder}
                                    cardExpiry={cardExpiry}
                                    cardCvv={cardCvv}
                                    brand={brand}
                                    isFlipped={cvvFocused}
                                />

                                {/* Card number */}
                                <Text style={styles.fieldLabel}>Número de tarjeta</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="1234 5678 9012 3456"
                                    value={cardNumber}
                                    onChangeText={t => setCardNumber(formatCardInput(t))}
                                    keyboardType="numeric"
                                    maxLength={19}
                                    accessibilityLabel="Número de tarjeta"
                                />

                                {/* Holder */}
                                <Text style={styles.fieldLabel}>Titular</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Como aparece en la tarjeta"
                                    value={cardHolder}
                                    onChangeText={setCardHolder}
                                    autoCapitalize="characters"
                                    accessibilityLabel="Nombre del titular"
                                />

                                {/* Expiry + CVV */}
                                <View style={styles.rowFields}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={styles.fieldLabel}>Vencimiento</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="MM/AA"
                                            value={cardExpiry}
                                            onChangeText={t => setCardExpiry(formatExpiry(t))}
                                            keyboardType="numeric"
                                            maxLength={5}
                                            accessibilityLabel="Fecha de vencimiento"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.fieldLabel}>CVV</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="•••"
                                            value={cardCvv}
                                            onChangeText={t => setCardCvv(t.replace(/\D/g, '').slice(0, 4))}
                                            keyboardType="numeric"
                                            maxLength={4}
                                            secureTextEntry
                                            onFocus={() => setCvvFocused(true)}
                                            onBlur={() => setCvvFocused(false)}
                                            accessibilityLabel="CVV"
                                        />
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View style={styles.simpleTypeBox}>
                                <Ionicons name={TIPO_META[tipo].icon} size={40} color={TIPO_META[tipo].color} />
                                <Text style={styles.simpleTypeText}>
                                    {tipo === 'efectivo'
                                        ? 'Pagás en efectivo al recibir el pedido'
                                        : 'Transferencia bancaria al confirmar'}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.principalRow}
                            onPress={() => setEsPrincipal(v => !v)}
                            accessibilityRole="checkbox"
                            accessibilityLabel={esPrincipal ? 'Predeterminado' : 'Marcar como predeterminado'}
                        >
                            <Ionicons name={esPrincipal ? 'star' : 'star-outline'} size={20} color={esPrincipal ? '#f1c40f' : '#999'} />
                            <Text style={styles.principalRowText}>
                                {esPrincipal ? 'Predeterminado' : 'Marcar como predeterminado'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={closeSheet} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel="Cancelar">
                                <Text style={styles.cancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                                disabled={saving}
                                accessibilityRole="button"
                                accessibilityLabel="Guardar"
                            >
                                {saving
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={styles.saveBtnText}>Guardar</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Animated.View>
            </Modal>

            {/* Delete dialog */}
            <Portal>
                <Dialog visible={deleteDialog.visible} onDismiss={() => setDeleteDialog({ visible: false, id: null })} style={styles.dialog}>
                    <Dialog.Icon icon="trash-can-outline" size={36} color="#cc0000" />
                    <Dialog.Title style={styles.dialogTitle}>Eliminar método</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph style={styles.dialogMessage}>¿Querés eliminar este método de pago?</Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions style={styles.dialogActions}>
                        <Button onPress={() => setDeleteDialog({ visible: false, id: null })} textColor="#888">Cancelar</Button>
                        <Button onPress={confirmDelete} textColor="#cc0000">Eliminar</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

// ─── Card styles ──────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
    wrapper: {
        width: '100%',
        height: 200,
        marginBottom: 24,
        marginTop: 8,
    },
    face: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden',
    },
    faceBack: {
        // already positioned absolute
    },
    card: {
        flex: 1,
        borderRadius: 18,
        padding: 20,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
    },

    // Decorative
    circle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.07)',
        top: -60,
        right: -40,
    },
    circle2: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.05)',
        bottom: -40,
        left: -20,
    },

    // Front
    topRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    chip:      { width: 42, height: 32, backgroundColor: '#d4af37', borderRadius: 6, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    chipVLine: { position: 'absolute', width: 1, height: '100%', backgroundColor: '#b8972e' },
    chipHLine: { position: 'absolute', height: 1, width: '100%', backgroundColor: '#b8972e' },

    number:    { color: '#fff', fontSize: 18, fontWeight: '600', letterSpacing: 3, marginBottom: 20, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

    bottomRow: { flexDirection: 'row', alignItems: 'flex-end' },
    fieldLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 1, marginBottom: 2 },
    fieldValue: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 1 },

    // Brand logos
    visaText:  { color: '#fff', fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
    amexText:  { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
    mcRow:     { flexDirection: 'row', alignItems: 'center' },
    mcCircle:  { width: 28, height: 28, borderRadius: 14, opacity: 0.9 },

    // Back
    stripe:    { height: 44, backgroundColor: '#1a1a1a', marginHorizontal: -20, marginTop: 20, marginBottom: 16 },
    cvvRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
    cvvLabel:  { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginRight: 10, letterSpacing: 1 },
    cvvStrip:  { flex: 1, backgroundColor: '#fff', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
    cvvValue:  { color: '#333', fontSize: 16, letterSpacing: 4 },
    backBrandRow: { position: 'absolute', bottom: 20, right: 20 },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f7f7f7' },
    centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content:   { flex: 1, paddingHorizontal: 16 },

    empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: { color: '#999', fontSize: 15, textAlign: 'center' },

    headerAddButton: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#fff3e0',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#ffe0b2',
    },

    item: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 14,
        padding: 14, marginVertical: 6,
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
        minHeight: 56,
    },
    iconCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    itemInfo:   { flex: 1 },
    itemLabel:  { fontWeight: '700', fontSize: 15, color: '#222' },
    itemSub:    { fontSize: 12, color: '#888', marginTop: 2 },
    principalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff9e6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#f1c40f' },
    principalBadgeText: { fontSize: 12, color: '#b8860b', fontWeight: '600' },

    rightAction: { backgroundColor: '#cc0000', justifyContent: 'center', alignItems: 'center', width: 72, marginVertical: 6, borderRadius: 12 },

    // Sheet
    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '92%',
    },
    sheetHeader: { alignItems: 'center', paddingTop: 12, paddingBottom: 4, paddingHorizontal: 16 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', marginBottom: 4 },
    sheetClose:  { position: 'absolute', right: 16, top: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
    sheetContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#222' },

    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    pill: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd',
        backgroundColor: '#fafafa', minHeight: 44,
    },
    pillActive:     { backgroundColor: '#ff8000', borderColor: '#ff8000' },
    pillText:       { fontSize: 13, color: '#555', fontWeight: '500' },
    pillTextActive: { color: '#fff' },

    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 2 },

    input: {
        borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 12,
        fontSize: 16, color: '#222', marginBottom: 12, minHeight: 44,
        backgroundColor: '#fafafa',
    },

    rowFields: { flexDirection: 'row' },

    simpleTypeBox: {
        alignItems: 'center', gap: 12,
        paddingVertical: 32, marginBottom: 8,
    },
    simpleTypeText: { color: '#666', fontSize: 14, textAlign: 'center' },

    principalRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 4, minHeight: 44 },
    principalRowText: { color: '#444', fontSize: 14 },

    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
    cancelBtn:    { paddingVertical: 12, paddingHorizontal: 20, minHeight: 44, justifyContent: 'center' },
    cancelBtnText: { color: '#666', fontWeight: '500' },
    saveBtn:      { backgroundColor: '#ff8000', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10, minHeight: 44, justifyContent: 'center' },
    saveBtnText:  { color: '#fff', fontWeight: '700' },

    dialog:        { borderRadius: 20, backgroundColor: '#fff' },
    dialogTitle:   { textAlign: 'center', fontSize: 16, color: '#1a1a1a' },
    dialogMessage: { textAlign: 'center', fontSize: 14, color: '#555' },
    dialogActions: { justifyContent: 'space-around', paddingBottom: 8 },
});
