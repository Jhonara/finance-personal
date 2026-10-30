import React from 'react';
import { vi } from 'vitest';

export const withTiming = vi.fn((value: number) => value);
export const cancelAnimation = vi.fn();
export const Easing = { out: (value: unknown) => value, cubic: 'cubic' };
export const ReduceMotion = { System: 'system' };
export const useSharedValue = (value: number) => React.useRef({ value }).current;
export const useAnimatedProps = (factory: () => object) => factory();
export default {
  createAnimatedComponent: (Component: React.ComponentType<object>) =>
    function AnimatedComponent({ animatedProps, ...props }: { animatedProps?: object }) {
      return <Component {...props} {...animatedProps} />;
    },
};
