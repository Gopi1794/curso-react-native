import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const THUMB_SIZE = 52;
const THUMB_MARGIN = 4;

export default function SlideToConfirm({ label, color = '#2E7D32', onConfirm, loading = false, disabled = false }) {
    const [trackWidth, setTrackWidth] = useState(0);
    const translateX = useSharedValue(0);
    const maxTranslate = Math.max(trackWidth - THUMB_SIZE - THUMB_MARGIN * 2, 0);
    const locked = loading || disabled;

    const triggerConfirm = () => {
        onConfirm?.();
    };

    const pan = Gesture.Pan()
        .enabled(!locked && trackWidth > 0)
        .onChange((e) => {
            const next = translateX.value + e.changeX;
            translateX.value = Math.min(Math.max(next, 0), maxTranslate);
        })
        .onEnd(() => {
            if (maxTranslate > 0 && translateX.value > maxTranslate * 0.85) {
                translateX.value = withSpring(maxTranslate);
                runOnJS(triggerConfirm)();
            } else {
                translateX.value = withSpring(0);
            }
        });

    const thumbStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const fillStyle = useAnimatedStyle(() => ({
        width: translateX.value + THUMB_SIZE + THUMB_MARGIN,
    }));

    return (
        <View
            style={[styles.track, { backgroundColor: `${color}1A` }, locked && styles.trackDisabled]}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
            <Animated.View style={[styles.fill, fillStyle, { backgroundColor: `${color}33` }]} pointerEvents="none" />
            <Text style={[styles.label, { color }]} pointerEvents="none">{label}</Text>
            <GestureDetector gesture={pan}>
                <Animated.View style={[styles.thumb, thumbStyle, { backgroundColor: color }]}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Ionicons name="chevron-forward" size={22} color="#fff" />
                    )}
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    track: {
        height: 60, borderRadius: 30, justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
    },
    trackDisabled: { opacity: 0.6 },
    fill: {
        position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 30,
    },
    label: {
        textAlign: 'center', fontFamily: 'Poppins-Bold', fontSize: 14,
    },
    thumb: {
        position: 'absolute', left: THUMB_MARGIN, top: THUMB_MARGIN,
        width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2,
        alignItems: 'center', justifyContent: 'center',
    },
});
