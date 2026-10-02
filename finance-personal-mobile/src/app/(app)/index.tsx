import { openForm } from '@/features/forms/form-session';
import { HomeMetrics, FinancialPanorama } from '@/features/dashboard/home-metrics';
import { HomeModules } from '@/features/dashboard/home-modules';
import { useReducedMotion } from '@/ui/use-reduced-motion';
import { FinancialProgressSection } from '@/features/progress/progress-signal';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Animated, StyleSheet, Text, View } from 'react-native';

import {
  currentDashboardPeriod,
  formatDashboardPeriod,
  shiftDashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { budgetCurrency, toTransaction } from '@/features/dashboard/dashboard-adapter';
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
import { colors, motion, radius, spacing, typography } from '@/theme';
import { FloatingActionButton, QuickActionModal } from '@/ui/actions';
import { AccountCard, TransactionRow } from '@/ui/financial';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { Card, IconButton, Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonCard, SkeletonRow } from '@/ui/states';
import { FirstRunFabHint, FirstRunGuide } from '@/ui/first-run-guide';
import { GuidedSetupCard } from '@/ui/guided-setup-card';

export default function HomeScreen() {
  const reducedMotion = useReducedMotion();
  const [period, setPeriod] = useState(currentDashboardPeriod);
  const [quickActions, setQuickActions] = useState(false);
  const [showFabHint, setShowFabHint] = useState(false);
  const greetingEntrance = useRef(new Animated.Value(0)).current;
  const summaryEntrance = useRef(new Animated.Value(0)).current;
  const flowEntrance = useRef(new Animated.Value(0)).current;
  const planEntrance = useRef(new Animated.Value(0)).current;
  const insightEntrance = useRef(new Animated.Value(0)).current;
  const restEntrance = useRef(new Animated.Value(0)).current;
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
  useFocusEffect(
    useCallback(() => {
      if (!dashboard.isSuccess) return;
      const sections = [
        greetingEntrance,
        summaryEntrance,
        flowEntrance,
        planEntrance,
        insightEntrance,
        restEntrance,
        fabEntrance,
      ];
      if (reducedMotion) {
        sections.forEach((value) => value.setValue(1));
        return;
      }
      sections.forEach((value) => value.setValue(0));
      const animation = Animated.stagger(
        motion.stagger,
        sections.map((value) =>
          Animated.timing(value, {
            toValue: 1,
            duration: motion.fast,
            easing: motion.ease,
            useNativeDriver: true,
          }),
        ),
      );
      animation.start();
      return () => animation.stop();
    }, [
      dashboard.isSuccess,
      reducedMotion,
      greetingEntrance,
      summaryEntrance,
      flowEntrance,
      planEntrance,
      insightEntrance,
      restEntrance,
      fabEntrance,
      period.year,
      period.month,
    ]),
  );
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
        <ScreenHeader title={greeting} subtitle="Tu dinero, claro y en movimiento." />
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
        <ScreenHeader title={greeting} subtitle="Tu dinero, claro y en movimiento." />
        {periodControl}
        <ErrorState onRetry={() => void dashboard.refetch()} />
      </Screen>
    );
  const data = dashboard.data;
  const accounts = (data.accounts ?? []).filter((account) => account.active);
  const currency = budgetCurrency(data);
  const recent = data.recentTransactions ?? [];
  const hasAccounts = accounts.length > 0;
  return (
    <Screen
      scroll
      refreshing={dashboard.isRefetching}
      onRefresh={() => void dashboard.refetch()}
      actionInScroll
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
            reducedMotion={reducedMotion}
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
          subtitle="Tu dinero, claro y en movimiento."
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
      <>
        <Animated.View style={fadeSlide(summaryEntrance, 6)}>
          <FinancialPanorama data={data} />
        </Animated.View>
        <Animated.View style={fadeSlide(flowEntrance, 6)}>
          <HomeMetrics data={data} />
        </Animated.View>
        <Animated.View style={fadeSlide(planEntrance, 6)}>
          <HomeModules data={data} period={period} />
        </Animated.View>
        <Animated.View style={fadeSlide(insightEntrance, 6)}>
          <FinancialProgressSection dashboard={data} period={period} />
        </Animated.View>
        <Animated.View style={fadeSlide(restEntrance, 6)}>
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
            <Card style={styles.recentList}>
              {recent.slice(0, 3).map((transaction) => (
                <TransactionRow
                  key={transaction.transactionId}
                  {...toTransaction(transaction)}
                  privacyHidden={hidden}
                  onPress={() => router.push({ pathname: '/(app)/transactions', params: period })}
                />
              ))}
            </Card>
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
      </>
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
  period: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    padding: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  recentList: { paddingHorizontal: spacing.md },
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
