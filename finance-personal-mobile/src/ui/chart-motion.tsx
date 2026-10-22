import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Circle, Path, Rect, type CircleProps, type PathProps, type RectProps } from 'react-native-svg';
import { useReducedMotion } from './use-reduced-motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Only geometry moves. Labels always show the actual amount from the report.
export function useChartReveal(revision: string, enabled = true) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(1);
  useFocusEffect(
    useCallback(() => {
      cancelAnimation(progress);
      if (reduced || !enabled) {
        progress.value = 1;
        return;
      }
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
      return () => {
        cancelAnimation(progress);
        progress.value = 1;
      };
    }, [progress, reduced, revision, enabled]),
  );
  return progress;
}

export function GrowingArc({
  progress,
  length,
  start,
  circumference,
  ...props
}: CircleProps & { progress: SharedValue<number>; length: number; start: number; circumference: number }) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: [length * progress.value, circumference],
    strokeDashoffset: -start * progress.value,
  }));
  return <AnimatedCircle {...props} animatedProps={animatedProps} />;
}

export function GrowingBar({
  progress,
  zero,
  targetY,
  targetHeight,
  ...props
}: RectProps & { progress: SharedValue<number>; zero: number; targetY: number; targetHeight: number }) {
  const animatedProps = useAnimatedProps(() => ({
    y: zero + (targetY - zero) * progress.value,
    height: targetHeight * progress.value,
  }));
  return <AnimatedRect {...props} animatedProps={animatedProps} />;
}

export function DrawingLine({
  progress,
  length,
  ...props
}: PathProps & { progress: SharedValue<number>; length: number }) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: [length, length],
    strokeDashoffset: length * (1 - progress.value),
  }));
  return <AnimatedPath {...props} animatedProps={animatedProps} />;
}
