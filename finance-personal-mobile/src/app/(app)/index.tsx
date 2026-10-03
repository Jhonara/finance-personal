import { openForm } from '@/features/forms/form-session';
import { HomeMetrics, FinancialPanorama } from '@/features/dashboard/home-metrics';
import { HomeModules } from '@/features/dashboard/home-modules';
import { useQuickActions } from '@/features/quick-actions/quick-action-provider';
import { useReducedMotion } from '@/ui/use-reduced-motion';
import { FinancialProgressSection } from '@/features/progress/progress-signal';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Animated, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  currentDashboardPeriod,
  formatDashboardPeriod,
  shiftDashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { toTransaction } from '@/features/dashboard/dashboard-adapter';
import { homeVisibility } from '@/features/dashboard/home-visibility';
import { EmptyHome, FirstMovementPrompt, QuietMonthNotice } from '@/features/dashboard/home-prompts';
import { HomeAccountPreview } from '@/features/dashboard/home-account-preview';
import { homeColumns } from '@/features/dashboard/home-plan';
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
import { TransactionRow } from '@/ui/financial';
import { HomeBrandHeader, SectionHeader } from '@/ui/headers';
import { Card, IconButton, Screen } from '@/ui/primitives';
import { ErrorState, SkeletonCard, SkeletonRow } from '@/ui/states';
import { MotionPressable } from '@/ui/motion';
import { FirstRunFabHint, FirstRunGuide } from '@/ui/first-run-guide';
import { GuidedSetupCard } from '@/ui/guided-setup-card';

export default function HomeScreen() {
  const reducedMotion = useReducedMotion();
  const { width, fontScale } = useWindowDimensions();
  const [period, setPeriod] = useState(currentDashboardPeriod);
  const { open: openQuickActions, openedCount } = useQuickActions();
  const [showFabHint, setShowFabHint] = useState(false);
  const greetingEntrance = useRef(new Animated.Value(0)).current;
  const summaryEntrance = useRef(new Animated.Value(0)).current;
  const flowEntrance = useRef(new Animated.Value(0)).current;
  const planEntrance = useRef(new Animated.Value(0)).current;
  const insightEntrance = useRef(new Animated.Value(0)).current;
  const restEntrance = useRef(new Animated.Value(0)).current;
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
    if (!userId || !dashboard.isSuccess || !dashboardAccounts.length || hasGuidedMovement || openedCount > 0)
      return;
    void firstRunStorage
      .read(firstRunStorage.hintKey(userId, 'fab'))
      .then((value) => setShowFabHint(value !== 'done'));
  }, [currentUser.data?.id, dashboard.isSuccess, dashboardAccounts.length, hasGuidedMovement, openedCount]);
  useEffect(() => {
    if (openedCount > 0 || hasGuidedMovement) setShowFabHint(false);
  }, [openedCount, hasGuidedMovement]);
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
  const header = (
    <HomeBrandHeader
      title={greeting}
      subtitle="Tu dinero, claro y en movimiento."
      profileName={currentUser.data?.name}
      privacyHidden={hidden}
      onPrivacy={() => void toggle()}
      onProfile={() => router.push('/(app)/more')}
    />
  );
  if (dashboard.isPending)
    return (
      <Screen scroll>
        {header}
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
        {header}
        {periodControl}
        <ErrorState onRetry={() => void dashboard.refetch()} />
      </Screen>
    );
  const data = dashboard.data;
  const view = homeVisibility(data, firstOrdinaryMovement.data);
  const accounts = view.accounts;
  const recent = data.recentTransactions ?? [];
  const hasAccounts = view.hasAccounts;
  const guidedCard = guidedSetup.visible ? (
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
          if (id === 'movement') openQuickActions();
          if (id === 'budget') openForm('/(app)/budget-form');
        }}
      />
    </Animated.View>
  ) : null;
  return (
    <Screen scroll refreshing={dashboard.isRefetching} onRefresh={() => void dashboard.refetch()}>
      <FirstRunGuide userId={currentUser.data?.id} />
      <Animated.View style={fadeSlide(greetingEntrance, 10)}>{header}</Animated.View>
      {hasAccounts ? periodControl : null}
      {!hasAccounts ? (
        <Animated.View style={fadeSlide(summaryEntrance, 8)}>
          <EmptyHome onCreateAccount={() => openForm('/(app)/account-form')} />
        </Animated.View>
      ) : null}
      {guidedCard}
      {hasAccounts ? (
        <>
          <Animated.View style={fadeSlide(summaryEntrance, 6)}>
            <FinancialPanorama data={data} />
          </Animated.View>
          {view.hasMonthlyTotals && view.monthlyCurrency ? (
            <Animated.View style={fadeSlide(flowEntrance, 6)}>
              <HomeMetrics data={data} currency={view.monthlyCurrency} />
            </Animated.View>
          ) : view.showFirstMovement ? (
            <Animated.View style={fadeSlide(flowEntrance, 6)}>
              <FirstMovementPrompt onRegister={openQuickActions} />
            </Animated.View>
          ) : (
            <Animated.View style={fadeSlide(flowEntrance, 6)}>
              <QuietMonthNotice
                currencyUnavailable={view.hasMonthlyTotals}
                onMovements={() => router.push({ pathname: '/(app)/transactions', params: period })}
              />
            </Animated.View>
          )}
          <Animated.View style={fadeSlide(planEntrance, 6)}>
            <HomeModules data={data} period={period} />
          </Animated.View>
          <Animated.View style={fadeSlide(insightEntrance, 6)}>
            <FinancialProgressSection dashboard={data} period={period} />
          </Animated.View>
          <Animated.View style={fadeSlide(restEntrance, 6)}>
            <SectionHeader
              title="Cuentas"
              actionLabel="Ver todas"
              onAction={() => router.push('/(app)/accounts')}
            />
            <View style={styles.accountGrid}>
              {accounts.slice(0, 3).map((account) => (
                <HomeAccountPreview
                  key={account.id}
                  account={account}
                  compact={homeColumns(width, fontScale) === 1 || width / fontScale < 380}
                  privacyHidden={hidden}
                  onPress={
                    account.id
                      ? () => router.push({ pathname: '/(app)/account-detail', params: { id: account.id! } })
                      : undefined
                  }
                />
              ))}
            </View>
            {recent.length ? (
              <>
                <SectionHeader title="Movimientos recientes" />
                <Card style={styles.recentList}>
                  {recent.slice(0, 3).map((transaction) => (
                    <TransactionRow
                      key={transaction.transactionId}
                      {...toTransaction(transaction)}
                      privacyHidden={hidden}
                      onPress={() => router.push({ pathname: '/(app)/transactions', params: period })}
                    />
                  ))}
                  <MotionPressable
                    accessibilityRole="button"
                    accessibilityLabel="Ver todos los movimientos"
                    onPress={() => router.push({ pathname: '/(app)/transactions', params: period })}
                    style={styles.transactionsLink}
                  >
                    <Text style={styles.transactionsLinkText}>Ver todos los movimientos →</Text>
                  </MotionPressable>
                </Card>
              </>
            ) : null}
          </Animated.View>
        </>
      ) : null}
      <FirstRunFabHint
        userId={currentUser.data?.id}
        visible={hasAccounts && showFabHint}
        onDismiss={() => setShowFabHint(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  accountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
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
  transactionsLink: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  transactionsLinkText: { ...typography.label, color: colors.primary },
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
