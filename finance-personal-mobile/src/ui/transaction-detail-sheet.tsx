import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { PresentedTransaction } from '@/features/transactions/transaction-presentation';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, radius, shadows, spacing, typography } from '@/theme';
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
  if (!transaction) return null;
  const fields = [
    ['Tipo', transaction.typeLabel],
    [
      'Monto',
      privacyHidden
        ? '$ ••••••'
        : `${transaction.amountPrefix}${formatPrivateMoney(transaction.amount ?? 0, transaction.currency ?? 'COP', false)}`,
    ],
    ['Fecha', transaction.effectiveDate],
    ['Estado', transaction.statusLabel],
    ['Descripción', transaction.description?.trim()],
    ['Categoría', transaction.categoryName],
    ['Cuenta', transaction.accountName],
    ['Cuenta origen', transaction.sourceAccountName],
    ['Cuenta destino', transaction.destinationAccountName],
    ['Moneda', transaction.currency],
  ].filter((field): field is [string, string] => Boolean(field[1]));
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <View style={styles.icon}>
              <Ionicons name="receipt-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.grow}>
              <Text style={typography.sectionTitle}>{transaction.title}</Text>
              <Text style={typography.bodySecondary}>{transaction.subtitle}</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.fields}>
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
