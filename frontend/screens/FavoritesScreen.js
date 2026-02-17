import React, { useState } from 'react'; // 👈 Agregar useState
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Dimensions,
    Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { removeFromFavorites } from '../store/slices/userSlice';
import { showSuccessMessage, showFavoriteMessage } from '../components/FlashMessageWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { imageMap } from '../assets/utils/imageMap';


import AppHeader from '../components/common/AppHeader';
// 👇 Importar componentes de React Native Paper
import { Dialog, Portal, Button, Paragraph } from 'react-native-paper';

const { width } = Dimensions.get('window');


const FavoritesScreen = () => {
    const navigation = useNavigation();
    const dispatch = useAppDispatch();
    const favorites = useAppSelector(state => state.user.favorites);

    // 👇 Estado para controlar el diálogo
    const [dialogVisible, setDialogVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const navigateToFoodDetail = (foodItem) => {
        navigation.navigate('FoodDetailFromFavorites', { foodItem });
    };
    const navigateToHome = () => {
        navigation.navigate('HomeTab');
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    // 👇 Nueva función para mostrar el diálogo
    const showDeleteDialog = (itemId, itemName) => {
        setSelectedItem({ id: itemId, name: itemName });
        setDialogVisible(true);
    };

    // 👇 Función para confirmar eliminación
    const confirmDelete = () => {
        if (selectedItem) {
            dispatch(removeFromFavorites(selectedItem.id));
            showFavoriteMessage(false, selectedItem.name);
            setDialogVisible(false);
            setSelectedItem(null);
        }
    };

    // 👇 Función para cancelar eliminación
    const cancelDelete = () => {
        setDialogVisible(false);
        setSelectedItem(null);
    };

    const renderFavoriteItem = ({ item, index }) => {
        const itemImage = item.image || imageMap[item.imageKey];

        return (
            <Animated.View
                style={[
                    styles.favoriteCard,
                    {
                        opacity: 1,
                        transform: [{ translateY: 0 }]
                    }
                ]}
            >
                <TouchableOpacity
                    style={styles.cardTouchable}
                    onPress={() => {
                        navigateToFoodDetail(item);
                    }}
                    activeOpacity={0.7}
                >
                    {/* Imagen con overlay gradient */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={itemImage}
                            style={styles.foodImage}
                            resizeMode="cover"
                        />

                        {/* Badge de favorito */}
                        <View style={styles.favoriteBadge}>
                            <Ionicons name="heart" size={16} color="#fff" />
                        </View>
                    </View>

                    {/* Contenido de la tarjeta */}
                    <View style={styles.cardContent}>
                        <View style={styles.textContainer}>
                            <Text style={styles.foodName} numberOfLines={2}>
                                {item.name}
                            </Text>
                        </View>

                        {/* Botones de acción */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.detailButton}
                                onPress={() => {
                                    navigateToFoodDetail(item);
                                }}
                            >
                                <Ionicons name="eye" size={20} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => showDeleteDialog(item.id, item.name)} // 👈 Cambiado
                            >
                                <Ionicons name="heart-dislike" size={24} color="#ff4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Fondo con gradiente fijo */}
            <LinearGradient
                colors={['#ffffffff', '#ffffff', '#ffffff']}
                style={styles.backgroundGradient}
            />

            {/* Header moderno */}

            <AppHeader
                title="Mis Favoritos"
                onBack={handleGoBack}
                showCart={false} // Opcional: si quieres mostrar el carrito
                rightContent={
                    <Text style={styles.favoritesCount}>
                        {favorites.length} {favorites.length === 1 ? 'item' : 'items'}
                    </Text>
                }
            />


            {/* Contenido principal */}
            <View style={styles.content}>
                {favorites.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="heart-outline" size={80} color="#ff8700" />
                        </View>
                        <Text style={styles.emptyTitle}>Tus favoritos están vacíos</Text>
                        <Text style={styles.emptyDescription}>
                            Descubre platos increíbles y guárdalos aquí para acceder rápidamente
                        </Text>
                        <TouchableOpacity
                            style={styles.exploreButton}
                            onPress={() => {
                                navigateToHome(); // ✅ Usar la función que definiste arriba
                                showSuccessMessage('Explorando', 'Navegando al menú principal');
                            }}
                        >
                            <Text style={styles.exploreButtonText}>Explorar Menú</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={favorites}
                        renderItem={renderFavoriteItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        numColumns={2}
                        columnWrapperStyle={styles.columnWrapper}
                    />
                )}
            </View>

            {/* 👇 Diálogo de Confirmación con React Native Paper */}
            <Portal>
                <Dialog
                    visible={dialogVisible}
                    onDismiss={cancelDelete}
                    style={styles.dialog}
                >
                    <Dialog.Icon
                        icon="alert"
                        size={40}
                        color="#ff8700"
                    />
                    <Dialog.Title style={styles.dialogTitle}>
                        Eliminar de favoritos
                    </Dialog.Title>
                    <Dialog.Content>
                        <Paragraph style={styles.dialogMessage}>
                            ¿Estás seguro de que quieres eliminar "{selectedItem?.name}" de tus favoritos?
                        </Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions style={styles.dialogActions}>
                        <Button
                            onPress={cancelDelete}
                            textColor="#666"
                            style={styles.cancelButton}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onPress={confirmDelete}
                            textColor="#ff4444"
                            style={styles.deleteButton}
                        >
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
        backgroundColor: '#000',
    },
    backgroundGradient: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },

    favoritesCount: {
        color: '#ff8700',
        fontSize: 10,
        fontWeight: '400',
    },
    content: {
        flex: 1,
        paddingTop: 120,
        paddingBottom: 100,
    },
    listContainer: {
        paddingHorizontal: 15,
        paddingBottom: 20,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    favoriteCard: {
        width: (width - 45) / 2,
        backgroundColor: 'rgba(157, 157, 157, 1)',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    cardTouchable: {
        flex: 1,
    },
    imageContainer: {
        height: 120,
        position: 'relative',
        backgroundColor: '#ff9c39ff'
    },
    foodImage: {
        width: '100%',
        height: '100%',
    },

    favoriteBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',

    },
    cardContent: {
        padding: 12,
        flex: 1,
    },
    textContainer: {
        flex: 1,
        marginBottom: 10,
    },
    foodName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
        marginBottom: 5,
        lineHeight: 18,
    },

    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailButton: {
        position: 'absolute',
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 135, 0, 0.8)',
        paddingHorizontal: 15,
        paddingVertical: 15,
        borderRadius: 25,
        flex: 1,
        marginRight: 8,
    },

    removeButton: {
        left: 90,
        padding: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 25,

    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginBottom: 100,
    },
    emptyIcon: {
        marginBottom: 25,
    },
    emptyTitle: {
        color: '#000',
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
        textAlign: 'center',
        marginBottom: 12,
    },
    emptyDescription: {
        color: '#000',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        fontFamily: 'Inter-Regular',
        marginBottom: 30,
    },
    exploreButton: {
        backgroundColor: '#ff8700',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        shadowColor: '#ff8700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    exploreButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Poppins-Bold',
    },
    // 👇 Nuevos estilos para el diálogo
    dialog: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        margin: 20,
    },
    dialogTitle: {
        textAlign: 'center',
        fontFamily: 'Poppins-Bold',
        fontSize: 20,
        color: '#333',
    },
    dialogMessage: {
        textAlign: 'center',
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: '#666',
        lineHeight: 22,
    },
    dialogActions: {
        justifyContent: 'space-between',
        paddingHorizontal: 50,
        paddingBottom: 15,
    },
    cancelButton: {
        marginRight: 10,
        backgroundColor: 'rgba(200, 200, 200, 0.3)',
    },
    deleteButton: {
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        marginLeft: 10,
    },
});

export default FavoritesScreen;