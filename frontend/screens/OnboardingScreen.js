// screens/OnboardingScreen.js
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Dimensions,
    StatusBar,
    Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const OnboardingScreen = ({ onFinish: onGetStarted }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef(null);

    const slides = [
        {
            id: '1',
            title: 'Descubre Comidas Increíbles',
            description: 'Explora una amplia variedad de platos deliciosos preparados especialmente para ti',
            image: require('../assets/img/onboarding/slide1.jpg'), // Crea estas imágenes
            backgroundColor: '#330000'
        },
        {
            id: '2',
            title: 'Pedido Rápido y Fácil',
            description: 'Ordena tu comida favorita en pocos taps y recíbela donde estés',
            image: require('../assets/img/onboarding/slide2.jpg'),
            backgroundColor: '#1a0000'
        },
        {
            id: '3',
            title: 'Disfruta y Comparte',
            description: 'Comparte momentos especiales con la mejor comida a tu alcance',
            image: require('../assets/img/onboarding/slide3.jpg'),

            backgroundColor: '#000000'
        }
    ];

    const viewableItemsChanged = useRef(({ viewableItems }) => {
        setCurrentIndex(viewableItems[0]?.index || 0);
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollTo = () => {
        if (currentIndex < slides.length - 1) {
            slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
        } else {
            onGetStarted();
        }
    };

    const renderItem = ({ item }) => (
        <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
            <LinearGradient
                colors={['#ebebeb34', '#000000ac']}
                style={styles.backgroundGradient}
            />

            <Image source={item.image} style={styles.image} resizeMode="contain" />
            <Image source={require("../assets/img/logoApp.png")} style={styles.logo}></Image>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        </View>
    );

    const renderDot = (_, index) => {
        const inputRange = [
            (index - 1) * screenWidth,
            index * screenWidth,
            (index + 1) * screenWidth,
        ];

        const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 20, 8],
            extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
        });

        return (
            <Animated.View
                key={index}
                style={[
                    styles.dot,
                    {
                        width: dotWidth,
                        opacity: opacity,
                    },
                ]}
            />
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <FlatList
                ref={slidesRef}
                data={slides}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                keyExtractor={(item) => item.id}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onViewableItemsChanged={viewableItemsChanged}
                viewabilityConfig={viewConfig}
                scrollEventThrottle={32}
            />

            <View style={styles.footer}>
                <View style={styles.dotsContainer}>
                    {slides.map((_, index) => renderDot(_, index))}
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={scrollTo}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>
                        {currentIndex === slides.length - 1 ? 'Comenzar' : 'Siguiente'}
                    </Text>
                </TouchableOpacity>


            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffffff',
    },
    backgroundGradient: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    slide: {
        width: screenWidth,
        height: screenHeight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 100,
        height: 100,
        zIndex: 2,
    },
    image: {
        position: 'absolute',
        objectFit: 'cover',
        width: '100%',
        height: '150%',
    },
    textContainer: {
        zIndex: 1,
        paddingTop: 200,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 16,
        fontFamily: 'Inter-Bold',
    },
    description: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        lineHeight: 24,
        fontFamily: 'Inter-Regular',
    },
    footer: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    dotsContainer: {
        flexDirection: 'row',
        marginBottom: 30,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff8000',
        marginHorizontal: 4,
    },
    button: {
        backgroundColor: '#ff8000',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#ff8000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Inter-Bold',
    },
    skipButton: {
        marginTop: 20,
        padding: 10,
    },
    skipText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
        fontFamily: 'Inter-Regular',
    },
});

export default OnboardingScreen;