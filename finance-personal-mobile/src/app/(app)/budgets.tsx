import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import {
  currentDashboardPeriod,
  formatDashboardPeriod,
  shiftDashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { useBudgets } from '@/features/secondary/use-secondary';
import { usePrivacy } from '@/privacy/privacy-provider';
import { BudgetProgress } from '@/ui/financial';
import { ScreenHeader } from '@/ui/headers';
import { Button, Card, IconButton, Screen } from '@/ui/primitives';
import { spacing, typography } from '@/theme';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
const status = (value: string | undefined): 'OK' | 'WARNING' | 'EXCEEDED' =>
  value === 'WARNING' ? 'WARNING' : value === 'EXCEEDED' ? 'EXCEEDED' : 'OK';
export default function BudgetsScreen() {
  const [period, setPeriod] = useState(currentDashboardPeriod);
  const q = useBudgets(period.year, period.month);
  const { hidden } = usePrivacy();
  if (q.isPending)
    return (
      <Screen>
        <ScreenHeader title="Presupuestos" />
        <SkeletonRow />
        <SkeletonRow />
      </Screen>
    );
  if (q.isError)
    return (
      <Screen>
        <ScreenHeader title="Presupuestos" />
        <ErrorState onRetry={() => void q.refetch()} />
      </Screen>
    );
  return (
    <Screen scroll refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <ScreenHeader
        title="Presupuestos"
        subtitle={formatDashboardPeriod(period)}
        back
        onBack={() => router.back()}
      />
      <View style={styles.period}>
        <IconButton
          name="chevron-back"
          accessibilityLabel="Mes anterior"
          tone="primary"
          onPress={() => setPeriod((x) => shiftDashboardPeriod(x, -1))}
        />
        <Text style={typography.cardTitle}>{formatDashboardPeriod(period)}</Text>
        <IconButton
          name="chevron-forward"
          accessibilityLabel="Mes siguiente"
          tone="primary"
          onPress={() => setPeriod((x) => shiftDashboardPeriod(x, 1))}
        />
      </View>
      {q.data.length ? (
        <Card tone="warning" style={styles.summary}>
          <Text style={typography.cardTitle}>Presupuesto del mes</Text>
          <Text style={typography.bodySecondary}>
            {q.data.some((budget) => budget.status === 'EXCEEDED')
              ? 'Hay categorías que superaron lo planeado.'
              : q.data.some((budget) => budget.status === 'WARNING')
                ? 'Tienes categorías cerca de su límite.'
                : 'Vas dentro de tus límites este mes.'}
          </Text>
          <Text style={typography.moneySmall}>
            Límite total{' '}
            {q.data.reduce((sum, budget) => sum + (budget.limitAmount ?? 0), 0).toLocaleString('es-CO')}
          </Text>
          <Text style={typography.caption}>
            Gastado{' '}
            {q.data.reduce((sum, budget) => sum + (budget.spentAmount ?? 0), 0).toLocaleString('es-CO')} ·
            Disponible{' '}
            {q.data.reduce((sum, budget) => sum + (budget.remainingAmount ?? 0), 0).toLocaleString('es-CO')}
          </Text>
        </Card>
      ) : null}
      {q.data.length ? (
        q.data.map((x) => (
          <Pressable
            key={x.id}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/(app)/budget-detail',
                params: {
                  id: String(x.id),
                  version: String(x.version ?? 0),
                  limit: String(x.limitAmount ?? 0),
                  spent: String(x.spentAmount ?? 0),
                  remaining: String(x.remainingAmount ?? 0),
                  percentage: String(x.percentageUsed ?? 0),
                  category: x.categoryName ?? 'Categoría',
                  status: status(x.status),
                  period: formatDashboardPeriod(period),
                },
              })
            }
          >
            <BudgetProgress
              label={x.categoryName ?? 'Categoría'}
              limit={x.limitAmount ?? 0}
              spent={x.spentAmount ?? 0}
              remaining={x.remainingAmount ?? 0}
              percentage={x.percentageUsed ?? 0}
              status={status(x.status)}
              privacyHidden={hidden}
            />
          </Pressable>
        ))
      ) : (
        <EmptyState
          title="Dale un límite a tus gastos"
          description="Define cuánto quieres destinar a una categoría este mes."
          actionLabel="Crear presupuesto"
          onAction={() => router.push('/(app)/budget-form')}
        />
      )}
      {q.data.length ? (
        <Button onPress={() => router.push('/(app)/budget-form')}>Crear presupuesto</Button>
      ) : null}
    </Screen>
  );
}
const styles = {
  period: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.sm,
  },
  summary: { gap: spacing.sm, marginBottom: spacing.md },
};
