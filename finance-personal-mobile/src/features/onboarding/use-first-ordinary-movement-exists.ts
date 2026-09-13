import { useQueries } from '@tanstack/react-query';
import { getTransactionPage } from '@/features/transactions/transactions-api';
import { hasHistoricalOrdinaryMovement } from './first-ordinary-movement';

const ordinaryTypes = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;

export function useFirstOrdinaryMovementExists(enabled: boolean) {
  const queries = useQueries({
    queries: ordinaryTypes.map((type) => ({
      queryKey: ['onboarding', 'ordinary-movement-exists', type],
      queryFn: () => getTransactionPage(0, { type, status: 'POSTED' }, 1),
      enabled,
      staleTime: 60_000,
      select: (page: { totalElements?: number; content?: unknown[] }) =>
        (page.totalElements ?? page.content?.length ?? 0) > 0,
    })),
  });
  return {
    data: hasHistoricalOrdinaryMovement(queries.map((query) => query.data)),
    isPending: enabled && queries.some((query) => query.isPending),
  };
}
