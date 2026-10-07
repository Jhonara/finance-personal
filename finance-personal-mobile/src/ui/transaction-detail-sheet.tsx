import { formatLocalDate } from '@/utils/local-date';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { PresentedTransaction } from '@/features/transactions/transaction-presentation';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { transactionPresentation } from './presentation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionPressable } from './motion';
import { useModalMotion } from './use-modal-motion';

export function TransactionDetailSheet({
  transaction,
  privacyHidden,
  onClose,
}: {
  transaction?: PresentedTransaction;
  privacyHidden: boolean;
  onClose(): void;
}) {
  const insets = useSafeAreaInsets();
  const sheetMotion = useModalMotion(Boolean(transaction), onClose);
  if (!transaction) return null;
  const presentation =
    Object.entries(transactionPresentation).find(([type]) => type === transaction.type)?.[1] ??
    transactionPresentation.REVERSAL;
  const tone = colors[presentation.tone];
  const amountAvailable = typeof transaction.amount === 'number' && Number.isFinite(transaction.amount);
  const fields = [
    ['Estado', transaction.statusLabel],
    ['Descripción', transaction.description?.trim()],
    ['Categoría', transaction.categoryName],
    ['Cuenta origen', transaction.sourceAccountName],
    ['Cuenta destino', transaction.destinationAccountName],
  ].filter((field): field is [string, string] => Boolean(field[1]));
  return (
    <Modal transparent visible={sheetMotion.present} animationType="none" onRequestClose={sheetMotion.close}>
      <Animated.View style={[{ flex: 1 }, sheetMotion.overlay]}>
        <Pressable style={styles.overlay} onPress={sheetMotion.close}>
          <Animated.View style={[{ flexShrink: 1 }, sheetMotion.sheet]}>
            <Pressable
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.handle} />
              <View style={styles.titleRow}>
                <View style={[styles.icon, { backgroundColor: `${tone}1A` }]}>
                  <Ionicons
                    name={presentation.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={tone}
                  />
                </View>
                <View style={styles.grow}>
                  <Text style={typography.sectionTitle}>{transaction.title}</Text>
                  {transaction.title !== transaction.typeLabel ? (
                    <Text style={styles.typeLabel}>{transaction.typeLabel}</Text>
                  ) : null}
                </View>
                <MotionPressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar detalle"
                  onPress={sheetMotion.close}
                  style={styles.close}
                >
                  <Ionicons name="close" size={19} color={colors.primaryStrong} />
                </MotionPressable>
              </View>
              <ScrollView contentContainerStyle={styles.fields}>
                <View style={[styles.amountCard, { backgroundColor: `${tone}14` }]}>
                  <Text style={styles.amountLabel}>IMPORTE</Text>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    numberOfLines={1}
                    style={[styles.amount, { color: tone }]}
                  >
                    {!amountAvailable
                      ? 'Sin importe'
                      : privacyHidden
                        ? formatPrivateMoney(transaction.amount!, transaction.currency ?? 'COP', true)
                        : transaction.amountPrefix +
                          formatPrivateMoney(transaction.amount!, transaction.currency ?? 'COP', false)}
                  </Text>
                  <Text style={styles.amountContext}>
                    {[transaction.accountName, transaction.currency].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={18} color={colors.info} />
                  <Text style={styles.dateText}>{formatLocalDate(transaction.effectiveDate)}</Text>
                </View>
                {fields.map(([label, value]) => (
                  <View key={label} style={styles.field}>
                    <Text style={typography.caption}>{label}</Text>
                    <Text style={typography.body}>{value}</Text>
                  </View>
                ))}
                {transaction.type === 'REVERSAL' && transaction.reversalOfId ? (
                  <Text style={styles.reversal}>Revierte una operación anterior</Text>
                ) : null}
              </ScrollView>
              <MotionPressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar detalle"
                onPress={sheetMotion.close}
                style={styles.done}
              >
                <Text style={styles.doneText}>Listo</Text>
              </MotionPressable>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '82%',
    gap: spacing.md,
    padding: spacing.xl,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.surfaceElevated,
    ...shadows.bottomSheet,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  grow: { flex: 1, gap: spacing.xxs },
  typeLabel: { ...typography.caption, color: colors.success, fontWeight: '700' },
  close: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fields: { gap: spacing.sm },
  amountCard: { gap: spacing.xs, padding: spacing.lg, borderRadius: radius.large },
  amountLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  amount: { ...typography.moneyLarge, fontSize: 26, lineHeight: 34 },
  amountContext: { ...typography.caption, color: colors.textSecondary },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  dateText: { ...typography.bodySecondary, color: colors.primaryStrong },
  field: {
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  reversal: { ...typography.bodySecondary, color: colors.info, paddingTop: spacing.sm },
  done: {
    minHeight: 45,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { ...typography.label, color: colors.primaryStrong, fontWeight: '700' },
});
