import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMascot } from '@/ui/brand-media';
import { colors, motion, radius, shadows, spacing, typography } from '@/theme';
import { MotionPressable } from '@/ui/motion';
import { useReducedMotion } from '@/ui/use-reduced-motion';
import { useModalMotion } from './use-modal-motion';

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
  const { height, width, fontScale } = useWindowDimensions();
  const compact = width / fontScale < 280;
  const reducedMotion = useReducedMotion();
  const sheetMotion = useModalMotion(visible, onClose);
  const rowEntrance = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  useEffect(() => {
    if (!visible) return;
    rowEntrance.forEach((value) => value.setValue(reducedMotion ? 1 : 0));
    if (reducedMotion) return;
    const animation = Animated.stagger(
      45,
      rowEntrance.map((value) =>
        Animated.timing(value, { toValue: 1, duration: motion.normal, useNativeDriver: true }),
      ),
    );
    animation.start();
    return () => animation.stop();
  }, [visible, reducedMotion, rowEntrance]);
  const actions: Array<{
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    badge: string;
    tone: 'income' | 'expense' | 'info';
    onPress?: () => void;
    disabled?: boolean;
  }> = [
    {
      label: 'Registrar gasto',
      description: 'Una compra, servicio o salida de dinero.',
      icon: 'bag-handle-outline',
      badge: 'SALIDA',
      tone: 'expense',
      onPress: onExpense,
    },
    {
      label: 'Registrar ingreso',
      description: 'Sueldo, pago o dinero que recibiste.',
      icon: 'trending-up-outline',
      badge: 'ENTRADA',
      tone: 'income',
      onPress: onIncome,
    },
    {
      label: 'Transferir entre cuentas',
      description: canTransfer
        ? 'Mueve dinero entre tus cuentas.'
        : 'Necesitas dos cuentas de la misma moneda.',
      icon: 'swap-horizontal-outline',
      badge: 'TRASPASO',
      tone: 'info',
      onPress: onTransfer,
      disabled: !canTransfer,
    },
  ];
  return (
    <Modal transparent animationType="none" visible={sheetMotion.present} onRequestClose={sheetMotion.close}>
      <Animated.View style={[styles.full, sheetMotion.overlay]}>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar acciones"
          feedback={false}
          style={styles.overlay}
          onPress={sheetMotion.close}
        >
          <Animated.View style={[sheetMotion.sheet, { maxHeight: height - insets.top - spacing.lg }]}>
            <MotionPressable
              feedback={false}
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.handle} />
              <View style={styles.header}>
                <View style={styles.companion}>
                  <BrandMascot size={54} />
                </View>
                <View style={styles.headerCopy}>
                  <Text style={styles.eyebrow}>REGISTRO RÁPIDO</Text>
                  <Text accessibilityRole="header" style={styles.title}>
                    ¿Qué quieres registrar?
                  </Text>
                  <Text style={styles.subtitle}>Elige una opción para empezar.</Text>
                </View>
                <MotionPressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  onPress={sheetMotion.close}
                  style={styles.close}
                >
                  <Ionicons name="close" size={20} color={colors.primaryStrong} />
                </MotionPressable>
              </View>
              <ScrollView contentContainerStyle={styles.actions} showsVerticalScrollIndicator={false}>
                {actions.map((action, index) => (
                  <Animated.View
                    key={action.label}
                    style={{
                      opacity: rowEntrance[index],
                      transform: reducedMotion
                        ? []
                        : [
                            {
                              translateY: rowEntrance[index]!.interpolate({
                                inputRange: [0, 1],
                                outputRange: [8, 0],
                              }),
                            },
                          ],
                    }}
                  >
                    <MotionPressable
                      accessibilityRole="button"
                      accessibilityLabel={action.label}
                      accessibilityState={{ disabled: Boolean(action.disabled) }}
                      disabled={action.disabled}
                      onPress={action.onPress ?? onClose}
                      style={({ pressed }) => [
                        styles.action,
                        { backgroundColor: actionTone[action.tone].surface },
                        action.disabled && styles.actionDisabled,
                        pressed && styles.actionPressed,
                      ]}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: actionTone[action.tone].icon }]}>
                        <Ionicons name={action.icon} size={23} color={actionTone[action.tone].ink} />
                      </View>
                      <View style={styles.actionCopy}>
                        <View style={styles.actionTitleRow}>
                          <Text
                            numberOfLines={compact ? 2 : 1}
                            style={[styles.actionTitle, compact && styles.actionTitleCompact]}
                          >
                            {action.label}
                          </Text>
                          {!compact ? (
                            <Text style={[styles.badge, { color: actionTone[action.tone].ink }]}>
                              {action.badge}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={styles.actionDescription}>{action.description}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={actionTone[action.tone].ink} />
                    </MotionPressable>
                  </Animated.View>
                ))}
              </ScrollView>
            </MotionPressable>
          </Animated.View>
        </MotionPressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.surface,
    ...shadows.bottomSheet,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  companion: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: spacing.xxs },
  eyebrow: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
    color: colors.success,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: { ...typography.sectionTitle, fontSize: 18, lineHeight: 23 },
  subtitle: { ...typography.caption, lineHeight: 16 },
  close: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { gap: spacing.sm },
  action: {
    minHeight: 79,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.medium,
  },
  actionPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  actionDisabled: { opacity: 0.52 },
  actionIcon: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  actionCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  actionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionTitle: { ...typography.cardTitle, fontSize: 14, lineHeight: 19, flexShrink: 1 },
  actionTitleCompact: { fontSize: 13, lineHeight: 18 },
  actionDescription: { ...typography.caption, fontSize: 11, lineHeight: 15 },
  badge: { ...typography.caption, fontSize: 8, lineHeight: 12, fontWeight: '700' },
});

const actionTone = {
  income: { surface: '#E9FAF2', icon: '#C9F8E3', ink: colors.success },
  expense: { surface: '#FFF0EF', icon: '#FFE0DC', ink: colors.danger },
  info: { surface: '#EAF7FC', icon: '#D4EFF9', ink: colors.info },
} as const;
