import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  currentDashboardPeriod,
  formatDashboardPeriod,
  shiftDashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import {
  alertPresentation,
  budgetCurrency,
  currencyEntries,
  toBudget,
  toTransaction,
} from '@/features/dashboard/dashboard-adapter';
import { useDashboardMonth } from '@/features/dashboard/use-dashboard-month';
import { usePrivacy } from '@/privacy/privacy-provider';
import { colors, spacing, typography } from '@/theme';
import { FloatingActionButton, QuickActionModal } from '@/ui/actions';
import { AccountCard, AlertCard, BudgetProgress, StatCard, TransactionRow } from '@/ui/financial';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { IconButton, Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonCard, SkeletonRow } from '@/ui/states';

export default function HomeScreen() {
  const [period, setPeriod] = useState(currentDashboardPeriod);
  const [quickActions, setQuickActions] = useState(false);
  const { hidden, toggle } = usePrivacy();
  const dashboard = useDashboardMonth(period);
  if (dashboard.isPending)
    return (
      <Screen scroll>
        <ScreenHeader title="Buen día" subtitle={formatDashboardPeriod(period)} />
        <SkeletonCard />
        <View style={styles.stats}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
        <SectionHeader title="Cuentas" />
        <SkeletonRow />
        <SkeletonRow />
      </Screen>
    );
  if (dashboard.isError)
    return (
      <Screen>
        <ScreenHeader title="Buen día" subtitle={formatDashboardPeriod(period)} />
        <ErrorState onRetry={() => void dashboard.refetch()} />
      </Screen>
    );
  const data = dashboard.data;
  const accounts = (data.accounts ?? []).filter((account) => account.active);
  const currency = budgetCurrency(data);
  const netWorth = currencyEntries(data.netWorthByCurrency);
  const assets = currencyEntries(data.assetsByCurrency);
  const liabilities = currencyEntries(data.liabilitiesByCurrency);
  const budgets = data.budgets?.items ?? [];
  const recent = data.recentTransactions ?? [];
  return (
    <Screen scroll refreshing={dashboard.isRefetching} onRefresh={() => void dashboard.refetch()}>
      <ScreenHeader
        title="Buen día"
        subtitle="Tu resumen financiero"
        rightAction={
          <IconButton
            name={hidden ? 'eye-off-outline' : 'eye-outline'}
            accessibilityLabel={hidden ? 'Mostrar importes' : 'Ocultar importes'}
            onPress={() => void toggle()}
          />
        }
      />
      <View style={styles.period}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          onPress={() => setPeriod((value) => shiftDashboardPeriod(value, -1))}
        >
          <Text style={styles.periodAction}>‹</Text>
        </Pressable>
        <Text style={typography.cardTitle}>{formatDashboardPeriod(period)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          onPress={() => setPeriod((value) => shiftDashboardPeriod(value, 1))}
        >
          <Text style={styles.periodAction}>›</Text>
        </Pressable>
      </View>
      {netWorth.map((entry) => (
        <StatCard
          key={entry.currency}
          label="Patrimonio neto"
          value={entry.amount}
          currency={entry.currency}
          supportingText={`Patrimonio en ${entry.currency}`}
          privacyHidden={hidden}
        />
      ))}
      <View style={styles.stats}>
        {assets.map((entry) => (
          <StatCard
            key={`assets-${entry.currency}`}
            label="Activos"
            value={entry.amount}
            currency={entry.currency}
            supportingText={entry.currency}
            privacyHidden={hidden}
          />
        ))}
        {liabilities.map((entry) => (
          <StatCard
            key={`liabilities-${entry.currency}`}
            label="Pasivos"
            value={entry.amount}
            currency={entry.currency}
            supportingText={entry.currency}
            privacyHidden={hidden}
          />
        ))}
      </View>
      <View style={styles.stats}>
        <StatCard
          label="Ingresos"
          value={data.totalIncome ?? 0}
          currency={currency}
          supportingText="Este mes"
          privacyHidden={hidden}
        />
        <StatCard
          label="Gastos"
          value={data.totalExpense ?? 0}
          currency={currency}
          supportingText="Este mes"
          privacyHidden={hidden}
        />
        <StatCard
          label="Flujo neto"
          value={data.netCashFlow ?? data.balance ?? 0}
          currency={currency}
          supportingText="Este mes"
          privacyHidden={hidden}
        />
      </View>
      <SectionHeader
        title="Cuentas"
        actionLabel="Ver todas"
        onAction={() => router.push('/(app)/accounts')}
      />
      {accounts.length ? (
        <View style={styles.list}>
          {accounts.slice(0, 3).map((account) => (
            <AccountCard
              key={account.id}
              name={account.name ?? 'Cuenta'}
              typeLabel={account.type ?? 'Cuenta'}
              currency={account.currency ?? currency}
              balance={account.balance ?? 0}
              active
              privacyHidden={hidden}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          title="Aún no tienes cuentas"
          description="Crea tu primera cuenta para empezar a organizar tu dinero."
          actionLabel="Ir a cuentas"
          onAction={() => router.push('/(app)/accounts')}
        />
      )}
      <SectionHeader
        title="Presupuesto mensual"
        actionLabel="Ver detalle"
        onAction={() => router.push('/(app)/budgets')}
      />
      {budgets.length ? (
        <View style={styles.list}>
          {budgets.slice(0, 2).map((budget) => (
            <BudgetProgress key={budget.id} {...toBudget(budget)} privacyHidden={hidden} />
          ))}
        </View>
      ) : (
        <EmptyState
          title="Sin presupuestos"
          description="Define un presupuesto para controlar mejor tus gastos."
          actionLabel="Ver presupuestos"
          onAction={() => router.push('/(app)/budgets')}
        />
      )}
      <SectionHeader
        title="Movimientos recientes"
        actionLabel="Ver todos"
        onAction={() => router.push('/(app)/transactions')}
      />
      {recent.length ? (
        <View style={styles.list}>
          {recent.map((transaction) => (
            <TransactionRow
              key={transaction.transactionId}
              {...toTransaction(transaction)}
              privacyHidden={hidden}
            />
          ))}
        </View>
      ) : (
        <EmptyState title="Sin movimientos" description="Aún no tienes movimientos registrados." />
      )}
      {data.alerts?.filter((alert) => alert.code !== 'ALL_GOOD').length ? (
        <>
          <SectionHeader title="Atención" />
          <View style={styles.list}>
            {data.alerts
              .filter((alert) => alert.code !== 'ALL_GOOD')
              .map((alert, index) => (
                <AlertCard key={`${alert.code}-${index}`} {...alertPresentation(alert)} />
              ))}
          </View>
        </>
      ) : null}
      <FloatingActionButton onPress={() => setQuickActions(true)} />
      <QuickActionModal
        visible={quickActions}
        onClose={() => setQuickActions(false)}
        onExpense={() => {
          setQuickActions(false);
          router.push('/(app)/new-expense');
        }}
        onIncome={() => {
          setQuickActions(false);
          router.push('/(app)/new-income');
        }}
        onTransfer={() => {
          setQuickActions(false);
          router.push('/(app)/new-transfer');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  list: { gap: spacing.sm },
  period: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  periodAction: { ...typography.screenTitle, color: colors.primary, paddingHorizontal: spacing.lg },
});
