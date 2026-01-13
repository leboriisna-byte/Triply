import { Easing, WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

export const AnimationTokens = {
    // Timing variants
    micro: 150, // 120-180ms for tap feedback
    fast: 300,  // 250-350ms for component transitions
    medium: 500, // 400-600ms for significant changes
    slow: 700, // Screen transitions

    // Easing curves
    easing: {
        default: Easing.bezier(0.25, 0.1, 0.25, 1),
        out: Easing.out(Easing.cubic),
        inOut: Easing.inOut(Easing.cubic),
    },

    // Spring configurations
    spring: {
        default: {
            damping: 15,
            stiffness: 120,
            mass: 1,
        } as WithSpringConfig,
        bouncy: {
            damping: 12,
            stiffness: 150,
            mass: 1,
        } as WithSpringConfig,
        stiff: {
            damping: 20,
            stiffness: 200,
            mass: 1,
        } as WithSpringConfig,
    }
};
