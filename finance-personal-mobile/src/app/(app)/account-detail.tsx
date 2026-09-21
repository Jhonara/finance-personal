import { accountTypeLabel } from '@/features/accounts/account-presentation';
import { localDateFromNative } from '@/utils/local-date';
import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useAccountUpdateMutation, useOpeningBalanceMutation } from '@/features/mutations';
import { usePrivacy } from '@/privacy/privacy-provider';
import { AccountBalanceAmount } from '@/ui/account-balance';
import { Button, Card, Input, MoneyInput, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { accountConflict, type AccountConflict } from '@/features/accounts/account-conflicts';
import { currentDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { useFirstOrdinaryMovementExists } from '@/features/onboarding/use-first-ordinary-movement-exists';
import { useOpeningBalanceExists } from '@/features/onboarding/use-opening-balance-exists';
import { useDashboardMonth } from '@/features/dashboard/use-dashboard-month';
import { balanceForAccount } from '@/features/accounts/account-balances';
import { colors, spacing, typography } from '@/theme';
import { ErrorState, SkeletonRow } from '@/ui/states';
function AccountDetail() {
  const activeSession = useFormSessionActive();
  const submitting = useRef(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountsQuery = useAccounts();
  const dashboard = useDashboardMonth(currentDashboardPeriod());
  const account = accountsQuery.data?.find((a) => a.id === Number(id));
  const update = useAccountUpdateMutation();
  const opening = useOpeningBalanceMutation();
  const [amount, setAmount] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ name: string; version: number }>();
  useEffect(() => {
    if (!draft && account && typeof account.version === 'number')
      setDraft({ name: account.name ?? '', version: account.version });
  }, [account, draft]);
  const [confirm, setConfirm] = useState(false);
  const [conflict, setConflict] = useState<AccountConflict>(null);
  const { hidden } = usePrivacy();
  const openingExists = useOpeningBalanceExists(Boolean(account));
  const ordinaryMovement = useFirstOrdinaryMovementExists(Boolean(account));
  const balance = balanceForAccount(dashboard, account?.id);
  if (accountsQuery.isPending)
    return (
      <Screen>
        <SkeletonRow />
      </Screen>
    );
  if (!account || !draft)
    return (
      <Screen>
        {accountsQuery.isError || (account && typeof account.version !== 'number') ? (
          <ErrorState onRetry={() => void accountsQuery.refetch()} />
        ) : account ? (
          <SkeletonRow />
        ) : (
          <Text>Cuenta no encontrada.</Text>
        )}
      </Screen>
    );
  const change = (active: boolean) => {
    if (submitting.current) return;
    submitting.current = true;
    update.mutate(
      {
        id: account.id!,
        data: { name: account.name, type: account.type, active, version: draft.version },
      },
      {
        onError: (error) => {
          if (activeSession()) setConflict(accountConflict(error, 'update'));
        },
        onSuccess: (updated) => {
          if (activeSession() && typeof updated.version === 'number')
            setDraft({ name: updated.name ?? draft.name, version: updated.version });
        },
        onSettled: () => {
          submitting.current = false;
        },
      },
    );
  };
  const save = () => {
    if (submitting.current || !draft.name.trim()) return;
    submitting.current = true;
    update.mutate(
      {
        id: account.id!,
        data: {
          name: draft.name.trim(),
          type: account.type,
          active: account.active,
          version: draft.version,
        },
      },
      {
        onError: (error) => {
          if (activeSession()) setConflict(accountConflict(error, 'update'));
        },
        onSuccess: (updated) => {
          if (!activeSession()) return;
          setConflict(null);
          setEditing(false);
          if (typeof updated.version === 'number')
            setDraft({ name: updated.name ?? draft.name, version: updated.version });
          update.reset();
        },
        onSettled: () => {
          submitting.current = false;
        },
      },
    );
  };
  return (
    <Screen scroll keyboard style={{ gap: spacing.lg }}>
      <ScreenHeader
        title={account.name ?? 'Cuenta'}
        subtitle={`${accountTypeLabel(account.type)} · ${account.currency}`}
        back
        onBack={() => router.back()}
      />
      <Card tone="tonal" style={styles.hero}>
        <Text style={styles.label}>Saldo actual</Text>
        <AccountBalanceAmount
          balance={balance}
          currency={account.currency ?? 'COP'}
          hidden={hidden}
          style={styles.balance}
        />
      </Card>
      <Card style={styles.detail}>
        <Text>Estado · {account.active ? 'Activa' : 'Inactiva'}</Text>
        <Text>Tipo · {accountTypeLabel(account.type)}</Text>
        <Text>Moneda · {account.currency}</Text>
      </Card>
      {editing ? (
        <Card tone="info" style={styles.detail}>
          <Text style={typography.cardTitle}>Editar nombre</Text>
          <Input
            label="Nombre"
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name })}
            editable={!update.isPending}
          />
          <Button onPress={save} loading={update.isPending} disabled={!draft.name.trim()}>
            Guardar cambios
          </Button>
          <Button
            variant="ghost"
            disabled={update.isPending}
            onPress={() => {
              setEditing(false);
              setConflict(null);
              update.reset();
              setDraft({ name: account.name ?? '', version: draft.version });
            }}
          >
            Cancelar
          </Button>
        </Card>
      ) : (
        <>
          <Text>Nombre · {account.name}</Text>
          <Button variant="secondary" disabled={update.isPending} onPress={() => setEditing(true)}>
            Editar cuenta
          </Button>
        </>
      )}
      {!openingExists.data && !ordinaryMovement.data ? (
        <>
          <Text>Registra con cuánto empiezas</Text>
          <Text>Esto representa el dinero que ya tenías antes de empezar a usar Finance Personal.</Text>
          <MoneyInput label="Saldo inicial" value={amount} onChangeText={setAmount} />
          <Button
            loading={opening.isPending}
            onPress={() =>
              opening.mutate(
                {
                  id: account.id!,
                  data: { amount: Number(amount), effectiveDate: localDateFromNative(new Date()) },
                },
                {
                  onSuccess: () => {
                    if (!activeSession()) return;
                    setAmount('');
                    opening.reset();
                    void accountsQuery.refetch();
                    void dashboard.refetch();
                  },
                },
              )
            }
          >
            Registrar saldo inicial
          </Button>
        </>
      ) : openingExists.data ? (
        <Text>Saldo inicial registrado</Text>
      ) : (
        <Card tone="tonal" style={styles.detail}>
          <Text style={typography.cardTitle}>Inicio sin saldo inicial</Text>
          <Text style={typography.bodySecondary}>Comenzaste registrando movimientos directamente.</Text>
        </Card>
      )}
      <Button
        variant={account.active ? 'outline' : 'secondary'}
        tone={account.active ? 'danger' : 'success'}
        disabled={editing}
        onPress={() => (account.active ? setConfirm(true) : change(true))}
        loading={update.isPending}
      >
        {account.active ? 'Desactivar cuenta' : 'Reactivar cuenta'}
      </Button>
      <Modal transparent visible={confirm}>
        <View style={styles.modal}>
          <Text>¿Desactivar esta cuenta?</Text>
          <Button
            variant="danger"
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
        <View style={styles.modal}>
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
                void accountsQuery.refetch().then((result) => {
                  const fresh = result.data?.find((item) => item.id === account.id);
                  if (activeSession() && fresh && typeof fresh.version === 'number')
                    setDraft({ name: fresh.name ?? '', version: fresh.version });
                });
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
const styles = StyleSheet.create({
  hero: { gap: 4, padding: 20 },
  detail: { gap: 8, padding: 16 },
  label: { ...typography.label },
  balance: { ...typography.moneyLarge, color: colors.textPrimary },
  modal: {
    marginTop: 96,
    marginHorizontal: 20,
    padding: 20,
    gap: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
});

export default withFormSession(AccountDetail);
