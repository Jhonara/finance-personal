import { useReducedMotion } from '@/ui/use-reduced-motion';
import { useEffect, useRef } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, motion, radius, spacing, typography } from '@/theme';
import { Button } from '@/ui/primitives';
import { FinancialCompanion } from '@/ui/brand-identity';
import type { SavingsCelebration } from './savings-celebrations';

export function SavingCelebration({
  celebration,
  onClose,
}: {
  celebration?: SavingsCelebration;
  onClose(): void;
}) {
  const reduced = useReducedMotion();
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!celebration) return;
    if (reduced) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: motion.normal,
      easing: motion.ease,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [celebration, entrance, reduced]);
  if (!celebration) return null;
  return (
    <Modal visible transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.panel,
              {
                opacity: entrance,
                transform: reduced
                  ? []
                  : [
                      {
                        scale: entrance.interpolate({
                          inputRange: [0, 1],
                          outputRange: [motion.pressScale, 1],
                        }),
                      },
                    ],
              },
            ]}
          >
            <FinancialCompanion state="celebrate" size={58} />
            <Text accessibilityLiveRegion="polite" accessibilityRole="header" style={typography.screenTitle}>
              {celebration.title}
            </Text>
            <Text style={typography.body}>{celebration.message}</Text>
            {celebration.badges?.length ? (
              <View style={styles.badges}>
                {celebration.badges.map((badge) => (
                  <Text key={badge} style={styles.badge}>
                    {badge}
                  </Text>
                ))}
              </View>
            ) : null}
            <Button onPress={onClose}>Continuar</Button>
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(32,45,50,0.38)' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  panel: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.large,
    backgroundColor: colors.successSoft,
  },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  badge: {
    ...typography.label,
    color: colors.primary,
    backgroundColor: colors.accentSoft,
    padding: spacing.sm,
    borderRadius: radius.pill,
  },
});
