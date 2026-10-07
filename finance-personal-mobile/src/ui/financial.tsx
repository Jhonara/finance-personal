import { Progress } from './progress';
import { MotionPressable } from '@/ui/motion';
import { accountTypeLabel } from '@/features/accounts/account-presentation';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, radius, spacing, typography } from '@/theme';
import { Card } from './primitives';
import type { AccountBalance } from '@/features/accounts/account-balances';
import { AccountBalanceAmount, accountBalanceLabel } from './account-balance';
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
  tone = 'neutral',
  privacyHidden = false,
  currency = 'COP',
  compact = false,
}: {
  label: string;
  value: number | string;
  supportingText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'primary' | 'income' | 'expense' | 'info' | 'neutral';
  privacyHidden?: boolean;
  currency?: string;
  compact?: boolean;
}) {
  const presentation = statTone[tone];
  return (
    <Card
      style={[
        styles.stat,
        compact && { paddingVertical: spacing.md, gap: spacing.xs },
        { backgroundColor: presentation.backgroundColor, borderColor: presentation.borderColor },
      ]}
    >
      <View style={styles.row}>
        <Text style={typography.label}>{label}</Text>
        <View style={[styles.statIcon, { backgroundColor: presentation.badgeColor }]}>
          <Ionicons name={icon} size={18} color={presentation.color} />
        </View>
      </View>
      <Text style={compact ? typography.moneySmall : typography.moneyMedium}>
        {formatPrivateMoney(value, currency, privacyHidden)}
      </Text>
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
  balance: number | AccountBalance;
  active: boolean;
  privacyHidden?: boolean;
  onPress?: () => void;
}) {
  const accountIcon = accountTypeIcon(typeLabel);
  const friendlyType = accountTypeLabel(typeLabel);
  const resolvedBalance: AccountBalance =
    typeof balance === 'number' ? { status: 'known', amount: balance } : balance;
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${friendlyType}, ${accountBalanceLabel(resolvedBalance, currency, privacyHidden)}`}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={[styles.account, !active && styles.inactive]}>
        <View style={styles.accountTop}>
          <View style={styles.accountLeading}>
            <View style={styles.accountIcon}>
              <Ionicons name={accountIcon} size={20} color={colors.primary} />
            </View>
            <View style={styles.accountName}>
              <Text numberOfLines={1} style={typography.cardTitle}>
                {name}
              </Text>
              <Text numberOfLines={1} style={typography.caption}>
                {friendlyType} · {currency}
                {!active ? ' · Inactiva' : ''}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
        <AccountBalanceAmount balance={resolvedBalance} currency={currency} hidden={privacyHidden} />
      </Card>
    </MotionPressable>
  );
}

export function TransactionRow({
  type,
  title,
  subtitle,
  amount,
  amountPrefix = '',
  currency = 'COP',
  privacyHidden = false,
  statusLabel,
  compact = false,
  onPress,
}: {
  type: TransactionKind;
  title: string;
  subtitle: string;
  amount?: number;
  amountPrefix?: '' | '+' | '-';
  currency?: string;
  privacyHidden?: boolean;
  statusLabel?: string;
  compact?: boolean;
  onPress?: () => void;
}) {
  const presentation = transactionPresentation[type];
  const detail =
    subtitle === presentation.label || subtitle.startsWith(`${presentation.label} · `)
      ? subtitle
      : `${presentation.label} · ${subtitle}`;
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}.`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.transaction,
        compact && styles.transactionCompact,
        pressed && styles.transactionPressed,
      ]}
    >
      <View
        style={[
          styles.transactionIcon,
          compact && styles.transactionIconCompact,
          { backgroundColor: `${toneColors[presentation.tone]}1A` },
        ]}
      >
        <Ionicons
          name={presentation.icon as keyof typeof Ionicons.glyphMap}
          size={compact ? 17 : 20}
          color={toneColors[presentation.tone]}
        />
      </View>
      <View style={styles.grow}>
        <Text numberOfLines={1} style={compact ? styles.transactionTitleCompact : typography.cardTitle}>
          {title}
        </Text>
        <Text
          numberOfLines={compact ? 1 : 2}
          style={compact ? styles.transactionCaptionCompact : typography.caption}
        >
          {detail}
        </Text>
        {statusLabel && statusLabel !== 'Registrado' ? (
          <Text style={styles.transactionStatus}>{statusLabel}</Text>
        ) : null}
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        numberOfLines={1}
        style={[
          typography.moneySmall,
          styles.transactionAmount,
          compact && styles.transactionAmountCompact,
          { color: toneColors[presentation.tone] },
        ]}
      >
        {typeof amount === 'number' && Number.isFinite(amount)
          ? privacyHidden
            ? formatPrivateMoney(amount, currency, true)
            : `${amountPrefix}${formatPrivateMoney(amount, currency, false)}`
          : 'Sin importe'}
      </Text>
    </MotionPressable>
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
      <Progress value={percentage} color={color} label={`${Math.round(percentage)} por ciento utilizado`} />
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
          <MotionPressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction}>
            <Text style={[typography.label, { color }]}>{actionLabel}</Text>
          </MotionPressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  grow: { flex: 1, gap: spacing.xs },
  stat: { flex: 1, minWidth: 150, padding: spacing.lg, gap: spacing.sm },
  statIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  account: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  inactive: { opacity: 0.62 },
  pressed: { opacity: 0.75 },
  accountTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  accountLeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  accountName: { flex: 1, gap: spacing.xs },
  accountIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  transaction: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  transactionCompact: { minHeight: 57, gap: spacing.sm, paddingVertical: spacing.sm },
  transactionPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  transactionAmount: { maxWidth: '38%' },
  transactionAmountCompact: { fontSize: 13, lineHeight: 18 },
  transactionTitleCompact: { ...typography.label, fontSize: 12, lineHeight: 16, color: colors.textPrimary },
  transactionCaptionCompact: { ...typography.caption, fontSize: 10, lineHeight: 14 },
  transactionStatus: { ...typography.caption, color: colors.warning },
  transactionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  transactionIconCompact: { width: 32, height: 32 },
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

const statTone = {
  primary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
    badgeColor: colors.surface,
    color: colors.primary,
  },
  income: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successSoft,
    badgeColor: colors.surface,
    color: colors.success,
  },
  expense: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerSoft,
    badgeColor: colors.surface,
    color: colors.danger,
  },
  info: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.infoSoft,
    badgeColor: colors.surface,
    color: colors.info,
  },
  neutral: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    badgeColor: colors.primarySoft,
    color: colors.primary,
  },
} as const;

function accountTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'CASH':
      return 'cash-outline';
    case 'BANK':
      return 'business-outline';
    case 'DIGITAL_WALLET':
      return 'phone-portrait-outline';
    case 'SAVINGS':
      return 'archive-outline';
    case 'INVESTMENT':
      return 'trending-up-outline';
    default:
      return 'wallet-outline';
  }
}
