import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, Alert, Modal,
    TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../../services/api';

const formatCurrency = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;

function StatCard({ icon, label, value, color }) {
    return (
        <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function TenantCard({ tenant, onPress }) {
    const isActivo = tenant.estado === 'activo';
    return (
        <TouchableOpacity style={styles.tenantCard} onPress={() => onPress(tenant)} activeOpacity={0.8}>
            <View style={styles.tenantHeader}>
                <View style={styles.tenantLogoPlaceholder}>
                    <Ionicons name="storefront" size={22} color="#FF8700" />
                </View>
                <View style={styles.tenantInfo}>
                    <Text style={styles.tenantName} numberOfLines={1}>{tenant.nombre}</Text>
                    <Text style={styles.tenantAdmin} numberOfLines={1}>
                        {tenant.admin_nombre ? `${tenant.admin_nombre} ${tenant.admin_apellido}` : 'Sin admin asignado'}
                    </Text>
                </View>
                <View style={[styles.estadoBadge, { backgroundColor: isActivo ? '#D1FAE5' : '#FEE2E2' }]}>
                    <View style={[styles.estadoDot, { backgroundColor: isActivo ? '#10B981' : '#EF4444' }]} />
                    <Text style={[styles.estadoText, { color: isActivo ? '#065F46' : '#991B1B' }]}>
                        {isActivo ? 'Activo' : 'Inactivo'}
                    </Text>
                </View>
            </View>
            <View style={styles.tenantStats}>
                <View style={styles.tenantStatItem}>
                    <Ionicons name="receipt-outline" size={14} color="#6B7280" />
                    <Text style={styles.tenantStatText}>{tenant.pedidos_mes ?? 0} pedidos/mes</Text>
                </View>
                <View style={styles.tenantStatItem}>
                    <Ionicons name="cash-outline" size={14} color="#6B7280" />
                    <Text style={styles.tenantStatText}>{formatCurrency(tenant.revenue_mes)}/mes</Text>
                </View>
                <View style={styles.tenantStatItem}>
                    <Ionicons name="people-outline" size={14} color="#6B7280" />
                    <Text style={styles.tenantStatText}>{tenant.clientes_activos ?? 0} clientes</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function CreateTenantModal({ visible, onClose, onCreated }) {
    const [form, setForm] = useState({
        nombre: '', descripcion: '', direccion: '', telefono: '',
        admin_nombre: '', admin_apellido: '', admin_email: '', admin_password: '',
    });
    const [loading, setLoading] = useState(false);

    const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

    const handleCreate = async () => {
        if (!form.nombre || !form.admin_email || !form.admin_password) {
            Alert.alert('Faltan datos', 'Nombre del negocio, email y contraseña del admin son requeridos.');
            return;
        }
        setLoading(true);
        try {
            const res = await API.superadmin.createTenant(form);
            if (res.success) {
                Alert.alert('Listo', 'Tenant creado exitosamente.');
                setForm({ nombre: '', descripcion: '', direccion: '', telefono: '', admin_nombre: '', admin_apellido: '', admin_email: '', admin_password: '' });
                onCreated();
                onClose();
            } else {
                Alert.alert('Error', res.message || 'No se pudo crear el tenant.');
            }
        } catch {
            Alert.alert('Error', 'No se pudo conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Nuevo tenant</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#374151" />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                    <Text style={styles.sectionLabel}>NEGOCIO</Text>
                    {[
                        { key: 'nombre', placeholder: 'Nombre del negocio *', autoCapitalize: 'words' },
                        { key: 'descripcion', placeholder: 'Descripción', autoCapitalize: 'sentences' },
                        { key: 'direccion', placeholder: 'Dirección', autoCapitalize: 'words' },
                        { key: 'telefono', placeholder: 'Teléfono', keyboardType: 'phone-pad' },
                    ].map(f => (
                        <TextInput
                            key={f.key}
                            style={styles.input}
                            placeholder={f.placeholder}
                            placeholderTextColor="#9CA3AF"
                            value={form[f.key]}
                            onChangeText={set(f.key)}
                            autoCapitalize={f.autoCapitalize}
                            keyboardType={f.keyboardType || 'default'}
                        />
                    ))}

                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>USUARIO ADMIN</Text>
                    {[
                        { key: 'admin_nombre', placeholder: 'Nombre', autoCapitalize: 'words' },
                        { key: 'admin_apellido', placeholder: 'Apellido', autoCapitalize: 'words' },
                        { key: 'admin_email', placeholder: 'Email *', keyboardType: 'email-address', autoCapitalize: 'none' },
                        { key: 'admin_password', placeholder: 'Contraseña *', secureTextEntry: true },
                    ].map(f => (
                        <TextInput
                            key={f.key}
                            style={styles.input}
                            placeholder={f.placeholder}
                            placeholderTextColor="#9CA3AF"
                            value={form[f.key]}
                            onChangeText={set(f.key)}
                            autoCapitalize={f.autoCapitalize || 'none'}
                            keyboardType={f.keyboardType || 'default'}
                            secureTextEntry={f.secureTextEntry}
                        />
                    ))}

                    <TouchableOpacity
                        style={[styles.createBtn, loading && { opacity: 0.6 }]}
                        onPress={handleCreate}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.createBtnText}>Crear tenant</Text>
                        }
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

export default function SuperAdminDashboardScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [globalStats, setGlobalStats] = useState(null);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreate, setShowCreate] = useState(false);

    const load = useCallback(async () => {
        try {
            const [statsRes, tenantsRes] = await Promise.all([
                API.superadmin.getStats(),
                API.superadmin.getTenants(),
            ]);
            if (statsRes.success) setGlobalStats(statsRes.data);
            if (tenantsRes.success) setTenants(tenantsRes.data);
        } catch {
            Alert.alert('Error', 'No se pudo cargar el panel.');
        }
    }, []);

    useEffect(() => {
        load().finally(() => setLoading(false));
    }, [load]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#FF8700" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={['#FF8700', '#FF5500']} style={styles.header}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>Super Admin</Text>
                        <Text style={styles.headerSub}>Panel de control global</Text>
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
                        <Ionicons name="add" size={22} color="#FF8700" />
                    </TouchableOpacity>
                </View>

                {globalStats && (
                    <View style={styles.statsRow}>
                        <StatCard icon="storefront-outline" label="Activos" value={globalStats.tenants_activos} color="#10B981" />
                        <StatCard icon="receipt-outline" label="Pedidos/mes" value={globalStats.pedidos_mes} color="#3B82F6" />
                        <StatCard icon="cash-outline" label="Revenue/mes" value={formatCurrency(globalStats.revenue_mes)} color="#8B5CF6" />
                        <StatCard icon="alert-circle-outline" label="Pendientes" value={globalStats.pedidos_pendientes} color="#EF4444" />
                    </View>
                )}
            </LinearGradient>

            <FlatList
                data={tenants}
                keyExtractor={(t) => String(t.id)}
                renderItem={({ item }) => (
                    <TenantCard
                        tenant={item}
                        onPress={(t) => navigation.navigate('SuperAdminTenantDetail', { tenantId: t.id, tenantName: t.nombre })}
                    />
                )}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8700" progressViewOffset={insets.top + 60} />}
                ListHeaderComponent={
                    <Text style={styles.listHeader}>
                        {tenants.length} {tenants.length === 1 ? 'tenant' : 'tenants'}
                    </Text>
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="storefront-outline" size={48} color="#D1D5DB" />
                        <Text style={styles.emptyText}>No hay tenants aún</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
                            <Text style={styles.emptyBtnText}>Crear el primero</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            <CreateTenantModal
                visible={showCreate}
                onClose={() => setShowCreate(false)}
                onCreated={load}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    statsRow: { flexDirection: 'row', gap: 8 },
    statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10, alignItems: 'center' },
    statIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    statValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
    statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2, textAlign: 'center' },
    list: { padding: 16, gap: 12, paddingBottom: 40 },
    listHeader: { fontSize: 12, color: '#6B7280', fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
    tenantCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    tenantHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    tenantLogoPlaceholder: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    tenantInfo: { flex: 1 },
    tenantName: { fontSize: 15, fontWeight: '700', color: '#111827' },
    tenantAdmin: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    estadoBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4 },
    estadoDot: { width: 6, height: 6, borderRadius: 3 },
    estadoText: { fontSize: 11, fontWeight: '600' },
    tenantStats: { flexDirection: 'row', gap: 12 },
    tenantStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tenantStatText: { fontSize: 12, color: '#6B7280' },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: '#9CA3AF' },
    emptyBtn: { backgroundColor: '#FF8700', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    // modal
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    modalBody: { padding: 20 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#111827', marginBottom: 10 },
    createBtn: { backgroundColor: '#FF8700', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
