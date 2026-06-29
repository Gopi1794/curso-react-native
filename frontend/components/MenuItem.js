import React, { memo } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { ActionButton } from '../components/ActionButton';
import Lottie from 'lottie-react-native';
import { imageMap } from '../assets/utils/imageMap';

const lottie = {
    conffeti: require('../assets/animations/fire.json'),
};

const MenuItem = memo(({ item, onAddToCart }) => {
    const getImageSource = (key) => {
        const imageKey = Array.isArray(key) ? key[0] : key;
        const src = imageMap[imageKey];
        if (!src) return null;
        // src puede ser string "https://..." o ya un objeto { uri: "..." }
        if (typeof src === 'string') return { uri: src };
        if (src.uri) return { uri: src.uri };
        return null;
    };

    return (
        <View style={[styles.menuItemContainer, { width: 105, height: 131 }]}>
            <View style={styles.menuItem}>
                <View
                    style={[
                        styles.foodCard,
                        {
                            height: 131,
                            top: 50,
                            width: 105,
                        }
                    ]}
                />

                {getImageSource(item.imageKey) && (
                    <Image
                        source={getImageSource(item.imageKey)}
                        style={[
                            styles.foodImage,
                            {
                                width: 99,
                                height: 99,
                            }
                        ]}
                        resizeMode="cover"
                    />
                )}

                {item.imageKey === "imgBurger6" && (
                    <Lottie
                        source={lottie.conffeti}
                        autoPlay
                        loop
                        style={{
                            zIndex: -1,
                            position: 'absolute',
                            bottom: 130,
                            left: 3,
                            width: 100,
                            height: 80,
                            pointerEvents: 'none',
                        }}
                    />
                )}

                <Text style={[styles.foodTitle, { top: 102 }]}>
                    {item.name}
                </Text>

                <Text style={[styles.foodPrice, { color: '#ff8700', top: 137 }]}>
                    {item.price}
                </Text>

                <ActionButton
                    onPress={() => onAddToCart(item.id)}
                    size="medium"
                    variant="default"
                    accessibilityLabel={`Ver producto: ${item.name}`}
                    style={[
                        styles.addButton,
                        {
                            top: 164,
                            // Modifica según necesites:
                            top: 160,
                            right: 10,
                            bottom: 10,
                            left: 23,
                        }
                    ]} />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    menuItemContainer: {
        marginRight: 22,
        marginTop: 15,
    },
    menuItem: {
        flex: 1,
    },
    foodCard: {
        position: 'absolute',
        backgroundColor: 'rgba(217, 217, 217, 1)',
        borderRadius: 25,
        left: 0,
        shadowColor: '#FF8000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
    },
    foodImage: {
        position: 'absolute',
        top: 0,
        left: 3,
    },
    foodTitle: {
        position: 'absolute',
        fontWeight: 'bold',
        color: 'gray',
        fontSize: 10,
        textAlign: 'center',
        width: '100%',
        paddingHorizontal: 2.8,
        left: 0,
    },
    foodPrice: {
        position: 'absolute',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
        width: '100%',
        left: 0,
    },
    addButton: {
        position: 'absolute',
        left: '50%',
    },
});

export default MenuItem;