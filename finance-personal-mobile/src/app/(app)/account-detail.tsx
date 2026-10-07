import { MotionModal as Modal } from '@/ui/motion-modal';
import { accountTypeLabel } from '@/features/accounts/account-presentation';
import { localDateFromNative } from '@/utils/local-date';
import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useAccountUpdateMutation, useOpeningBalanceMutation } from '@/features/mutations';
import { usePrivacy } from '@/privacy/privacy-provider';
import { useFeedback } from '@/feedback/feedback-provider';
import { AccountBalanceAmount } from '@/ui/account-balance';
import { Button, Card, Input, MoneyInput, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { accountConflict, type AccountConflict } from '@/features/accounts/account-conflicts';
import { currentDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { useFirstOrdinaryMovementExists } from '@/features/onboarding/use-first-ordinary-movement-exists';
import { useOpeningBalanceExists } from '@/features/onboarding/use-opening-balance-exists';
import { useDashboardMonth } from '@/features/dashboard/use-dashboard-month';
import { balanceForAccount } from '@/features/accounts/account-balances';
import { colors, radius, shadows, spacing, typography } from '@/theme';
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
  const [amountError, setAmountError] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ name: string; version: number }>();
  useEffect(() => {
    if (!draft && account && typeof account.version === 'number')
      setDraft({ name: account.name ?? '', version: account.version });
  }, [account, draft]);
  const [confirm, setConfirm] = useState(false);
  const [conflict, setConflict] = useState<AccountConflict>(null);
  const { hidden } = usePrivacy();
  const feedback = useFeedback();
  const openingExists = useOpeningBalanceExists(Boolean(account), account?.id);
  const ordinaryMovement = useFirstOrdinaryMovementExists(Boolean(account), account?.id);
  const balance = balanceForAccount(dashboard, account?.id);
  const openingReady = !openingExists.isPending && !ordinaryMovement.isPending;
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
    <Screen entry scroll keyboard style={{ gap: spacing.lg }}>
      <ScreenHeader
        title={account.name ?? 'Cuenta'}
        subtitle={`${accountTypeLabel(account.type)} · ${account.currency}`}
        back
        onBack={() => router.back()}
      />
      <LinearGradient colors={[colors.heroStart, colors.heroEnd]} style={styles.hero}>
        <View style={styles.heroHead}>
          <View style={styles.heroIcon}>
            <Ionicons name="wallet-outline" size={23} color={colors.mint} />
          </View>
          <Text style={styles.heroCurrency}>{account.currency ?? 'COP'}</Text>
        </View>
        <Text style={styles.heroLabel}>SALDO REGISTRADO</Text>
        <AccountBalanceAmount
          balance={balance}
          currency={account.currency ?? 'COP'}
          hidden={hidden}
          style={styles.balance}
        />
        <Text style={styles.heroHint}>Se actualiza con tus movimientos registrados.</Text>
      </LinearGradient>
      <Card style={styles.detail}>
        <Text style={styles.sectionTitle}>Detalles de la cuenta</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Estado</Text>
          <Text style={styles.infoValue}>{account.active ? 'Activa' : 'Inactiva'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tipo</Text>
          <Text style={styles.infoValue}>{accountTypeLabel(account.type)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Moneda</Text>
          <Text style={styles.infoValue}>{account.currency}</Text>
        </View>
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
        <Card style={styles.editCard}>
          <View style={styles.editCopy}>
            <Ionicons name="pencil-outline" size={20} color={colors.success} />
            <Text style={typography.cardTitle}>Nombre de la cuenta</Text>
          </View>
          <Text style={typography.bodySecondary}>{account.name}</Text>
          <Button variant="secondary" disabled={update.isPending} onPress={() => setEditing(true)}>
            Editar cuenta
          </Button>
        </Card>
      )}
      {!openingReady ? (
        <Card style={styles.detail}>
          <SkeletonRow />
        </Card>
      ) : openingExists.isError || ordinaryMovement.isError ? (
        <Card style={styles.detail}>
          <Text style={styles.sectionTitle}>No pudimos verificar el saldo inicial</Text>
          <Button
            variant="secondary"
            onPress={() => {
              void openingExists.refetch();
              void ordinaryMovement.refetch();
            }}
          >
            Reintentar
          </Button>
        </Card>
      ) : !openingExists.data && !ordinaryMovement.data ? (
        <Card style={styles.detail}>
          <View style={styles.editCopy}>
            <Ionicons name="add-circle-outline" size={22} color={colors.success} />
            <Text style={styles.sectionTitle}>Registra con cuánto empiezas</Text>
          </View>
          <Text style={typography.bodySecondary}>
            Dinero que ya tenías en esta cuenta antes de empezar a usar la app.
          </Text>
          <MoneyInput
            label="Saldo inicial"
            currency={account.currency ?? 'COP'}
            value={amount}
            onChangeText={(value) => {
              setAmount(value);
              setAmountError('');
            }}
            error={amountError}
          />
          <Button
            loading={opening.isPending}
            disabled={opening.isPending}
            onPress={() => {
              if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
                setAmountError('Ingresa un monto mayor que cero.');
                return;
              }
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
                  onError: (error) => {
                    if (!activeSession()) return;
                    setConflict(accountConflict(error, 'openingBalance'));
                    if (!accountConflict(error, 'openingBalance'))
                      feedback.show('No fue posible registrar el saldo inicial.', 'error');
                  },
                },
              );
            }}
          >
            Registrar saldo inicial
          </Button>
        </Card>
      ) : openingExists.data ? (
        <Card tone="success" style={styles.detail}>
          <Text style={styles.sectionTitle}>Saldo inicial registrado</Text>
          <Text style={typography.bodySecondary}>Los cambios nuevos se registran como movimientos.</Text>
        </Card>
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
  hero: { gap: spacing.sm, padding: spacing.xl, borderRadius: 28, ...shadows.card },
  heroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.medium,
    backgroundColor: colors.heroSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCurrency: { ...typography.label, color: '#B9E8DD' },
  heroLabel: { ...typography.caption, color: '#B9E8DD', fontWeight: '700', letterSpacing: 0.5 },
  heroHint: { ...typography.caption, color: '#C3E5E4' },
  detail: { gap: spacing.md, padding: spacing.lg },
  editCard: { gap: spacing.md, padding: spacing.lg },
  editCopy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...typography.cardTitle, color: colors.primaryStrong, flexShrink: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  infoLabel: { ...typography.bodySecondary },
  infoValue: { ...typography.label, color: colors.primaryStrong, textAlign: 'right', flexShrink: 1 },
  balance: { ...typography.moneyLarge, color: colors.surface },
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
