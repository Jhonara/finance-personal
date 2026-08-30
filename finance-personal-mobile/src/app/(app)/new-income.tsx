import { useState } from 'react';
import { router } from 'expo-router';
import { Button, Input, MoneyInput, Screen, SelectField } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useIncomeMutation } from '@/features/mutations';

export default function NewIncomeScreen() {
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState<number>();
  const mutation = useIncomeMutation();
  const accounts = useAccounts();
  const submit = () => {
    if (!account || !Number(amount)) return;
    mutation.mutate(
      {
        amount: Number(amount),
        accountId: account,
        incomeDate: new Date().toISOString().slice(0, 10),
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
      <Button loading={mutation.isPending} onPress={submit}>
        Guardar ingreso
      </Button>
    </Screen>
  );
}
