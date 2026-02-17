import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Lottie from 'lottie-react-native';

const InstructionBanner = ({
    text,
    animationSource,
    backgroundColor = 'rgba(233, 25, 25, 0.46)',
    textColor = 'white'
}) => {
    const lottie = {
        star: require('../../assets/animations/Twinkle.json'),
    };

    return (
        <View style={[styles.instructionContainer, { backgroundColor }]}>
            <Lottie
                source={animationSource || lottie.star}
                autoPlay
                loop
                style={styles.starAnimation}
            />
            <Text style={[styles.instructionText, { color: textColor }]}>
                {text}
            </Text>
            <Lottie
                source={animationSource || lottie.star}
                autoPlay
                loop
                style={styles.starAnimation}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    instructionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 94, 0, 0.58)',
        width: '100%',
    },
    starAnimation: {
        width: 30,
        height: 30,
        marginRight: 4,
    },
    instructionText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        textAlign: 'center',
    },
});

export default InstructionBanner;