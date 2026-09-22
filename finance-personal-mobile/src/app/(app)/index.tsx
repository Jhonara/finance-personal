import { openForm } from '@/features/forms/form-session';
import { HomeMetrics } from '@/features/dashboard/home-metrics';
import { HomeModules } from '@/features/dashboard/home-modules';
import { useReducedMotion } from '@/ui/use-reduced-motion';
import { FinancialProgressSection } from '@/features/progress/progress-signal';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import {
  currentDashboardPeriod,
  formatDashboardPeriod,
  shiftDashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { budgetCurrency, currencyEntries, toTransaction } from '@/features/dashboard/dashboard-adapter';
import { useDashboardMonth } from '@/features/dashboard/use-dashboard-month';
import { dashboardGreeting } from '@/features/dashboard/dashboard-greeting';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { useOpeningBalanceExists } from '@/features/onboarding/use-opening-balance-exists';
import { useFirstOrdinaryMovementExists } from '@/features/onboarding/use-first-ordinary-movement-exists';
import { createSetupSteps, setupProgress, type SetupStepId } from '@/features/onboarding/first-run-progress';
import { firstRunStorage } from '@/features/onboarding/first-run-storage';
import { useGuidedSetupVisibility } from '@/features/onboarding/use-guided-setup-visibility';
import { useFeedback } from '@/feedback/feedback-provider';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, spacing, typography } from '@/theme';
import { FloatingActionButton, QuickActionModal } from '@/ui/actions';
import { AccountCard, TransactionRow } from '@/ui/financial';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { IconButton, Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonCard, SkeletonRow } from '@/ui/states';
import { FirstRunFabHint, FirstRunGuide } from '@/ui/first-run-guide';
import { GuidedSetupCard } from '@/ui/guided-setup-card';
import { BrandSurface } from '@/ui/brand-surface';

export default function HomeScreen() {
  const reducedMotion = useReducedMotion();
  const [period, setPeriod] = useState(currentDashboardPeriod);
  const [quickActions, setQuickActions] = useState(false);
  const [showFabHint, setShowFabHint] = useState(false);
  const greetingEntrance = useRef(new Animated.Value(0)).current;
  const summaryEntrance = useRef(new Animated.Value(0)).current;
  const flowEntrance = useRef(new Animated.Value(0)).current;
  const fabEntrance = useRef(new Animated.Value(0)).current;
  const { hidden, toggle } = usePrivacy();
  const dashboard = useDashboardMonth(period);
  const currentUser = useCurrentUser();
  const guidedSetup = useGuidedSetupVisibility(currentUser.data?.id);
  const feedback = useFeedback();
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
    if (!userId || !dashboard.isSuccess || !dashboardAccounts.length || hasGuidedMovement) return;
    void firstRunStorage
      .read(firstRunStorage.hintKey(userId, 'fab'))
      .then((value) => setShowFabHint(value !== 'done'));
  }, [currentUser.data?.id, dashboard.isSuccess, dashboardAccounts.length, hasGuidedMovement]);
  useEffect(() => {
    if (!dashboard.isSuccess) return;
    if (reducedMotion) {
      [greetingEntrance, summaryEntrance, flowEntrance, fabEntrance].forEach((value) => value.setValue(1));
      return;
    }
    [greetingEntrance, summaryEntrance, flowEntrance, fabEntrance].forEach((value) => value.setValue(0));
    const animation = Animated.stagger(65, [
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
    ]);
    animation.start();
    return () => animation.stop();
  }, [
    dashboard.isSuccess,
    reducedMotion,
    fabEntrance,
    flowEntrance,
    greetingEntrance,
    period.year,
    period.month,
    summaryEntrance,
  ]);
  const periodControl = (
    <View style={styles.period}>
      <IconButton
        name="chevron-back"
        accessibilityLabel="Mes anterior"
        onPress={() => setPeriod((value) => shiftDashboardPeriod(value, -1))}
        tone="primary"
      />
      <Text style={[typography.cardTitle, { flex: 1, textAlign: 'center' }]}>
        {formatDashboardPeriod(period)}
      </Text>
      <IconButton
        name="chevron-forward"
        accessibilityLabel="Mes siguiente"
        onPress={() => setPeriod((value) => shiftDashboardPeriod(value, 1))}
        tone="primary"
      />
    </View>
  );
  if (dashboard.isPending)
    return (
      <Screen scroll>
        <ScreenHeader title={greeting} subtitle="Tu resumen financiero" />
        {periodControl}
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
        {periodControl}
        <ErrorState onRetry={() => void dashboard.refetch()} />
      </Screen>
    );
  const data = dashboard.data;
  const accounts = (data.accounts ?? []).filter((account) => account.active);
  const currency = budgetCurrency(data);
  const netWorth = currencyEntries(data.netWorthByCurrency);
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
              else openForm('/(app)/account-form');
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
      {periodControl}
      {guidedSetup.visible ? (
        <Animated.View style={fadeSlide(summaryEntrance, 8)}>
          <GuidedSetupCard
            steps={setupSteps}
            completed={setup.completed}
            onContinue={() => {
              void guidedSetup.dismiss().then((saved) => {
                if (!saved) feedback.show('No pudimos guardar tu avance. Pulsa Continuar para reintentar.');
              });
            }}
            onAction={(id: SetupStepId) => {
              if (id === 'account') openForm('/(app)/account-form');
              if (id === 'openingBalance') router.push('/(app)/accounts');
              if (id === 'movement') setQuickActions(true);
              if (id === 'budget') openForm('/(app)/budget-form');
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
            <Text style={typography.bodySecondary}>Tu balance entre lo que tienes y lo que debes.</Text>
          </BrandSurface>
        ))}
        <Animated.View style={fadeSlide(flowEntrance, 6)}>
          <HomeMetrics data={data} />
        </Animated.View>
        <FinancialProgressSection dashboard={data} period={period} />
        <HomeModules data={data} period={period} />
        <SectionHeader
          title="Cuentas"
          actionLabel={hasAccounts ? 'Ver todas' : 'Crear cuenta'}
          onAction={() => (hasAccounts ? router.push('/(app)/accounts') : openForm('/(app)/account-form'))}
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
                onPress={
                  account.id
                    ? () => router.push({ pathname: '/(app)/account-detail', params: { id: account.id! } })
                    : undefined
                }
                privacyHidden={hidden}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="Tu dinero empieza aquí"
            description="Agrega la cuenta donde manejas tu dinero."
            actionLabel="Agregar cuenta"
            onAction={() => openForm('/(app)/account-form')}
            tone="primary"
          />
        )}
        <SectionHeader
          title="Movimientos recientes"
          actionLabel="Ver todos"
          onAction={() => router.push('/(app)/transactions')}
        />
        {recent.length ? (
          <View style={styles.list}>
            {recent.slice(0, 3).map((transaction) => (
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
            onAction={() => (hasAccounts ? setQuickActions(true) : openForm('/(app)/account-form'))}
            tone="info"
          />
        )}
      </Animated.View>
      <QuickActionModal
        visible={quickActions}
        onClose={() => setQuickActions(false)}
        onExpense={() => {
          setQuickActions(false);
          openForm('/(app)/new-expense');
        }}
        onIncome={() => {
          setQuickActions(false);
          openForm('/(app)/new-income');
        }}
        onTransfer={() => {
          setQuickActions(false);
          openForm('/(app)/new-transfer');
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
