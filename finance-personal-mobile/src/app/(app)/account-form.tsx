import { useState } from 'react';
import { router } from 'expo-router';
import { Button, Input, Screen, SelectField } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { useAccountMutation } from '@/features/mutations';
export default function AccountForm() {
  const [name, setName] = useState('');
  const [type, setType] = useState<'CASH' | 'BANK'>('CASH');
  const mutation = useAccountMutation();
  return (
    <Screen scroll keyboard>
      <ScreenHeader title="Nueva cuenta" back onBack={() => router.back()} />
      <Input label="Nombre" value={name} onChangeText={setName} />
      <SelectField
        label="Tipo"
        value={type === 'CASH' ? 'Efectivo' : 'Banco'}
        onPress={() => setType(type === 'CASH' ? 'BANK' : 'CASH')}
      />
      <Input label="Moneda" value="COP" editable={false} />
      <Button
        loading={mutation.isPending}
        onPress={() => mutation.mutate({ name, type, currency: 'COP' }, { onSuccess: () => router.back() })}
      >
        Crear cuenta
      </Button>
    </Screen>
  );
}
