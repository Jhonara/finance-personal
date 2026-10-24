import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  confirmRecurringEntry,
  getRecurringAgenda,
  getRecurringRules,
  saveRecurringRule,
  setRecurringActive,
  skipRecurringEntry,
  previewRecurringRule,
  type RecurringPreviewRequest,
} from './recurrence-api';

export function useRecurringPreview(request: RecurringPreviewRequest) {
  const key = JSON.stringify(request);
  const [settled, setSettled] = useState(key);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(key), 300);
    return () => clearTimeout(timer);
  }, [key]);
  const valid = request.amount > 0 && Number.isFinite(request.amount) && Boolean(request.startDate);
  const query = useQuery({
    queryKey: [...recurrenceKeys.all, 'preview', key],
    queryFn: ({ signal }) => previewRecurringRule(request, signal),
    enabled: valid && key === settled,
    retry: false,
    staleTime: 60_000,
  });
  return { ...query, waiting: valid && (key !== settled || query.isPending) };
}

export const recurrenceKeys = { all: ['recurrences'] as const, rules: ['recurrences', 'rules'] as const };
export const useRecurringRules = () =>
  useQuery({ queryKey: recurrenceKeys.rules, queryFn: getRecurringRules, staleTime: 15_000 });
export const useRecurringAgenda = (year: number, month: number) =>
  useQuery({
    queryKey: [...recurrenceKeys.all, 'agenda', year, month],
    queryFn: () => getRecurringAgenda(year, month),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
export function useRecurringActions() {
  const client = useQueryClient();
  const refresh = async () => {
    await Promise.all(
      [
        'recurrences',
        'accounts',
        'dashboard',
        'transactions',
        'reports',
        'budgets',
        'alerts',
        'incomes',
        'expenses',
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  };
  return {
    save: useMutation({ mutationFn: saveRecurringRule, retry: false, onSuccess: refresh }),
    active: useMutation({ mutationFn: setRecurringActive, retry: false, onSuccess: refresh }),
    confirm: useMutation({ mutationFn: confirmRecurringEntry, retry: false, onSuccess: refresh }),
    skip: useMutation({ mutationFn: skipRecurringEntry, retry: false, onSuccess: refresh }),
  };
}
