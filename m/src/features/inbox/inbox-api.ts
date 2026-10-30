import { api } from '@/auth/auth-provider';
import type { components } from '@/api/generated/schema';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type Schemas = components['schemas'];
export type DraftFields = Schemas['PurchaseDraftFields'];
export type Draft = Schemas['PurchaseDraftResponse'];
export const inboxKeys = {
  all: ['inbox'] as const,
  detail: (id: number) => ['inbox', 'detail', id] as const,
};
export const getDraft = async (id: number) => (await api.get<Draft>(`/inbox/${id}`)).data;
export const useInbox = (history = false) =>
  useInfiniteQuery({
    queryKey: [...inboxKeys.all, 'list', history],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (await api.get<Schemas['PurchaseDraftPage']>('/inbox', { params: { page: pageParam, history } })).data,
    getNextPageParam: (page, _pages, last) => (page.hasNext ? last + 1 : undefined),
  });
export const useDraft = (id?: number) =>
  useQuery({
    queryKey: inboxKeys.detail(id ?? 0),
    queryFn: () => getDraft(id!),
    enabled: Boolean(id),
    retry: false,
  });
export function useInboxActions() {
  const client = useQueryClient();
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: inboxKeys.all });
  };
  const refreshFinancial = async () => {
    await Promise.all(
      [
        'inbox',
        'accounts',
        'dashboard',
        'transactions',
        'reports',
        'budgets',
        'alerts',
        'expenses',
        'onboarding',
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  };
  return {
    create: useMutation({
      mutationFn: async (data: Schemas['CreatePurchaseDraft']) =>
        (await api.post<Draft>('/inbox', data)).data,
      retry: false,
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: async ({ id, ...data }: Schemas['UpdatePurchaseDraft'] & { id: number }) =>
        (await api.put<Draft>(`/inbox/${id}`, data)).data,
      retry: false,
      onSuccess: refresh,
    }),
    confirm: useMutation({
      mutationFn: async ({ id, ...data }: Schemas['ConfirmPurchaseDraft'] & { id: number }) =>
        (await api.post<Draft>(`/inbox/${id}/confirm`, data)).data,
      retry: false,
      onSuccess: refreshFinancial,
    }),
    link: useMutation({
      mutationFn: async ({ id, ...data }: Schemas['LinkPurchaseDraft'] & { id: number }) =>
        (await api.post<Draft>(`/inbox/${id}/link`, data)).data,
      retry: false,
      onSuccess: refresh,
    }),
    discard: useMutation({
      mutationFn: async ({ id, version }: { id: number; version: number }) => {
        await api.delete(`/inbox/${id}`, { params: { version } });
      },
      retry: false,
      onSuccess: refresh,
    }),
  };
}
