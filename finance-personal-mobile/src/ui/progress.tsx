import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, motion, radius } from '@/theme';

export function Progress({
  value,
  color = colors.primary,
  label = 'Progreso',
  animated = true,
}: {
  value: number;
  color?: string;
  label?: string;
  animated?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const progress = useRef(new Animated.Value(clamped)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: clamped,
      duration: animated ? motion.slow : 0,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [clamped, progress, animated]);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={styles.track}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  track: {
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    overflow: 'hidden',
    width: '100%',
  },
  fill: { height: '100%', borderRadius: radius.pill },
});
