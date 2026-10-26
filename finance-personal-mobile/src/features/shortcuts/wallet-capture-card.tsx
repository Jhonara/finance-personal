import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/auth/auth-provider';
import { toApiError } from '@/api/errors';
import type { Draft } from '@/features/inbox/inbox-api';
import { useWalletCards } from './wallet-api';
import { Button, Card } from '@/ui/primitives';
import { ModalSelector } from '@/ui/modal-selector';
import { spacing, typography } from '@/theme';

export function WalletCaptureCard({
  draft,
  onChange,
  disabled,
}: {
  draft: Draft;
  onChange(draft: Draft): void;
  disabled: boolean;
}) {
  const cards = useWalletCards();
  const client = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const credit = draft.capture?.cardKind === 'CREDIT';
  const choose = async (cardId: number) => {
    if (lock.current || disabled) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await api.post<Draft>(`/inbox/${draft.id}/card`, { version: draft.version, cardId });
      onChange(response.data);
      setVisible(false);
      await client.invalidateQueries({ queryKey: ['inbox'] });
    } catch (failure) {
      setError(toApiError(failure).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Card tone="info" style={{ padding: spacing.lg, gap: spacing.sm }}>
      <Text style={typography.cardTitle}>
        {credit ? 'Compra con tarjeta de crédito' : 'Compra detectada en Wallet'}
      </Text>
      <Text style={typography.bodySecondary}>
        {credit
          ? 'Se conserva pendiente. El registro de deuda de tarjetas aún no está disponible; esta compra no se descontará de tu cuenta bancaria.'
          : 'Comprueba la tarjeta y el cobro. Detectar una compra no confirma que el banco la haya cobrado.'}
      </Text>
      <Text style={typography.caption}>{draft.capture?.cardReference ?? 'Tarjeta por identificar'}</Text>
      {draft.capture?.occurredAt && (
        <Text style={typography.caption}>Hora recibida: {draft.capture.occurredAt}</Text>
      )}
      {!credit && (
        <Button variant="secondary" disabled={busy || disabled} onPress={() => setVisible(true)}>
          Elegir tarjeta de esta compra
        </Button>
      )}
      <Button variant="ghost" disabled={busy || disabled} onPress={() => router.push('/(app)/shortcuts')}>
        Gestionar tarjetas
      </Button>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={typography.body}>
          {error}
        </Text>
      ) : null}
      <ModalSelector
        visible={visible}
        label="Tarjeta de la compra"
        loading={cards.isPending}
        options={(cards.data ?? []).map((card) => ({
          id: card.id!,
          label: card.name!,
          subtitle: card.kind === 'CREDIT' ? 'Crédito · no descontar de cuenta' : 'Débito',
        }))}
        onClose={() => {
          if (!busy) setVisible(false);
        }}
        onSelect={(id) => void choose(id)}
      />
    </Card>
  );
}
