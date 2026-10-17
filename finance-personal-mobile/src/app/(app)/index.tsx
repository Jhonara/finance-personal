import { themedStyleSheet } from '@/theme/themed-styles';
import { openForm } from '@/features/forms/form-session';
import { HomeMetrics, FinancialPanorama } from '@/features/dashboard/home-metrics';
import { HomeModules } from '@/features/dashboard/home-modules';
import { HomeShortcuts } from '@/features/dashboard/home-shortcuts';
import { HomeAttention } from '@/features/dashboard/home-attention';
import {
  presentTransaction,
  type PresentedTransaction,
} from '@/features/transactions/transaction-presentation';
import { TransactionDetailSheet } from '@/ui/transaction-detail-sheet';
import { useAlerts } from '@/features/secondary/use-secondary';
import { useHomePriority } from '@/features/dashboard/use-home-priority';
import { HomePrioritySettings } from '@/features/dashboard/home-priority-settings';
import { HomePriorityCard } from '@/features/dashboard/home-priority-card';
import { useQuickActions } from '@/features/quick-actions/quick-action-provider';
import { useReducedMotion } from '@/ui/use-reduced-motion';
import { FinancialProgressSection } from '@/features/progress/progress-signal';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Animated, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  currentDashboardPeriod,
  formatDashboardPeriod,
  shiftDashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { toTransaction } from '@/features/dashboard/dashboard-adapter';
import { homeVisibility } from '@/features/dashboard/home-visibility';
import { EmptyHome, FirstMovementPrompt, QuietMonthNotice } from '@/features/dashboard/home-prompts';
import { HomeAccountPreview } from '@/features/dashboard/home-account-preview';
import { HomeHeader } from '@/features/dashboard/home-header';
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
import { Card, Screen } from '@/ui/primitives';
import { ErrorState, SkeletonCard, SkeletonRow } from '@/ui/states';
import { MotionPressable } from '@/ui/motion';
import { FirstRunFabHint, FirstRunGuide } from '@/ui/first-run-guide';
import { GuidedSetupCard } from '@/ui/guided-setup-card';

