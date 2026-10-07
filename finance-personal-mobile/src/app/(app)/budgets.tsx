import { openForm } from '@/features/forms/form-session';
import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  currentDashboardPeriod,
  dashboardPeriodFromParams,
  formatDashboardPeriod,
  shiftDashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { budgetMessage, budgetOverview } from '@/features/budgets/budget-presentation';
import { PlanTabs } from '@/features/budgets/plan-tabs';
import { useBudgets } from '@/features/secondary/use-secondary';
import type { Budget } from '@/features/secondary/secondary-api';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { MotionPressable } from '@/ui/motion';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { Button, Card, IconButton, Screen } from '@/ui/primitives';
import { Progress } from '@/ui/progress';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { colors, radius, shadows, spacing, typography } from '@/theme';

const amount = (value: number | undefined, hidden: boolean) => formatPrivateMoney(value ?? 0, 'COP', hidden);

function BudgetCategoryCard({
  budget,
  hidden,
  onPress,
}: {
  budget: Budget;
  hidden: boolean;
  onPress(): void;
}) {
  const warning = budget.status === 'WARNING';
  const exceeded = budget.status === 'EXCEEDED';
  const tone = exceeded ? colors.danger : warning ? colors.warning : colors.success;
  const label = exceeded ? 'Límite superado' : warning ? 'Cerca del límite' : 'En control';
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`Ver presupuesto de ${budget.categoryName ?? 'categoría'}`}
      onPress={onPress}
    >
      <Card style={styles.categoryCard}>
        <View style={styles.categoryTop}>
          <View
            style={[
              styles.categoryIcon,
              {
                backgroundColor: exceeded
                  ? colors.dangerSoft
                  : warning
                    ? colors.warningSoft
                    : colors.primarySoft,
              },
            ]}
          >
            <Ionicons name="pie-chart-outline" size={21} color={tone} />
          </View>
          <View style={styles.categoryName}>
            <Text numberOfLines={2} style={typography.cardTitle}>
              {budget.categoryName ?? 'Categoría'}
            </Text>
            <Text style={typography.caption}>Límite mensual · COP</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </View>
        <View style={styles.amountRow}>
          <Text style={typography.bodySecondary}>Gastado</Text>
          <Text style={typography.moneySmall}>{amount(budget.spentAmount, hidden)}</Text>
        </View>
        <Progress
          value={budget.percentageUsed ?? 0}
          color={tone}
          label={`${budget.categoryName ?? 'Presupuesto'} utilizado`}
        />
        <View style={styles.amountRow}>
          <Text style={[typography.caption, { color: tone }]}>
            {label} · {Math.round(budget.percentageUsed ?? 0)}%
          </Text>
          <Text style={typography.caption}>
            {exceeded ? 'Exceso' : 'Disponible'} {amount(Math.abs(budget.remainingAmount ?? 0), hidden)}
          </Text>
        </View>
      </Card>
    </MotionPressable>
  );
}

