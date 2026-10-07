import { openForm } from '@/features/forms/form-session';
import { TourTarget } from '@/ui/tour-target';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { Account } from '@/features/accounts/accounts-api';
import { balanceForAccount, totalAccountBalance } from '@/features/accounts/account-balances';
import { accountTypeLabel } from '@/features/accounts/account-presentation';
import { useAccounts } from '@/features/accounts/use-accounts';
import { currentDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { useDashboardMonth } from '@/features/dashboard/use-dashboard-month';
import { usePrivacy } from '@/privacy/privacy-provider';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { accountBalanceLabel, AccountBalanceAmount } from '@/ui/account-balance';
import { BrandMark } from '@/ui/brand-media';
import { MotionPressable } from '@/ui/motion';
import { Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';

const filters = [
  { key: 'ALL', label: 'Todas' },
  { key: 'BANK', label: 'Bancos' },
  { key: 'DIGITAL_WALLET', label: 'Billeteras' },
  { key: 'SAVINGS', label: 'Ahorros' },
  { key: 'CASH', label: 'Efectivo' },
  { key: 'INVESTMENT', label: 'Inversión' },
  { key: 'OTHER', label: 'Otras' },
] as const;
type Filter = (typeof filters)[number]['key'];
const fallbackLook = {
  icon: 'wallet-outline' as const,
  background: colors.surface,
  ink: colors.primaryStrong,
  accent: colors.primary,
};
const looks: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; background: string; ink: string; accent: string }
> = {
  BANK: { icon: 'business-outline', background: '#0D414C', ink: '#FFFFFF', accent: '#8CF7CF' },
  DIGITAL_WALLET: {
    icon: 'phone-portrait-outline',
    background: '#E4FAF3',
    ink: colors.primaryStrong,
    accent: colors.success,
  },
  SAVINGS: {
    icon: 'sparkles-outline',
    background: '#F0EBFF',
    ink: colors.primaryStrong,
    accent: colors.lavender,
  },
  INVESTMENT: {
    icon: 'trending-up-outline',
    background: '#FFF4DB',
    ink: colors.primaryStrong,
    accent: colors.warning,
  },
  CASH: { icon: 'cash-outline', background: '#E6F6FC', ink: colors.primaryStrong, accent: colors.info },
  OTHER: fallbackLook,
};

function AccountTile({
  account,
  balance,
  hidden,
}: {
  account: Account;
  balance: ReturnType<typeof balanceForAccount>;
  hidden: boolean;
}) {
  const look = looks[account.type ?? 'OTHER'] ?? fallbackLook;
  const dark = account.type === 'BANK';
  const currency = account.currency ?? 'COP';
  const name = account.name ?? 'Cuenta';
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${accountTypeLabel(account.type)}, ${accountBalanceLabel(balance, currency, hidden)}`}
      onPress={() => openForm('/(app)/account-detail', { id: String(account.id) })}
      style={[styles.accountCard, { backgroundColor: look.background }]}
    >
      <View style={styles.accountTop}>
        <View style={[styles.accountIcon, { backgroundColor: dark ? '#FFFFFF20' : '#FFFFFFB8' }]}>
          <Ionicons name={look.icon} size={23} color={look.accent} />
        </View>
        <View style={styles.accountCopy}>
          <Text numberOfLines={2} style={[styles.accountName, { color: look.ink }]}>
            {name}
          </Text>
          <Text style={[styles.accountType, { color: dark ? '#C3E5E4' : colors.textSecondary }]}>
            {accountTypeLabel(account.type)} · {currency}
            {!account.active ? ' · Inactiva' : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={21} color={look.accent} />
      </View>
      <View style={styles.accountBottom}>
        <Text style={[styles.balanceLabel, { color: dark ? '#C3E5E4' : colors.textSecondary }]}>
          SALDO REGISTRADO
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[styles.balanceValue, { color: look.ink }]}
        >
          {accountBalanceLabel(balance, currency, hidden)}
        </Text>
      </View>
    </MotionPressable>
  );
}

export default function AccountsScreen() {
  const { hidden, toggle } = usePrivacy();
  const { width, fontScale } = useWindowDimensions();
  const compactHeader = width <= 360 || fontScale >= 1.2;
  const [filter, setFilter] = useState<Filter>('ALL');
  const accounts = useAccounts();
  const dashboard = useDashboardMonth(currentDashboardPeriod());
  if (accounts.isPending)
    return (
      <Screen entry>
        <SkeletonRow />
        <SkeletonRow />
      </Screen>
    );
  if (accounts.isError)
    return (
      <Screen entry>
        <ErrorState onRetry={() => void accounts.refetch()} />
      </Screen>
    );
  const active = accounts.data.filter((account) => account.active);
  const inactive = accounts.data.filter((account) => !account.active);
  const visible = filter === 'ALL' ? active : active.filter((account) => account.type === filter);
  const currencies = Array.from(new Set(active.map((account) => account.currency ?? 'COP')));
  const transferReady = active.some((account) =>
    active.some((other) => account.id !== other.id && account.currency === other.currency),
  );
  return (
    <Screen entry scroll refreshing={accounts.isRefetching} onRefresh={() => void accounts.refetch()}>
      <View style={styles.header}>
        <BrandMark size={36} />
        <View style={styles.headerCopy}>
          {!compactHeader ? <Text style={styles.eyebrow}>TUS FINANZAS</Text> : null}
          <Text accessibilityRole="header" style={styles.title}>
            {compactHeader ? 'Cuentas' : 'Mis cuentas'}
          </Text>
        </View>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Mostrar saldos' : 'Ocultar saldos'}
          onPress={() => void toggle()}
          style={styles.privacy}
        >
          <Ionicons
            name={hidden ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.primaryStrong}
          />
        </MotionPressable>
        <TourTarget id="add-account">
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Agregar cuenta"
            onPress={() => openForm('/(app)/account-form')}
            style={[styles.add, compactHeader && styles.addCompact]}
          >
            <Ionicons name="add" size={20} color={colors.surface} />
            {!compactHeader ? <Text style={styles.addText}>Añadir</Text> : null}
          </MotionPressable>
        </TourTarget>
      </View>
      {active.length ? (
        <LinearGradient colors={[colors.heroStart, colors.heroEnd]} style={styles.overview}>
          <Text style={styles.overviewEyebrow}>TU DINERO POR MONEDA</Text>
          <Text style={styles.overviewTitle}>
            {active.length} {active.length === 1 ? 'cuenta activa' : 'cuentas activas'}
          </Text>
          <Text style={styles.overviewHint}>
            Saldos calculados con tus movimientos. Cada moneda se muestra por separado.
          </Text>
          <View style={styles.currencyList}>
            {currencies.map((currency) => (
              <View key={currency} style={styles.currencyRow}>
                <Text style={styles.currencyCode}>{currency}</Text>
                <AccountBalanceAmount
                  balance={totalAccountBalance(
                    active
                      .filter((account) => (account.currency ?? 'COP') === currency)
                      .map((account) => balanceForAccount(dashboard, account.id)),
                  )}
                  currency={currency}
                  hidden={hidden}
                  style={styles.currencyValue}
                />
              </View>
            ))}
          </View>
        </LinearGradient>
      ) : null}
      {active.length ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {filters
              .filter(({ key }) => key === 'ALL' || active.some((account) => account.type === key))
              .map(({ key, label }) => {
                const count =
                  key === 'ALL' ? active.length : active.filter((account) => account.type === key).length;
                return (
                  <MotionPressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filter === key }}
                    onPress={() => setFilter(key)}
                    style={[styles.filter, filter === key && styles.filterActive]}
                  >
                    <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
                      {label} ({count})
                    </Text>
                  </MotionPressable>
                );
              })}
          </ScrollView>
          <View style={styles.sectionHeading}>
            <Text accessibilityRole="header" style={typography.sectionTitle}>
              {filter === 'ALL' ? 'Tus cuentas' : filters.find((item) => item.key === filter)?.label}
            </Text>
            <Text style={typography.caption}>
              {visible.length} {visible.length === 1 ? 'activa' : 'activas'}
            </Text>
          </View>
          <View style={styles.list}>
            {visible.map((account) => (
              <AccountTile
                key={account.id}
                account={account}
                balance={balanceForAccount(dashboard, account.id)}
                hidden={hidden}
              />
            ))}
          </View>
        </>
      ) : (
        <EmptyState
          title="Tu dinero empieza aquí"
          description="Crea una cuenta para registrar ingresos, gastos y transferencias."
          actionLabel="Agregar cuenta"
          onAction={() => openForm('/(app)/account-form')}
          tone="primary"
        />
      )}
      {active.length ? (
        <View style={styles.management}>
          <Text accessibilityRole="header" style={typography.sectionTitle}>
            Gestiona tu dinero
          </Text>
          {transferReady ? (
            <MotionPressable
              accessibilityRole="button"
              onPress={() => openForm('/(app)/new-transfer')}
              style={styles.managementRow}
            >
              <View style={[styles.managementIcon, { backgroundColor: colors.infoSoft }]}>
                <Ionicons name="swap-horizontal-outline" size={21} color={colors.info} />
              </View>
              <View style={styles.managementCopy}>
                <Text style={typography.cardTitle}>Transferir entre cuentas</Text>
                <Text style={typography.caption}>Mueve dinero entre cuentas de la misma moneda.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </MotionPressable>
          ) : null}
          <MotionPressable
            accessibilityRole="button"
            onPress={() => openForm('/(app)/account-form')}
            style={styles.managementRow}
          >
            <View style={[styles.managementIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="add" size={21} color={colors.success} />
            </View>
            <View style={styles.managementCopy}>
              <Text style={typography.cardTitle}>Agregar otra cuenta</Text>
              <Text style={typography.caption}>Banco, billetera, efectivo, ahorro o inversión.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </MotionPressable>
        </View>
      ) : null}
      {inactive.length ? (
        <View style={styles.inactiveSection}>
          <Text accessibilityRole="header" style={typography.sectionTitle}>
            Cuentas inactivas
          </Text>
          <Text style={typography.caption}>Puedes reactivarlas desde su detalle.</Text>
          {inactive.map((account) => (
            <AccountTile
              key={account.id}
              account={account}
              balance={balanceForAccount(dashboard, account.id)}
              hidden={hidden}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
  headerCopy: { flex: 1 },
  eyebrow: {
    ...typography.caption,
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  title: { ...typography.sectionTitle, color: colors.primaryStrong },
  privacy: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryStrong,
    ...shadows.card,
  },
  addCompact: { width: 40, justifyContent: 'center', paddingHorizontal: 0 },
  addText: { ...typography.label, color: colors.surface },
  overview: { gap: spacing.sm, padding: spacing.xl, borderRadius: 28, ...shadows.card },
  overviewEyebrow: { ...typography.caption, color: '#A7E7D9', fontWeight: '700', letterSpacing: 0.5 },
  overviewTitle: { ...typography.sectionTitle, color: colors.surface },
  overviewHint: { ...typography.caption, color: '#C3E5E4' },
  currencyList: { gap: spacing.sm, marginTop: spacing.sm },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  currencyCode: { ...typography.label, color: colors.success },
  currencyValue: { ...typography.moneySmall, color: colors.primaryStrong, flexShrink: 1 },
  filters: { gap: spacing.sm, paddingVertical: spacing.xs },
  filter: {
    minHeight: 39,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
  filterText: { ...typography.caption, color: colors.primaryStrong, fontWeight: '700' },
  filterTextActive: { color: colors.surface },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  list: { gap: spacing.md },
  accountCard: { gap: spacing.lg, borderRadius: 24, padding: spacing.lg, ...shadows.card },
  accountTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCopy: { flex: 1, gap: spacing.xxs },
  accountName: { ...typography.cardTitle },
  accountType: { ...typography.caption },
  accountBottom: { gap: spacing.xs },
  balanceLabel: { ...typography.caption, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  balanceValue: { ...typography.moneyMedium },
  management: { gap: spacing.md },
  managementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  managementIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementCopy: { flex: 1, gap: spacing.xxs },
  inactiveSection: { gap: spacing.md },
});
