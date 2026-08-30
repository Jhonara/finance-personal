import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';

export function FloatingActionButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Nuevo movimiento"
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Ionicons name="add" color={colors.surface} size={28} />
    </Pressable>
  );
}

export function QuickActionModal({
  visible,
  onClose,
  onExpense,
  onIncome,
  onTransfer,
}: {
  visible: boolean;
  onClose: () => void;
  onExpense: () => void;
  onIncome?: () => void;
  onTransfer?: () => void;
}) {
  const actions: Array<{ label: string; icon: keyof typeof Ionicons.glyphMap; onPress?: () => void }> = [
    { label: 'Gasto', icon: 'arrow-up-outline', onPress: onExpense },
    { label: 'Ingreso', icon: 'arrow-down-outline', onPress: onIncome },
    { label: 'Transferencia', icon: 'swap-horizontal-outline', onPress: onTransfer },
  ];
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar acciones"
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={typography.sectionTitle}>Nuevo movimiento</Text>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={action.onPress ?? onClose}
              style={styles.action}
            >
              <Ionicons name={action.icon} size={22} color={colors.primary} />
              <Text style={typography.body}>{action.label}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: sizes.fab,
    height: sizes.fab,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
  pressed: { opacity: 0.82 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(30,42,49,0.28)' },
  sheet: {
    gap: spacing.md,
    padding: spacing.xxl,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    backgroundColor: colors.surface,
    ...shadows.bottomSheet,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  action: { minHeight: sizes.touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
