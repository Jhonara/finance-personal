import { useRef } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { homePriorityKey, parseHomePriority, type HomePriority } from './home-priority';

export const homePriorityQueryKey = (userId: number | undefined) => ['home-priority', userId] as const;

export function useHomePriority(userId: number | undefined) {
  const client = useQueryClient();
  const validUser = Number.isSafeInteger(userId) && Number(userId) > 0;
  const key = homePriorityQueryKey(userId);
  const lock = useRef(false);
  const query = useQuery({
    queryKey: key,
    enabled: validUser,
    queryFn: async () => parseHomePriority(await SecureStore.getItemAsync(homePriorityKey(userId!))),
    staleTime: Infinity,
    retry: false,
  });
  const saving = useIsMutating({ mutationKey: key }) > 0;
  const mutation = useMutation({
    mutationKey: key,
    scope: { id: `home-priority-${userId}` },
    retry: false,
    mutationFn: async ({ owner, priority }: { owner: number; priority: HomePriority }) => {
      await client.cancelQueries({ queryKey: homePriorityQueryKey(owner), exact: true });
      await SecureStore.setItemAsync(homePriorityKey(owner), priority);
    },
    onSuccess: (_, { owner, priority }) => {
      client.setQueryData(homePriorityQueryKey(owner), priority);
    },
  });
  async function change(priority: HomePriority) {
    if (!validUser || !query.isSuccess || saving || lock.current) return false;
    if (priority === query.data) return true;
    lock.current = true;
    try {
      await mutation.mutateAsync({ owner: userId!, priority });
      return true;
    } finally {
      lock.current = false;
    }
  }
  return {
    priority: validUser ? (query.data ?? 'general') : 'general',
    ready: validUser && query.isSuccess,
    error: query.isError,
    loading: validUser && query.isPending,
    saving,
    change,
    retry: () => query.refetch(),
  };
}