export default function HomeScreen() {
  const reducedMotion = useReducedMotion();
  const { width, fontScale } = useWindowDimensions();
  const [period, setPeriod] = useState(currentDashboardPeriod);
  const todayPeriod = currentDashboardPeriod();
  const viewingCurrentMonth = period.year === todayPeriod.year && period.month === todayPeriod.month;
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
  const currentDashboard = useDashboardMonth(todayPeriod);
  const alerts = useAlerts();
  const currentData = currentDashboard.data;
  const [selectedTransaction, setSelectedTransaction] = useState<PresentedTransaction>();
  const currentUser = useCurrentUser();
  const homePriority = useHomePriority(currentUser.data?.id);
  const guidedSetup = useGuidedSetupVisibility(currentUser.data?.id);
  const feedback = useFeedback();
  const openingBalanceExists = useOpeningBalanceExists(
    Boolean(currentData?.accounts?.some((account) => account.active)),
  );
  const firstOrdinaryMovement = useFirstOrdinaryMovementExists(
    Boolean(currentData?.accounts?.some((account) => account.active)),
  );
  const dashboardAccounts = currentData?.accounts?.filter((account) => account.active) ?? [];
  const setupSteps = createSetupSteps({
    accountCount: dashboardAccounts.length,
    budgetCount: currentData?.budgets?.items?.length ?? 0,
    openingBalanceRegistered: openingBalanceExists.data ?? false,
    firstMovementRegistered: firstOrdinaryMovement.data,
    recentTransactions: currentData?.recentTransactions ?? [],
  });
  const setup = setupProgress(setupSteps);
  const hasGuidedMovement = setupSteps.some((step) => step.id === 'movement' && step.completed);
  const greeting = dashboardGreeting(new Date(), currentUser.data?.name);
  useEffect(() => {
    const userId = currentUser.data?.id;
    if (
      !userId ||
      !currentDashboard.isSuccess ||
      !dashboardAccounts.length ||
      hasGuidedMovement ||
      openedCount > 0
    )
      return;
    void firstRunStorage
      .read(firstRunStorage.hintKey(userId, 'fab'))
      .then((value) => setShowFabHint(value !== 'done'));
  }, [
    currentUser.data?.id,
    currentDashboard.isSuccess,
    dashboardAccounts.length,
    hasGuidedMovement,
    openedCount,
  ]);
  useEffect(() => {
    if (openedCount > 0 || hasGuidedMovement) setShowFabHint(false);
  }, [openedCount, hasGuidedMovement]);
  useFocusEffect(
    useCallback(() => {
      if (!currentDashboard.isSuccess) return;
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
      currentDashboard.isSuccess,
      reducedMotion,
      greetingEntrance,
      summaryEntrance,
      flowEntrance,
      planEntrance,
      insightEntrance,
      restEntrance,
    ]),
  );
  const periodControl = (
    <View style={styles.periodRow}>
      <Text style={styles.periodEyebrow}>ACTIVIDAD DEL MES</Text>
      <View style={styles.period}>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          onPress={() => setPeriod((value) => shiftDashboardPeriod(value, -1))}
          style={styles.periodArrow}
        >
          <Ionicons name="chevron-back" size={17} color={colors.primary} />
        </MotionPressable>
        <Text numberOfLines={1} style={styles.periodText}>
          {formatDashboardPeriod(period)}
        </Text>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          onPress={() => setPeriod((value) => shiftDashboardPeriod(value, 1))}
          style={styles.periodArrow}
        >
          <Ionicons name="chevron-forward" size={17} color={colors.primary} />
        </MotionPressable>
      </View>
    </View>
  );
  const header = (
    <HomeHeader
      greeting={greeting}
      profileName={currentUser.data?.name}
      privacyHidden={hidden}
      onPrivacy={() => void toggle()}
      onProfile={() => router.push('/(app)/more')}
    />
  );
  if (currentDashboard.isPending)
    return (
      <Screen scroll>
        {header}
        {periodControl}
        <SkeletonCard />
        <View style={styles.stats}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
        <Text style={styles.sectionTitle}>Cuentas</Text>
        <SkeletonRow />
        <SkeletonRow />
      </Screen>
    );
  if (!currentData)
    return (
      <Screen>
        {header}
        {periodControl}
        <HomeShortcuts />
        <ErrorState title="No pudimos cargar tu inicio" onRetry={() => void currentDashboard.refetch()} />
      </Screen>
    );
  const data = currentData;
  const view = homeVisibility(data, firstOrdinaryMovement.data);
  const monthlyView = homeVisibility(dashboard.data ?? {}, firstOrdinaryMovement.data);
  const accounts = view.accounts;
  const recent = dashboard.data?.recentTransactions ?? [];
  const hasAccounts = view.hasAccounts;
  const guidedCard =
    viewingCurrentMonth && guidedSetup.visible ? (
      <Animated.View style={fadeSlide(summaryEntrance, 8)}>
        <GuidedSetupCard
          steps={setupSteps}
          completed={setup.completed}
          onContinue={() => {
            void guidedSetup.dismiss().then((saved) => {
              if (!saved)
                feedback.show('No pudimos guardar tu avance. Pulsa Continuar para reintentar.', 'error');
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
    <Screen
      scroll
      refreshing={dashboard.isRefetching || currentDashboard.isRefetching || alerts.isRefetching}
      onRefresh={() => {
        void currentDashboard.refetch();
        void alerts.refetch();
        if (!viewingCurrentMonth) void dashboard.refetch();
      }}
    >
      <FirstRunGuide userId={currentUser.data?.id} />
      <Animated.View style={fadeSlide(greetingEntrance, 10)}>{header}</Animated.View>
      <HomeAttention alerts={alerts.data} unavailable={alerts.isError && !alerts.data} />
      <HomePrioritySettings userId={currentUser.data?.id} compact />
      <HomeShortcuts priority={homePriority.priority} />
      <HomePriorityCard priority={homePriority.priority} data={data} period={todayPeriod} />
      {currentDashboard.isError ? (
        <ErrorState
          title="No pudimos actualizar tus saldos"
          message="Ves la última información disponible. Desliza hacia abajo para volver a intentar."
          onRetry={() => void currentDashboard.refetch()}
        />
      ) : null}
      {view.hasPanorama ? (
        <Animated.View style={fadeSlide(summaryEntrance, 6)}>
          <FinancialPanorama data={data} />
        </Animated.View>
      ) : null}
      {view.hasPanorama ? periodControl : null}
      {view.hasPanorama ? (
        <Text style={styles.periodHint}>
          {`Viendo ${formatDashboardPeriod(period)}: aquí cambian ingresos, gastos y movimientos. Los saldos de arriba siempre son de hoy.`}
        </Text>
      ) : null}
      {!hasAccounts && !view.hasPanorama ? (
        <Animated.View style={fadeSlide(summaryEntrance, 8)}>
          <EmptyHome onCreateAccount={() => openForm('/(app)/account-form')} />
        </Animated.View>
      ) : null}
      {guidedCard}
      {hasAccounts || view.hasPanorama ? (
        <>
          {!viewingCurrentMonth ? (
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Volver al mes actual"
              onPress={() => setPeriod(currentDashboardPeriod())}
              style={styles.returnToToday}
            >
              <Ionicons name="today-outline" size={17} color={colors.primary} />
              <Text style={styles.sectionActionText}>Volver al mes actual</Text>
            </MotionPressable>
          ) : null}
          {dashboard.isPending ? (
            <SkeletonCard />
          ) : !dashboard.data ? (
            <ErrorState
              title="No pudimos cargar este mes"
              message="Tus saldos actuales siguen arriba. Puedes reintentar el resumen del mes."
              onRetry={() => void dashboard.refetch()}
            />
          ) : monthlyView.hasMonthlyTotals && monthlyView.monthlyCurrency ? (
            <Animated.View style={fadeSlide(flowEntrance, 6)}>
              <HomeMetrics data={dashboard.data} currency={monthlyView.monthlyCurrency} period={period} />
            </Animated.View>
          ) : monthlyView.showFirstMovement && viewingCurrentMonth ? (
            <Animated.View style={fadeSlide(flowEntrance, 6)}>
              <FirstMovementPrompt onRegister={openQuickActions} />
            </Animated.View>
          ) : (
            <Animated.View style={fadeSlide(flowEntrance, 6)}>
              <QuietMonthNotice
                currencyUnavailable={monthlyView.hasMonthlyTotals}
                period={period}
                onMovements={() => router.push({ pathname: '/(app)/transactions', params: period })}
                onReports={() => router.push({ pathname: '/(app)/reports', params: period })}
              />
            </Animated.View>
          )}
          {dashboard.data && monthlyView.hasMonthlyTotals && monthlyView.monthlyCurrency ? (
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Ver reportes de este mes"
              onPress={() => router.push({ pathname: '/(app)/reports', params: period })}
              style={styles.monthLink}
            >
              <Ionicons name="stats-chart-outline" size={19} color={colors.primary} />
              <Text style={styles.monthLinkText}>Ver en qué gastaste este mes</Text>
              <Ionicons name="arrow-forward" size={17} color={colors.primary} />
            </MotionPressable>
          ) : null}
          {!viewingCurrentMonth ? (
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel={`Ver presupuesto de ${formatDashboardPeriod(period)}`}
              onPress={() => router.push({ pathname: '/(app)/budgets', params: period })}
              style={styles.monthLink}
            >
              <Ionicons name="pie-chart-outline" size={19} color={colors.primary} />
              <Text style={styles.monthLinkText}>Ver presupuesto de {formatDashboardPeriod(period)}</Text>
              <Ionicons name="arrow-forward" size={17} color={colors.primary} />
            </MotionPressable>
          ) : null}
          {viewingCurrentMonth ? (
            <>
              <Animated.View style={fadeSlide(planEntrance, 6)}>
                <HomeModules data={data} period={period} />
              </Animated.View>
              <Animated.View style={fadeSlide(insightEntrance, 6)}>
                <FinancialProgressSection dashboard={data} period={period} />
              </Animated.View>
            </>
          ) : null}
          <Animated.View style={fadeSlide(restEntrance, 6)}>
            {viewingCurrentMonth ? (
              <>
                <View style={styles.sectionRow}>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>
                    Mis cuentas
                  </Text>
                  <MotionPressable
                    accessibilityRole="button"
                    accessibilityLabel="Ver todas las cuentas"
                    onPress={() => router.push('/(app)/accounts')}
                    style={styles.sectionAction}
                  >
                    <Text style={styles.sectionActionText}>Ver todas →</Text>
                  </MotionPressable>
                </View>
                <View style={styles.accountGrid}>
                  {accounts.slice(0, 3).map((account) => (
                    <HomeAccountPreview
                      key={account.id}
                      account={account}
                      compact={homeColumns(width, fontScale) === 1}
                      privacyHidden={hidden}
                      onPress={
                        account.id
                          ? () =>
                              router.push({ pathname: '/(app)/account-detail', params: { id: account.id! } })
                          : undefined
                      }
                    />
                  ))}
                </View>
              </>
            ) : null}
            {recent.length ? (
              <>
                <Text accessibilityRole="header" style={[styles.sectionTitle, styles.movementsHeading]}>
                  Movimientos de {formatDashboardPeriod(period)}
                </Text>
                <Card style={styles.recentList}>
                  {recent.slice(0, 3).map((transaction) => (
                    <TransactionRow
                      key={transaction.transactionId}
                      {...toTransaction(transaction)}
                      privacyHidden={hidden}
                      compact
                      onPress={() => setSelectedTransaction(presentTransaction(transaction))}
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
      <TransactionDetailSheet
        transaction={selectedTransaction}
        privacyHidden={hidden}
        onClose={() => setSelectedTransaction(undefined)}
      />
    </Screen>
  );
}

const styles = themedStyleSheet(() => ({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  accountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  periodHint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  returnToToday: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
  },
  monthLink: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.large,
    backgroundColor: colors.infoSoft,
    marginTop: spacing.md,
  },
  monthLinkText: { ...typography.label, color: colors.primary, flex: 1 },
  periodEyebrow: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: 0.6,
  },
  period: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
    maxWidth: '78%',
  },
  periodArrow: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  periodText: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 15,
    color: colors.primary,
    fontWeight: '700',
    flexShrink: 1,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.sectionTitle, fontSize: 17, lineHeight: 23 },
  sectionAction: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.xs },
  sectionActionText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  movementsHeading: { marginTop: spacing.xl, marginBottom: spacing.sm },
  recentList: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  transactionsLink: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.infoSoft,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  transactionsLinkText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.primaryStrong,
    fontWeight: '700',
  },
}));

function fadeSlide(value: Animated.Value, fromY: number, fromX = 0) {
  return {
    opacity: value,
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [fromY, 0] }) },
      { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [fromX, 0] }) },
    ],
  };
}
