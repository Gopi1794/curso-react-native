import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AnimatedAuthBackground({ children, style }) {
    const b1x = useRef(new Animated.Value(0)).current;
    const b1y = useRef(new Animated.Value(0)).current;
    const b2x = useRef(new Animated.Value(0)).current;
    const b2y = useRef(new Animated.Value(0)).current;
    const b3x = useRef(new Animated.Value(0)).current;
    const b3y = useRef(new Animated.Value(0)).current;

    const drift = (val, to, dur) =>
        Animated.timing(val, {
            toValue: to,
            duration: dur,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
        });

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    drift(b1x, 25, 4000), drift(b1y, -20, 4000),
                    drift(b2x, -30, 5000), drift(b2y, 20, 5000),
                    drift(b3x, 15, 4500), drift(b3y, -25, 4500),
                ]),
                Animated.parallel([
                    drift(b1x, -15, 4500), drift(b1y, 25, 4500),
                    drift(b2x, 20, 4000), drift(b2y, -15, 4000),
                    drift(b3x, -20, 5000), drift(b3y, 15, 5000),
                ]),
                Animated.parallel([
                    drift(b1x, 10, 4000), drift(b1y, 10, 4000),
                    drift(b2x, -10, 5000), drift(b2y, -10, 5000),
                    drift(b3x, 10, 4500), drift(b3y, 10, 4500),
                ]),
                Animated.parallel([
                    drift(b1x, 0, 3500), drift(b1y, 0, 3500),
                    drift(b2x, 0, 4000), drift(b2y, 0, 4000),
                    drift(b3x, 0, 3500), drift(b3y, 0, 3500),
                ]),
            ])
        ).start();
    }, []);

    return (
        <LinearGradient
            colors={['#C2410C', '#EA580C', '#F97316']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={[styles.background, style]}
        >
            <Animated.View style={[styles.blob1, { transform: [{ translateX: b1x }, { translateY: b1y }] }]} />
            <Animated.View style={[styles.blob2, { transform: [{ translateX: b2x }, { translateY: b2y }] }]} />
            <Animated.View style={[styles.blob3, { transform: [{ translateX: b3x }, { translateY: b3y }] }]} />
            {children}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    blob1: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: '#fff',
        opacity: 0.1,
        top: -60,
        right: -60,
    },
    blob2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#fff',
        opacity: 0.07,
        bottom: 80,
        left: -50,
    },
    blob3: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#fff',
        opacity: 0.06,
        top: '40%',
        left: '30%',
    },
});
