import { BudgetLifecycle } from '@/features/budgets/budget-lifecycle';
import { useAppTheme } from '@/theme/theme-provider';
import { themedStyleSheet } from '@/theme/themed-styles';
import { openForm } from '@/features/forms/form-session';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { dashboardPeriodFromParams, formatDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { useBudgets } from '@/features/secondary/use-secondary';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { Card, Button, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { Progress } from '@/ui/progress';
import { ErrorState, SkeletonRow } from '@/ui/states';
import { colors, radius, spacing, typography } from '@/theme';
import { useCategories } from '@/features/categories/use-categories';
import { savedCategoryAppearance } from '@/features/categories/category-appearance';

export default function BudgetDetail() {
  useAppTheme();
  const { id, year, month } = useLocalSearchParams<{ id?: string; year?: string; month?: string }>();
  const period = dashboardPeriodFromParams(year, month);
  const query = useBudgets(period?.year ?? 0, period?.month ?? 0, true);
  const categories = useCategories('EXPENSE');
  const { hidden } = usePrivacy();
  const budget = query.data?.find((item) => item.id === Number(id));
  const category = categories.data?.find((item) => item.id === budget?.categoryId);
  const appearance = savedCategoryAppearance(category ?? { name: budget?.categoryName });
  const subcategories =
    query.data?.filter((item) => item.parentCategoryId === budget?.categoryId && item.active !== false) ?? [];
  const amount = (value: number | undefined) => formatPrivateMoney(value ?? 0, 'COP', hidden);
  const tone =
    budget?.status === 'EXCEEDED'
      ? colors.danger
      : budget?.status === 'WARNING'
        ? colors.warning
        : colors.success;
  const label =
    budget?.active === false
      ? 'Desactivado'
      : budget?.status === 'EXCEEDED'
        ? 'Límite superado'
        : budget?.status === 'WARNING'
          ? 'Cerca del límite'
          : 'En control';
  return (
    <Screen
      scroll
      style={styles.screen}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <ScreenHeader
        title={budget?.categoryName ?? 'Presupuesto'}
        subtitle={period ? formatDashboardPeriod(period) : 'Presupuesto mensual'}
        back
        onBack={() => router.back()}
      />
      {query.isPending ? (
        <SkeletonRow />
      ) : !period || !budget ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError ? (
            <Text style={typography.caption}>
              No pudimos actualizar. Estos son los últimos datos disponibles.
            </Text>
          ) : null}
          <BudgetLifecycle budget={budget} />
          <Card style={styles.hero}>
            <View style={styles.heading}>
              <View
                style={[
                  styles.icon,
                  {
                    backgroundColor:
                      budget.status === 'EXCEEDED'
                        ? colors.dangerSoft
                        : budget.status === 'WARNING'
                          ? colors.warningSoft
                          : colors.successSoft,
                  },
                ]}
              >
                <Ionicons name={appearance.icon} size={26} color={tone} />
              </View>
              <View style={styles.grow}>
                <Text style={typography.caption}>
                  {budget.parentCategoryId ? 'SUBCATEGORÍA · COP' : 'CATEGORÍA PADRE · COP'}
                </Text>
                <Text style={[typography.cardTitle, { color: tone }]}>{label}</Text>
              </View>
            </View>
            <Text style={typography.bodySecondary}>
              {budget.parentCategoryName
                ? `Gastado en ${budget.categoryName}, dentro de ${budget.parentCategoryName}`
                : `Gastado en ${budget.categoryName}`}
            </Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={typography.moneyLarge}>
              {amount(budget.spentAmount)}
            </Text>
            {!hidden ? (
              <>
                <Progress value={budget.percentageUsed ?? 0} label="Presupuesto utilizado" color={tone} />
                <Text style={typography.caption}>
                  {(budget.percentageUsed ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })}% usado
                </Text>
              </>
            ) : null}
            <View style={styles.amounts}>
              <View style={styles.amountCell}>
                <Text style={typography.caption}>Límite del mes</Text>
                <Text style={typography.moneySmall}>{amount(budget.limitAmount)}</Text>
              </View>
              <View style={styles.amountCell}>
                <Text style={typography.caption}>
                  {budget.status === 'EXCEEDED' ? 'Exceso' : 'Disponible'}
                </Text>
                <Text style={[typography.moneySmall, { color: tone }]}>
                  {amount(Math.abs(budget.remainingAmount ?? 0))}
                </Text>
              </View>
            </View>
          </Card>
          <Text style={typography.bodySecondary}>
            {budget.parentCategoryName
              ? 'Este límite corresponde solo a la subcategoría. El límite de la categoría principal funciona como techo general y no se suma dos veces.'
              : 'Cuenta los gastos del grupo y sus subcategorías en COP durante el mes. Este límite funciona como techo general; los límites de subcategoría no se suman encima.'}{' '}
            Puedes ajustar el límite cuando cambien tus planes.
          </Text>
          {budget.parentCategoryId ? (
            <Card tone="info" style={styles.hero}>
              <Text style={typography.label}>Categoría padre</Text>
              <Text style={typography.cardTitle}>
                {budget.parentCategoryName ?? 'Grupo de esta subcategoría'}
              </Text>
              <Text style={typography.caption}>
                {budget.categoryName} tiene su propio límite dentro de este grupo.
              </Text>
            </Card>
          ) : null}
          {subcategories.length ? (
            <Card style={styles.hero}>
              <Text style={typography.cardTitle}>Subcategorías de {budget.categoryName}</Text>
              <Text style={typography.caption}>
                Detalle de los límites individuales. El total del grupo sigue siendo su techo general.
              </Text>
              {subcategories.map((child) => (
                <View key={child.id} style={styles.child}>
                  <Text style={typography.label}>{child.categoryName}</Text>
                  <Text style={typography.caption}>
                    Gastado {amount(child.spentAmount)} de {amount(child.limitAmount)}
                  </Text>
                  {!hidden ? (
                    <Progress
                      value={child.percentageUsed ?? 0}
                      label={`Utilización de ${child.categoryName}`}
                    />
                  ) : null}
                  <Button
                    size="compact"
                    variant="ghost"
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/budget-detail',
                        params: {
                          id: String(child.id),
                          year: String(period.year),
                          month: String(period.month),
                        },
                      })
                    }
                  >
                    Ver {child.categoryName}
                  </Button>
                </View>
              ))}
            </Card>
          ) : null}
          <Button
            onPress={() =>
              openForm('/(app)/budget-form', {
                id: String(budget.id),
                version: String(budget.version),
                limit: String(budget.limitAmount),
                categoryId: String(budget.categoryId),
                categoryName: budget.categoryName ?? 'Categoría',
                parentCategoryId: budget.parentCategoryId ? String(budget.parentCategoryId) : '',
                parentCategoryName: budget.parentCategoryName ?? '',
                year: String(period.year),
                month: String(period.month),
                source: 'budget-detail',
              })
            }
          >
            Editar límite
          </Button>
          <Button
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/(app)/report-transactions',
                params: {
                  year: String(period.year),
                  month: String(period.month),
                  currency: 'COP',
                  type: 'EXPENSE',
                  categoryId: String(budget.categoryId),
                  category: budget.categoryName ?? 'Categoría',
                },
              })
            }
          >
            Ver gastos de este presupuesto
          </Button>
        </>
      )}
    </Screen>
  );
}

const styles = themedStyleSheet(() => ({
  screen: { gap: spacing.lg },
  hero: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.large },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1, gap: spacing.xs },
  child: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  amounts: { flexDirection: 'row', gap: spacing.sm },
  amountCell: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.infoSoft,
  },
}));
