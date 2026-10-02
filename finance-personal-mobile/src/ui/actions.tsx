import { useModalMotion } from './use-modal-motion';
import { MotionPressable } from '@/ui/motion';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadows, spacing, typography } from '@/theme';

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
  const insets = useSafeAreaInsets();
  const sheetMotion = useModalMotion(visible, onClose);
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
    <Modal transparent animationType="none" visible={sheetMotion.present} onRequestClose={sheetMotion.close}>
      <Animated.View style={[{ flex: 1 }, sheetMotion.overlay]}>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar acciones"
          feedback={false}
          style={styles.overlay}
          onPress={sheetMotion.close}
        >
          <Animated.View style={[{ flexShrink: 1 }, sheetMotion.sheet]}>
            <MotionPressable
              feedback={false}
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xxl) }]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.handle} />
              <Text style={typography.sectionTitle}>Registrar</Text>
              {actions.map((action) => (
                <MotionPressable
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
                </MotionPressable>
              ))}
            </MotionPressable>
          </Animated.View>
        </MotionPressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
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
