import { useInfiniteQuery } from '@tanstack/react-query';
import { getTransactionPage, type TransactionFilters } from './transactions-api';
export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: TransactionFilters) => [...transactionKeys.all, filters] as const,
};
export function useTransactions(filters: TransactionFilters = {}) {
  return useInfiniteQuery({
    queryKey: transactionKeys.list(filters),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getTransactionPage(pageParam, filters),
    getNextPageParam: (page) => (page.last ? undefined : (page.page ?? 0) + 1),
  });
}
