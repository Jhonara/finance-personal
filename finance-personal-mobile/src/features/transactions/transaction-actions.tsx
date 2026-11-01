import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/errors';
import { Button, Input } from '@/ui/primitives';
import { typography } from '@/theme';
import { getTransactionDetail, reverseTransaction, type Transaction } from './transactions-api';

const financialKeys = new Set([
  'transactions',
  'accounts',
  'dashboard',
  'reports',
  'budgets',
  'alerts',
  'recurrences',
  'purchase-drafts',
  'inbox',
]);

/** The server remains authoritative, including after a lost response or a second device's reversal. */
export function TransactionActions({
  transaction,
  onNavigate,
}: {
  transaction: Transaction;
  onNavigate(value: Transaction): void;
}) {
  const client = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const run = async (action: () => Promise<Transaction>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await action();
      if (!active.current) return;
      await client.invalidateQueries({ predicate: (query) => financialKeys.has(String(query.queryKey[0])) });
      if (active.current) onNavigate(result);
    } catch (failure) {
      if (active.current)
        setError(
          failure instanceof ApiError && failure.status
            ? failure.message
            : 'No pudimos confirmar el resultado. Actualiza el movimiento antes de volver a intentar.',
        );
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  };
  const link = transaction.reversalOfId ?? transaction.reversalId;
  return (
    <View style={{ gap: 10 }}>
      {transaction.originalType && (
        <Text style={typography.bodySecondary}>
          Corrección de{' '}
          {transaction.originalType === 'EXPENSE'
            ? 'un gasto'
            : transaction.originalType === 'INCOME'
              ? 'un ingreso'
              : 'una transferencia'}
          . Se contabiliza en la fecha de la reversión.
        </Text>
      )}
      {transaction.reversalReason && (
        <Text style={typography.bodySecondary}>Motivo: {transaction.reversalReason}</Text>
      )}
      {link != null && (
        <Button
          variant="secondary"
          loading={busy}
          disabled={busy}
          onPress={() => void run(() => getTransactionDetail(link))}
        >
          {transaction.reversalOfId ? 'Ver movimiento original' : 'Ver reversión'}
        </Button>
      )}
      {transaction.reversible && !confirming && (
        <Button variant="outline" tone="danger" onPress={() => setConfirming(true)}>
          Revertir movimiento
        </Button>
      )}
      {confirming && (
        <>
          <Text accessibilityRole="header" style={typography.sectionTitle}>
            Confirmar reversión
          </Text>
          <Text style={typography.bodySecondary}>
            Se registrará hoy la operación contraria y se ajustarán los saldos. El movimiento original
            conservará su historial. Esta corrección no puede revertirse de nuevo.
          </Text>
          <Input
            label="Motivo de reversión · opcional"
            value={reason}
            onChangeText={setReason}
            maxLength={255}
            editable={!busy}
          />
          <Button
            tone="danger"
            loading={busy}
            disabled={busy}
            onPress={() =>
              void run(async () => {
                const current = await getTransactionDetail(transaction.id!);
                if (!current.reversible) return current;
                return reverseTransaction(transaction.id!, reason.trim() || undefined);
              })
            }
          >
            Confirmar y revertir
          </Button>
          <Button variant="secondary" disabled={busy} onPress={() => setConfirming(false)}>
            Cancelar
          </Button>
        </>
      )}
      {error !== '' && (
        <Text accessibilityRole="alert" style={typography.bodySecondary}>
          {error}
        </Text>
      )}
    </View>
  );
}
