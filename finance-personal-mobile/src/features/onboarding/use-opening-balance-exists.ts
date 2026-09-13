import { useQuery } from '@tanstack/react-query';

import { getTransactionPage } from '@/features/transactions/transactions-api';

export function useOpeningBalanceExists(enabled: boolean) {
  return useQuery({
    queryKey: ['onboarding', 'opening-balance-exists'],
    queryFn: () => getTransactionPage(0, { type: 'OPENING_BALANCE', status: 'POSTED' }, 1),
    enabled,
    staleTime: 60_000,
    select: (page) => (page.totalElements ?? page.content?.length ?? 0) > 0,
  });
}
