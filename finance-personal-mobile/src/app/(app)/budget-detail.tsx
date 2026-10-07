import { openForm } from '@/features/forms/form-session';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
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

export default function BudgetDetail() {
  const { id, year, month } = useLocalSearchParams<{ id?: string; year?: string; month?: string }>();
  const period = dashboardPeriodFromParams(year, month);
  const query = useBudgets(period?.year ?? 0, period?.month ?? 0);
  const { hidden } = usePrivacy();
  const budget = query.data?.find((item) => item.id === Number(id));
  const amount = (value: number | undefined) => formatPrivateMoney(value ?? 0, 'COP', hidden);
  const tone =
    budget?.status === 'EXCEEDED'
      ? colors.danger
      : budget?.status === 'WARNING'
        ? colors.warning
        : colors.success;
  const label =
    budget?.status === 'EXCEEDED'
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
                <Ionicons name="pie-chart-outline" size={26} color={tone} />
              </View>
              <View style={styles.grow}>
                <Text style={typography.caption}>PRESUPUESTO · COP</Text>
                <Text style={[typography.cardTitle, { color: tone }]}>{label}</Text>
              </View>
            </View>
            <Text style={typography.bodySecondary}>Gastado en {budget.categoryName}</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={typography.moneyLarge}>
              {amount(budget.spentAmount)}
            </Text>
            <Progress value={budget.percentageUsed ?? 0} label="Presupuesto utilizado" color={tone} />
            <Text style={typography.caption}>
              {(budget.percentageUsed ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })}% usado
            </Text>
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
            Cuenta solo gastos de esta categoría en COP registrados durante el mes. Puedes ajustar el límite
            cuando cambien tus planes.
          </Text>
          <Button
            onPress={() =>
              openForm('/(app)/budget-form', {
                id: String(budget.id),
                version: String(budget.version),
                limit: String(budget.limitAmount),
                categoryId: String(budget.categoryId),
                categoryName: budget.categoryName ?? 'Categoría',
                year: String(period.year),
                month: String(period.month),
                source: 'budget-detail',
              })
            }
          >
            Editar límite
          </Button>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  amounts: { flexDirection: 'row', gap: spacing.sm },
  amountCell: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.infoSoft,
  },
});
