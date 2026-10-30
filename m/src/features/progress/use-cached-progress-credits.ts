import { useCallback, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Credit } from '@/features/secondary/secondary-api';
import { secondaryKeys } from '@/features/secondary/use-secondary';

// Cache subscription only: no query observer, fetch, or additional request on Home.
export function useCachedProgressCredits() {
  const client = useQueryClient();
  const subscribe = useCallback(
    (onChange: () => void) => client.getQueryCache().subscribe(onChange),
    [client],
  );
  const snapshot = useCallback(() => {
    const state = client.getQueryState<Credit[]>(secondaryKeys.credits);
    return state?.status === 'success' && !state.isInvalidated ? state.data : undefined;
  }, [client]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
