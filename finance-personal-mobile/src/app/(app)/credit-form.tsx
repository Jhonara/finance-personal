import { useState } from 'react';
import { router } from 'expo-router';
import { useCreateCredit } from '@/features/secondary/use-secondary';
import { useFeedback } from '@/feedback/feedback-provider';
import { FinancialDateField } from '@/ui/financial-date-field';
import { Button, Input, MoneyInput, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { localDateFromNative } from '@/utils/local-date';
export default function CreditForm() {
  const [name, setName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [term, setTerm] = useState('');
  const [day, setDay] = useState('');
  const [date, setDate] = useState(localDateFromNative(new Date()));
  const m = useCreateCredit();
  const f = useFeedback();
  return (
    <Screen scroll keyboard>
      <ScreenHeader title="Nuevo crédito" back onBack={() => router.back()} />
      <Input label="Nombre" value={name} onChangeText={setName} />
      <MoneyInput label="Principal" value={principal} onChangeText={setPrincipal} />
      <Input
        label="Tasa efectiva anual (EA)"
        keyboardType="decimal-pad"
        value={rate}
        onChangeText={setRate}
      />
      <Input label="Número de cuotas" keyboardType="number-pad" value={term} onChangeText={setTerm} />
      <Input label="Día de pago" keyboardType="number-pad" value={day} onChangeText={setDay} />
      <FinancialDateField label="Fecha de desembolso" value={date} onChange={setDate} />
      <Button
        loading={m.isPending}
        disabled={m.isPending}
        onPress={() => {
          if (name && Number(principal) && Number(rate) && Number(term) && Number(day))
            m.mutate(
              {
                name,
                principal: Number(principal),
                annualRate: Number(rate),
                termMonths: Number(term),
                paymentDay: Number(day),
                disbursementDate: date,
                currency: 'COP',
              },
              {
                onSuccess: () => {
                  f.show('Crédito creado.');
                  router.back();
                },
              },
            );
        }}
      >
        Crear crédito
      </Button>
    </Screen>
  );
}
