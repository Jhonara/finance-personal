import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { Card, Button, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { spacing, typography } from '@/theme';

export default function BudgetDetail() {
  const { id, version, limit, spent, remaining, percentage, category, status, period } =
    useLocalSearchParams<Record<string, string>>();
  const { hidden } = usePrivacy();
  const amount = (value: string | undefined) => formatPrivateMoney(Number(value ?? 0), 'COP', hidden);
  const label = status === 'EXCEEDED' ? 'Excedido' : status === 'WARNING' ? 'Atención' : 'En curso';
  return (
    <Screen scroll>
      <ScreenHeader title={category ?? 'Presupuesto'} subtitle={period} back onBack={() => router.back()} />
      <Card style={{ gap: spacing.md, padding: spacing.lg }}>
        <Text style={typography.cardTitle}>Resumen del presupuesto</Text>
        <Text>Límite · {amount(limit)}</Text>
        <Text>Gastado · {amount(spent)}</Text>
        <Text>Restante · {amount(remaining)}</Text>
        <Text>Usado · {percentage ?? '0'}%</Text>
        <Text>Estado · {label}</Text>
      </Card>
      <Button
        variant="secondary"
        onPress={() => router.push({ pathname: '/(app)/budget-form', params: { id, version, limit } })}
      >
        Editar límite
      </Button>
    </Screen>
  );
}
