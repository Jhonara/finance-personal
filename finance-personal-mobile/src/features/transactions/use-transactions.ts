import { useInfiniteQuery } from '@tanstack/react-query';
import { getTransactionPage } from './transactions-api';
import { normalizeTransactionFilters, type TransactionFilters } from './filters';
export type { TransactionFilters } from './filters';
export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: TransactionFilters) =>
    [...transactionKeys.all, normalizeTransactionFilters(filters)] as const,
};
export function useTransactions(filters: TransactionFilters = {}) {
  const normalizedFilters = normalizeTransactionFilters(filters);
  return useInfiniteQuery({
    queryKey: transactionKeys.list(normalizedFilters),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getTransactionPage(pageParam, normalizedFilters),
    getNextPageParam: (page) => (page.last ? undefined : (page.page ?? 0) + 1),
  });
}
