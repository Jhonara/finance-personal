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
import { Button, Screen } from '@/ui/primitives';
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" onPress={() => setPeriod((x) => shiftDashboardPeriod(x, -1))}>
          <Text>Mes anterior</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setPeriod((x) => shiftDashboardPeriod(x, 1))}>
          <Text>Mes siguiente</Text>
        </Pressable>
      </View>
      {q.data.length ? (
        q.data.map((x) => (
          <Pressable
            key={x.id}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/(app)/budget-form',
                params: {
                  id: String(x.id),
                  version: String(x.version ?? 0),
                  limit: String(x.limitAmount ?? 0),
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
          title="Aún no tienes presupuestos para este mes."
          description="Define límites para tus categorías de gasto."
          actionLabel="Crear presupuesto"
          onAction={() => router.push('/(app)/budget-form')}
        />
      )}
      <Button onPress={() => router.push('/(app)/budget-form')}>Crear presupuesto</Button>
    </Screen>
  );
}
