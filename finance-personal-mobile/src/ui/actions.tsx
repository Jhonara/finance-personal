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
  canTransfer = true,
}: {
  visible: boolean;
  onClose: () => void;
  onExpense: () => void;
  onIncome?: () => void;
  onTransfer?: () => void;
  canTransfer?: boolean;
}) {
  const actions: Array<{
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    tone: 'income' | 'expense' | 'info';
    onPress?: () => void;
    disabled?: boolean;
  }> = [
    {
      label: 'Gasto',
      description: 'Registra una compra o salida de dinero.',
      icon: 'arrow-up-outline',
      tone: 'expense',
      onPress: onExpense,
    },
    {
      label: 'Ingreso',
      description: 'Registra dinero que recibiste.',
      icon: 'arrow-down-outline',
      tone: 'income',
      onPress: onIncome,
    },
    {
      label: 'Transferencia',
      description: canTransfer
        ? 'Mueve dinero entre tus cuentas.'
        : 'Necesitas al menos dos cuentas de la misma moneda.',
      icon: 'swap-horizontal-outline',
      tone: 'info',
      onPress: onTransfer,
      disabled: !canTransfer,
    },
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
              disabled={action.disabled}
              onPress={action.onPress ?? onClose}
              style={({ pressed }) => [
                styles.action,
                action.disabled && styles.actionDisabled,
                pressed && styles.actionPressed,
              ]}
            >
              <View style={[styles.actionIcon, actionTone[action.tone].background]}>
                <Ionicons name={action.icon} size={22} color={actionTone[action.tone].color} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={typography.cardTitle}>{action.label}</Text>
                <Text style={typography.caption}>{action.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
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
  pressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
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
  action: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.medium,
  },
  actionPressed: { backgroundColor: colors.surfaceSecondary, transform: [{ scale: 0.98 }] },
  actionDisabled: { opacity: 0.55 },
  actionIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  actionCopy: { flex: 1, gap: spacing.xs },
});

const actionTone = {
  income: { background: { backgroundColor: colors.successSoft }, color: colors.success },
  expense: { background: { backgroundColor: colors.dangerSoft }, color: colors.danger },
  info: { background: { backgroundColor: colors.infoSoft }, color: colors.info },
} as const;
