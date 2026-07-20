import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

const BlurredBlob = ({ size, color, opacity, id }) => (
    <Svg width={size} height={size}>
        <Defs>
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
                <Stop offset="60%" stopColor={color} stopOpacity={opacity * 0.5} />
                <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
);

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
            colors={['#ffffff', '#fff8f0', '#ffffff']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={[styles.background, style]}
        >
            <Animated.View style={[styles.blob1, { transform: [{ translateX: b1x }, { translateY: b1y }] }]}>
                <BlurredBlob id="blob1Grad" size={300} color="#FF8000" opacity={0.5} />
            </Animated.View>
            <Animated.View style={[styles.blob2, { transform: [{ translateX: b2x }, { translateY: b2y }] }]}>
                <BlurredBlob id="blob2Grad" size={240} color="#F97316" opacity={0.45} />
            </Animated.View>
            <Animated.View style={[styles.blob3, { transform: [{ translateX: b3x }, { translateY: b3y }] }]}>
                <BlurredBlob id="blob3Grad" size={190} color="#EA580C" opacity={0.4} />
            </Animated.View>
            {children}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    blob1: {
        position: 'absolute',
        width: 300,
        height: 300,
        top: -60,
        right: -60,
    },
    blob2: {
        position: 'absolute',
        width: 240,
        height: 240,
        bottom: 80,
        left: -50,
    },
    blob3: {
        position: 'absolute',
        width: 190,
        height: 190,
        top: '40%',
        left: '30%',
    },
});
