import { useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, MoneyInput, Screen, SelectField } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useTransferMutation } from '@/features/mutations';
import { FinancialDateField } from '@/ui/financial-date-field';
import { localDateFromNative } from '@/utils/local-date';
import { useFeedback } from '@/feedback/feedback-provider';
import { isInsufficientBalanceError } from '@/features/transactions/transfer-errors';
import { financialErrorMessage, unavailableResource } from '@/features/transactions/form-errors';
import { accountKeys } from '@/features/accounts/use-accounts';
export default function NewTransferScreen() {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<number>();
  const [destination, setDestination] = useState<number>();
  const [effectiveDate, setEffectiveDate] = useState(() => localDateFromNative(new Date()));
  const accounts = useAccounts();
  const mutation = useTransferMutation();
  const feedback = useFeedback();
  const client = useQueryClient();
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
      {
        onSuccess: () => {
          feedback.show('Transferencia realizada.');
          router.back();
        },
        onError: (error) => {
          if (isInsufficientBalanceError(error)) {
            feedback.show('Saldo insuficiente para realizar la transferencia.');
            return;
          }
          const resource = unavailableResource(error);
          if (resource === 'account') {
            feedback.show('La cuenta seleccionada ya no está disponible.');
            void client.invalidateQueries({ queryKey: accountKeys.all });
            return;
          }
          const message = financialErrorMessage(error);
          if (message) feedback.show(message);
        },
      },
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
