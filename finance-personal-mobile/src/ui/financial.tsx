import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, radius, spacing, typography } from '@/theme';
import { Card } from './primitives';
import {
  budgetStatusPresentation,
  transactionPresentation,
  type BudgetVisualStatus,
  type TransactionKind,
} from './presentation';

const toneColors = {
  success: colors.success,
  danger: colors.danger,
  info: colors.info,
  warning: colors.warning,
} as const;

export function StatCard({
  label,
  value,
  supportingText,
  icon = 'wallet-outline',
  privacyHidden = false,
}: {
  label: string;
  value: number | string;
  supportingText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  privacyHidden?: boolean;
}) {
  return (
    <Card style={styles.stat}>
      <View style={styles.row}>
        <Text style={typography.label}>{label}</Text>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={typography.moneyMedium}>{formatPrivateMoney(value, 'COP', privacyHidden)}</Text>
      {supportingText && <Text style={typography.caption}>{supportingText}</Text>}
    </Card>
  );
}

export function AccountCard({
  name,
  typeLabel,
  currency,
  balance,
  active,
  privacyHidden = false,
  onPress,
}: {
  name: string;
  typeLabel: string;
  currency: string;
  balance: number;
  active: boolean;
  privacyHidden?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Cuenta ${name}`}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={[styles.account, !active && styles.inactive]}>
        <View>
          <Text style={typography.cardTitle}>{name}</Text>
          <Text style={typography.caption}>
            {typeLabel} · {currency}
            {!active ? ' · Inactiva' : ''}
          </Text>
        </View>
        <Text style={typography.moneySmall}>{formatPrivateMoney(balance, currency, privacyHidden)}</Text>
      </Card>
    </Pressable>
  );
}

export function TransactionRow({
  type,
  title,
  subtitle,
  amount,
  currency = 'COP',
  privacyHidden = false,
}: {
  type: TransactionKind;
  title: string;
  subtitle: string;
  amount: number;
  currency?: string;
  privacyHidden?: boolean;
}) {
  const presentation = transactionPresentation[type];
  return (
    <View accessibilityLabel={`${presentation.label}: ${title}`} style={styles.transaction}>
      <View style={[styles.transactionIcon, { backgroundColor: `${toneColors[presentation.tone]}1A` }]}>
        <Ionicons
          name={presentation.icon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={toneColors[presentation.tone]}
        />
      </View>
      <View style={styles.grow}>
        <Text style={typography.cardTitle}>{title}</Text>
        <Text style={typography.caption}>
          {presentation.label} · {subtitle}
        </Text>
      </View>
      <Text style={[typography.moneySmall, { color: toneColors[presentation.tone] }]}>
        {formatPrivateMoney(amount, currency, privacyHidden)}
      </Text>
    </View>
  );
}

export function BudgetProgress({
  label,
  spent,
  limit,
  remaining,
  percentage,
  status,
  privacyHidden = false,
}: {
  label: string;
  spent: number;
  limit: number;
  remaining: number;
  percentage: number;
  status: BudgetVisualStatus;
  privacyHidden?: boolean;
}) {
  const presentation = budgetStatusPresentation[status];
  const color =
    presentation.tone === 'success'
      ? colors.success
      : presentation.tone === 'warning'
        ? colors.warning
        : colors.danger;
  return (
    <Card style={styles.budget}>
      <View style={styles.row}>
        <Text style={typography.cardTitle}>{label}</Text>
        <Text style={[typography.caption, { color }]}>{presentation.label}</Text>
      </View>
      <View
        accessible
        accessibilityLabel={`${Math.round(percentage)} por ciento utilizado`}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={typography.bodySecondary}>
        {formatPrivateMoney(spent, 'COP', privacyHidden)} de {formatPrivateMoney(limit, 'COP', privacyHidden)}{' '}
        · Restante {formatPrivateMoney(remaining, 'COP', privacyHidden)}
      </Text>
    </Card>
  );
}

export function AlertCard({
  severity,
  title,
  description,
  actionLabel,
  onAction,
}: {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const color =
    severity === 'critical' ? colors.danger : severity === 'warning' ? colors.warning : colors.info;
  return (
    <View style={[styles.alert, { borderLeftColor: color }]}>
      <Ionicons
        name={severity === 'critical' ? 'alert-circle-outline' : 'information-circle-outline'}
        size={22}
        color={color}
      />
      <View style={styles.grow}>
        <Text style={typography.cardTitle}>{title}</Text>
        <Text style={typography.bodySecondary}>{description}</Text>
        {actionLabel && (
          <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction}>
            <Text style={[typography.label, { color }]}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  grow: { flex: 1, gap: spacing.xs },
  stat: { flex: 1, minWidth: 150, padding: spacing.lg, gap: spacing.sm },
  account: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inactive: { opacity: 0.62 },
  pressed: { opacity: 0.75 },
  transaction: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  budget: { padding: spacing.lg, gap: spacing.md },
  track: {
    height: 8,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  fill: { height: '100%', borderRadius: radius.pill },
  alert: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceSecondary,
  },
});
