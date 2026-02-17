import React, { useState, useRef, useCallback } from "react";
import { View, Text, Image, StyleSheet, FlatList, Dimensions } from "react-native";
import { ActionButton } from './ActionButton';

const { width: screenWidth } = Dimensions.get('window');

// Importa solo las imágenes de las sugerencias
const imgSugerencia1 = require("../assets/img/sugerencias/sugerencia-1.webp");
const imgSugerencia2 = require("../assets/img/sugerencias/sugerencia-2.webp");
const imgSugerencia3 = require("../assets/img/sugerencias/sugerencia-3.webp");

// Componente memoizado para cada sugerencia
const SugerenciaItem = React.memo(({ sugerencia, onAddSugerencia }) => {
    return (
        <View style={styles.sugerenciaItemContainer}>
            <View style={styles.sugerenciaItemInner}>
                {/* Imagen */}
                <Image
                    style={styles.sugerenciaImage}
                    source={sugerencia.image}
                    resizeMode="cover"
                />

                {/* Card de texto */}
                <View style={styles.sugerenciaCard}>
                    {sugerencia.title.includes("\n") ? (
                        <Text style={styles.sugerenciaText}>
                            {sugerencia.title.split("\n")[0] + "\n" + sugerencia.title.split("\n")[1]}
                        </Text>
                    ) : (
                        <Text style={styles.sugerenciaText}>{sugerencia.title}</Text>
                    )}
                </View>

                {/* Botón reutilizable */}
                <ActionButton
                    onPress={() => onAddSugerencia(sugerencia.id)}
                    size="medium"
                    variant="suggestion"
                    accessibilityLabel={`Agregar ${sugerencia.title} al carrito`}
                    style={styles.sugerenciaButton}
                />
            </View>
        </View>
    );
});

export const ListSugerencias = () => {
    const flatListRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const handleAddSugerencia = useCallback((id) => {
        console.log(`Agregando sugerencia ${id} al carrito`);
    }, []);

    const handleScroll = useCallback((event) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / (screenWidth - 40));
        setActiveIndex(index);
    }, []);

    const renderSugerencia = useCallback(({ item }) => (
        <SugerenciaItem sugerencia={item} onAddSugerencia={handleAddSugerencia} />
    ), [handleAddSugerencia]);

    const sugerenciasData = [
        {
            id: 1,
            title: "HOTCAKE CON FRUTILLAS Y MIEL",
            image: imgSugerencia1,
        },
        {
            id: 2,
            title: "BURRITOS VEGANOS X2",
            image: imgSugerencia2,
        },
        {
            id: 3,
            title: "TACOS DE CARNE\nX2",
            image: imgSugerencia3,
        },
    ];

    return (
        <View style={styles.sugerenciasSection}>
            <View style={styles.sugerenciasHeader}>
                <Text style={styles.sugerenciasTitle}>SUGERENCIAS</Text>
                <View style={styles.sugerenciasIndicators}>
                    {sugerenciasData.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                activeIndex === index && styles.indicatorActive
                            ]}
                        />
                    ))}
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={sugerenciasData}
                renderItem={renderSugerencia}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={screenWidth - 40}
                snapToAlignment="start"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    sugerenciasSection: {
        position: 'relative',
        backgroundColor: 'transparent',
        height: 180,
    },
    sugerenciasHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
        marginBottom: 15,
    },
    sugerenciasTitle: {
        fontFamily: 'Inter-Bold',
        fontWeight: 'bold',
        color: '#ff8000',
        fontSize: 16,
    },
    sugerenciasIndicators: {
        flexDirection: 'row',
        gap: 10,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 50,
        backgroundColor: '#E0E0E0',
    },
    indicatorActive: {
        backgroundColor: '#ff8700',
        borderColor: '#ffff',
        borderWidth: 2,
        width: 16,
    },
    scrollView: {
        height: 140,
    },
    scrollViewContent: {
        paddingHorizontal: 10,
    },
    sugerenciaItemContainer: {
        width: screenWidth - 50,
        height: 120,
        marginRight: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sugerenciaItemInner: {
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    sugerenciaImage: {
        position: 'absolute',
        width: 120,
        height: 120,
        zIndex: 1,
    },
    sugerenciaCard: {
        flex: 1,
        height: 80,
        backgroundColor: 'rgba(217, 217, 217, 1)',
        borderRadius: 20,
        marginLeft: 80,
        marginRight: 30,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    sugerenciaText: {
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.25)',
        fontFamily: 'Inter-Bold',
        fontWeight: 'bold',
        color: 'gray',
        fontSize: 14,
        margin: 19,
        lineHeight: 20,
    },
    sugerenciaButton: {
        position: 'absolute',
        right: 10,
        top: '60%',
        marginTop: -25,
    },
});

export default ListSugerencias;