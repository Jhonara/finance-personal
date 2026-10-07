import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, type ColorValue } from 'react-native';

import { colors, motion, radius } from '@/theme';
import { useReducedMotion } from './use-reduced-motion';

export function BrandTabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  size: number;
  focused: boolean;
}) {
  const reduced = useReducedMotion();
  const entrance = useRef(new Animated.Value(1)).current;
  const previousFocus = useRef(focused);
  useEffect(() => {
    if (previousFocus.current === focused) return;
    previousFocus.current = focused;
    if (reduced) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: motion.fast,
      easing: motion.ease,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, focused, reduced]);
  return (
    <Animated.View
      style={{
        width: 36,
        height: 32,
        borderRadius: radius.small,
        backgroundColor: focused ? colors.primaryStrong : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
        transform: reduced
          ? []
          : [{ scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
      }}
    >
      <Ionicons name={name} color={focused ? colors.mint : color} size={focused ? size + 1 : size} />
    </Animated.View>
  );
}
