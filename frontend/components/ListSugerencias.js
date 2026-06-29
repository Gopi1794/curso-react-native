import React, { useRef, useCallback, useMemo, useState } from "react";
import {
    View, Text, Image, StyleSheet,
    FlatList, Dimensions, TouchableOpacity, Animated,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { imageMap } from '../assets/utils/imageMap';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH  = screenWidth - 32;
const CARD_HEIGHT = 165;
const LEFT_W      = CARD_WIDTH * 0.50;   // ~50 % izquierda

const toImageSource = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return { uri: val };
    if (val.uri) return { uri: val.uri };
    return null;
};

/* Decoración: tres rayitas diagonales violeta tipo "destello" */
const SparkleLines = () => (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.stroke, { top: 28, left: 14, height: 18, opacity: 0.75 }]} />
        <View style={[styles.stroke, { top: 48, left: 24, height: 12, opacity: 0.45 }]} />
        <View style={[styles.stroke, { top: 36, left:  6, height:  9, opacity: 0.30 }]} />
    </View>
);

const SugerenciaCard = React.memo(({ item, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const pressIn  = useCallback(() => Animated.spring(scaleAnim, { toValue: 0.97, tension: 120, friction: 6, useNativeDriver: true }).start(), []);
    const pressOut = useCallback(() => Animated.spring(scaleAnim, { toValue: 1,    tension: 50,  friction: 4, useNativeDriver: true }).start(), []);

    const name        = (item.name        || '').toUpperCase();
    const subtitle    = item.descriptionText || item.price || '';

    return (
        <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={onPress}
                onPressIn={pressIn}
                onPressOut={pressOut}
                style={styles.card}
            >
                {/* ════ PANEL IZQUIERDO – violeta con curva ════ */}
                <LinearGradient
                    colors={['#8B6BBF', '#7B5EA7', '#6A4E96']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.leftPanel}
                >
                    {/* Badge pill */}
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Sugerencia</Text>
                    </View>

                    {/* Subtítulo */}
                    <Text style={styles.subtitle} numberOfLines={1}>
                        Plato del día
                    </Text>

                    {/* Nombre grande */}
                    <Text style={styles.foodName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
                        {name}
                    </Text>

                    {/* Línea naranja */}
                    <View style={styles.accentLine} />

                    {/* Descripción / precio */}
                    <Text style={styles.descText} numberOfLines={2}>
                        {subtitle}
                    </Text>
                </LinearGradient>

                {/* ════ PANEL DERECHO – crema con imagen ════ */}
                <View style={styles.rightPanel}>
                    {/* Rayitas decorativas */}
                    <SparkleLines />

                    {/* Imagen del plato — sobresale arriba */}
                    {item.image && (
                        <Image
                            source={item.image}
                            style={styles.foodImage}
                            resizeMode="contain"
                        />
                    )}

                    {/* Botón flecha naranja diagonal ↗ */}
                    <View style={styles.arrowBtn}>
                        <View style={{ transform: [{ rotate: '-45deg' }] }}>
                            <Ionicons name="arrow-forward" size={19} color="#fff" />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

/* ─── Claves de los 3 platos sugeridos ─── */
const SUGERENCIA_KEYS = ['imgBurger5', 'imgEmplatado4', 'imgHelado9'];

export const ListSugerencias = ({ navigation, menuItems = [] }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef(null);
    const ITEM_STRIDE = CARD_WIDTH + 14;

    const sugerenciasData = useMemo(() => {
        return SUGERENCIA_KEYS
            .map(key => {
                const item = menuItems.find(m => {
                    const k = Array.isArray(m.imageKey) ? m.imageKey[0] : m.imageKey;
                    return k === key;
                });
                if (!item) return null;
                return { ...item, image: toImageSource(imageMap[key]) };
            })
            .filter(Boolean);
    }, [menuItems]);

    const handlePress = useCallback((foodItem) => {
        navigation?.navigate('FoodDetail', { foodItem });
    }, [navigation]);

    const handleScroll = useCallback((e) => {
        setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / ITEM_STRIDE));
    }, [ITEM_STRIDE]);

    const getItemLayout = useCallback((_, index) => ({
        length: ITEM_STRIDE,
        offset: ITEM_STRIDE * index,
        index,
    }), [ITEM_STRIDE]);

    const handleDotPress = useCallback((index) => {
        flatListRef.current?.scrollToOffset({ offset: ITEM_STRIDE * index, animated: true });
        setActiveIndex(index);
    }, [ITEM_STRIDE]);

    const renderItem = useCallback(({ item }) => (
        <SugerenciaCard item={item} onPress={() => handlePress(item)} />
    ), [handlePress]);

    if (!sugerenciasData.length) return null;

    return (
        <View style={styles.section}>
            {/* Encabezado */}
            <View style={styles.header}>
                <Text style={styles.sectionTitle}>SUGERENCIAS</Text>
                <View style={styles.dots}>
                    {sugerenciasData.map((_, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={() => handleDotPress(i)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Sugerencia ${i + 1}`}
                        >
                            <View style={[styles.dot, activeIndex === i && styles.dotActive]} />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={sugerenciasData}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listPad}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={ITEM_STRIDE}
                snapToAlignment="start"
                getItemLayout={getItemLayout}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        minHeight: CARD_HEIGHT + 52,
    },

    /* Encabezado */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
        color: '#ff8700',
    },
    dots: { flexDirection: 'row', gap: 7 },
    dot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#E0E0E0',
    },
    dotActive: {
        width: 20, backgroundColor: '#ff8700',
    },

    /* Lista */
    listPad: { paddingHorizontal: 16 },

    /* Card wrapper — sombra aquí para que no recorte */
    cardWrapper: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        marginRight: 14,
        borderRadius: 24,
        shadowColor: '#4A3470',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
        elevation: 8,
    },

    /* Card interior */
    card: {
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#F5EFE6',   // fallback crema visible antes de que renderice
    },

    /* ── Panel izquierdo violeta ── */
    leftPanel: {
        width: LEFT_W + 30,           // un poco más ancho para que la curva no corte el texto
        height: '100%',
        borderTopRightRadius: 110,
        borderBottomRightRadius: 110,
        paddingLeft: 20,
        paddingRight: 36,             // padding extra por la curva
        paddingVertical: 18,
        justifyContent: 'center',
        zIndex: 2,
    },

    badge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginBottom: 6,
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'Poppins-SemiBold',
    },

    subtitle: {
        color: 'rgba(255,255,255,0.68)',
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
        marginBottom: 3,
    },

    foodName: {
        color: '#fff',
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        lineHeight: 24,
        letterSpacing: 0.3,
        marginBottom: 7,
    },

    accentLine: {
        width: 30,
        height: 3,
        backgroundColor: '#ff8700',
        borderRadius: 2,
        marginBottom: 7,
    },

    descText: {
        color: 'rgba(255,255,255,0.80)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        lineHeight: 16,
    },

    /* ── Panel derecho crema ── */
    rightPanel: {
        flex: 1,
        backgroundColor: '#F5EFE6',
        overflow: 'visible',          // imagen puede salir un poco
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },

    foodImage: {
        width: '110%',
        height: '115%',               // crece un toque para efecto de "desborde"
        marginTop: -10,
    },

    /* Rayitas decorativas tipo destello */
    stroke: {
        position: 'absolute',
        width: 3,
        borderRadius: 2,
        backgroundColor: '#9B7EC8',
        transform: [{ rotate: '15deg' }],
    },

    /* Botón naranja ↗ */
    arrowBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ff8700',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#ff8700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 6,
    },
});

export default ListSugerencias;
