import { useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  defaultShortcuts,
  parseShortcutPreference,
  shortcutPreferenceKey,
  type HomeShortcutId,
} from './shortcut-preferences';
import type { HomePriority } from './home-priority';

export const homeShortcutQueryKey = (userId?: number) => ['home-shortcuts', userId] as const;
export function useHomeShortcuts(userId?: number, priority: HomePriority = 'general') {
  const client = useQueryClient();
  const lock = useRef(false);
  const valid = Number.isSafeInteger(userId) && Number(userId) > 0;
  const key = homeShortcutQueryKey(userId);
  const query = useQuery({
    queryKey: key,
    enabled: valid,
    staleTime: Infinity,
    retry: false,
    queryFn: async () =>
      parseShortcutPreference(await SecureStore.getItemAsync(shortcutPreferenceKey(userId!))) ?? null,
  });
  const saving = useIsMutating({ mutationKey: key }) > 0;
  const mutation = useMutation({
    mutationKey: key,
    scope: { id: `home-shortcuts-${userId}` },
    retry: false,
    mutationFn: async ({ owner, selected }: { owner: number; selected: HomeShortcutId[] }) => {
      await client.cancelQueries({ queryKey: homeShortcutQueryKey(owner), exact: true });
      await SecureStore.setItemAsync(shortcutPreferenceKey(owner), JSON.stringify(selected));
    },
    onSuccess: (_, { owner, selected }) => client.setQueryData(homeShortcutQueryKey(owner), selected),
  });
  return {
    selected: valid ? (query.data ?? defaultShortcuts(priority)) : defaultShortcuts(priority),
    ready: valid && query.isSuccess,
    saving,
    error: query.isError,
    retry: () => query.refetch(),
    async change(selected: HomeShortcutId[]) {
      const normalized = parseShortcutPreference(JSON.stringify(selected));
      if (!normalized || !valid || !query.isSuccess || saving || lock.current) return;
      lock.current = true;
      try {
        await mutation.mutateAsync({ owner: userId!, selected: normalized });
      } finally {
        lock.current = false;
      }
    },
  };
}
