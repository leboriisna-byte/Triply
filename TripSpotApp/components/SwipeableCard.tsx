import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import Reanimated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
    interpolate,
    Extrapolation
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { GeneratedSpot } from '../../lib/gemini';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SwipeableCardProps {
    spot: GeneratedSpot;
    onSwipe: (action: 'like' | 'pass') => void;
}

export interface SwipeableCardRef {
    swipe: (direction: 'left' | 'right') => void;
}

export const SwipeableCard = forwardRef<SwipeableCardRef, SwipeableCardProps>(({ spot, onSwipe }, ref) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const context = useSharedValue({ x: 0, y: 0 });

    // Reset position when spot changes (recycling logic)
    useEffect(() => {
        translateX.value = 0;
        translateY.value = 0;
    }, [spot]);

    useImperativeHandle(ref, () => ({
        swipe: (direction) => {
            const destination = direction === 'right' ? 500 : -500;
            translateX.value = withSpring(destination, { damping: 20, stiffness: 90, mass: 1 }, () => {
                runOnJS(onSwipe)(direction === 'right' ? 'like' : 'pass');
            });
        }
    }));

    const pan = Gesture.Pan()
        .onStart(() => {
            context.value = { x: translateX.value, y: translateY.value };
        })
        .onUpdate((event) => {
            translateX.value = event.translationX + context.value.x;
            translateY.value = event.translationY + context.value.y;
        })
        .onEnd(() => {
            if (translateX.value > 120) {
                // Like
                translateX.value = withSpring(500, { velocity: 5 }, () => {
                    runOnJS(onSwipe)('like');
                });
            } else if (translateX.value < -120) {
                // Pass
                translateX.value = withSpring(-500, { velocity: 5 }, () => {
                    runOnJS(onSwipe)('pass');
                });
            } else {
                // Return to center
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => {
        const rotate = interpolate(
            translateX.value,
            [-200, 0, 200],
            [-10, 0, 10],
            Extrapolation.CLAMP
        );

        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotate: `${rotate}deg` }
            ],
            // Fade out opacity significantly as it moves further away
            opacity: interpolate(
                Math.abs(translateX.value),
                [0, SCREEN_WIDTH / 2],
                [1, 0.8]
            )
        };
    });

    // Overlay opacity logic
    const likeOpacityStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, 100], [0, 1], Extrapolation.CLAMP)
    }));

    const passOpacityStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, -100], [0, 1], Extrapolation.CLAMP)
    }));

    return (
        <GestureDetector gesture={pan}>
            <Reanimated.View style={[styles.card, animatedStyle]}>
                <Image
                    source={{ uri: spot.imageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' }}
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* LIKE Overlay */}
                <Reanimated.View style={[styles.overlayLabel, { left: 40, transform: [{ rotate: '-30deg' }], borderColor: '#3ED598' }, likeOpacityStyle]}>
                    <Text style={[styles.overlayText, { color: '#3ED598' }]}>LIKE</Text>
                </Reanimated.View>

                {/* NOPE Overlay */}
                <Reanimated.View style={[styles.overlayLabel, { right: 40, transform: [{ rotate: '30deg' }], borderColor: '#FF5864' }, passOpacityStyle]}>
                    <Text style={[styles.overlayText, { color: '#FF5864' }]}>NOPE</Text>
                </Reanimated.View>

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                >
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={[styles.category, { color: '#3ED598', borderColor: '#3ED598' }]}>
                                {spot.category.toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.title}>{spot.name}</Text>
                        <Text style={styles.description} numberOfLines={3}>
                            {spot.description}
                        </Text>
                    </View>
                </LinearGradient>
            </Reanimated.View>
        </GestureDetector>
    );
});

const styles = StyleSheet.create({
    card: {
        width: SCREEN_WIDTH - 40,
        height: SCREEN_HEIGHT * 0.66,
        borderRadius: 24,
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingTop: 60,
    },
    category: {
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
        fontSize: 12,
        fontWeight: '600'
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 24,
    },
    overlayLabel: {
        position: 'absolute',
        top: 50,
        borderWidth: 4,
        borderRadius: 10,
        padding: 8,
        zIndex: 100
    },
    overlayText: {
        fontSize: 32,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    }
});
