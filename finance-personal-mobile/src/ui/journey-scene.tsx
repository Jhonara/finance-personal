import { useEffect, type PropsWithChildren } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from './use-reduced-motion';

/** One current chapter, without retaining an outgoing screen or running an idle loop. */
export function JourneyScene({ children, revision }: PropsWithChildren<{ revision: string }>) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(progress);
    progress.value = reduced ? 1 : 0;
    if (!reduced) progress.value = withTiming(1, { duration: 180 });
    return () => cancelAnimation(progress);
  }, [revision, reduced, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reduced ? 0 : (1 - progress.value) * 8 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
