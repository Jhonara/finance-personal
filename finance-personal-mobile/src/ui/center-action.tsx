import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useQuickActions } from '@/features/quick-actions/quick-action-provider';
import { colors, motion, radius, typography } from '@/theme';
import { MotionPressable } from './motion';
import { useReducedMotion } from './use-reduced-motion';
import { TourTarget } from './tour-target';

export function CenterActionButton({ dark = false }: { dark?: boolean }) {
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
      <TourTarget id="new-movement">
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Registrar movimiento"
          accessibilityHint="Abre opciones de gasto, ingreso y transferencia"
          accessibilityState={{ expanded: active }}
          onPress={open}
          style={[styles.button, dark && styles.dockButton]}
        >
          <Animated.View
            style={{
              transform: reduced
                ? []
                : [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '32deg'] }) }],
            }}
          >
            <Ionicons name="add" size={28} color={colors.primaryStrong} />
          </Animated.View>
        </MotionPressable>
      </TourTarget>
      <Text pointerEvents="none" style={[styles.label, dark && { color: '#D8F8EE' }]}>
        Nuevo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dockButton: {
    width: 54,
    height: 54,
    marginTop: -12,
    borderWidth: 3,
    borderColor: '#E1FFF3',
    elevation: 10,
  },
  slot: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'flex-start' },
  button: {
    width: 48,
    height: 48,
    marginTop: -4,
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
  label: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
});
