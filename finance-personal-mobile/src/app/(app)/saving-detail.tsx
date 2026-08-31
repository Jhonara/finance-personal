import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useSavingProgress, useContributeSaving } from '@/features/secondary/use-secondary';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { useFeedback } from '@/feedback/feedback-provider';
import { localDateFromNative } from '@/utils/local-date';
import { FinancialDateField } from '@/ui/financial-date-field';
import { Button, MoneyInput, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { ErrorState } from '@/ui/states';
export default function SavingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useSavingProgress(Number(id));
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localDateFromNative(new Date()));
  const m = useContributeSaving();
  const f = useFeedback();
  const goal = q.data;
  const { hidden } = usePrivacy();
  if (!goal)
    return (
      <Screen>
        <ScreenHeader title="Meta de ahorro" back onBack={() => router.back()} />
        <ErrorState title="Meta no disponible" onRetry={() => void q.refetch()} />
      </Screen>
    );
  return (
    <Screen scroll keyboard>
      <ScreenHeader title={goal.name ?? 'Meta de ahorro'} back onBack={() => router.back()} />
      <Text>Objetivo: {formatPrivateMoney(goal.target ?? 0, 'COP', hidden)}</Text>
      <Text>Acumulado: {formatPrivateMoney(goal.current ?? 0, 'COP', hidden)}</Text>
      <Text>
        {Math.round(goal.progressPercent ?? 0)}% · {goal.completed ? 'Completada' : 'En progreso'}
      </Text>
      <MoneyInput label="Aporte" value={amount} onChangeText={setAmount} />
      <FinancialDateField label="Fecha" value={date} onChange={setDate} />
      <Button
        loading={m.isPending}
        disabled={m.isPending}
        onPress={() => {
          if (Number(amount))
            m.mutate(
              { id: Number(id), data: { amount: Number(amount), movementDate: date } },
              {
                onSuccess: () => {
                  f.show('Aporte registrado.');
                  setAmount('');
                },
              },
            );
        }}
      >
        Registrar aporte
      </Button>
    </Screen>
  );
}
