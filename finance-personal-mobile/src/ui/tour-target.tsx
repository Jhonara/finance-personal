import { useContext, useEffect, useRef, type PropsWithChildren } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewInstance, type ViewStyle } from 'react-native';
import { TourScrollContext, useTour } from '@/features/onboarding/tour-context';
import { colors } from '@/theme';
import { useReducedMotion } from './use-reduced-motion';

export function TourTarget({
  id,
  children,
  style,
}: PropsWithChildren<{ id: string; style?: StyleProp<ViewStyle> }>) {
  const tour = useTour();
  const scroll = useContext(TourScrollContext);
  const ref = useRef<ViewInstance>(null);
  const active = tour?.activeTarget === id;
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  const report = tour?.reportTarget;
  useEffect(() => {
    if (!active) return;
    report?.(id, true);
    return () => report?.(id, false);
  }, [active, id, report]);
  useEffect(() => {
    if (!active || !scroll) return;
    const timer = setTimeout(() => {
      ref.current?.measureInWindow((_x, y) => {
        scroll.ref.current?.scrollTo({ y: Math.max(0, scroll.offset.current + y - 110), animated: false });
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [active, scroll]);
  useEffect(() => {
    if (!active || reduced) {
      pulse.stopAnimation?.();
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, pulse, reduced]);
  return (
    <View ref={ref} collapsable={false} style={style} onTouchEnd={active ? () => tour?.pause() : undefined}>
      {children}
      {active && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -5,
            bottom: -5,
            left: -5,
            right: -5,
            borderWidth: 3,
            borderColor: colors.success,
            borderRadius: 22,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) }],
          }}
        />
      )}
    </View>
  );
}
