import { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Animated, Dimensions,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector } from '../../store/hooks';
import API from '../../services/api';
import { FLOATING_TAB_BAR_HEIGHT } from '../../navigation/FloatingTabBar';
import { showErrorMessage, showSuccessMessage } from '../../components/FlashMessageWrapper';

const { width: SCREEN_W } = Dimensions.get('window');

const CATEGORIES = ['burgers', 'pizzas', 'sushi', 'pasta', 'ensaladas', 'bebidas', 'postres', 'otros'];

const STEPS = [
    { icon: 'storefront-outline',  title: 'Tu negocio',       subtitle: 'Contale a tus clientes quiénes son' },
    { icon: 'fast-food-outline',   title: 'Primer plato',     subtitle: 'Agregá lo que más vendés' },
    { icon: 'bicycle-outline',     title: 'Primer repartidor', subtitle: 'Alguien que lleve los pedidos' },
    { icon: 'pricetag-outline',    title: 'Primer cupón',     subtitle: 'Un descuento para atraer clientes' },
    { icon: 'checkmark-circle-outline', title: '¡Todo listo!', subtitle: 'Tu negocio está configurado' },
];

function ProgressBar({ step, total }) {
    return (
        <View style={styles.progressContainer}>
            {Array.from({ length: total }).map((_, i) => (
                <View
                    key={i}
                    style={[
                        styles.progressDot,
                        i < step && styles.progressDotDone,
                        i === step && styles.progressDotActive,
                    ]}
                />
            ))}
        </View>
    );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, autoCapitalize, multiline }) {
    return (
        <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                style={[styles.input, multiline && styles.inputMultiline]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                keyboardType={keyboardType || 'default'}
                secureTextEntry={secureTextEntry}
                autoCapitalize={autoCapitalize || 'sentences'}
                multiline={multiline}
                numberOfLines={multiline ? 3 : 1}
            />
        </View>
    );
}

// ── Step 1: Info del restaurante ──────────────────────────
function StepNegocio({ data, onChange, onPickLogo, uploadingLogo }) {
    return (
        <View style={styles.stepBody}>
            <Text style={styles.fieldLabel}>Logo del negocio</Text>
            <TouchableOpacity style={styles.logoPicker} onPress={onPickLogo} disabled={uploadingLogo}>
                {data.logo_url ? (
                    <Image source={{ uri: data.logo_url }} style={styles.logoPreview} />
                ) : (
                    <View style={styles.logoPlaceholder}>
                        <Ionicons name="camera-outline" size={28} color="#9CA3AF" />
                        <Text style={styles.logoPlaceholderText}>Subir logo</Text>
                    </View>
                )}
                {uploadingLogo && (
                    <View style={styles.logoUploading}>
                        <ActivityIndicator color="#FF8700" />
                    </View>
                )}
            </TouchableOpacity>
            <Field label="Nombre del negocio *" value={data.nombre} onChangeText={onChange('nombre')} placeholder="Ej: La Parrilla de Juan" autoCapitalize="words" />
            <Field label="Descripción" value={data.descripcion} onChangeText={onChange('descripcion')} placeholder="Qué tipo de comida hacen, qué los hace únicos..." multiline />
            <Field label="Dirección" value={data.direccion} onChangeText={onChange('direccion')} placeholder="Ej: Av. Corrientes 1234, CABA" autoCapitalize="words" />
            <Field label="Teléfono" value={data.telefono} onChangeText={onChange('telefono')} placeholder="Ej: +54 11 4567-8900" keyboardType="phone-pad" autoCapitalize="none" />
        </View>
    );
}

// ── Step 2: Primer plato ──────────────────────────────────
function StepPlato({ data, onChange }) {
    return (
        <View style={styles.stepBody}>
            <Field label="Nombre del plato *" value={data.nombre} onChangeText={onChange('nombre')} placeholder="Ej: Hamburguesa completa" autoCapitalize="words" />
            <Field label="Precio *" value={data.precio} onChangeText={onChange('precio')} placeholder="Ej: 1500" keyboardType="numeric" autoCapitalize="none" />
            <Field label="Descripción" value={data.descripcion} onChangeText={onChange('descripcion')} placeholder="Ingredientes, tamaño, etc." multiline />
            <Text style={styles.fieldLabel}>Categoría *</Text>
            <View style={styles.chipWrap}>
                {CATEGORIES.map(cat => (
                    <TouchableOpacity
                        key={cat}
                        style={[styles.chip, data.categoria === cat && styles.chipSelected]}
                        onPress={() => onChange('categoria')(cat)}
                    >
                        <Text style={[styles.chipText, data.categoria === cat && styles.chipTextSelected]}>
                            {cat}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

// ── Step 3: Repartidor ────────────────────────────────────
function StepRepartidor({ data, onChange }) {
    return (
        <View style={styles.stepBody}>
            <Text style={styles.stepNote}>
                Creamos una cuenta para tu repartidor. Él va a usar este email y contraseña para entrar a la app.
            </Text>
            <Field label="Nombre *" value={data.nombre} onChangeText={onChange('nombre')} placeholder="Ej: Carlos" autoCapitalize="words" />
            <Field label="Apellido" value={data.apellido} onChangeText={onChange('apellido')} placeholder="Ej: González" autoCapitalize="words" />
            <Field label="Email *" value={data.email} onChangeText={onChange('email')} placeholder="carlos@gmail.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Teléfono" value={data.telefono} onChangeText={onChange('telefono')} placeholder="+54 11 4567-8900" keyboardType="phone-pad" autoCapitalize="none" />
            <Field label="Contraseña temporal *" value={data.password} onChangeText={onChange('password')} placeholder="Mínimo 6 caracteres" secureTextEntry autoCapitalize="none" />
        </View>
    );
}

// ── Step 4: Cupón ─────────────────────────────────────────
function StepCupon({ data, onChange }) {
    return (
        <View style={styles.stepBody}>
            <Text style={styles.stepNote}>
                Un cupón de bienvenida es una buena forma de conseguir los primeros pedidos.
            </Text>
            <Field label="Título *" value={data.titulo} onChangeText={onChange('titulo')} placeholder="Ej: Descuento de bienvenida" autoCapitalize="words" />
            <Field label="Código *" value={data.codigo} onChangeText={onChange('codigo')} placeholder="Ej: BIENVENIDO20" autoCapitalize="characters" />
            <Field label="Descuento (%)" value={data.descuento} onChangeText={onChange('descuento')} placeholder="Ej: 20" keyboardType="numeric" autoCapitalize="none" />
            <Field label="Válido hasta *" value={data.valido_hasta} onChangeText={onChange('valido_hasta')} placeholder="AAAA-MM-DD" autoCapitalize="none" />
        </View>
    );
}

// ── Step 5: Done ──────────────────────────────────────────
function StepDone({ completed, onGoToDashboard }) {
    return (
        <View style={[styles.stepBody, styles.doneWrap]}>
            <View style={styles.doneIcon}>
                <Ionicons name="checkmark-circle" size={72} color="#10B981" />
            </View>
            <Text style={styles.doneTitle}>¡Tu negocio está listo!</Text>
            <Text style={styles.doneSubtitle}>Esto es lo que configuramos:</Text>
            <View style={styles.doneList}>
                {completed.negocio   && <DoneItem icon="storefront-outline"  text="Info del negocio actualizada" />}
                {completed.plato     && <DoneItem icon="fast-food-outline"   text="Primer plato en el menú" />}
                {completed.repartidor && <DoneItem icon="bicycle-outline"    text="Primer repartidor creado" />}
                {completed.cupon     && <DoneItem icon="pricetag-outline"    text="Primer cupón activo" />}
            </View>
            <Text style={styles.doneHint}>
                Podés agregar más platos, repartidores y cupones desde el panel de administración.
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={onGoToDashboard}>
                <Text style={styles.doneBtnText}>Ir al panel de admin</Text>
            </TouchableOpacity>
        </View>
    );
}

function DoneItem({ icon, text }) {
    return (
        <View style={styles.doneItem}>
            <Ionicons name={icon} size={18} color="#10B981" />
            <Text style={styles.doneItemText}>{text}</Text>
        </View>
    );
}

// ── Main ──────────────────────────────────────────────────
export default function AdminOnboardingScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const selectedRestaurant = useAppSelector(s => s.restaurant.selected);
    const restauranteId = selectedRestaurant?.id;

    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [completed, setCompleted] = useState({ negocio: false, plato: false, repartidor: false, cupon: false });

    const [negocio, setNegocio] = useState({
        nombre: selectedRestaurant?.nombre || '',
        descripcion: selectedRestaurant?.descripcion || '',
        direccion: selectedRestaurant?.direccion || '',
        telefono: selectedRestaurant?.telefono || '',
        logo_url: selectedRestaurant?.logo_url || '',
    });
    const [plato, setPlato] = useState({ nombre: '', precio: '', descripcion: '', categoria: 'otros' });
    const [repartidor, setRepartidor] = useState({ nombre: '', apellido: '', email: '', telefono: '', password: '' });
    const [cupon, setCupon] = useState({ titulo: '', codigo: '', descuento: '10', valido_hasta: '' });

    const makeChanger = (setter) => (key) => (val) => setter(prev => ({ ...prev, [key]: val }));

    const handlePickLogo = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { showErrorMessage('Permiso requerido', 'Necesitamos acceso a tu galería'); return; }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (result.canceled) return;

        setUploadingLogo(true);
        try {
            const res = await API.admin.upload(result.assets[0].uri);
            if (res.success) {
                setNegocio(prev => ({ ...prev, logo_url: res.url }));
            } else {
                showErrorMessage('Error', 'No se pudo subir el logo');
            }
        } catch {
            showErrorMessage('Error', 'No se pudo subir el logo');
        } finally {
            setUploadingLogo(false);
        }
    };

    const animateTo = (nextStep) => {
        Animated.timing(slideAnim, { toValue: -SCREEN_W, duration: 200, useNativeDriver: true }).start(() => {
            setStep(nextStep);
            slideAnim.setValue(SCREEN_W);
            Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 2, useNativeDriver: true }).start();
        });
    };

    const saveStep = async () => {
        setSaving(true);
        try {
            if (step === 0) {
                if (!negocio.nombre.trim()) { showErrorMessage('Falta el nombre del negocio'); return; }
                await API.admin.restaurante.updateInfo(restauranteId, negocio);
                setCompleted(c => ({ ...c, negocio: true }));
                showSuccessMessage('Negocio guardado');
                animateTo(1);

            } else if (step === 1) {
                if (!plato.nombre.trim() || !plato.precio) { showErrorMessage('Faltan datos', 'Nombre y precio son requeridos'); return; }
                await API.admin.platos.create(restauranteId, {
                    nombre: plato.nombre,
                    precio: parseFloat(plato.precio),
                    descripcion: plato.descripcion,
                    categoria: plato.categoria,
                });
                setCompleted(c => ({ ...c, plato: true }));
                showSuccessMessage('Plato agregado al menú');
                animateTo(2);

            } else if (step === 2) {
                if (!repartidor.nombre.trim() || !repartidor.email.trim() || !repartidor.password) {
                    showErrorMessage('Faltan datos', 'Nombre, email y contraseña son requeridos');
                    return;
                }
                const res = await API.admin.restaurante.createRepartidor(repartidor);
                if (!res.success) { showErrorMessage('Error', res.message || 'No se pudo crear el repartidor'); return; }
                setCompleted(c => ({ ...c, repartidor: true }));
                showSuccessMessage('Repartidor creado');
                animateTo(3);

            } else if (step === 3) {
                if (!cupon.titulo.trim() || !cupon.codigo.trim() || !cupon.valido_hasta.trim()) {
                    showErrorMessage('Faltan datos', 'Título, código y fecha de vencimiento son requeridos');
                    return;
                }
                const res = await API.admin.cupones.create({
                    titulo: cupon.titulo,
                    codigo: cupon.codigo.toUpperCase(),
                    discount_percent: parseInt(cupon.descuento) || 10,
                    valido_hasta: cupon.valido_hasta,
                    oferta: `${cupon.descuento}% OFF`,
                    color: '#FF8700',
                });
                if (!res.success) { showErrorMessage('Error', res.message || 'No se pudo crear el cupón'); return; }
                setCompleted(c => ({ ...c, cupon: true }));
                showSuccessMessage('Cupón creado');
                animateTo(4);
            }
        } catch (e) {
            showErrorMessage('Error', 'No se pudo guardar. Revisá tu conexión.');
        } finally {
            setSaving(false);
        }
    };

    const skipStep = () => animateTo(Math.min(step + 1, 4));

    const isDone = step === 4;
    const currentStep = STEPS[step];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <LinearGradient colors={['#FF8700', '#FF5500']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Configuración inicial</Text>
                    <View style={{ width: 36 }} />
                </View>
                <ProgressBar step={step} total={STEPS.length} />
                <View style={styles.stepHeaderInfo}>
                    <View style={styles.stepIconWrap}>
                        <Ionicons name={currentStep.icon} size={24} color="#FF8700" />
                    </View>
                    <View>
                        <Text style={styles.stepTitle}>{currentStep.title}</Text>
                        <Text style={styles.stepSubtitle}>{currentStep.subtitle}</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Content */}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
                        {step === 0 && <StepNegocio    data={negocio}    onChange={makeChanger(setNegocio)} onPickLogo={handlePickLogo} uploadingLogo={uploadingLogo} />}
                        {step === 1 && <StepPlato       data={plato}      onChange={makeChanger(setPlato)} />}
                        {step === 2 && <StepRepartidor  data={repartidor} onChange={makeChanger(setRepartidor)} />}
                        {step === 3 && <StepCupon       data={cupon}      onChange={makeChanger(setCupon)} />}
                        {step === 4 && <StepDone completed={completed} onGoToDashboard={() => navigation.navigate('AdminDashboard')} />}
                    </Animated.View>
                </ScrollView>

                {!isDone && (
                    <View style={[styles.footer, { paddingBottom: insets.bottom + FLOATING_TAB_BAR_HEIGHT }]}>
                        <TouchableOpacity style={styles.skipBtn} onPress={skipStep}>
                            <Text style={styles.skipText}>Saltar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.nextBtn, saving && { opacity: 0.6 }]}
                            onPress={saveStep}
                            disabled={saving}
                        >
                            {saving
                                ? <ActivityIndicator color="#fff" />
                                : <>
                                    <Text style={styles.nextText}>
                                        {step === 3 ? 'Finalizar' : 'Guardar y continuar'}
                                    </Text>
                                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                                  </>
                            }
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
    progressContainer: { flexDirection: 'row', gap: 6, marginBottom: 16 },
    progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
    progressDotDone: { backgroundColor: 'rgba(255,255,255,0.7)' },
    progressDotActive: { backgroundColor: '#fff' },
    stepHeaderInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    stepTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
    stepSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    scroll: { padding: 20, paddingBottom: 40 },
    stepBody: { gap: 4 },
    stepNote: { fontSize: 13, color: '#6B7280', backgroundColor: '#FFF7ED', borderRadius: 10, padding: 12, marginBottom: 8, lineHeight: 18 },
    fieldWrap: { marginBottom: 12 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, letterSpacing: 0.3 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' },
    inputMultiline: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
    logoPicker: { alignSelf: 'center', marginBottom: 16 },
    logoPreview: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: '#FF8700' },
    logoPlaceholder: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', gap: 4 },
    logoPlaceholderText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
    logoUploading: { ...StyleSheet.absoluteFillObject, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    chipSelected: { backgroundColor: '#FFF7ED', borderColor: '#FF8700' },
    chipText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    chipTextSelected: { color: '#FF8700', fontWeight: '700' },
    footer: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, gap: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff' },
    skipBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
    skipText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
    nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF8700', paddingVertical: 14, borderRadius: 14 },
    nextText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    // Done
    doneWrap: { alignItems: 'center', paddingTop: 20 },
    doneIcon: { marginBottom: 16 },
    doneTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
    doneSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
    doneList: { width: '100%', gap: 10, marginBottom: 20 },
    doneItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12 },
    doneItemText: { fontSize: 14, color: '#065F46', fontWeight: '500' },
    doneHint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18, marginBottom: 24 },
    doneBtn: { backgroundColor: '#FF8700', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14 },
    doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
