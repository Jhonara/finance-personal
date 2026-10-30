import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api, useAuth } from '@/auth/auth-provider';
import { toApiError } from '@/api/errors';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useNativeIntents } from '@/features/shortcuts/native-intents-provider';
import {
  useWalletCards,
  walletCardsKey,
  type WalletCard,
  type WalletCardInput,
} from '@/features/shortcuts/wallet-api';
import { AppAlert } from '@/feedback/app-alert';
import { useUnsavedForm } from '@/features/forms/use-unsaved-form';
import { Button, Card, Input, Screen, SelectField } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { ModalSelector } from '@/ui/modal-selector';
import { ErrorState, SkeletonRow } from '@/ui/states';
import { spacing, typography } from '@/theme';

export default function NativeShortcutsSettings() {
  const native = useNativeIntents();
  const auth = useAuth();
  const cards = useWalletCards();
  const accounts = useAccounts();
  const client = useQueryClient();
  const [editing, setEditing] = useState<Partial<WalletCard> | null>(null);
  const [selector, setSelector] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const guard = useUnsavedForm({ dirty: editing !== null, busy, suspended: selector });
  const eligibleAccounts = (accounts.data ?? []).filter(
    (a) => a.active && ['BANK', 'SAVINGS', 'DIGITAL_WALLET'].includes(a.type ?? ''),
  );
  const run = async (operation: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await operation();
      await client.invalidateQueries({ queryKey: walletCardsKey });
    } catch (failure) {
      setError(toApiError(failure).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const save = () =>
    void run(async () => {
      if (!editing?.name?.trim() || !editing.reference?.trim() || !editing.accountId || !editing.kind) {
        setError('Completa el nombre, el alias y la cuenta de la tarjeta.');
        return;
      }
      const input: WalletCardInput = {
        name: editing.name.trim(),
        reference: editing.reference.trim(),
        kind: editing.kind,
        accountId: editing.accountId,
      };
      await api.put('/inbox/cards', input);
      setEditing(null);
    });
  return (
    <Screen scroll keyboard style={{ gap: spacing.lg }}>
      <ScreenHeader
        title="Atajos y tarjetas"
        subtitle="Compras detectadas, siempre por revisar."
        back
        onBack={() =>
          guard.request(() => (router.canGoBack() ? router.back() : router.replace('/(app)/inbox')))
        }
      />
      <Text style={typography.bodySecondary}>
        {native.available
          ? 'Acciones nativas disponibles en esta versión instalada.'
          : 'Las acciones de iOS requieren la versión nativa de Finance Personal. Expo Go no las incluye.'}
      </Text>
      {native.error ? (
        <Text accessibilityLiveRegion="polite" style={typography.body}>
          {native.error}
        </Text>
      ) : null}
      {native.error && native.pending.length === 0 && (
        <Button disabled={native.busy} loading={native.busy} onPress={native.retry}>
          Volver a intentar
        </Button>
      )}
      {native.requiresLogin && (
        <Button
          variant="secondary"
          onPress={() =>
            guard.request(() => {
              void auth.logout().catch(() => setError('No pudimos cerrar la sesión. Inténtalo de nuevo.'));
            })
          }
        >
          Volver a iniciar sesión
        </Button>
      )}
      {native.pending.length > 0 && (
        <Card style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={typography.cardTitle}>Pendientes en este iPhone · {native.pending.length}</Text>
          <Button disabled={native.busy} loading={native.busy} onPress={native.retry}>
            Volver a intentar
          </Button>
          {native.pending.map((invocation) => (
            <View key={invocation.id} style={{ gap: spacing.sm }}>
              <Text style={typography.body}>
                {invocation.name === 'importWallet' ? 'Compra de Wallet' : 'Acción de Atajos'}
              </Text>
              <Button
                variant="ghost"
                disabled={native.busy}
                onPress={() =>
                  AppAlert.alert(
                    '¿Descartar esta entrada?',
                    'Se elimina la entrada pendiente de este iPhone. Un borrador que ya llegó al servidor se conserva en Por revisar.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Descartar',
                        style: 'destructive',
                        onPress: () => void run(() => native.discard(invocation.id)),
                      },
                    ],
                  )
                }
              >
                Descartar entrada
              </Button>
            </View>
          ))}
        </Card>
      )}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={typography.body}>
          {error}
        </Text>
      ) : null}
      {editing ? (
        <Card style={{ padding: spacing.lg, gap: spacing.md }}>
          <Input
            label="Nombre de la tarjeta"
            value={editing.name ?? ''}
            maxLength={80}
            disabled={busy}
            onChangeText={(name) => setEditing({ ...editing, name })}
          />
          <Input
            label="Referencia o alias que recibe el atajo"
            value={editing.reference ?? ''}
            maxLength={80}
            disabled={busy || Boolean(editing.id)}
            onChangeText={(reference) => setEditing({ ...editing, reference })}
          />
          <Text style={typography.caption}>
            Un alias como Visa personal. Nunca el número completo ni el código de seguridad.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['DEBIT', 'CREDIT'] as const).map((kind) => (
              <Button
                key={kind}
                disabled={busy}
                variant={editing.kind === kind ? 'primary' : 'secondary'}
                onPress={() => setEditing({ ...editing, kind })}
              >
                {kind === 'DEBIT' ? 'Débito' : 'Crédito'}
              </Button>
            ))}
          </View>
          <SelectField
            label={editing.kind === 'CREDIT' ? 'Cuenta desde la que pagas la tarjeta' : 'Cuenta de débito'}
            value={accounts.data?.find((a) => a.id === editing.accountId)?.name}
            disabled={busy}
            onPress={() => setSelector(true)}
          />
          {editing.kind === 'CREDIT' && (
            <Text style={typography.bodySecondary}>
              Esta cuenta paga la tarjeta. Las compras de crédito quedarán pendientes y no se descontarán de
              ella. El registro de deuda de tarjetas aún no está disponible.
            </Text>
          )}
          <Button loading={busy} disabled={busy} onPress={save}>
            Guardar tarjeta
          </Button>
          <Button variant="ghost" disabled={busy} onPress={() => setEditing(null)}>
            Cancelar
          </Button>
        </Card>
      ) : (
        <Button onPress={() => setEditing({ kind: 'DEBIT' })}>Vincular tarjeta</Button>
      )}
      {cards.isPending ? (
        <SkeletonRow />
      ) : cards.isError ? (
        <ErrorState onRetry={() => void cards.refetch()} />
      ) : (
        cards.data?.map((card) => (
          <Card key={card.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text style={typography.cardTitle}>
              {card.name} · {card.kind === 'DEBIT' ? 'Débito' : 'Crédito'}
            </Text>
            <Text style={typography.bodySecondary}>{card.reference}</Text>
            <Text style={typography.caption}>
              {card.kind === 'CREDIT' ? 'Cuenta para pagar la tarjeta: ' : 'Cuenta: '}
              {accounts.data?.find((a) => a.id === card.accountId)?.name ?? 'No disponible'}
            </Text>
            <Button variant="outline" disabled={busy || editing !== null} onPress={() => setEditing(card)}>
              Editar
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onPress={() =>
                AppAlert.alert('¿Desvincular tarjeta?', 'Sus borradores se conservan para revisión.', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Desvincular',
                    style: 'destructive',
                    onPress: () =>
                      void run(async () => {
                        await api.delete(`/inbox/cards/${card.id}`);
                      }),
                  },
                ])
              }
            >
              Desvincular
            </Button>
          </Card>
        ))
      )}
      <ModalSelector
        visible={selector}
        label="Cuenta"
        options={eligibleAccounts.map((a) => ({ id: a.id!, label: a.name!, subtitle: a.currency }))}
        loading={accounts.isPending}
        selectedId={editing?.accountId}
        onClose={() => setSelector(false)}
        onSelect={(accountId) => {
          if (editing) setEditing({ ...editing, accountId });
          setSelector(false);
        }}
      />
    </Screen>
  );
}
