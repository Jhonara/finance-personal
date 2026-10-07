import { Children, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type TextProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { motion } from '@/theme';
import { useReducedMotion } from './use-reduced-motion';

export function pressFeedback(pressed: boolean, reduced: boolean) {
  return {
    opacity: pressed ? motion.pressOpacity : 1,
    transform: [{ scale: pressed && !reduced ? motion.pressScale : 1 }],
  };
}

export function MotionPressable({
  style,
  feedback = true,
  ...props
}: PressableProps & { feedback?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <Pressable
      {...props}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        feedback && !props.disabled && (props.onPress || props.onLongPress)
          ? pressFeedback(state.pressed, reduced)
          : undefined,
      ]}
    />
  );
}

// Only animate the current value: no old financial text survives a period/privacy change.
function useEntrance(revision: unknown, initiallyVisible = false) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(1)).current;
  const previous = useRef(revision);
  const previousReduced = useRef(reduced);
  const mounted = useRef(false);
  useEffect(() => {
    const changed = previous.current !== revision;
    previous.current = revision;
    const enter = !initiallyVisible && (!mounted.current || (previousReduced.current && !reduced));
    previousReduced.current = reduced;
    mounted.current = true;
    if (reduced || (!changed && !enter)) {
      value.setValue(1);
      return;
    }
    value.setValue(0);
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: motion.normal,
      easing: motion.ease,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [revision, reduced, initiallyVisible, value]);
  return {
    opacity: value,
    transform: reduced
      ? []
      : [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [motion.distance, 0] }) }],
  };
}

export function MotionEntry({
  children,
  revision,
  style: layout,
}: PropsWithChildren<{ revision?: unknown; style?: StyleProp<ViewStyle> }>) {
  const style = useEntrance(revision);
  return <Animated.View style={[layout, style]}>{children}</Animated.View>;
}

export function MoneyText({ children, style, ...props }: TextProps) {
  const animatedStyle = useEntrance(Children.toArray(children).join(''), true);
  return (
    <Animated.Text {...props} style={[style, animatedStyle]}>
      {children}
    </Animated.Text>
  );
}

export function ScreenEntry({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const [focus, setFocus] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocus((value) => value + 1);
    }, []),
  );
  return (
    <MotionEntry revision={focus} style={style}>
      {children}
    </MotionEntry>
  );
}
