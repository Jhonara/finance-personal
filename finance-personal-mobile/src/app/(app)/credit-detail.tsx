import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import {
  useCredit,
  usePayCredit,
  usePlanVsReal,
  useReverseCreditPayment,
  useSimulateCredit,
} from '@/features/secondary/use-secondary';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { useFeedback } from '@/feedback/feedback-provider';
import { localDateFromNative } from '@/utils/local-date';
import { FinancialDateField } from '@/ui/financial-date-field';
import { Button, Card, MoneyInput, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { ErrorState, SkeletonRow } from '@/ui/states';
export default function CreditDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useCredit(Number(id));
  const { hidden } = usePrivacy();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localDateFromNative(new Date()));
  const m = usePayCredit();
  const reversal = useReverseCreditPayment();
  const simulation = useSimulateCredit();
  const plan = usePlanVsReal(Number(id));
  const [paymentId, setPaymentId] = useState<number>();
  const f = useFeedback();
  if (q.isPending)
    return (
      <Screen>
        <SkeletonRow />
      </Screen>
    );
  if (q.isError || !q.data)
    return (
      <Screen>
        <ErrorState title="Crédito no disponible" onRetry={() => void q.refetch()} />
      </Screen>
    );
  const c = q.data;
  return (
    <Screen scroll keyboard>
      <ScreenHeader title={c.name ?? 'Crédito'} back onBack={() => router.back()} />
      <Card>
        <Text>
          Saldo pendiente: {formatPrivateMoney(c.remainingBalance ?? 0, c.currency ?? 'COP', hidden)}
        </Text>
        <Text>Tasa efectiva anual (EA): {c.annualRate ?? 0}%</Text>
        <Text>Próximo pago: {c.nextPaymentDate ?? 'Sin fecha'}</Text>
      </Card>
      <MoneyInput label="Pago" currency={c.currency ?? 'COP'} value={amount} onChangeText={setAmount} />
      <FinancialDateField label="Fecha de pago" value={date} onChange={setDate} />
      <Button
        loading={m.isPending}
        disabled={m.isPending}
        onPress={() => {
          if (Number(amount))
            m.mutate(
              { id: Number(id), data: { amount: Number(amount), paymentDate: date } },
              {
                onSuccess: (response) => {
                  f.show('Pago registrado.');
                  setPaymentId(response.paymentId);
                  setAmount('');
                },
              },
            );
        }}
      >
        Registrar pago
      </Button>
      {paymentId && (
        <Button
          variant="danger"
          loading={reversal.isPending}
          onPress={() =>
            Alert.alert('¿Revertir este pago?', 'Se restaurará el efecto financiero asociado a este pago.', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Revertir',
                style: 'destructive',
                onPress: () =>
                  reversal.mutate(
                    { creditId: Number(id), paymentId },
                    {
                      onSuccess: () => {
                        f.show('Pago revertido.');
                        setPaymentId(undefined);
                      },
                      onError: () => f.show('Este pago ya fue revertido.'),
                    },
                  ),
              },
            ])
          }
        >
          Revertir pago
        </Button>
      )}
      <Card>
        <Text>Plan vs. real</Text>
        {plan.isPending ? (
          <Text>Cargando…</Text>
        ) : plan.data ? (
          <>
            <Text>
              Planificado:{' '}
              {formatPrivateMoney(plan.data.plannedTotalToDate ?? 0, c.currency ?? 'COP', hidden)}
            </Text>
            <Text>
              Pagado: {formatPrivateMoney(plan.data.realTotalPaid ?? 0, c.currency ?? 'COP', hidden)}
            </Text>
            <Text>
              Estado:{' '}
              {plan.data.status === 'ATRASADO'
                ? 'Atrasado'
                : plan.data.status === 'ADELANTADO'
                  ? 'Adelantado'
                  : 'Al día'}
            </Text>
          </>
        ) : (
          <Text>No hay información disponible.</Text>
        )}
      </Card>
      <Button
        variant="secondary"
        loading={simulation.isPending}
        onPress={() =>
          simulation.mutate({
            id: Number(id),
            data: {
              principal: c.principal ?? 0,
              annualRate: c.annualRate ?? 0,
              termMonths: c.termMonths ?? 0,
              disbursementDate: c.disbursementDate ?? date,
              paymentDay: c.paymentDay ?? 1,
            },
          })
        }
      >
        Ver simulación
      </Button>
      {simulation.data && (
        <Card>
          <Text>Simulación</Text>
          <Text>Estos valores son una proyección y no modifican tu crédito.</Text>
          <Text>
            Cuota estimada:{' '}
            {formatPrivateMoney(
              (simulation.data as { installmentValue?: number }).installmentValue ?? 0,
              c.currency ?? 'COP',
              hidden,
            )}
          </Text>
        </Card>
      )}
    </Screen>
  );
}
