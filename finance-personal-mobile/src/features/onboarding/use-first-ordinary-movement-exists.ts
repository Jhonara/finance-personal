import { useQueries } from '@tanstack/react-query';
import { getTransactionPage } from '@/features/transactions/transactions-api';
import { hasHistoricalOrdinaryMovement } from './first-ordinary-movement';

const ordinaryTypes = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;

export function useFirstOrdinaryMovementExists(enabled: boolean, accountId?: number) {
  const queries = useQueries({
    queries: ordinaryTypes.map((type) => ({
      queryKey: [
        'onboarding',
        'ordinary-movement-exists',
        type,
        ...(accountId === undefined ? [] : [accountId]),
      ],
      queryFn: () => getTransactionPage(0, { type, status: 'POSTED', accountId }, 1),
      enabled,
      staleTime: 60_000,
      select: (page: { totalElements?: number; content?: unknown[] }) =>
        (page.totalElements ?? page.content?.length ?? 0) > 0,
    })),
  });
  return {
    data: hasHistoricalOrdinaryMovement(queries.map((query) => query.data)),
    isPending: enabled && queries.some((query) => query.isPending),
    isError: enabled && queries.some((query) => query.isError),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
