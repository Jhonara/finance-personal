import { useRef } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';

export const upcomingPreferenceKey = (id?: number) => ['home-upcoming', id] as const;
export const upcomingStorageKey = (id: number) => `finance-home-upcoming-v1.${id}`;
export function useHomeUpcoming(userId?: number) {
  const client = useQueryClient();
  const valid = Number.isSafeInteger(userId) && Number(userId) > 0;
  const key = upcomingPreferenceKey(userId);
  const lock = useRef(false);
  const query = useQuery({
    queryKey: key,
    enabled: valid,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => (await SecureStore.getItemAsync(upcomingStorageKey(userId!))) !== 'hidden',
  });
  const saving = useIsMutating({ mutationKey: key }) > 0;
  const mutation = useMutation({
    mutationKey: key,
    scope: { id: `home-upcoming-${userId}` },
    retry: false,
    mutationFn: async ({ owner, visible }: { owner: number; visible: boolean }) => {
      await client.cancelQueries({ queryKey: upcomingPreferenceKey(owner), exact: true });
      await SecureStore.setItemAsync(upcomingStorageKey(owner), visible ? 'visible' : 'hidden');
    },
    onSuccess: (_, { owner, visible }) => client.setQueryData(upcomingPreferenceKey(owner), visible),
  });
  return {
    visible: valid && query.data === true,
    ready: valid && query.isSuccess,
    error: query.isError,
    saving,
    retry: () => query.refetch(),
    change: async (visible: boolean) => {
      if (!valid || !query.isSuccess || saving || lock.current) return;
      lock.current = true;
      try {
        await mutation.mutateAsync({ owner: userId!, visible });
      } finally {
        lock.current = false;
      }
    },
  };
}
