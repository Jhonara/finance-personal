import { formatLocalDate } from '@/utils/local-date';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { PresentedTransaction } from '@/features/transactions/transaction-presentation';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { transactionPresentation } from './presentation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './primitives';

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
  if (!transaction) return null;
  const presentation =
    Object.entries(transactionPresentation).find(([type]) => type === transaction.type)?.[1] ??
    transactionPresentation.REVERSAL;
  const tone = colors[presentation.tone];
  const fields = [
    ['Estado', transaction.statusLabel],
    ['Descripción', transaction.description?.trim()],
    ['Categoría', transaction.categoryName],
    ['Cuenta origen', transaction.sourceAccountName],
    ['Cuenta destino', transaction.destinationAccountName],
  ].filter((field): field is [string, string] => Boolean(field[1]));
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <View style={[styles.icon, { backgroundColor: `${tone}1A` }]}>
              <Ionicons name={presentation.icon as keyof typeof Ionicons.glyphMap} size={22} color={tone} />
            </View>
            <View style={styles.grow}>
              <Text style={typography.sectionTitle}>{transaction.title}</Text>
              {transaction.title !== transaction.typeLabel ? (
                <Text style={typography.caption}>{transaction.typeLabel}</Text>
              ) : null}
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.fields}>
            <Text style={[typography.moneyMedium, { color: tone }]}>
              {privacyHidden
                ? '$ ••••••'
                : transaction.amountPrefix +
                  formatPrivateMoney(transaction.amount ?? 0, transaction.currency ?? 'COP', false)}
            </Text>
            <Text style={typography.bodySecondary}>
              {[transaction.accountName, transaction.currency].filter(Boolean).join(' · ')}
            </Text>
            <Text style={typography.bodySecondary}>{formatLocalDate(transaction.effectiveDate)}</Text>
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
          <Button variant="ghost" onPress={onClose}>
            Cerrar
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(32,45,50,0.32)' },
  sheet: {
    maxHeight: '82%',
    gap: spacing.md,
    padding: spacing.xl,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
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
  fields: { gap: spacing.sm },
  field: {
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  reversal: { ...typography.bodySecondary, color: colors.info, paddingTop: spacing.sm },
});
