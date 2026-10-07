import { useEffect } from 'react';
import { Image, type ImageStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/ui/use-reduced-motion';
import homeMark from '../../../assets/brand/mark-home.png';
import homeKobo from '../../../assets/brand/kobo-home.png';

export function HomeBrandMark({ size = 36 }: { size?: number }) {
  return (
    <Image
      accessible={false}
      source={homeMark}
      resizeMode="contain"
      style={{ width: size, height: size } satisfies ImageStyle}
    />
  );
}

export function HomeCompanion({ size = 72 }: { size?: number }) {
  const reducedMotion = useReducedMotion();
  const float = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(float);
    if (reducedMotion) {
      float.value = 0;
      return;
    }
    float.value = withRepeat(withTiming(-4, { duration: 1800, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(float);
  }, [float, reducedMotion]);
  const floatingStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  return (
    <Animated.Image
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      source={homeKobo}
      resizeMode="contain"
      style={[{ width: size, height: size }, floatingStyle]}
    />
  );
}
