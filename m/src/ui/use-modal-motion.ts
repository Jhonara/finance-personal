import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { motion } from '@/theme';
import { useReducedMotion } from './use-reduced-motion';

export function useModalMotion(visible: boolean, onClose: () => void) {
  const reduced = useReducedMotion();
  const [present, setPresent] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const closing = useRef(false);
  const transition = useCallback(
    (toValue: number, done?: () => void) => {
      running.current?.stop();
      if (reduced) {
        progress.setValue(toValue);
        done?.();
        return;
      }
      const animation = Animated.timing(progress, {
        toValue,
        duration: motion.normal,
        easing: motion.ease,
        useNativeDriver: true,
      });
      running.current = animation;
      animation.start(({ finished }) => {
        if (finished) done?.();
      });
    },
    [progress, reduced],
  );
  useEffect(() => {
    closing.current = false;
    if (visible) {
      setPresent(true);
      progress.setValue(reduced ? 1 : 0);
      transition(1);
    } else transition(0, () => setPresent(false));
    return () => running.current?.stop();
  }, [visible, transition, progress, reduced]);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    transition(0, () => {
      setPresent(false);
      onClose();
    });
  }, [transition, onClose]);
  return {
    present: visible || present,
    close,
    overlay: { opacity: progress },
    sheet: {
      transform: reduced
        ? []
        : [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [motion.sheetDistance, 0],
              }),
            },
          ],
    },
  };
}
