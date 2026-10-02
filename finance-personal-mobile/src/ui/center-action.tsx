import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useQuickActions } from '@/features/quick-actions/quick-action-provider';
import { colors, motion, radius, sizes } from '@/theme';
import { MotionPressable } from './motion';
import { useReducedMotion } from './use-reduced-motion';

export function CenterActionButton() {
  const { open, active } = useQuickActions();
  const reduced = useReducedMotion();
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const target = active ? 1 : 0;
    if (reduced) {
      rotation.setValue(target);
      return;
    }
    const animation = Animated.timing(rotation, {
      toValue: target,
      duration: motion.normal,
      easing: motion.ease,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, reduced, rotation]);
  return (
    <View style={styles.slot}>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel="Registrar movimiento"
        accessibilityHint="Abre opciones de gasto, ingreso y transferencia"
        accessibilityState={{ expanded: active }}
        onPress={open}
        style={styles.button}
      >
        <Animated.View
          style={{
            transform: reduced
              ? []
              : [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '32deg'] }) }],
          }}
        >
          <Ionicons name="add" size={30} color={colors.primaryStrong} />
        </Animated.View>
      </MotionPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1, minHeight: sizes.tabBar, alignItems: 'center', justifyContent: 'flex-start' },
  button: {
    width: sizes.fab,
    height: sizes.fab,
    marginTop: -12,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondary,
    shadowOpacity: 0.24,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
});
