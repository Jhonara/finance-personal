import { themedStyleSheet } from '@/theme/themed-styles';
import { openForm } from '@/features/forms/form-session';
import { TourTarget } from '@/ui/tour-target';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  currentDashboardPeriod,
  dashboardPeriodFromParams,
  formatDashboardPeriod,
  shiftDashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { budgetMessage, budgetOverview } from '@/features/budgets/budget-presentation';
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
        {!hidden ? (
          <Progress
            value={budget.percentageUsed ?? 0}
            color={tone}
            label={`${budget.categoryName ?? 'Presupuesto'} utilizado`}
          />
        ) : null}
        <View style={styles.amountRow}>
          <Text style={[typography.caption, { color: tone }]}>
            {label}
            {!hidden ? ` · ${Math.round(budget.percentageUsed ?? 0)}%` : ''}
          </Text>
          <Text style={typography.caption}>
            {exceeded ? 'Exceso' : 'Margen'} {amount(Math.abs(budget.remainingAmount ?? 0), hidden)}
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
  useEffect(() => {
    const requested = dashboardPeriodFromParams(year, month);
    if (requested) setPeriod(requested);
  }, [year, month]);
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
            <TourTarget id="add-budget">
              <Button
                size="compact"
                variant="secondary"
                accessibilityLabel="Crear presupuesto"
                onPress={create}
              >
                + Nuevo
              </Button>
            </TourTarget>
          ) : undefined
        }
      />
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
            </View>
            <Text style={styles.heroCaption}>
              {overview.remaining < 0 ? 'Exceso del plan' : 'Margen de tu presupuesto'}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              style={[styles.heroAmount, overview.remaining < 0 && { color: colors.coral }]}
            >
              {amount(Math.abs(overview.remaining), hidden)}
            </Text>
            <Text style={styles.heroSubline}>
              Gastado {amount(overview.spent, hidden)} de {amount(overview.limit, hidden)}
            </Text>
            <Text style={styles.heroHint}>
              Es lo que queda de tus límites de gasto, no el saldo de tus cuentas.
            </Text>
            {!hidden ? (
              <Progress
                value={overview.percentage}
                color={overview.exceeded ? colors.coral : overview.warning ? colors.amber : colors.mint}
                label="Presupuesto mensual utilizado"
              />
            ) : null}
            <View style={styles.heroBottom}>
              <Text style={styles.heroHint}>
                {budgetMessage(overview.percentage, overview.exceeded, overview.warning)}
              </Text>
              {!hidden ? <Text style={styles.heroPercent}>{Math.round(overview.percentage)}%</Text> : null}
            </View>
          </LinearGradient>
          <SectionHeader title="Por categoría" />
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
        <TourTarget id="add-budget">
          <EmptyState
            title="Dale un límite a tus gastos"
            description="Elige una categoría y define cuánto quieres gastar en este mes."
            actionLabel="Crear presupuesto"
            onAction={create}
          />
        </TourTarget>
      )}
    </Screen>
  );
}

const styles = themedStyleSheet(() => ({
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
  hero: { gap: spacing.sm, padding: spacing.lg, borderRadius: 25, ...shadows.card },
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
  heroAmount: { ...typography.moneyLarge, color: '#FFFFFF', fontSize: 34 },
  heroSubline: { ...typography.caption, color: '#C3E5E4' },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroHint: { ...typography.caption, color: '#C3E5E4', flex: 1 },
  heroPercent: { ...typography.label, color: '#FFFFFF' },
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
  heroStatValue: { ...typography.moneySmall, color: '#FFFFFF' },
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
}));
