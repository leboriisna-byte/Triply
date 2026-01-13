import React, { useEffect } from 'react';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { ViewStyle, StyleProp } from 'react-native';
import { AnimationTokens } from '../../lib/animations';

interface AnimatedEntryProps {
    children: React.ReactNode;
    index?: number; // For staggering
    delay?: number; // Base delay
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
    style?: StyleProp<ViewStyle>;
    offset?: number;
}

export const AnimatedEntry: React.FC<AnimatedEntryProps> = ({
    children,
    index = 0,
    delay = 0,
    direction = 'up',
    style,
    offset = 30
}) => {
    const opacity = useSharedValue(0);
    const translate = useSharedValue(offset);

    useEffect(() => {
        const stagger = index * 80;
        const totalDelay = delay + stagger;

        opacity.value = withDelay(totalDelay, withTiming(1, { duration: AnimationTokens.fast }));

        if (direction !== 'none') {
            translate.value = withDelay(totalDelay, withSpring(0, AnimationTokens.spring.default));
        }
    }, [index, delay, direction]);

    const animatedStyle = useAnimatedStyle(() => {
        const transform = [];

        switch (direction) {
            case 'up':
                transform.push({ translateY: translate.value });
                break;
            case 'down':
                transform.push({ translateY: -translate.value }); // Start higher
                break;
            case 'left':
                transform.push({ translateX: translate.value });
                break;
            case 'right':
                transform.push({ translateX: -translate.value });
                break;
        }

        return {
            opacity: opacity.value,
            transform
        };
    });

    return (
        <Reanimated.View style={[style, animatedStyle]}>
            {children}
        </Reanimated.View>
    );
};
