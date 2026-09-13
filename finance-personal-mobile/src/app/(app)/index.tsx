import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

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
import { dashboardGreeting } from '@/features/dashboard/dashboard-greeting';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { useOpeningBalanceExists } from '@/features/onboarding/use-opening-balance-exists';
import { useFirstOrdinaryMovementExists } from '@/features/onboarding/use-first-ordinary-movement-exists';
import { createSetupSteps, setupProgress, type SetupStepId } from '@/features/onboarding/first-run-progress';
import { firstRunStorage } from '@/features/onboarding/first-run-storage';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, spacing, typography } from '@/theme';
import { FloatingActionButton, QuickActionModal } from '@/ui/actions';
import { AccountCard, AlertCard, BudgetProgress, StatCard, TransactionRow } from '@/ui/financial';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { IconButton, Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonCard, SkeletonRow } from '@/ui/states';
import { FirstRunFabHint, FirstRunGuide } from '@/ui/first-run-guide';
import { GuidedSetupCard } from '@/ui/guided-setup-card';
import { BrandSurface } from '@/ui/brand-surface';

export default function HomeScreen() {
  const [period, setPeriod] = useState(currentDashboardPeriod);
  const [quickActions, setQuickActions] = useState(false);
  const [showFabHint, setShowFabHint] = useState(false);
  const [showGuidedSetup, setShowGuidedSetup] = useState(true);
  const greetingEntrance = useRef(new Animated.Value(0)).current;
  const summaryEntrance = useRef(new Animated.Value(0)).current;
  const flowEntrance = useRef(new Animated.Value(0)).current;
  const fabEntrance = useRef(new Animated.Value(0)).current;
  const { hidden, toggle } = usePrivacy();
  const dashboard = useDashboardMonth(period);
  const currentUser = useCurrentUser();
  const openingBalanceExists = useOpeningBalanceExists(
    Boolean(dashboard.data?.accounts?.some((account) => account.active)),
  );
  const firstOrdinaryMovement = useFirstOrdinaryMovementExists(
    Boolean(dashboard.data?.accounts?.some((account) => account.active)),
  );
  const dashboardAccounts = dashboard.data?.accounts?.filter((account) => account.active) ?? [];
  const setupSteps = createSetupSteps({
    accountCount: dashboardAccounts.length,
    budgetCount: dashboard.data?.budgets?.items?.length ?? 0,
    openingBalanceRegistered: openingBalanceExists.data ?? false,
    firstMovementRegistered: firstOrdinaryMovement.data,
    recentTransactions: dashboard.data?.recentTransactions ?? [],
  });
  const setup = setupProgress(setupSteps);
  const hasGuidedMovement = setupSteps.some((step) => step.id === 'movement' && step.completed);
  const greeting = dashboardGreeting(new Date(), currentUser.data?.name);
  useEffect(() => {
    const userId = currentUser.data?.id;
    if (!userId || !dashboard.isSuccess) return;
    if (!setup.isComplete) {
      setShowGuidedSetup(true);
      return;
    }
    void firstRunStorage.read(firstRunStorage.completionKey(userId)).then((value) => {
      setShowGuidedSetup(value !== 'done');
      if (value !== 'done') void firstRunStorage.mark(firstRunStorage.completionKey(userId));
    });
  }, [currentUser.data?.id, dashboard.isSuccess, setup.isComplete]);
  useEffect(() => {
    const userId = currentUser.data?.id;
    if (!userId || !dashboard.isSuccess || !dashboardAccounts.length || hasGuidedMovement) return;
    void firstRunStorage
      .read(firstRunStorage.hintKey(userId, 'fab'))
      .then((value) => setShowFabHint(value !== 'done'));
  }, [currentUser.data?.id, dashboard.isSuccess, dashboardAccounts.length, hasGuidedMovement]);
  useEffect(() => {
    [greetingEntrance, summaryEntrance, flowEntrance, fabEntrance].forEach((value) => value.setValue(0));
    Animated.stagger(65, [
      Animated.timing(greetingEntrance, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(summaryEntrance, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(flowEntrance, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fabEntrance, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fabEntrance, flowEntrance, greetingEntrance, period, summaryEntrance]);
  if (dashboard.isPending)
    return (
      <Screen scroll>
        <ScreenHeader title={greeting} subtitle="Tu resumen financiero" />
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
        <ScreenHeader title={greeting} subtitle="Tu resumen financiero" />
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
  const hasAccounts = accounts.length > 0;
  return (
    <Screen
      scroll
      refreshing={dashboard.isRefetching}
      onRefresh={() => void dashboard.refetch()}
      floatingAction={
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.fabAnimation,
            {
              opacity: fabEntrance,
              transform: [{ scale: fabEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
            },
          ]}
        >
          <FirstRunFabHint
            userId={currentUser.data?.id}
            visible={showFabHint}
            onDismiss={() => setShowFabHint(false)}
          />
          <FloatingActionButton
            onPress={() => {
              setShowFabHint(false);
              if (currentUser.data?.id)
                void firstRunStorage.mark(firstRunStorage.hintKey(currentUser.data.id, 'fab'));
              if (hasAccounts) setQuickActions(true);
              else router.push('/(app)/account-form');
            }}
          />
        </Animated.View>
      }
    >
      <FirstRunGuide userId={currentUser.data?.id} />
      <Animated.View style={fadeSlide(greetingEntrance, 10)}>
        <ScreenHeader
          title={greeting}
          titleNumberOfLines={2}
          subtitle="Tu resumen financiero"
          rightAction={
            <IconButton
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              accessibilityLabel={hidden ? 'Mostrar importes' : 'Ocultar importes'}
              onPress={() => void toggle()}
            />
          }
        />
      </Animated.View>
      <View style={styles.period}>
        <IconButton
          name="chevron-back"
          accessibilityLabel="Mes anterior"
          onPress={() => setPeriod((value) => shiftDashboardPeriod(value, -1))}
          tone="primary"
        />
        <Text style={typography.cardTitle}>{formatDashboardPeriod(period)}</Text>
        <IconButton
          name="chevron-forward"
          accessibilityLabel="Mes siguiente"
          onPress={() => setPeriod((value) => shiftDashboardPeriod(value, 1))}
          tone="primary"
        />
      </View>
      {showGuidedSetup ? (
        <Animated.View style={fadeSlide(summaryEntrance, 8)}>
          <GuidedSetupCard
            steps={setupSteps}
            completed={setup.completed}
            onAction={(id: SetupStepId) => {
              if (id === 'account') router.push('/(app)/account-form');
              if (id === 'openingBalance') router.push('/(app)/accounts');
              if (id === 'movement') setQuickActions(true);
              if (id === 'budget') router.push('/(app)/budget-form');
            }}
          />
        </Animated.View>
      ) : null}
      <Animated.View style={fadeSlide(summaryEntrance, 8, -8)}>
        {netWorth.map((entry) => (
          <BrandSurface key={entry.currency} style={styles.netWorthHero}>
            <Text style={styles.heroLabel}>Patrimonio neto</Text>
            <Text style={typography.moneyLarge}>
              {formatPrivateMoney(entry.amount, entry.currency, hidden)}
            </Text>
            <Text style={typography.bodySecondary}>
              {(data.netCashFlow ?? data.balance ?? 0) >= 0
                ? 'Vas construyendo una base estable este mes.'
                : 'Revisa tu flujo de este mes con calma.'}
            </Text>
          </BrandSurface>
        ))}
        <Animated.View style={fadeSlide(flowEntrance, 6, -6)}>
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
              icon="arrow-down-outline"
              tone="income"
            />
            <StatCard
              label="Gastos"
              value={data.totalExpense ?? 0}
              currency={currency}
              supportingText="Este mes"
              privacyHidden={hidden}
              icon="arrow-up-outline"
              tone="expense"
            />
            <StatCard
              label="Flujo neto"
              value={data.netCashFlow ?? data.balance ?? 0}
              currency={currency}
              supportingText="Este mes"
              privacyHidden={hidden}
              icon="swap-horizontal-outline"
              tone="info"
            />
          </View>
        </Animated.View>
        <SectionHeader
          title="Cuentas"
          actionLabel={hasAccounts ? 'Ver todas' : 'Crear cuenta'}
          onAction={() => router.push(hasAccounts ? '/(app)/accounts' : '/(app)/account-form')}
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
            title="Tu dinero empieza aquí"
            description="Agrega la cuenta donde manejas tu dinero."
            actionLabel="Agregar cuenta"
            onAction={() => router.push('/(app)/account-form')}
            tone="primary"
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
            title="Dale un límite a tus gastos"
            description="Define cuánto quieres destinar a una categoría este mes."
            actionLabel="Crear presupuesto"
            onAction={() => router.push('/(app)/budgets')}
            tone="warning"
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
          <EmptyState
            title="Tu historial empieza con un movimiento"
            description="Registra un ingreso, gasto o transferencia."
            actionLabel={hasAccounts ? 'Registrar movimiento' : 'Crear cuenta'}
            onAction={() => (hasAccounts ? setQuickActions(true) : router.push('/(app)/account-form'))}
            tone="info"
          />
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
      </Animated.View>
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
  netWorthHero: { gap: spacing.xs, marginBottom: spacing.md },
  heroLabel: { ...typography.label, color: colors.primary },
  period: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    padding: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
  },
  fabAnimation: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});

function fadeSlide(value: Animated.Value, fromY: number, fromX = 0) {
  return {
    opacity: value,
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [fromY, 0] }) },
      { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [fromX, 0] }) },
    ],
  };
}
