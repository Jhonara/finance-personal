import { openForm } from '@/features/forms/form-session';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { Card, Button, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { Progress } from '@/ui/progress';
import { colors, spacing, typography } from '@/theme';

export default function BudgetDetail() {
  const {
    id,
    version,
    limit,
    spent,
    remaining,
    percentage,
    category,
    categoryId,
    year,
    month,
    status,
    period,
  } = useLocalSearchParams<Record<string, string>>();
  const { hidden } = usePrivacy();
  const amount = (value: string | undefined) => formatPrivateMoney(Number(value ?? 0), 'COP', hidden);
  const label = status === 'EXCEEDED' ? 'Excedido' : status === 'WARNING' ? 'Atención' : 'En curso';
  return (
    <Screen scroll style={{ gap: spacing.lg }}>
      <ScreenHeader title={category ?? 'Presupuesto'} subtitle={period} back onBack={() => router.back()} />
      <Card style={{ gap: spacing.md, padding: spacing.lg }}>
        <Text style={typography.moneyMedium}>
          {Number(percentage ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })}% usado
        </Text>
        <Progress
          value={Number(percentage ?? 0)}
          label="Presupuesto utilizado"
          color={
            status === 'EXCEEDED' ? colors.danger : status === 'WARNING' ? colors.warning : colors.success
          }
        />
        <Text style={typography.moneyMedium}>{amount(spent)} gastados</Text>
        <Text style={typography.bodySecondary}>de {amount(limit)}</Text>
        <Text style={typography.cardTitle}>{amount(remaining)} disponibles</Text>
        <Text style={typography.label}>Estado · {label}</Text>
      </Card>
      <Button
        variant="secondary"
        onPress={() =>
          openForm('/(app)/budget-form', {
            id,
            version,
            limit,
            categoryId,
            categoryName: category,
            year,
            month,
          })
        }
      >
        Editar límite
      </Button>
    </Screen>
  );
}
