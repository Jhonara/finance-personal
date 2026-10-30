import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { useCredit } from '@/features/secondary/use-secondary';
import { useCreditAmortization } from '@/features/credits/use-amortization';
import { RecordedPayments } from '@/features/credits/amortization-components';
import { usePrivacy } from '@/privacy/privacy-provider';
import { spacing, typography } from '@/theme';
import { Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { ErrorState, Skeleton } from '@/ui/states';

export default function CreditPayments() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const creditId = Number(id);
  const credit = useCredit(creditId);
  const history = useCreditAmortization(creditId);
  const { hidden } = usePrivacy();
  return (
    <Screen
      scroll
      style={{ gap: spacing.lg }}
      refreshing={history.isRefetching}
      onRefresh={() => void history.refetch()}
    >
      <ScreenHeader
        title="Pagos del crédito"
        subtitle={credit.data?.name ?? 'Historial'}
        back
        onBack={() => router.back()}
      />
      <Text style={typography.bodySecondary}>
        Aquí aparecen todos los pagos que anotaste para este crédito, incluso si no elegiste una cuenta. Los
        pagos anteriores a un extracto actualizado se conservan, pero ya están incluidos en ese saldo.
      </Text>
      {!Number.isSafeInteger(creditId) || creditId <= 0 ? (
        <ErrorState />
      ) : history.isPending ? (
        <Skeleton height={180} />
      ) : history.data ? (
        <RecordedPayments
          payments={history.data.payments}
          currency={history.data.currency}
          hidden={hidden}
          initialExpanded
        />
      ) : (
        <ErrorState onRetry={() => void history.refetch()} />
      )}
    </Screen>
  );
}
