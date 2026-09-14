import { useEffect, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Animated, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { Button } from '@/ui/primitives';
import type { SavingsCelebration } from './savings-celebrations';

export function SavingCelebration({
  celebration,
  onClose,
}: {
  celebration?: SavingsCelebration;
  onClose(): void;
}) {
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!celebration) return;
    entrance.setValue(0);
    const animation = Animated.timing(entrance, { toValue: 1, duration: 280, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [celebration, entrance]);
  if (!celebration) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.panel,
              {
                opacity: entrance,
                transform: [{ scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
              },
            ]}
          >
            <Ionicons name="checkmark-circle-outline" size={46} color={colors.success} />
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
