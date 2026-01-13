import React from 'react';
import { Pressable, StyleProp, ViewStyle, PressableProps } from 'react-native';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { AnimationTokens } from '../../lib/animations';

const AnimatedPressableComponent = Reanimated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends PressableProps {
    style?: StyleProp<ViewStyle>;
    scaleOnPress?: number;
    activeOpacity?: number;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
    children,
    style,
    scaleOnPress = 0.96,
    activeOpacity = 0.8,
    ...props
}) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handlePressIn = (e: any) => {
        scale.value = withSpring(scaleOnPress, { ...AnimationTokens.spring.stiff, mass: 0.5 });
        opacity.value = withTiming(activeOpacity, { duration: 100 });
        props.onPressIn?.(e);
    };

    const handlePressOut = (e: any) => {
        scale.value = withSpring(1, AnimationTokens.spring.default);
        opacity.value = withTiming(1, { duration: 150 });
        props.onPressOut?.(e);
    };

    return (
        <AnimatedPressableComponent
            {...props}
            style={[style, animatedStyle]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            {children}
        </AnimatedPressableComponent>
    );
};
