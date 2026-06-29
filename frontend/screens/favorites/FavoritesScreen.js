import React, { useState, useRef, useCallback, memo } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Dimensions,
    Animated,
    AccessibilityInfo,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { removeFromFavorites } from '../../store/slices/userSlice';
import API from '../../services/api';
import { showFavoriteMessage } from '../../components/FlashMessageWrapper';
import { imageMap } from '../../assets/utils/imageMap';
import AppHeader from '../../components/common/AppHeader';
import { Dialog, Portal, Button, Paragraph } from 'react-native-paper';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 52) / 2; // 16px lateral + 10px gap entre columnas

// Componente memoizado para cada favorito
const FavoriteItem = memo(({ item, onPress, onRemove, index, reduceMotion }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const entryAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

    React.useEffect(() => {
        if (reduceMotion) return;
        Animated.timing(entryAnim, {
            toValue: 1,
            duration: 300,
            delay: index * 40,
            useNativeDriver: true,
        }).start();
    }, []);

    const handlePressIn = () => {
        if (reduceMotion) return;
        Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        if (reduceMotion) return;
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    };

    const translateY = entryAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0],
    });

    const imageUrl = imageMap[item.imageKey];
    const itemImage = item.image || (imageUrl ? { uri: typeof imageUrl === 'string' ? imageUrl : imageUrl.uri } : null);

    return (
        <Animated.View style={[
            styles.cardWrapper,
            { opacity: entryAnim, transform: [{ scale: scaleAnim }, { translateY }] }
        ]}>
            <TouchableOpacity
                onPress={() => onPress(item)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                accessibilityLabel={`Ver ${item.name}`}
            >
                <View style={styles.card}>
                    {/* Imagen */}
                    <View style={styles.imageWrapper}>
                        {itemImage ? (
                            <Image
                                source={itemImage}
                                style={styles.foodImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Ionicons name="image-outline" size={32} color="#ccc" />
                            </View>
                        )}
                        {/* Badge corazón */}
                        <View style={styles.heartBadge}>
                            <Ionicons name="heart" size={12} color="#fff" />
                        </View>
                    </View>

                    {/* Contenido */}
                    <View style={styles.cardContent}>
                        <Text style={styles.foodName} numberOfLines={2}>
                            {item.name}
                        </Text>

                        <View style={styles.cardActions}>
                            {/* Ver detalle */}
                            <TouchableOpacity
                                style={styles.viewButton}
                                onPress={() => onPress(item)}
                                accessibilityLabel="Ver detalle"
                            >
                                <Ionicons name="eye-outline" size={15} color="#fff" />
                            </TouchableOpacity>

                            {/* Eliminar */}
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => onRemove(item.id, item.name)}
                                accessibilityLabel="Eliminar de favoritos"
                            >
                                <Ionicons name="heart-dislike-outline" size={15} color="#ff4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

// Estado vacío
const EmptyState = ({ onExplore }) => (
    <View style={styles.emptyState}>
        <View style={styles.emptyIconWrapper}>
            <Ionicons name="heart-outline" size={52} color="#ff8700" />
        </View>
        <Text style={styles.emptyTitle}>Sin favoritos aún</Text>
        <Text style={styles.emptySubtitle}>
            Guardá tus platos preferidos para acceder rápido
        </Text>
        <TouchableOpacity style={styles.exploreButton} onPress={onExplore}>
            <Text style={styles.exploreButtonText}>Explorar menú</Text>
        </TouchableOpacity>
    </View>
);

const FavoritesScreen = () => {
    const navigation = useNavigation();
    const dispatch = useAppDispatch();
    const favorites = useAppSelector(state => state.user.favorites);
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();

    const [dialogVisible, setDialogVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [reduceMotion, setReduceMotion] = useState(false);

    React.useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
        return () => sub.remove();
    }, []);

    const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

    const handlePress = useCallback((foodItem) => {
        navigation.navigate('FoodDetailFromFavorites', { foodItem });
    }, [navigation]);

    const handleExplore = useCallback(() => {
        navigation.navigate('HomeTab');
    }, [navigation]);

    const showDeleteDialog = useCallback((itemId, itemName) => {
        setSelectedItem({ id: itemId, name: itemName });
        setDialogVisible(true);
    }, []);

    const confirmDelete = useCallback(() => {
        if (selectedItem) {
            dispatch(removeFromFavorites(selectedItem.id));
            showFavoriteMessage(false, selectedItem.name);
            API.favorites.remove(selectedItem.id).catch(() => {});
            setDialogVisible(false);
            setSelectedItem(null);
        }
    }, [selectedItem, dispatch]);

    const cancelDelete = useCallback(() => {
        setDialogVisible(false);
        setSelectedItem(null);
    }, []);

    const renderItem = useCallback(({ item, index }) => (
        <FavoriteItem
            item={item}
            index={index}
            onPress={handlePress}
            onRemove={showDeleteDialog}
            reduceMotion={reduceMotion}
        />
    ), [handlePress, showDeleteDialog, reduceMotion]);

    const keyExtractor = useCallback((item) => String(item.id), []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <View style={styles.background} />

            <AppHeader
                title="Mis Favoritos"
                onBack={handleGoBack}
                rightComponent={
                    favorites.length > 0 ? (
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{favorites.length}</Text>
                        </View>
                    ) : undefined
                }
            />

            {favorites.length === 0 ? (
                <View style={[styles.emptyWrapper, { paddingTop: insets.top + 44 + 32 }]}>
                    <EmptyState onExplore={handleExplore} />
                </View>
            ) : (
                <FlatList
                    data={favorites}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    contentContainerStyle={[styles.listContent, {
                        paddingTop: insets.top + 44 + 32,
                        paddingBottom: tabBarHeight + 16,
                    }]}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={6}
                    maxToRenderPerBatch={6}
                />
            )}

            {/* Diálogo de confirmación */}
            <Portal>
                <Dialog
                    visible={dialogVisible}
                    onDismiss={cancelDelete}
                    style={styles.dialog}
                >
                    <Dialog.Icon icon="alert-circle-outline" size={36} color="#ff8700" />
                    <Dialog.Title style={styles.dialogTitle}>Eliminar favorito</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph style={styles.dialogMessage}>
                            ¿Querés eliminar "{selectedItem?.name}" de tus favoritos?
                        </Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions style={styles.dialogActions}>
                        <Button onPress={cancelDelete} textColor="#888">
                            Cancelar
                        </Button>
                        <Button onPress={confirmDelete} textColor="#ff4444">
                            Eliminar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#f5f5f5',
    },

    // Lista
    listContent: {
        paddingHorizontal: 16,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 12,
    },

    // Tarjeta
    cardWrapper: {
        width: CARD_WIDTH,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
    },
    imageWrapper: {
        height: 120,
        backgroundColor: '#f0f0f0',
        position: 'relative',
    },
    foodImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    heartBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#ff8700',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        padding: 12,
    },
    foodName: {
        fontFamily: 'Poppins-Bold',
        fontSize: 13,
        color: '#222',
        lineHeight: 18,
        marginBottom: 10,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
    },
    viewButton: {
        flex: 1,
        height: 44,
        backgroundColor: '#ff8700',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButton: {
        width: 44,
        height: 44,
        backgroundColor: '#fff0f0',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ffd0d0',
    },

    // Header badge
    countBadge: {
        backgroundColor: '#ff8700',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        minWidth: 24,
        alignItems: 'center',
    },
    countText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 12,
        color: '#fff',
    },

    // Empty state
    emptyWrapper: {
        flex: 1,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 100,
    },
    emptyIconWrapper: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#fff8f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#ff8700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
    },
    emptyTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 20,
        color: '#222',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 28,
    },
    exploreButton: {
        backgroundColor: '#ff8700',
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: '#ff8700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    exploreButtonText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
        color: '#fff',
    },

    // Dialog
    dialog: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginHorizontal: 24,
    },
    dialogTitle: {
        textAlign: 'center',
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        color: '#222',
    },
    dialogMessage: {
        textAlign: 'center',
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    dialogActions: {
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 12,
    },
});

export default FavoritesScreen;
