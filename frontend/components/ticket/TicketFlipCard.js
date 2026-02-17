// components/Ticket/TicketFlipCard.js
import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import TicketFace from './TicketFace';

const TicketFlipCard = ({
    ticket,
    onFlip,
    showFront = true,
    frontImage,
    backImage,
    frontContent,
    backContent
}) => {
    const rotateX = useSharedValue(showFront ? 0 : 180);
    const isFlipped = useRef(!showFront);

    const flip = () => {
        if (isFlipped.current) {
            rotateX.value = withTiming(0, {
                duration: 600,
                easing: Easing.out(Easing.cubic)
            });
        } else {
            rotateX.value = withTiming(180, {
                duration: 600,
                easing: Easing.out(Easing.cubic)
            });
        }
        isFlipped.current = !isFlipped.current;
        onFlip?.();
    };

    const frontAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotateX: `${rotateX.value}deg` }],
        opacity: rotateX.value <= 90 ? 1 : 0,
    }));

    const backAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotateX: `${rotateX.value + 180}deg` }],
        opacity: rotateX.value > 90 ? 1 : 0,
    }));

    return (
        <TouchableOpacity onPress={flip} activeOpacity={0.9}>
            <View style={styles.flipContainer}>
                {/* FRENTE */}
                <Animated.View style={[styles.flipCard, frontAnimatedStyle]}>
                    <TicketFace
                        ticket={ticket}
                        image={frontImage}
                        type="front"
                    >
                        {frontContent}
                    </TicketFace>
                </Animated.View>

                {/* REVERSO */}
                <Animated.View style={[styles.flipCard, backAnimatedStyle]}>
                    <TicketFace
                        ticket={ticket}
                        image={backImage}
                        type="back"
                    >
                        {backContent}
                    </TicketFace>
                </Animated.View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    flipContainer: {
        width: '100%',
        height: 140,
        perspective: 1000,
    },
    flipCard: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
});

export default TicketFlipCard;