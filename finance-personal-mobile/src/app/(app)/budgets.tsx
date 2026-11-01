import { useAppTheme } from '@/theme/theme-provider';
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
import { budgetMessage, budgetOverview, groupBudgets } from '@/features/budgets/budget-presentation';
import { useCategories } from '@/features/categories/use-categories';
import { savedCategoryAppearance } from '@/features/categories/category-appearance';
import type { Category } from '@/features/categories/categories-api';
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
  hasChildren,
  category,
  hidden,
  onPress,
}: {
  budget: Budget;
  hasChildren: boolean;
  category?: Category;
  hidden: boolean;
  onPress(): void;
}) {
  const warning = budget.status === 'WARNING';
  const exceeded = budget.status === 'EXCEEDED';
  const tone = exceeded ? colors.danger : warning ? colors.warning : colors.success;
  const label = exceeded ? 'Límite superado' : warning ? 'Cerca del límite' : 'En control';
  const appearance = savedCategoryAppearance(category ?? { name: budget.categoryName });
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
            <Ionicons name={appearance.icon} size={21} color={tone} />
          </View>
          <View style={styles.categoryName}>
            <Text numberOfLines={2} style={typography.cardTitle}>
              {budget.categoryName ?? 'Categoría'}
            </Text>
            <Text style={typography.caption}>
              {budget.parentCategoryName
                ? `Subcategoría de ${budget.parentCategoryName}`
                : hasChildren
                  ? 'Techo del grupo · límite mensual en COP'
                  : 'Límite mensual · COP'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </View>
        <View style={styles.amountRow}>
          <Text style={typography.bodySecondary}>Gastado</Text>
          <Text style={typography.moneySmall}>{amount(budget.spentAmount, hidden)}</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={typography.caption}>Presupuestado</Text>
          <Text style={typography.label}>{amount(budget.limitAmount, hidden)}</Text>
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
  useAppTheme();
  const { year, month } = useLocalSearchParams<{ year?: string; month?: string }>();
  const [period, setPeriod] = useState(
    () => dashboardPeriodFromParams(year, month) ?? currentDashboardPeriod(),
  );
  useEffect(() => {
    const requested = dashboardPeriodFromParams(year, month);
    if (requested) setPeriod(requested);
  }, [year, month]);
  const query = useBudgets(period.year, period.month, true);
  const categories = useCategories('EXPENSE');
  const [view, setView] = useState<'summary' | 'detail'>('summary');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
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
  const [showInactive, setShowInactive] = useState(false);
  const data = query.data?.filter((budget) => budget.active !== false);
  const inactive = query.data?.filter((budget) => budget.active === false) ?? [];
  const overview = budgetOverview(data ?? []);
  const groups = groupBudgets(data ?? []);
  const showBudget = (budget: Budget) =>
    router.push({
      pathname: '/(app)/budget-detail',
      params: { id: String(budget.id), year: String(period.year), month: String(period.month) },
    });
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
          <SectionHeader title="Categorías y subcategorías" />
          <View style={styles.viewTabs} accessibilityRole="tablist">
            {(['summary', 'detail'] as const).map((value) => (
              <MotionPressable
                key={value}
                accessibilityRole="tab"
                accessibilityLabel={
                  value === 'summary' ? 'Resumen de presupuestos' : 'Detalle de presupuestos'
                }
                accessibilityState={{ selected: view === value }}
                onPress={() => {
                  setView(value);
                  setExpanded({});
                }}
                style={[styles.viewTab, view === value && styles.viewSelected]}
              >
                <Text style={typography.label}>{value === 'summary' ? 'Resumen' : 'Detallado'}</Text>
              </MotionPressable>
            ))}
          </View>
          <Text style={typography.caption}>
            El resumen muestra cada categoría padre. Despliega un grupo para ver sus subcategorías y límites.
          </Text>
          <View style={styles.list}>
            {groups.map((group) => {
              const isExpanded = expanded[group.categoryId] ?? view === 'detail';
              const appearance = savedCategoryAppearance(
                categories.data?.find((category) => category.id === group.categoryId) ?? { name: group.name },
              );
              const tone =
                group.remaining < 0
                  ? colors.danger
                  : group.percentage >= 80
                    ? colors.warning
                    : colors.success;
              return (
                <Card key={group.categoryId} style={styles.groupCard}>
                  <MotionPressable
                    accessibilityRole="button"
                    accessibilityLabel={`${isExpanded ? 'Contraer' : 'Desplegar'} presupuesto de ${group.name}`}
                    accessibilityState={{ expanded: isExpanded }}
                    onPress={() =>
                      setExpanded((current) => ({ ...current, [group.categoryId]: !isExpanded }))
                    }
                    style={styles.categoryTop}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: appearance.soft }]}>
                      <Ionicons name={appearance.icon} size={24} color={appearance.ink} />
                    </View>
                    <View style={styles.categoryName}>
                      <Text style={typography.cardTitle}>{group.name}</Text>
                      <Text style={typography.caption}>
                        Categoría padre · {group.children.length}{' '}
                        {group.children.length === 1 ? 'subcategoría con límite' : 'subcategorías con límite'}
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={21}
                      color={colors.primary}
                    />
                  </MotionPressable>
                  <View style={styles.amountRow}>
                    <Text style={typography.bodySecondary}>
                      {group.ceiling ? 'Techo general' : 'Suma de subcategorías'}
                    </Text>
                    <Text style={typography.moneySmall}>{amount(group.limit, hidden)}</Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={typography.caption}>Gastado {amount(group.spent, hidden)}</Text>
                    <Text style={[typography.caption, { color: tone }]}>
                      {group.remaining < 0 ? 'Exceso' : 'Disponible'}{' '}
                      {amount(Math.abs(group.remaining), hidden)}
                    </Text>
                  </View>
                  {!hidden ? (
                    <Progress value={group.percentage} color={tone} label={`Utilización de ${group.name}`} />
                  ) : null}
                  {!hidden ? (
                    <Text style={[typography.caption, { color: tone }]}>
                      {group.percentage.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% utilizado
                    </Text>
                  ) : null}
                  {isExpanded ? (
                    <View style={styles.groupChildren}>
                      {group.ceiling ? (
                        <Button variant="secondary" size="compact" onPress={() => showBudget(group.ceiling!)}>
                          Ver techo general
                        </Button>
                      ) : (
                        <Text style={typography.caption}>
                          Este grupo no tiene un techo general: el total corresponde a sus límites
                          individuales.
                        </Text>
                      )}
                      {group.children.map((budget) => (
                        <BudgetCategoryCard
                          key={budget.id}
                          budget={budget}
                          category={categories.data?.find((category) => category.id === budget.categoryId)}
                          hasChildren={false}
                          hidden={hidden}
                          onPress={() => showBudget(budget)}
                        />
                      ))}
                      {!group.children.length ? (
                        <Text style={typography.caption}>
                          Sin subcategorías presupuestadas. Los movimientos y el límite existentes siguen
                          disponibles.
                        </Text>
                      ) : null}
                      {group.ceiling ? (
                        <Text style={typography.caption}>
                          El techo ya incluye estas subcategorías. Sus límites no se suman otra vez al total.
                        </Text>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="compact"
                        onPress={() =>
                          openForm('/(app)/budget-form', {
                            year: String(period.year),
                            month: String(period.month),
                            parentCategoryId: String(group.categoryId),
                            source: 'budgets',
                          })
                        }
                      >
                        + Presupuestar subcategoría
                      </Button>
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
          <Button
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/(app)/reports',
                params: { report: 'budgets', year: String(period.year), month: String(period.month) },
              })
            }
          >
            Ver gráficos de presupuesto vs. gasto
          </Button>
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
      {inactive.length > 0 && (
        <>
          <Button variant="secondary" onPress={() => setShowInactive((value) => !value)}>
            {showInactive
              ? 'Ocultar presupuestos desactivados'
              : `Ver presupuestos desactivados (${inactive.length})`}
          </Button>
          {showInactive &&
            inactive.map((budget) => (
              <Card key={budget.id}>
                <Text style={typography.cardTitle}>{budget.categoryName}</Text>
                <Text style={typography.caption}>
                  Desactivado · Límite anterior {amount(budget.limitAmount, hidden)}
                </Text>
                <Button variant="ghost" onPress={() => showBudget(budget)}>
                  Consultar y reactivar
                </Button>
              </Card>
            ))}
        </>
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
  viewTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.medium,
  },
  viewTab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.small,
  },
  viewSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 1 },
  groupCard: { gap: spacing.md, padding: spacing.lg },
  groupChildren: {
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
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
