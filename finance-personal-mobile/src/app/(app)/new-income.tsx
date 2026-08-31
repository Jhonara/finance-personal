import { useState } from 'react';
import { router } from 'expo-router';
import { Button, Input, MoneyInput, Screen, SelectField } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useIncomeMutation } from '@/features/mutations';
import { FinancialDateField } from '@/ui/financial-date-field';
import { localDateFromNative } from '@/utils/local-date';

export default function NewIncomeScreen() {
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState<number>();
  const [incomeDate, setIncomeDate] = useState(() => localDateFromNative(new Date()));
  const mutation = useIncomeMutation();
  const accounts = useAccounts();
  const submit = () => {
    if (!account || !Number(amount)) return;
    mutation.mutate(
      {
        amount: Number(amount),
        accountId: account,
        incomeDate,
        incomeType: 'SALARY',
      },
      { onSuccess: () => router.back() },
    );
  };
  return (
    <Screen scroll keyboard>
      <ScreenHeader title="Nuevo ingreso" back onBack={() => router.back()} />
      <MoneyInput value={amount} onChangeText={setAmount} />
      <SelectField
        label="Cuenta"
        value={accounts.data?.find((a) => a.id === account)?.name}
        onPress={() => setAccount(accounts.data?.find((a) => a.active)?.id)}
      />
      <Input label="Descripción" />
      <FinancialDateField label="Fecha" value={incomeDate} onChange={setIncomeDate} />
      <Button loading={mutation.isPending} onPress={submit}>
        Guardar ingreso
      </Button>
    </Screen>
  );
}
