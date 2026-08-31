import { useState } from 'react';
import { router } from 'expo-router';
import { Button, MoneyInput, Screen, SelectField } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useTransferMutation } from '@/features/mutations';
import { FinancialDateField } from '@/ui/financial-date-field';
import { localDateFromNative } from '@/utils/local-date';
export default function NewTransferScreen() {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<number>();
  const [destination, setDestination] = useState<number>();
  const [effectiveDate, setEffectiveDate] = useState(() => localDateFromNative(new Date()));
  const accounts = useAccounts();
  const mutation = useTransferMutation();
  const active = accounts.data?.filter((a) => a.active) ?? [];
  const submit = () => {
    if (!source || !destination || source === destination || !Number(amount)) return;
    mutation.mutate(
      {
        sourceAccountId: source,
        destinationAccountId: destination,
        amount: Number(amount),
        effectiveDate,
      },
      { onSuccess: () => router.back() },
    );
  };
  return (
    <Screen scroll keyboard>
      <ScreenHeader title="Nueva transferencia" back onBack={() => router.back()} />
      <SelectField
        label="Origen"
        value={active.find((a) => a.id === source)?.name}
        onPress={() => setSource(active[0]?.id)}
      />
      <SelectField
        label="Destino"
        value={active.find((a) => a.id === destination)?.name}
        onPress={() =>
          setDestination(
            active.find(
              (a) => a.id !== source && a.currency === active.find((s) => s.id === source)?.currency,
            )?.id,
          )
        }
      />
      <MoneyInput value={amount} onChangeText={setAmount} />
      <FinancialDateField label="Fecha" value={effectiveDate} onChange={setEffectiveDate} />
      <Button loading={mutation.isPending} onPress={submit}>
        Transferir
      </Button>
    </Screen>
  );
}
