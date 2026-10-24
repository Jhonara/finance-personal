import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { getTransactionDetail } from './transactions-api';
import { presentTransaction } from './transaction-presentation';
import { TransactionDetailSheet } from '@/ui/transaction-detail-sheet';
import { MotionModal } from '@/ui/motion-modal';
import { Screen, Button } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { typography } from '@/theme';

export function LinkedTransactionDetail({
  id,
  hidden,
  onClose,
}: {
  id?: number;
  hidden: boolean;
  onClose(): void;
}) {
  const query = useQuery({
    queryKey: ['transactions', 'detail', id],
    queryFn: () => getTransactionDetail(id!),
    enabled: Boolean(id),
    retry: false,
  });
  if (!id) return null;
  if (query.data)
    return (
      <TransactionDetailSheet
        transaction={presentTransaction(query.data)}
        privacyHidden={hidden}
        onClose={onClose}
      />
    );
  return (
    <MotionModal visible onRequestClose={onClose}>
      <Screen>
        <ScreenHeader title="Movimiento" back onBack={onClose} />
        <Text style={typography.bodySecondary}>
          {query.isError
            ? 'No pudimos abrir este movimiento. Puedes volver a intentar.'
            : 'Consultando el movimiento…'}
        </Text>
        {query.isError && <Button onPress={() => void query.refetch()}>Reintentar</Button>}
      </Screen>
    </MotionModal>
  );
}
