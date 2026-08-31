import { useState } from 'react';
import { router } from 'expo-router';
import { useCreateSaving } from '@/features/secondary/use-secondary';
import { useFeedback } from '@/feedback/feedback-provider';
import { Button, Input, MoneyInput, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
export default function SavingForm() {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const m = useCreateSaving();
  const f = useFeedback();
  return (
    <Screen scroll keyboard>
      <ScreenHeader title="Nueva meta" back onBack={() => router.back()} />
      <Input label="Nombre" value={name} onChangeText={setName} />
      <MoneyInput label="Monto objetivo" value={amount} onChangeText={setAmount} />
      <Button
        loading={m.isPending}
        disabled={m.isPending}
        onPress={() => {
          if (name && Number(amount))
            m.mutate(
              { name, targetAmount: Number(amount) },
              {
                onSuccess: () => {
                  f.show('Meta de ahorro creada.');
                  router.back();
                },
              },
            );
        }}
      >
        Crear meta
      </Button>
    </Screen>
  );
}
