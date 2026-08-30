import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useAccountUpdateMutation, useOpeningBalanceMutation } from '@/features/mutations';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { Button, Input, MoneyInput, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { accountConflict, type AccountConflict } from '@/features/accounts/account-conflicts';
export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountsQuery = useAccounts();
  const account = accountsQuery.data?.find((a) => a.id === Number(id));
  const update = useAccountUpdateMutation();
  const opening = useOpeningBalanceMutation();
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [conflict, setConflict] = useState<AccountConflict>(null);
  const { hidden } = usePrivacy();
  if (!account)
    return (
      <Screen>
        <Text>Cuenta no encontrada.</Text>
      </Screen>
    );
  const change = (active: boolean) =>
    update.mutate(
      {
        id: account.id!,
        data: { name: account.name, type: account.type, active, version: account.version ?? 0 },
      },
      { onError: (error) => setConflict(accountConflict(error, 'update')) },
    );
  const save = () =>
    update.mutate(
      {
        id: account.id!,
        data: {
          name: name || account.name,
          type: account.type,
          active: account.active,
          version: account.version ?? 0,
        },
      },
      { onError: (error) => setConflict(accountConflict(error, 'update')) },
    );
  return (
    <Screen scroll keyboard>
      <ScreenHeader title={account.name ?? 'Cuenta'} back onBack={() => router.back()} />
      <Text>
        {account.type} · {account.currency}
      </Text>
      <Text>{formatPrivateMoney(0, account.currency ?? 'COP', hidden)}</Text>
      <Input label="Nombre" value={name || account.name || ''} onChangeText={setName} />
      <Button onPress={save} loading={update.isPending}>
        Guardar cambios
      </Button>
      <Button onPress={() => (account.active ? setConfirm(true) : change(true))} loading={update.isPending}>
        {account.active ? 'Desactivar cuenta' : 'Reactivar cuenta'}
      </Button>
      <MoneyInput label="Saldo inicial" value={amount} onChangeText={setAmount} />
      <Button
        loading={opening.isPending}
        onPress={() =>
          opening.mutate(
            {
              id: account.id!,
              data: { amount: Number(amount), effectiveDate: new Date().toISOString().slice(0, 10) },
            },
            {
              onSuccess: () => router.back(),
              onError: (error) => setConflict(accountConflict(error, 'openingBalance')),
            },
          )
        }
      >
        Registrar saldo inicial
      </Button>
      <Modal transparent visible={confirm}>
        <View>
          <Text>¿Desactivar esta cuenta?</Text>
          <Button
            onPress={() => {
              setConfirm(false);
              change(false);
            }}
          >
            Desactivar
          </Button>
          <Button variant="ghost" onPress={() => setConfirm(false)}>
            Cancelar
          </Button>
        </View>
      </Modal>
      <Modal transparent visible={conflict !== null}>
        <View>
          <Text>
            {conflict === 'VERSION'
              ? 'Esta cuenta cambió desde que la abriste.'
              : 'Esta cuenta ya tiene un saldo inicial registrado.'}
          </Text>
          <Text>
            {conflict === 'VERSION'
              ? 'Recarga la información antes de volver a guardar para evitar sobrescribir cambios recientes.'
              : 'Los cambios posteriores deben registrarse mediante movimientos financieros, no creando otro saldo inicial.'}
          </Text>
          {conflict === 'VERSION' && (
            <Button
              onPress={() => {
                setConflict(null);
                void accountsQuery.refetch();
              }}
            >
              Recargar
            </Button>
          )}
          <Button variant="ghost" onPress={() => setConflict(null)}>
            Cancelar
          </Button>
        </View>
      </Modal>
    </Screen>
  );
}
