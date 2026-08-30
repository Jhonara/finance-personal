import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import { useExpenseMutation } from '@/features/mutations';
import { useAccounts } from '@/features/accounts/use-accounts';
import { ScreenHeader } from '@/ui/headers';
import { Button, DateField, Input, MoneyInput, Screen, SelectField } from '@/ui/primitives';

export default function NewExpenseScreen() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const mutation = useExpenseMutation();
  const accounts = useAccounts();
  const submit = () => {
    const accountId = accounts.data?.find((account) => account.active)?.id;
    if (!accountId || !Number(amount)) return;
    mutation.mutate(
      {
        amount: Number(amount),
        accountId,
        expenseDate: '2026-08-30',
        paymentType: 'CASH',
        expenseType: 'VARIABLE',
        description,
      },
      { onSuccess: () => router.back() },
    );
  };
  return (
    <Screen scroll keyboard>
      <ScreenHeader
        title="Nuevo gasto"
        subtitle="Vista previa sin guardar"
        back
        onBack={() => router.back()}
      />
      <View style={styles.form}>
        <MoneyInput label="Monto" value={amount} onChangeText={setAmount} />
        <SelectField label="Cuenta" placeholder="Selecciona una cuenta" />
        <SelectField label="Categoría" placeholder="Selecciona una categoría" />
        <DateField value="2026-08-30" />
        <Input label="Descripción" placeholder="Opcional" value={description} onChangeText={setDescription} />
        <Button loading={mutation.isPending} onPress={submit}>
          Guardar gasto
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg, paddingTop: spacing.md } });