export default function BudgetsScreen() {
  const { year, month } = useLocalSearchParams<{ year?: string; month?: string }>();
  const [period, setPeriod] = useState(
    () => dashboardPeriodFromParams(year, month) ?? currentDashboardPeriod(),
  );
  useFocusEffect(
    useCallback(() => {
      const requested = dashboardPeriodFromParams(year, month);
      if (requested) setPeriod(requested);
    }, [year, month]),
  );
  const query = useBudgets(period.year, period.month);
  const { width, fontScale } = useWindowDimensions();
  const compact = width <= 360 || fontScale >= 1.2;
  const periodLabel = compact
    ? new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' })
        .format(new Date(period.year, period.month - 1, 1))
        .replace(/^./, (letter) => letter.toUpperCase())
    : formatDashboardPeriod(period);
  const { hidden } = usePrivacy();
  const create = () =>
    openForm('/(app)/budget-form', {
      year: String(period.year),
      month: String(period.month),
      source: 'budgets',
    });
  const data = query.data;
  const overview = budgetOverview(data ?? []);
  return (
    <Screen
      entry
      scroll
      style={styles.screen}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <ScreenHeader
        title="Presupuestos"
        subtitle="Planea cuánto quieres gastar"
        back
        onBack={() => router.back()}
        rightAction={
          data?.length ? (
            <Button
              size="compact"
              variant="secondary"
              accessibilityLabel="Crear presupuesto"
              onPress={create}
            >
              + Nuevo
            </Button>
          ) : undefined
        }
      />
      <PlanTabs selected="budgets" />
      <View style={styles.period}>
        <IconButton
          name="chevron-back"
          accessibilityLabel="Mes anterior"
          tone="primary"
          onPress={() => setPeriod((x) => shiftDashboardPeriod(x, -1))}
        />
        <View style={styles.periodLabel}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={typography.cardTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {periodLabel}
          </Text>
        </View>
        <IconButton
          name="chevron-forward"
          accessibilityLabel="Mes siguiente"
          tone="primary"
          onPress={() => setPeriod((x) => shiftDashboardPeriod(x, 1))}
        />
      </View>
      {query.isPending ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : !data ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : data.length ? (
        <>
          {query.isError ? (
            <Text style={typography.caption}>
              No pudimos actualizar. Estos son los últimos datos disponibles.
            </Text>
          ) : null}
          <LinearGradient colors={[colors.heroStart, colors.heroEnd]} style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles-outline" size={15} color={colors.mint} />
                <Text style={styles.heroEyebrow}>TU PLAN DEL MES · COP</Text>
              </View>
              <Text style={styles.heroPeriod}>{formatDashboardPeriod(period)}</Text>
            </View>
            <Text style={styles.heroCaption}>
              {overview.remaining < 0 ? 'Exceso del plan' : 'Disponible para gastar'}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              style={[styles.heroAmount, overview.remaining < 0 && { color: colors.coral }]}
            >
              {amount(Math.abs(overview.remaining), hidden)}
            </Text>
            <Text style={styles.heroSubline}>de {amount(overview.limit, hidden)} planeados</Text>
            <Progress
              value={overview.percentage}
              color={overview.exceeded ? colors.coral : overview.warning ? colors.amber : colors.mint}
              label="Presupuesto mensual utilizado"
            />
            <View style={styles.heroBottom}>
              <Text style={styles.heroHint}>
                {budgetMessage(overview.percentage, overview.exceeded, overview.warning)}
              </Text>
              <Text style={styles.heroPercent}>{Math.round(overview.percentage)}%</Text>
            </View>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Gastado</Text>
                <Text style={styles.heroStatValue}>{amount(overview.spent, hidden)}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Categorías</Text>
                <Text style={styles.heroStatValue}>{data.length}</Text>
              </View>
            </View>
          </LinearGradient>
          <SectionHeader title="Por categoría" actionLabel="Añadir" onAction={create} />
          <View style={styles.list}>
            {data.map((budget) => (
              <BudgetCategoryCard
                key={budget.id}
                budget={budget}
                hidden={hidden}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/budget-detail',
                    params: { id: String(budget.id), year: String(period.year), month: String(period.month) },
                  })
                }
              />
            ))}
          </View>
          <Text style={styles.currencyNote}>
            Los presupuestos actuales usan COP. Los gastos en otras monedas no se mezclan en estos importes.
          </Text>
        </>
      ) : (
        <EmptyState
          title="Dale un límite a tus gastos"
          description="Elige una categoría y define cuánto quieres gastar en este mes."
          actionLabel="Crear presupuesto"
          onAction={create}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  period: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs },
  periodLabel: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  hero: { gap: spacing.md, padding: spacing.lg, borderRadius: 25, ...shadows.card },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  heroEyebrow: { ...typography.caption, color: colors.mint, fontWeight: '700', letterSpacing: 0.3 },
  heroPeriod: { ...typography.caption, color: '#C3E5E4' },
  heroCaption: { ...typography.bodySecondary, color: '#C3E5E4' },
  heroAmount: { ...typography.moneyLarge, color: colors.surface, fontSize: 34 },
  heroSubline: { ...typography.caption, color: '#C3E5E4' },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroHint: { ...typography.caption, color: '#C3E5E4', flex: 1 },
  heroPercent: { ...typography.label, color: colors.surface },
  heroStats: { flexDirection: 'row', gap: spacing.sm },
  heroStat: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: '#FFFFFF1C',
    gap: spacing.xs,
  },
  heroStatLabel: { ...typography.caption, color: '#C3E5E4' },
  heroStatValue: { ...typography.moneySmall, color: colors.surface },
  list: { gap: spacing.md },
  categoryCard: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.large, ...shadows.card },
  categoryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  categoryIcon: {
    width: 45,
    height: 45,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: { flex: 1, gap: spacing.xxs },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  currencyNote: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
